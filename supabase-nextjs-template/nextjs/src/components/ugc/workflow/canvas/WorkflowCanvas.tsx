'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Connection,
  BackgroundVariant,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  NodeTypes,
  MarkerType,
  NodeChange,
  EdgeChange,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ActionNode } from './NodeTypes/ActionNode';
import { ConditionNode } from './NodeTypes/ConditionNode';
import { WaitNode } from './NodeTypes/WaitNode';
import { HumanInterventionNode } from './NodeTypes/HumanInterventionNode';
import { StartNode } from './NodeTypes/StartNode';
import { EndNode } from './NodeTypes/EndNode';
import { ToolPalette } from './ToolPalette';
import { CustomEdge } from './CustomEdge';

import { UgcWorkflowStep, UgcWorkflowTemplate, StepType } from '@/lib/types/ugcWorkflow';

// Define custom node types
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  human_intervention: HumanInterventionNode,
};

// Define custom edge types
const edgeTypes = {
  custom: CustomEdge,
};

interface WorkflowCanvasProps {
  workflow: UgcWorkflowTemplate;
  steps: UgcWorkflowStep[];
  onStepSelect: (step: UgcWorkflowStep | null) => void;
  onStepUpdate: (step: UgcWorkflowStep) => void;
  onStepDelete: (stepId: string) => void;
  onStepDuplicate: (step: UgcWorkflowStep) => void;
  onStepCreate: (stepData: {
    type: StepType;
    position: { x: number; y: number };
    name: string;
  }) => void;
  onWorkflowUpdate: (workflow: UgcWorkflowTemplate) => void;
  selectedStep: UgcWorkflowStep | null;
}

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({
  workflow,
  steps,
  onStepSelect,
  onStepUpdate,
  onStepDelete,
  onStepDuplicate,
  onStepCreate,
  onWorkflowUpdate,
  selectedStep
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  // Convert workflow steps to ReactFlow nodes
  const convertStepsToNodes = useCallback((workflowSteps: UgcWorkflowStep[]): Node[] => {
    const nodes: Node[] = [];
    
    // Add start node with saved position or default
    const startPosition = workflow.canvas_layout?.start_position || { x: 100, y: 100 };
    nodes.push({
      id: 'start',
      type: 'start',
      position: startPosition,
      data: { 
        label: `Start: ${workflow.trigger_event}`,
        workflow 
      },
    });

    // Add workflow step nodes with saved positions
    workflowSteps.forEach((step, index) => {
      const savedPosition = step.canvas_position || {
        x: 100 + (index % 3) * 300, 
        y: 250 + Math.floor(index / 3) * 150 
      };
      
      nodes.push({
        id: step.id,
        type: step.step_type,
        position: savedPosition,
        data: {
          step,
          isSelected: selectedStep?.id === step.id,
          onSelect: () => onStepSelect(step),
          onUpdate: onStepUpdate,
          onDelete: () => onStepDelete(step.id),
          onDuplicate: () => onStepDuplicate(step),
        },
        selected: selectedStep?.id === step.id,
      });
    });

    // Add end node with saved position or default
    const endPosition = workflow.canvas_layout?.end_position || { 
      x: 100, 
      y: 250 + Math.ceil(workflowSteps.length / 3) * 150 
    };
    nodes.push({
      id: 'end',
      type: 'end',
      position: endPosition,
      data: { 
        label: 'End: Workflow Complete' 
      },
    });

    return nodes;
  }, [workflow, selectedStep, onStepSelect, onStepUpdate, onStepDelete, onStepDuplicate]);

  // Convert manual connections to edges
  const convertStepsToEdges = useCallback((workflowSteps: UgcWorkflowStep[]): Edge[] => {
    const edges: Edge[] = [];
    
    // Use manual connections from workflow layout if they exist
    const manualConnections = workflow.canvas_layout?.connections || [];
    
    if (manualConnections.length > 0) {
      // Use saved manual connections only
      manualConnections.forEach((connection) => {
        edges.push({
          id: connection.id,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'custom',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          data: {
            onRemove: (edgeId: string) => {
              const currentConnections = workflow.canvas_layout?.connections || [];
              const updatedConnections = currentConnections.filter(conn => conn.id !== edgeId);
              
              const updatedWorkflow = {
                ...workflow,
                canvas_layout: {
                  ...workflow.canvas_layout,
                  connections: updatedConnections
                }
              };
              onWorkflowUpdate(updatedWorkflow);
            }
          }
        });
      });
    } else if (workflowSteps.length === 0) {
      // Only create default connection for completely empty workflows
      edges.push({
        id: 'start-end',
        source: 'start',
        target: 'end',
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }
    // For workflows with steps but no manual connections, don't create any automatic connections
    // Users must manually connect steps

    return edges;
  }, [workflow, onWorkflowUpdate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(convertStepsToNodes(steps));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertStepsToEdges(steps));

  // Update nodes when steps change
  useEffect(() => {
    setNodes(convertStepsToNodes(steps));
    setEdges(convertStepsToEdges(steps));
  }, [steps, convertStepsToNodes, convertStepsToEdges, setNodes, setEdges]);

  // Save node positions when moved with debouncing and error handling
  const saveTimeout = useRef<NodeJS.Timeout>();
  
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Always apply the changes to the UI first
    onNodesChange(changes);
    
    // Process position changes with debouncing
    const positionChanges = changes.filter(
      (change): change is NodeChange & { type: 'position'; position: { x: number; y: number } } => 
        change.type === 'position' && 
        'position' in change && 
        change.position != null &&
        typeof change.position.x === 'number' &&
        typeof change.position.y === 'number'
    );

    if (positionChanges.length === 0) return;

    // Clear previous timeout
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = undefined;
    }

    // Debounce position saving to avoid too many API calls
    saveTimeout.current = setTimeout(async () => {
      try {
        for (const change of positionChanges) {
          if (!change.id || !change.position) continue;

          if (change.id === 'start') {
            // Save start node position
            const updatedWorkflow = {
              ...workflow,
              canvas_layout: {
                ...workflow.canvas_layout,
                start_position: change.position
              }
            };
            await onWorkflowUpdate(updatedWorkflow);
          } else if (change.id === 'end') {
            // Save end node position
            const updatedWorkflow = {
              ...workflow,
              canvas_layout: {
                ...workflow.canvas_layout,
                end_position: change.position
              }
            };
            await onWorkflowUpdate(updatedWorkflow);
          } else {
            // Save step position
            const step = steps.find(s => s.id === change.id);
            if (step) {
              const updatedStep = {
                ...step,
                canvas_position: change.position
              };
              await onStepUpdate(updatedStep);
            }
          }
        }
      } catch (error) {
        console.error('Error saving node positions:', error);
        // Silently fail - don't break the UI
      }
    }, 300); // 300ms debounce
  }, [onNodesChange, workflow, steps, onWorkflowUpdate, onStepUpdate]);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: {
          onRemove: (edgeId: string) => {
            const currentConnections = workflow.canvas_layout?.connections || [];
            const updatedConnections = currentConnections.filter(conn => conn.id !== edgeId);
            
            const updatedWorkflow = {
              ...workflow,
              canvas_layout: {
                ...workflow.canvas_layout,
                connections: updatedConnections
              }
            };
            onWorkflowUpdate(updatedWorkflow);
          }
        }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      // Save connection to workflow layout
      const newConnection = {
        id: `${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      };
      
      const currentConnections = workflow.canvas_layout?.connections || [];
      const updatedWorkflow = {
        ...workflow,
        canvas_layout: {
          ...workflow.canvas_layout,
          connections: [...currentConnections, newConnection]
        }
      };
      onWorkflowUpdate(updatedWorkflow);
    },
    [setEdges, workflow, onWorkflowUpdate]
  );

  // Handle edge deletion
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    
    // Handle edge deletions
    changes.forEach((change) => {
      if (change.type === 'remove') {
        const currentConnections = workflow.canvas_layout?.connections || [];
        const updatedConnections = currentConnections.filter(conn => conn.id !== change.id);
        
        const updatedWorkflow = {
          ...workflow,
          canvas_layout: {
            ...workflow.canvas_layout,
            connections: updatedConnections
          }
        };
        onWorkflowUpdate(updatedWorkflow);
      }
    });
  }, [onEdgesChange, workflow, onWorkflowUpdate]);

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id === 'start' || node.id === 'end') {
        onStepSelect(null);
        return;
      }
      
      const step = steps.find(s => s.id === node.id);
      if (step) {
        onStepSelect(step);
      }
    },
    [steps, onStepSelect]
  );

  // Handle dropping new nodes from tool palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      onStepCreate({
        type: type as StepType,
        position,
        name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Step`
      });
    },
    [project, onStepCreate]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Clear selection when clicking on canvas
  const onPaneClick = useCallback(() => {
    onStepSelect(null);
  }, [onStepSelect]);

  return (
    <div className="flex h-full">
      {/* Tool Palette */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <ToolPalette />
      </div>

      {/* Main Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          className="bg-gray-50"
          elementsSelectable={true}
          edgesUpdatable={true}
          edgesFocusable={true}
          connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
          connectionLineType={ConnectionLineType.SmoothStep}
        >
          <Controls 
            position="bottom-left"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <MiniMap 
            position="bottom-right"
            nodeStrokeColor="#374151"
            nodeColor="#f3f4f6"
            nodeBorderRadius={8}
            maskColor="rgb(240, 242, 247, 0.7)"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#e5e7eb"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}; 