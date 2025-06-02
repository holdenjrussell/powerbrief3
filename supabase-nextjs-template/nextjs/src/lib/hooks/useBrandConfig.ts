import { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBrands } from '@/lib/services/powerbriefService'; // Import the service directly

export interface BrandConfig {
  metaAccessToken: string | null;
  metaAdAccountId: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  brandId: string | null;
  brandName: string | null;
}

export const useBrandConfig = (preferredBrandId?: string): BrandConfig => {
  const { user } = useGlobal();
  const [config, setConfig] = useState<BrandConfig>({
    metaAccessToken: null,
    metaAdAccountId: null,
    isConfigured: false,
    isLoading: true,
    error: null,
    brandId: null,
    brandName: null,
  });

  useEffect(() => {
    const fetchBrandConfig = async () => {
      if (!user?.id) {
        setConfig(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'User not authenticated' 
        }));
        return;
      }

      try {
        setConfig(prev => ({ ...prev, isLoading: true, error: null }));

        // Get the list of brands for this user using the service directly
        const brands = await getBrands(user.id);

        if (brands.length === 0) {
          setConfig(prev => ({
            ...prev,
            isLoading: false,
            error: 'No brands found. Please create a brand first.',
          }));
          return;
        }

        // Determine which brand to use
        let selectedBrand = brands[0]; // Default to first brand
        
        if (preferredBrandId) {
          const preferredBrand = brands.find((b) => b.id === preferredBrandId);
          if (preferredBrand) {
            selectedBrand = preferredBrand;
          }
        }

        // Get the brand's Meta configuration
        const brandConfigResponse = await fetch(`/api/meta/brand-config?brandId=${selectedBrand.id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!brandConfigResponse.ok) {
          throw new Error('Failed to fetch brand Meta configuration');
        }

        const brandConfigData = await brandConfigResponse.json();
        
        // Determine the Ad Account ID to use
        let adAccountId = null;
        
        // Priority order: defaultAdAccountId > legacyAdAccountId > first available ad account
        if (brandConfigData.config?.defaultAdAccountId) {
          adAccountId = brandConfigData.config.defaultAdAccountId;
        } else if (brandConfigData.config?.legacyAdAccountId) {
          adAccountId = brandConfigData.config.legacyAdAccountId;
        } else if (brandConfigData.config?.adAccounts && brandConfigData.config.adAccounts.length > 0) {
          adAccountId = brandConfigData.config.adAccounts[0].id;
        }

        // Ensure Ad Account ID has the 'act_' prefix
        if (adAccountId && !adAccountId.startsWith('act_')) {
          adAccountId = `act_${adAccountId}`;
        }

        // Test if we can get a decrypted access token by trying to fetch ad accounts
        let hasValidToken = false;
        try {
          const adAccountsResponse = await fetch(`/api/meta/ad-accounts?brandId=${selectedBrand.id}`, {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
          
          if (adAccountsResponse.ok) {
            hasValidToken = true;
          }
        } catch (error) {
          console.warn('Failed to verify Meta token:', error);
        }

        const isConfigured = hasValidToken && !!adAccountId;

        setConfig({
          metaAccessToken: hasValidToken ? 'ENCRYPTED_TOKEN_AVAILABLE' : null, // We don't expose the actual token
          metaAdAccountId: adAccountId,
          isConfigured,
          isLoading: false,
          error: !isConfigured ? 'Brand not connected to Meta or missing Ad Account configuration' : null,
          brandId: selectedBrand.id,
          brandName: selectedBrand.name,
        });

      } catch (error) {
        console.error('Error fetching brand config:', error);
        setConfig(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch brand configuration',
        }));
      }
    };

    fetchBrandConfig();
  }, [user?.id, preferredBrandId]);

  return config;
};

// Hook specifically for scorecard that provides the interface expected by the scorecard page
export const useScorecardBrandConfig = (preferredBrandId?: string) => {
  const brandConfig = useBrandConfig(preferredBrandId);
  
  return {
    metaAccessToken: brandConfig.metaAccessToken,
    metaAdAccountId: brandConfig.metaAdAccountId,
    isConfigured: brandConfig.isConfigured && !brandConfig.isLoading && !brandConfig.error,
    isLoading: brandConfig.isLoading,
    error: brandConfig.error,
    brandId: brandConfig.brandId,
    brandName: brandConfig.brandName,
  };
}; 