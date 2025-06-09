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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
  Alert,
  AlertDescription
} from "@/components/ui";
import { 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical,
  AlertTriangle,
  Settings,
  Users
} from "lucide-react";
import { UGC_CREATOR_ONBOARDING_STATUSES } from '@/lib/types/ugcCreator';

interface CustomCreatorStatus {
  id: string;
  brand_id: string;
  status_name: string;
  category: 'onboarding' | 'script_pipeline' | 'negotiation' | 'production' | 'delivery';
  display_order: number;
  color: string;
  is_active: boolean;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}

interface CreatorStatusManagerProps {
  brandId: string;
}

const STATUS_CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'script_pipeline', label: 'Script Pipeline' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'production', label: 'Production' },
  { value: 'delivery', label: 'Delivery' }
];

const STATUS_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#06B6D4'
];

export default function CreatorStatusManager({ brandId }: CreatorStatusManagerProps) {
  const [customStatuses, setCustomStatuses] = useState<CustomCreatorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomCreatorStatus | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    status_name: '',
    category: 'onboarding' as CustomCreatorStatus['category'],
    color: STATUS_COLORS[0],
    is_active: true,
    is_final: false
  });

  useEffect(() => {
    loadCustomStatuses();
  }, [brandId]);

  const loadCustomStatuses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ugc/creator-statuses?brandId=${brandId}`);
      if (!response.ok) {
        throw new Error('Failed to load custom statuses');
      }

      const data = await response.json();
      setCustomStatuses(data.statuses || []);
    } catch (err) {
      console.error('Error loading custom statuses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load custom statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!formData.status_name.trim()) return;

    try {
      setError(null);

      const response = await fetch('/api/ugc/creator-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          status_name: formData.status_name,
          category: formData.category,
          color: formData.color,
          is_active: formData.is_active,
          is_final: formData.is_final,
          display_order: customStatuses.filter(s => s.category === formData.category).length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create status');
      }

      await loadCustomStatuses();
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to create status');
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !formData.status_name.trim()) return;

    try {
      setError(null);

      const response = await fetch(`/api/ugc/creator-statuses/${editingStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_name: formData.status_name,
          color: formData.color,
          is_active: formData.is_active,
          is_final: formData.is_final
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await loadCustomStatuses();
      setIsDialogOpen(false);
      setEditingStatus(null);
      resetForm();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) return;

    try {
      setError(null);

      const response = await fetch(`/api/ugc/creator-statuses/${statusId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete status');
      }

      await loadCustomStatuses();
    } catch (err) {
      console.error('Error deleting status:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete status');
    }
  };

  const resetForm = () => {
    setFormData({
      status_name: '',
      category: 'onboarding',
      color: STATUS_COLORS[0],
      is_active: true,
      is_final: false
    });
  };

  const openEditDialog = (status: CustomCreatorStatus) => {
    setEditingStatus(status);
    setFormData({
      status_name: status.status_name,
      category: status.category,
      color: status.color,
      is_active: status.is_active,
      is_final: status.is_final
    });
    setIsDialogOpen(true);
  };

  const initializeDefaultStatuses = async () => {
    try {
      setError(null);

      const response = await fetch('/api/ugc/creator-statuses/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize default statuses');
      }

      await loadCustomStatuses();
    } catch (err) {
      console.error('Error initializing default statuses:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize default statuses');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p>Loading creator statuses...</p>
        </div>
      </div>
    );
  }

  const statusesByCategory = STATUS_CATEGORIES.reduce((acc, category) => {
    acc[category.value] = customStatuses.filter(s => s.category === category.value);
    return acc;
  }, {} as Record<string, CustomCreatorStatus[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Creator Status Management</h3>
            <p className="text-sm text-gray-600">Customize creator onboarding and pipeline statuses</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {customStatuses.length === 0 && (
            <Button variant="outline" onClick={initializeDefaultStatuses}>
              Initialize Defaults
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingStatus(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStatus ? 'Edit Status' : 'Create New Status'}
                </DialogTitle>
                <DialogDescription>
                  {editingStatus 
                    ? 'Update the creator status'
                    : 'Create a custom status for your creator pipeline'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Status Name</Label>
                  <Input
                    value={formData.status_name}
                    onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
                    placeholder="e.g., Primary Screen"
                  />
                </div>
                
                {!editingStatus && (
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as CustomCreatorStatus['category'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {STATUS_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_final}
                      onChange={(e) => setFormData({ ...formData, is_final: e.target.checked })}
                    />
                    <span className="text-sm">Final Status</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingStatus(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={editingStatus ? handleUpdateStatus : handleCreateStatus}>
                    {editingStatus ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Default Statuses Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Onboarding Statuses</CardTitle>
          <CardDescription>
            These are the built-in statuses that come with the system. You can add custom statuses below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => (
              <Badge key={status} variant="secondary">
                {status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Statuses by Category */}
      {STATUS_CATEGORIES.map((category) => {
        const categoryStatuses = statusesByCategory[category.value];
        
        return (
          <Card key={category.value}>
            <CardHeader>
              <CardTitle className="text-base">{category.label} Statuses</CardTitle>
              <CardDescription>
                Custom statuses for the {category.label.toLowerCase()} phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStatuses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No custom {category.label.toLowerCase()} statuses</p>
                  <p className="text-sm">Add custom statuses to better track your creator pipeline</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryStatuses.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <div>
                          <p className="font-medium">{status.status_name}</p>
                          <div className="flex items-center space-x-2">
                            {status.is_active ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                            {status.is_final && (
                              <Badge variant="outline" className="text-xs">Final</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(status)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteStatus(status.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}