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
  const { user, loading: userLoading } = useGlobal();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    console.time('BrandContext:fetchBrands');

    try {
      setIsLoading(true);
      setError(null);
      
      // Start both API calls in parallel for better performance
      const [ownedBrandsPromise, sharedBrandsPromise] = [
        getBrands(user.id),
        getSharedBrands().catch(error => {
          console.warn('Failed to fetch shared brands:', error);
          return []; // Return empty array on failure instead of throwing
        })
      ];

      // Wait for owned brands (critical path)
      const ownedBrands = await ownedBrandsPromise;
      console.log(`Fetched ${ownedBrands.length} owned brands`);

      // Set owned brands immediately for faster UI response
      setBrands(ownedBrands);
      
      // Restore previously selected brand early if possible
      const savedBrandId = user?.id ? localStorage.getItem(`selected-brand-${user.id}`) : null;
      if (savedBrandId && ownedBrands.length > 0) {
        const savedBrand = ownedBrands.find(b => b.id === savedBrandId);
        if (savedBrand) {
          setSelectedBrand(savedBrand);
        } else if (ownedBrands.length > 0) {
          setSelectedBrand(ownedBrands[0]);
        }
      } else if (ownedBrands.length > 0) {
        setSelectedBrand(ownedBrands[0]);
      }

      // Handle shared brands in background
      const sharedBrands = await sharedBrandsPromise;
      
      if (sharedBrands.length > 0) {
        console.log(`Processing ${sharedBrands.length} shared brands`);
        
        // Fetch full brand data for shared brands in parallel
        const sharedBrandPromises = sharedBrands
          .filter(sharedBrand => sharedBrand.brand?.id)
          .map(async (sharedBrand) => {
            try {
              const fullBrand = await getBrandById(sharedBrand.brand!.id);
              if (fullBrand) {
                return {
                  ...fullBrand,
                  isShared: true,
                  shareRole: sharedBrand.role,
                  sharedBy: sharedBrand.shared_by_user
                } as Brand & { isShared: boolean; shareRole: string; sharedBy?: { email: string; full_name?: string } };
              }
              return null;
            } catch (error) {
              console.warn(`Failed to fetch shared brand ${sharedBrand.brand!.id}:`, error);
              return null;
            }
          });
        
        const sharedBrandsList = (await Promise.all(sharedBrandPromises))
          .filter((brand): brand is NonNullable<typeof brand> => brand !== null);
      
        // Combine and update brands
      const allBrands = [...ownedBrands, ...sharedBrandsList];
      setBrands(allBrands);
      
        // Re-check selected brand with full list
        if (savedBrandId && !selectedBrand) {
        const savedBrand = allBrands.find(b => b.id === savedBrandId);
          if (savedBrand) {
            setSelectedBrand(savedBrand);
          }
        }
        
        console.log(`Total brands loaded: ${allBrands.length} (${ownedBrands.length} owned + ${sharedBrandsList.length} shared)`);
      }
      
    } catch (err) {
      console.error('Failed to fetch brands:', err);
      setError('Failed to load brands');
    } finally {
      setIsLoading(false);
      console.timeEnd('BrandContext:fetchBrands');
    }
  };

  // Only start fetching when user is ready and not loading
  useEffect(() => {
    if (!userLoading && user?.id) {
      // Add a small delay to prevent race conditions with auth
      const timer = setTimeout(() => {
        fetchBrands();
      }, 100);
      
      return () => clearTimeout(timer);
    } else if (!userLoading && !user?.id) {
      // User is not authenticated, stop loading
      setIsLoading(false);
    }
  }, [user?.id, userLoading]);

  // Optimized localStorage operation with debouncing
  useEffect(() => {
    if (selectedBrand?.id && user?.id) {
      // Use requestIdleCallback for non-critical localStorage write
      const saveToStorage = () => {
        try {
      localStorage.setItem(`selected-brand-${user.id}`, selectedBrand.id);
        } catch (error) {
          console.warn('Failed to save selected brand to localStorage:', error);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(saveToStorage);
      } else {
        setTimeout(saveToStorage, 0);
      }
    }
  }, [selectedBrand?.id, user?.id]);

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