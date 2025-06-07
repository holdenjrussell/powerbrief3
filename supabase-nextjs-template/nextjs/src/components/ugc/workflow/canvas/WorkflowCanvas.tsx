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
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ActionNode } from './NodeTypes/ActionNode';
import { ConditionNode } from './NodeTypes/ConditionNode';
import { WaitNode } from './NodeTypes/WaitNode';
import { HumanInterventionNode } from './NodeTypes/HumanInterventionNode';
import { StartNode } from './NodeTypes/StartNode';
import { EndNode } from './NodeTypes/EndNode';
import { ToolPalette } from './ToolPalette';

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
  selectedStep
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  // Convert workflow steps to ReactFlow nodes
  const convertStepsToNodes = useCallback((workflowSteps: UgcWorkflowStep[]): Node[] => {
    const nodes: Node[] = [];
    
    // Add start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { 
        label: `Start: ${workflow.trigger_event}`,
        workflow 
      },
      draggable: false,
    });

    // Add workflow step nodes
    workflowSteps.forEach((step, index) => {
      nodes.push({
        id: step.id,
        type: step.step_type,
        position: { 
          x: 100 + (index % 3) * 300, 
          y: 250 + Math.floor(index / 3) * 150 
        },
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

    // Add end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { 
        x: 100, 
        y: 250 + Math.ceil(workflowSteps.length / 3) * 150 
      },
      data: { 
        label: 'End: Workflow Complete' 
      },
      draggable: false,
    });

    return nodes;
  }, [workflow, selectedStep, onStepSelect, onStepUpdate, onStepDelete, onStepDuplicate]);

  // Convert steps to edges (connections)
  const convertStepsToEdges = useCallback((workflowSteps: UgcWorkflowStep[]): Edge[] => {
    const edges: Edge[] = [];
    
    if (workflowSteps.length === 0) {
      // Direct connection from start to end if no steps
      edges.push({
        id: 'start-end',
        source: 'start',
        target: 'end',
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    } else {
      // Connect start to first step
      edges.push({
        id: 'start-first',
        source: 'start',
        target: workflowSteps[0].id,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });

      // Connect steps in sequence
      for (let i = 0; i < workflowSteps.length - 1; i++) {
        edges.push({
          id: `${workflowSteps[i].id}-${workflowSteps[i + 1].id}`,
          source: workflowSteps[i].id,
          target: workflowSteps[i + 1].id,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }

      // Connect last step to end
      edges.push({
        id: 'last-end',
        source: workflowSteps[workflowSteps.length - 1].id,
        target: 'end',
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
    }

    return edges;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(convertStepsToNodes(steps));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertStepsToEdges(steps));

  // Update nodes when steps change
  useEffect(() => {
    setNodes(convertStepsToNodes(steps));
    setEdges(convertStepsToEdges(steps));
  }, [steps, convertStepsToNodes, convertStepsToEdges, setNodes, setEdges]);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          className="bg-gray-50"
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