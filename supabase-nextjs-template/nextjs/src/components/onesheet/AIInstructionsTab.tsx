import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Plus, Edit2, Save, Sparkles } from 'lucide-react';

interface AIInstructionsTabProps {
  onesheetId: string;
  brandId: string;
}

interface AnalysisField {
  name: string;
  description?: string;
}

interface AnalysisFields {
  type: AnalysisField[];
  angle: AnalysisField[];
  format: AnalysisField[];
  emotion: AnalysisField[];
  framework: AnalysisField[];
}

export function AIInstructionsTab({ onesheetId, brandId }: AIInstructionsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  
  // Content Variables & Awareness Levels
  const [contentVariables, setContentVariables] = React.useState<Array<{name: string; description: string}>>([]);
  const [awarenessLevels, setAwarenessLevels] = React.useState<Array<{name: string; description: string}>>([]);
  const [contentVariablesReturnMultiple, setContentVariablesReturnMultiple] = React.useState(false);
  const [contentVariablesSelectionGuidance, setContentVariablesSelectionGuidance] = React.useState('');
  const [contentVariablesAllowNew, setContentVariablesAllowNew] = React.useState(true);
  const [awarenessLevelsAllowNew, setAwarenessLevelsAllowNew] = React.useState(true);
  
  // Analysis Fields
  const [analysisFields, setAnalysisFields] = React.useState<AnalysisFields>({
    type: [],
    angle: [],
    format: [],
    emotion: [],
    framework: []
  });
  const [allowNewAnalysisValues, setAllowNewAnalysisValues] = React.useState({
    type: true,
    angle: true,
    format: true,
    emotion: true,
    framework: true
  });
  
  // All Prompts
  const [typePrompt, setTypePrompt] = React.useState('');
  const [adDurationPrompt, setAdDurationPrompt] = React.useState('');
  const [productIntroPrompt, setProductIntroPrompt] = React.useState('');
  const [sitInProblemSecondsPrompt, setSitInProblemSecondsPrompt] = React.useState('');
  const [sitInProblemPrompt, setSitInProblemPrompt] = React.useState('');
  const [anglePrompt, setAnglePrompt] = React.useState('');
  const [formatPrompt, setFormatPrompt] = React.useState('');
  const [emotionPrompt, setEmotionPrompt] = React.useState('');
  const [frameworkPrompt, setFrameworkPrompt] = React.useState('');
  const [transcriptionPrompt, setTranscriptionPrompt] = React.useState('');
  const [visualDescriptionPrompt, setVisualDescriptionPrompt] = React.useState('');
  
  // System & Master Prompts
  const [systemInstructions, setSystemInstructions] = React.useState('');
  const [masterPromptTemplate, setMasterPromptTemplate] = React.useState('');
  const [analyzeModel, setAnalyzeModel] = React.useState('gemini-2.5-flash-lite-preview-06-17');
  const [responseSchema, setResponseSchema] = React.useState<Record<string, unknown>>({});
  const [strategistResponseSchema, setStrategistResponseSchema] = React.useState<Record<string, unknown>>({});
  
  // Strategist Settings
  const [strategistModel, setStrategistModel] = React.useState('gemini-2.5-pro');
  const [strategistSystemInstructions, setStrategistSystemInstructions] = React.useState('');
  const [strategistPromptTemplate, setStrategistPromptTemplate] = React.useState('');
  const [benchmarkRoas, setBenchmarkRoas] = React.useState(0);
  const [benchmarkHookRate, setBenchmarkHookRate] = React.useState(0);
  const [benchmarkHoldRate, setBenchmarkHoldRate] = React.useState(0);
  const [benchmarkSpend, setBenchmarkSpend] = React.useState(0);
  const [iterationCount, setIterationCount] = React.useState(5);
  const [iterationTypes, setIterationTypes] = React.useState<Array<{name: string; description: string}>>([]);
  const [lowPerformerCriteria, setLowPerformerCriteria] = React.useState({
    minSpend: 50,
    maxSpend: 500,
    maxRoas: 1.0,
    enabled: true
  });
  
  // Discovered Values
  const [discoveredContentVariables, setDiscoveredContentVariables] = React.useState<string[]>([]);
  const [discoveredAwarenessLevels, setDiscoveredAwarenessLevels] = React.useState<string[]>([]);
  
  // Edit States
  const [editingVariable, setEditingVariable] = React.useState<number | null>(null);
  const [editingLevel, setEditingLevel] = React.useState<number | null>(null);
  const [editingField, setEditingField] = React.useState<{type: keyof AnalysisFields; index: number} | null>(null);
  const [newVariable, setNewVariable] = React.useState({ name: '', description: '' });
  const [newLevel, setNewLevel] = React.useState({ name: '', description: '' });
  const [newFieldValue, setNewFieldValue] = React.useState<{[key in keyof AnalysisFields]: {name: string; description: string}}>({
    type: { name: '', description: '' },
    angle: { name: '', description: '' },
    format: { name: '', description: '' },
    emotion: { name: '', description: '' },
    framework: { name: '', description: '' }
  });

  const fetchInstructions = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/onesheet/ai-instructions?onesheet_id=${onesheetId}`);
      if (!response.ok) throw new Error('Failed to fetch AI instructions');
      
      const result = await response.json();
      if (result.data) {
        populateFormData(result.data);
      }
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
      toast({
        title: "Error",
        description: "Failed to load AI instructions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [onesheetId, toast]);

  React.useEffect(() => {
    fetchInstructions();
  }, [fetchInstructions]);

  const populateFormData = (data: Record<string, unknown>) => {
    // Content Variables & Awareness Levels
    setContentVariables(Array.isArray(data.content_variables) ? data.content_variables : []);
    setAwarenessLevels(Array.isArray(data.awareness_levels) ? data.awareness_levels : []);
    setContentVariablesReturnMultiple(!!data.content_variables_return_multiple);
    setContentVariablesSelectionGuidance((data.content_variables_selection_guidance as string) || '');
    setContentVariablesAllowNew(data.content_variables_allow_new !== false);
    setAwarenessLevelsAllowNew(data.awareness_levels_allow_new !== false);
    
    // Analysis Fields
    if (data.analysis_fields) {
      const fields = data.analysis_fields as Record<string, unknown>;
      console.log('Loading analysis fields:', fields);
      setAnalysisFields({
        type: Array.isArray(fields.type) ? fields.type as AnalysisField[] : [],
        angle: Array.isArray(fields.angle) ? fields.angle as AnalysisField[] : [],
        format: Array.isArray(fields.format) ? fields.format as AnalysisField[] : [],
        emotion: Array.isArray(fields.emotion) ? fields.emotion as AnalysisField[] : [],
        framework: Array.isArray(fields.framework) ? fields.framework as AnalysisField[] : []
      });
    }
    
    if (data.allow_new_analysis_values) {
      const allowNew = data.allow_new_analysis_values as Record<string, unknown>;
      setAllowNewAnalysisValues({
        type: allowNew.type !== false,
        angle: allowNew.angle !== false,
        format: allowNew.format !== false,
        emotion: allowNew.emotion !== false,
        framework: allowNew.framework !== false
      });
    }
    
    // All Prompts
    setTypePrompt((data.type_prompt as string) || '');
    setAdDurationPrompt((data.ad_duration_prompt as string) || '');
    setProductIntroPrompt((data.product_intro_prompt as string) || '');
    setSitInProblemSecondsPrompt((data.sit_in_problem_seconds_prompt as string) || '');
    setSitInProblemPrompt((data.sit_in_problem_prompt as string) || '');
    setAnglePrompt((data.angle_prompt as string) || '');
    setFormatPrompt((data.format_prompt as string) || '');
    setEmotionPrompt((data.emotion_prompt as string) || '');
    setFrameworkPrompt((data.framework_prompt as string) || '');
    setTranscriptionPrompt((data.transcription_prompt as string) || '');
    setVisualDescriptionPrompt((data.visual_description_prompt as string) || '');
    
    // System & Models
    setSystemInstructions((data.system_instructions as string) || '');
    setMasterPromptTemplate((data.master_prompt_template as string) || '');
    setAnalyzeModel((data.analyze_model as string) || 'gemini-2.5-flash-lite-preview-06-17');
    setStrategistModel((data.strategist_model as string) || 'gemini-2.5-pro');
    
    // Strategist Settings
    setStrategistSystemInstructions((data.strategist_system_instructions as string) || '');
    setStrategistPromptTemplate((data.strategist_prompt_template as string) || '');
    setBenchmarkRoas((data.benchmark_roas as number) || 0);
    setBenchmarkHookRate((data.benchmark_hook_rate as number) || 0);
    setBenchmarkHoldRate((data.benchmark_hold_rate as number) || 0);
    setBenchmarkSpend((data.benchmark_spend as number) || 0);
    
    // Load iteration types directly from the database field
    if (data.iteration_types && Array.isArray(data.iteration_types)) {
      setIterationTypes(data.iteration_types as Array<{name: string; description: string}>);
    }
    
    if (data.iteration_settings) {
      const iterationData = data.iteration_settings as Record<string, unknown>;
      setIterationCount((iterationData.default_count as number) || 5);
    }
    
    if (data.low_performer_criteria) {
      const criteriaData = data.low_performer_criteria as Record<string, unknown>;
      setLowPerformerCriteria({
        minSpend: (criteriaData.min_spend as number) || 50,
        maxSpend: (criteriaData.max_spend as number) || 500,
        maxRoas: (criteriaData.max_roas as number) || 1.0,
        enabled: criteriaData.enabled !== false
      });
    }
    
    // Discovered Values - Handle both string arrays and object arrays
    if (data.discovered_content_variables) {
      const discovered = Array.isArray(data.discovered_content_variables) 
        ? data.discovered_content_variables.flatMap(item => {
            if (typeof item === 'string') {
              // Split comma-separated values
              return item.includes(',') ? item.split(',').map(v => v.trim()) : [item];
            }
            if (typeof item === 'object' && item.name) return [item.name];
            return [];
          })
        : [];
      setDiscoveredContentVariables(discovered);
    }
    
    if (data.discovered_awareness_levels) {
      const discovered = Array.isArray(data.discovered_awareness_levels)
        ? data.discovered_awareness_levels.flatMap(item => {
            if (typeof item === 'string') {
              // Split comma-separated values
              return item.includes(',') ? item.split(',').map(v => v.trim()) : [item];
            }
            if (typeof item === 'object' && item.name) return [item.name];
            return [];
          })
        : [];
      setDiscoveredAwarenessLevels(discovered);
    }
    
    // Load response schemas
    if (data.response_schema) {
      setResponseSchema(data.response_schema as Record<string, unknown>);
    }
    if (data.strategist_response_schema) {
      setStrategistResponseSchema(data.strategist_response_schema as Record<string, unknown>);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving analysis fields:', analysisFields);
      const payload = {
        onesheet_id: onesheetId,
        brand_id: brandId,
        content_variables: contentVariables,
        awareness_levels: awarenessLevels,
        content_variables_return_multiple: contentVariablesReturnMultiple,
        content_variables_selection_guidance: contentVariablesSelectionGuidance,
        content_variables_allow_new: contentVariablesAllowNew,
        awareness_levels_allow_new: awarenessLevelsAllowNew,
        analysis_fields: analysisFields,
        allow_new_analysis_values: allowNewAnalysisValues,
        type_prompt: typePrompt,
        ad_duration_prompt: adDurationPrompt,
        product_intro_prompt: productIntroPrompt,
        sit_in_problem_seconds_prompt: sitInProblemSecondsPrompt,
        sit_in_problem_prompt: sitInProblemPrompt,
        angle_prompt: anglePrompt,
        format_prompt: formatPrompt,
        emotion_prompt: emotionPrompt,
        framework_prompt: frameworkPrompt,
        transcription_prompt: transcriptionPrompt,
        visual_description_prompt: visualDescriptionPrompt,
        system_instructions: systemInstructions,
        master_prompt_template: masterPromptTemplate,
        analyze_model: analyzeModel,
        strategist_model: strategistModel,
        strategist_system_instructions: strategistSystemInstructions,
        strategist_prompt_template: strategistPromptTemplate,
        benchmark_roas: benchmarkRoas,
        benchmark_hook_rate: benchmarkHookRate,
        benchmark_hold_rate: benchmarkHoldRate,
        benchmark_spend: benchmarkSpend,
        iteration_types: iterationTypes,
        iteration_settings: { 
          default_count: iterationCount
        },
        low_performer_criteria: lowPerformerCriteria,
        response_schema: responseSchema,
        strategist_response_schema: strategistResponseSchema
      };

      const response = await fetch('/api/onesheet/ai-instructions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save AI instructions');

      toast({
        title: "Success",
        description: "AI instructions saved successfully"
      });
    } catch (error) {
      console.error('Error saving AI instructions:', error);
      toast({
        title: "Error",
        description: "Failed to save AI instructions",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addDiscoveredVariable = (variable: string) => {
    if (!contentVariables.find(v => v.name === variable)) {
      setContentVariables([...contentVariables, { name: variable, description: '' }]);
    }
  };

  const addDiscoveredLevel = (level: string) => {
    if (!awarenessLevels.find(l => l.name === level)) {
      setAwarenessLevels([...awarenessLevels, { name: level, description: '' }]);
    }
  };

  const renderAnalysisFieldSection = (fieldType: keyof AnalysisFields, label: string) => {
    const fields = analysisFields[fieldType] || [];
    const allowNew = allowNewAnalysisValues[fieldType];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{label}</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor={`allow-new-${fieldType}`} className="text-sm">
              Allow AI to discover new
            </Label>
            <Switch
              id={`allow-new-${fieldType}`}
              checked={allowNew}
              onCheckedChange={(checked) => 
                setAllowNewAnalysisValues({...allowNewAnalysisValues, [fieldType]: checked})
              }
            />
          </div>
        </div>
        
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              {editingField?.type === fieldType && editingField?.index === index ? (
                <>
                  <Input
                    value={field.name}
                    onChange={(e) => {
                      const newFields = [...fields];
                      newFields[index] = { ...field, name: e.target.value };
                      setAnalysisFields({...analysisFields, [fieldType]: newFields});
                    }}
                    placeholder="Name"
                    className="flex-1"
                  />
                  <Input
                    value={field.description || ''}
                    onChange={(e) => {
                      const newFields = [...fields];
                      newFields[index] = { ...field, description: e.target.value };
                      setAnalysisFields({...analysisFields, [fieldType]: newFields});
                    }}
                    placeholder="Description (optional)"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newFields = fields.filter((_, i) => i !== index);
                      setAnalysisFields({...analysisFields, [fieldType]: newFields});
                      setEditingField(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-medium">{field.name}</span>
                    {field.description && (
                      <span className="text-sm text-muted-foreground ml-2">- {field.description}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField({ type: fieldType, index })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
          
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="New name"
              value={newFieldValue[fieldType].name}
              onChange={(e) => setNewFieldValue({
                ...newFieldValue,
                [fieldType]: { ...newFieldValue[fieldType], name: e.target.value }
              })}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newFieldValue[fieldType].name) {
                  setAnalysisFields({
                    ...analysisFields,
                    [fieldType]: [...fields, newFieldValue[fieldType]]
                  });
                  setNewFieldValue({
                    ...newFieldValue,
                    [fieldType]: { name: '', description: '' }
                  });
                }
              }}
            />
            <Input
              placeholder="Description (optional)"
              value={newFieldValue[fieldType].description}
              onChange={(e) => setNewFieldValue({
                ...newFieldValue,
                [fieldType]: { ...newFieldValue[fieldType], description: e.target.value }
              })}
            />
            <Button
              size="sm"
              onClick={() => {
                if (newFieldValue[fieldType].name) {
                  setAnalysisFields({
                    ...analysisFields,
                    [fieldType]: [...fields, newFieldValue[fieldType]]
                  });
                  setNewFieldValue({
                    ...newFieldValue,
                    [fieldType]: { name: '', description: '' }
                  });
                }
              }}
              disabled={!newFieldValue[fieldType].name}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AI instructions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Instructions Configuration</CardTitle>
              <CardDescription>
                Configure how AI analyzes your ads and generates insights
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="variables" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="strategist">Strategist</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
        </TabsList>

            <TabsContent value="variables" className="space-y-6">
              {/* Content Variables */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Content Variables</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="content-variables-multiple" className="text-sm">
                        Return Multiple
                      </Label>
                      <Switch
                        id="content-variables-multiple"
                        checked={contentVariablesReturnMultiple}
                        onCheckedChange={setContentVariablesReturnMultiple}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="content-variables-allow-new" className="text-sm">
                        Allow AI to discover new
                      </Label>
                      <Switch
                        id="content-variables-allow-new"
                        checked={contentVariablesAllowNew}
                        onCheckedChange={setContentVariablesAllowNew}
                      />
                    </div>
                  </div>
                </div>
                
                {contentVariablesReturnMultiple && (
                  <div>
                    <Label htmlFor="selection-guidance">Selection Guidance</Label>
                    <Textarea
                      id="selection-guidance"
                      value={contentVariablesSelectionGuidance}
                      onChange={(e) => setContentVariablesSelectionGuidance(e.target.value)}
                      placeholder="Provide guidance for AI when selecting multiple variables..."
                      rows={3}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  {contentVariables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {editingVariable === index ? (
                        <>
                          <Input
                            value={variable.name}
                            onChange={(e) => {
                              const newVariables = [...contentVariables];
                              newVariables[index] = { ...variable, name: e.target.value };
                              setContentVariables(newVariables);
                            }}
                            placeholder="Variable name"
                            className="flex-1"
                          />
                          <Input
                            value={variable.description}
                            onChange={(e) => {
                              const newVariables = [...contentVariables];
                              newVariables[index] = { ...variable, description: e.target.value };
                              setContentVariables(newVariables);
                            }}
                            placeholder="Description"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => setEditingVariable(null)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setContentVariables(contentVariables.filter((_, i) => i !== index));
                              setEditingVariable(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">{variable.name}</span>
                            {variable.description && (
                              <span className="text-sm text-muted-foreground ml-2">- {variable.description}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingVariable(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="New variable name"
                      value={newVariable.name}
                      onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newVariable.name) {
                          setContentVariables([...contentVariables, newVariable]);
                          setNewVariable({ name: '', description: '' });
                        }
                      }}
                    />
                    <Input
                      placeholder="Description"
                      value={newVariable.description}
                      onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newVariable.name) {
                          setContentVariables([...contentVariables, newVariable]);
                          setNewVariable({ name: '', description: '' });
                        }
                      }}
                      disabled={!newVariable.name}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {discoveredContentVariables.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">AI Discovered Variables</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {discoveredContentVariables.map((variable, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm border border-blue-200"
                        >
                          <span>{variable}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0.5 hover:bg-blue-100"
                            onClick={() => addDiscoveredVariable(variable)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Awareness Levels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Awareness Levels</Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="awareness-levels-allow-new" className="text-sm">
                      Allow AI to discover new
                    </Label>
                    <Switch
                      id="awareness-levels-allow-new"
                      checked={awarenessLevelsAllowNew}
                      onCheckedChange={setAwarenessLevelsAllowNew}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  {awarenessLevels.map((level, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {editingLevel === index ? (
                        <>
                          <Input
                            value={level.name}
                            onChange={(e) => {
                              const newLevels = [...awarenessLevels];
                              newLevels[index] = { ...level, name: e.target.value };
                              setAwarenessLevels(newLevels);
                            }}
                            placeholder="Level name"
                            className="flex-1"
                          />
                          <Input
                            value={level.description}
                            onChange={(e) => {
                              const newLevels = [...awarenessLevels];
                              newLevels[index] = { ...level, description: e.target.value };
                              setAwarenessLevels(newLevels);
                            }}
                            placeholder="Description"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => setEditingLevel(null)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAwarenessLevels(awarenessLevels.filter((_, i) => i !== index));
                              setEditingLevel(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">{level.name}</span>
                            {level.description && (
                              <span className="text-sm text-muted-foreground ml-2">- {level.description}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLevel(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="New level name"
                      value={newLevel.name}
                      onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newLevel.name) {
                          setAwarenessLevels([...awarenessLevels, newLevel]);
                          setNewLevel({ name: '', description: '' });
                        }
                      }}
                    />
                    <Input
                      placeholder="Description"
                      value={newLevel.description}
                      onChange={(e) => setNewLevel({ ...newLevel, description: e.target.value })}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newLevel.name) {
                          setAwarenessLevels([...awarenessLevels, newLevel]);
                          setNewLevel({ name: '', description: '' });
                        }
                      }}
                      disabled={!newLevel.name}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {discoveredAwarenessLevels.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">AI Discovered Levels</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {discoveredAwarenessLevels.map((level, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm border border-green-200"
                        >
                          <span>{level}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0.5 hover:bg-green-100"
                            onClick={() => addDiscoveredLevel(level)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Fields */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Analysis Fields</h3>
                {renderAnalysisFieldSection('type', 'Types')}
                {renderAnalysisFieldSection('angle', 'Angles')}
                {renderAnalysisFieldSection('format', 'Formats')}
                {renderAnalysisFieldSection('emotion', 'Emotions')}
                {renderAnalysisFieldSection('framework', 'Frameworks')}
              </div>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="type-prompt">Type Analysis Prompt</Label>
                  <Textarea
                    id="type-prompt"
                    value={typePrompt}
                    onChange={(e) => setTypePrompt(e.target.value)}
                    placeholder="Prompt for analyzing ad type..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="ad-duration-prompt">Ad Duration Analysis Prompt</Label>
                  <Textarea
                    id="ad-duration-prompt"
                    value={adDurationPrompt}
                    onChange={(e) => setAdDurationPrompt(e.target.value)}
                    placeholder="Prompt for analyzing ad duration..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="product-intro-prompt">Product Intro Analysis Prompt</Label>
                  <Textarea
                    id="product-intro-prompt"
                    value={productIntroPrompt}
                    onChange={(e) => setProductIntroPrompt(e.target.value)}
                    placeholder="Prompt for analyzing product introduction timing..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sit-in-problem-seconds-prompt">Sit in Problem Seconds Prompt</Label>
                  <Textarea
                    id="sit-in-problem-seconds-prompt"
                    value={sitInProblemSecondsPrompt}
                    onChange={(e) => setSitInProblemSecondsPrompt(e.target.value)}
                    placeholder="Prompt for analyzing sit in problem duration..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sit-in-problem-prompt">Sit in Problem Analysis Prompt</Label>
                  <Textarea
                    id="sit-in-problem-prompt"
                    value={sitInProblemPrompt}
                    onChange={(e) => setSitInProblemPrompt(e.target.value)}
                    placeholder="Prompt for analyzing sit in problem percentage..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="angle-prompt">Angle Analysis Prompt</Label>
                  <Textarea
                    id="angle-prompt"
                    value={anglePrompt}
                    onChange={(e) => setAnglePrompt(e.target.value)}
                    placeholder="Prompt for analyzing ad angle..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="format-prompt">Format Analysis Prompt</Label>
                  <Textarea
                    id="format-prompt"
                    value={formatPrompt}
                    onChange={(e) => setFormatPrompt(e.target.value)}
                    placeholder="Prompt for analyzing ad format..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="emotion-prompt">Emotion Analysis Prompt</Label>
                  <Textarea
                    id="emotion-prompt"
                    value={emotionPrompt}
                    onChange={(e) => setEmotionPrompt(e.target.value)}
                    placeholder="Prompt for analyzing emotional tone..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="framework-prompt">Framework Analysis Prompt</Label>
                  <Textarea
                    id="framework-prompt"
                    value={frameworkPrompt}
                    onChange={(e) => setFrameworkPrompt(e.target.value)}
                    placeholder="Prompt for analyzing creative framework..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="transcription-prompt">Transcription Prompt</Label>
                  <Textarea
                    id="transcription-prompt"
                    value={transcriptionPrompt}
                    onChange={(e) => setTranscriptionPrompt(e.target.value)}
                    placeholder="Prompt for generating transcription..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="visual-description-prompt">Visual Description Prompt</Label>
                  <Textarea
                    id="visual-description-prompt"
                    value={visualDescriptionPrompt}
                    onChange={(e) => setVisualDescriptionPrompt(e.target.value)}
                    placeholder="Prompt for generating visual description..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="analyze-model">Analysis Model</Label>
                  <Select value={analyzeModel} onValueChange={setAnalyzeModel}>
                    <SelectTrigger id="analyze-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash-lite-preview-06-17">Gemini 2.5 Flash Lite</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Model used for analyzing ad content and extracting attributes
                  </p>
                </div>

                <div>
                  <Label htmlFor="system-instructions">System Instructions</Label>
                  <Textarea
                    id="system-instructions"
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    placeholder="Core instructions that define the AI&apos;s role and expertise..."
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Core instructions that define the AI&apos;s role and expertise
                  </p>
                </div>

                <div>
                  <Label htmlFor="master-prompt">Master Prompt Template</Label>
                  <Textarea
                    id="master-prompt"
                    value={masterPromptTemplate}
                    onChange={(e) => setMasterPromptTemplate(e.target.value)}
                    placeholder="Main template for ad analysis..."
                    rows={8}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    The main template used for ad analysis. Uses placeholders like &quot;ad.name&quot;, &quot;typeOptions&quot;, etc.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="strategist" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="strategist-model">Strategist Model</Label>
                  <Select value={strategistModel} onValueChange={setStrategistModel}>
                    <SelectTrigger id="strategist-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Model used for strategic analysis and recommendations
                  </p>
                </div>

                <div>
                  <Label htmlFor="strategist-system">Strategist System Instructions</Label>
                  <Textarea
                    id="strategist-system"
                    value={strategistSystemInstructions}
                    onChange={(e) => setStrategistSystemInstructions(e.target.value)}
                    placeholder="System instructions for the AI strategist..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="strategist-prompt">Strategist Prompt Template</Label>
                  <Textarea
                    id="strategist-prompt"
                    value={strategistPromptTemplate}
                    onChange={(e) => setStrategistPromptTemplate(e.target.value)}
                    placeholder="Template for strategist analysis..."
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="benchmark-roas">Benchmark ROAS</Label>
                    <Input
                      id="benchmark-roas"
                      type="number"
                      step="0.1"
                      value={benchmarkRoas}
                      onChange={(e) => setBenchmarkRoas(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="benchmark-hook-rate">Benchmark Hook Rate (%)</Label>
                    <Input
                      id="benchmark-hook-rate"
                      type="number"
                      step="0.1"
                      value={benchmarkHookRate}
                      onChange={(e) => setBenchmarkHookRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="benchmark-hold-rate">Benchmark Hold Rate (%)</Label>
                    <Input
                      id="benchmark-hold-rate"
                      type="number"
                      step="0.1"
                      value={benchmarkHoldRate}
                      onChange={(e) => setBenchmarkHoldRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="benchmark-spend">Benchmark Spend ($)</Label>
                    <Input
                      id="benchmark-spend"
                      type="number"
                      step="1"
                      value={benchmarkSpend}
                      onChange={(e) => setBenchmarkSpend(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="iteration-count">Number of Top Ads to Generate Iterations For</Label>
                  <Input
                    id="iteration-count"
                    type="number"
                    min="1"
                    max="20"
                    value={iterationCount}
                    onChange={(e) => setIterationCount(parseInt(e.target.value) || 5)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    How many top performing ads should receive iteration suggestions
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Iteration Types</Label>
                  <p className="text-sm text-muted-foreground">
                    Define the types of iterations the AI strategist will suggest
                  </p>
                  {iterationTypes.map((type, index) => (
                    <div key={index} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Input
                          value={type.name}
                          onChange={(e) => {
                            const newTypes = [...iterationTypes];
                            newTypes[index] = { ...type, name: e.target.value };
                            setIterationTypes(newTypes);
                          }}
                          placeholder="Type name (e.g., early, script)"
                          className="w-32"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIterationTypes(iterationTypes.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={type.description}
                        onChange={(e) => {
                          const newTypes = [...iterationTypes];
                          newTypes[index] = { ...type, description: e.target.value };
                          setIterationTypes(newTypes);
                        }}
                        placeholder="Description of what this iteration type focuses on..."
                        rows={3}
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIterationTypes([...iterationTypes, { name: '', description: '' }]);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Iteration Type
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Low Performer Criteria</Label>
                    <Switch
                      checked={lowPerformerCriteria.enabled}
                      onCheckedChange={(checked) => 
                        setLowPerformerCriteria({...lowPerformerCriteria, enabled: checked})
                      }
                    />
                  </div>
                  {lowPerformerCriteria.enabled && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="min-spend">Min Spend ($)</Label>
                        <Input
                          id="min-spend"
                          type="number"
                          value={lowPerformerCriteria.minSpend}
                          onChange={(e) => setLowPerformerCriteria({
                            ...lowPerformerCriteria,
                            minSpend: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-spend">Max Spend ($)</Label>
                        <Input
                          id="max-spend"
                          type="number"
                          value={lowPerformerCriteria.maxSpend}
                          onChange={(e) => setLowPerformerCriteria({
                            ...lowPerformerCriteria,
                            maxSpend: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-roas">Max ROAS</Label>
                        <Input
                          id="max-roas"
                          type="number"
                          step="0.1"
                          value={lowPerformerCriteria.maxRoas}
                          onChange={(e) => setLowPerformerCriteria({
                            ...lowPerformerCriteria,
                            maxRoas: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schemas" className="space-y-4">
              <div>
                <Label>Ad Analysis Response Schema</Label>
                <Textarea
                  value={JSON.stringify(responseSchema, null, 2)}
                  onChange={(e) => {
                    try {
                      setResponseSchema(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, keep as is for user to fix
                    }
                  }}
                  className="font-mono text-sm h-64 mt-2"
                  placeholder="Response schema JSON..."
                />
              </div>
              
              <div>
                <Label>Strategist Response Schema</Label>
                <Textarea
                  value={JSON.stringify(strategistResponseSchema, null, 2)}
                  onChange={(e) => {
                    try {
                      setStrategistResponseSchema(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, keep as is for user to fix
                    }
                  }}
                  className="font-mono text-sm h-64 mt-2"
                  placeholder="Strategist response schema JSON..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}