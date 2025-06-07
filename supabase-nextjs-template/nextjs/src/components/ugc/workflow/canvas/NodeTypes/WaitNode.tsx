'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Settings, 
  Copy, 
  Trash2
} from 'lucide-react';
import { UgcWorkflowStep } from '@/lib/types/ugcWorkflow';

interface WaitNodeData {
  step: UgcWorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (step: UgcWorkflowStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const WaitNode: React.FC<NodeProps<WaitNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { step, onSelect, onDelete, onDuplicate } = data;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const waitDuration = step.config.wait_duration as number;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white"
      />
      
      <Card 
        className={`min-w-[200px] cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-purple-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm text-purple-700">
                  Wait
                </div>
                <div className="font-semibold text-gray-900">
                  {step.name}
                </div>
              </div>
            </div>
            
            {selected && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="h-6 w-6 p-0"
                  title="Duplicate"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {step.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {step.description}
            </p>
          )}
          
          {waitDuration && (
            <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded">
              <div className="text-sm font-medium text-purple-800">
                Duration: {formatDuration(waitDuration)}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {waitDuration ? `Pauses for ${formatDuration(waitDuration)}` : 'Configure duration'}
            </div>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white"
      />
    </div>
  );
}; 