import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  UgcCreator, 
  UgcCreatorScript, 
  DbUgcCreator, 
  DbUgcCreatorScript 
} from '../types/ugcCreator';

const supabase = createSPAClient();

// UGC Creator Services
export async function getUgcCreators(brandId: string): Promise<UgcCreator[]> {
  const { data, error } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('brand_id', brandId)
    .not('brand_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching UGC creators:', error);
    throw error;
  }

  const mappedCreators = (data || []).map((creator: DbUgcCreator) => {
    return {
      ...creator,
      products: creator.products as string[] || [],
      content_types: creator.content_types as string[] || [],
      platforms: creator.platforms as string[] || []
    };
  }) as UgcCreator[];

  return mappedCreators;
}

export async function getUgcCreatorById(creatorId: string): Promise<UgcCreator | null> {
  const { data, error } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('id', creatorId)
    .single();

  if (error) {
    console.error('Error fetching UGC creator:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    products: data.products as string[] || [],
    content_types: data.content_types as string[] || [],
    platforms: data.platforms as string[] || []
  };
}

export async function createUgcCreator(creator: Omit<UgcCreator, 'id' | 'created_at' | 'updated_at'>): Promise<UgcCreator> {
  const newCreator = {
    ...creator,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ugc_creators')
    .insert(newCreator)
    .select()
    .single();

  if (error) {
    console.error('Error creating UGC creator:', error);
    throw error;
  }

  return {
    ...data,
    products: data.products as string[] || [],
    content_types: data.content_types as string[] || [],
    platforms: data.platforms as string[] || []
  };
}

export async function updateUgcCreator(creator: Partial<UgcCreator> & { id: string }): Promise<UgcCreator> {
  const { data, error } = await supabase
    .from('ugc_creators')
    .update({
      ...creator,
      updated_at: new Date().toISOString()
    })
    .eq('id', creator.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating UGC creator:', error);
    throw error;
  }

  return {
    ...data,
    products: data.products as string[] || [],
    content_types: data.content_types as string[] || [],
    platforms: data.platforms as string[] || []
  };
}

export async function deleteUgcCreator(creatorId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_creators')
    .delete()
    .eq('id', creatorId);

  if (error) {
    console.error('Error deleting UGC creator:', error);
    throw error;
  }
}

// UGC Creator Scripts Services
export async function getUgcCreatorScripts(creatorId: string): Promise<UgcCreatorScript[]> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching UGC creator scripts:', error);
    throw error;
  }

  return (data || []).map((script: DbUgcCreatorScript) => ({
    ...script,
    script_content: script.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: script.b_roll_shot_list as string[] || []
  }));
}

export async function getUgcCreatorScriptById(scriptId: string): Promise<UgcCreatorScript | null> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('id', scriptId)
    .single();

  if (error) {
    console.error('Error fetching UGC creator script:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    script_content: data.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function getUgcCreatorScriptsByConceptStatus(brandId: string, conceptStatus: string): Promise<UgcCreatorScript[]> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*, ugc_creators(*)')
    .eq('brand_id', brandId)
    .eq('concept_status', conceptStatus)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching UGC creator scripts by concept status:', error);
    throw error;
  }

  return (data || []).map((script: DbUgcCreatorScript & { ugc_creators: DbUgcCreator }) => ({
    ...script,
    script_content: script.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: script.b_roll_shot_list as string[] || [],
    creator: script.ugc_creators ? {
      ...script.ugc_creators,
      products: script.ugc_creators.products as string[] || [],
      content_types: script.ugc_creators.content_types as string[] || [],
      platforms: script.ugc_creators.platforms as string[] || []
    } : null
  }));
}

export async function getUgcCreatorScriptByShareId(shareId: string): Promise<UgcCreatorScript | null> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('public_share_id', shareId)
    .single();

  if (error) {
    console.error('Error fetching UGC creator script by share ID:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    script_content: data.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function createUgcCreatorScript(script: Omit<UgcCreatorScript, 'id' | 'created_at' | 'updated_at'>): Promise<UgcCreatorScript> {
  const newScript = {
    ...script,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .insert(newScript)
    .select()
    .single();

  if (error) {
    console.error('Error creating UGC creator script:', error);
    throw error;
  }

  return {
    ...data,
    script_content: data.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function updateUgcCreatorScript(scriptUpdate: Partial<UgcCreatorScript> & { id: string }): Promise<UgcCreatorScript> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .update({
      ...scriptUpdate,
      updated_at: new Date().toISOString()
    })
    .eq('id', scriptUpdate.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating UGC creator script:', error);
    throw error;
  }

  return {
    ...data,
    script_content: data.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export function generateDefaultSystemInstructions(): string {
  return `You are an expert UGC (User Generated Content) script writer specializing in creating engaging, authentic, and conversion-focused scripts for creators.

Your scripts should:
1. Feel natural and conversational, like a friend recommending a product
2. Include specific product benefits and features
3. Address common pain points the target audience faces
4. Include a clear call-to-action
5. Be structured for visual storytelling

Format your response as a structured script with:
- Scene Start: How the video begins
- Script Segments: Break down the narrative into clear segments with both verbal script and visual directions
- Hook Body: The main compelling hook(s)
- Call to Action: Clear next steps for viewers
- B-Roll Shot List: Specific shots needed to support the narrative

Keep the tone authentic and avoid overly promotional language. Focus on storytelling and genuine product benefits.`;
}

// Brand UGC Settings Services
export interface UgcBrandFields {
  ugc_company_description?: string | null;
  ugc_guide_description?: string | null;
  ugc_filming_instructions?: string | null;
  ugc_default_system_instructions?: string | null;
}

export async function getBrandUgcFields(brandId: string): Promise<UgcBrandFields | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('ugc_company_description, ugc_guide_description, ugc_filming_instructions, ugc_default_system_instructions')
    .eq('id', brandId)
    .single();

  if (error) {
    console.error('Error fetching brand UGC fields:', error);
    throw error;
  }

  return data || null;
}

export async function updateBrandUgcFields(brandId: string, fields: UgcBrandFields): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .update({
      ...fields,
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId);

  if (error) {
    console.error('Error updating brand UGC fields:', error);
    throw error;
  }
}

// Submit creator application directly to ugc_creators table
export async function submitCreatorApplication(applicationData: {
  brand_id: string;
  submission_data: {
    name: string;
    email: string;
    phone_number?: string;
    instagram_handle?: string;
    tiktok_handle?: string;
    portfolio_link?: string;
    per_script_fee?: number;
    gender?: string;
    age?: string;
    platforms?: string[];
    content_types?: string[];
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    custom_fields?: Record<string, string | boolean | number>;
    consent_email?: boolean;
    consent_sms?: boolean;
  };
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}): Promise<{ success: boolean; creator?: UgcCreator; message: string }> {
  try {
    const response = await fetch('/api/ugc/creators/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit creator application');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting creator application:', error);
    throw error;
  }
} 