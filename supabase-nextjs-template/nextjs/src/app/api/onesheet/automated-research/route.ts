import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

// Enhanced prompts based on Alex Cooper's exact process
const RESEARCH_PROMPTS = {
  // Step 1: Market Context (ChatGPT/Perplexity equivalent)
  marketAnalysis: `You are analyzing a product category, NOT a specific brand yet. 
    Given this product landing page: {{url}}
    
    Provide a comprehensive market analysis:
    1. What general category does this product belong to?
    2. What are the top 5 benefits people seek in this category?
    3. What are the top 5 pain points people have without products in this category?
    4. What are common misconceptions about this category?
    5. What are emerging trends in this space?
    
    Be specific and use consumer language, not marketing speak.`,

  // Step 2: Voice of Customer Analysis
  reviewAnalysis: `Analyze these customer reviews for deep insights.
    Product: {{product}}
    Reviews: {{reviews}}
    
    Extract and organize:
    
    BENEFITS (with supporting quotes):
    - List each benefit with 2-3 exact customer quotes
    - Highlight emotional language used
    
    PAIN POINTS (before using the product):
    - What problems did customers have before?
    - Include exact phrases they use
    
    FEATURES (that customers actually care about):
    - Which features do they mention most?
    - How do they describe these features?
    
    OBJECTIONS (that were overcome):
    - What made them hesitant initially?
    - What convinced them to try it?
    
    FAILED SOLUTIONS:
    - What did they try before this product?
    - Why didn't those solutions work?
    
    CUSTOMER LANGUAGE PATTERNS:
    - Common phrases and expressions
    - Emotional words they use repeatedly
    - How they describe their transformation`,

  // Step 3: Competitor Gap Analysis
  competitorAnalysis: `Analyze competitor positioning and find opportunities.
    Our product: {{ourProduct}} - {{ourUrl}}
    Competitor: {{competitorName}} - {{competitorUrl}}
    
    Provide:
    1. Key similarities (be brief)
    2. Key differences (be detailed)
    3. Customer dissatisfaction points with competitor (from reviews/comments)
    4. Positioning opportunities for our product
    5. Specific ad angles that exploit competitor weaknesses
    6. Price comparison and value proposition opportunities`,

  // Step 4: Hook Extraction
  hookGeneration: `Based on all the research provided, generate 20 high-converting hooks.
    
    Context:
    - Product: {{product}}
    - Top benefits: {{benefits}}
    - Top pain points: {{painPoints}}
    - Customer language: {{customerLanguage}}
    - Competitor gaps: {{competitorGaps}}
    
    Generate hooks that:
    1. Use exact customer language (not cleaned up)
    2. Lead with emotion or curiosity
    3. Are under 10 words when possible
    4. Include specific numbers/statistics where relevant
    5. Address objections or competitor comparisons
    
    Format each hook with:
    - The hook text
    - Which angle it addresses
    - Why it will work`,

  // Step 5: Visual Concept Generation
  visualConcepts: `Generate scroll-stopping visual concepts for Facebook ads.
    
    Product: {{product}}
    Key benefits to visualize: {{benefits}}
    Pain points to dramatize: {{painPoints}}
    Successful organic content themes: {{organicThemes}}
    
    For each benefit/pain point, provide:
    1. A Midjourney prompt (be specific about style, composition, colors)
    2. Why this visual will stop the scroll
    3. What emotion it evokes
    4. How it connects to the benefit/pain point
    
    Also include:
    - Metaphor/simile based visuals from customer language
    - Before/after transformation concepts
    - Competitor comparison visuals
    - Lifestyle aspiration visuals`,

  // Step 6: Complete Ad Concepts
  conceptSynthesis: `Create 5 complete ad concepts based on all research.
    
    Research summary:
    - Top performing angles: {{angles}}
    - Customer insights: {{insights}}
    - Competitor opportunities: {{opportunities}}
    - Successful hooks: {{hooks}}
    
    For each concept provide:
    1. Concept name
    2. Target angle
    3. Hook options (2-3)
    4. Visual direction
    5. Key copy points (using customer language)
    6. Why this will outperform current ads
    7. Production notes`
};

