import { createSSRClient } from '@/lib/supabase/server';
import { Brand, BriefBatch, BriefConcept, DbBrand, DbBriefConcept, DbBriefBatch, ShareSettings, ShareResult, Scene, Hook, EditingResource, ResourceLogin, DosAndDonts } from '@/lib/types/powerbrief';
import { v4 as uuidv4 } from 'uuid';

const getSupabaseClient = async () => await createSSRClient();

// Brand Services
export async function getBrands(userId: string): Promise<Brand[]> {
  const supabase = await getSupabaseClient();
  
  try {
    // Try to use the new RPC function to get all accessible brands (owned + shared)
    // Note: This RPC function might not exist yet if the migration hasn't been run
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_accessible_brands' as any, { p_user_id: userId });

    if (!rpcError && rpcData) {
      // For each brand returned by the RPC, fetch the full brand data
      const brandIds = (rpcData as any[]).map((item: any) => item.id);
      
      if (brandIds.length === 0) {
        return [];
      }

      // Fetch full brand data for all accessible brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .in('id', brandIds)
        .order('created_at', { ascending: false });

      if (brandsError) {
        console.error('Error fetching full brand data:', brandsError);
        throw brandsError;
      }

      // Transform from DB format to app format and add access info
      return (brandsData || []).map((item: DbBrand) => {
        const accessInfo = (rpcData as any[]).find((d: any) => d.id === item.id);
        
        // Transform the data with proper type casting
        const transformedBrand: Brand = {
          ...item,
          brand_info_data: item.brand_info_data as unknown as Brand['brand_info_data'],
          target_audience_data: item.target_audience_data as unknown as Brand['target_audience_data'],
          competition_data: item.competition_data as unknown as Brand['competition_data'],
          editing_resources: (item.editing_resources as unknown as EditingResource[]) || [],
          resource_logins: (item.resource_logins as unknown as ResourceLogin[]) || [],
          dos_and_donts: (item.dos_and_donts as unknown as DosAndDonts) || {
            imagesDos: [],
            imagesDonts: [],
            videosDos: [],
            videosDonts: []
          },
          // Add access type and role info for UI display
          access_type: accessInfo?.access_type || 'owner',
          share_role: accessInfo?.role || null,
        } as Brand & { access_type?: string; share_role?: string | null };
        
        return transformedBrand;
      });
    }
  } catch (error) {
    console.error('Error using RPC function, falling back to direct query:', error);
  }
  
  // Fallback to the old method if RPC function doesn't exist yet
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fallbackError) {
    console.error('Error fetching brands (fallback):', fallbackError);
    throw fallbackError;
  }

  // Transform from DB format to app format
  return (fallbackData || []).map((item: DbBrand) => ({
    ...item,
    brand_info_data: item.brand_info_data as unknown as Brand['brand_info_data'],
    target_audience_data: item.target_audience_data as unknown as Brand['target_audience_data'],
    competition_data: item.competition_data as unknown as Brand['competition_data'],
    editing_resources: (item.editing_resources as unknown as EditingResource[]) || [],
    resource_logins: (item.resource_logins as unknown as ResourceLogin[]) || [],
    dos_and_donts: (item.dos_and_donts as unknown as DosAndDonts) || {
      imagesDos: [],
      imagesDonts: [],
      videosDos: [],
      videosDonts: []
    }
  }));
}

export async function getBrandById(brandId: string): Promise<Brand | null> {
  console.log('getBrandById called with brandId:', brandId);
  
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  console.log('getBrandById query result:', { data: !!data, error: error?.code, errorMessage: error?.message });

  if (error) {
    // If the error is "no rows found", return null instead of throwing
    if (error.code === 'PGRST116') {
      console.log('getBrandById: No rows found (PGRST116), returning null');
      return null;
    }
    console.error('Error fetching brand:', error);
    throw error;
  }

  if (!data) {
    console.log('getBrandById: No data returned, returning null');
    return null;
  }

  console.log('getBrandById: Brand found successfully, transforming data');
  
  // Transform from DB format to app format
  return {
    ...data,
    brand_info_data: data.brand_info_data as unknown as Brand['brand_info_data'],
    target_audience_data: data.target_audience_data as unknown as Brand['target_audience_data'],
    competition_data: data.competition_data as unknown as Brand['competition_data'],
  };
}

