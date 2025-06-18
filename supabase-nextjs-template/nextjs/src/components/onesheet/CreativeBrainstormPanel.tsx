"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Lightbulb } from 'lucide-react';

interface CreativeBrainstormPanelProps {
  onesheetId: string;
  brandId: string;
}

export function CreativeBrainstormPanel({ onesheetId: _onesheetId, brandId: _brandId }: CreativeBrainstormPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Creative Brainstorm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Creative Generation Coming Soon
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              This stage will generate creative concepts, hooks, and visual ideas based on all the research from previous stages to create your comprehensive creative strategy.
            </p>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Generate Creative Ideas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 