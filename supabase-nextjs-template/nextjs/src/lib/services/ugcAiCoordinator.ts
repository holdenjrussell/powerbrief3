import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSSRClient } from '@/lib/supabase/server';
import { UgcCreator, UgcCreatorScript } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';
import { ugcEmailService } from './ugcEmailService';
import { sendSlackNotification } from '@/lib/utils/slackNotifications';

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';

// Define proper types
type CoordinatorSettings = {
  proactivity_level: 'low' | 'medium' | 'high';
  auto_send_emails: boolean;
  require_approval: boolean;
  working_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  follow_up_delays: {
    onboarding: number;
    script_pipeline: number;
  };
  [key: string]: unknown;
};

type ModelConfig = {
  model: string;
  temperature: number;
  [key: string]: unknown;
};

type ActionData = {
  creator_id?: string;
  analysis?: string;
  recommendedActions?: AiAction[];
  error?: string;
  template?: string;
  variables?: Record<string, unknown>;
  purpose?: string;
  subject?: string;
  creator_name?: string;
  [key: string]: unknown;
};

export interface AiCoordinator {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  settings: CoordinatorSettings;
  system_prompt?: string;
  model_config: ModelConfig;
  slack_notifications_enabled: boolean;
  email_automation_enabled: boolean;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CoordinatorAction {
  id: string;
  coordinator_id: string;
  creator_id?: string;
  script_id?: string;
  action_type: 'email_sent' | 'status_changed' | 'script_assigned' | 'follow_up' | 'slack_notification' | 'ai_analysis';
  action_data: ActionData;
  success: boolean;
  error_message?: string;
  ai_reasoning: string;
  created_at: string;
}

interface AiAction {
  type: 'email_sent' | 'status_changed' | 'follow_up' | 'script_assigned';
  priority: 'high' | 'medium' | 'low';
  description: string;
  reasoning?: string;
  emailTemplate?: string;
}

interface SlackNotificationData {
  brandId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
}

// Extended types for creator properties not in main interface
interface ExtendedCreator extends UgcCreator {
  product_sent?: boolean;
  rates?: number;
  ugc_company_description?: string;
}

interface ExtendedBrand extends Brand {
  ugc_company_description?: string;
}

interface ExistingAction {
  id: string;
  action_type: string;
  action_data: ActionData;
  success: boolean;
  created_at: string;
}

interface ActionRecommendation {
  type: string;
  priority: string;
  description: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert UGC (User Generated Content) Coordinator and Influencer Manager for The Grounding Co. Your role is to manage creator relationships, coordinate the content pipeline, and ensure smooth communication throughout the entire process.

Your expertise includes:
- UGC creator onboarding and relationship management
- Script assignment and project coordination
- Email communication and follow-ups
- Pipeline management and status tracking
- Contract and payment coordination
- Product shipment logistics

Your personality:
- Professional yet friendly and approachable
- Proactive and detail-oriented
- Excellent at maintaining relationships
- Clear and effective communicator
- Efficient and organized

Key responsibilities:
1. Monitor creator pipeline statuses and identify actions needed
2. Craft personalized emails for different stages of the process
3. Follow up on pending items (contracts, payments, shipping)
4. Identify creators who need attention or follow-up
5. Coordinate script assignments and approvals
6. Track and manage creator communications
7. Provide insights and recommendations for optimization

Communication style:
- Use friendly, professional tone
- Personalize messages based on creator information
- Be clear about next steps and expectations
- Show appreciation for creators' work
- Address concerns proactively

Current workflow stages you manage:
ONBOARDING: New Creator Submission → Cold Outreach → Primary Screen → Backlog → Approved for Next Steps → Schedule Call → Call Scheduled → READY FOR SCRIPTS → REJECTED

SCRIPT PIPELINE: Script Approval → Creator Assignment → Send Script to Creator → Creator Shooting → Content Approval → To Edit

Always consider the creator's status, history, and any pending items when making decisions or crafting communications.`;

// Rate limiting helper
class RateLimiter {
  private lastCall = 0;
  private callCount = 0;
  private readonly minInterval = 2000; // 2 seconds between calls
  private readonly maxCallsPerMinute = 15; // Conservative limit
  private callTimes: number[] = [];

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove calls older than 1 minute
    this.callTimes = this.callTimes.filter(time => now - time < 60000);
    
    // Check if we're at the rate limit
    if (this.callTimes.length >= this.maxCallsPerMinute) {
      const oldestCall = this.callTimes[0];
      const waitTime = 60000 - (now - oldestCall) + 1000; // Wait until oldest call is > 1 minute old + buffer
      console.log(`⏰ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForRateLimit(); // Recursive check
    }
    
    // Ensure minimum interval between calls
    const timeSinceLastCall = now - this.lastCall;
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      console.log(`⏳ Waiting ${waitTime}ms for rate limit interval`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
    this.callTimes.push(this.lastCall);
  }
}

const rateLimiter = new RateLimiter();

export class UgcAiCoordinatorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async getSupabaseClient() {
    return await createSSRClient();
  }

  // Helper method to get coordinator ID for a brand
  private async getCoordinatorId(brandId: string): Promise<string> {
    const supabase = await this.getSupabaseClient();
    const { data } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .select('id')
      .eq('brand_id', brandId)
      .single();
    return data?.id || '';
  }

  // Get or create AI coordinator for a brand
  async getOrCreateCoordinator(brandId: string, userId: string): Promise<AiCoordinator> {
    const supabase = await this.getSupabaseClient();

    // Try to find existing coordinator
    const { data: existing } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    if (existing) {
      return existing as AiCoordinator;
    }

    // Create new coordinator
    const { data: newCoordinator, error } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .insert({
        brand_id: brandId,
        user_id: userId,
        name: 'AI UGC Coordinator',
        enabled: true,
        settings: {
          proactivity_level: 'medium',
          auto_send_emails: false, // Start with manual approval
          require_approval: true,
          working_hours: {
            start: '09:00',
            end: '17:00',
            timezone: 'America/Los_Angeles'
          },
          follow_up_delays: {
            onboarding: 48, // 48 hours
            script_pipeline: 24 // 24 hours
          }
        },
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        model_config: {
          model: MODEL_NAME,
          temperature: 0.7
        },
        slack_notifications_enabled: false,
        email_automation_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create AI coordinator: ${error.message}`);
    }

