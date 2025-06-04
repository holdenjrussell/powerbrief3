'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';

// Import the tab components
import ScorecardTab from '@/components/team-sync/ScorecardTab';
import AnnouncementsTab from '@/components/team-sync/AnnouncementsTab';
import TodosTab from '@/components/team-sync/TodosTab';
import IssuesTab from '@/components/team-sync/IssuesTab';

const VALID_TABS = ['scorecard', 'announcements', 'todos', 'issues'];

export default function TeamSyncPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'scorecard');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && VALID_TABS.includes(currentTab) && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Team Sync</h1>
            <p className="text-gray-600">Manage your team&apos;s scorecard, announcements, tasks, and issues</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <ScorecardTab />
              </TabsContent>

              <TabsContent value="announcements" className="mt-0">
                <AnnouncementsTab />
              </TabsContent>

              <TabsContent value="todos" className="mt-0">
                <TodosTab />
              </TabsContent>

              <TabsContent value="issues" className="mt-0">
                <IssuesTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 