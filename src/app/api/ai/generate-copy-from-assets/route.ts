import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { ImageAsset } from "../../../../lib/validators/imageAssetValidator";
// import { GEMINI_SAFETY_SETTINGS, generationConfig } from "@/lib/config"; // Defined inline

// Added these imports for file handling
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// Define generationConfig and safetySettings inline as they might be from a commented out import
const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export async function POST(req: NextRequest) {
  const {
    assets,
    systemPrompt,
    adPlatform,
    locale,
    campaignObjective,
    targetAudience,
    numberOfCopies,
    callToAction,
    additionalInstructions,
  }: {
    assets: ImageAsset[];
    systemPrompt: string;
    adPlatform: string;
    locale: string;
    campaignObjective: string;
    targetAudience: string;
    numberOfCopies: number;
    callToAction: string;
    additionalInstructions: string;
  } = await req.json();

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(100, "10 s"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${req.ip ?? "127.0.0.1"}`
    );

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }
  } else {
    console.log("KV_REST_API_URL and KV_REST_API_TOKEN not set, skipping rate limiting");
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set" },
      { status: 500 }
    );
  }

  if (!assets || assets.length === 0) {
    return NextResponse.json({ error: "No assets found" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  try {
    const processedAssetParts = await Promise.all(
      assets.map(async (asset): Promise<any> => {
        if (asset.type.startsWith("image/")) {
          const buffer = await asset.arrayBuffer();
          return {
            inlineData: {
              data: Buffer.from(buffer).toString("base64"),
              mimeType: asset.type,
            },
          };
        } else if (asset.type.startsWith("video/")) {
          let tempFilePath: string | null = null;
          let uploadedFile: any = null;
          try {
            const buffer = Buffer.from(await asset.arrayBuffer());
            const safeAssetName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const tempFileName = `temp_video_${Date.now()}_${safeAssetName}`;
            tempFilePath = path.join(os.tmpdir(), tempFileName);
            await fs.writeFile(tempFilePath, buffer);

            console.log(`Uploading video file: ${asset.name} from ${tempFilePath} with mimeType: ${asset.type}`);
            uploadedFile = await ai.files.upload({
              file: tempFilePath,
              config: { mimeType: asset.type },
            });
            console.log(`Uploaded file ${asset.name}, response:`, uploadedFile);

            if (!uploadedFile.uri) {
              console.error("File URI not found after upload:", uploadedFile);
              throw new Error(`Failed to obtain URI for uploaded video: ${asset.name}.`);
            }

            console.log(`Using URI for video ${asset.name}: ${uploadedFile.uri}`);
            return createPartFromUri(uploadedFile.uri, uploadedFile.mimeType);

          } catch (uploadError: any) {
            console.error(`Error uploading video ${asset.name} to File API:`, uploadError);
            
            // Try to delete the file from Google's storage if an error occurs after upload
            if (uploadedFile && uploadedFile.name) {
              try {
                console.log(`Attempting to delete partially uploaded file: ${uploadedFile.name}`);
                await ai.files.delete({ name: uploadedFile.name });
                console.log(`Successfully deleted file ${uploadedFile.name} from Google Cloud.`);
              } catch (deleteError) {
                console.error(`Failed to delete file ${uploadedFile.name}:`, deleteError);
              }
            }
            throw new Error(`Processing video ${asset.name} failed: ${uploadError.message || uploadError}`);
          } finally {
            if (tempFilePath) {
              try {
                await fs.unlink(tempFilePath);
                console.log(`Deleted temporary file: ${tempFilePath}`);
              } catch (cleanupError) {
                console.error(`Error deleting temporary file ${tempFilePath}:`, cleanupError);
              }
            }
          }
        }
        console.warn(`Unsupported asset type: ${asset.type} for asset ${asset.name}`);
        return null;
      })
    );
    
    const validAssetParts = processedAssetParts.filter((part) => part !== null);

    if (validAssetParts.length === 0 && assets.length > 0) {
      return NextResponse.json({ error: "No processable assets found or all asset processing failed." }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        systemPrompt,
        ...validAssetParts,
        `\nAd Platform: ${adPlatform}`,
        `\nLocale: ${locale}`,
        `\nCampaign Objective: ${campaignObjective}`,
        `\nTarget Audience: ${targetAudience}`,
        `\nNumber of Ad Copies to Generate: ${numberOfCopies}`,
        `\nCall To Action: ${callToAction}`,
        `\nAdditional Instructions: ${additionalInstructions}`,
      ]),
    });

    return NextResponse.json({ generatedCopy: response.text });

  } catch (error: any) {
    console.error(`Error generating copy for asset ${assets.map(a => a.name).join(', ')}:`, error);
    return NextResponse.json(
      {
        error: `Error generating copy: ${error.message || "Unknown error"}`,
        ...(error.errorDetails && { details: error.errorDetails }),
      },
      { status: error.status || 500 }
    );
  }
} 