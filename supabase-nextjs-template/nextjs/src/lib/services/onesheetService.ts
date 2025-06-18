import { createClient } from '@/utils/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  OneSheet, 
  CreateOneSheetRequest, 
  UpdateOneSheetRequest,
  ResearchChecklist,
  Angle,
  AudienceInsight,
  Persona,
  CompetitorAnalysis,
  AdAccountData,
  KeyLearnings,
  Concept,
  Hook,
  Visual
} from '@/lib/types/onesheet';

class OneSheetService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  // Get OneSheet for a brand (create if doesn't exist)
  async getOneSheet(brandId: string, userId?: string, supabaseInstance?: SupabaseClient): Promise<OneSheet> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Getting OneSheet for brand: ${brandId}`);
    
    const supabase = supabaseInstance || this.supabase;
    
    let currentUserId = userId;
    
    // If userId not provided, try to get from auth
    if (!currentUserId) {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) {
        console.error(`[OneSheetService ${requestId}] User authentication failed:`, userError);
        throw new Error('User not authenticated');
      }
      currentUserId = user.user.id;
    }

    // First verify user has access to this brand (either owns it or has shared access)
    // We need to check brand ownership and sharing separately due to Supabase query limitations
    const { data: brandAccess, error: brandError } = await supabase
      .from('brands')
      .select(`
        id,
        user_id,
        brand_shares(
          shared_with_user_id,
          status
        )
      `)
      .eq('id', brandId)
      .single();

    if (brandError || !brandAccess) {
      console.error(`[OneSheetService ${requestId}] Brand not found:`, brandError);
      throw new Error('Brand not found');
    }

    // Check if user has access (owns brand or has accepted sharing)
    const isOwner = brandAccess.user_id === currentUserId;
    const hasSharedAccess = brandAccess.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === currentUserId && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      console.error(`[OneSheetService ${requestId}] Access denied for brand: ${brandId}. User: ${currentUserId}, Owner: ${brandAccess.user_id}, Shared access: ${hasSharedAccess}`);
      throw new Error('Access denied to this brand');
    }

    console.log(`[OneSheetService ${requestId}] Brand access verified. Owner: ${isOwner}, Shared: ${hasSharedAccess}`);
    
    const { data: existingOneSheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`[OneSheetService ${requestId}] Failed to fetch OneSheet:`, fetchError);
      throw new Error(`Failed to fetch OneSheet: ${fetchError.message}`);
    }

    // If OneSheet doesn't exist, create a new one
    if (!existingOneSheet) {
      console.log(`[OneSheetService ${requestId}] OneSheet not found, creating new one`);
      console.log(`[OneSheetService ${requestId}] Creating OneSheet for user: ${currentUserId}`);

      const defaultOneSheet = this.createDefaultOneSheet(brandId, currentUserId);
      const { data: newOneSheet, error: createError } = await supabase
        .from('onesheet')
        .insert(defaultOneSheet)
        .select()
        .single();

      if (createError) {
        console.error(`[OneSheetService ${requestId}] Failed to create OneSheet:`, createError);
        throw new Error(`Failed to create OneSheet: ${createError.message}`);
      }

      console.log(`[OneSheetService ${requestId}] OneSheet created successfully:`, {
        id: newOneSheet.id,
        brandId: newOneSheet.brand_id
      });

      return newOneSheet;
    }

    console.log(`[OneSheetService ${requestId}] OneSheet found:`, {
      id: existingOneSheet.id,
      brandId: existingOneSheet.brand_id,
      hasPerformanceData: !!(existingOneSheet.ad_performance_data?.length),
      performanceDataCount: existingOneSheet.ad_performance_data?.length || 0
    });

    return existingOneSheet;
  }

  // Create a new OneSheet
  async createOneSheet(request: CreateOneSheetRequest): Promise<OneSheet> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Creating OneSheet:`, {
      brandId: request.brand_id,
      product: request.product,
      hasLandingPage: !!request.landing_page_url
    });

    const { data: user, error: userError } = await this.supabase.auth.getUser();
    if (userError || !user.user) {
      console.error(`[OneSheetService ${requestId}] User authentication failed:`, userError);
      throw new Error('User not authenticated');
    }

    const oneSheetData = {
      brand_id: request.brand_id,
      user_id: user.user.id,
      product: request.product || '',
      landing_page_url: request.landing_page_url || '',
      customer_reviews_url: request.customer_reviews_url || '',
      prompt_cheatsheet_url: request.prompt_cheatsheet_url || '',
      ...this.getDefaultSections()
    };

    const { data, error } = await this.supabase
      .from('onesheet')
      .insert(oneSheetData)
      .select()
      .single();

    if (error) {
      console.error(`[OneSheetService ${requestId}] Failed to create OneSheet:`, error);
      throw new Error(`Failed to create OneSheet: ${error.message}`);
    }

    console.log(`[OneSheetService ${requestId}] OneSheet created successfully:`, {
      id: data.id,
      brandId: data.brand_id,
      userId: data.user_id
    });

    return data;
  }

  // Update OneSheet with auto-save functionality
  async updateOneSheet(request: UpdateOneSheetRequest, supabaseInstance?: SupabaseClient): Promise<OneSheet> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Updating OneSheet:`, {
      id: request.id,
      fieldsUpdated: Object.keys(request).filter(k => k !== 'id').length
    });

    const { id, ...updateData } = request;
    const supabase = supabaseInstance || this.supabase;

    const { data, error } = await supabase
      .from('onesheet')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[OneSheetService ${requestId}] Failed to update OneSheet:`, error);
      throw new Error(`Failed to update OneSheet: ${error.message}`);
    }

    console.log(`[OneSheetService ${requestId}] OneSheet updated successfully`);

    return data;
  }

  // Auto-save specific field (debounced updates)
  async autoSaveField(onesheetId: string, field: string, value: unknown): Promise<void> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Auto-saving field:`, {
      onesheetId,
      field,
      valueType: typeof value,
      valueLength: Array.isArray(value) ? value.length : undefined
    });

    const updateData = { [field]: value };

    const { error } = await this.supabase
      .from('onesheet')
      .update(updateData)
      .eq('id', onesheetId);

    if (error) {
      console.error(`[OneSheetService ${requestId}] Auto-save failed:`, error);
      throw new Error(`Auto-save failed: ${error.message}`);
    }

    console.log(`[OneSheetService ${requestId}] Auto-save completed successfully`);
  }

  // Delete OneSheet
  async deleteOneSheet(id: string): Promise<void> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Deleting OneSheet: ${id}`);

    const { error } = await this.supabase
      .from('onesheet')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[OneSheetService ${requestId}] Failed to delete OneSheet:`, error);
      throw new Error(`Failed to delete OneSheet: ${error.message}`);
    }

    console.log(`[OneSheetService ${requestId}] OneSheet deleted successfully`);
  }

  // Helper methods for managing specific sections
  async addAngle(onesheetId: string, angle: Omit<Angle, 'id'>): Promise<Angle[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding angle to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newAngle: Angle = {
      ...angle,
      id: crypto.randomUUID()
    };
    
    const updatedAngles = [...onesheet.angles, newAngle];
    await this.autoSaveField(onesheetId, 'angles', updatedAngles);
    
    console.log(`[OneSheetService ${requestId}] Angle added successfully. Total angles: ${updatedAngles.length}`);
    return updatedAngles;
  }

  async updateAngle(onesheetId: string, angleId: string, updates: Partial<Angle>): Promise<Angle[]> {
    const onesheet = await this.getOnesheetById(onesheetId);
    const updatedAngles = onesheet.angles.map(angle =>
      angle.id === angleId ? { ...angle, ...updates } : angle
    );
    
    await this.autoSaveField(onesheetId, 'angles', updatedAngles);
    return updatedAngles;
  }

  async removeAngle(onesheetId: string, angleId: string): Promise<Angle[]> {
    const onesheet = await this.getOnesheetById(onesheetId);
    const updatedAngles = onesheet.angles.filter(angle => angle.id !== angleId);
    
    await this.autoSaveField(onesheetId, 'angles', updatedAngles);
    return updatedAngles;
  }

  async addPersona(onesheetId: string, persona: Omit<Persona, 'id'>): Promise<Persona[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding persona to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newPersona: Persona = {
      ...persona,
      id: crypto.randomUUID()
    };
    
    const updatedPersonas = [...onesheet.personas, newPersona];
    await this.autoSaveField(onesheetId, 'personas', updatedPersonas);
    
    console.log(`[OneSheetService ${requestId}] Persona added successfully. Total personas: ${updatedPersonas.length}`);
    return updatedPersonas;
  }

  async addCompetitor(onesheetId: string, competitor: Omit<CompetitorAnalysis, 'id'>): Promise<CompetitorAnalysis[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding competitor to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newCompetitor: CompetitorAnalysis = {
      ...competitor,
      id: crypto.randomUUID()
    };
    
    const updatedCompetitors = [...onesheet.competitor_analysis, newCompetitor];
    await this.autoSaveField(onesheetId, 'competitor_analysis', updatedCompetitors);
    
    console.log(`[OneSheetService ${requestId}] Competitor added successfully. Total competitors: ${updatedCompetitors.length}`);
    return updatedCompetitors;
  }

  async addConcept(onesheetId: string, concept: Omit<Concept, 'id'>): Promise<Concept[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding concept to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newConcept: Concept = {
      ...concept,
      id: crypto.randomUUID()
    };
    
    const updatedConcepts = [...onesheet.concepts, newConcept];
    await this.autoSaveField(onesheetId, 'concepts', updatedConcepts);
    
    console.log(`[OneSheetService ${requestId}] Concept added successfully. Total concepts: ${updatedConcepts.length}`);
    return updatedConcepts;
  }

  async addHook(onesheetId: string, hook: Omit<Hook, 'id'>): Promise<Hook[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding hook to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newHook: Hook = {
      ...hook,
      id: crypto.randomUUID()
    };
    
    const updatedHooks = [...onesheet.hooks, newHook];
    await this.autoSaveField(onesheetId, 'hooks', updatedHooks);
    
    console.log(`[OneSheetService ${requestId}] Hook added successfully. Total hooks: ${updatedHooks.length}`);
    return updatedHooks;
  }

  async addVisual(onesheetId: string, visual: Omit<Visual, 'id'>): Promise<Visual[]> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Adding visual to OneSheet: ${onesheetId}`);

    const onesheet = await this.getOnesheetById(onesheetId);
    const newVisual: Visual = {
      ...visual,
      id: crypto.randomUUID()
    };
    
    const updatedVisuals = [...onesheet.visuals, newVisual];
    await this.autoSaveField(onesheetId, 'visuals', updatedVisuals);
    
    console.log(`[OneSheetService ${requestId}] Visual added successfully. Total visuals: ${updatedVisuals.length}`);
    return updatedVisuals;
  }

  // Private helper methods
  private async getOnesheetById(id: string): Promise<OneSheet> {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[OneSheetService ${requestId}] Fetching OneSheet by ID: ${id}`);

    const { data, error } = await this.supabase
      .from('onesheet')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[OneSheetService ${requestId}] Failed to fetch OneSheet:`, error);
      throw new Error(`Failed to fetch OneSheet: ${error.message}`);
    }

    console.log(`[OneSheetService ${requestId}] OneSheet fetched successfully`);
    return data;
  }

  private createDefaultOneSheet(brandId: string, userId: string): Omit<OneSheet, 'id' | 'created_at' | 'updated_at'> {
    console.log(`[OneSheetService] Creating default OneSheet structure for brand: ${brandId}`);
    
    return {
      brand_id: brandId,
      user_id: userId,
      product: '',
      landing_page_url: '',
      customer_reviews_url: '',
      prompt_cheatsheet_url: '',
      ...this.getDefaultSections()
    };
  }

  private getDefaultSections() {
    return {
      research_checklist: {
        myKnowledge: false,
        chatgptPerplexity: false,
        customerReviews: false,
        socialListening: false,
        adComments: false,
        forumsSources: false,
        articles: false,
        organicResearch: false,
        tiktok: false,
        youtubeShorts: false
      } as ResearchChecklist,
      angles: [] as Angle[],
      audience_insights: [] as AudienceInsight[],
      personas: [] as Persona[],
      social_listening_data: {
        reddit: [],
        quora: [],
        adComments: []
      },
      organic_research_data: {
        tiktok: [],
        youtubeShorts: []
      },
      competitor_analysis: [] as CompetitorAnalysis[],
      competitive_notes: '',
      ad_account_data: {
        deliveryByAge: {},
        deliveryByGender: {},
        deliveryByPlacement: {},
        topPerformingAngles: [],
        topPerformingFormats: [],
        avgCPA: 0,
        bestHoldRate: 0
      } as AdAccountData,
      ad_performance_data: [],
      key_learnings: {
        ageInsights: '',
        genderInsights: '',
        placementInsights: '',
        creativeInsights: '',
        implications: ''
      } as KeyLearnings,
      concepts: [] as Concept[],
      hooks: [] as Hook[],
      visuals: [] as Visual[],
      ai_research_data: {
        perplexityResults: {},
        audienceAnalysis: {},
        socialListeningData: {},
        lastUpdated: new Date().toISOString()
      },
      ai_competitor_data: {
        competitorWebsites: {},
        competitorReviews: {},
        gapAnalysis: {},
        lastUpdated: new Date().toISOString()
      },
      ai_analysis_results: {
        generatedAngles: [],
        generatedPersonas: [],
        generatedConcepts: [],
        generatedHooks: [],
        generatedVisuals: [],
        lastUpdated: new Date().toISOString()
      },
      ai_prompt_templates: {
        adAngles: '',
        benefitsPainPoints: '',
        audienceResearch: '',
        statisticsResearch: '',
        redditAnalysis: '',
        forumAnalysis: '',
        competitorGapAnalysis: '',
        competitorReviewAnalysis: '',
        conceptGeneration: '',
        hookGeneration: '',
        visualGeneration: ''
      },
      synthesis_data: {
        angles: [],
        benefits: [],
        painPoints: [],
        features: [],
        objections: [],
        failedSolutions: [],
        other: []
      }
    };
  }
}

export const onesheetService = new OneSheetService();
export default onesheetService; 