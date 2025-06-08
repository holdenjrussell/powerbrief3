'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Plus,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Edit,
  Save,
  X,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Instagram,
  Users,
  DollarSign
} from 'lucide-react';
import {
  CreatorFieldConfig,
  CreateCreatorFieldConfig,
  UpdateCreatorFieldConfig,
  CreatorFieldType,
  CreatorFieldGroup,
  FIELD_GROUPS,
  FIELD_TYPE_CONFIGS,
  PROTECTED_CREATOR_FIELDS
} from '@/lib/types/ugcCreatorFields';
import {
  getGroupedFieldConfigs,
  createCreatorFieldConfig,
  updateCreatorFieldConfig,
  deleteCreatorFieldConfig,
  reorderCreatorFieldConfigs,
  validateFieldConfig
} from '@/lib/services/ugcCreatorFieldService';

interface CreatorFieldManagerProps {
  brandId: string;
}

interface EditingField {
  id?: string;
  field_name: string;
  field_type: CreatorFieldType;
  field_label: string;
  field_placeholder: string;
  field_description: string;
  is_required: boolean;
  is_visible_on_form: boolean;
  is_visible_in_editor: boolean;
  field_group: CreatorFieldGroup;
  field_options: string[];
}

const getGroupIcon = (group: CreatorFieldGroup) => {
  const iconMap = {
    basic: User,
    contact: Phone,
    address: MapPin,
    social: Instagram,
    demographics: Users,
    business: DollarSign,
    custom: Settings,
    admin: Shield
  };
  return iconMap[group] || Settings;
};

