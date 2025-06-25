'use client';

import React, { useState, useEffect } from 'react';
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
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Card,
  CardContent
} from '@/components/ui';
import { 
  Plus,
  X,
  Calculator,
  Filter,
  Target
} from 'lucide-react';
import { Metric } from './ScorecardMetrics';

interface MetricConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: Metric | null;
  onSave: (metric: Partial<Metric>) => void;
}

const META_METRICS = [
  { key: 'spend', name: 'Spend', category: 'Cost' },
  { key: 'impressions', name: 'Impressions', category: 'Reach' },
  { key: 'clicks', name: 'Clicks', category: 'Engagement' },
  { key: 'cpm', name: 'CPM', category: 'Cost' },
  { key: 'cpc', name: 'CPC', category: 'Cost' },
  { key: 'ctr', name: 'CTR', category: 'Engagement' },
  { key: 'conversions', name: 'Conversions', category: 'Performance' },
  { key: 'purchase_roas', name: 'Purchase ROAS', category: 'Performance' },
  { key: 'purchases', name: 'Purchases', category: 'Performance' },
  { key: 'purchase_value', name: 'Purchase Value', category: 'Performance' },
  { key: 'link_clicks', name: 'Link Clicks', category: 'Engagement' },
  { key: 'unique_link_clicks', name: 'Unique Link Clicks', category: 'Engagement' },
  { key: 'cost_per_unique_link_click', name: 'Cost per Unique Link Click', category: 'Cost' }
];

