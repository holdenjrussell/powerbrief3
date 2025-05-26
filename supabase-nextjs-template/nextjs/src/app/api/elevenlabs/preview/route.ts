import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Get API key from brand settings
async function getApiKey(brandId: string) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The setAll method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );
    
    const { data, error } = await supabase
      .from('brands')
      .select('elevenlabs_api_key')
      .eq('id', brandId)
      .single();
    
    if (error) {
      console.error('Error fetching brand API key:', error);
      return null;
    }
    
    // If brand doesn't have an API key set, fall back to environment variable
    if (!data?.elevenlabs_api_key) {
      return process.env.ELEVENLABS_API_KEY || null;
    }
    
    return data.elevenlabs_api_key;
  } catch (err) {
    console.error('Error getting API key:', err);
    return process.env.ELEVENLABS_API_KEY || null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { voiceId, brandId } = await request.json();

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Missing required parameter: voiceId' },
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

    // Use a short preview text
    const previewText = "Hello, this is a preview of this voice. How does it sound?";

    // Define voice settings for preview
    const voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75
    };

    // Create model options for preview
    const modelOptions = {
      model_id: "eleven_multilingual_v2",
      voice_settings: voiceSettings,
    };

    // Use the ElevenLabs API directly
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: previewText,
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
      fileName: 'voice-preview.mp3'
    });
  } catch (error) {
    console.error('Error generating voice preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice preview' },
      { status: 500 }
    );
  }
} 