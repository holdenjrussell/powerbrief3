import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: string;
  account_id: string;
  business_name?: string;
  currency: string;
  timezone_name: string;
}

interface MetaPage {
  id: string;
  name: string;
  category: string;
  tasks: string[];
  access_token: string;
  instagram_business_account?: {
    id: string;
    name: string;
    username: string;
  };
}

interface MetaPixel {
  id: string;
  name: string;
}

interface MetaInstagramAccount {
  id: string;
  name: string;
  username: string;
}

interface SaveAssetsRequest {
  brandId: string;
  // Multiple accounts/pages arrays
  adAccounts?: MetaAdAccount[];
  facebookPages?: MetaPage[];
  instagramAccounts?: MetaInstagramAccount[];
  pixels?: MetaPixel[];
  // Default selections
  defaultAdAccountId?: string | null;
  defaultFacebookPageId?: string | null;
  defaultInstagramAccountId?: string | null;
  defaultPixelId?: string | null;
  // Manual entries (for backward compatibility and manual input)
  manualFacebookPageId?: string | null;
  manualInstagramAccountId?: string | null;
  // Manual entry labels
  manualPageLabels?: Record<string, string>;
  manualInstagramLabels?: Record<string, string>;
  // Manual Instagram pairings (pageId -> instagramId)
  manualInstagramPairings?: Record<string, string>;
  // Use Page As Actor settings
  usePageAsActor?: boolean;
  pageBackedInstagramAccounts?: Record<string, string>;
}

interface BrandMetaUpdateData {
  updated_at: string;
  // New multiple accounts structure
  meta_ad_accounts?: MetaAdAccount[];
  meta_facebook_pages?: MetaPage[];
  meta_instagram_accounts?: MetaInstagramAccount[];
  meta_pixels?: MetaPixel[];
  // Default selections
  meta_default_ad_account_id?: string | null;
  meta_default_facebook_page_id?: string | null;
  meta_default_instagram_account_id?: string | null;
  meta_default_pixel_id?: string | null;
  // Manual entry labels
  meta_manual_page_labels?: Record<string, string>;
  meta_manual_instagram_labels?: Record<string, string>;
  // Manual Instagram pairings
  meta_manual_instagram_pairings?: Record<string, string>;
  // Use Page As Actor settings
  meta_use_page_as_actor?: boolean;
  meta_page_backed_instagram_accounts?: Record<string, string>;
  // Keep legacy fields for backward compatibility
  meta_ad_account_id?: string | null;
  meta_facebook_page_id?: string | null;
  meta_instagram_actor_id?: string | null; 
  meta_pixel_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveAssetsRequest = await request.json();
    const { 
      brandId, 
      adAccounts = [], 
      facebookPages = [], 
      instagramAccounts = [], 
      pixels = [],
      defaultAdAccountId,
      defaultFacebookPageId,
      defaultInstagramAccountId,
      defaultPixelId,
      manualFacebookPageId,
      manualInstagramAccountId,
      manualPageLabels,
      manualInstagramLabels,
      manualInstagramPairings,
      usePageAsActor,
      pageBackedInstagramAccounts
    } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching brand for update:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand' }, 
        { status: 500 }
      );
    }

    if (!brand && !fetchError) {
        console.log('Brand not found during save assets attempt:', brandId);
        return NextResponse.json(
            { error: 'Brand not found' },
            { status: 404 }
        );
    }

    // Handle manual entries by adding them to the arrays if they don't exist
    const processedFacebookPages = [...facebookPages];
    const processedInstagramAccounts = [...instagramAccounts];

    // Add manual Facebook page if provided and not already in the list
    if (manualFacebookPageId && !processedFacebookPages.find(p => p.id === manualFacebookPageId)) {
      processedFacebookPages.push({
        id: manualFacebookPageId,
        name: 'Manually Added Page',
        category: 'Manual Entry',
        tasks: [],
        access_token: ''
      });
    }

    // Add manual Instagram account if provided and not already in the list
    if (manualInstagramAccountId && !processedInstagramAccounts.find(a => a.id === manualInstagramAccountId)) {
      processedInstagramAccounts.push({
        id: manualInstagramAccountId,
        name: 'Manually Added Account',
        username: 'manual_entry'
      });
    }

    // Determine effective default IDs (prioritize manual entries for backward compatibility)
    const effectiveDefaultFacebookPageId = manualFacebookPageId || defaultFacebookPageId;
    const effectiveDefaultInstagramAccountId = manualInstagramAccountId || defaultInstagramAccountId;

    const updateData: BrandMetaUpdateData = {
      updated_at: new Date().toISOString(),
      // Store multiple accounts/pages
      meta_ad_accounts: adAccounts,
      meta_facebook_pages: processedFacebookPages,
      meta_instagram_accounts: processedInstagramAccounts,
      meta_pixels: pixels,
      // Store default selections
      meta_default_ad_account_id: defaultAdAccountId,
      meta_default_facebook_page_id: effectiveDefaultFacebookPageId,
      meta_default_instagram_account_id: effectiveDefaultInstagramAccountId,
      meta_default_pixel_id: defaultPixelId,
      // Update legacy fields for backward compatibility
      meta_ad_account_id: defaultAdAccountId,
      meta_facebook_page_id: effectiveDefaultFacebookPageId,
      meta_instagram_actor_id: effectiveDefaultInstagramAccountId,
      meta_pixel_id: defaultPixelId,
      // Manual entry labels
      meta_manual_page_labels: manualPageLabels,
      meta_manual_instagram_labels: manualInstagramLabels,
      // Manual Instagram pairings
      meta_manual_instagram_pairings: manualInstagramPairings,
      // Use Page As Actor settings
      meta_use_page_as_actor: usePageAsActor,
      meta_page_backed_instagram_accounts: pageBackedInstagramAccounts,
    };
    
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError || !updatedBrand) {
      console.error('Error updating brand with Meta assets:', updateError);
      return NextResponse.json(
        { error: 'Failed to update brand with Meta assets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meta assets saved successfully',
      brand: updatedBrand,
      summary: {
        adAccounts: adAccounts.length,
        facebookPages: processedFacebookPages.length,
        instagramAccounts: processedInstagramAccounts.length,
        pixels: pixels.length,
        defaults: {
          adAccount: defaultAdAccountId,
          facebookPage: effectiveDefaultFacebookPageId,
          instagramAccount: effectiveDefaultInstagramAccountId,
          pixel: defaultPixelId
        }
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving Meta assets:', errorMessage, error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
} 