import { createSPAClient } from '@/lib/supabase/client';
import { Brand, BriefBatch, BriefConcept, DbBrand, DbBriefConcept, DbBriefBatch, ShareSettings, ShareResult, Scene, Hook, EditingResource, ResourceLogin, DosAndDonts } from '@/lib/types/powerbrief';
import { v4 as uuidv4 } from 'uuid';

// Use client-side Supabase instance
const supabase = createSPAClient();

// Brand Services
export async function getBrands(userId: string): Promise<Brand[]> {
  try {
    // Try to use the new RPC function to get all accessible brands (owned + shared)
    // Note: This RPC function might not exist yet if the migration hasn't been run
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_accessible_brands' as any, { p_user_id: userId });

    if (!rpcError && rpcData) {
      // For each brand returned by the RPC, fetch the full brand data
      const brandIds = (rpcData as Array<{ id: string }>).map((item) => item.id);
      
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
  const fallbackSupabase = supabase;
  const { data: fallbackData, error: fallbackError } = await fallbackSupabase
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
  // Use API route for client-side brand creation
  const response = await fetch('/api/brands', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: brand.name,
      brand_info_data: brand.brand_info_data,
      target_audience_data: brand.target_audience_data,
      competition_data: brand.competition_data,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error creating brand:', errorData);
    throw new Error(errorData.error || 'Failed to create brand');
  }

  const data = await response.json();

  // Transform from DB format to app format
  return {
    ...data,
    brand_info_data: data.brand_info_data as unknown as Brand['brand_info_data'],
    target_audience_data: data.target_audience_data as unknown as Brand['target_audience_data'],
    competition_data: data.competition_data as unknown as Brand['competition_data'],
  };
}

export async function updateBrand(brand: Partial<Brand> & { id: string }): Promise<Brand> {
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
  const { data, error } = await supabase
    .from('brief_batches')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching brief batches:', error);
    throw error;
  }

  return (data || []).map(batch => ({
    ...batch,
    share_settings: (batch.share_settings as any) || {}
  }));
}

export async function getBriefBatchById(batchId: string): Promise<BriefBatch | null> {
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
  // Enhanced logging for debugging batch updates
  console.log('🔄 Updating batch ID:', batch.id);
  console.log('🔧 Fields being updated:', Object.keys(batch));
  console.log('📋 Batch data:', JSON.stringify(batch, null, 2));
  
  const updateData: any = {
    ...batch,
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('brief_batches')
    .update(updateData)
    .eq('id', batch.id)
    .select()
    .single();

  if (error) {
    console.error('❌ Database error updating batch:', error);
    console.error('🔍 Error details:', JSON.stringify(error, null, 2));
    console.error('📋 Attempted update data:', JSON.stringify(updateData, null, 2));
    throw error;
  }

  console.log('✅ Batch updated successfully, ID:', batch.id);
  return data;
}

export async function deleteBriefBatch(batchId: string): Promise<void> {
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
      const batchSupabase = supabase;
      const { data: batchData } = await batchSupabase
        .from('brief_batches')
        .select('brand_id')
        .eq('id', concept.brief_batch_id)
        .single();
      
      if (batchData?.brand_id) {
        // Then get the brand to find the default instructions
        const brandSupabase = supabase;
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
 * @param origin - The origin URL (e.g., https://www.powerbrief.ai) - required for server-side execution
 * @returns The share result with ID and URL
 */
export async function shareBriefBatch(
  batchId: string,
  shareType: 'link' | 'email',
  shareSettings: ShareSettings,
  origin?: string
): Promise<ShareResult> {
  console.log('🔵 shareBriefBatch called with:', { batchId, shareType, shareSettings, origin });
  
  // For direct batch ID sharing, we don't need to update the database
  // Just return the batch ID as the share ID
  
  // Create the share URL using the batch ID directly
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.powerbrief.ai');
  const shareUrl = `${baseUrl}/public/brief/${batchId}`;
  console.log('🔗 Share URL (using batch ID):', shareUrl);
  
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
          shareId: batchId, // Use batch ID as share ID
          shareType: 'batch'
        })
      });
    } catch (emailError) {
      console.error('Error sending share invitation email:', emailError);
      // Continue even if email fails - we'll return the share link anyway
    }
  }
  
  console.log('🎯 Returning share result with batch ID as share ID');
  
  return {
    share_id: batchId,
    share_url: shareUrl
  };
}

