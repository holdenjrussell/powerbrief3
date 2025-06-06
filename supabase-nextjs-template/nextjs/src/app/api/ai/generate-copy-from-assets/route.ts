import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { ImageAsset } from "../../../../lib/validators/imageAssetValidator";

// Added these imports for file handling
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

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

  // Optional rate limiting - only if environment variables are set
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      // Dynamic import to avoid build errors if packages aren't installed
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { kv } = await import("@vercel/kv");
      
      const ratelimit = new Ratelimit({
        redis: kv,
        limiter: Ratelimit.slidingWindow(100, "10 s"),
      });

      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const { success } = await ratelimit.limit(`ratelimit_${clientIP}`);

      if (!success) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    } else {
      console.log("Rate limiting disabled - KV environment variables not set");
    }
  } catch (error) {
    console.log("Rate limiting unavailable:", error);
    // Continue without rate limiting if packages aren't available
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
      assets.map(async (asset): Promise<unknown> => {
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
          let uploadedFile: unknown = null;
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

            const fileResult = uploadedFile as { uri?: string; mimeType?: string; name?: string };
            if (!fileResult.uri) {
              console.error("File URI not found after upload:", uploadedFile);
              throw new Error(`Failed to obtain URI for uploaded video: ${asset.name}.`);
            }

            console.log(`Using URI for video ${asset.name}: ${fileResult.uri}`);
            return createPartFromUri(fileResult.uri, fileResult.mimeType || asset.type);

          } catch (uploadError: unknown) {
            const error = uploadError as Error;
            console.error(`Error uploading video ${asset.name} to File API:`, error);
            
            // Try to delete the file from Google's storage if an error occurs after upload
            const fileResult = uploadedFile as { name?: string };
            if (uploadedFile && fileResult.name) {
              try {
                console.log(`Attempting to delete partially uploaded file: ${fileResult.name}`);
                await ai.files.delete({ name: fileResult.name });
                console.log(`Successfully deleted file ${fileResult.name} from Google Cloud.`);
              } catch (deleteError) {
                console.error(`Failed to delete file ${fileResult.name}:`, deleteError);
              }
            }
            throw new Error(`Processing video ${asset.name} failed: ${error.message || error}`);
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

  } catch (error: unknown) {
    const err = error as Error & { errorDetails?: unknown; status?: number };
    console.error(`Error generating copy for asset ${assets.map(a => a.name).join(', ')}:`, error);
    return NextResponse.json(
      {
        error: `Error generating copy: ${err.message || "Unknown error"}`,
        ...(err.errorDetails && { details: err.errorDetails }),
      },
      { status: err.status || 500 }
    );
  }
} 