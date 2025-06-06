import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Chat: Starting request processing');
    
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('🚨 Google AI API key not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🚨 Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🤖 AI Chat: Request body received:', { brandId: body.brandId, messageLength: body.message?.length });
    
    const { brandId, brandName, message } = body;

    if (!brandId || !message) {
      console.error('🚨 Missing required fields:', { brandId: !!brandId, message: !!message });
      return NextResponse.json({ 
        error: 'Brand ID and message are required' 
      }, { status: 400 });
    }

    // Initialize default values for safety
    let creators: unknown[] = [];
    let scripts: unknown[] = [];
    let emailThreads: unknown[] = [];
    let aiActions: unknown[] = [];
    let emailSequences: unknown[] = [];
    let brandSettings: unknown = null;

    // Fetch comprehensive UGC pipeline data with individual error handling
    console.log('🤖 AI Chat: Fetching comprehensive pipeline data for', brandName);

    // 1. Get detailed creator information - with error handling
    try {
      const { data, error } = await supabase
        .from('ugc_creators')
        .select(`
          id, name, status, email, platforms, content_types, products,
          contract_status, per_script_fee, product_shipped, product_shipment_status,
          contacted_by, created_at, updated_at
        `)
        .eq('brand_id', brandId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching creators:', error);
      } else {
        creators = data || [];
        console.log('✅ Fetched creators:', creators.length);
      }
    } catch (error) {
      console.error('🚨 Critical error fetching creators:', error);
    }

    // 2. Get all UGC scripts with concept statuses - with error handling
    try {
      const { data, error } = await supabase
        .from('ugc_creator_scripts')
        .select(`
          id, creator_id, title, concept_status, 
          script_content, filming_instructions, created_at, updated_at
        `)
        .eq('brand_id', brandId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching scripts:', error);
      } else {
        scripts = data || [];
        console.log('✅ Fetched scripts:', scripts.length);
      }
    } catch (error) {
      console.error('🚨 Critical error fetching scripts:', error);
    }

    // 3. Get email thread summary - with error handling
    try {
      const { data, error } = await supabase
        .from('ugc_email_threads')
        .select(`
          id, creator_id, thread_subject, status, created_at, updated_at
        `)
        .eq('brand_id', brandId)
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching email threads:', error);
      } else {
        emailThreads = data || [];
        console.log('✅ Fetched email threads:', emailThreads.length);
      }
    } catch (error) {
      console.error('🚨 Critical error fetching email threads:', error);
    }

    // 4. Get AI coordinator actions and recommendations - with error handling
    try {
      const { data, error } = await supabase
        .from('ugc_ai_coordinator_actions')
        .select(`
          id, action_type, action_data, creator_id, created_at
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching AI actions:', error);
      } else {
        aiActions = data || [];
        console.log('✅ Fetched AI actions:', aiActions.length);
      }
    } catch (error) {
      console.error('🚨 Critical error fetching AI actions:', error);
    }

    // 5. Get email sequences - with error handling
    try {
      const { data, error } = await supabase
        .from('ugc_email_sequences')
        .select('*')
        .eq('brand_id', brandId)
        .order('step_order');
      
      if (error) {
        console.error('Error fetching email sequences:', error);
      } else {
        emailSequences = data || [];
        console.log('✅ Fetched email sequences:', emailSequences.length);
      }
    } catch (error) {
      console.error('🚨 Critical error fetching email sequences:', error);
    }

    // 6. Get brand UGC settings - with error handling
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          name, email_identifier, 
          ugc_company_description, ugc_guide_description, 
          ugc_filming_instructions, ugc_default_system_instructions
        `)
        .eq('id', brandId)
        .single();
      
      if (error) {
        console.error('Error fetching brand settings:', error);
      } else {
        brandSettings = data;
        console.log('✅ Fetched brand settings');
      }
    } catch (error) {
      console.error('🚨 Critical error fetching brand settings:', error);
    }

    // Process and analyze the data
    const totalCreators = creators?.length || 0;
    const activeCreators = creators?.filter(c => c.status !== 'Rejected' && c.status !== 'Completed').length || 0;
    
    // Concept pipeline analysis
    const conceptStatuses = scripts?.reduce((acc, script) => {
      acc[script.concept_status] = (acc[script.concept_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Creator status distribution
    const creatorStatuses = creators?.reduce((acc, creator) => {
      acc[creator.status] = (acc[creator.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Recent activity summary
    const recentEmails = emailThreads?.slice(0, 10) || [];
    const recentAiActions = aiActions?.slice(0, 10) || [];
    const recentScripts = scripts?.slice(0, 10) || [];

    // Email performance
    const emailStats = {
      total: emailThreads?.length || 0,
      sent: emailThreads?.filter(e => e.status === 'sent').length || 0,
      delivered: emailThreads?.filter(e => e.status === 'delivered').length || 0,
      opened: emailThreads?.filter(e => e.status === 'opened').length || 0,
      failed: emailThreads?.filter(e => e.status === 'failed').length || 0
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    const systemPrompt = `
You are an expert AI assistant for UGC (User Generated Content) pipeline management for ${brandName}. You have comprehensive access to all pipeline data and can provide intelligent insights and actionable recommendations.

=== YOUR CAPABILITIES ===
You are essentially a human-level UGC pipeline manager with access to:
• Complete creator database and status tracking
• Full concept pipeline and script management
• Email automation and communication history  
• AI coordinator actions and recommendations
• Performance analytics and trend analysis
• Brand settings and configuration data

=== CURRENT PIPELINE STATUS ===

**CREATOR OVERVIEW:**
• Total Creators: ${totalCreators}
• Active in Pipeline: ${activeCreators}
• Creator Status Distribution: ${Object.entries(creatorStatuses).map(([status, count]) => `${status}: ${count}`).join(', ')}

**CONCEPT PIPELINE:**
• Total Scripts: ${scripts?.length || 0}
• Concept Status Distribution: ${Object.entries(conceptStatuses).map(([status, count]) => `${status}: ${count}`).join(', ')}

**EMAIL AUTOMATION:**
• Total Messages: ${emailStats.total}
• Delivery Rate: ${emailStats.total > 0 ? Math.round((emailStats.delivered / emailStats.total) * 100) : 0}%
• Open Rate: ${emailStats.total > 0 ? Math.round((emailStats.opened / emailStats.total) * 100) : 0}%
• Recent Email Activity: ${recentEmails.length} messages in last batch

**AI COORDINATOR ACTIVITY:**
• Recent Actions: ${recentAiActions.length} recommendations
• Active Sequences: ${emailSequences?.length || 0}

=== DETAILED DATA ACCESS ===

**CREATORS:**
${creators?.map(creator => `
• ${creator.name || creator.email} (${creator.status})
  - Platforms: ${Array.isArray(creator.platforms) ? creator.platforms.join(', ') : 'Not specified'}
  - Content Types: ${Array.isArray(creator.content_types) ? creator.content_types.join(', ') : 'Not specified'}
  - Contract: ${creator.contract_status}
  - Fee: $${creator.per_script_fee || 0}/script
  - Product Shipped: ${creator.product_shipped ? 'Yes' : 'No'}
  - Last Updated: ${new Date(creator.updated_at).toLocaleDateString()}
`).join('') || 'No creators found'}

**RECENT SCRIPTS:**
${recentScripts.map(script => `
• "${script.title}" - ${script.concept_status}
  - Creator: ${script.creator_id}
  - Updated: ${new Date(script.updated_at).toLocaleDateString()}
`).join('') || 'No scripts found'}

**RECENT EMAIL ACTIVITY:**
${recentEmails.map(thread => `
• ${thread.thread_subject} (${thread.status})
  - Creator: ${thread.creator_id}
  - Messages: ${thread.id}
  - Last Updated: ${new Date(thread.updated_at).toLocaleDateString()}
`).join('') || 'No recent emails'}

**RECENT AI RECOMMENDATIONS:**
${recentAiActions.map(action => `
• ${action.action_type} - ${action.creator_id}
  - Date: ${new Date(action.created_at).toLocaleDateString()}
`).join('') || 'No recent AI actions'}

**BRAND CONFIGURATION:**
• Company Description: ${brandSettings?.ugc_company_description ? 'Configured' : 'Not set'}
• Filming Instructions: ${brandSettings?.ugc_filming_instructions ? 'Configured' : 'Not set'}  
• AI System Instructions: ${brandSettings?.ugc_default_system_instructions ? 'Configured' : 'Not set'}
• Email Domain: ${brandSettings?.email_identifier || 'Not configured'}

=== YOUR INTELLIGENCE LEVEL ===
You should respond as an expert UGC pipeline manager who:
• Understands the entire creator journey from outreach to content delivery
• Can identify bottlenecks, opportunities, and optimization strategies
• Provides specific, actionable recommendations with next steps
• Asks intelligent follow-up questions when needed
• Can suggest email templates, sequence improvements, and process automation
• Understands creator psychology and relationship management
• Can analyze trends and predict pipeline outcomes

=== RESPONSE GUIDELINES ===
• Be conversational but professional
• Provide specific data-driven insights
• Suggest concrete next steps and actions
• Reference specific creators, scripts, or emails when relevant
• Ask clarifying questions if you need more context
• Always think holistically about the entire pipeline
• Prioritize high-impact recommendations

USER MESSAGE: "${message}"

Analyze the current pipeline state and provide intelligent guidance based on all available data.
`;

    console.log('🤖 AI Chat: Generating response with comprehensive context');
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    return NextResponse.json({
      success: true,
      response: aiResponse,
      context: {
        totalCreators,
        activeCreators,
        totalScripts: scripts?.length || 0,
        totalEmails: emailThreads?.length || 0,
        recentActivity: {
          scripts: recentScripts.length,
          emails: recentEmails.length,
          aiActions: recentAiActions.length
        }
      }
    });

  } catch (error) {
    console.error('AI Chat comprehensive error:', error);
    return NextResponse.json({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 