/**
 * Share a brief concept with others
 * @param conceptId - ID of the brief concept to share
 * @param shareType - Type of sharing (link or email)
 * @param shareSettings - Settings for the share
 * @param origin - The origin URL (e.g., https://www.powerbrief.ai) - required for server-side execution
 * @returns The share result with ID and URL
 */
export async function shareBriefConcept(
  conceptId: string,
  shareType: 'link' | 'email',
  shareSettings: ShareSettings,
  origin?: string
): Promise<ShareResult> {
  console.log('🔵 shareBriefConcept called with:', { conceptId, shareType, shareSettings, origin });
  
  // For direct concept ID sharing, we don't need to update the database
  // Just return the concept ID as the share ID
  
  // Create the share URL using the concept ID directly
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.powerbrief.ai');
  const shareUrl = `${baseUrl}/public/concept/${conceptId}`;
  console.log('🔗 Share URL (using concept ID):', shareUrl);
  
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
          shareId: conceptId, // Use concept ID as share ID
          shareType: 'concept'
        })
      });
    } catch (emailError) {
      console.error('Error sending share invitation email:', emailError);
      // Continue even if email fails - we'll return the share link anyway
    }
  }
  
  console.log('🎯 Returning share result with concept ID as share ID');
  
  return {
    share_id: conceptId,
    share_url: shareUrl
  };
}

/**
 * Move a concept to a different batch
 * @param conceptId - ID of the concept to move
 * @param targetBatchId - ID of the target batch to move the concept to
 * @returns The updated concept
 */
export async function moveConceptToBatch(conceptId: string, targetBatchId: string): Promise<BriefConcept> {
  console.log('🔄 Moving concept', conceptId, 'to batch', targetBatchId);
  
  const { data, error } = await supabase
    .from('brief_concepts')
    .update({
      brief_batch_id: targetBatchId,
      updated_at: new Date().toISOString()
    })
    .eq('id', conceptId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error moving concept to batch:', error);
    throw error;
  }

  console.log('✅ Concept moved successfully');

  // Transform from DB format to app format with type casting
  const movedConcept: any = {
    ...data,
    body_content_structured: data.body_content_structured as unknown as Scene[],
    text_hook_options: data.text_hook_options as unknown as Hook[] | null,
    spoken_hook_options: data.spoken_hook_options as unknown as Hook[] | null,
    hook_type: data.hook_type,
    hook_count: data.hook_count,
  };
  
  return movedConcept as BriefConcept;
}

/**
 * Get count of concepts ready for review for a specific user
 * @param userId - The ID of the user to get pending reviews for
 * @returns The count of concepts that need review for the specified user
 */
export async function getPendingReviewsCount(userId: string): Promise<number> {
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

// Get concept counts by status for batches
export async function getConceptCountsByStatus(brandId: string): Promise<Record<string, Record<string, number>>> {
  // Get all concepts for batches belonging to this brand
  const { data: conceptsData, error } = await supabase
    .from('brief_concepts')
    .select('brief_batch_id, status, brief_batches!inner(brand_id)')
    .eq('brief_batches.brand_id', brandId);

  if (error) {
    console.error('Error fetching concept counts by status:', error);
    throw new Error(`Failed to fetch concept counts: ${error.message}`);
  }

  // Group by batch_id and count by status
  const counts: Record<string, Record<string, number>> = {};
  
  conceptsData.forEach((concept: any) => {
    const batchId = concept.brief_batch_id;
    const status = concept.status || 'No Status';
    
    if (!counts[batchId]) {
      counts[batchId] = {};
    }
    
    if (!counts[batchId][status]) {
      counts[batchId][status] = 0;
    }
    
    counts[batchId][status]++;
  });

  return counts;
}

// Helper function to get status color configuration
export function getStatusColorConfig(status: string): { bg: string; text: string; border: string } {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'No Status': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    'BRIEFING IN PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    'BRIEF REVIEW': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    'BRIEF REVISIONS NEEDED': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    'READY FOR DESIGNER': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    'READY FOR EDITOR': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    'READY FOR EDITOR ASSIGNMENT': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    'READY FOR REVIEW': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'REVISIONS REQUESTED': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    'CONCEPT REJECTED': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };

  return statusColors[status] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
} 