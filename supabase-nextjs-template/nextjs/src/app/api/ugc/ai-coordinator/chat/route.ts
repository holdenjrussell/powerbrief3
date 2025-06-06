import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId, brandName, message, context } = await request.json();

    if (!brandId || !message) {
      return NextResponse.json({ 
        error: 'Brand ID and message are required' 
      }, { status: 400 });
    }

    // Get additional context about the brand and creators
    const { data: creators, error: creatorsError } = await supabase
      .from('ugc_creators')
      .select('id, name, status, email')
      .eq('brand_id', brandId);

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    const systemPrompt = `
You are an AI assistant specializing in UGC (User Generated Content) creator pipeline management for ${brandName}. 

You are helpful, knowledgeable, and proactive. You can assist with:
- Analyzing creator performance and pipeline status
- Generating email templates and sequences
- Providing strategic recommendations
- Answering questions about creator management
- Suggesting follow-up actions and improvements

CURRENT CONTEXT:
- Brand: ${brandName}
- Total Creators: ${context?.totalCreators || creators?.length || 0}
- User's recent context: ${context?.recentMessages?.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n') || 'No recent messages'}

CREATOR STATUS OVERVIEW:
${creators?.map(c => `- ${c.name}: ${c.status}`).join('\n') || 'No creators found'}

GUIDELINES:
- Be conversational and friendly, like a knowledgeable assistant
- Provide actionable insights and specific recommendations
- When suggesting actions, be specific about next steps
- If asked about specific creators, reference them by name
- Keep responses concise but informative
- If you don't have enough information, ask clarifying questions
- Suggest concrete actions the user can take

USER MESSAGE: ${message}

Respond as the AI assistant, providing helpful guidance based on the context above.
`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    return NextResponse.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ 
      error: 'Failed to process chat message' 
    }, { status: 500 });
  }
} 