    return newCoordinator as AiCoordinator;
  }

  // Log an action to the coordinator
  async logAction(
    coordinatorId: string,
    actionType: string,
    actionData: ActionData,
    creatorId?: string,
    scriptId?: string
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    await (supabase as any)
      .from('ugc_ai_coordinator_actions')
      .insert({
        coordinator_id: coordinatorId,
        action_type: actionType,
        action_data: actionData,
        creator_id: creatorId,
        script_id: scriptId,
        created_at: new Date().toISOString()
      });
  }

  // Analyze creator status and recommend actions
  async analyzeCreatorStatus(creator: UgcCreator, brand: Brand): Promise<{ analysis: string; recommendedActions: AiAction[] }> {
    console.log('🤖 AI Coordinator: Starting analysis for creator:', creator.name || creator.email || creator.id);
    console.log('📊 Creator status:', creator.status);
    console.log('📧 Creator email valid:', !!creator.email);
    
    // Skip analysis if creator has no email and no name (incomplete data)
    if (!creator.email && !creator.name) {
      console.log('⚠️ Skipping creator with incomplete data (no email or name)');
      return {
        analysis: 'Creator has incomplete data - missing both email and name. Manual review needed.',
        recommendedActions: [{
          type: 'follow_up',
          priority: 'medium',
          description: 'Complete creator information - add email and name',
          reasoning: 'Cannot analyze creator without basic contact information'
        }]
      };
    }
    
    const supabase = await this.getSupabaseClient();
    
    // Ensure coordinator exists - create if needed
    console.log('🔍 Ensuring AI coordinator exists for brand:', brand.id);
    if (!brand.user_id) {
      console.error('❌ Brand missing user_id, cannot create coordinator');
      return {
        analysis: 'Cannot create AI coordinator - brand missing user_id',
        recommendedActions: [{
          type: 'follow_up',
          priority: 'high',
          description: 'Fix brand configuration - missing user_id',
          reasoning: 'Brand must have user_id to create AI coordinator'
        }]
      };
    }
    
    const coordinator = await this.getOrCreateCoordinator(brand.id, brand.user_id);
    const coordinatorId = coordinator.id;
    console.log('✅ Using coordinator ID:', coordinatorId);

    try {
      console.log('🧠 Preparing context for Gemini analysis...');
      
      // Get creator's script history
      const { data: scripts } = await supabase
        .from('ugc_creator_scripts')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });

      console.log('📝 Found', scripts?.length || 0, 'scripts for creator');

