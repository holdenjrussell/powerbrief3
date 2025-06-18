import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import type { AudienceResearchData, AudienceResearchItem, AudiencePersona } from '@/lib/types/onesheet';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { onesheet_id, sections = ['all'] } = await request.json();

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get OneSheet and verify access
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('*, brand:brands(*)')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Get all context data for this OneSheet
    const { data: contextData, error: contextError } = await supabase
      .from('onesheet_context_data')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .eq('is_active', true);

    if (contextError) {
      throw contextError;
    }

    if (!contextData || contextData.length === 0) {
      return NextResponse.json({ 
        error: 'No context data found. Please load context first.' 
      }, { status: 400 });
    }

    // Prepare context for AI
    const contextSummary = contextData.map(ctx => ({
      type: ctx.source_type,
      name: ctx.source_name,
      content: ctx.content_text || '',
      extractedData: ctx.extracted_data || {},
      metadata: ctx.metadata || {}
    }));

    // Generate AI analysis using Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-thinking-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const prompt = `
You are an expert marketing strategist analyzing context data to extract audience insights.

Context Data:
${JSON.stringify(contextSummary, null, 2)}

Brand Information:
- Name: ${onesheet.brand?.name || 'Unknown'}
- Product: ${onesheet.product || 'Unknown'}

Please analyze all the context data and extract the following insights:

1. ANGLES (Overall themes for ads):
   - List 5-10 distinct angles that could be used in advertising
   - Provide supporting evidence from the context (quotes, data points)
   - Rank by potential effectiveness (1-10 priority)
   - Focus on emotional and practical benefits

2. BENEFITS (What customers gain):
   - List all key benefits mentioned or implied
   - Include supporting quotes/data from reviews, social posts, etc.
   - Group by importance/frequency of mention

3. PAIN POINTS (Problems without product):
   - Extract from reviews, social posts, competitor analysis
   - Include severity indicators (how much it impacts their life)
   - Link to potential angles that address these pains

4. FEATURES (Product attributes):
   - Technical specifications mentioned
   - Unique selling points
   - Key differentiators from competitors

5. OBJECTIONS (Purchase hesitations):
   - Common concerns from reviews or social discussions
   - Price sensitivity issues
   - Trust or credibility concerns
   - Product limitations mentioned

6. FAILED SOLUTIONS (What didn't work):
   - Competitor products customers tried before
   - DIY solutions that were inadequate
   - Why these alternatives failed

7. OTHER (Miscellaneous insights):
   - Customer service excellence mentions
   - Shipping/delivery feedback
   - Brand perception insights
   - Any other relevant patterns

8. PERSONAS (Customer profiles):
   - Create 3-5 detailed personas based on the data
   - Include demographics (age, gender, location, income, education, occupation)
   - Include psychographics (interests, lifestyle, values, pain points)
   - Assign awareness levels (unaware, problem aware, solution aware, product aware, most aware)
   - Include a representative quote for each persona

Format your response as a JSON object with this structure:
{
  "angles": [
    {
      "content": "angle description",
      "evidence": [
        {
          "type": "review|statistic|information|social",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 1-10
    }
  ],
  "benefits": [...similar structure...],
  "painPoints": [...similar structure...],
  "features": [...similar structure...],
  "objections": [...similar structure...],
  "failedSolutions": [...similar structure...],
  "other": [...similar structure...],
  "personas": [
    {
      "name": "Persona Name",
      "demographics": {
        "age": "25-34",
        "gender": "Female",
        "location": "Urban areas",
        "income": "$50k-75k",
        "education": "College educated",
        "occupation": "Professional"
      },
      "psychographics": {
        "interests": ["health", "fitness"],
        "lifestyle": ["busy", "health-conscious"],
        "values": ["efficiency", "wellness"],
        "painPoints": ["lack of time", "need convenience"]
      },
      "awarenessLevel": "solutionAware",
      "quote": "I need something quick and healthy for my busy mornings",
      "priority": 1
    }
  ]
}

Be thorough and extract as much valuable information as possible from the context.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the JSON response
    let analysisData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        details: response 
      }, { status: 500 });
    }

    // Transform the data to match our types
    const timestamp = new Date().toISOString();
    const audienceResearch: AudienceResearchData = {
      angles: (analysisData.angles || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      benefits: (analysisData.benefits || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      painPoints: (analysisData.painPoints || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      features: (analysisData.features || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      objections: (analysisData.objections || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      failedSolutions: (analysisData.failedSolutions || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      other: (analysisData.other || []).map((item: any) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      personas: (analysisData.personas || []).map((persona: any) => ({
        id: uuidv4(),
        name: persona.name,
        demographics: persona.demographics || {},
        psychographics: persona.psychographics || {},
        awarenessLevel: persona.awarenessLevel || 'problemAware',
        quote: persona.quote,
        priority: persona.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }))
    };

    // Update the OneSheet with the generated data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        audience_research: audienceResearch,
        current_stage: 'audience_research',
        'stages_completed': {
          ...onesheet.stages_completed,
          context: true
        },
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: audienceResearch,
      message: 'Audience research generated successfully'
    });

  } catch (error) {
    console.error('Error generating audience research:', error);
    return NextResponse.json(
      { error: 'Failed to generate audience research', details: error },
      { status: 500 }
    );
  }
} 