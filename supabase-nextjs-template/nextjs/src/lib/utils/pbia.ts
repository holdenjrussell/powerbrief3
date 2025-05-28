import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Utility functions for Page-Backed Instagram Account (PBIA) management
 * Used for "Use Page As Actor" functionality
 */

interface PBIAResult {
  success: boolean;
  instagramUserId?: string;
  error?: string;
}

/**
 * Resolves Instagram User ID for ad creation
 * Handles both regular Instagram accounts and Page-Backed Instagram Accounts
 */
export async function resolveInstagramUserId(
  igAccount: string,
  fbPageId: string,
  accessToken: string,
  existingPBIAs: Record<string, string> = {}
): Promise<PBIAResult> {
  try {
    // If it's a regular Instagram account ID, return it directly
    if (!igAccount.startsWith('PBIA:')) {
      return {
        success: true,
        instagramUserId: igAccount
      };
    }

    // Extract page ID from PBIA format
    const pageId = igAccount.replace('PBIA:', '');
    
    // Check if we already have a PBIA for this page
    if (existingPBIAs[pageId]) {
      return {
        success: true,
        instagramUserId: existingPBIAs[pageId]
      };
    }

    // Check for existing PBIAs via Meta API
    const checkResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/page_backed_instagram_accounts?access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.data && checkData.data.length > 0) {
        const existingPBIA = checkData.data[0];
        return {
          success: true,
          instagramUserId: existingPBIA.id
        };
      }
    }

    // Create new PBIA
    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/page_backed_instagram_accounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('Meta API error creating PBIA:', errorData);
      return {
        success: false,
        error: `Failed to create Page-Backed Instagram Account: ${errorData.error?.message || 'Unknown error'}`
      };
    }

    const createData = await createResponse.json();
    return {
      success: true,
      instagramUserId: createData.id
    };

  } catch (error) {
    console.error('Error resolving Instagram User ID:', error);
    return {
      success: false,
      error: 'Failed to resolve Instagram User ID'
    };
  }
}

/**
 * Updates the brand's PBIA mappings in the database
 */
export async function updatePBIAMappings(
  supabase: SupabaseClient,
  brandId: string,
  pageId: string,
  pbiaId: string,
  existingPBIAs: Record<string, string> = {}
): Promise<boolean> {
  try {
    const updatedPBIAs = { ...existingPBIAs, [pageId]: pbiaId };
    const { error } = await supabase
      .from('brands')
      .update({ meta_page_backed_instagram_accounts: updatedPBIAs })
      .eq('id', brandId);

    if (error) {
      console.error('Error updating PBIA mappings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating PBIA mappings:', error);
    return false;
  }
}

/**
 * Checks if an Instagram account ID represents a PBIA
 */
export function isPBIA(igAccount: string): boolean {
  return igAccount.startsWith('PBIA:');
}

/**
 * Extracts page ID from PBIA format
 */
export function extractPageIdFromPBIA(igAccount: string): string | null {
  if (!isPBIA(igAccount)) {
    return null;
  }
  return igAccount.replace('PBIA:', '');
} 