      // Get existing outstanding recommendations from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingActions } = await supabase
        .from('ugc_ai_coordinator_actions')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('coordinator_id', coordinatorId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      console.log('📋 Found', existingActions?.length || 0, 'recent coordinator actions for creator');

      // Build comprehensive context
      const extendedCreator = creator as ExtendedCreator;
      const extendedBrand = brand as ExtendedBrand;
      
      const creatorContext = `
CREATOR PROFILE:
- Name: ${creator.name || 'Not provided'}
- Email: ${creator.email || 'Not provided'}
- Instagram: ${creator.instagram_handle || 'Not provided'}
- Status: ${creator.status}
- Product Sent: ${extendedCreator.product_sent ? 'Yes' : 'No'}
- Rates: ${extendedCreator.rates ? `$${extendedCreator.rates}` : 'Not set'}
- Created: ${creator.created_at}
- Last Updated: ${creator.updated_at}

SCRIPT HISTORY (${scripts?.length || 0} scripts):
${scripts?.map(script => `
- Script ID: ${script.id}
- Title: ${script.title || 'Untitled'}
- Status: ${script.status}
- Type: ${script.video_type || 'Not specified'}
- Created: ${script.created_at}
- Due Date: ${script.due_date || 'Not set'}
`).join('\n') || 'No scripts found'}

RECENT AI COORDINATOR ACTIONS (last 7 days):
${(existingActions as ExistingAction[])?.map(action => {
  const actionData = action.action_data || {};
  const recommendations = actionData.recommendedActions as ActionRecommendation[] || [];
  
  if (action.action_type === 'ai_analysis' && recommendations.length > 0) {
    return `
- Analysis Date: ${action.created_at}
- Previous Recommendations:
${recommendations.map((rec, index) => `  ${index + 1}. [${rec.priority?.toUpperCase() || 'UNKNOWN'}] ${rec.type}: ${rec.description}`).join('\n')}`;
  } else if (action.action_type === 'email_sent') {
    return `
- Action: Email sent (${action.created_at})
- Template: ${actionData.template || 'Custom'}
- Success: ${action.success ? 'Yes' : 'No'}`;
  } else {
    return `
- Action: ${action.action_type} (${action.created_at})
- Success: ${action.success ? 'Yes' : 'No'}`;
  }
}).join('\n') || 'No recent actions found'}
`;

      const brandContext = `
BRAND INFO:
- Name: ${brand.name}
- UGC Company Description: ${extendedBrand.ugc_company_description || 'Not set'}
- Target Audience: ${brand.target_audience_data ? JSON.stringify(brand.target_audience_data) : 'Not defined'}
`;

      console.log('📝 Creator context prepared:', creatorContext.substring(0, 300) + '...');
      console.log('🏢 Brand context prepared:', brandContext.substring(0, 200) + '...');

      const analysisPrompt = `
You are an AI UGC (User Generated Content) Coordinator helping manage creator relationships and script pipeline. 

${brandContext}

${creatorContext}

IMPORTANT INSTRUCTIONS:
1. Review the RECENT AI COORDINATOR ACTIONS above carefully
2. DO NOT repeat recommendations that were recently made unless the situation has significantly changed
3. If previous recommendations are still valid and pending, acknowledge them instead of duplicating
4. Focus on NEW actions needed or status updates since the last analysis

CURRENT SITUATION:
Please analyze this creator's status and provide:

1. ANALYSIS: A brief assessment of where this creator stands in the pipeline, considering recent actions taken
2. RECOMMENDED ACTIONS: NEW specific actions that should be taken next (avoid duplicating recent recommendations)

Consider:
- Pipeline progression (onboarding → rates → shipping → scripting → delivery)
- Email communication needs (but avoid re-sending similar emails)
- Follow-up requirements
- Potential issues or blockers
- Optimization opportunities
- Whether previous recommendations are still pending or have been addressed

Respond in JSON format:
{
  "analysis": "Brief analysis of creator status and pipeline position, referencing any recent actions",
  "recommendedActions": [
    {
      "type": "email_sent" | "status_changed" | "follow_up" | "script_assigned",
      "priority": "high" | "medium" | "low",
      "description": "What NEW action should be taken (avoid duplicates)",
      "reasoning": "Why this action is recommended, considering recent activity",
      "emailTemplate": "template_name"
    }
  ]
}
`;

      console.log('🚀 Sending prompt to Gemini (length:', analysisPrompt.length, 'characters)');
      console.log('📤 Prompt preview:', analysisPrompt.substring(0, 500) + '...');

      // Wait for rate limiting before API call
      await rateLimiter.waitForRateLimit();

      // Use gemini-2.5-flash model consistently
      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      
      console.log('⏳ Making Gemini API call with enhanced retry logic...');
      
      // Enhanced retry logic with exponential backoff
      let retryCount = 0;
      const maxRetries = 5;
      let result;
      
      while (retryCount < maxRetries) {
        try {
          result = await model.generateContent(analysisPrompt);
          console.log('✅ Gemini API call successful');
          break; // Success, exit retry loop
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`🔄 Attempt ${retryCount + 1} failed:`, errorMessage);
          
          if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate')) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Exponential backoff: 2^n * 2 seconds (4s, 8s, 16s, 32s)
              const waitTime = Math.pow(2, retryCount) * 2000;
              console.log(`⏰ Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // For non-rate-limit errors, try once more with a short delay
          if (retryCount === 0) {
            retryCount++;
            console.log(`⏳ Retrying after 1 second for error: ${errorMessage}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          throw error; // Re-throw if not rate limit or max retries reached
        }
      }
      
      if (!result) {
        throw new Error('Failed to get response from Gemini after retries');
      }
      
      const responseText = result.response.text();
      
      console.log('📥 Gemini response received (length:', responseText.length, 'characters)');
      console.log('📄 Raw Gemini response:', responseText);

      // Parse the JSON response
      let parsedResponse;
      try {
        // Clean up the response - remove any markdown formatting
        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        console.log('🧹 Cleaned response:', cleanResponse);
        
        parsedResponse = JSON.parse(cleanResponse);
        console.log('✅ Successfully parsed JSON response:', JSON.stringify(parsedResponse, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini response as JSON:', parseError);
        console.log('📄 Attempted to parse:', responseText);
        
        // Fallback response
        parsedResponse = {
          analysis: `AI analysis failed to parse. Raw response: ${responseText.substring(0, 200)}...`,
          recommendedActions: [{
            type: 'follow_up',
            priority: 'medium',
            description: 'Manual review needed - AI response parsing failed',
            reasoning: 'Unable to parse AI coordinator response'
          }]
        };
      }

      const analysis = parsedResponse.analysis || 'No analysis provided';
      const recommendedActions = parsedResponse.recommendedActions || [];

      console.log('🎯 Analysis result:', analysis);
      console.log('📋 Recommended actions count:', recommendedActions.length);
      recommendedActions.forEach((action: AiAction, index: number) => {
        console.log(`   ${index + 1}. [${action.priority?.toUpperCase()}] ${action.type}: ${action.description}`);
      });

      // Log the analysis
      console.log('💾 Logging analysis action to database...');
      await this.logAction(
        coordinatorId,
        'ai_analysis',
        { creator_id: creator.id, analysis, recommendedActions },
        creator.id
      );
      console.log('✅ Analysis logged successfully');

      return { analysis, recommendedActions };

    } catch (error) {
      console.error('❌ Failed to analyze creator status:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        creatorId: creator.id,
        brandId: brand.id
      });
      
      // Log the error
      await this.logAction(
        coordinatorId,
        'ai_analysis',
        { creator_id: creator.id, error: error instanceof Error ? error.message : 'Unknown error' },
        creator.id
      );

      // Return a fallback analysis instead of throwing
      if (error instanceof Error && (error.message.includes('quota') || error.message.includes('429'))) {
        return {
          analysis: 'Rate limit reached for AI analysis. Please try again in a few minutes.',
          recommendedActions: [{
            type: 'follow_up',
            priority: 'low',
            description: 'Retry AI analysis after rate limit reset',
            reasoning: 'Gemini API quota exceeded'
          }]
        };
      }

      throw error;
    }
  }

