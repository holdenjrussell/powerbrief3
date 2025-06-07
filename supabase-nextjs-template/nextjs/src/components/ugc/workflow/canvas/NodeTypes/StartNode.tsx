'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { UgcWorkflowTemplate } from '@/lib/types/ugcWorkflow';

interface StartNodeData {
  label: string;
  workflow: UgcWorkflowTemplate;
}

export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data }) => {
  const { workflow } = data;

  return (
    <div className="relative">
      <Card className="min-w-[200px] bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Play className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-bold text-green-800">
                Workflow Start
              </div>
              <div className="text-sm text-green-700">
                Trigger: {workflow.trigger_event}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
}; 