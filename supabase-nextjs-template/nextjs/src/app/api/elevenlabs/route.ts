import { NextRequest, NextResponse } from 'next/server';

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

    // Using a hardcoded list of voices since getVoices is not available
    const voices = [
      { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
      { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
      { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
      { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
      { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
      { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
      { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
      { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
      { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" }
    ];
    
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

    // Define voice settings
    const voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75
    };

    // Use the ElevenLabs API directly
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        voice_settings: voiceSettings,
        model_id: "eleven_monolingual_v1"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the audio as an array buffer
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert array buffer to base64
    const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');
    
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