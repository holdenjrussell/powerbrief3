import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Add ElevenLabs voice type
type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
};

// Get API key from brand settings
async function getApiKey(brandId: string) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    console.log('Fetching API key for brandId:', brandId);
    
    const { data, error } = await supabase
      .from('brands')
      .select('elevenlabs_api_key')
      .eq('id', brandId)
      .single();
    
    if (error) {
      console.error('Error fetching brand API key:', error);
      return null;
    }
    
    console.log('Brand data fetched:', { hasApiKey: !!data?.elevenlabs_api_key, apiKeyLength: data?.elevenlabs_api_key?.length || 0 });
    
    // If brand doesn't have an API key set, fall back to environment variable
    if (!data?.elevenlabs_api_key) {
      console.log('No API key found for brand, falling back to environment variable');
      return process.env.ELEVENLABS_API_KEY || null;
    }
    
    console.log('Using brand-specific API key');
    return data.elevenlabs_api_key;
  } catch (err) {
    console.error('Error getting API key:', err);
    return process.env.ELEVENLABS_API_KEY || null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get brandId from query parameters
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    
    if (!brandId) {
      // Fall back to environment variable if no brandId provided
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        return NextResponse.json(
          { error: 'ElevenLabs API key not configured and no brandId provided' }, 
          { status: 500 }
        );
      }
      
      // Fetch available voices from ElevenLabs API using env variable
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
    }
    
    // Get API key from brand settings
    const apiKey = await getApiKey(brandId);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured for this brand. Please check your brand settings and ensure you have saved the API key.' }, 
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
    const { text, voiceId, fileName, speed, stability, similarity, modelId, brandId } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, voiceId' },
        { status: 400 }
      );
    }
    
    // Get API key from brand settings if brandId is provided
    const apiKey = brandId ? await getApiKey(brandId) : process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: brandId 
          ? 'ElevenLabs API key not configured for this brand. Please check your brand settings and ensure you have saved the API key.' 
          : 'ElevenLabs API key not configured' 
        }, 
        { status: 500 }
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