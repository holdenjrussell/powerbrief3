import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  UgcCreator, 
  UgcCreatorScript, 
  DbUgcCreator, 
  DbUgcCreatorScript,
  UgcScriptShare,
  DbUgcScriptShare,
  UgcBrandFields
} from '../types/ugcCreator';

const supabase = createSPAClient();

// UGC Creator Services
export async function getUgcCreators(brandId: string): Promise<UgcCreator[]> {
  const { data, error } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching UGC creators:', error);
    throw error;
  }

  return (data || []).map((creator: DbUgcCreator) => ({
    ...creator,
    products: creator.products as string[] || [],
    content_types: creator.content_types as string[] || [],
    platforms: creator.platforms as string[] || []
  }));
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
  // First, get the creator to check if it's the "To Be Determined" creator
  const { data: creator, error: fetchError } = await supabase
    .from('ugc_creators')
    .select('name')
    .eq('id', creatorId)
    .single();

  if (fetchError) {
    console.error('Error fetching creator for deletion check:', fetchError);
    throw fetchError;
  }

  // Prevent deletion of the "To Be Determined" creator
  if (creator && creator.name === 'To Be Determined') {
    throw new Error('Cannot delete the "To Be Determined" creator as it is a system creator.');
  }

  const { error } = await supabase
    .from('ugc_creators')
    .delete()
    .eq('id', creatorId);

  if (error) {
    console.error('Error deleting UGC creator:', error);
    throw error;
  }
}

