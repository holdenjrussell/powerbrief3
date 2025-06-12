'use client';

import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Bot,
  GitBranch,
  FileText,
  Zap,
  Sparkles,
  AlertCircle,
  FileJson,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Node type definitions
type NodeType = 'start' | 'delegate' | 'conditional' | 'synthesize' | 'merge' | 'end';

interface NodeData {
  label: string;
  type: NodeType;
  config?: NodeConfig;
  icon?: React.ReactNode;
  description?: string;
}

interface NodeConfig {
  label?: string;
  description?: string;
  targetAgent?: string;
  taskTemplate?: string;
  variable?: string;
  operator?: string;
  value?: string;
  instructions?: string;
}

interface WorkflowDesignerProps {
  availableAgents: Array<{
    id: string;
    name: string;
    type?: string;
    description?: string;
  }>;
  selectedAgentIds?: string[];
  workflow?: {
    nodes: any[];
    edges: any[];
  };
  onWorkflowChange?: (workflow: { nodes: any[]; edges: any[] }) => void;
}

// Node type configurations
const nodeTypes: Record<NodeType, { icon: React.ReactNode; color: string; description: string }> = {
  start: {
    icon: <Play className="h-4 w-4" />,
    color: 'bg-green-500',
    description: 'Entry point that receives the user prompt',
  },
  delegate: {
    icon: <Bot className="h-4 w-4" />,
    color: 'bg-blue-500',
    description: 'Delegates a task to a specific sub-agent',
  },
  conditional: {
    icon: <GitBranch className="h-4 w-4" />,
    color: 'bg-yellow-500',
    description: 'Makes decisions based on conditions',
  },
  synthesize: {
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-purple-500',
    description: 'Generates text using LLM to format responses',
  },
  merge: {
    icon: <Sparkles className="h-4 w-4" />,
    color: 'bg-indigo-500',
    description: 'Combines multiple execution paths',
  },
  end: {
    icon: <Zap className="h-4 w-4" />,
    color: 'bg-red-500',
    description: 'Final step that returns the result',
  },
};

