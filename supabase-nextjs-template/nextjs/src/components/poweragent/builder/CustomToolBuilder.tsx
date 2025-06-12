import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  X,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'built-in' | 'custom' | 'mcp';
  category?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
}

interface CustomToolBuilderProps {
  tool?: Tool | null;
  onSave: (tool: Tool) => void;
  onCancel: () => void;
}

interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export default function CustomToolBuilder({ tool, onSave, onCancel }: CustomToolBuilderProps) {
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tool?.parameters) {
      // Convert parameters from Zod schema format to our format
      // This is a simplified version - in production you'd parse the actual schema
      const params: Parameter[] = [];
      Object.entries(tool.parameters).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          params.push({
            name: key,
            type: 'string', // Default type
            description: '',
            required: true
          });
        }
      });
      setParameters(params);
    }
  }, [tool]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Tool name is required';
    } else if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
      newErrors.name = 'Tool name must be lowercase with underscores (e.g., get_weather)';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (parameters.length === 0) {
      newErrors.parameters = 'At least one parameter is recommended';
    }
    
    parameters.forEach((param, index) => {
      if (!param.name.trim()) {
        newErrors[`param_${index}_name`] = 'Parameter name is required';
      } else if (!/^[a-z_][a-z0-9_]*$/.test(param.name)) {
        newErrors[`param_${index}_name`] = 'Parameter name must be lowercase with underscores';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddParameter = () => {
    setParameters([...parameters, {
      name: '',
      type: 'string',
      description: '',
      required: true
    }]);
  };

  const handleUpdateParameter = (index: number, field: keyof Parameter, value: string | boolean) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    setParameters(newParams);
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const generateZodSchema = () => {
    const paramEntries = parameters.map(param => {
      const zodType = param.type === 'number' ? 'z.number()' : 'z.string()';
      const zodChain = param.description ? `${zodType}.describe("${param.description}")` : zodType;
      return `    ${param.name}: ${zodChain}${param.required ? '' : '.optional()'}`;
    });
    
    return `z.object({\n${paramEntries.join(',\n')}\n  })`;
  };

  const generateExecuteFunction = () => {
    const paramNames = parameters.map(p => p.name).join(', ');
    return `async ({ ${paramNames} }) => {
    // Implementation for ${name}
    console.log('Executing ${name} with:', { ${paramNames} });
    
    // Add your tool logic here
    // Example: Call an API, process data, etc.
    
    return {
      success: true,
      result: 'Tool executed successfully'
    };
  }`;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    const toolData: Tool = {
      id: tool?.id || '',
      name,
      description,
      type: 'custom',
      parameters: parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
          required: param.required
        };
        return acc;
      }, {} as Record<string, unknown>),
      enabled: true
    };
    
    onSave(toolData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {tool ? 'Edit Custom Tool' : 'Create Custom Tool'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tool-name">Tool Name *</Label>
          <Input
            id="tool-name"
            placeholder="e.g., get_weather"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
          <p className="text-sm text-gray-500">
            Use lowercase with underscores
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-description">Description *</Label>
          <Textarea
            id="tool-description"
            placeholder="Describe what this tool does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Parameters</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddParameter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </div>
          
          {errors.parameters && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.parameters}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {parameters.map((param, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="parameter_name"
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                        className={errors[`param_${index}_name`] ? 'border-red-500' : ''}
                      />
                      {errors[`param_${index}_name`] && (
                        <p className="text-xs text-red-500">{errors[`param_${index}_name`]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={param.type}
                        onChange={(e) => handleUpdateParameter(index, 'type', e.target.value)}
                        aria-label="Parameter type"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                        <option value="object">Object</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="What this parameter is for..."
                      value={param.description}
                      onChange={(e) => handleUpdateParameter(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => handleUpdateParameter(index, 'required', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Required</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParameter(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {parameters.length > 0 && (
          <div className="space-y-2">
            <Label>Generated Zod Schema</Label>
            <pre className="p-3 bg-gray-100 rounded-md text-sm overflow-x-auto">
              <code>{generateZodSchema()}</code>
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <Label>Execute Function Template</Label>
          <pre className="p-3 bg-gray-100 rounded-md text-sm overflow-x-auto">
            <code>{generateExecuteFunction()}</code>
          </pre>
          <p className="text-sm text-gray-500">
            Copy this template and implement your tool&apos;s logic
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {tool ? 'Update Tool' : 'Create Tool'}
        </Button>
      </div>
    </div>
  );
} 