export default function MetricConfigModal({ 
  open, 
  onOpenChange, 
  metric, 
  onSave 
}: MetricConfigModalProps) {
  const [formData, setFormData] = useState({
    metric_key: '',
    display_name: '',
    goal_value: '',
    goal_operator: 'gte',
    formula: [] as any[],
    campaign_name_filters: [] as any[],
    ad_set_name_filters: [] as any[],
    ad_name_filters: [] as any[]
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [formulaInput, setFormulaInput] = useState('');

  useEffect(() => {
    if (metric) {
      setFormData({
        metric_key: metric.metric_key || '',
        display_name: metric.display_name || '',
        goal_value: metric.goal_value?.toString() || '',
        goal_operator: metric.goal_operator || 'gte',
        formula: metric.formula || [],
        campaign_name_filters: [],
        ad_set_name_filters: [],
        ad_name_filters: []
      });
      
      // Build formula string from formula array
      if (metric.formula && metric.formula.length > 0) {
        const formulaString = metric.formula
          .map(item => {
            if (item.type === 'metric') {
              const metricDef = META_METRICS.find(m => m.key === item.value);
              return metricDef?.name || item.value;
            }
            return item.value;
          })
          .join(' ');
        setFormulaInput(formulaString);
      }
    } else {
      setFormData({
        metric_key: '',
        display_name: '',
        goal_value: '',
        goal_operator: 'gte',
        formula: [],
        campaign_name_filters: [],
        ad_set_name_filters: [],
        ad_name_filters: []
      });
      setFormulaInput('');
    }
  }, [metric]);

  const handleAddMetricToFormula = (metricKey: string, metricName: string) => {
    setFormulaInput(formulaInput + (formulaInput ? ' ' : '') + metricName);
    setFormData({
      ...formData,
      formula: [
        ...formData.formula,
        { type: 'metric', value: metricKey, displayValue: metricName }
      ]
    });
  };

  const handleAddOperatorToFormula = (operator: string) => {
    setFormulaInput(formulaInput + ' ' + operator + ' ');
    setFormData({
      ...formData,
      formula: [
        ...formData.formula,
        { type: 'operator', value: operator }
      ]
    });
  };

  const handleFormulaInputChange = (value: string) => {
    setFormulaInput(value);
    
    // Parse formula string into formula array
    const tokens = value.split(/\s+/).filter(t => t.length > 0);
    const formula: any[] = [];
    
    tokens.forEach(token => {
      if (['+', '-', '*', '/', '(', ')'].includes(token)) {
        formula.push({ type: 'operator', value: token });
      } else if (!isNaN(Number(token))) {
        formula.push({ type: 'number', value: token });
      } else {
        // Try to match to a metric
        const metricMatch = META_METRICS.find(m => 
          m.name.toLowerCase() === token.toLowerCase()
        );
        if (metricMatch) {
          formula.push({ 
            type: 'metric', 
            value: metricMatch.key, 
            displayValue: metricMatch.name 
          });
        } else {
          formula.push({ type: 'metric', value: token });
        }
      }
    });
    
    setFormData({ ...formData, formula });
  };

  const handleSubmit = () => {
    const metricData: Partial<Metric> = {
      ...(metric?.id && { id: metric.id }),
      metric_key: formData.metric_key || formData.display_name.toLowerCase().replace(/\s+/g, '_'),
      display_name: formData.display_name,
      goal_value: formData.goal_value ? parseFloat(formData.goal_value) : undefined,
      goal_operator: formData.goal_operator,
      formula: formData.formula,
      meta_campaigns: [] // Will be populated from campaign filters
    };
    
    onSave(metricData);
  };

  const isValid = formData.display_name && formData.formula.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {metric ? 'Edit Metric' : 'Create New Metric'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="formula">Formula</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="display_name">Metric Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Meta Account ROAS"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal_value">Goal Value</Label>
                <Input
                  id="goal_value"
                  type="number"
                  value={formData.goal_value}
                  onChange={(e) => setFormData({ ...formData, goal_value: e.target.value })}
                  placeholder="e.g., 2.5"
                />
              </div>
              
              <div>
                <Label htmlFor="goal_operator">Goal Condition</Label>
                <Select
                  value={formData.goal_operator}
                  onValueChange={(value) => setFormData({ ...formData, goal_operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">Greater than or equal (≥)</SelectItem>
                    <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                    <SelectItem value="lte">Less than or equal (≤)</SelectItem>
                    <SelectItem value="lt">Less than (&lt;)</SelectItem>
                    <SelectItem value="eq">Equal (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="formula" className="space-y-4">
            <div>
              <Label>Formula Builder</Label>
              <Textarea
                value={formulaInput}
                onChange={(e) => handleFormulaInputChange(e.target.value)}
                placeholder="e.g., Purchase Value / Spend"
                className="font-mono"
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-2">
                Build your formula using the metrics below or type directly
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                {['+', '-', '*', '/', '(', ')'].map(op => (
                  <Button
                    key={op}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOperatorToFormula(op)}
                  >
                    {op}
                  </Button>
                ))}
              </div>
              
              <div>
                <Label>Available Metrics</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto">
                  {Object.entries(
                    META_METRICS.reduce((acc, metric) => {
                      if (!acc[metric.category]) {
                        acc[metric.category] = [];
                      }
                      acc[metric.category].push(metric);
                      return acc;
                    }, {} as Record<string, typeof META_METRICS>)
                  ).map(([category, metrics]) => (
                    <div key={category}>
                      <div className="text-sm font-medium text-gray-600 mb-1">{category}</div>
                      {metrics.map(metric => (
                        <Button
                          key={metric.key}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => handleAddMetricToFormula(metric.key, metric.name)}
                        >
                          {metric.name}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {formData.formula.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium mb-2">Parsed Formula:</div>
                  <div className="flex flex-wrap gap-1">
                    {formData.formula.map((item, index) => (
                      <Badge key={index} variant={item.type === 'metric' ? 'default' : 'secondary'}>
                        {item.displayValue || item.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="filters" className="space-y-4">
            <div>
              <Label>Campaign Filters</Label>
              <p className="text-sm text-gray-500 mb-2">
                Filter which campaigns to include in this metric
              </p>
              <Button variant="outline" size="sm" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Add Campaign Filter
              </Button>
            </div>
            
            <div>
              <Label>Ad Set Filters</Label>
              <p className="text-sm text-gray-500 mb-2">
                Filter which ad sets to include in this metric
              </p>
              <Button variant="outline" size="sm" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Add Ad Set Filter
              </Button>
            </div>
            
            <div>
              <Label>Ad Filters</Label>
              <p className="text-sm text-gray-500 mb-2">
                Filter which ads to include in this metric
              </p>
              <Button variant="outline" size="sm" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Add Ad Filter
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 italic">
              Filters will be available in a future update
            </p>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {metric ? 'Update' : 'Create'} Metric
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}