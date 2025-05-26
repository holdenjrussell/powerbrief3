require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDrafts() {
  const brandId = '1a2b68a6-7848-404b-bd99-1e4f68dfb1b0';
  const batchId = '5607a686-925a-4370-bbe7-e5dbbc2ee3d2';
  
  console.log('🔍 Checking ad drafts for:');
  console.log('Brand ID:', brandId);
  console.log('Batch ID:', batchId);
  console.log('');
  
  // Check all drafts for this brand
  const { data: allDrafts, error: allError } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('brand_id', brandId);
    
  console.log('📦 All drafts for brand:', allDrafts?.length || 0);
  if (allError) {
    console.error('Error fetching all drafts:', allError);
    return;
  }
  
  // Check drafts for specific batch
  const { data: batchDrafts, error: batchError } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('brand_id', brandId)
    .eq('ad_batch_id', batchId);
    
  console.log('🎯 Drafts for specific batch:', batchDrafts?.length || 0);
  if (batchError) {
    console.error('Error fetching batch drafts:', batchError);
    return;
  }
  
  // Show details of all drafts
  if (allDrafts && allDrafts.length > 0) {
    console.log('');
    console.log('📋 All drafts details:');
    allDrafts.forEach((draft, i) => {
      console.log(`Draft ${i + 1}:`, {
        id: draft.id,
        ad_name: draft.ad_name,
        ad_batch_id: draft.ad_batch_id || 'NULL',
        brand_id: draft.brand_id,
        app_status: draft.app_status
      });
    });
  }
  
  // Check if the batch exists
  const { data: batch, error: batchCheckError } = await supabase
    .from('ad_batches')
    .select('*')
    .eq('id', batchId);
    
  console.log('');
  console.log('🗂️ Batch exists:', batch?.length > 0);
  if (batch && batch.length > 0) {
    console.log('Batch details:', {
      id: batch[0].id,
      name: batch[0].name,
      brand_id: batch[0].brand_id,
      is_active: batch[0].is_active
    });
  }
  if (batchCheckError) {
    console.error('Error checking batch:', batchCheckError);
  }
  
  // Also check what the API endpoint would return
  console.log('');
  console.log('🌐 Testing API endpoint logic:');
  const params = new URLSearchParams({
    brandId: brandId,
    adBatchId: batchId
  });
  console.log('API URL would be:', `/api/ad-drafts?${params}`);
}

checkDrafts().catch(console.error); 