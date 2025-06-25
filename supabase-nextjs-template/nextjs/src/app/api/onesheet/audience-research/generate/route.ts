import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/types/supabase';
import type { AudienceResearchData } from '@/lib/types/onesheet';

export async function POST(request: NextRequest) {
  try {
    const { onesheet_id } = await request.json();

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Prepare context for AI - send full content without truncation
    const contextSummary = contextData.map(ctx => ({
      type: ctx.source_type,
      name: ctx.source_name,
      content: ctx.content_text || '',
      extractedData: ctx.extracted_data || {},
      metadata: ctx.metadata || {}
    }));

    // Check if we have sufficient context
    const totalContextLength = contextSummary.reduce((acc, ctx) => acc + ctx.content.length, 0);
    console.log(`Total context length: ${totalContextLength} characters across ${contextSummary.length} sources`);
    
    if (totalContextLength < 100) {
      return NextResponse.json({ 
        error: 'Insufficient context data. Please add more detailed context before generating audience research.' 
      }, { status: 400 });
    }

    // Generate AI analysis using Gemini 2.0-flash-thinking-exp
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 60000, // Increased to handle larger responses
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

IMPORTANT: Respond with ONLY a valid JSON object. No additional text before or after.

Format your response as a JSON object with this exact structure:
{
  "angles": [
    {
      "content": "angle description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "benefits": [
    {
      "content": "benefit description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "painPoints": [
    {
      "content": "pain point description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "features": [
    {
      "content": "feature description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "objections": [
    {
      "content": "objection description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "failedSolutions": [
    {
      "content": "failed solution description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
  "other": [
    {
      "content": "other insight description",
      "evidence": [
        {
          "type": "review",
          "text": "supporting evidence",
          "source": "where this came from"
        }
      ],
      "priority": 5
    }
  ],
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
    
    console.log('Response length:', response.length);
    console.log('Response preview (first 500 chars):', response.substring(0, 500));
    console.log('Response preview (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
    
    // Check if response is empty or very short
    if (!response || response.trim().length < 10) {
      console.error('AI response is empty or too short:', response);
      console.error('Prompt length:', prompt.length);
      console.error('Context summary length:', JSON.stringify(contextSummary).length);
      
      // Check if the model response has any candidates or safety ratings
      const candidates = result.response.candidates;
      const promptFeedback = result.response.promptFeedback;
      
      if (promptFeedback) {
        console.error('Prompt feedback:', promptFeedback);
      }
      
      if (candidates && candidates.length > 0) {
        console.error('Candidate finish reasons:', candidates.map(c => c.finishReason));
        console.error('Candidate safety ratings:', candidates.map(c => c.safetyRatings));
      }
      
      throw new Error(`AI response is empty (length: ${response.length}). This might be due to content filtering, rate limiting, or prompt size (${prompt.length} chars).`);
    }
    
    // Parse the JSON response
    let analysisData;
    try {
      // First try to parse the entire response as JSON
      try {
        analysisData = JSON.parse(response);
      } catch {
        // Remove markdown code blocks if present
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Try to parse the cleaned response
        try {
          analysisData = JSON.parse(cleanResponse);
        } catch {
          // If that fails, try to extract JSON from the response
          const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            // Clean up common JSON issues
            let cleanJson = jsonMatch[0]
              .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
              .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
              .replace(/\\"/g, '"')    // Fix escaped quotes
              .replace(/"\s*:\s*"([^"]*)"([^,}\]]*)/g, '": "$1$2"'); // Fix broken strings
            
            // Try to fix incomplete JSON by finding the last complete closing brace
            const lastBraceIndex = cleanJson.lastIndexOf('}');
            if (lastBraceIndex > 0 && lastBraceIndex < cleanJson.length - 1) {
              cleanJson = cleanJson.substring(0, lastBraceIndex + 1);
            }
            
            analysisData = JSON.parse(cleanJson);
          } else {
            throw new Error('No JSON found in response');
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response text (first 1000 chars):', response.substring(0, 1000));
      console.error('Response text (last 1000 chars):', response.substring(Math.max(0, response.length - 1000)));
      console.error('Full AI response that failed to parse:', response);
      
      // Instead of returning empty data, throw an error so the user knows something went wrong
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}. Response may be incomplete or malformed.`);
    }

    // Transform the data to match our types
    const timestamp = new Date().toISOString();
    
    interface AIAnalysisItem {
      content: string;
      evidence?: Array<{ type: string; text: string; source: string }>;
      priority?: number;
    }
    
    interface AIPersona {
      name: string;
      demographics?: Record<string, unknown>;
      psychographics?: Record<string, unknown>;
      awarenessLevel?: string;
      quote?: string;
      priority?: number;
    }
    
    const audienceResearch: AudienceResearchData = {
      angles: (analysisData.angles || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      benefits: (analysisData.benefits || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      painPoints: (analysisData.painPoints || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      features: (analysisData.features || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      objections: (analysisData.objections || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      failedSolutions: (analysisData.failedSolutions || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      other: (analysisData.other || []).map((item: AIAnalysisItem) => ({
        id: uuidv4(),
        content: item.content,
        evidence: item.evidence || [],
        priority: item.priority || 5,
        aiGenerated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      personas: (analysisData.personas || []).map((persona: AIPersona) => ({
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
        audience_research: audienceResearch as unknown as Database['public']['Tables']['onesheet']['Update']['audience_research'],
        current_stage: 'audience_research',
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