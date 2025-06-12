import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit, 
  Info,
  CheckCircle
} from 'lucide-react';
// Tooltip component not available, using title attribute instead

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'built-in' | 'custom' | 'mcp';
  category?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
}

interface ToolSelectorProps {
  tools: Tool[];
  selectedTools: string[];
  onToggle: (toolId: string) => void;
  onEdit?: (tool: Tool) => void;
  onDelete?: (toolId: string) => void;
}

export default function ToolSelector({ 
  tools, 
  selectedTools, 
  onToggle,
  onEdit,
  onDelete
}: ToolSelectorProps) {
  if (tools.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No tools available in this category</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tools.map(tool => {
        const isSelected = selectedTools.includes(tool.id);
        
        return (
          <div
            key={tool.id}
            className={`p-4 border rounded-lg transition-colors ${
              isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{tool.name}</h4>
                  {tool.type === 'built-in' && (
                    <Badge variant="secondary" className="text-xs">Built-in</Badge>
                  )}
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                
                {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                  <div className="mt-2">
                    <div 
                      className="inline-flex items-center gap-1 text-xs text-gray-500 cursor-help"
                      title="This tool has custom parameters"
                    >
                      <Info className="h-3 w-3" />
                      <span>Parameters configured</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={isSelected}
                  onCheckedChange={() => onToggle(tool.id)}
                  aria-label={`Toggle ${tool.name}`}
                />
                
                {tool.type === 'custom' && (
                  <>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(tool);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete tool "${tool.name}"?`)) {
                            onDelete(tool.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 