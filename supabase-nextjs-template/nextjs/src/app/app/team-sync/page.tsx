'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useBrand } from '@/lib/context/BrandContext';
import { 
  Card, 
  CardContent, 
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui';
import { 
  Users,
  BarChart3,
  Megaphone,
  CheckSquare,
  AlertTriangle,
  Building2,
  Loader2
} from 'lucide-react';

// Import the tab components
import ScorecardTab from '@/components/team-sync/ScorecardTab';
import AnnouncementsTab from '@/components/team-sync/AnnouncementsTab';
import TodosTab from '@/components/team-sync/TodosTab';
import IssuesTab from '@/components/team-sync/IssuesTab';

const VALID_TABS = ['scorecard', 'announcements', 'todos', 'issues'];

export default function TeamSyncPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { selectedBrand, isLoading: brandsLoading } = useBrand();
  
  // Get the current tab from URL or default to 'scorecard'
  const currentTabFromUrl = searchParams.get('tab');
  const validTab = currentTabFromUrl && VALID_TABS.includes(currentTabFromUrl) ? currentTabFromUrl : 'scorecard';
  const [activeTab, setActiveTab] = useState(validTab);

  // Sync activeTab with URL params whenever they change
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const newTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'scorecard';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams]); // Remove activeTab from dependencies to avoid circular updates

  // Handle tab change - update both state and URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (brandsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedBrand) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
            <p className="max-w-md mx-auto">
              Please select a brand from the dropdown above to access Team Sync features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Team Sync - {selectedBrand.name}</h1>
            <p className="text-gray-600">Manage your team&apos;s scorecard, announcements, tasks, and issues</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-4 h-12 bg-transparent">
                <TabsTrigger 
                  value="scorecard" 
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600"
                >
                  <BarChart3 className="h-4 w-4" />
                  Scorecard
                </TabsTrigger>
                <TabsTrigger 
                  value="announcements" 
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600"
                >
                  <Megaphone className="h-4 w-4" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger 
                  value="todos" 
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600"
                >
                  <CheckSquare className="h-4 w-4" />
                  To-Dos
                </TabsTrigger>
                <TabsTrigger 
                  value="issues" 
                  className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Issues
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="scorecard" className="mt-0">
                <ScorecardTab brandId={selectedBrand.id} />
              </TabsContent>

              <TabsContent value="announcements" className="mt-0">
                <AnnouncementsTab brandId={selectedBrand.id} />
              </TabsContent>

              <TabsContent value="todos" className="mt-0">
                <TodosTab brandId={selectedBrand.id} />
              </TabsContent>

              <TabsContent value="issues" className="mt-0">
                <IssuesTab brandId={selectedBrand.id} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 