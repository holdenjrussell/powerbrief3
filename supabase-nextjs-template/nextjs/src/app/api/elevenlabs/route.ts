import { NextRequest, NextResponse } from 'next/server';

// Ensure these environment variables are set in your .env.local file
// ELEVENLABS_API_KEY=your_api_key

// Add ElevenLabs voice type
type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
};

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' }, 
        { status: 500 }
      );
    }

    // Fetch available voices from ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Format the response to match our expected structure
    const voices = data.voices.map((voice: ElevenLabsVoice) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category
    }));
    
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

    const { text, voiceId, fileName, speed, stability, similarity, modelId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, voiceId' },
        { status: 400 }
      );
    }

    // Define voice settings with defaults if not provided
    const voiceSettings = {
      stability: stability !== undefined ? stability : 0.5,
      similarity_boost: similarity !== undefined ? similarity : 0.75
    };

    // Create model options with the selected model or default
    const modelOptions = {
      model_id: modelId || "eleven_monolingual_v1",
      voice_settings: voiceSettings,
    };

    // If speed is provided, add it to the request
    if (speed !== undefined) {
      modelOptions['speed'] = speed;
    }

    // Use the ElevenLabs API directly
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        ...modelOptions
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