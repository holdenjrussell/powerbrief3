'use client';

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent
} from '@/components/ui';
import { Plus, X, Info } from 'lucide-react';
import { ScorecardMetric } from '@/lib/types/scorecard';

interface CampaignFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: ScorecardMetric;
  onSave: (filters: CampaignFilter[]) => void;
}

interface CampaignFilter {
  operator: 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'equals';
  value: string;
  case_sensitive?: boolean;
}

export default function CampaignFilterModal({ 
  open, 
  onOpenChange, 
  metric,
  onSave 
}: CampaignFilterModalProps) {
  const [filters, setFilters] = useState<CampaignFilter[]>(
    metric.meta_campaigns || [{ operator: 'contains', value: '', case_sensitive: false }]
  );

  const filterOperators = [
    { value: 'contains', label: 'Contains', description: 'Campaign name includes this text' },
    { value: 'not_contains', label: 'Does not contain', description: 'Campaign name excludes this text' },
    { value: 'starts_with', label: 'Starts with', description: 'Campaign name begins with this text' },
    { value: 'ends_with', label: 'Ends with', description: 'Campaign name ends with this text' },
    { value: 'equals', label: 'Equals exactly', description: 'Campaign name matches exactly' }
  ];

  const addFilter = () => {
    setFilters([...filters, { operator: 'contains', value: '', case_sensitive: false }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, filter: CampaignFilter) => {
    const updated = [...filters];
    updated[index] = filter;
    setFilters(updated);
  };

  const handleSave = () => {
    // Remove empty filters
    const validFilters = filters.filter(f => f.value.trim() !== '');
    onSave(validFilters);
  };

  const getPreview = () => {
    const validFilters = filters.filter(f => f.value.trim() !== '');
    if (validFilters.length === 0) return 'All campaigns';
    
    return validFilters.map((filter, index) => {
      const op = filterOperators.find(o => o.value === filter.operator);
      return `${index > 0 ? ' AND ' : ''}${op?.label} "${filter.value}"`;
    }).join('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campaign Filters for {metric.display_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Filter campaigns for this metric</p>
              <p className="mt-1">Only campaigns matching these filters will be included in the metric calculation.</p>
            </div>
          </div>

          <div className="space-y-3">
            {filters.map((filter, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Operator</Label>
                        <Select 
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(index, { ...filter, operator: value as CampaignFilter['operator'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOperators.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                <div>
                                  <div className="font-medium">{op.label}</div>
                                  <div className="text-xs text-gray-500">{op.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-600">Value</Label>
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { ...filter, value: e.target.value })}
                          placeholder="e.g., creative_testing"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
                        <input
                          type="checkbox"
                          checked={filter.case_sensitive || false}
                          onChange={(e) => updateFilter(index, { ...filter, case_sensitive: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Case sensitive
                      </label>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addFilter}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium">Preview:</Label>
            <p className="text-sm text-gray-700 mt-1">
              This metric will include campaigns that match: <strong>{getPreview()}</strong>
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 