// UGC Creator Script Services
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
    script_content: JSON.parse(JSON.stringify(script.script_content)) as UgcCreatorScript['script_content'],
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
    script_content: JSON.parse(JSON.stringify(data.script_content)) as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
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
    script_content: JSON.parse(JSON.stringify(data.script_content)) as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function createUgcCreatorScript(
  script: Omit<UgcCreatorScript, 'id' | 'created_at' | 'updated_at'>
): Promise<UgcCreatorScript> {
  const publicShareId = uuidv4();
  
  // Serialize script_content to avoid type issues
  const serializedScript = {
    ...script,
    script_content: JSON.parse(JSON.stringify(script.script_content)),
    b_roll_shot_list: Array.isArray(script.b_roll_shot_list) ? script.b_roll_shot_list : [],
    id: uuidv4(),
    public_share_id: publicShareId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .insert(serializedScript)
    .select()
    .single();

  if (error) {
    console.error('Error creating UGC creator script:', error);
    throw error;
  }

  return {
    ...data,
    script_content: JSON.parse(JSON.stringify(data.script_content)) as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function updateUgcCreatorScript(
  script: Partial<UgcCreatorScript> & { id: string }
): Promise<UgcCreatorScript> {
  // Serialize script_content if it exists
  const serializedScript = {
    ...script,
    script_content: script.script_content ? JSON.parse(JSON.stringify(script.script_content)) : undefined,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .update(serializedScript)
    .eq('id', script.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating UGC creator script:', error);
    throw error;
  }

  return {
    ...data,
    script_content: JSON.parse(JSON.stringify(data.script_content)) as UgcCreatorScript['script_content'],
    b_roll_shot_list: data.b_roll_shot_list as string[] || []
  };
}

export async function deleteUgcCreatorScript(scriptId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_creator_scripts')
    .delete()
    .eq('id', scriptId);

  if (error) {
    console.error('Error deleting UGC creator script:', error);
    throw error;
  }
}

// UGC Creator Pipeline Services
export async function getUgcCreatorScriptsByStatus(brandId: string, status: string): Promise<UgcCreatorScript[]> {
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching UGC creator scripts by status:', error);
    throw error;
  }

  return (data || []).map((script: DbUgcCreatorScript) => ({
    ...script,
    script_content: script.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: script.b_roll_shot_list as string[] || []
  }));
}

export async function getUgcCreatorScriptsByConceptStatus(brandId: string, conceptStatus: string): Promise<UgcCreatorScript[]> {
  let statusFilter;
  
  // Map concept status to corresponding script statuses (not creator onboarding statuses)
  switch (conceptStatus) {
    case 'Script Approval':
      statusFilter = ['PENDING_APPROVAL', 'REVISION_REQUESTED'];
      break;
    case 'Creator Assignment':
      statusFilter = ['APPROVED', 'CREATOR_REASSIGNMENT'];
      break;
    case 'Send Script to Creator':
      statusFilter = ['SCRIPT_ASSIGNED'];
      break;
    case 'Creator Shooting':
      statusFilter = ['CREATOR_APPROVED', 'CONTENT_REVISION_REQUESTED'];
      break;
    case 'Content Approval':
      statusFilter = ['CONTENT_SUBMITTED'];
      break;
    case 'To Edit':
      statusFilter = ['COMPLETED'];
      break;
    default:
      statusFilter = [];
  }
  
  if (statusFilter.length === 0) {
    return [];
  }

  // First try to filter by both status and concept_status
  let { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('brand_id', brandId)
    .in('status', statusFilter)
    .order('created_at', { ascending: false });

  // If no results, try filtering by concept_status directly
  if (!error && (!data || data.length === 0)) {
    const { data: conceptStatusData, error: conceptStatusError } = await supabase
      .from('ugc_creator_scripts')
      .select('*')
      .eq('brand_id', brandId)
      .eq('concept_status', conceptStatus)
      .order('created_at', { ascending: false });
    
    if (!conceptStatusError && conceptStatusData && conceptStatusData.length > 0) {
      data = conceptStatusData;
    }
  }

  if (error) {
    console.error('Error fetching UGC creator scripts by concept status:', error);
    throw error;
  }

  return (data || []).map((script: DbUgcCreatorScript) => ({
    ...script,
    script_content: script.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: script.b_roll_shot_list as string[] || []
  }));
}

export async function sendToBriefBatch(
  scriptId: string, 
  batchId: string
): Promise<UgcCreatorScript> {
  const script = await getUgcCreatorScriptById(scriptId);
  
  if (!script) {
    throw new Error('Script not found');
  }
  
  const { data: updatedScript, error } = await supabase
    .from('ugc_creator_scripts')
    .update({
      linked_brief_batch_id: batchId,
      updated_at: new Date().toISOString()
    })
    .eq('id', scriptId)
    .select()
    .single();

  if (error) {
    console.error('Error linking script to brief batch:', error);
    throw error;
  }

  return {
    ...updatedScript,
    script_content: updatedScript.script_content as UgcCreatorScript['script_content'],
    b_roll_shot_list: updatedScript.b_roll_shot_list as string[] || []
  };
}

// New functions for UGC script shares
export async function createUgcScriptShare(
  creatorId: string,
  brandId: string,
  userId: string,
  scriptIds: string[]
): Promise<UgcScriptShare> {
  const shareId = uuidv4();
  
  const newShare = {
    id: uuidv4(),
    creator_id: creatorId,
    brand_id: brandId,
    user_id: userId,
    share_id: shareId,
    scripts: scriptIds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ugc_script_shares')
    .insert(newShare)
    .select()
    .single();

  if (error) {
    console.error('Error creating UGC script share:', error);
    throw error;
  }

  return {
    ...data,
    scripts: data.scripts as string[]
  };
}

export async function getUgcScriptShareByShareId(shareId: string): Promise<UgcScriptShare | null> {
  const { data, error } = await supabase
    .from('ugc_script_shares')
    .select('*')
    .eq('share_id', shareId)
    .single();

  if (error) {
    console.error('Error fetching UGC script share by share ID:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    scripts: data.scripts as string[]
  };
}

export async function getScriptsFromShare(shareId: string): Promise<UgcCreatorScript[]> {
  const share = await getUgcScriptShareByShareId(shareId);
  
  if (!share) return [];
  
  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .in('id', share.scripts);
    
  if (error) {
    console.error('Error fetching scripts from share:', error);
    throw error;
  }
  
  return (data || []).map((script: DbUgcCreatorScript) => ({
    ...script,
    script_content: JSON.parse(JSON.stringify(script.script_content)) as UgcCreatorScript['script_content'],
    b_roll_shot_list: script.b_roll_shot_list as string[] || []
  }));
}

// Brand UGC field management
export async function updateBrandUgcFields(
  brandId: string, 
  ugcFields: UgcBrandFields
): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .update({
      ugc_filming_instructions: ugcFields.ugc_filming_instructions,
      ugc_company_description: ugcFields.ugc_company_description,
      ugc_guide_description: ugcFields.ugc_guide_description,
      ugc_default_system_instructions: ugcFields.ugc_default_system_instructions,
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId);

  if (error) {
    console.error('Error updating brand UGC fields:', error);
    throw error;
  }
}

export async function getBrandUgcFields(brandId: string): Promise<UgcBrandFields | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('ugc_filming_instructions, ugc_company_description, ugc_guide_description, ugc_default_system_instructions')
    .eq('id', brandId)
    .single();

  if (error) {
    console.error('Error fetching brand UGC fields:', error);
    throw error;
  }

  if (!data) return null;

  return data as UgcBrandFields;
}

// Generate B-roll shot list using AI (placeholder function)
export async function generateBRollShotList(
  scriptContent: UgcCreatorScript['script_content'],
  customPrompt?: string
): Promise<string[]> {
  try {
    // This would call an AI service endpoint, but for now we'll return a placeholder
    // In the actual implementation, call your AI service here
    
    // Placeholder sample b-roll shots
    return [
      "Preparation Shot: Creator applying/using product before the skit",
      "Pre-Interaction Confidence: Close-up of creator's face showing subtle confidence",
      "Participant's Captivated Look: Close-up of participant's captivated expression",
      "Product Shot: Product in creator's hand or bag after interaction",
      "Bold Gesture Detail: Hand shot of participant reaching for phone/business card"
    ];
  } catch (error) {
    console.error('Error generating B-roll shot list:', error);
    throw error;
  }
}

// Function to generate default system instructions
export function generateDefaultSystemInstructions(): string {
  return `You are an expert UGC (User Generated Content) script creator that specializes in creating engaging scripts for social media videos.

Your task is to create a highly engaging UGC script for a creator. The script should be optimized for the brand's products and target audience.

IMPORTANT: Your response MUST be valid JSON with the following structure:
{
  "script_content": {
    "scene_start": "Description of how the scene starts",
    "segments": [
      {
        "segment": "Segment name/title",
        "script": "Dialogue or action description",
        "visuals": "Visual instructions for filming"
      }
    ],
    "scene_end": "Description of how the scene ends"
  },
  "hook_body": "The main body/message of the script that follows the hook",
  "cta": "Call to action for the end of the video",
  "b_roll_shot_list": [
    "Description of supplementary shot 1",
    "Description of supplementary shot 2",
    ...
  ],
  "company_description": "Description of the company, products, and brand",
  "guide_description": "Overview of what the creator will be filming and the goals of the content",
  "filming_instructions": "Detailed technical and performance guidance for filming"
}

# UGC Brief Creation Guidelines

## 1. About the Company
- Include company name, product category, key benefits, flagship products, and achievements

## 2. About This Guide
- Provide an overview of what the creator will be filming
- Clarify the goal and requirements of the content
- Specify target audience demographics and interests
- Highlight the key emotional connection to make with viewers
- Explain how this content fits into the brand's overall marketing strategy

## 3. Filming Instructions
- Video quality requirements (resolution, orientation, etc.)
- Audio requirements (clarity, background noise control)
- Performance guidelines (authenticity, energy level, tone)
- Lighting and background guidance (natural light vs. studio, setting)
- Location suggestions that would enhance the content
- On-camera presence tips (how to appear natural and authentic)
- Pacing and timing recommendations (keeping viewer attention)
- Specific technical requirements (closeups, transitions, etc.)
- Consent and respect guidelines

## 4. Script
- Title
- Scene description
- Segment-by-segment breakdown with dialogue, actions, and visuals
- Include clear instructions for each part of the script

## 5. B-Roll Shot List
- Detail specific additional shots needed
- Include preparation shots, closeups, and product shots

Your response should use any provided guide description or filming instructions as a starting point, enhancing them as needed based on the brand context. If these elements are missing or minimal, create comprehensive versions.

Format the output in clean JSON with the structure provided at the beginning of these instructions.`
} 