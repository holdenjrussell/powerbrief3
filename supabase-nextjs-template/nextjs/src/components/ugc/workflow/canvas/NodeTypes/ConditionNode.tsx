'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GitBranch, 
  Settings, 
  Copy, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { UgcWorkflowStep } from '@/lib/types/ugcWorkflow';

interface ConditionNodeData {
  step: UgcWorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (step: UgcWorkflowStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { step, onSelect, onDelete, onDuplicate } = data;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500 !border-2 !border-white"
      />
      
      <Card 
        className={`min-w-[200px] cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-orange-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded">
                <GitBranch className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm text-orange-700">
                  Condition
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
          
          {/* Condition Display */}
          {step.config.conditions && step.config.conditions.length > 0 && step.config.conditions[0].field_name ? (
            <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <div className="font-medium text-orange-800 mb-1">Condition:</div>
              <div className="font-mono text-xs bg-white p-1 rounded border">
                <span className="text-purple-600">{step.config.conditions[0].field_name}</span>
                {' '}
                <span className="text-orange-600">
                  {step.config.conditions[0].operator?.replace('_', ' ')}
                </span>
                {' '}
                {step.config.conditions[0].expected_value && (
                  <span className="text-green-600">&quot;{step.config.conditions[0].expected_value}&quot;</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="flex items-center gap-1 text-yellow-700">
                <AlertCircle className="h-3 w-3" />
                <span>No condition configured</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {step.config.conditions && step.config.conditions.length > 0 && step.config.conditions[0].field_name
                ? 'Configured'
                : 'Click to configure'
              }
            </div>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      {/* Multiple output handles for TRUE/FALSE branches */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />
      
      {/* Labels for branches */}
      <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-4">
        <span className="text-xs text-green-600 font-medium">TRUE</span>
        <span className="text-xs text-red-600 font-medium">FALSE</span>
      </div>
    </div>
  );
}; 