import React from 'react';
import { 
  Video, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Trash2, 
  Edit2,
  GripVertical,
  Image,
  MousePointerClick,
  Layout,
  FileText
} from 'lucide-react';
import { WireframeModule as WireframeModuleType, ModuleType } from '@/lib/types/powerframe';

interface WireframeModuleProps {
  module: WireframeModuleType & { name?: string };
  isSelected: boolean;
  isDragging: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right') => void;
  onNameChange: (name: string) => void;
  children?: React.ReactNode;
}

const moduleIcons: Record<ModuleType, React.ElementType> = {
  text: FileText,
  video: Video,
  button: MousePointerClick,
  container: Image,
  header: Layout,
  footer: Layout
};

const moduleColors: Record<ModuleType, string> = {
  text: 'bg-blue-50 border-blue-200 hover:border-blue-300',
  video: 'bg-purple-50 border-purple-200 hover:border-purple-300',
  button: 'bg-green-50 border-green-200 hover:border-green-300',
  container: 'bg-gray-50 border-gray-200 hover:border-gray-300',
  header: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
  footer: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300'
};

export default function WireframeModule({
  module,
  isSelected,
  isDragging,
  isEditing,
  onSelect,
  onEdit,
  onDelete,
  onAlignmentChange,
  onNameChange,
  children
}: WireframeModuleProps) {
  const Icon = moduleIcons[module.type];
  const colorClass = moduleColors[module.type];

  return (
    <div
      className={`
        relative group border-2 rounded-lg transition-all cursor-move
        ${colorClass}
        ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isEditing ? 'z-10' : ''}
      `}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Drag handle */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-move z-10">
        <GripVertical className="h-4 w-4 text-gray-500" />
      </div>
      
      {/* Module header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <div className="flex items-center space-x-2 flex-1 ml-6">
          <Icon className="h-4 w-4 text-gray-600" />
          {isEditing ? (
            <input
              type="text"
              className="text-xs px-2 py-1 border rounded flex-1"
              value={module.name || module.type}
              onChange={(e) => onNameChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              title="Module name"
              placeholder="Enter module name"
              autoFocus
            />
          ) : (
            <span 
              className="text-xs text-gray-700 font-medium cursor-pointer hover:text-gray-900 flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              {module.name || module.type}
              <Edit2 className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" />
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Alignment buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('left');
            }}
            className={`p-1 rounded transition-colors ${
              module.alignment === 'left' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            aria-label="Align left"
          >
            <AlignLeft className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('center');
            }}
            className={`p-1 rounded transition-colors ${
              module.alignment === 'center' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            aria-label="Align center"
          >
            <AlignCenter className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('right');
            }}
            className={`p-1 rounded transition-colors ${
              module.alignment === 'right' ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            aria-label="Align right"
          >
            <AlignRight className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            aria-label="Delete module"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {/* Module content */}
      <div className={`p-3 text-${module.alignment} overflow-hidden`}>
        {children}
      </div>
      
      {/* Visual type indicator */}
      <div className="absolute bottom-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="h-8 w-8" />
      </div>
    </div>
  );
} 