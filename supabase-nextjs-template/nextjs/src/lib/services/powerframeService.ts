import { createSPASassClient } from '@/lib/supabase/client';
import {
  PageType,
  Wireframe,
  WireframeModule,
  WireframeShare,
  CreatePageTypeRequest,
  CreateWireframeRequest,
  UpdateWireframeStructureRequest,
  CreateShareRequest,
  DbWireframe,
  DbWireframeModule,
  WireframeStructure,
  ExtractedModule,
  AIGeneratedContent,
  ShareSettings,
} from '@/lib/types/powerframe';

// Helper to get typed Supabase client
async function getTypedSupabaseClient() {
  const sassClient = await createSPASassClient();
  return sassClient.getSupabaseClient() as any; // Type assertion needed due to Supabase type generation limitations
}

// Page Types
export async function getPageTypes(brandId: string): Promise<PageType[]> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('page_types')
    .select('*')
    .eq('brand_id', brandId)
    .order('is_default', { ascending: false })
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createPageType(request: CreatePageTypeRequest): Promise<PageType> {
  const supabase = await getTypedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('page_types')
    .insert({
      ...request,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePageType(id: string, updates: Partial<PageType>): Promise<PageType> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('page_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePageType(id: string): Promise<void> {
  const supabase = await getTypedSupabaseClient();
  
  const { error } = await supabase
    .from('page_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Wireframes
export async function getWireframes(brandId: string): Promise<Wireframe[]> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframes')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map((wireframe: DbWireframe) => ({
    ...wireframe,
    extracted_modules: wireframe.extracted_modules as unknown as ExtractedModule[] | undefined,
    structure: wireframe.structure as unknown as WireframeStructure,
    ai_generated_content: wireframe.ai_generated_content as unknown as AIGeneratedContent | undefined,
    status: wireframe.status as Wireframe['status'],
    share_settings: wireframe.share_settings as unknown as ShareSettings | undefined,
  }));
}

export async function getWireframe(id: string): Promise<Wireframe | null> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return {
    ...data,
    extracted_modules: data.extracted_modules as unknown as ExtractedModule[] | undefined,
    structure: data.structure as unknown as WireframeStructure,
    ai_generated_content: data.ai_generated_content as unknown as AIGeneratedContent | undefined,
    status: data.status as Wireframe['status'],
    share_settings: data.share_settings as unknown as ShareSettings | undefined,
  };
}

export async function createWireframe(request: CreateWireframeRequest): Promise<Wireframe> {
  const supabase = await getTypedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('wireframes')
    .insert({
      ...request,
      user_id: user.id,
      structure: { rows: [] },
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    ...data,
    structure: data.structure as unknown as WireframeStructure,
    status: data.status as Wireframe['status'],
    share_settings: data.share_settings as unknown as ShareSettings | undefined,
  };
}

export async function updateWireframe(id: string, updates: Partial<Wireframe>): Promise<Wireframe> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    ...data,
    extracted_modules: data.extracted_modules as unknown as ExtractedModule[] | undefined,
    structure: data.structure as unknown as WireframeStructure,
    ai_generated_content: data.ai_generated_content as unknown as AIGeneratedContent | undefined,
    status: data.status as Wireframe['status'],
    share_settings: data.share_settings as unknown as ShareSettings | undefined,
  };
}

export async function updateWireframeStructure(
  id: string, 
  request: UpdateWireframeStructureRequest
): Promise<Wireframe> {
  return updateWireframe(id, { structure: request.structure });
}

export async function deleteWireframe(id: string): Promise<void> {
  const supabase = await getTypedSupabaseClient();
  
  const { error } = await supabase
    .from('wireframes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Wireframe Modules
export async function getWireframeModules(wireframeId: string): Promise<WireframeModule[]> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframe_modules')
    .select('*')
    .eq('wireframe_id', wireframeId)
    .order('order_index');

  if (error) throw error;
  
  return (data || []).map((module: DbWireframeModule) => ({
    ...module,
    type: module.type as WireframeModule['type'],
    content: module.content as unknown as WireframeModule['content'],
    position: module.position as unknown as WireframeModule['position'],
    alignment: module.alignment as WireframeModule['alignment'],
  }));
}

export async function createWireframeModule(
  module: Omit<WireframeModule, 'id' | 'created_at' | 'updated_at'>
): Promise<WireframeModule> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframe_modules')
    .insert(module)
    .select()
    .single();

  if (error) throw error;
  
  return {
    ...data,
    type: data.type as WireframeModule['type'],
    content: data.content as unknown as WireframeModule['content'],
    position: data.position as unknown as WireframeModule['position'],
    alignment: data.alignment as WireframeModule['alignment'],
  };
}