export async function POST(request: NextRequest) {
  try {
    const { onesheetId, step, inputs } = await request.json();

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify OneSheet ownership
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('*')
      .eq('id', onesheetId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found or access denied' }, { status: 404 });
    }

    // Get the appropriate prompt
    const promptTemplate = RESEARCH_PROMPTS[step as keyof typeof RESEARCH_PROMPTS];
    if (!promptTemplate) {
      return NextResponse.json({ error: 'Invalid research step' }, { status: 400 });
    }

    // Replace placeholders
    let prompt = promptTemplate;
    Object.entries(inputs).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
    });

    // Run AI analysis with Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = response.text();

    // Process and structure the output based on step
    const processedData = processOutput(step, output);

    // Update OneSheet with results
    const updatedOneSheet = await updateOneSheetWithResearch(
      supabase,
      onesheetId,
      step,
      processedData,
      onesheet
    );

    return NextResponse.json({
      success: true,
      step,
      output,
      processedData,
      updatedOneSheet
    });

  } catch (error) {
    console.error('Automated research error:', error);
    return NextResponse.json(
      { error: 'Research failed', details: error },
      { status: 500 }
    );
  }
}

function processOutput(step: string, output: string) {
  // Process AI output based on the research step
  switch (step) {
    case 'marketAnalysis':
      return parseMarketAnalysis(output);
    case 'reviewAnalysis':
      return parseReviewAnalysis(output);
    case 'competitorAnalysis':
      return parseCompetitorAnalysis(output);
    case 'hookGeneration':
      return parseHooks(output);
    case 'visualConcepts':
      return parseVisualConcepts(output);
    case 'conceptSynthesis':
      return parseAdConcepts(output);
    default:
      return { rawOutput: output };
  }
}

function parseMarketAnalysis(output: string) {
  const sections = output.split(/\d+\.\s+/);
  return {
    category: sections[1]?.trim() || '',
    benefits: extractListItems(sections[2] || ''),
    painPoints: extractListItems(sections[3] || ''),
    misconceptions: extractListItems(sections[4] || ''),
    trends: extractListItems(sections[5] || '')
  };
}

function parseReviewAnalysis(output: string) {
  const sections = output.split(/[A-Z]+(?:\s+[A-Z]+)*:/);
  
  return {
    benefits: parseQuotedSection(sections[1] || ''),
    painPoints: parseQuotedSection(sections[2] || ''),
    features: parseQuotedSection(sections[3] || ''),
    objections: parseQuotedSection(sections[4] || ''),
    failedSolutions: parseQuotedSection(sections[5] || ''),
    customerLanguage: extractListItems(sections[6] || '')
  };
}

function parseQuotedSection(text: string) {
  const items = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentItem = null;
  for (const line of lines) {
    if (line.startsWith('-') || line.startsWith('•')) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        title: line.replace(/^[-•]\s*/, '').trim(),
        quotes: []
      };
    } else if (line.includes('"') && currentItem) {
      currentItem.quotes.push(line.trim());
    }
  }
  if (currentItem) items.push(currentItem);
  
  return items;
}

function parseCompetitorAnalysis(output: string) {
  const sections = output.split(/\d+\.\s+/);
  return {
    similarities: extractListItems(sections[1] || ''),
    differences: extractListItems(sections[2] || ''),
    dissatisfactionPoints: extractListItems(sections[3] || ''),
    opportunities: extractListItems(sections[4] || ''),
    adAngles: extractListItems(sections[5] || ''),
    priceComparison: sections[6]?.trim() || ''
  };
}

