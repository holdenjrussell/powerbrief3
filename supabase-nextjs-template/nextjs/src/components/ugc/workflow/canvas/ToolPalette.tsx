'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Zap, 
  GitBranch, 
  Clock, 
  User,
  GripVertical
} from 'lucide-react';

interface DraggableStepProps {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DraggableStep: React.FC<DraggableStepProps> = ({ 
  type, 
  label, 
  description, 
  icon, 
  color 
}) => {
  const onDragStart = (event: React.DragEvent, stepType: string) => {
    event.dataTransfer.setData('application/reactflow', stepType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${color}`}
      draggable
      onDragStart={(event) => onDragStart(event, type)}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-400" />
        {icon}
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </div>
  );
};

export const ToolPalette: React.FC = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Step Types</CardTitle>
        <p className="text-sm text-gray-600">
          Drag step types onto the canvas to build your workflow
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <DraggableStep
          type="action"
          label="Action"
          description="Perform an action like sending email"
          icon={<Zap className="h-4 w-4 text-blue-600" />}
          color="border-blue-200 hover:border-blue-300 hover:bg-blue-50"
        />
        
        <DraggableStep
          type="condition"
          label="Condition"
          description="Branch based on criteria"
          icon={<GitBranch className="h-4 w-4 text-orange-600" />}
          color="border-orange-200 hover:border-orange-300 hover:bg-orange-50"
        />
        
        <DraggableStep
          type="wait"
          label="Wait"
          description="Pause for a specified duration"
          icon={<Clock className="h-4 w-4 text-purple-600" />}
          color="border-purple-200 hover:border-purple-300 hover:bg-purple-50"
        />
        
        <DraggableStep
          type="human_intervention"
          label="Human Review"
          description="Require manual approval"
          icon={<User className="h-4 w-4 text-red-600" />}
          color="border-red-200 hover:border-red-300 hover:bg-red-50"
        />
        
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How to use:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Drag step types onto canvas</li>
            <li>• Click nodes to configure</li>
            <li>• Connect nodes by dragging</li>
            <li>• Use zoom controls to navigate</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}; 