export async function updateWireframeModule(
  id: string,
  updates: Partial<WireframeModule>
): Promise<WireframeModule> {
  const supabase = await getTypedSupabaseClient();
  
  const { data, error } = await supabase
    .from('wireframe_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return {
    ...data,
    type: data.type as WireframeModule['type'],
    content: data.content as unknown as WireframeModule['content'],
    position: data.position as unknown as WireframeModule['position'],
    alignment: data.alignment as WireframeModule['alignment'],
  };
}

export async function deleteWireframeModule(id: string): Promise<void> {
  const supabase = await getTypedSupabaseClient();
  
  const { error } = await supabase
    .from('wireframe_modules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Sharing
export async function createWireframeShare(request: CreateShareRequest): Promise<WireframeShare> {
  const supabase = await getTypedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  // Generate a unique share ID
  const shareId = `wf_${Math.random().toString(36).substring(2, 15)}`;

  const { data, error } = await supabase
    .from('wireframe_shares')
    .insert({
      ...request,
      share_id: shareId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Also update the wireframe with share settings
  await updateWireframe(request.wireframe_id, {
    share_settings: {
      is_editable: request.is_editable,
      expires_at: request.expires_at,
    },
    status: 'shared',
  });

  return data;
}

export async function getWireframeByShareId(shareId: string): Promise<Wireframe | null> {
  const supabase = await getTypedSupabaseClient();
  
  // First get the share details
  const { data: shareData, error: shareError } = await supabase
    .from('wireframe_shares')
    .select('*')
    .eq('share_id', shareId)
    .single();

  if (shareError) {
    if (shareError.code === 'PGRST116') return null;
    throw shareError;
  }

  // Check if share has expired
  if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
    return null;
  }

  // Get the wireframe
  const { data: wireframeData, error: wireframeError } = await supabase
    .from('wireframes')
    .select('*')
    .eq('id', shareData.wireframe_id)
    .single();

  if (wireframeError) throw wireframeError;

  return {
    ...wireframeData,
    extracted_modules: wireframeData.extracted_modules as unknown as ExtractedModule[] | undefined,
    structure: wireframeData.structure as unknown as WireframeStructure,
    ai_generated_content: wireframeData.ai_generated_content as unknown as AIGeneratedContent | undefined,
    status: wireframeData.status as Wireframe['status'],
    share_settings: wireframeData.share_settings as unknown as ShareSettings | undefined,
  };
}

// Initialize default page types for a brand
export async function initializeDefaultPageTypes(brandId: string): Promise<void> {
  const supabase = await getTypedSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  try {
    // Try using the RPC function first
    const { error } = await supabase.rpc('create_default_page_types', {
      p_brand_id: brandId,
      p_user_id: user.id,
    });

    if (error) throw error;
  } catch (rpcError: any) {
    console.warn('RPC function failed, using direct insert:', rpcError);
    
    // Fallback: Insert directly
    const defaultPageTypes = [
      { name: 'Home Page', description: 'Main landing page of the website', is_default: true },
      { name: 'Collection Page', description: 'Product collection or category page', is_default: true },
      { name: 'PDP', description: 'Product Detail Page', is_default: true },
      { name: 'Listicle', description: 'List-based content page', is_default: true },
      { name: 'Advertorial', description: 'Advertisement styled as editorial content', is_default: true },
    ];

    for (const pageType of defaultPageTypes) {
      const { error } = await supabase
        .from('page_types')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          ...pageType,
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Error inserting page type:', pageType.name, error);
      }
    }
  }
}

// Upload competitor snapshot
export async function uploadCompetitorSnapshot(
  file: File,
  wireframeId: string
): Promise<string> {
  const sassClient = await createSPASassClient();
  const supabase = sassClient.getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${wireframeId}/competitor-snapshot-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('powerframe-media')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('powerframe-media')
    .getPublicUrl(data.path);

  // Update wireframe with snapshot URL
  await updateWireframe(wireframeId, {
    competitor_snapshot_url: publicUrl,
  });

  return publicUrl;
} 