// Custom node component
const WorkflowNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const nodeType = nodeTypes[data.type];
  
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-white ${
        selected ? 'border-primary' : 'border-gray-200'
      } min-w-[180px]`}
    >
      {/* Input handles */}
      {data.type !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-gray-400"
        />
      )}
      
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-md text-white ${nodeType.color}`}>
          {nodeType.icon}
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.label}</div>
          {data.description && (
            <div className="text-xs text-gray-500 mt-0.5">{data.description}</div>
          )}
        </div>
      </div>
      
      {/* Output handles */}
      {data.type !== 'end' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="default"
            className="w-3 h-3 !bg-gray-400"
          />
          {data.type === 'conditional' && (
            <>
              <Handle
                type="source"
                position={Position.Right}
                id="true"
                className="w-3 h-3 !bg-green-500"
                style={{ top: '50%' }}
              />
              <Handle
                type="source"
                position={Position.Left}
                id="false"
                className="w-3 h-3 !bg-red-500"
                style={{ top: '50%' }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

// Custom edge component
const WorkflowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data?.label && (
            <Badge variant="secondary" className="text-xs">
              {data.label}
            </Badge>
          )}
          <button
            className="ml-2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-red-50 hover:border-red-300"
            onClick={onEdgeClick}
            aria-label="Delete edge"
          >
            <X className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypesMap = {
  workflow: WorkflowNode,
};

const edgeTypes = {
  workflow: WorkflowEdge,
};

function WorkflowDesignerContent({ availableAgents, workflow, onWorkflowChange }: WorkflowDesignerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(
    workflow?.nodes?.length ? workflow.nodes : [
      {
        id: 'start',
        type: 'workflow',
        position: { x: 250, y: 50 },
        data: {
          label: 'Start Workflow',
          type: 'start',
          description: 'User input',
        },
      },
      {
        id: 'end',
        type: 'workflow',
        position: { x: 250, y: 400 },
        data: {
          label: 'End Workflow',
          type: 'end',
          description: 'Final output',
        },
      },
    ]
  );
  
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(workflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  
  // Node configuration state
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>({});

  // Use a ref to track if we should update the parent
  const shouldUpdateParent = useRef(true);

  // Update parent component when workflow changes, but only after user interactions
  const updateWorkflow = useCallback(() => {
    if (onWorkflowChange && shouldUpdateParent.current) {
      onWorkflowChange({
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          data: e.data,
        })),
      });
    }
  }, [nodes, edges, onWorkflowChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const sourceHandle = params.sourceHandle;
      
      let edgeLabel = '';
      if (sourceNode?.data.type === 'conditional') {
        edgeLabel = sourceHandle === 'true' ? 'True' : sourceHandle === 'false' ? 'False' : '';
      }
      
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'workflow',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            data: { label: edgeLabel },
          },
          eds
        )
      );
      
      // Update workflow after connection
      setTimeout(updateWorkflow, 100);
    },
    [setEdges, nodes, updateWorkflow]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
    setNodeConfig(node.data.config || {});
    setShowNodeConfig(true);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('nodeType') as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node<NodeData> = {
        id: `${type}_${Date.now()}`,
        type: 'workflow',
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          type,
          description: nodeTypes[type].description,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Update workflow after drop
      setTimeout(updateWorkflow, 100);
    },
    [project, setNodes, updateWorkflow]
  );

  // Handle node position changes with debouncing
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    
    // Only update on meaningful changes (not selection)
    const hasMeaningfulChange = changes.some((change: any) => 
      change.type === 'position' && change.dragging === false
    );
    
    if (hasMeaningfulChange) {
      setTimeout(updateWorkflow, 500);
    }
  }, [onNodesChange, updateWorkflow]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    setTimeout(updateWorkflow, 100);
  }, [onEdgesChange, updateWorkflow]);

  const updateNodeConfig = () => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: nodeConfig,
              label: nodeConfig.label || node.data.label,
              description: nodeConfig.description || node.data.description,
            },
          };
        }
        return node;
      })
    );
    
    setShowNodeConfig(false);
    setSelectedNode(null);
    
    // Update workflow after node configuration
    setTimeout(updateWorkflow, 100);
  };

  const exportWorkflow = () => {
    const workflow = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.data.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        data: e.data,
      })),
    };
    
    console.log('Workflow JSON:', JSON.stringify(workflow, null, 2));
    // TODO: Save workflow to backend
  };

  const createSampleWorkflow = () => {
    if (availableAgents.length === 0) return;
    
    const sampleNodes: Node<NodeData>[] = [
      {
        id: 'start',
        type: 'workflow',
        position: { x: 250, y: 50 },
        data: {
          label: 'Start Workflow',
          type: 'start',
          description: 'User input received',
        },
      },
      {
        id: 'delegate_1',
        type: 'workflow',
        position: { x: 250, y: 150 },
        data: {
          label: `Delegate to ${availableAgents[0].name}`,
          type: 'delegate',
          description: `Process with ${availableAgents[0].name}`,
          config: {
            targetAgent: availableAgents[0].id,
            taskTemplate: 'Process this request: {{$json.userInput}}',
          },
        },
      },
      {
        id: 'conditional_1',
        type: 'workflow',
        position: { x: 250, y: 280 },
        data: {
          label: 'Check Result',
          type: 'conditional',
          description: 'Evaluate the result',
          config: {
            variable: '$json.result',
            operator: 'exists',
            value: '',
          },
        },
      },
      {
        id: 'synthesize_1',
        type: 'workflow',
        position: { x: 450, y: 380 },
        data: {
          label: 'Success Response',
          type: 'synthesize',
          description: 'Format success response',
          config: {
            instructions: 'Format the successful result: {{$json.previousResult}}',
          },
        },
      },
      {
        id: 'synthesize_2',
        type: 'workflow',
        position: { x: 50, y: 380 },
        data: {
          label: 'Error Response',
          type: 'synthesize',
          description: 'Handle error case',
          config: {
            instructions: 'Apologize and explain that the task could not be completed.',
          },
        },
      },
      {
        id: 'merge_1',
        type: 'workflow',
        position: { x: 250, y: 480 },
        data: {
          label: 'Merge Results',
          type: 'merge',
          description: 'Combine paths',
        },
      },
      {
        id: 'end',
        type: 'workflow',
        position: { x: 250, y: 580 },
        data: {
          label: 'End Workflow',
          type: 'end',
          description: 'Return final result',
        },
      },
    ];

    const sampleEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'delegate_1', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } },
      { id: 'e2', source: 'delegate_1', target: 'conditional_1', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } },
      { id: 'e3', source: 'conditional_1', sourceHandle: 'true', target: 'synthesize_1', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 }, data: { label: 'True' } },
      { id: 'e4', source: 'conditional_1', sourceHandle: 'false', target: 'synthesize_2', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 }, data: { label: 'False' } },
      { id: 'e5', source: 'synthesize_1', target: 'merge_1', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } },
      { id: 'e6', source: 'synthesize_2', target: 'merge_1', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } },
      { id: 'e7', source: 'merge_1', target: 'end', type: 'workflow', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 } },
    ];

    setNodes(sampleNodes);
    setEdges(sampleEdges);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>n8n-Style Workflow Builder:</strong> The supervisor's logic is the workflow itself. 
          Drag nodes from the palette to design your agent's decision flow. Connect nodes to define 
          the execution path. Each node represents a specific action the supervisor can take.
        </AlertDescription>
      </Alert>

      <div className="flex gap-6">
        {/* Node Palette */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-sm">Node Palette</CardTitle>
            <CardDescription className="text-xs">
              Drag nodes to the canvas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(nodeTypes).map(([type, config]) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                className="flex items-center gap-2 p-2 border rounded-lg cursor-move hover:bg-gray-50"
              >
                <div className={`p-2 rounded-md text-white ${config.color}`}>
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">{type}</div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow Canvas */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workflow Canvas</CardTitle>
                <CardDescription>
                  Design your supervisor's execution flow
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exportWorkflow}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export
              </Button>
              {availableAgents.length > 0 && nodes.length <= 2 && (
                <Button
                  size="sm"
                  onClick={createSampleWorkflow}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Create Sample
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div ref={reactFlowWrapper} className="h-[600px] border rounded-lg">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypesMap}
                edgeTypes={edgeTypes}
                fitView
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={showNodeConfig} onOpenChange={setShowNodeConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedNode?.data.type} Node</DialogTitle>
            <DialogDescription>
              Set up the parameters for this workflow node
            </DialogDescription>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-4">
              <div>
                <Label>Node Label</Label>
                <Input
                  value={nodeConfig.label || selectedNode.data.label}
                  onChange={(e) => setNodeConfig({ ...nodeConfig, label: e.target.value })}
                  placeholder="Enter node label"
                />
              </div>

              {selectedNode.data.type === 'delegate' && (
                <>
                  <div>
                    <Label>Target Agent</Label>
                    {availableAgents.length === 0 ? (
                      <div className="p-3 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                        No sub-agents available. Add sub-agents in the configuration above first.
                      </div>
                    ) : (
                      <Select
                        value={nodeConfig.targetAgent || ''}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, targetAgent: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                <span>{agent.name}</span>
                                {agent.description && (
                                  <span className="text-xs text-muted-foreground">- {agent.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {availableAgents.length > 0 && (
                    <div>
                      <Label>Task Template</Label>
                      <Textarea
                        value={nodeConfig.taskTemplate || ''}
                        onChange={(e) => setNodeConfig({ ...nodeConfig, taskTemplate: e.target.value })}
                        placeholder="Enter task template. Use {{variable}} for dynamic values"
                        rows={4}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available variables: <code>{'{{$json.userInput}}'}</code>, <code>{'{{$json.previousResult}}'}</code>
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedNode.data.type === 'conditional' && (
                <>
                  <div>
                    <Label>Condition</Label>
                    <div className="flex gap-2">
                      <Input
                        value={nodeConfig.variable || ''}
                        onChange={(e) => setNodeConfig({ ...nodeConfig, variable: e.target.value })}
                        placeholder="Variable (e.g., $json.result)"
                        className="font-mono text-sm"
                      />
                      <Select
                        value={nodeConfig.operator || 'contains'}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, operator: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">equals</SelectItem>
                          <SelectItem value="contains">contains</SelectItem>
                          <SelectItem value="exists">exists</SelectItem>
                          <SelectItem value="empty">is empty</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={nodeConfig.value || ''}
                        onChange={(e) => setNodeConfig({ ...nodeConfig, value: e.target.value })}
                        placeholder="Value"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedNode.data.type === 'synthesize' && (
                <div>
                  <Label>Synthesis Instructions</Label>
                  <Textarea
                    value={nodeConfig.instructions || ''}
                    onChange={(e) => setNodeConfig({ ...nodeConfig, instructions: e.target.value })}
                    placeholder="Instructions for generating the response"
                    rows={4}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNodeConfig(false)}>
                  Cancel
                </Button>
                <Button onClick={updateNodeConfig}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WorkflowDesigner(props: WorkflowDesignerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowDesignerContent {...props} />
    </ReactFlowProvider>
  );
} 