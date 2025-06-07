'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Settings, 
  Copy, 
  Trash2,
  Mail,
  MessageSquare,
  Bot,
  UserCheck,
  Clock,
  AlertCircle,
  User
} from 'lucide-react';
import { UgcWorkflowStep, ActionType } from '@/lib/types/ugcWorkflow';

const ACTION_TYPE_ICONS: Record<ActionType, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4" />,
  update_status: <UserCheck className="h-4 w-4" />,
  assign_script: <MessageSquare className="h-4 w-4" />,
  schedule_call: <Clock className="h-4 w-4" />,
  send_notification: <AlertCircle className="h-4 w-4" />,
  create_task: <User className="h-4 w-4" />,
  ai_generate: <Bot className="h-4 w-4" />
};

interface ActionNodeData {
  step: UgcWorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (step: UgcWorkflowStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ 
  data, 
  selected 
}) => {
  const { step, onSelect, onDelete, onDuplicate } = data;
  
  const actionIcon = step.config.action_id ? 
    ACTION_TYPE_ICONS[step.config.action_id as ActionType] || <Zap className="h-4 w-4" /> :
    <Zap className="h-4 w-4" />;

  const getActionTypeName = () => {
    if (!step.config.action_id) return 'Action';
    
    const actionTypeMap = {
      send_email: 'Send Email',
      update_status: 'Update Status', 
      assign_script: 'Assign Script',
      schedule_call: 'Schedule Call',
      send_notification: 'Send Notification',
      create_task: 'Create Task',
      ai_generate: 'AI Generate'
    };
    
    return actionTypeMap[step.config.action_id as ActionType] || 'Action';
  };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
      
      <Card 
        className={`min-w-[200px] cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-blue-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded">
                {actionIcon}
              </div>
              <div>
                <div className="font-medium text-sm text-blue-700">
                  {getActionTypeName()}
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {step.config.retry_on_failure && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Retry enabled" />
              )}
              {step.config.timeout && (
                <div className="w-2 h-2 bg-orange-400 rounded-full" title="Timeout configured" />
              )}
            </div>
            
            <Settings className="h-3 w-3 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}; 