export async function createBrand(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<Brand> {
  const supabase = await getSupabaseClient();
  const dbBrand = {
    ...brand,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('brands')
    .insert(dbBrand)
    .select()
    .single();

  if (error) {
    console.error('Error creating brand:', error);
    throw error;
  }

  // Transform from DB format to app format
  return {
    ...data,
    brand_info_data: data.brand_info_data as unknown as Brand['brand_info_data'],
    target_audience_data: data.target_audience_data as unknown as Brand['target_audience_data'],
    competition_data: data.competition_data as unknown as Brand['competition_data'],
  };
}

export async function updateBrand(brand: Partial<Brand> & { id: string }): Promise<Brand> {
  const supabase = await getSupabaseClient();
  const dbBrand = {
    ...brand,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('brands')
    .update(dbBrand)
    .eq('id', brand.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating brand:', error);
    throw error;
  }

  // Transform from DB format to app format
  return {
    ...data,
    brand_info_data: data.brand_info_data as unknown as Brand['brand_info_data'],
    target_audience_data: data.target_audience_data as unknown as Brand['target_audience_data'],
    competition_data: data.competition_data as unknown as Brand['competition_data'],
  };
}

export async function deleteBrand(brandId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', brandId);

  if (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}

// Brief Batch Services
export async function getBriefBatches(brandId: string): Promise<BriefBatch[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brief_batches')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching brief batches:', error);
    throw error;
  }

  return data || [];
}

export async function getBriefBatchById(batchId: string): Promise<BriefBatch | null> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brief_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) {
    // If the error is "no rows found", return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching brief batch:', error);
    throw error;
  }

  return data;
}

export async function createBriefBatch(batch: Omit<BriefBatch, 'id' | 'created_at' | 'updated_at'>): Promise<BriefBatch> {
  const supabase = await getSupabaseClient();
  const newBatch = {
    ...batch,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('brief_batches')
    .insert(newBatch)
    .select()
    .single();

  if (error) {
    console.error('Error creating brief batch:', error);
    throw error;
  }

  return data;
}

export async function updateBriefBatch(batch: Partial<BriefBatch> & { id: string }): Promise<BriefBatch> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brief_batches')
    .update({
      ...batch,
      updated_at: new Date().toISOString()
    })
    .eq('id', batch.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating brief batch:', error);
    throw error;
  }

  return data;
}

export async function deleteBriefBatch(batchId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('brief_batches')
    .delete()
    .eq('id', batchId);

  if (error) {
    console.error('Error deleting brief batch:', error);
    throw error;
  }
}

// Brief Concept Services
export async function getBriefConcepts(batchId: string): Promise<BriefConcept[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brief_concepts')
    .select('*')
    .eq('brief_batch_id', batchId)
    .order('order_in_batch', { ascending: true });

  if (error) {
    console.error('Error fetching concepts:', error);
    throw error;
  }

  // Transform from DB format to app format with type casting
  return (data || []).map((item: any) => {
    const concept: any = {
      ...item,
      body_content_structured: item.body_content_structured as unknown as Scene[],
      // Ensure hook fields are correctly typed on return
      text_hook_options: item.text_hook_options as unknown as Hook[] | null,
      spoken_hook_options: item.spoken_hook_options as unknown as Hook[] | null,
    };
    
    // Ensure the object meets the BriefConcept interface
    return concept as BriefConcept;
  });
}

export async function getBriefConceptById(conceptId: string): Promise<BriefConcept | null> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('brief_concepts')
    .select('*')
    .eq('id', conceptId)
    .single();

  if (error) {
    // If the error is "no rows found", return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching concept:', error);
    throw error;
  }

  if (!data) return null;

  // Transform from DB format to app format with type casting
  const concept: any = {
    ...data,
    body_content_structured: data.body_content_structured as unknown as Scene[],
    // Ensure hook fields are correctly typed on return
    text_hook_options: data.text_hook_options as unknown as Hook[] | null,
    spoken_hook_options: data.spoken_hook_options as unknown as Hook[] | null,
  };
  
  // Ensure the object meets the BriefConcept interface
  return concept as BriefConcept;
}

