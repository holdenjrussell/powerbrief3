import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId');
    const userId = url.searchParams.get('userId');

    if (!brandId || !userId) {
      return NextResponse.json({ message: 'Brand ID and User ID are required.' }, { status: 400 });
    }

    // Get the user's active ad batch settings for the specified brand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adBatch, error: batchError } = await (supabaseAdmin as any)
      .from('ad_batches')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('last_accessed_at', { ascending: false })
      .limit(1)
      .single();

    if (batchError && batchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching ad batch settings:', batchError);
      return NextResponse.json({ message: 'Failed to fetch ad upload settings.' }, { status: 500 });
    }

    // If no settings found, return default settings
    if (!adBatch) {
      return NextResponse.json({
        settings: {
          brandId: brandId,
          adAccountId: null,
          campaignId: null,
          adSetId: null,
          fbPage: '',
          igAccount: '',
          urlParams: '',
          pixel: '',
          status: 'PAUSED',
          primaryText: 'Check out our latest offer!',
          headline: 'Amazing New Product',
          description: '',
          destinationUrl: 'https://example.com',
          callToAction: 'LEARN_MORE',
          siteLinks: [],
          advantageCreative: {
            inline_comment: false,
            image_templates: false,
            image_touchups: false,
            video_auto_crop: false,
            image_brightness_and_contrast: false,
            enhance_cta: false,
            text_optimizations: false,
            image_uncrop: false,
            adapt_to_placement: false,
            media_type_automation: false,
            product_extensions: false,
            description_automation: false,
            add_text_overlay: false,
            site_extensions: false,
            music: false,
            '3d_animation': false,
            translate_text: false
          }
        }
      }, { status: 200 });
    }

    // Map ad_batches fields to the expected DefaultValues format
    const settings = {
      brandId: adBatch.brand_id,
      adAccountId: adBatch.ad_account_id,
      campaignId: adBatch.campaign_id,
      adSetId: adBatch.ad_set_id,
      fbPage: adBatch.fb_page_id || '',
      igAccount: adBatch.ig_account_id || '',
      urlParams: adBatch.url_params || '',
      pixel: adBatch.pixel_id || '',
      status: adBatch.status || 'PAUSED',
      primaryText: adBatch.primary_text || 'Check out our latest offer!',
      headline: adBatch.headline || 'Amazing New Product',
      description: adBatch.description || '',
      destinationUrl: adBatch.destination_url || 'https://example.com',
      callToAction: adBatch.call_to_action || 'LEARN_MORE',
      siteLinks: adBatch.site_links || [],
      advantageCreative: adBatch.advantage_plus_creative || {
        inline_comment: false,
        image_templates: false,
        image_touchups: false,
        video_auto_crop: false,
        image_brightness_and_contrast: false,
        enhance_cta: false,
        text_optimizations: false,
        image_uncrop: false,
        adapt_to_placement: false,
        media_type_automation: false,
        product_extensions: false,
        description_automation: false,
        add_text_overlay: false,
        site_extensions: false,
        music: false,
        '3d_animation': false,
        translate_text: false
      }
    };

    return NextResponse.json({ settings }, { status: 200 });

  } catch (error) {
    console.error('Error in ad-upload-settings API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 