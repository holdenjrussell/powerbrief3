import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AIPromptRequest, AIPromptResponse } from '@/lib/types/onesheet';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AIPromptRequest = await request.json();
    const { type, input, context, model = 'gemini-1.5-pro' } = body;

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    let response: AIPromptResponse;

    if (model === 'gemini-1.5-pro') {
      response = await generateWithGemini(type, input, context);
    } else if (model === 'claude-3.5-sonnet') {
      response = await generateWithClaude(type, input, context);
    } else {
      return NextResponse.json({ error: 'Invalid model specified' }, { status: 400 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating AI content:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI content' },
      { status: 500 }
    );
  }
}

async function generateWithGemini(
  type: string,
  input: string,
  context?: AIPromptRequest['context']
): Promise<AIPromptResponse> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = buildPrompt(type, input, context);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      data: JSON.parse(text),
      usage: {
        model: 'gemini-1.5-pro',
        tokens_used: response.usageMetadata?.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      success: false,
      error: 'Failed to generate content with Gemini'
    };
  }
}

async function generateWithClaude(
  type: string,
  input: string,
  context?: AIPromptRequest['context']
): Promise<AIPromptResponse> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  const prompt = buildPrompt(type, input, context);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    return {
      success: true,
      data: JSON.parse(content),
      usage: {
        model: 'claude-3.5-sonnet',
        tokens_used: data.usage.input_tokens + data.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      success: false,
      error: 'Failed to generate content with Claude'
    };
  }
}

function buildPrompt(
  type: string,
  input: string,
  context?: AIPromptRequest['context']
): string {
  const contextStr = context ? JSON.stringify(context, null, 2) : '';

  switch (type) {
    case 'audience_research':
      return `
You are an expert marketing researcher. Analyze the following customer data and extract key insights for a OneSheet Creative Strategy Template.

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "audience_insights": {
    "benefits": {
      "reviews": ["customer quote 1", "customer quote 2"],
      "information": ["insight 1", "insight 2"],
      "statistics": ["stat 1", "stat 2"]
    },
    "painPoints": {
      "reviews": ["pain point quote 1", "pain point quote 2"],
      "information": ["pain insight 1", "pain insight 2"],
      "statistics": ["pain stat 1", "pain stat 2"]
    },
    "features": {
      "reviews": ["feature quote 1", "feature quote 2"],
      "information": ["feature insight 1", "feature insight 2"],
      "statistics": ["feature stat 1", "feature stat 2"]
    },
    "objections": {
      "reviews": ["objection quote 1", "objection quote 2"],
      "information": ["objection insight 1", "objection insight 2"],
      "statistics": ["objection stat 1", "objection stat 2"]
    },
    "failedSolutions": {
      "reviews": ["failed solution quote 1", "failed solution quote 2"],
      "information": ["failed solution insight 1", "failed solution insight 2"],
      "statistics": ["failed solution stat 1", "failed solution stat 2"]
    }
  }
}

Focus on extracting real customer language and specific insights that can inform creative strategy.
`;

    case 'competitor_analysis':
      return `
You are an expert competitive intelligence analyst. Analyze the following competitor data and provide strategic insights.

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "similarities": ["similarity 1", "similarity 2"],
      "differences": ["difference 1", "difference 2"],
      "opportunities": ["opportunity 1", "opportunity 2"],
      "priceComparison": "higher|lower|similar",
      "qualityComparison": "detailed quality comparison"
    }
  ],
  "overall_insights": "Key strategic insights about the competitive landscape"
}

Focus on actionable insights that can inform positioning and creative strategy.
`;

    case 'persona_generation':
      return `
You are an expert customer persona strategist. Based on the following customer data, generate detailed buyer personas.

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "personas": [
    {
      "title": "Persona Name",
      "demographics": {
        "age": "age range",
        "gender": "gender",
        "location": "location",
        "income": "income range",
        "education": "education level",
        "occupation": "occupation"
      },
      "psychographics": {
        "interests": ["interest 1", "interest 2"],
        "lifestyle": ["lifestyle 1", "lifestyle 2"],
        "values": ["value 1", "value 2"],
        "painPoints": ["pain point 1", "pain point 2"]
      },
      "awarenessLevel": "unaware|problemAware|solutionAware|productAware|mostAware"
    }
  ]
}

Create 2-3 distinct personas based on the data patterns you identify.
`;

    case 'concept_generation':
      return `
You are an expert creative strategist. Based on the research data provided, generate creative concepts for advertising campaigns.

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "concepts": [
    {
      "title": "Concept Title",
      "description": "Detailed concept description",
      "angle": "marketing angle",
      "format": "ad format",
      "emotion": "emotional trigger",
      "framework": "creative framework",
      "priority": 1
    }
  ]
}

Generate 5-10 diverse concepts that address different customer segments and pain points.
`;

    case 'hook_generation':
      return `
You are an expert copywriter specializing in attention-grabbing hooks. Generate compelling ad hooks based on the research data.

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "hooks": [
    {
      "text": "Hook text",
      "angle": "marketing angle",
      "persona": "target persona",
      "format": "content format",
      "priority": 1
    }
  ]
}

Generate 10-15 hooks that use real customer language and address specific pain points or desires.
`;

    default:
      return `
Please analyze the following data and provide strategic insights in JSON format:

Input Data: ${input}
${contextStr ? `Additional Context: ${contextStr}` : ''}

Provide actionable insights that can inform creative strategy and marketing decisions.
`;
  }
} 