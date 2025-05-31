'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui';
import { Loader2, Plus, X, Calculator, Target, Settings } from 'lucide-react';
import { 
  MetricWithData,
  CreateMetricRequest, 
  ScorecardMetric,
  CustomFormula
} from '@/lib/types/scorecard';

interface CustomMetricModalProps {
  existingMetrics: MetricWithData[];
  onClose: () => void;
  onMetricAdded: (metric: ScorecardMetric) => void;
}

export default function CustomMetricModal({ existingMetrics, onClose, onMetricAdded }: CustomMetricModalProps) {
  const [formData, setFormData] = useState<CreateMetricRequest>({
    name: '',
    description: '',
    type: 'custom',
    display_format: 'number',
    decimal_places: 2,
    status_calculation_method: 'average_based'
  });
  const [formula, setFormula] = useState<CustomFormula>({
    operation: 'divide',
    operands: ['', '']
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operations = [
    { value: 'add', label: 'Add (+)', symbol: '+' },
    { value: 'subtract', label: 'Subtract (-)', symbol: '-' },
    { value: 'multiply', label: 'Multiply (×)', symbol: '×' },
    { value: 'divide', label: 'Divide (÷)', symbol: '÷' }
  ];

  const addOperand = () => {
    setFormula({
      ...formula,
      operands: [...formula.operands, '']
    });
  };

  const removeOperand = (index: number) => {
    if (formula.operands.length > 2) {
      const newOperands = formula.operands.filter((_, i) => i !== index);
      setFormula({ ...formula, operands: newOperands });
    }
  };

  const updateOperand = (index: number, value: string) => {
    const newOperands = [...formula.operands];
    newOperands[index] = value;
    setFormula({ ...formula, operands: newOperands });
  };

  const validateFormula = () => {
    if (!formula.operands.every(op => op !== '')) {
      return 'All operands must be selected';
    }
    
    // Check for circular dependencies
    const usedMetricIds = formula.operands.filter(op => typeof op === 'string' && op !== '');
    const uniqueMetrics = new Set(usedMetricIds);
    if (uniqueMetrics.size !== usedMetricIds.length) {
      return 'Cannot use the same metric multiple times';
    }
    
    return null;
  };

  const getFormulaPreview = () => {
    const operationSymbol = operations.find(op => op.value === formula.operation)?.symbol || '';
    
    return formula.operands.map((operand, index) => {
      let displayValue = '';
      
      if (typeof operand === 'string' && operand) {
        const metric = existingMetrics.find(m => m.id === operand);
        displayValue = metric ? metric.name : 'Unknown Metric';
      } else if (typeof operand === 'number') {
        displayValue = operand.toString();
      } else {
        displayValue = '?';
      }
      
      if (index === 0) {
        return displayValue;
      }
      return ` ${operationSymbol} ${displayValue}`;
    }).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validationError = validateFormula();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const usedMetricIds = formula.operands
        .filter(op => typeof op === 'string' && op !== '') as string[];

      const newMetric: ScorecardMetric = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: 'current-user',
        ...formData,
        custom_formula: formula,
        custom_metrics_used: usedMetricIds,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_calculation_method: formData.status_calculation_method || 'average_based',
        display_format: formData.display_format || 'number',
        decimal_places: formData.decimal_places || 2
      };

      onMetricAdded(newMetric);
    } catch {
      setError('Failed to create custom metric. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div>
          <Label htmlFor="name">Metric Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., Custom ROAS Ratio"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Describe what this custom metric calculates..."
            rows={2}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Formula Builder */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Formula</h3>
          </div>

          {/* Operation Selection */}
          <div>
            <Label htmlFor="operation">Operation</Label>
            <Select value={formula.operation} onValueChange={(value) => setFormula({...formula, operation: value as 'add' | 'subtract' | 'multiply' | 'divide'})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operations.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operands */}
          <div className="space-y-3">
            <Label>Operands</Label>
            {formula.operands.map((operand, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select 
                  value={typeof operand === 'string' ? operand : ''} 
                  onValueChange={(value) => updateOperand(index, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a metric..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingMetrics.map((metric) => (
                      <SelectItem key={metric.id} value={metric.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{metric.name}</span>
                          <span className="text-xs text-gray-500">{metric.type === 'meta_api' ? 'Meta API' : 'Custom'}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formula.operands.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOperand(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOperand}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Operand
            </Button>
          </div>

          {/* Formula Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Formula Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm bg-gray-50 p-3 rounded border">
                {getFormulaPreview() || 'Select metrics to see formula preview...'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Goals Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Goals</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weekly_goal">Weekly Goal</Label>
              <Input
                id="weekly_goal"
                type="number"
                step="0.01"
                value={formData.weekly_goal || ''}
                onChange={(e) => setFormData({...formData, weekly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="monthly_goal">Monthly Goal</Label>
              <Input
                id="monthly_goal"
                type="number"
                step="0.01"
                value={formData.monthly_goal || ''}
                onChange={(e) => setFormData({...formData, monthly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="quarterly_goal">Quarterly Goal</Label>
              <Input
                id="quarterly_goal"
                type="number"
                step="0.01"
                value={formData.quarterly_goal || ''}
                onChange={(e) => setFormData({...formData, quarterly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="annual_goal">Annual Goal</Label>
              <Input
                id="annual_goal"
                type="number"
                step="0.01"
                value={formData.annual_goal || ''}
                onChange={(e) => setFormData({...formData, annual_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Display Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium">Display Settings</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_format">Format</Label>
              <Select 
                value={formData.display_format || 'number'} 
                onValueChange={(value) => setFormData({...formData, display_format: value as 'number' | 'currency' | 'percentage'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency ($)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="decimal_places">Decimal Places</Label>
              <Input
                id="decimal_places"
                type="number"
                min="0"
                max="4"
                value={formData.decimal_places || 2}
                onChange={(e) => setFormData({...formData, decimal_places: parseInt(e.target.value) || 2})}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !formData.name || !formula.operands.every(op => op !== '')}
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Custom Metric
        </Button>
      </div>
    </form>
  );
} 