import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  UgcCreator, 
  UgcCreatorScript, 
  DbUgcCreator,
  DbUgcCreatorScript 
} from '../types/ugcCreator';
import { 
  sendUGCCreatorStatusNotification,
  sendUGCContractStatusNotification,
  sendUGCProductShipmentNotification 
} from '@/lib/services/ugcSlackService';

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
      platforms: creator.platforms as string[] || [],
      custom_fields: (creator.custom_fields as Record<string, string | number | boolean | string[] | null>) || {}
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
    platforms: data.platforms as string[] || [],
    custom_fields: (data.custom_fields as Record<string, string | number | boolean | string[] | null>) || {}
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
    platforms: data.platforms as string[] || [],
    custom_fields: (data.custom_fields as Record<string, string | number | boolean | string[] | null>) || {}
  };
}

export async function updateUgcCreator(creator: Partial<UgcCreator> & { id: string }): Promise<UgcCreator> {
  const supabase = createSPAClient();
  
  // Get the current creator to compare status changes
  const { data: currentCreator, error: fetchError } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('id', creator.id)
    .single();
    
  if (fetchError) {
    console.error('Error fetching current creator:', fetchError);
    throw new Error('Failed to fetch current creator');
  }
  
  const { data, error } = await supabase
    .from('ugc_creators')
    .update(creator)
    .eq('id', creator.id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating creator:', error);
    throw new Error('Failed to update creator');
  }
  
  // Map the response to match UgcCreator type
  const updatedCreator = {
    ...data,
    products: data.products as string[] || [],
    content_types: data.content_types as string[] || [],
    platforms: data.platforms as string[] || [],
    custom_fields: (data.custom_fields as Record<string, string | number | boolean | string[] | null>) || {}
  } as UgcCreator;
  
  // Send Slack notifications for status changes
  try {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';
    const creatorDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline/creators/${data.id}`;
    const pipelineDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline?view=creator`;
    
    // Creator status change notifications (only for specific statuses)
    if (creator.status && currentCreator.status !== creator.status) {
      const notifiableStatuses = ['Approved for next steps', 'Ready for scripts', 'Rejected'];
      if (notifiableStatuses.includes(creator.status)) {
        await sendUGCCreatorStatusNotification({
          brandId: data.brand_id,
          creatorId: data.id,
          creatorName: data.name,
          creatorEmail: data.email,
          previousStatus: currentCreator.status || 'Unknown',
          newStatus: creator.status,
          creatorDashboardLink,
          pipelineDashboardLink
        });
      }
    }
    
    // Contract status change notifications
    if (creator.contract_status && currentCreator.contract_status !== creator.contract_status) {
      await sendUGCContractStatusNotification({
        brandId: data.brand_id,
        creatorId: data.id,
        creatorName: data.name,
        creatorEmail: data.email,
        previousStatus: currentCreator.contract_status || 'not signed',
        newStatus: creator.contract_status,
        creatorDashboardLink,
        pipelineDashboardLink
      });
    }
    
    // Product shipment status change notifications
    if (creator.product_shipment_status && currentCreator.product_shipment_status !== creator.product_shipment_status) {
      await sendUGCProductShipmentNotification({
        brandId: data.brand_id,
        creatorId: data.id,
        creatorName: data.name,
        creatorEmail: data.email,
        previousStatus: currentCreator.product_shipment_status || 'Not Shipped',
        newStatus: creator.product_shipment_status,
        trackingNumber: creator.tracking_number,
        creatorDashboardLink,
        pipelineDashboardLink
      });
    }
  } catch (slackError) {
    console.error('Error sending Slack notification:', slackError);
    // Don't fail the update if Slack notification fails
  }
  
  // If brand_id is provided, trigger n8n workflow
  if (creator.brand_id) {
    try {
      // Trigger n8n workflow for creator status change
      const response = await fetch('/api/ugc/n8n/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'creator_status_changed',
          brandId: creator.brand_id,
          creatorId: creator.id,
          status: creator.status,
          data: updatedCreator
        }),
      });

      if (!response.ok) {
        console.error('Failed to trigger n8n workflow:', await response.text());
      }
    } catch (error) {
      console.error('Error triggering n8n workflow:', error);
      // Don't fail the update if n8n trigger fails
    }
  }
  
  return updatedCreator;
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
      platforms: script.ugc_creators.platforms as string[] || [],
      custom_fields: (script.ugc_creators.custom_fields as Record<string, string | number | boolean | string[] | null>) || {}
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

// Get script counts by creator and concept status
export async function getCreatorScriptCounts(brandId: string): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('creator_id, concept_status')
    .eq('brand_id', brandId)
    .not('concept_status', 'is', null);

  if (error) {
    console.error('Error fetching creator script counts:', error);
    throw error;
  }

  // Group by creator_id and concept_status
  const counts: Record<string, Record<string, number>> = {};
  
  (data || []).forEach((script) => {
    const creatorId = script.creator_id;
    const status = script.concept_status || 'Unknown';
    
    if (!counts[creatorId]) {
      counts[creatorId] = {};
    }
    
    if (!counts[creatorId][status]) {
      counts[creatorId][status] = 0;
    }
    
    counts[creatorId][status]++;
  });

  return counts;
} 