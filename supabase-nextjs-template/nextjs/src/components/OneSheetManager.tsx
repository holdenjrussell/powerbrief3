"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Plus, FileText, Calendar, MoreVertical, Edit3, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface OneSheetSummary {
  id: string;
  name: string;
  product: string;
  landing_page_url?: string;
  current_stage: string;
  stages_completed: {
    context: boolean;
    audience_research: boolean;
    competitor_research: boolean;
    ad_audit: boolean;
    creative_brainstorm: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface OneSheetManagerProps {
  brandId: string;
}

export default function OneSheetManager({ brandId }: OneSheetManagerProps) {
  const [onesheets, setOnesheets] = useState<OneSheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOneSheet, setEditingOneSheet] = useState<OneSheetSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [newOneSheet, setNewOneSheet] = useState({
    name: '',
    product: '',
    landing_page_url: '',
    customer_reviews_url: ''
  });

  useEffect(() => {
    fetchOneSheets();
  }, [brandId]);

  const fetchOneSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/onesheet/list?brandId=${brandId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch OneSheets');
      }
      
      const data = await response.json();
      setOnesheets(data);
    } catch (error) {
      console.error('Error fetching OneSheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load OneSheets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOneSheet = async () => {
    if (!newOneSheet.name.trim()) {
      toast({
        title: 'Error',
        description: 'OneSheet name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!newOneSheet.product.trim()) {
      toast({
        title: 'Error',
        description: 'Product name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/onesheet/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          name: newOneSheet.name.trim(),
          product: newOneSheet.product.trim(),
          landing_page_url: newOneSheet.landing_page_url.trim(),
          customer_reviews_url: newOneSheet.customer_reviews_url.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create OneSheet');
      }

      const createdOneSheet = await response.json();
      setOnesheets(prev => [createdOneSheet, ...prev]);
      
      // Reset form and close dialog
      setNewOneSheet({
        name: '',
        product: '',
        landing_page_url: '',
        customer_reviews_url: ''
      });
      setShowCreateDialog(false);

      toast({
        title: 'Success',
        description: `OneSheet "${newOneSheet.name}" created successfully`
      });
    } catch (error) {
      console.error('Error creating OneSheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to create OneSheet',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOneSheet = async (onesheetId: string, onesheetName: string) => {
    if (!confirm(`Are you sure you want to delete the OneSheet "${onesheetName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(onesheetId);
      const response = await fetch(`/api/onesheet/list?onesheetId=${onesheetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete OneSheet');
      }

      setOnesheets(prev => prev.filter(os => os.id !== onesheetId));
      
      toast({
        title: 'Success',
        description: `OneSheet "${onesheetName}" deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting OneSheet:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete OneSheet',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleEditName = async () => {
    if (!editingOneSheet || !editName.trim()) return;
    
    try {
      setEditing(editingOneSheet.id);
      const response = await fetch(`/api/onesheet/${editingOneSheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to update OneSheet name');
      }

      const updatedOneSheet = await response.json();
      setOnesheets(prev => prev.map(os => 
        os.id === updatedOneSheet.id ? { ...os, name: updatedOneSheet.name } : os
      ));
      
      setShowEditDialog(false);
      setEditingOneSheet(null);
      setEditName('');
      
      toast({
        title: 'Success',
        description: 'OneSheet name updated successfully'
      });
    } catch (error) {
      console.error('Error updating OneSheet name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update OneSheet name',
        variant: 'destructive'
      });
    } finally {
      setEditing(null);
    }
  };

  const openEditDialog = (onesheet: OneSheetSummary) => {
    setEditingOneSheet(onesheet);
    setEditName(onesheet.name);
    setShowEditDialog(true);
  };

  const getStageProgress = (stages: OneSheetSummary['stages_completed']) => {
    const totalStages = Object.keys(stages).length;
    const completedStages = Object.values(stages).filter(Boolean).length;
    return Math.round((completedStages / totalStages) * 100);
  };

  const getStageLabel = (stage: string) => {
    const stageLabels: Record<string, string> = {
      context_loading: 'Context Hub',
      audience_research: 'Audience Research',
      competitor_research: 'Competitor Research',
      ad_audit: 'Ad Account Audit',
      creative_brainstorm: 'Creative Brainstorm'
    };
    return stageLabels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      context_loading: 'bg-blue-100 text-blue-800',
      audience_research: 'bg-green-100 text-green-800',
      competitor_research: 'bg-orange-100 text-orange-800',
      ad_audit: 'bg-purple-100 text-purple-800',
      creative_brainstorm: 'bg-yellow-100 text-yellow-800'
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            OneSheets
          </CardTitle>
          <CardDescription>Manage creative strategy documents for different products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              OneSheets
            </CardTitle>
            <CardDescription>
              Manage creative strategy documents for different products ({onesheets.length} total)
            </CardDescription>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New OneSheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New OneSheet</DialogTitle>
                <DialogDescription>
                  Create a new creative strategy document for a specific product
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">OneSheet Name *</Label>
                  <Input
                    id="name"
                    value={newOneSheet.name}
                    onChange={(e) => setNewOneSheet(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Q1 2024 Sleep Campaign, Black Friday Strategy"
                  />
                </div>
                
                <div>
                  <Label htmlFor="product">Product Name *</Label>
                  <Input
                    id="product"
                    value={newOneSheet.product}
                    onChange={(e) => setNewOneSheet(prev => ({ ...prev, product: e.target.value }))}
                    placeholder="e.g., Grounding Sheets, Sleep Mask Pro"
                  />
                </div>
                
                <div>
                  <Label htmlFor="landing_page_url">Landing Page URL</Label>
                  <Input
                    id="landing_page_url"
                    value={newOneSheet.landing_page_url}
                    onChange={(e) => setNewOneSheet(prev => ({ ...prev, landing_page_url: e.target.value }))}
                    placeholder="https://example.com/product"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_reviews_url">Customer Reviews URL</Label>
                  <Input
                    id="customer_reviews_url"
                    value={newOneSheet.customer_reviews_url}
                    onChange={(e) => setNewOneSheet(prev => ({ ...prev, customer_reviews_url: e.target.value }))}
                    placeholder="https://example.com/reviews"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOneSheet} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create OneSheet'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {onesheets.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No OneSheets yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first OneSheet to start building a creative strategy
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First OneSheet
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {onesheets.map((onesheet) => (
              <Card key={onesheet.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" title={onesheet.name}>
                        {onesheet.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 truncate" title={onesheet.product}>
                        {onesheet.product}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary" 
                          className={getStageColor(onesheet.current_stage)}
                        >
                          {getStageLabel(onesheet.current_stage)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {getStageProgress(onesheet.stages_completed)}% complete
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deleting === onesheet.id}
                        >
                          {deleting === onesheet.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(onesheet)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link 
                            href={`/app/powerbrief/${brandId}/onesheet?id=${onesheet.id}`}
                            className="flex items-center gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit OneSheet
                          </Link>
                        </DropdownMenuItem>
                        {onesheet.landing_page_url && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={onesheet.landing_page_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Landing Page
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteOneSheet(onesheet.id, onesheet.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-500 mb-2">Progress Overview</div>
                      <div className="space-y-1">
                        {Object.entries(onesheet.stages_completed).map(([stage, completed]) => (
                          <div key={stage} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{getStageLabel(stage)}</span>
                            <span className={completed ? 'text-green-600' : 'text-gray-400'}>
                              {completed ? '✓' : '○'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {new Date(onesheet.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Link href={`/app/powerbrief/${brandId}/onesheet?id=${onesheet.id}`}>
                          <Button className="w-full" size="sm">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Open OneSheet
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Edit Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit OneSheet Name</DialogTitle>
            <DialogDescription>
              Update the name for this OneSheet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">OneSheet Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter OneSheet name..."
                disabled={editing === editingOneSheet?.id}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim() && editing !== editingOneSheet?.id) {
                    handleEditName();
                  }
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditName} 
              disabled={!editName.trim() || editing === editingOneSheet?.id}
            >
              {editing === editingOneSheet?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Name'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 