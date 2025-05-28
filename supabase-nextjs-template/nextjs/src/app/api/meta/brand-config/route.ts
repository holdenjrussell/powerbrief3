import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface BrandMetaConfig {
  id: string;
  name: string;
  meta_ad_accounts?: any[];
  meta_facebook_pages?: any[];
  meta_instagram_accounts?: any[];
  meta_pixels?: any[];
  meta_default_ad_account_id?: string;
  meta_default_facebook_page_id?: string;
  meta_default_instagram_account_id?: string;
  meta_default_pixel_id?: string;
  meta_manual_page_labels?: Record<string, string>;
  meta_manual_instagram_labels?: Record<string, string>;
  meta_manual_instagram_pairings?: Record<string, string>;
  meta_use_page_as_actor?: boolean;
  meta_page_backed_instagram_accounts?: Record<string, string>;
  meta_ad_account_id?: string;
  meta_facebook_page_id?: string;
  meta_instagram_actor_id?: string;
  meta_pixel_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        meta_ad_accounts,
        meta_facebook_pages,
        meta_instagram_accounts,
        meta_pixels,
        meta_default_ad_account_id,
        meta_default_facebook_page_id,
        meta_default_instagram_account_id,
        meta_default_pixel_id,
        meta_manual_page_labels,
        meta_manual_instagram_labels,
        meta_manual_instagram_pairings,
        meta_use_page_as_actor,
        meta_page_backed_instagram_accounts,
        meta_ad_account_id,
        meta_facebook_page_id,
        meta_instagram_actor_id,
        meta_pixel_id
      `)
      .eq('id', brandId)
      .maybeSingle() as { data: BrandMetaConfig | null, error: any };

    if (fetchError) {
      console.error('Error fetching brand Meta config:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand Meta configuration' },
        { status: 500 }
      );
    }

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        // Multiple accounts/pages arrays
        adAccounts: brand.meta_ad_accounts || [],
        facebookPages: brand.meta_facebook_pages || [],
        instagramAccounts: brand.meta_instagram_accounts || [],
        pixels: brand.meta_pixels || [],
        // Default selections
        defaultAdAccountId: brand.meta_default_ad_account_id,
        defaultFacebookPageId: brand.meta_default_facebook_page_id,
        defaultInstagramAccountId: brand.meta_default_instagram_account_id,
        defaultPixelId: brand.meta_default_pixel_id,
        // Manual entry labels and pairings
        manualPageLabels: brand.meta_manual_page_labels || {},
        manualInstagramLabels: brand.meta_manual_instagram_labels || {},
        manualInstagramPairings: brand.meta_manual_instagram_pairings || {},
        // Legacy fields for backward compatibility
        legacyAdAccountId: brand.meta_ad_account_id,
        legacyFacebookPageId: brand.meta_facebook_page_id,
        legacyInstagramAccountId: brand.meta_instagram_actor_id,
        legacyPixelId: brand.meta_pixel_id,
        // New fields
        usePageAsActor: brand.meta_use_page_as_actor,
        pageBackedInstagramAccounts: brand.meta_page_backed_instagram_accounts || {},
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching brand Meta config:', errorMessage, error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
} 