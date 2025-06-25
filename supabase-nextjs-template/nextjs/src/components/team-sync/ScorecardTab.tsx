'use client';

import React from 'react';
import ScorecardMetrics from '@/components/scorecard/ScorecardMetrics';
import { useBrand } from '@/lib/context/BrandContext';

interface ScorecardTabProps {
  brandId: string;
}

export default function ScorecardTab({ brandId }: ScorecardTabProps) {
  const { selectedTeam } = useBrand();
  
  return (
    <ScorecardMetrics 
      brandId={brandId} 
      teamId={selectedTeam?.id} 
    />
  );
} 