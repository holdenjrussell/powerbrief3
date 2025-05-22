import { NextRequest, NextResponse } from 'next/server';
import { VoiceSettings, getVoices, textToSpeech } from 'elevenlabs-node';

// Ensure these environment variables are set in your .env.local file
// ELEVENLABS_API_KEY=your_api_key

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' }, 
        { status: 500 }
      );
    }

    // Get all available voices
    const voices = await getVoices(apiKey);
    
    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' }, 
        { status: 500 }
      );
    }

    const { text, voiceId, fileName } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, voiceId' },
        { status: 400 }
      );
    }

    const voiceSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75
    };

    // Generate audio from text
    const audioBuffer = await textToSpeech(apiKey, voiceId, voiceSettings, text);
    
    // Convert Buffer to Base64 for easy transport
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return NextResponse.json({
      audio: base64Audio,
      fileName: fileName || 'generated-audio.mp3'
    });
  } catch (error) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 