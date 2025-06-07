'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical
} from 'lucide-react';
import {
  UgcCustomCreatorStatus,
  StatusCategory
} from '@/lib/types/ugcWorkflow';
import {
  getCustomCreatorStatuses,
  createCustomCreatorStatus,
  updateCustomCreatorStatus,
  deleteCustomCreatorStatus
} from '@/lib/services/ugcWorkflowService';

interface CreatorStatusManagerProps {
  brandId: string;
}

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  onboarding: 'Onboarding',
  script_pipeline: 'Script Pipeline',
  negotiation: 'Rate Negotiation',
  production: 'Production',
  delivery: 'Delivery'
};

const DEFAULT_COLORS = [
  '#94A3B8', // Gray
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

export default function CreatorStatusManager({ brandId }: CreatorStatusManagerProps) {
  const [statuses, setStatuses] = useState<UgcCustomCreatorStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StatusCategory>('onboarding');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<UgcCustomCreatorStatus | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    status_name: '',
    category: 'onboarding' as StatusCategory,
    color: '#94A3B8',
    is_final: false,
    is_active: true
  });

  useEffect(() => {
    loadStatuses();
  }, [brandId]);

  const loadStatuses = async () => {
    try {
      setIsLoading(true);
      const data = await getCustomCreatorStatuses(brandId);
      setStatuses(data);
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!formData.status_name.trim()) return;

    try {
      const maxOrder = Math.max(
        ...statuses
          .filter(s => s.category === formData.category)
          .map(s => s.display_order),
        -1
      );

      const newStatus = await createCustomCreatorStatus({
        brand_id: brandId,
        status_name: formData.status_name,
        category: formData.category,
        display_order: maxOrder + 1,
        color: formData.color,
        is_final: formData.is_final,
        is_active: formData.is_active
      });

      setStatuses([...statuses, newStatus]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating status:', error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !formData.status_name.trim()) return;

    try {
      const updatedStatus = await updateCustomCreatorStatus(editingStatus.id, {
        status_name: formData.status_name,
        color: formData.color,
        is_final: formData.is_final,
        is_active: formData.is_active
      });

      setStatuses(statuses.map(s => s.id === updatedStatus.id ? updatedStatus : s));
      setEditingStatus(null);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return;

    try {
      await deleteCustomCreatorStatus(statusId);
      setStatuses(statuses.filter(s => s.id !== statusId));
    } catch (error) {
      console.error('Error deleting status:', error);
    }
  };

  const handleReorderStatuses = async (statusId: string, direction: 'up' | 'down') => {
    const categoryStatuses = statuses
      .filter(s => s.category === selectedCategory)
      .sort((a, b) => a.display_order - b.display_order);
    
    const currentIndex = categoryStatuses.findIndex(s => s.id === statusId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categoryStatuses.length) return;

    // Swap display orders
    const currentStatus = categoryStatuses[currentIndex];
    const swapStatus = categoryStatuses[newIndex];

    try {
      await Promise.all([
        updateCustomCreatorStatus(currentStatus.id, { display_order: swapStatus.display_order }),
        updateCustomCreatorStatus(swapStatus.id, { display_order: currentStatus.display_order })
      ]);

      await loadStatuses();
    } catch (error) {
      console.error('Error reordering statuses:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      status_name: '',
      category: 'onboarding',
      color: '#94A3B8',
      is_final: false,
      is_active: true
    });
  };

  const openEditDialog = (status: UgcCustomCreatorStatus) => {
    setEditingStatus(status);
    setFormData({
      status_name: status.status_name,
      category: status.category,
      color: status.color,
      is_final: status.is_final,
      is_active: status.is_active
    });
    setIsDialogOpen(true);
  };

  const categoryStatuses = statuses
    .filter(s => s.category === selectedCategory)
    .sort((a, b) => a.display_order - b.display_order);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Status Management</h2>
          <p className="text-gray-600">Customize status workflows for your creators</p>
        </div>
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
                  ? 'Update the status configuration'
                  : 'Add a new status to your workflow'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Status Name</Label>
                <Input
                  value={formData.status_name}
                  onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
                  placeholder="e.g., Under Review"
                />
              </div>
              
              {!editingStatus && (
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as StatusCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 p-0 border-2"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_final">Final Status</Label>
                  <Switch
                    id="is_final"
                    checked={formData.is_final}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_final: checked })}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Final statuses mark the end of a workflow branch
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
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

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as StatusCategory)}>
        <TabsList>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CATEGORY_LABELS).map(([category]) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle>{CATEGORY_LABELS[category as StatusCategory]} Statuses</CardTitle>
                <CardDescription>
                  Manage statuses for the {CATEGORY_LABELS[category as StatusCategory].toLowerCase()} workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryStatuses.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No statuses defined for this category
                    </p>
                  ) : (
                    categoryStatuses.map((status, index) => (
                      <div
                        key={status.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <button
                          className="cursor-move"
                          disabled={categoryStatuses.length === 1}
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </button>

                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{status.status_name}</span>
                            {status.is_final && (
                              <Badge variant="secondary" className="text-xs">
                                Final
                              </Badge>
                            )}
                            {!status.is_active && (
                              <Badge variant="outline" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorderStatuses(status.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorderStatuses(status.id, 'down')}
                            disabled={index === categoryStatuses.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(status)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 