export default function CreatorFieldManager({ brandId }: CreatorFieldManagerProps) {
  const [fieldGroups, setFieldGroups] = useState<Record<CreatorFieldGroup, CreatorFieldConfig[]>>({
    basic: [],
    contact: [],
    address: [],
    social: [],
    demographics: [],
    business: [],
    custom: [],
    admin: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'editor'>('form');

  const defaultNewField: EditingField = {
    field_name: '',
    field_type: 'text',
    field_label: '',
    field_placeholder: '',
    field_description: '',
    is_required: false,
    is_visible_on_form: true,
    is_visible_in_editor: true,
    field_group: 'custom',
    field_options: []
  };

  useEffect(() => {
    loadFieldConfigs();
  }, [brandId]);

  const loadFieldConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const grouped = await getGroupedFieldConfigs(brandId);
      setFieldGroups(grouped);
    } catch (err) {
      console.error('Error loading field configs:', err);
      setError('Failed to load field configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = async () => {
    if (!editingField) return;

    try {
      setSaving(true);
      setError(null);

      // Validate the field
      const validationErrors = validateFieldConfig({
        brand_id: brandId,
        ...editingField
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        return;
      }

      await createCreatorFieldConfig({
        brand_id: brandId,
        ...editingField,
        display_order: getNextDisplayOrder(editingField.field_group)
      });

      setIsCreateDialogOpen(false);
      setEditingField(null);
      await loadFieldConfigs();
    } catch (err) {
      console.error('Error creating field:', err);
      setError(err instanceof Error ? err.message : 'Failed to create field');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (fieldId: string, updates: UpdateCreatorFieldConfig) => {
    try {
      setSaving(true);
      setError(null);

      await updateCreatorFieldConfig(fieldId, updates);
      await loadFieldConfigs();
    } catch (err) {
      console.error('Error updating field:', err);
      setError(err instanceof Error ? err.message : 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await deleteCreatorFieldConfig(fieldId);
      await loadFieldConfigs();
    } catch (err) {
      console.error('Error deleting field:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setSaving(false);
    }
  };

  const getNextDisplayOrder = (group: CreatorFieldGroup): number => {
    const groupFields = fieldGroups[group];
    if (groupFields.length === 0) return 1;
    return Math.max(...groupFields.map(f => f.display_order)) + 1;
  };

  const renderFieldCard = (field: CreatorFieldConfig, context: 'form' | 'editor') => {
    const isVisible = context === 'form' ? field.is_visible_on_form : field.is_visible_in_editor;
    const canToggleVisibility = !field.is_protected || (field.is_protected && context === 'editor');

    return (
      <Card key={field.id} className={`${!isVisible ? 'opacity-50' : ''} transition-opacity`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{field.field_label}</h4>
                {field.is_protected && (
                  <Shield className="h-4 w-4 text-amber-500" />
                )}
                {field.is_required && (
                  <Badge variant="secondary" className="text-xs">Required</Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {field.field_placeholder || 'No placeholder'}
              </p>
              
              {field.field_description && (
                <p className="text-xs text-gray-500 mb-2">{field.field_description}</p>
              )}
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {FIELD_TYPE_CONFIGS[field.field_type].label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {field.field_name}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-1 ml-4">
              {canToggleVisibility && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateField(field.id, {
                    [context === 'form' ? 'is_visible_on_form' : 'is_visible_in_editor']: !isVisible
                  })}
                  disabled={saving}
                >
                  {isVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {!field.is_protected && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingField({
                        id: field.id,
                        field_name: field.field_name,
                        field_type: field.field_type,
                        field_label: field.field_label,
                        field_placeholder: field.field_placeholder || '',
                        field_description: field.field_description || '',
                        is_required: field.is_required,
                        is_visible_on_form: field.is_visible_on_form,
                        is_visible_in_editor: field.is_visible_in_editor,
                        field_group: field.field_group,
                        field_options: field.field_options
                      });
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFieldGroup = (group: CreatorFieldGroup, context: 'form' | 'editor') => {
    const fields = fieldGroups[group].filter(field => 
      context === 'form' ? field.is_visible_on_form : field.is_visible_in_editor
    );

    if (fields.length === 0) return null;

    const IconComponent = getGroupIcon(group);
    const groupInfo = FIELD_GROUPS[group];

    return (
      <div key={group} className="space-y-4">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">{groupInfo.label}</h3>
          <Badge variant="outline">{fields.length}</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4">{groupInfo.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => renderFieldCard(field, context))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Field Configuration</h2>
          <p className="text-gray-600">Customize which fields appear in your creator onboarding form and editor</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingField(defaultNewField)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingField?.id ? 'Edit Field' : 'Create Custom Field'}
              </DialogTitle>
              <DialogDescription>
                {editingField?.id 
                  ? 'Modify the field configuration'
                  : 'Add a new custom field to collect additional creator information'
                }
              </DialogDescription>
            </DialogHeader>
            
            {editingField && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="field_name">Field Name</Label>
                    <Input
                      id="field_name"
                      value={editingField.field_name}
                      onChange={(e) => setEditingField({
                        ...editingField,
                        field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                      })}
                      placeholder="custom_field"
                      disabled={!!editingField.id}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lowercase with underscores only. Cannot be changed after creation.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="field_type">Field Type</Label>
                    <Select
                      value={editingField.field_type}
                      onValueChange={(value: CreatorFieldType) => setEditingField({
                        ...editingField,
                        field_type: value,
                        field_options: FIELD_TYPE_CONFIGS[value].supportsOptions ? editingField.field_options : []
                      })}
                      disabled={!!editingField.id}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_CONFIGS).map(([type, config]) => (
                          <SelectItem key={type} value={type}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="field_label">Field Label</Label>
                  <Input
                    id="field_label"
                    value={editingField.field_label}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      field_label: e.target.value
                    })}
                    placeholder="What creators will see"
                  />
                </div>
                
                <div>
                  <Label htmlFor="field_placeholder">Placeholder Text</Label>
                  <Input
                    id="field_placeholder"
                    value={editingField.field_placeholder}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      field_placeholder: e.target.value
                    })}
                    placeholder="Hint text for the field"
                  />
                </div>
                
                <div>
                  <Label htmlFor="field_description">Description (Optional)</Label>
                  <Textarea
                    id="field_description"
                    value={editingField.field_description}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      field_description: e.target.value
                    })}
                    placeholder="Additional help text"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="field_group">Field Group</Label>
                  <Select
                    value={editingField.field_group}
                    onValueChange={(value: CreatorFieldGroup) => setEditingField({
                      ...editingField,
                      field_group: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_GROUPS).map(([group, info]) => (
                        <SelectItem key={group} value={group}>
                          {info.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {FIELD_TYPE_CONFIGS[editingField.field_type].supportsOptions && (
                  <div>
                    <Label>Field Options</Label>
                    <div className="space-y-2">
                      {editingField.field_options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...editingField.field_options];
                              newOptions[index] = e.target.value;
                              setEditingField({
                                ...editingField,
                                field_options: newOptions
                              });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = editingField.field_options.filter((_, i) => i !== index);
                              setEditingField({
                                ...editingField,
                                field_options: newOptions
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingField({
                          ...editingField,
                          field_options: [...editingField.field_options, '']
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_required"
                      checked={editingField.is_required}
                      onCheckedChange={(checked) => setEditingField({
                        ...editingField,
                        is_required: checked
                      })}
                    />
                    <Label htmlFor="is_required">Required field</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_visible_on_form"
                      checked={editingField.is_visible_on_form}
                      onCheckedChange={(checked) => setEditingField({
                        ...editingField,
                        is_visible_on_form: checked
                      })}
                    />
                    <Label htmlFor="is_visible_on_form">Show on public onboarding form</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_visible_in_editor"
                      checked={editingField.is_visible_in_editor}
                      onCheckedChange={(checked) => setEditingField({
                        ...editingField,
                        is_visible_in_editor: checked
                      })}
                    />
                    <Label htmlFor="is_visible_in_editor">Show in creator editor</Label>
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingField(null);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateField} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingField.id ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingField.id ? 'Update Field' : 'Create Field'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'form' | 'editor')}>
        <TabsList>
          <TabsTrigger value="form">Public Onboarding Form</TabsTrigger>
          <TabsTrigger value="editor">Creator Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Public Onboarding Form Fields</h3>
            <p className="text-sm text-blue-700">
              These fields will appear on the public creator application form at <code>/apply/{brandId}</code>
            </p>
          </div>
          
          {Object.values(FIELD_GROUPS).map((_, index) => {
            const group = Object.keys(FIELD_GROUPS)[index] as CreatorFieldGroup;
            return renderFieldGroup(group, 'form');
          })}
        </TabsContent>

        <TabsContent value="editor" className="space-y-8">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Creator Editor Fields</h3>
            <p className="text-sm text-green-700">
              These fields will appear in the creator profile editor for your team to manage creator information.
            </p>
          </div>
          
          {Object.values(FIELD_GROUPS).map((_, index) => {
            const group = Object.keys(FIELD_GROUPS)[index] as CreatorFieldGroup;
            return renderFieldGroup(group, 'editor');
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
} 