function parseHooks(output: string) {
  const hooks = [];
  const hookBlocks = output.split(/\d+\.\s+/).filter(block => block.trim());
  
  hookBlocks.forEach(block => {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      hooks.push({
        text: lines[0].replace(/^["']|["']$/g, '').trim(),
        angle: lines.find(l => l.includes('Angle:'))?.replace('Angle:', '').trim() || '',
        reasoning: lines.find(l => l.includes('Why:'))?.replace('Why:', '').trim() || ''
      });
    }
  });
  
  return hooks;
}

function parseVisualConcepts(output: string) {
  const concepts = [];
  const conceptBlocks = output.split(/(?=For\s+[\w\s]+:)/i);
  
  conceptBlocks.forEach(block => {
    if (block.trim()) {
      const lines = block.split('\n').filter(line => line.trim());
      concepts.push({
        target: lines[0]?.replace('For', '').replace(':', '').trim() || '',
        midjourneyPrompt: lines.find(l => l.includes('Midjourney'))?.trim() || '',
        scrollStopReason: lines.find(l => l.includes('stop'))?.trim() || '',
        emotion: lines.find(l => l.includes('emotion'))?.trim() || '',
        connection: lines.find(l => l.includes('connect'))?.trim() || ''
      });
    }
  });
  
  return concepts;
}

function parseAdConcepts(output: string) {
  const concepts = [];
  const conceptBlocks = output.split(/Concept\s+\d+:|^\d+\.\s+/m).filter(block => block.trim());
  
  conceptBlocks.forEach(block => {
    const lines = block.split('\n').filter(line => line.trim());
    const concept: any = {};
    
    lines.forEach(line => {
      if (line.includes('name:')) concept.name = line.split(':')[1]?.trim();
      if (line.includes('angle:')) concept.angle = line.split(':')[1]?.trim();
      if (line.includes('Hook')) concept.hooks = extractListItems(lines.join('\n'));
      if (line.includes('Visual')) concept.visual = line.split(':')[1]?.trim();
      if (line.includes('copy points')) concept.copyPoints = extractListItems(lines.join('\n'));
      if (line.includes('Why')) concept.reasoning = line.split(':')[1]?.trim();
      if (line.includes('Production')) concept.productionNotes = line.split(':')[1]?.trim();
    });
    
    if (concept.name) concepts.push(concept);
  });
  
  return concepts;
}

function extractListItems(text: string) {
  return text
    .split('\n')
    .filter(line => line.trim() && (line.includes('-') || line.includes('•') || /^\d+\./.test(line.trim())))
    .map(line => line.replace(/^[-•\d.]\s*/, '').trim())
    .filter(item => item.length > 0);
}

async function updateOneSheetWithResearch(
  supabase: any,
  onesheetId: string,
  step: string,
  processedData: any,
  currentOneSheet: any
) {
  const updates: any = {};

  switch (step) {
    case 'marketAnalysis':
      // Add to AI research data
      updates.ai_research_data = {
        ...currentOneSheet.ai_research_data,
        marketAnalysis: processedData,
        lastUpdated: new Date().toISOString()
      };
      break;

    case 'reviewAnalysis':
      // Convert to audience insights format
      const insights = [];
      ['benefits', 'painPoints', 'features', 'objections', 'failedSolutions'].forEach(category => {
        processedData[category]?.forEach((item: any) => {
          insights.push({
            id: crypto.randomUUID(),
            category,
            title: item.title || item,
            supportingEvidence: {
              reviews: item.quotes?.map((q: string) => ({
                text: q,
                source: 'Customer Review',
                url: currentOneSheet.customer_reviews_url
              })) || [],
              information: [],
              statistics: []
            }
          });
        });
      });
      updates.audience_insights = [...(currentOneSheet.audience_insights || []), ...insights];
      break;

    case 'competitorAnalysis':
      // Add to competitor analysis
      const competitorData = {
        id: crypto.randomUUID(),
        name: processedData.competitorName || 'Competitor',
        similarities: processedData.similarities || [],
        differences: processedData.differences || [],
        opportunities: processedData.opportunities || [],
        customerComplaints: processedData.dissatisfactionPoints?.map((point: string) => ({
          complaint: point,
          source: 'Analysis',
          url: ''
        })) || [],
        adLibraryAnalysis: {
          creators: [],
          formats: [],
          strategies: processedData.adAngles || []
        },
        priceComparison: 'similar',
        qualityComparison: '',
        positioningOpportunity: processedData.opportunities?.[0] || ''
      };
      updates.competitor_analysis = [...(currentOneSheet.competitor_analysis || []), competitorData];
      break;

    case 'hookGeneration':
      // Add hooks
      const hooks = processedData.map((hook: any) => ({
        id: crypto.randomUUID(),
        text: hook.text,
        angle: hook.angle,
        persona: '',
        format: '',
        priority: 1,
        inspiration: {
          source: 'AI Generated from Research',
          sourceUrl: '',
          customerLanguage: true
        },
        testVariations: []
      }));
      updates.hooks = [...(currentOneSheet.hooks || []), ...hooks];
      break;

    case 'visualConcepts':
      // Add visual concepts
      const visuals = processedData.map((visual: any) => ({
        id: crypto.randomUUID(),
        description: visual.midjourneyPrompt,
        type: 'other',
        angle: visual.target,
        priority: 1,
        inspiration: {
          source: 'AI Generated',
          sourceUrl: '',
          organicReference: false
        },
        productionNotes: `${visual.scrollStopReason} | ${visual.emotion}`
      }));
      updates.visuals = [...(currentOneSheet.visuals || []), ...visuals];
      break;

    case 'conceptSynthesis':
      // Add complete concepts
      const concepts = processedData.map((concept: any) => ({
        id: crypto.randomUUID(),
        title: concept.name,
        description: concept.reasoning || '',
        angle: concept.angle || '',
        format: '',
        emotion: '',
        framework: '',
        priority: 1,
        inspiration: {
          source: 'AI Synthesis',
          sourceUrl: '',
          relatedResearch: []
        },
        productionNotes: concept.productionNotes || '',
        estimatedBudget: 0
      }));
      updates.concepts = [...(currentOneSheet.concepts || []), ...concepts];
      break;
  }

  const { data, error } = await supabase
    .from('onesheet')
    .update(updates)
    .eq('id', onesheetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update OneSheet: ${error.message}`);
  }

  return data;
} 