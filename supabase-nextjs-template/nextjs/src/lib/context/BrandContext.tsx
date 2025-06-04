"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Brand } from '@/lib/types/powerbrief';
import { getBrands, getBrandById } from '@/lib/services/powerbriefService';
import { getSharedBrands } from '@/lib/services/brandSharingService';
import { useGlobal } from './GlobalContext';

interface BrandContextType {
  brands: Brand[];
  selectedBrand: Brand | null;
  setSelectedBrand: (brand: Brand | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useGlobal();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch owned brands first
      const ownedBrands = await getBrands(user.id);
      
      // Try to fetch shared brands, but don't fail if it doesn't work
      let sharedBrandsList: (Brand & { isShared: boolean; shareRole: string; sharedBy?: { email: string; full_name?: string } })[] = [];
      try {
        const sharedBrands = await getSharedBrands();
        
        // Fetch full brand data for shared brands
        const sharedBrandPromises = sharedBrands
          .filter(sharedBrand => sharedBrand.brand?.id)
          .map(async (sharedBrand) => {
            try {
              const fullBrand = await getBrandById(sharedBrand.brand!.id);
              if (fullBrand) {
                return {
                  ...fullBrand,
                  // Add indicators that this is a shared brand
                  isShared: true,
                  shareRole: sharedBrand.role,
                  sharedBy: sharedBrand.shared_by_user
                } as Brand & { isShared: boolean; shareRole: string; sharedBy?: { email: string; full_name?: string } };
              }
              return null;
            } catch (error) {
              console.error(`Failed to fetch shared brand ${sharedBrand.brand!.id}:`, error);
              return null;
            }
          });
        
        sharedBrandsList = (await Promise.all(sharedBrandPromises))
          .filter((brand): brand is NonNullable<typeof brand> => brand !== null);
      } catch (sharedBrandsError) {
        console.error('Failed to fetch shared brands, continuing with owned brands only:', sharedBrandsError);
        // Continue with just owned brands
      }
      
      // Combine owned and shared brands
      const allBrands = [...ownedBrands, ...sharedBrandsList];
      setBrands(allBrands);
      
      // Try to restore previously selected brand from localStorage
      const savedBrandId = localStorage.getItem(`selected-brand-${user.id}`);
      if (savedBrandId && allBrands.length > 0) {
        const savedBrand = allBrands.find(b => b.id === savedBrandId);
        setSelectedBrand(savedBrand || allBrands[0]);
      } else if (allBrands.length > 0) {
        setSelectedBrand(allBrands[0]);
      } else {
        setSelectedBrand(null);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
      setError('Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [user?.id]);

  // Save selected brand to localStorage when it changes
  useEffect(() => {
    if (selectedBrand && user?.id) {
      localStorage.setItem(`selected-brand-${user.id}`, selectedBrand.id);
    }
  }, [selectedBrand, user?.id]);

  return (
    <BrandContext.Provider value={{ brands, selectedBrand, setSelectedBrand, isLoading, error, refreshBrands: fetchBrands }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
} 