import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPromptById, replacePlaceholders } from '@/lib/prompts/onesheet-prompts';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { promptId, inputs, onesheetId } = await request.json();

    if (!promptId || !inputs || !onesheetId) {
      return NextResponse.json(
        { error: 'Missing required fields: promptId, inputs, onesheetId' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the prompt template
    const promptTemplate = getPromptById(promptId);
    if (!promptTemplate) {
      return NextResponse.json({ error: 'Prompt template not found' }, { status: 404 });
    }

    // Get the OneSheet to verify ownership
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('*')
      .eq('id', onesheetId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found or access denied' }, { status: 404 });
    }

    // Replace placeholders in the prompt
    const finalPrompt = replacePlaceholders(promptTemplate.prompt, inputs);

    // Run the AI prompt with Gemini 2.5 Pro Preview
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro-preview-06-05',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const aiOutput = response.text();

    // Process and structure the AI output based on the target
    const processedData = await processAIOutput(aiOutput, promptTemplate.outputTarget);

    // Update the OneSheet with the processed data
    const updatedOneSheet = await updateOneSheetWithAIData(
      supabase, 
      onesheetId, 
      promptTemplate.outputTarget, 
      processedData,
      onesheet
    );

    return NextResponse.json({
      success: true,
      aiOutput,
      processedData,
      updatedOneSheet,
      usage: {
        model: 'gemini-2.5-pro-preview-06-05',
        promptUsed: finalPrompt
      }
    });

  } catch (error) {
    console.error('Error running OneSheet prompt:', error);
    return NextResponse.json(
      { error: 'Failed to run prompt' },
      { status: 500 }
    );
  }
}

async function processAIOutput(aiOutput: string, outputTarget: string) {
  try {
    switch (outputTarget) {
      case 'angles':
        return parseAngles(aiOutput);
      
      case 'audience_insights.benefits':
      case 'audience_insights.painPoints':
      case 'audience_insights.objections':
      case 'audience_insights.statistics':
        return parseAudienceInsights(aiOutput, outputTarget.split('.')[1]);
      
      case 'audience_insights.all':
        return parseCompleteAudienceAnalysis(aiOutput);
      
      case 'personas':
        return parsePersonas(aiOutput);
      
      case 'social_listening_data':
        return parseSocialListening(aiOutput);
      
      case 'competitor_analysis':
        return parseCompetitorAnalysis(aiOutput);
      
      case 'concepts':
        return parseConcepts(aiOutput);
      
      case 'hooks':
        return parseHooks(aiOutput);
      
      case 'visuals':
        return parseVisuals(aiOutput);
      
      default:
        return { rawOutput: aiOutput };
    }
  } catch (error) {
    console.error('Error processing AI output:', error);
    return { rawOutput: aiOutput, error: 'Processing failed' };
  }
}

function parseAngles(aiOutput: string) {
  const angles = [];
  const lines = aiOutput.split('\n').filter(line => line.trim());
  
  let priority = 1;
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || line.includes('.')) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
      if (cleaned.length > 5) {
        const [title, ...descParts] = cleaned.split(':');
        angles.push({
          id: crypto.randomUUID(),
          title: title.trim(),
          description: descParts.join(':').trim() || '',
          priority: priority++,
          aiGenerated: true
        });
      }
    }
  }
  
  return angles;
}

function parseAudienceInsights(aiOutput: string, category: string) {
  const insights = [];
  const lines = aiOutput.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || line.includes('.')) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
      if (cleaned.length > 5) {
        insights.push({
          id: crypto.randomUUID(),
          category: category as any,
          title: cleaned,
          supportingEvidence: {
            reviews: [],
            information: [{ text: cleaned, source: 'AI Generated', url: '' }],
            statistics: []
          }
        });
      }
    }
  }
  
  return insights;
}

function parseCompleteAudienceAnalysis(aiOutput: string) {
  const sections = {
    benefits: [],
    painPoints: [],
    features: [],
    objections: [],
    failedSolutions: [],
    other: []
  };

  // Split by common section headers
  const sectionRegex = /(benefits?|pain\s*points?|features?|objections?|failed\s*solutions?|other)/i;
  const parts = aiOutput.split(sectionRegex);
  
  let currentSection = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]?.toLowerCase().trim();
    if (part && sectionRegex.test(part)) {
      currentSection = part.replace(/s$/, '').replace(/\s+/g, '');
      if (currentSection === 'painpoint') currentSection = 'painPoints';
      if (currentSection === 'failedsolution') currentSection = 'failedSolutions';
    } else if (currentSection && parts[i]) {
      const items = parseListItems(parts[i]);
      if (sections[currentSection as keyof typeof sections]) {
        sections[currentSection as keyof typeof sections].push(...items);
      }
    }
  }

  return Object.entries(sections).map(([category, items]) => ({
    category,
    items
  }));
}

function parseListItems(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const items = [];
  
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim())) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
      if (cleaned.length > 5) {
        items.push({
          id: crypto.randomUUID(),
          title: cleaned,
          supportingEvidence: {
            reviews: [],
            information: [{ text: cleaned, source: 'AI Generated', url: '' }],
            statistics: []
          }
        });
      }
    }
  }
  
  return items;
}

