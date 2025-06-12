import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { text, voice, model, speed } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Missing required parameter: text" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Use OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: model || "tts-1",
      voice: voice || "alloy",
      input: text,
      speed: speed || 1.0,
    });

    // Get the audio as an array buffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert array buffer to base64
    const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');

    return NextResponse.json({
      audio: base64Audio,
      voice: voice || "alloy",
      model: model || "tts-1"
    });
  } catch (error) {
    console.error("OpenAI TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
} 