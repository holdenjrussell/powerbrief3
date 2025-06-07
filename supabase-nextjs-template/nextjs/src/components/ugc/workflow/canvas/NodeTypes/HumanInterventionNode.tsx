'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
  Copy, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { UgcWorkflowStep } from '@/lib/types/ugcWorkflow';

interface HumanInterventionNodeData {
  step: UgcWorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (step: UgcWorkflowStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const HumanInterventionNode: React.FC<NodeProps<HumanInterventionNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { step, onSelect, onDelete, onDuplicate } = data;

  const priority = step.config.priority as string || 'medium';
  const interventionTitle = step.config.intervention_title as string;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high' || priority === 'urgent') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return null;
  };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />
      
      <Card 
        className={`min-w-[200px] cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-red-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm text-red-700">
                  Human Review
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
          
          {interventionTitle && (
            <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
              <div className="text-xs font-medium text-gray-800">
                {interventionTitle}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getPriorityColor(priority)}`}>
              {getPriorityIcon(priority)}
              <span className="capitalize">{priority}</span>
            </div>
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />
    </div>
  );
}; 