  // Generate personalized email content
  async generateEmail(
    coordinatorId: string,
    context: {
      creator: UgcCreator;
      brand: Brand;
      script?: UgcCreatorScript;
      purpose: string;
      tone: 'professional' | 'friendly' | 'urgent';
      includeElements?: string[];
    }
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
    reasoning: string;
  }> {
    try {
      // Wait for rate limiting before API call
      await rateLimiter.waitForRateLimit();
      
      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      let scriptActionLinks = '';
      
      if (context.script) {
        const links = ugcEmailService.generateScriptActionLinks(context.script.id, baseUrl);
        scriptActionLinks = `
SCRIPT ACTION LINKS:
- Approve Link: ${links.approveLink}
- Reject Link: ${links.rejectLink}
- Public Share Link: ${baseUrl}/ugc/script/${context.script.public_share_id}
`;
      }

      const extendedBrand = context.brand as ExtendedBrand;
      
      const prompt = `
As the AI UGC Coordinator for The Grounding Co, craft a personalized email for this creator.

CREATOR DETAILS:
- Name: ${context.creator.name}
- Status: ${context.creator.status}
- Email: ${context.creator.email}
- Contract Status: ${context.creator.contract_status}
- Product Shipped: ${context.creator.product_shipped}
- Per Script Fee: $${context.creator.per_script_fee || 'Not set'}

${context.script ? `
SCRIPT DETAILS:
- Title: ${context.script.title}
- Status: ${context.script.status}
- Fee: $${context.script.deposit_amount || 0} + $${context.script.final_payment_amount || 0}
- Payment Status: ${context.script.payment_status}

${scriptActionLinks}
` : ''}

EMAIL PURPOSE: ${context.purpose}
TONE: ${context.tone}
INCLUDE ELEMENTS: ${context.includeElements?.join(', ') || 'Standard elements'}

BRAND CONTEXT:
- Company: ${context.brand.name}
- Description: ${extendedBrand.ugc_company_description || 'Premium wellness and grounding products'}

GUIDELINES:
1. Use the established friendly, professional tone from the SOP
2. Include relevant action items and next steps
3. Personalize based on creator's specific situation
4. Include appropriate links and contact information
5. Follow the email style patterns shown in the training examples

Generate a complete email with:
- Compelling subject line
- HTML formatted content (clean, professional styling)
- Plain text version
- Your reasoning for the content choices

Return as JSON:
{
  "subject": "Email subject line",
  "htmlContent": "Full HTML email content with inline styles",
  "textContent": "Plain text version of the email",
  "reasoning": "Explanation of your content and approach choices"
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = JSON.parse(text);

      // Log the email generation
      await this.logAction(
        coordinatorId,
        'email_generated',
        { 
          creator_id: context.creator.id,
          purpose: context.purpose,
          subject: parsed.subject
        },
        context.creator.id,
        context.script?.id
      );

      return parsed;

    } catch (error) {
      console.error('Failed to generate email:', error);
      
      // Log the error
      await this.logAction(
        coordinatorId,
        'email_generation_failed',
        { creator_id: context.creator.id, purpose: context.purpose, error: error instanceof Error ? error.message : 'Unknown error' },
        context.creator.id,
        context.script?.id
      );

      throw error;
    }
  }

  // Process pipeline and identify actions needed
  async processPipeline(brandId: string): Promise<{
    summary: string;
    actions: Array<{
      creator: UgcCreator;
      recommendedActions: AiAction[];
      analysis: string;
    }>;
  }> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get coordinator
      const coordinator = await this.getOrCreateCoordinator(brandId, ''); // User ID will be set by calling function

      // Get all creators for the brand
      const { data: creators, error: creatorsError } = await supabase
        .from('ugc_creators')
        .select('*')
        .eq('brand_id', brandId);

      if (creatorsError) {
        throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
      }

      // Get all scripts for the brand
      const { data: _scripts, error: scriptsError } = await supabase
        .from('ugc_creator_scripts')
        .select('*')
        .eq('brand_id', brandId);

      if (scriptsError) {
        throw new Error(`Failed to fetch scripts: ${scriptsError.message}`);
      }

      // Get brand details
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        throw new Error(`Failed to fetch brand: ${brandError.message}`);
      }

      // Filter creators that actually need attention (more intelligent filtering)
      const creatorsNeedingAttention = creators?.filter(creator => {
        // Skip creators with incomplete data (will be handled quickly without AI)
        if (!creator.email && !creator.name) return false;
        
        // Focus on creators in active pipeline states
        const activeStatuses = [
          'Cold Outreach', 'Primary Screen', 'Approved for Next Steps', 
          'Schedule Call', 'Call Scheduled', 'READY FOR SCRIPTS',
          'Script Approval', 'Send Script to Creator', 'Creator Shooting'
        ];
        
        if (!activeStatuses.includes(creator.status)) return false;

        // Check if creator has been updated recently (within last 7 days)
        const lastUpdate = new Date(creator.updated_at);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Always analyze if it's been more than 3 days since update
        if (daysSinceUpdate > 3) return true;
        
        // For newer updates, only analyze high-priority statuses
        const highPriorityStatuses = ['READY FOR SCRIPTS', 'Script Approval', 'Creator Shooting'];
        return highPriorityStatuses.includes(creator.status);
      }) || [];

      console.log(`🔄 Filtered to ${creatorsNeedingAttention.length} creators needing attention out of ${creators?.length || 0} total creators`);

      const actions = [];

      // Process creators in smaller batches to avoid overwhelming the API
      const batchSize = 5; // Process max 5 creators at a time
      const creatorBatches = [];
      
      for (let i = 0; i < creatorsNeedingAttention.length; i += batchSize) {
        creatorBatches.push(creatorsNeedingAttention.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < creatorBatches.length; batchIndex++) {
        const batch = creatorBatches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${creatorBatches.length} with ${batch.length} creators`);

        for (let i = 0; i < batch.length; i++) {
          const creator = batch[i];
          console.log(`📋 Analyzing creator ${i + 1}/${batch.length}: ${creator.name || creator.email || creator.id}`);
          
          // Convert creator to proper type
          const creatorData: UgcCreator = {
            ...creator,
            products: Array.isArray(creator.products) 
              ? creator.products as string[]
              : JSON.parse(creator.products as string || '[]'),
            content_types: Array.isArray(creator.content_types)
              ? creator.content_types as string[]
              : JSON.parse(creator.content_types as string || '[]'),
            platforms: Array.isArray(creator.platforms)
              ? creator.platforms as string[]
              : JSON.parse(creator.platforms as string || '[]')
          };
          
          try {
            const analysis = await this.analyzeCreatorStatus(
              creatorData,
              brand as Brand
            );

            actions.push({
              creator: creatorData,
              recommendedActions: analysis.recommendedActions,
              analysis: analysis.analysis
            });
            
          } catch (error) {
            console.error(`Failed to analyze creator ${creator.name || creator.email}:`, error);
            
            actions.push({
              creator: creatorData,
              recommendedActions: [],
              analysis: `Error analyzing creator: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        // Add a longer delay between batches to be extra careful with rate limits
        if (batchIndex < creatorBatches.length - 1) {
          console.log('⏳ Adding 5-second delay between batches...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Add quick analysis for creators that were filtered out but still need basic attention
      const skippedCreators = creators?.filter(creator => 
        !creatorsNeedingAttention.includes(creator) && 
        creator.email && creator.name
      ) || [];

      for (const creator of skippedCreators) {
        const creatorData: UgcCreator = {
          ...creator,
          products: Array.isArray(creator.products) 
            ? creator.products as string[]
            : JSON.parse(creator.products as string || '[]'),
          content_types: Array.isArray(creator.content_types)
            ? creator.content_types as string[]
            : JSON.parse(creator.content_types as string || '[]'),
          platforms: Array.isArray(creator.platforms)
            ? creator.platforms as string[]
            : JSON.parse(creator.platforms as string || '[]')
        };

        // Basic analysis without AI for low-priority creators
        let basicAnalysis = '';
        let basicActions: AiAction[] = [];

        if (creator.status === 'Backlog') {
          basicAnalysis = 'Creator is in backlog - no immediate action needed';
          basicActions = [];
        } else if (creator.status === 'REJECTED') {
          basicAnalysis = 'Creator has been rejected - no further action needed';
          basicActions = [];
        } else {
          basicAnalysis = `Creator status: ${creator.status} - basic follow-up may be needed`;
          basicActions = [{
            type: 'follow_up',
            priority: 'low',
            description: 'Check if creator needs attention',
            reasoning: 'Status suggests possible follow-up needed'
          }];
        }

        actions.push({
          creator: creatorData,
          recommendedActions: basicActions,
          analysis: basicAnalysis
        });
      }

      // Generate summary
      const totalCreators = creators?.length || 0;
      const analyzedCreators = creatorsNeedingAttention.length;
      const actionableItems = actions.reduce((sum, action) => sum + action.recommendedActions.length, 0);
      const highPriorityItems = actions.reduce((sum, action) => 
        sum + action.recommendedActions.filter(a => a.priority === 'high').length, 0
      );

      const summary = `Pipeline processed for ${totalCreators} creators (${analyzedCreators} analyzed with AI). Found ${actionableItems} total action items (${highPriorityItems} high priority).`;

      // Update coordinator last activity
      await supabase
        .from('ugc_ai_coordinator')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', coordinator.id);

      return {
        summary,
        actions
      };

    } catch (error) {
      console.error('Failed to process pipeline:', error);
      throw error;
    }
  }

  // Send Slack notification about AI coordinator activity
  async sendSlackUpdate(
    brandId: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      const slackData: SlackNotificationData = {
        brandId,
        type: 'ugc_ai_coordinator',
        title: '🤖 AI UGC Coordinator Update',
        message,
        data: data || {}
      };
      
      await sendSlackNotification(slackData);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      // Don't throw - Slack notifications are non-critical
    }
  }

  // Execute recommended action
  async executeAction(
    coordinatorId: string,
    action: {
      type: string;
      creator: UgcCreator;
      script?: UgcCreatorScript;
      emailTemplate?: string;
      variables?: Record<string, unknown>;
      brand: Brand;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.type) {
        case 'email_follow_up':
          if (action.emailTemplate) {
            // Use existing template
            const result = await ugcEmailService.sendTemplatedEmail({
              templateId: action.emailTemplate,
              creatorId: action.creator.id,
              brandId: action.brand.id,
              variables: action.variables || {}
            });

            await this.logAction(
              coordinatorId,
              'email_sent',
              { template: action.emailTemplate, variables: action.variables },
              action.creator.id,
              action.script?.id
            );

            return {
              success: result.success,
              message: result.success ? 'Email sent successfully' : result.error || 'Failed to send email'
            };
          } else {
            // Generate custom email
            const emailContent = await this.generateEmail(coordinatorId, {
              creator: action.creator,
              brand: action.brand,
              script: action.script,
              purpose: 'Follow-up communication',
              tone: 'friendly'
            });

            const result = await ugcEmailService.sendTemplatedEmail({
              creatorId: action.creator.id,
              brandId: action.brand.id,
              customSubject: emailContent.subject,
              customContent: {
                html: emailContent.htmlContent,
                text: emailContent.textContent
              }
            });

            return {
              success: result.success,
              message: result.success ? 'Custom email sent successfully' : result.error || 'Failed to send email'
            };
          }

        case 'slack_notification':
          await this.sendSlackUpdate(
            action.brand.id,
            `Creator ${action.creator.name} needs attention: ${action.type}`,
            { creator: action.creator.name, status: action.creator.status }
          );

          await this.logAction(
            coordinatorId,
            'slack_notification',
            { creator_name: action.creator.name },
            action.creator.id
          );

          return { success: true, message: 'Slack notification sent' };

        default:
          return { success: false, message: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logAction(
        coordinatorId,
        action.type as CoordinatorAction['action_type'],
        { error: errorMessage },
        action.creator.id,
        action.script?.id
      );

      return { success: false, message: errorMessage };
    }
  }

  // Process pipeline with streaming events for real-time monitoring
  async processPipelineStream(
    brandId: string, 
    emitEvent: (type: string, data: Record<string, unknown>) => void
  ): Promise<{
    summary: string;
    actions: Array<{
      creator: UgcCreator;
      recommendedActions: AiAction[];
      analysis: string;
    }>;
  }> {
    const supabase = await this.getSupabaseClient();

    try {
      emitEvent('step', { message: 'Initializing AI coordinator...', step: 'init' });

      // Get coordinator
      const coordinator = await this.getOrCreateCoordinator(brandId, ''); // User ID will be set by calling function
      emitEvent('step', { message: 'AI coordinator loaded', coordinatorId: coordinator.id, step: 'coordinator' });

      // Get all creators for the brand
      emitEvent('step', { message: 'Fetching creators...', step: 'fetch_creators' });
      const { data: creators, error: creatorsError } = await supabase
        .from('ugc_creators')
        .select('*')
        .eq('brand_id', brandId);

      if (creatorsError) {
        throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
      }

      emitEvent('step', { message: `Found ${creators?.length || 0} creators`, count: creators?.length || 0, step: 'creators_loaded' });

      // Get all scripts for the brand
      emitEvent('step', { message: 'Fetching scripts...', step: 'fetch_scripts' });
      const { data: scripts, error: scriptsError } = await supabase
        .from('ugc_creator_scripts')
        .select('*')
        .eq('brand_id', brandId);

      if (scriptsError) {
        throw new Error(`Failed to fetch scripts: ${scriptsError.message}`);
      }

      emitEvent('step', { message: `Found ${scripts?.length || 0} scripts`, count: scripts?.length || 0, step: 'scripts_loaded' });

      // Get brand details
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        throw new Error(`Failed to fetch brand: ${brandError.message}`);
      }

      emitEvent('step', { message: `Brand loaded: ${brand.name}`, brandName: brand.name, step: 'brand_loaded' });

      // Filter creators that actually need attention (more intelligent filtering)
      emitEvent('step', { message: 'Filtering creators that need attention...', step: 'filter_creators' });
      
      const creatorsNeedingAttention = creators?.filter(creator => {
        // Skip creators with incomplete data (will be handled quickly without AI)
        if (!creator.email && !creator.name) return false;
        
        // Focus on creators in active pipeline states
        const activeStatuses = [
          'Cold Outreach', 'Primary Screen', 'Approved for Next Steps', 
          'Schedule Call', 'Call Scheduled', 'READY FOR SCRIPTS',
          'Script Approval', 'Send Script to Creator', 'Creator Shooting'
        ];
        
        if (!activeStatuses.includes(creator.status)) return false;

        // Check if creator has been updated recently (within last 7 days)
        const lastUpdate = new Date(creator.updated_at);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Always analyze if it's been more than 3 days since update
        if (daysSinceUpdate > 3) return true;
        
        // For newer updates, only analyze high-priority statuses
        const highPriorityStatuses = ['READY FOR SCRIPTS', 'Script Approval', 'Creator Shooting'];
        return highPriorityStatuses.includes(creator.status);
      }) || [];

      emitEvent('step', { 
        message: `Filtered to ${creatorsNeedingAttention.length} creators needing AI analysis`, 
        total: creators?.length || 0,
        filtered: creatorsNeedingAttention.length,
        step: 'filtering_complete' 
      });

      const actions = [];

      // Process creators in smaller batches to avoid overwhelming the API
      const batchSize = 5; // Process max 5 creators at a time
      const creatorBatches = [];
      
      for (let i = 0; i < creatorsNeedingAttention.length; i += batchSize) {
        creatorBatches.push(creatorsNeedingAttention.slice(i, i + batchSize));
      }

      emitEvent('step', { 
        message: `Processing ${creatorBatches.length} batches of creators`, 
        batchCount: creatorBatches.length,
        batchSize,
        step: 'batch_setup' 
      });

      for (let batchIndex = 0; batchIndex < creatorBatches.length; batchIndex++) {
        const batch = creatorBatches[batchIndex];
        
        emitEvent('batch_start', { 
          message: `Starting batch ${batchIndex + 1}/${creatorBatches.length}`, 
          batchIndex: batchIndex + 1,
          totalBatches: creatorBatches.length,
          creatorsInBatch: batch.length 
        });

        for (let i = 0; i < batch.length; i++) {
          const creator = batch[i];
          
          emitEvent('creator_start', { 
            message: `Analyzing creator: ${creator.name || creator.email || creator.id}`, 
            creatorName: creator.name || creator.email || creator.id,
            creatorIndex: i + 1,
            batchSize: batch.length,
            status: creator.status 
          });
          
          // Convert creator to proper type
          const creatorData: UgcCreator = {
            ...creator,
            products: Array.isArray(creator.products) 
              ? creator.products as string[]
              : JSON.parse(creator.products as string || '[]'),
            content_types: Array.isArray(creator.content_types)
              ? creator.content_types as string[]
              : JSON.parse(creator.content_types as string || '[]'),
            platforms: Array.isArray(creator.platforms)
              ? creator.platforms as string[]
              : JSON.parse(creator.platforms as string || '[]')
          };
          
          try {
            // Stream analysis events by modifying analyzeCreatorStatus to accept event emitter
            const analysis = await this.analyzeCreatorStatusStream(
              creatorData,
              brand as Brand, // Cast to avoid type error
              emitEvent
            );

            emitEvent('creator_complete', { 
              message: `Analysis complete for ${creator.name || creator.email}`, 
              creatorName: creator.name || creator.email || creator.id,
              recommendationsCount: analysis.recommendedActions.length,
              analysis: analysis.analysis 
            });

            actions.push({
              creator: creatorData,
              recommendedActions: analysis.recommendedActions,
              analysis: analysis.analysis
            });
            
          } catch (error) {
            emitEvent('creator_error', { 
              message: `Failed to analyze creator ${creator.name || creator.email}`, 
              creatorName: creator.name || creator.email || creator.id,
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            
            actions.push({
              creator: creatorData,
              recommendedActions: [],
              analysis: `Error analyzing creator: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        emitEvent('batch_complete', { 
          message: `Batch ${batchIndex + 1} complete`, 
          batchIndex: batchIndex + 1,
          totalBatches: creatorBatches.length 
        });

        // Add a longer delay between batches to be extra careful with rate limits
        if (batchIndex < creatorBatches.length - 1) {
          emitEvent('delay', { message: 'Adding 5-second delay between batches...', delayMs: 5000 });
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Add quick analysis for creators that were filtered out but still need basic attention
      const skippedCreators = creators?.filter(creator => 
        !creatorsNeedingAttention.includes(creator) && 
        creator.email && creator.name
      ) || [];

      if (skippedCreators.length > 0) {
        emitEvent('step', { 
          message: `Processing ${skippedCreators.length} low-priority creators without AI`, 
          count: skippedCreators.length,
          step: 'basic_analysis' 
        });

        for (const creator of skippedCreators) {
          const creatorData: UgcCreator = {
            ...creator,
            products: Array.isArray(creator.products) 
              ? creator.products as string[]
              : JSON.parse(creator.products as string || '[]'),
            content_types: Array.isArray(creator.content_types)
              ? creator.content_types as string[]
              : JSON.parse(creator.content_types as string || '[]'),
            platforms: Array.isArray(creator.platforms)
              ? creator.platforms as string[]
              : JSON.parse(creator.platforms as string || '[]')
          };

          // Basic analysis without AI for low-priority creators
          let basicAnalysis = '';
          let basicActions: AiAction[] = [];

          if (creator.status === 'Backlog') {
            basicAnalysis = 'Creator is in backlog - no immediate action needed';
            basicActions = [];
          } else if (creator.status === 'REJECTED') {
            basicAnalysis = 'Creator has been rejected - no further action needed';
            basicActions = [];
          } else {
            basicAnalysis = `Creator status: ${creator.status} - basic follow-up may be needed`;
            basicActions = [{
              type: 'follow_up',
              priority: 'low',
              description: 'Check if creator needs attention',
              reasoning: 'Status suggests possible follow-up needed'
            }];
          }

          actions.push({
            creator: creatorData,
            recommendedActions: basicActions,
            analysis: basicAnalysis
          });
        }
      }

      // Generate summary
      const totalCreators = creators?.length || 0;
      const analyzedCreators = creatorsNeedingAttention.length;
      const actionableItems = actions.reduce((sum, action) => sum + action.recommendedActions.length, 0);
      const highPriorityItems = actions.reduce((sum, action) => 
        sum + action.recommendedActions.filter(a => a.priority === 'high').length, 0
      );

      const summary = `Pipeline processed for ${totalCreators} creators (${analyzedCreators} analyzed with AI). Found ${actionableItems} total action items (${highPriorityItems} high priority).`;

      emitEvent('summary', { 
        message: summary,
        stats: {
          totalCreators,
          analyzedCreators,
          actionableItems,
          highPriorityItems
        }
      });

      // Update coordinator last activity - using any until TS server refreshes
      await (supabase as any)
        .from('ugc_ai_coordinator')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', coordinator.id);

      return {
        summary,
        actions
      };

    } catch (error) {
      emitEvent('error', { 
        message: 'Pipeline processing failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.error('Failed to process pipeline:', error);
      throw error;
    }
  }

  // Streaming version of analyzeCreatorStatus
  async analyzeCreatorStatusStream(
    creator: UgcCreator, 
    brand: Brand, 
    emitEvent: (type: string, data: Record<string, unknown>) => void
  ): Promise<{ analysis: string; recommendedActions: AiAction[] }> {
    emitEvent('analysis_start', { 
      message: `Starting analysis for creator: ${creator.name || creator.email || creator.id}`,
      creatorName: creator.name || creator.email || creator.id,
      status: creator.status,
      hasEmail: !!creator.email 
    });
    
    // Skip analysis if creator has no email and no name (incomplete data)
    if (!creator.email && !creator.name) {
      emitEvent('analysis_skip', { 
        message: 'Skipping creator with incomplete data (no email or name)',
        creatorId: creator.id 
      });
      return {
        analysis: 'Creator has incomplete data - missing both email and name. Manual review needed.',
        recommendedActions: [{
          type: 'follow_up',
          priority: 'medium',
          description: 'Complete creator information - add email and name',
          reasoning: 'Cannot analyze creator without basic contact information'
        }]
      };
    }
    
    const supabase = await this.getSupabaseClient();
    
    const coordinatorId = await this.getCoordinatorId(brand.id);
    emitEvent('context_prep', { message: 'Preparing context for analysis...', coordinatorId });

    try {
      // Get creator's script history
      const { data: scripts } = await supabase
        .from('ugc_creator_scripts')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });

      emitEvent('scripts_loaded', { 
        message: `Found ${scripts?.length || 0} scripts for creator`,
        scriptCount: scripts?.length || 0 
      });

      // Get existing outstanding recommendations from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existingActions } = await supabase
        .from('ugc_ai_coordinator_actions')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('coordinator_id', coordinatorId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      emitEvent('actions_loaded', { 
        message: `Found ${existingActions?.length || 0} recent coordinator actions`,
        actionsCount: existingActions?.length || 0 
      });

      // Build comprehensive context
      const creatorContext = `
CREATOR PROFILE:
- Name: ${creator.name || 'Not provided'}
- Email: ${creator.email || 'Not provided'}
- Instagram: ${creator.instagram_handle || 'Not provided'}
- Status: ${creator.status}
- Product Sent: ${(creator as any).product_sent ? 'Yes' : 'No'}
- Rates: ${(creator as any).rates ? `$${(creator as any).rates}` : 'Not set'}
- Created: ${creator.created_at}
- Last Updated: ${creator.updated_at}

SCRIPT HISTORY (${scripts?.length || 0} scripts):
${scripts?.map(script => `
- Script ID: ${script.id}
- Title: ${script.title || 'Untitled'}
- Status: ${script.status}
- Type: ${script.video_type || 'Not specified'}
- Created: ${script.created_at}
- Due Date: ${script.due_date || 'Not set'}
`).join('\n') || 'No scripts found'}

RECENT AI COORDINATOR ACTIONS (last 7 days):
${(existingActions as ExistingAction[])?.map(action => {
  const actionData = action.action_data || {};
  const recommendations = actionData.recommendedActions as ActionRecommendation[] || [];
  
  if (action.action_type === 'ai_analysis' && recommendations.length > 0) {
    return `
- Analysis Date: ${action.created_at}
- Previous Recommendations:
${recommendations.map((rec, index) => `  ${index + 1}. [${rec.priority?.toUpperCase() || 'UNKNOWN'}] ${rec.type}: ${rec.description}`).join('\n')}`;
  } else if (action.action_type === 'email_sent') {
    return `
- Action: Email sent (${action.created_at})
- Template: ${actionData.template || 'Custom'}
- Success: ${action.success ? 'Yes' : 'No'}`;
  } else {
    return `
- Action: ${action.action_type} (${action.created_at})
- Success: ${action.success ? 'Yes' : 'No'}`;
  }
}).join('\n') || 'No recent actions found'}
`;

      const brandContext = `
BRAND INFO:
- Name: ${brand.name}
- UGC Company Description: ${(brand as any).ugc_company_description || 'Not set'}
- Target Audience: ${brand.target_audience_data ? JSON.stringify(brand.target_audience_data) : 'Not defined'}
`;

      const analysisPrompt = `
You are an AI UGC (User Generated Content) Coordinator helping manage creator relationships and script pipeline. 

${brandContext}

${creatorContext}

IMPORTANT INSTRUCTIONS:
1. Review the RECENT AI COORDINATOR ACTIONS above carefully
2. DO NOT repeat recommendations that were recently made unless the situation has significantly changed
3. If previous recommendations are still valid and pending, acknowledge them instead of duplicating
4. Focus on NEW actions needed or status updates since the last analysis

CURRENT SITUATION:
Please analyze this creator's status and provide:

1. ANALYSIS: A brief assessment of where this creator stands in the pipeline, considering recent actions taken
2. RECOMMENDED ACTIONS: NEW specific actions that should be taken next (avoid duplicating recent recommendations)

Consider:
- Pipeline progression (onboarding → rates → shipping → scripting → delivery)
- Email communication needs (but avoid re-sending similar emails)
- Follow-up requirements
- Potential issues or blockers
- Optimization opportunities
- Whether previous recommendations are still pending or have been addressed

Respond in JSON format:
{
  "analysis": "Brief analysis of creator status and pipeline position, referencing any recent actions",
  "recommendedActions": [
    {
      "type": "email_sent" | "status_changed" | "follow_up" | "script_assigned",
      "priority": "high" | "medium" | "low",
      "description": "What NEW action should be taken (avoid duplicates)",
      "reasoning": "Why this action is recommended, considering recent activity",
      "emailTemplate": "template_name"
    }
  ]
}
`;

      emitEvent('prompt_ready', { 
        message: `Prompt prepared (${analysisPrompt.length} characters)`,
        promptLength: analysisPrompt.length,
        promptPreview: analysisPrompt.substring(0, 500) + '...' 
      });

      // Wait for rate limiting before API call
      await rateLimiter.waitForRateLimit();

      // Use gemini-2.5-flash model consistently
      const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
      
      emitEvent('gemini_call', { message: 'Making Gemini API call with retry logic...', model: MODEL_NAME });
      
      // Enhanced retry logic with exponential backoff
      let retryCount = 0;
      const maxRetries = 5;
      let result;
      
      while (retryCount < maxRetries) {
        try {
          emitEvent('api_attempt', { message: `API attempt ${retryCount + 1}/${maxRetries}`, attempt: retryCount + 1 });
          result = await model.generateContent(analysisPrompt);
          emitEvent('api_success', { message: 'Gemini API call successful' });
          break; // Success, exit retry loop
        } catch (error: any) {
          emitEvent('api_retry', { 
            message: `Attempt ${retryCount + 1} failed: ${error.message}`,
            attempt: retryCount + 1,
            error: error.message 
          });
          
          if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate')) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Exponential backoff: 2^n * 2 seconds (4s, 8s, 16s, 32s)
              const waitTime = Math.pow(2, retryCount) * 2000;
              emitEvent('rate_limit_wait', { 
                message: `Rate limited, waiting ${waitTime}ms before retry`,
                waitTime,
                retryAttempt: retryCount + 1 
              });
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // For non-rate-limit errors, try once more with a short delay
          if (retryCount === 0) {
            retryCount++;
            emitEvent('retry_delay', { message: 'Retrying after 1 second for error', error: error.message });
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          throw error; // Re-throw if not rate limit or max retries reached
        }
      }
      
      if (!result) {
        throw new Error('Failed to get response from Gemini after retries');
      }
      
      const responseText = result.response.text();
      
      emitEvent('response_received', { 
        message: `Gemini response received (${responseText.length} characters)`,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200) + '...' 
      });

      // Parse the JSON response
      let parsedResponse;
      try {
        // Clean up the response - remove any markdown formatting
        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        parsedResponse = JSON.parse(cleanResponse);
        emitEvent('parse_success', { 
          message: 'Successfully parsed JSON response',
          recommendationsCount: parsedResponse.recommendedActions?.length || 0 
        });
      } catch (parseError) {
        emitEvent('parse_error', { 
          message: 'Failed to parse Gemini response as JSON',
          error: parseError instanceof Error ? parseError.message : 'Unknown error' 
        });
        
        // Fallback response
        parsedResponse = {
          analysis: `AI analysis failed to parse. Raw response: ${responseText.substring(0, 200)}...`,
          recommendedActions: [{
            type: 'follow_up',
            priority: 'medium',
            description: 'Manual review needed - AI response parsing failed',
            reasoning: 'Unable to parse AI coordinator response'
          }]
        };
      }

      const analysis = parsedResponse.analysis || 'No analysis provided';
      const recommendedActions = parsedResponse.recommendedActions || [];

      emitEvent('analysis_result', { 
        message: 'Analysis complete',
        analysis,
        recommendationsCount: recommendedActions.length,
        recommendations: recommendedActions.map((action: any) => ({
          type: action.type,
          priority: action.priority,
          description: action.description
        }))
      });

      // Log the analysis
      await this.logAction(
        coordinatorId,
        'ai_analysis',
        { creator_id: creator.id, analysis, recommendedActions },
        creator.id
      );

      emitEvent('analysis_logged', { message: 'Analysis logged to database' });

      return { analysis, recommendedActions };

    } catch (error) {
      emitEvent('analysis_error', { 
        message: 'Failed to analyze creator status',
        error: error instanceof Error ? error.message : 'Unknown error',
        creatorId: creator.id,
        brandId: brand.id 
      });
      
      // Log the error
      await this.logAction(
        coordinatorId,
        'ai_analysis',
        { creator_id: creator.id, error: error instanceof Error ? error.message : 'Unknown error' },
        creator.id
      );

      // Return a fallback analysis instead of throwing
      if (error instanceof Error && (error.message.includes('quota') || error.message.includes('429'))) {
        return {
          analysis: 'Rate limit reached for AI analysis. Please try again in a few minutes.',
          recommendedActions: [{
            type: 'follow_up',
            priority: 'low',
            description: 'Retry AI analysis after rate limit reset',
            reasoning: 'Gemini API quota exceeded'
          }]
        };
      }

      throw error;
    }
  }
}

// Create a function to get the service instance when needed
export function getUgcAiCoordinator(): UgcAiCoordinatorService {
  return new UgcAiCoordinatorService();
}

// For backward compatibility, export a lazy-loaded service
export const ugcAiCoordinator = {
  getOrCreateCoordinator: (...args: Parameters<UgcAiCoordinatorService['getOrCreateCoordinator']>) => 
    getUgcAiCoordinator().getOrCreateCoordinator(...args),
  logAction: (...args: Parameters<UgcAiCoordinatorService['logAction']>) => 
    getUgcAiCoordinator().logAction(...args),
  analyzeCreatorStatus: (...args: Parameters<UgcAiCoordinatorService['analyzeCreatorStatus']>) => 
    getUgcAiCoordinator().analyzeCreatorStatus(...args),
  generateEmail: (...args: Parameters<UgcAiCoordinatorService['generateEmail']>) => 
    getUgcAiCoordinator().generateEmail(...args),
  processPipeline: (...args: Parameters<UgcAiCoordinatorService['processPipeline']>) => 
    getUgcAiCoordinator().processPipeline(...args),
  sendSlackUpdate: (...args: Parameters<UgcAiCoordinatorService['sendSlackUpdate']>) => 
    getUgcAiCoordinator().sendSlackUpdate(...args),
  executeAction: (...args: Parameters<UgcAiCoordinatorService['executeAction']>) => 
    getUgcAiCoordinator().executeAction(...args)
}; 