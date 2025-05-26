import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
const supabase = createSPAClient();
// Brand Services
export async function getBrands(userId) {
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
    // Transform from DB format to app format
    return (data || []).map((item) => (Object.assign(Object.assign({}, item), { brand_info_data: item.brand_info_data, target_audience_data: item.target_audience_data, competition_data: item.competition_data })));
}
export async function getBrandById(brandId) {
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
    if (error) {
        // If the error is "no rows found", return null instead of throwing
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('Error fetching brand:', error);
        throw error;
    }
    if (!data)
        return null;
    // Transform from DB format to app format
    return Object.assign(Object.assign({}, data), { brand_info_data: data.brand_info_data, target_audience_data: data.target_audience_data, competition_data: data.competition_data });
}
export async function createBrand(brand) {
    const dbBrand = Object.assign(Object.assign({}, brand), { id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
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
    return Object.assign(Object.assign({}, data), { brand_info_data: data.brand_info_data, target_audience_data: data.target_audience_data, competition_data: data.competition_data });
}
export async function updateBrand(brand) {
    const dbBrand = Object.assign(Object.assign({}, brand), { updated_at: new Date().toISOString() });
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
    return Object.assign(Object.assign({}, data), { brand_info_data: data.brand_info_data, target_audience_data: data.target_audience_data, competition_data: data.competition_data });
}
export async function deleteBrand(brandId) {
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
export async function getBriefBatches(brandId) {
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
export async function getBriefBatchById(batchId) {
    const { data, error } = await supabase
        .from('brief_batches')
        .select('*')
        .eq('id', batchId)
        .single();
    if (error) {
        console.error('Error fetching brief batch:', error);
        throw error;
    }
    return data;
}
export async function createBriefBatch(batch) {
    const newBatch = Object.assign(Object.assign({}, batch), { id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
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
export async function updateBriefBatch(batch) {
    const { data, error } = await supabase
        .from('brief_batches')
        .update(Object.assign(Object.assign({}, batch), { updated_at: new Date().toISOString() }))
        .eq('id', batch.id)
        .select()
        .single();
    if (error) {
        console.error('Error updating brief batch:', error);
        throw error;
    }
    return data;
}
export async function deleteBriefBatch(batchId) {
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
export async function getBriefConcepts(batchId) {
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
    return (data || []).map((item) => {
        const concept = Object.assign(Object.assign({}, item), { body_content_structured: item.body_content_structured });
        // Ensure the object meets the BriefConcept interface
        return concept;
    });
}
export async function getBriefConceptById(conceptId) {
    const { data, error } = await supabase
        .from('brief_concepts')
        .select('*')
        .eq('id', conceptId)
        .single();
    if (error) {
        console.error('Error fetching concept:', error);
        throw error;
    }
    if (!data)
        return null;
    // Transform from DB format to app format with type casting
    const concept = Object.assign(Object.assign({}, data), { body_content_structured: data.body_content_structured });
    // Ensure the object meets the BriefConcept interface
    return concept;
}
export async function createBriefConcept(concept) {
    // If there's a brief_batch_id, fetch the associated brand to get default instructions
    let defaultVideoInstructions = '';
    let defaultDesignerInstructions = '';
    if (concept.brief_batch_id) {
        try {
            // First, get the batch to find the brand_id
            const { data: batchData } = await supabase
                .from('brief_batches')
                .select('brand_id')
                .eq('id', concept.brief_batch_id)
                .single();
            if (batchData === null || batchData === void 0 ? void 0 : batchData.brand_id) {
                // Then get the brand to find the default instructions
                const { data: brandData } = await supabase
                    .from('brands')
                    .select('*')
                    .eq('id', batchData.brand_id)
                    .single();
                if (brandData) {
                    // Type cast to access properties that might not be in the type
                    const brandWithDefaults = brandData;
                    defaultVideoInstructions = brandWithDefaults.default_video_instructions || '';
                    defaultDesignerInstructions = brandWithDefaults.default_designer_instructions || '';
                }
            }
        }
        catch (err) {
            console.error('Error fetching brand defaults for concept:', err);
            // Continue with empty defaults if there's an error
        }
    }
    // Create the concept with defaults
    const dbConcept = Object.assign(Object.assign({}, concept), { id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), concept_title: concept.concept_title || 'New Concept', body_content_structured: concept.body_content_structured || [], order_in_batch: concept.order_in_batch || 0, 
        // Set video and designer instructions from brand defaults if not provided
        videoInstructions: concept.videoInstructions || defaultVideoInstructions, designerInstructions: concept.designerInstructions || defaultDesignerInstructions });
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
    const createdConcept = Object.assign(Object.assign({}, data), { body_content_structured: data.body_content_structured });
    // Ensure the object meets the BriefConcept interface
    return createdConcept;
}
export async function updateBriefConcept(concept) {
    // Use type casting to avoid issues with potentially missing fields
    const dbConcept = Object.assign(Object.assign({}, concept), { updated_at: new Date().toISOString() });
    // Log what we're updating, specifically the instructions fields
    console.log('Updating concept: ', concept.id);
    console.log('videoInstructions:', concept.videoInstructions);
    console.log('designerInstructions:', concept.designerInstructions);
    const { data, error } = await supabase
        .from('brief_concepts')
        .update(dbConcept)
        .eq('id', concept.id)
        .select()
        .single();
    if (error) {
        console.error('Error updating concept:', error);
        throw error;
    }
    // Transform from DB format to app format with type casting
    const updatedConcept = Object.assign(Object.assign({}, data), { body_content_structured: data.body_content_structured });
    // Ensure the object meets the BriefConcept interface
    return updatedConcept;
}
export async function deleteBriefConcept(conceptId) {
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
export async function uploadMedia(file, userId) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${uuidv4()}.${fileExt}`;
    const { error } = await supabase.storage
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
export async function shareBriefBatch(batchId, shareType, shareSettings) {
    const supabase = createSPAClient();
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
        [shareId]: Object.assign(Object.assign({}, shareSettings), { created_at: new Date().toISOString(), share_type: shareType })
    };
    
    // Update the brief batch with the merged share settings
    const { error } = await supabase
        .from('brief_batches')
        .update({
            share_settings: updatedShareSettings
        })
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
        }
        catch (emailError) {
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
export async function shareBriefConcept(conceptId, shareType, shareSettings) {
    const supabase = createSPAClient();
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
        [shareId]: Object.assign(Object.assign({}, shareSettings), { created_at: new Date().toISOString(), share_type: shareType })
    };
    
    // Update the brief concept with the merged share settings
    const { error } = await supabase
        .from('brief_concepts')
        .update({
            share_settings: updatedShareSettings
        })
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
        }
        catch (emailError) {
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
export async function getPendingReviewsCount(userId) {
    const supabase = createSPAClient();
    
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