function parsePersonas(aiOutput: string) {
  // Simple persona parsing - this could be enhanced with more sophisticated parsing
  const personas = [];
  const sections = aiOutput.split(/persona\s*\d*:?/i).filter(s => s.trim());
  
  sections.forEach((section, index) => {
    if (section.trim().length > 50) {
      personas.push({
        id: crypto.randomUUID(),
        title: `Persona ${index + 1}`,
        demographics: {
          age: '',
          gender: '',
          location: '',
          income: '',
          education: '',
          occupation: ''
        },
        psychographics: {
          interests: [],
          lifestyle: [],
          values: [],
          painPoints: []
        },
        awarenessLevel: 'problemAware' as const,
        customerLanguage: [],
        description: section.trim()
      });
    }
  });
  
  return personas;
}

function parseSocialListening(aiOutput: string) {
  return {
    extractedLanguage: aiOutput.split('\n').filter(line => line.trim()),
    keyInsights: [],
    relevantQuotes: [],
    addedDate: new Date().toISOString()
  };
}

function parseCompetitorAnalysis(aiOutput: string) {
  // Parse competitor analysis output
  return [{
    id: crypto.randomUUID(),
    name: 'Competitor Analysis',
    similarities: [],
    differences: [],
    opportunities: aiOutput.split('\n').filter(line => line.trim()),
    customerComplaints: [],
    adLibraryAnalysis: {
      creators: [],
      formats: [],
      strategies: []
    },
    priceComparison: 'similar' as const,
    qualityComparison: '',
    positioningOpportunity: ''
  }];
}

function parseConcepts(aiOutput: string) {
  const concepts = [];
  const lines = aiOutput.split('\n').filter(line => line.trim());
  
  let priority = 1;
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim())) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
      if (cleaned.length > 10) {
        concepts.push({
          id: crypto.randomUUID(),
          title: cleaned.substring(0, 50) + '...',
          description: cleaned,
          angle: '',
          format: '',
          emotion: '',
          framework: '',
          priority: priority++,
          inspiration: {
            source: 'AI Generated',
            sourceUrl: '',
            relatedResearch: []
          },
          productionNotes: ''
        });
      }
    }
  }
  
  return concepts;
}

function parseHooks(aiOutput: string) {
  const hooks = [];
  const lines = aiOutput.split('\n').filter(line => line.trim());
  
  let priority = 1;
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim()) || line.includes('"')) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim().replace(/["""]/g, '"');
      if (cleaned.length > 5) {
        hooks.push({
          id: crypto.randomUUID(),
          text: cleaned,
          angle: '',
          persona: '',
          format: '',
          priority: priority++,
          inspiration: {
            source: 'AI Generated',
            sourceUrl: '',
            customerLanguage: true
          },
          testVariations: []
        });
      }
    }
  }
  
  return hooks;
}

function parseVisuals(aiOutput: string) {
  const visuals = [];
  const lines = aiOutput.split('\n').filter(line => line.trim());
  
  let priority = 1;
  for (const line of lines) {
    if (line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim())) {
      const cleaned = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
      if (cleaned.length > 10) {
        visuals.push({
          id: crypto.randomUUID(),
          description: cleaned,
          type: 'other' as const,
          angle: '',
          priority: priority++,
          inspiration: {
            source: 'AI Generated',
            sourceUrl: '',
            organicReference: false
          },
          productionNotes: ''
        });
      }
    }
  }
  
  return visuals;
}

async function updateOneSheetWithAIData(
  supabase: any, 
  onesheetId: string, 
  outputTarget: string, 
  processedData: any,
  currentOneSheet: any
) {
  const updateData: any = {};

  switch (outputTarget) {
    case 'angles':
      updateData.angles = [...(currentOneSheet.angles || []), ...processedData];
      break;
    
    case 'audience_insights.benefits':
    case 'audience_insights.painPoints':
    case 'audience_insights.objections':
    case 'audience_insights.statistics':
      const existingInsights = currentOneSheet.audience_insights || [];
      updateData.audience_insights = [...existingInsights, ...processedData];
      break;
    
    case 'audience_insights.all':
      const newInsights = [];
      processedData.forEach((section: any) => {
        newInsights.push(...section.items.map((item: any) => ({
          ...item,
          category: section.category
        })));
      });
      updateData.audience_insights = [...(currentOneSheet.audience_insights || []), ...newInsights];
      break;
    
    case 'personas':
      updateData.personas = [...(currentOneSheet.personas || []), ...processedData];
      break;
    
    case 'concepts':
      updateData.concepts = [...(currentOneSheet.concepts || []), ...processedData];
      break;
    
    case 'hooks':
      updateData.hooks = [...(currentOneSheet.hooks || []), ...processedData];
      break;
    
    case 'visuals':
      updateData.visuals = [...(currentOneSheet.visuals || []), ...processedData];
      break;
    
    case 'competitor_analysis':
      updateData.competitor_analysis = [...(currentOneSheet.competitor_analysis || []), ...processedData];
      break;
    
    default:
      // Store in ai_research_data for unspecified targets
      updateData.ai_research_data = {
        ...currentOneSheet.ai_research_data,
        [outputTarget]: processedData,
        lastUpdated: new Date().toISOString()
      };
  }

  const { data, error } = await supabase
    .from('onesheet')
    .update(updateData)
    .eq('id', onesheetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update OneSheet: ${error.message}`);
  }

  return data;
} 