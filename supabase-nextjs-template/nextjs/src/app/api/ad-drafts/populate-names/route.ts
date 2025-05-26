import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { Database } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';

const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';

export async function POST(req: NextRequest) {
  const supabase: SupabaseClient<Database> = await createSSRClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const { brandId }: { brandId: string } = await req.json();
    
    if (!brandId) {
      return NextResponse.json({ message: 'Brand ID is required.' }, { status: 400 });
    }

    // Get brand data for Meta API access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brandData, error: brandError } = await (supabase as any)
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag')
      .eq('id', brandId)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json({ message: 'Brand not found or error fetching brand details.' }, { status: 404 });
    }

    if (!brandData.meta_access_token || !brandData.meta_access_token_iv || !brandData.meta_access_token_auth_tag) {
      return NextResponse.json({ message: 'Meta access token not configured for this brand.' }, { status: 400 });
    }

    const accessToken = await decryptToken({
      encryptedToken: brandData.meta_access_token,
      iv: brandData.meta_access_token_iv,
      authTag: brandData.meta_access_token_auth_tag
    });

    if (!accessToken) {
      return NextResponse.json({ message: 'Failed to decrypt access token.' }, { status: 500 });
    }

    // Get ad drafts that are missing campaign or ad set names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: drafts, error: draftsError } = await (supabase as any)
      .from('ad_drafts')
      .select('id, campaign_id, campaign_name, ad_set_id, ad_set_name')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .or('campaign_name.is.null,ad_set_name.is.null');

    if (draftsError) {
      console.error('Error fetching drafts:', draftsError);
      return NextResponse.json({ message: 'Failed to fetch ad drafts.' }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ message: 'No drafts found that need name population.', updated: 0 }, { status: 200 });
    }

    let updatedCount = 0;
    const campaignCache = new Map<string, string>();
    const adSetCache = new Map<string, string>();

    for (const draft of drafts) {
      let campaignName = draft.campaign_name;
      let adSetName = draft.ad_set_name;
      let needsUpdate = false;

      // Fetch campaign name if missing
      if (draft.campaign_id && !campaignName) {
        if (campaignCache.has(draft.campaign_id)) {
          campaignName = campaignCache.get(draft.campaign_id)!;
        } else {
          try {
            const campaignResponse = await fetch(
              `https://graph.facebook.com/${META_API_VERSION}/${draft.campaign_id}?fields=name&access_token=${encodeURIComponent(accessToken)}`
            );
            if (campaignResponse.ok) {
              const campaignData = await campaignResponse.json();
              campaignName = campaignData.name;
              campaignCache.set(draft.campaign_id, campaignName);
            }
          } catch (error) {
            console.error(`Failed to fetch campaign name for ${draft.campaign_id}:`, error);
          }
        }
        if (campaignName) needsUpdate = true;
      }

      // Fetch ad set name if missing
      if (draft.ad_set_id && !adSetName) {
        if (adSetCache.has(draft.ad_set_id)) {
          adSetName = adSetCache.get(draft.ad_set_id)!;
        } else {
          try {
            const adSetResponse = await fetch(
              `https://graph.facebook.com/${META_API_VERSION}/${draft.ad_set_id}?fields=name&access_token=${encodeURIComponent(accessToken)}`
            );
            if (adSetResponse.ok) {
              const adSetData = await adSetResponse.json();
              adSetName = adSetData.name;
              adSetCache.set(draft.ad_set_id, adSetName);
            }
          } catch (error) {
            console.error(`Failed to fetch ad set name for ${draft.ad_set_id}:`, error);
          }
        }
        if (adSetName) needsUpdate = true;
      }

      // Update the draft if we found missing names
      if (needsUpdate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};
        if (campaignName && !draft.campaign_name) updateData.campaign_name = campaignName;
        if (adSetName && !draft.ad_set_name) updateData.ad_set_name = adSetName;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('ad_drafts')
          .update(updateData)
          .eq('id', draft.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`Failed to update draft ${draft.id}:`, updateError);
        }
      }
    }

    return NextResponse.json({ 
      message: `Successfully populated names for ${updatedCount} ad drafts.`, 
      updated: updatedCount,
      total: drafts.length
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error populating names:', errorMessage);
    return NextResponse.json({ message: 'Failed to populate names.', error: errorMessage }, { status: 500 });
  }
} 