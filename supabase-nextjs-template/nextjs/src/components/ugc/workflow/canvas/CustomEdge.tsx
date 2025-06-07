'use client';

import React, { useState } from 'react';
import { 
  EdgeProps, 
  getSmoothStepPath, 
  EdgeLabelRenderer,
  useReactFlow 
} from 'reactflow';
import { X } from 'lucide-react';

export const CustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  style = {},
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { setEdges } = useReactFlow();

  // Calculate the path for the edge
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle removing the edge
  const handleRemoveEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    
    // Call the onRemove callback if provided
    if (data?.onRemove) {
      data.onRemove(id);
    }
  };

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={2}
        stroke={isHovered ? '#ef4444' : '#3b82f6'}
        fill="none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Invisible wider path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* X button that appears on hover */}
      {isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleRemoveEdge}
              className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
              title="Remove connection"
              onMouseEnter={() => setIsHovered(true)}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}; 