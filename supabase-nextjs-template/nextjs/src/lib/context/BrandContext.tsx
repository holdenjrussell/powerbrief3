"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Brand } from '@/lib/types/powerbrief';
import { getBrands } from '@/lib/services/powerbriefService';
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
      const fetchedBrands = await getBrands(user.id);
      setBrands(fetchedBrands);
      
      // Try to restore previously selected brand from localStorage
      const savedBrandId = localStorage.getItem(`selected-brand-${user.id}`);
      if (savedBrandId && fetchedBrands.length > 0) {
        const savedBrand = fetchedBrands.find(b => b.id === savedBrandId);
        setSelectedBrand(savedBrand || fetchedBrands[0]);
      } else if (fetchedBrands.length > 0) {
        setSelectedBrand(fetchedBrands[0]);
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