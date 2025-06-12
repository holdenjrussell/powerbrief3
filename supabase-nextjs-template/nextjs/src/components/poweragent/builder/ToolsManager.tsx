import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Package, 
  Plus, 
  Brain,
  Globe,
  Code,
  Sparkles
} from 'lucide-react';
import ToolSelector from './ToolSelector';
import CustomToolBuilder from './CustomToolBuilder';
import ToolkitManager from './ToolkitManager';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'built-in' | 'custom' | 'mcp';
  category?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
}

interface Toolkit {
  id: string;
  name: string;
  description: string;
  tools: string[]; // Tool IDs
  instructions?: string;
  addInstructions: boolean;
}

interface ToolsManagerProps {
  selectedTools: string[];
  customTools: Tool[];
  toolkits: Toolkit[];
  onUpdate: (updates: {
    selectedTools?: string[];
    customTools?: Tool[];
    toolkits?: Toolkit[];
  }) => void;
}

// Built-in tools available in VoltAgent
const builtInTools: Tool[] = [
  {
    id: 'think',
    name: 'think',
    description: 'Internal reasoning tool for step-by-step thinking',
    type: 'built-in',
    category: 'reasoning',
    enabled: false
  },
  {
    id: 'analyze',
    name: 'analyze',
    description: 'Analyze results and decide next actions',
    type: 'built-in',
    category: 'reasoning',
    enabled: false
  },
  {
    id: 'delegate_task',
    name: 'delegate_task',
    description: 'Delegate tasks to sub-agents (auto-added when sub-agents are configured)',
    type: 'built-in',
    category: 'delegation',
    enabled: false
  }
];

// Mock available tools - in production, fetch from API
const availableTools: Tool[] = [
  {
    id: 'reasoning',
    name: 'Step-by-Step Reasoning',
    description: 'Perform structured reasoning and analysis on complex problems',
    type: 'built-in',
    category: 'reasoning',
    enabled: false,
    parameters: {
      problem: 'string - The problem to analyze',
      steps: 'number - Number of reasoning steps (optional, default: 3)'
    }
  },
  {
    id: 'search',
    name: 'Information Search',
    description: 'Search for information and provide relevant results',
    type: 'built-in',
    category: 'data',
    enabled: false,
    parameters: {
      query: 'string - The search query',
      type: 'enum - Type of search: web, academic, news, general'
    }
  },
  {
    id: 'calculator',
    name: 'Mathematical Calculator',
    description: 'Perform mathematical calculations and operations',
    type: 'built-in',
    category: 'computation',
    enabled: false,
    parameters: {
      expression: 'string - Mathematical expression to evaluate',
      precision: 'number - Decimal places for result (optional, default: 2)'
    }
  },
  {
    id: 'text_analyzer',
    name: 'Text Analysis',
    description: 'Analyze text for metrics, sentiment, keywords, and insights',
    type: 'built-in',
    category: 'analysis',
    enabled: false,
    parameters: {
      text: 'string - Text to analyze',
      analysis_type: 'enum - Type: basic, sentiment, readability, keywords'
    }
  },
  {
    id: 'json_formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and manipulate JSON data',
    type: 'built-in',
    category: 'data',
    enabled: false,
    parameters: {
      json_data: 'string - JSON string to process',
      action: 'enum - Action: format, validate, minify, extract_keys'
    }
  }
];