export async function createBriefConcept(concept: Omit<BriefConcept, 'id' | 'created_at' | 'updated_at'>): Promise<BriefConcept> {
  // If there's a brief_batch_id, fetch the associated brand to get default instructions
  let defaultVideoInstructions = '';
  let defaultDesignerInstructions = '';
  
  if (concept.brief_batch_id) {
    try {
      // First, get the batch to find the brand_id
      const batchSupabase = await getSupabaseClient();
      const { data: batchData } = await batchSupabase
        .from('brief_batches')
        .select('brand_id')
        .eq('id', concept.brief_batch_id)
        .single();
      
      if (batchData?.brand_id) {
        // Then get the brand to find the default instructions
        const brandSupabase = await getSupabaseClient();
        const { data: brandData } = await brandSupabase
          .from('brands')
          .select('*')
          .eq('id', batchData.brand_id)
          .single();
        
        if (brandData) {
          // Type cast to access properties that might not be in the type
          const brandWithDefaults = brandData as any;
          defaultVideoInstructions = brandWithDefaults.default_video_instructions || '';
          defaultDesignerInstructions = brandWithDefaults.default_designer_instructions || '';
        }
      }
    } catch (err) {
      console.error('Error fetching brand defaults for concept:', err);
      // Continue with empty defaults if there's an error
    }
  }

  // Create the concept with defaults
  const supabase = await getSupabaseClient();
  const dbConcept: any = {
    ...concept,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    concept_title: concept.concept_title || 'New Concept',
    body_content_structured: concept.body_content_structured || [],
    order_in_batch: concept.order_in_batch || 0,
    // Set video and designer instructions from brand defaults if not provided
    videoInstructions: concept.videoInstructions || defaultVideoInstructions,
    designerInstructions: concept.designerInstructions || defaultDesignerInstructions,
    // Ensure hook fields are included and are Hook[] or null
    text_hook_options: concept.text_hook_options || null,
    spoken_hook_options: concept.spoken_hook_options || null,
    hook_type: concept.hook_type || 'both',
    hook_count: concept.hook_count || 5
  };

  const { data, error } = await supabase
    .from('brief_concepts')
    .insert(dbConcept)
    .select()
    .single();

  if (error) {
    console.error('Error creating concept:', error);
    throw error;
  }

  // Transform from DB format to app format with type casting
  const createdConcept: any = {
    ...data,
    body_content_structured: data.body_content_structured as unknown as Scene[],
    // Ensure hook fields are correctly typed on return
    text_hook_options: data.text_hook_options as unknown as Hook[] | null,
    spoken_hook_options: data.spoken_hook_options as unknown as Hook[] | null,
    hook_type: data.hook_type || 'both',
    hook_count: data.hook_count || 5
  };
  
  // Ensure the object meets the BriefConcept interface
  return createdConcept as BriefConcept;
}

export async function updateBriefConcept(concept: Partial<BriefConcept> & { id: string }): Promise<BriefConcept> {
  // Use type casting to avoid issues with potentially missing fields
  const supabase = await getSupabaseClient();
  const dbConcept: any = {
    ...concept,
    updated_at: new Date().toISOString()
  };

  // Enhanced logging for debugging status updates
  console.log('🔄 Updating concept ID:', concept.id);
  if (concept.status !== undefined) {
    console.log('📊 Status update:', concept.status);
  }
  console.log('🔧 Fields being updated:', Object.keys(dbConcept));

  const { data, error } = await supabase
    .from('brief_concepts')
    .update(dbConcept)
    .eq('id', concept.id)
    .select()
    .single();

  if (error) {
    console.error('❌ Database error updating concept:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
    console.error('📋 Attempted update data:', JSON.stringify(dbConcept, null, 2));
    throw error;
  }

  console.log('✅ Concept updated successfully, ID:', concept.id);
  if (concept.status !== undefined) {
    console.log('📊 New status confirmed:', data.status);
  }

  // Transform from DB format to app format with type casting
  const updatedConcept: any = {
    ...data,
    body_content_structured: data.body_content_structured as unknown as Scene[],
    // Ensure hook fields are correctly typed on return
    text_hook_options: data.text_hook_options as unknown as Hook[] | null,
    spoken_hook_options: data.spoken_hook_options as unknown as Hook[] | null,
    hook_type: data.hook_type,
    hook_count: data.hook_count,
  };
  
  // Ensure the object meets the BriefConcept interface
  return updatedConcept as BriefConcept;
}

export async function deleteBriefConcept(conceptId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('brief_concepts')
    .delete()
    .eq('id', conceptId);

  if (error) {
    console.error('Error deleting concept:', error);
    throw error;
  }
}

// Media Upload Service
export async function uploadMedia(file: File, userId: string): Promise<string> {
  const supabase = await getSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${uuidv4()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('powerbrief-media')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading file:', error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('powerbrief-media')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Share a brief batch with others
 * @param batchId - ID of the brief batch to share
 * @param shareType - Type of sharing (link or email)
 * @param shareSettings - Settings for the share
 * @returns The share result with ID and URL
 */
export async function shareBriefBatch(
  batchId: string,
  shareType: 'link' | 'email',
  shareSettings: ShareSettings
): Promise<ShareResult> {
  const supabase = await getSupabaseClient();
  
  // Generate a unique share ID
  const shareId = crypto.randomUUID();
  
  // Create the share URL based on the share type
  const shareUrl = `${window.location.origin}/public/brief/${shareId}`;
  
  // First, get the current share_settings to merge with existing ones
  const { data: currentBatch, error: fetchError } = await supabase
    .from('brief_batches')
    .select('share_settings')
    .eq('id', batchId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching current batch share settings:', fetchError);
    throw new Error(`Failed to fetch current batch: ${fetchError.message}`);
  }
  
  // Merge with existing share settings
  const existingShareSettings = currentBatch?.share_settings || {};
  const updatedShareSettings = {
    ...existingShareSettings,
    [shareId]: {
      ...shareSettings,
      created_at: new Date().toISOString(),
      share_type: shareType
    }
  };
  
  // Update the brief batch with the merged share settings
  const { data, error } = await supabase
    .from('brief_batches')
    .update({
      share_settings: updatedShareSettings
    } as Partial<DbBriefBatch>)
    .eq('id', batchId)
    .select();
  
  if (error) {
    console.error('Error sharing brief batch:', error);
    throw new Error(`Failed to share brief batch: ${error.message}`);
  }
  
  // If email sharing, send the email invitation via an API endpoint
  if (shareType === 'email' && shareSettings.email) {
    try {
      await fetch('/api/share/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: shareSettings.email,
          shareUrl,
          batchId,
          shareId,
          shareType: 'batch'
        })
      });
    } catch (emailError) {
      console.error('Error sending share invitation email:', emailError);
      // Continue even if email fails - we'll return the share link anyway
    }
  }
  
  return {
    share_id: shareId,
    share_url: shareUrl
  };
}

