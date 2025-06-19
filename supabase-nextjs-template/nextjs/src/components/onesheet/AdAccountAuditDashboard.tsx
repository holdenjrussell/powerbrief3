'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Upload,
  TrendingUp,
  Users,
  DollarSign,
  Eye
} from 'lucide-react';

interface AdAccountAuditDashboardProps {
  onesheetId: string;
  brandId: string;
}

export function AdAccountAuditDashboard({ onesheetId, brandId }: AdAccountAuditDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ad Account Audit</CardTitle>
              <CardDescription>
                Analyze performance data to identify winning patterns
              </CardDescription>
            </div>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Import Ad Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No ad performance data imported yet
            </p>
            <p className="text-sm text-muted-foreground">
              Import your ad data to see performance insights
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder sections for future implementation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Demographic Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Age, gender, and placement performance analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance by Angle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Which angles drive the best results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Format Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Video vs static, UGC vs studio performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              CPA trends and budget optimization insights
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 