export default function ToolsManager({ 
  selectedTools, 
  customTools, 
  toolkits, 
  onUpdate 
}: ToolsManagerProps) {
  const [activeTab, setActiveTab] = useState('selection');
  const [showCustomToolBuilder, setShowCustomToolBuilder] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const allTools = [...builtInTools, ...customTools, ...availableTools];

  const handleToggleTool = (toolId: string) => {
    const newSelectedTools = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    onUpdate({ selectedTools: newSelectedTools });
  };

  const handleAddCustomTool = (tool: Tool) => {
    const newTool = {
      ...tool,
      id: `custom_${Date.now()}`,
      type: 'custom' as const
    };
    onUpdate({ 
      customTools: [...customTools, newTool],
      selectedTools: [...selectedTools, newTool.id]
    });
    setShowCustomToolBuilder(false);
    setEditingTool(null);
  };

  const handleUpdateCustomTool = (tool: Tool) => {
    onUpdate({
      customTools: customTools.map(t => t.id === tool.id ? tool : t)
    });
    setEditingTool(null);
  };

  const handleDeleteCustomTool = (toolId: string) => {
    onUpdate({
      customTools: customTools.filter(t => t.id !== toolId),
      selectedTools: selectedTools.filter(id => id !== toolId)
    });
  };

  const handleAddToolkit = (toolkit: Toolkit) => {
    const newToolkit = {
      ...toolkit,
      id: `toolkit_${Date.now()}`
    };
    onUpdate({ 
      toolkits: [...toolkits, newToolkit],
      selectedTools: [...new Set([...selectedTools, ...toolkit.tools])]
    });
  };

  const handleUpdateToolkit = (toolkit: Toolkit) => {
    onUpdate({
      toolkits: toolkits.map(t => t.id === toolkit.id ? toolkit : t)
    });
  };

  const handleDeleteToolkit = (toolkitId: string) => {
    onUpdate({
      toolkits: toolkits.filter(t => t.id !== toolkitId)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools & Toolkits</CardTitle>
        <CardDescription>
          Empower your agent with tools that enable real-world actions. Tools can fetch data, perform calculations, call APIs, and more. Organize related tools into toolkits for cleaner management.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="selection" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tool Selection
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Custom Tools
            </TabsTrigger>
            <TabsTrigger value="toolkits" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Toolkits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selection" className="mt-6">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Enable reasoning tools
                    const reasoningTools = ['think', 'analyze'];
                    onUpdate({ 
                      selectedTools: [...new Set([...selectedTools, ...reasoningTools])]
                    });
                  }}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Add Reasoning Tools
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('custom')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Tool
                </Button>
              </div>

              {/* Tool Categories */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Reasoning Tools
                  </h4>
                  <ToolSelector
                    tools={allTools.filter(t => t.category === 'reasoning')}
                    selectedTools={selectedTools}
                    onToggle={handleToggleTool}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Data & Information Tools
                  </h4>
                  <ToolSelector
                    tools={allTools.filter(t => t.category === 'data')}
                    selectedTools={selectedTools}
                    onToggle={handleToggleTool}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Computation & Analysis Tools
                  </h4>
                  <ToolSelector
                    tools={allTools.filter(t => t.category === 'computation' || t.category === 'analysis')}
                    selectedTools={selectedTools}
                    onToggle={handleToggleTool}
                  />
                </div>

                {customTools.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Custom Tools
                    </h4>
                    <ToolSelector
                      tools={customTools}
                      selectedTools={selectedTools}
                      onToggle={handleToggleTool}
                      onEdit={setEditingTool}
                      onDelete={handleDeleteCustomTool}
                    />
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    MCP Tools
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </h4>
                  <p className="text-sm text-gray-500">
                    Model Context Protocol tools will be available here once configured
                  </p>
                </div>
              </div>

              {/* Selected Tools Summary */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            {showCustomToolBuilder || editingTool ? (
              <CustomToolBuilder
                tool={editingTool}
                onSave={editingTool ? handleUpdateCustomTool : handleAddCustomTool}
                onCancel={() => {
                  setShowCustomToolBuilder(false);
                  setEditingTool(null);
                }}
              />
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => setShowCustomToolBuilder(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Custom Tool
                </Button>
                
                {customTools.length > 0 ? (
                  <div className="space-y-2">
                    {customTools.map(tool => (
                      <div
                        key={tool.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setEditingTool(tool)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{tool.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                          </div>
                          <Badge variant="secondary">Custom</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No custom tools created yet</p>
                    <p className="text-sm mt-2">
                      Create custom tools to extend your agent&apos;s capabilities
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="toolkits" className="mt-6">
            <ToolkitManager
              toolkits={toolkits}
              availableTools={allTools}
              onAdd={handleAddToolkit}
              onUpdate={handleUpdateToolkit}
              onDelete={handleDeleteToolkit}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 