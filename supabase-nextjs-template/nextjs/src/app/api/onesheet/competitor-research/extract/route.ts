import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/types/supabase';
import type { CompetitorResearchData, CompetitorData } from '@/lib/types/onesheet';

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

    // Filter for competitor-related context
    const competitorContext = contextData.filter(ctx => 
      ctx.source_type === 'competitor_website' || 
      ctx.source_type === 'competitor_social' || 
      ctx.source_type === 'competitor_ads'
    );

    // Also look for competitor mentions in other context
    const allContext = contextData.map(ctx => ({
      type: ctx.source_type,
      name: ctx.source_name,
      content: ctx.content_text || '',
      url: ctx.source_url,
      extractedData: ctx.extracted_data || {}
    }));

    // Validate API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Generate AI analysis using Gemini 2.0-flash-thinking-exp
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 60000,
      }
    });

    const prompt = `
You are an expert competitive analyst focused on finding customer dissatisfaction points to position our product as the solution.

Context Data:
${JSON.stringify(allContext, null, 2)}

Our Brand: ${onesheet.brand?.name || 'Unknown'}
Our Product: ${onesheet.product || 'Unknown'}

Your goal is to identify competitors and answer these strategic questions:
1. Is our product better quality than each competitor? Why? How?
2. What would make our product the best choice above all competitors and substitutes?
3. How are they approaching formats? (Look for: podcast ads, AI voiceover, animation, explainer videos, long-form content, UGC, testimonials, etc.)
4. How are they approaching creators and talent? (Look for: B-roll with voiceovers, variety of creators, organic style with minimal editing, highly produced content, etc.)
5. Can you detect any learnings over time? (Changes in strategy, format evolution, messaging shifts)

For each competitor, extract:
- Name and website
- Similarities to our product
- Key differences (especially where we're better)
- Customer dissatisfaction points (complaints, unmet needs, frustrations)
- Format strategies from their ads/content
- Creator/talent approaches
- Landing pages mentioned or linked
- Ad examples with platforms

Pay special attention to:
- Customer reviews mentioning competitors ("I tried X before this")
- Analyzed social media content (organic and paid)
- Ad formats and creative strategies
- Production quality and creator usage
- Customer language about problems/frustrations

IMPORTANT: Respond with ONLY a valid JSON object. No additional text before or after.

Format your response as:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "https://example.com",
      "similarities": ["What they do similarly to us", "Common features"],
      "differences": ["Where we're superior", "What we do better", "Our unique advantages"],
      "opportunities": {
        "formats": ["Format gaps they're missing", "Content types customers want"],
        "messaging": ["Customer complaints", "Unmet needs", "Frustration points"]
      },
      "landingPages": [
        {
          "url": "https://example.com/page",
          "description": "Sales page for X campaign"
        }
      ],
      "adLinks": [
        {
          "platform": "facebook",
          "url": "https://facebook.com/ads/...",
          "description": "UGC testimonial with AI voiceover"
        }
      ],
      "deepAnalysis": {
        "isHigherQuality": "Specific reasons why our product is better quality (materials, features, results)",
        "whyBetterChoice": "What makes us the best choice (unique value prop, solving frustrations)",
        "formatStrategies": ["Podcast ads with host reads", "AI voiceover explainers", "Long-form testimonials"],
        "creatorApproaches": ["Heavy B-roll with voiceover only", "Diverse creator pool", "Organic unscripted style"],
        "learningsOverTime": [
          {
            "date": "2024-01",
            "learning": "Shifted from static images to video content",
            "source": "Ad library analysis"
          }
        ]
      }
    }
  ],
  "deepAnalysis": {
    "qualityComparison": {
      "summary": "Overall assessment of how our product quality compares and why we're superior"
    },
    "formatStrategies": {
      "summary": "Common format patterns across competitors and opportunities for differentiation"
    },
    "creatorApproaches": {
      "summary": "How competitors use creators/talent and gaps we can exploit"
    }
  }
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the JSON response
    let analysisData;
    try {
      // Remove markdown code blocks if present
      let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find and extract valid JSON
      const jsonStart = cleanResponse.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON object found in response');
      }
      
      // Find the last complete closing brace
      let jsonEnd = -1;
      let braceCount = 0;
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') {
          braceCount++;
        } else if (cleanResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object - missing closing brace');
      }
      
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      analysisData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response length:', response.length);
      console.error('Response preview:', response.substring(0, 1000));
      
      // If parsing failed, return a minimal valid structure
      analysisData = {
        competitors: [],
        deepAnalysis: {
          qualityComparison: { summary: 'Failed to parse AI response - please try again' },
          formatStrategies: { summary: 'Failed to parse AI response - please try again' },
          creatorApproaches: { summary: 'Failed to parse AI response - please try again' },
          learningsOverTime: []
        }
      };
    }

    // Transform the data to match our types
    const timestamp = new Date().toISOString();
    const competitorResearch: CompetitorResearchData = {
      competitors: (analysisData.competitors || []).map((comp: any) => ({
        id: uuidv4(),
        name: comp.name,
        website: comp.website,
        similarities: comp.similarities || [],
        differences: comp.differences || [],
        opportunities: comp.opportunities || { formats: [], messaging: [] },
        landingPages: comp.landingPages || [],
        adLinks: comp.adLinks || [],
        deepAnalysis: comp.deepAnalysis,
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      deepAnalysis: analysisData.deepAnalysis || {
        qualityComparison: {},
        formatStrategies: {},
        creatorApproaches: {},
        learningsOverTime: []
      }
    };

    // Update the OneSheet with the extracted competitors
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        competitor_research: competitorResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      ...competitorResearch,
      message: `Extracted ${competitorResearch.competitors.length} competitors from context`
    });

  } catch (error) {
    console.error('Error extracting competitors:', error);
    return NextResponse.json(
      { error: 'Failed to extract competitors', details: error },
      { status: 500 }
    );
  }
} 