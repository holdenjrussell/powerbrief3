'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Square } from 'lucide-react';

interface EndNodeData {
  label: string;
}

export const EndNode: React.FC<NodeProps<EndNodeData>> = () => {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />
      
      <Card className="min-w-[200px] bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <Square className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="font-bold text-red-800">
                Workflow Complete
              </div>
              <div className="text-sm text-red-700">
                End of workflow execution
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 