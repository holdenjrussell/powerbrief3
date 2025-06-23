"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { 
  CheckCircle2, 
  Circle, 
  Lock,
  FileText,
  Users,
  Target,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import type { OneSheet } from '@/lib/types/onesheet';
import { ContextHub } from './ContextHub';
import AudienceResearchPanel from './AudienceResearchPanel';
import { CompetitorResearchTable } from './CompetitorResearchTable';
import { AdAccountAuditDashboard } from './AdAccountAuditDashboard';
import { CreativeBrainstormPanel } from './CreativeBrainstormPanel';

interface HybridOneSheetProps {
  onesheet: OneSheet;
  onUpdate: (updates: Partial<OneSheet>) => void;
  onAutoSave?: (field: string, value: unknown) => void;
}

type StageType = 'context_loading' | 'audience_research' | 'competitor_research' | 'ad_audit' | 'creative_brainstorm' | 'completed';

export function HybridOneSheetV2({ 
  onesheet, 
  onUpdate,
  onAutoSave 
}: HybridOneSheetProps) {
  const [activeTab, setActiveTab] = useState<StageType>(onesheet.current_stage || 'context_loading');

  // REMOVED: Update activeTab when onesheet.current_stage changes
  // This was interfering with manual tab switching
  // useEffect(() => {
  //   if (onesheet.current_stage && onesheet.current_stage !== activeTab) {
  //     setActiveTab(onesheet.current_stage);
  //   }
  // }, [onesheet.current_stage, activeTab]);

  // Get stage completion status
  const stagesCompleted = onesheet.stages_completed || {
    context: false,
    audience_research: false,
    competitor_research: false,
    ad_audit: false,
    creative_brainstorm: false
  };

  // Check if we have any context loaded
  const hasContextLoaded = onesheet.context_loaded && 
    Object.values(onesheet.context_loaded).some(v => v);

  // Determine which tabs are enabled based on completion
  const isTabEnabled = (stage: string) => {
    // SIMPLIFIED: Allow all tabs for now to fix navigation issue
    return true;
    
    // TODO: Re-implement proper logic later
    // const stageOrder = ['context_loading', 'audience_research', 'competitor_research', 'ad_audit', 'creative_brainstorm'];
    // const currentIndex = stageOrder.indexOf(onesheet.current_stage || 'context_loading');
    // const requestedIndex = stageOrder.indexOf(stage);
    // return requestedIndex <= currentIndex;
  };

  // Stage icons based on completion
  const getStageIcon = (stage: string) => {
    const stageKey = stage === 'context_loading' ? 'context' : stage;
    if (stagesCompleted[stageKey as keyof typeof stagesCompleted]) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (isTabEnabled(stage)) {
      return <Circle className="h-4 w-4 text-blue-500" />;
    } else {
      return <Lock className="h-4 w-4 text-gray-400" />;
    }
  };

  const stageTabs = [
    { 
      id: 'context_loading', 
      label: 'Context Hub', 
      description: 'Load and manage research context',
      icon: FileText
    },
    { 
      id: 'audience_research', 
      label: 'Audience Research', 
      description: 'Angles, benefits, pain points, personas',
      icon: Users
    },
    { 
      id: 'competitor_research', 
      label: 'Competitor Research', 
      description: 'Analyze competitor strategies',
      icon: Target
    },
    { 
      id: 'ad_audit', 
      label: 'Ad Account Audit', 
      description: 'Performance data analysis',
      icon: BarChart3
    },
    { 
      id: 'creative_brainstorm', 
      label: 'Creative Brainstorm', 
      description: 'Generate concepts and hooks',
      icon: Lightbulb
    }
  ];

  const handleStageComplete = (stage: string) => {
    const updates = {
      stages_completed: {
        ...stagesCompleted,
        [stage === 'context_loading' ? 'context' : stage]: true
      },
      current_stage: getNextStage(stage)
    };
    onUpdate(updates);
    
    // Auto-advance to next stage
    const nextStage = getNextStage(stage);
    if (nextStage && isTabEnabled(nextStage)) {
      setActiveTab(nextStage);
    }
  };

  const getNextStage = (currentStage: string): string => {
    const stageOrder = ['context_loading', 'audience_research', 'competitor_research', 'ad_audit', 'creative_brainstorm'];
    const currentIndex = stageOrder.indexOf(currentStage);
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'completed';
  };

  // Custom handler for ContextHub updates
  const handleContextHubUpdate = (updates: Partial<OneSheet>) => {
    // If workflow_stage is being updated, handle the stage transition
    if (updates.workflow_stage === 'audience_research') {
      // Mark context stage as complete and advance to audience research
      const stageUpdates = {
        ...updates,
        stages_completed: {
          ...stagesCompleted,
          context: true
        },
        current_stage: 'audience_research' as const
      };
      onUpdate(stageUpdates);
      setActiveTab('audience_research');
    } else {
      onUpdate(updates);
    }
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen p-6">
      {/* Progress Indicator */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-lg">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Lightbulb className="h-5 w-5" />
            </div>
            Creative Strategy Workflow
          </CardTitle>
          <CardDescription className="text-blue-100">
            Complete each stage to build your comprehensive creative strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {stageTabs.map((stage, index) => {
              const IconComponent = stage.icon;
              const isActive = activeTab === stage.id;
              const isCompleted = stagesCompleted[stage.id === 'context_loading' ? 'context' : stage.id as keyof typeof stagesCompleted];
              
              return (
                <div key={stage.id} className="flex items-center">
                  <div 
                    className={`flex flex-col items-center cursor-pointer p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                      isActive 
                        ? 'bg-gradient-to-br from-blue-100 to-purple-100 shadow-md transform scale-105' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab(stage.id as StageType)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-full ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <IconComponent className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold text-center ${
                      isActive ? 'text-purple-700' : isCompleted ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-gray-500 text-center max-w-[120px] mt-1">
                      {stage.description}
                    </span>
                  </div>
                  {index < stageTabs.length - 1 && (
                    <div className={`h-1 w-12 mx-4 rounded-full ${
                      stagesCompleted[stage.id === 'context_loading' ? 'context' : stage.id as keyof typeof stagesCompleted] 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as StageType);
        }} className="w-full">
          {/* Hidden TabsList - navigation handled by progress indicator */}
          <TabsList className="hidden">
            {stageTabs.map(stage => (
              <TabsTrigger key={stage.id} value={stage.id} />
            ))}
          </TabsList>

        <TabsContent value="context_loading" className="space-y-6">
          <ContextHub 
            onesheet={onesheet}
            onUpdate={handleContextHubUpdate}
          />
        </TabsContent>

        <TabsContent value="audience_research" className="space-y-6">
          <AudienceResearchPanel
            onesheetId={onesheet.id}
            brandId={onesheet.brand_id}
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleStageComplete('audience_research')}
              disabled={!onesheet.audience_research || 
                Object.values(onesheet.audience_research || {}).every(v => 
                  Array.isArray(v) ? v.length === 0 : !v
                )
              }
            >
              Mark Stage Complete
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="competitor_research" className="space-y-6">
          <CompetitorResearchTable
            onesheetId={onesheet.id}
            brandId={onesheet.brand_id}
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleStageComplete('competitor_research')}
              disabled={!onesheet.competitor_research?.competitors?.length}
            >
              Mark Stage Complete
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="ad_audit" className="space-y-6">
          <AdAccountAuditDashboard
            onesheetId={onesheet.id}
            brandId={onesheet.brand_id}
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleStageComplete('ad_audit')}
              disabled={!onesheet.ad_account_audit?.ads?.length}
            >
              Mark Stage Complete
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="creative_brainstorm" className="space-y-6">
          <CreativeBrainstormPanel
            onesheetId={onesheet.id}
            brandId={onesheet.brand_id}
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => handleStageComplete('creative_brainstorm')}
              disabled={!onesheet.creative_brainstorm || 
                (!onesheet.creative_brainstorm.concepts?.length && 
                 !onesheet.creative_brainstorm.hooks?.length && 
                 !onesheet.creative_brainstorm.visuals?.length)
              }
            >
              Complete OneSheet
            </Button>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 