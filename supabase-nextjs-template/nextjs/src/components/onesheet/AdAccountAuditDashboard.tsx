'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';

interface AdAccountAuditDashboardProps {
  onesheetId: string;
  brandId: string;
}

export function AdAccountAuditDashboard({ onesheetId: _onesheetId, brandId: _brandId }: AdAccountAuditDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ad Account Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Performance Analysis Coming Soon
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              This stage will analyze your ad account performance data, breaking down demographics, performance by angles/formats/emotions, and identifying top-performing creative frameworks.
            </p>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Connect Ad Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 