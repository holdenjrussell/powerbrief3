"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';

interface CompetitorResearchTableProps {
  onesheetId: string;
  brandId: string;
}

export function CompetitorResearchTable({ onesheetId: _onesheetId, brandId: _brandId }: CompetitorResearchTableProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitor Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Competitor Analysis Coming Soon
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              This stage will analyze competitor strategies, landing pages, and advertising approaches to identify opportunities and gaps in the market.
            </p>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 