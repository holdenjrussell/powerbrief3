"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Brand } from '@/lib/types/powerbrief';
import { getBrands, getBrandById } from '@/lib/services/powerbriefService';
import { getSharedBrands } from '@/lib/services/brandSharingService';
import { useGlobal } from './GlobalContext';

interface Team {
  id: string;
  brand_id: string;
  name: string;
  is_default: boolean;
  member_count?: number;
}

interface BrandContextType {
  brands: Brand[];
  selectedBrand: Brand | null;
  setSelectedBrand: (brand: Brand | null) => void;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  teamFeatures: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useGlobal();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamFeatures, setTeamFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamFeatures = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/features`);
      if (response.ok) {
        const data = await response.json();
        // Convert the features object to a simple key-value boolean map
        const featuresMap: Record<string, boolean> = {};
        Object.entries(data.features || {}).forEach(([key, feature]: [string, any]) => {
          featuresMap[key] = feature.has_access || false;
        });
        setTeamFeatures(featuresMap);
      } else {
        console.error('Failed to fetch team features');
        setTeamFeatures({});
      }
    } catch (error) {
      console.error('Error fetching team features:', error);
      setTeamFeatures({});
    }
  };

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

  // Save selected team to localStorage
  useEffect(() => {
    if (selectedTeam?.id && selectedBrand?.id && user?.id) {
      const saveToStorage = () => {
        try {
          localStorage.setItem(`selected-team-${user.id}-${selectedBrand.id}`, selectedTeam.id);
        } catch (error) {
          console.warn('Failed to save selected team to localStorage:', error);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(saveToStorage);
      } else {
        setTimeout(saveToStorage, 0);
      }
    }
  }, [selectedTeam?.id, selectedBrand?.id, user?.id]);

  // Load saved team when brand changes
  useEffect(() => {
    if (!selectedBrand?.id || !user?.id) {
      setSelectedTeam(null);
      setTeamFeatures({});
      return;
    }

    // Load saved team from localStorage
    const savedTeamId = localStorage.getItem(`selected-team-${user.id}-${selectedBrand.id}`);
    if (savedTeamId) {
      // We'll need to wait for the TeamSelector to fetch and set the team
      // For now, just clear the team and let TeamSelector handle restoration
      setSelectedTeam(null);
    } else {
      setSelectedTeam(null);
    }
    setTeamFeatures({});
  }, [selectedBrand?.id, user?.id]);

  // Fetch team features when team changes
  useEffect(() => {
    if (selectedTeam?.id) {
      fetchTeamFeatures(selectedTeam.id);
    } else {
      setTeamFeatures({});
    }
  }, [selectedTeam?.id]);

  return (
    <BrandContext.Provider value={{ 
      brands, 
      selectedBrand, 
      setSelectedBrand, 
      selectedTeam,
      setSelectedTeam,
      teamFeatures,
      isLoading, 
      error, 
      refreshBrands: fetchBrands 
    }}>
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