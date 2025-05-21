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
  
  // Map concept status to corresponding script statuses
  switch (conceptStatus) {
    case 'Script Approval':
      statusFilter = ['NEW CREATOR SUBMISSION', 'COLD OUTREACH', 'PRIMARY SCREEN', 'BACKLOG', 'APPROVED FOR NEXT STEPS'];
      break;
    case 'Creator Assignment':
      statusFilter = ['SCHEDULE CALL', 'CALL SCHEDULED', 'SCRIPT ASSIGNMENT', 'SCRIPT ASSIGNED'];
      break;
    case 'Creator Shooting':
      statusFilter = ['CONTRACT SENT', 'PRODUCT SHIPMENT', 'CREATOR FILMING'];
      break;
    case 'Content Approval':
      statusFilter = ['FINAL CONTENT UPLOAD', 'CONTENT UPLOADED', 'READY FOR PAYMENT'];
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

  const { data, error } = await supabase
    .from('ugc_creator_scripts')
    .select('*')
    .eq('brand_id', brandId)
    .in('status', statusFilter)
    .order('created_at', { ascending: false });

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