/**
 * Share a brief concept with others
 * @param conceptId - ID of the brief concept to share
 * @param shareType - Type of sharing (link or email)
 * @param shareSettings - Settings for the share
 * @returns The share result with ID and URL
 */
export async function shareBriefConcept(
  conceptId: string,
  shareType: 'link' | 'email',
  shareSettings: ShareSettings
): Promise<ShareResult> {
  const supabase = await getSupabaseClient();
  
  // Generate a unique share ID
  const shareId = crypto.randomUUID();
  
  // Create the share URL based on the share type
  const shareUrl = `${window.location.origin}/public/concept/${shareId}`;
  
  // First, get the current share_settings to merge with existing ones
  const { data: currentConcept, error: fetchError } = await supabase
    .from('brief_concepts')
    .select('share_settings')
    .eq('id', conceptId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching current concept share settings:', fetchError);
    throw new Error(`Failed to fetch current concept: ${fetchError.message}`);
  }
  
  // Merge with existing share settings
  const existingShareSettings = currentConcept?.share_settings || {};
  const updatedShareSettings = {
    ...existingShareSettings,
    [shareId]: {
      ...shareSettings,
      created_at: new Date().toISOString(),
      share_type: shareType
    }
  };
  
  // Update the brief concept with the merged share settings
  const { data, error } = await supabase
    .from('brief_concepts')
    .update({
      share_settings: updatedShareSettings
    } as Partial<DbBriefConcept>)
    .eq('id', conceptId)
    .select();
  
  if (error) {
    console.error('Error sharing brief concept:', error);
    throw new Error(`Failed to share brief concept: ${error.message}`);
  }
  
  // If email sharing, send the email invitation via an API endpoint
  if (shareType === 'email' && shareSettings.email) {
    try {
      await fetch('/api/share/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: shareSettings.email,
          shareUrl,
          conceptId,
          shareId,
          shareType: 'concept'
        })
      });
    } catch (emailError) {
      console.error('Error sending share invitation email:', emailError);
      // Continue even if email fails - we'll return the share link anyway
    }
  }
  
  return {
    share_id: shareId,
    share_url: shareUrl
  };
}

/**
 * Get count of concepts ready for review for a specific user
 * @param userId - The ID of the user to get pending reviews for
 * @returns The count of concepts that need review for the specified user
 */
export async function getPendingReviewsCount(userId: string): Promise<number> {
  const supabase = await getSupabaseClient();
  
  const { count, error } = await supabase
    .from('brief_concepts')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'ready_for_review')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error getting pending reviews count:', error);
    throw error;
  }
  
  return count || 0;
} 