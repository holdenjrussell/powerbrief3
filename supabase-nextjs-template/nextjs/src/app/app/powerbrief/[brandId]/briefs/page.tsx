"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBrandById, getBriefBatches, createBriefBatch, updateBriefBatch, deleteBriefBatch } from '@/lib/services/powerbriefService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/supabase';
import { Brand, BriefBatch } from '@/lib/types/powerbrief';
import { Loader2, Plus, Folder, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Helper function to get concept counts by status for batches
async function getConceptCountsByStatus(brandId: string): Promise<Record<string, Record<string, number>>> {
    const supabase = createClientComponentClient<Database>();
    
    // Get all concepts for batches belonging to this brand
    const { data: conceptsData, error } = await supabase
        .from('brief_concepts')
        .select('brief_batch_id, status, brief_batches!inner(brand_id)')
        .eq('brief_batches.brand_id', brandId);

    if (error) {
        console.error('Error fetching concept counts by status:', error);
        return {};
    }

    // Group by batch_id and count by status
    const counts: Record<string, Record<string, number>> = {};
    
    conceptsData.forEach((concept) => {
        const batchId = concept.brief_batch_id;
        const status = concept.status || 'No Status';
        
        if (!counts[batchId]) {
            counts[batchId] = {};
        }
        
        if (!counts[batchId][status]) {
            counts[batchId][status] = 0;
        }
        
        counts[batchId][status]++;
    });

    return counts;
}

// Helper function to get status color configuration
function getStatusColorConfig(status: string): { bg: string; text: string; border: string } {
    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
        'No Status': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
        'BRIEFING IN PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
        'BRIEF REVIEW': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
        'BRIEF REVISIONS NEEDED': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
        'READY FOR DESIGNER': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
        'READY FOR EDITOR': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
        'READY FOR EDITOR ASSIGNMENT': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
        'READY FOR REVIEW': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
        'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
        'REVISIONS REQUESTED': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
        'CONCEPT REJECTED': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    };

    return statusColors[status] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
}

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function BriefsPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batches, setBatches] = useState<BriefBatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    // State for concept counts by status
    const [conceptCounts, setConceptCounts] = useState<Record<string, Record<string, number>>>({});
    const [showNewBatchDialog, setShowNewBatchDialog] = useState<boolean>(false);
    const [newBatchName, setNewBatchName] = useState<string>('');
    const [creatingBatch, setCreatingBatch] = useState<boolean>(false);

    // CRUD operation states
    const [showRenameBatchDialog, setShowRenameBatchDialog] = useState(false);
    const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<BriefBatch | null>(null);
    const [renameBatchValue, setRenameBatchValue] = useState('');
    const [renamingBatch, setRenamingBatch] = useState(false);
    const [deletingBatch, setDeletingBatch] = useState(false);

    // Extract params using React.use()
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId } = unwrappedParams;

    // Fetch brand and batches data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id || !brandId) return;
            
            try {
                setLoading(true);
                const [brandData, batchesData, statusCounts] = await Promise.all([
                    getBrandById(brandId),
                    getBriefBatches(brandId),
                    getConceptCountsByStatus(brandId)
                ]);
                
                if (!brandData) {
                    router.push('/app/powerbrief');
                    return;
                }
                
                setBrand(brandData);
                setBatches(batchesData);
                setConceptCounts(statusCounts);
                setError(null);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user?.id, brandId, router]);

    // Create new batch
    const handleCreateBatch = async () => {
        if (!user?.id || !brand || !newBatchName.trim()) return;
        
        try {
            setCreatingBatch(true);
            
            const newBatch = await createBriefBatch({
                brand_id: brand.id,
                user_id: user.id,
                name: newBatchName.trim()
            });
            
            setBatches(prev => [newBatch, ...prev]);
            setNewBatchName('');
            setShowNewBatchDialog(false);
            
            // Navigate to the new batch
            router.push(`/app/powerbrief/${brand.id}/${newBatch.id}`);
        } catch (err) {
            console.error('Failed to create batch:', err);
            setError('Failed to create batch. Please try again.');
        } finally {
            setCreatingBatch(false);
        }
    };

    // CRUD operations
    const handleRenameBatch = async () => {
        if (!selectedBatch || !renameBatchValue.trim()) return;
        
        try {
            setRenamingBatch(true);
            const updatedBatch = await updateBriefBatch({
                id: selectedBatch.id,
                name: renameBatchValue.trim()
            });
            
            // Update the batches list
            setBatches(prev => 
                prev.map(batch => 
                    batch.id === updatedBatch.id ? updatedBatch : batch
                )
            );
            
            setShowRenameBatchDialog(false);
            setSelectedBatch(null);
            setRenameBatchValue('');
        } catch (err) {
            console.error('Error renaming batch:', err);
            setError('Failed to rename batch. Please try again.');
        } finally {
            setRenamingBatch(false);
        }
    };

    const handleDeleteBatch = async () => {
        if (!selectedBatch) return;
        
        try {
            setDeletingBatch(true);
            await deleteBriefBatch(selectedBatch.id);
            
            // Remove from batches list
            setBatches(prev => 
                prev.filter(batch => batch.id !== selectedBatch.id)
            );
            
            setShowDeleteBatchDialog(false);
            setSelectedBatch(null);
        } catch (err) {
            console.error('Error deleting batch:', err);
            setError('Failed to delete batch. Please try again.');
        } finally {
            setDeletingBatch(false);
        }
    };

    const openRenameBatchDialog = (batch: BriefBatch) => {
        setSelectedBatch(batch);
        setRenameBatchValue(batch.name);
        setShowRenameBatchDialog(true);
    };

    const openDeleteBatchDialog = (batch: BriefBatch) => {
        setSelectedBatch(batch);
        setShowDeleteBatchDialog(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!brand) {
        return (
            <div className="p-6">
                <Alert>
                    <AlertDescription>Brand not found.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Brief Batches</h1>
                    <p className="text-gray-600 mt-1">Manage brief batches for {brand.name}</p>
                </div>
                <Button 
                    className="bg-primary-600 text-white hover:bg-primary-700"
                    onClick={() => setShowNewBatchDialog(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Batch
                </Button>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {/* Batches Grid */}
            <div className="grid gap-6">
                {batches.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Folder className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-6">
                                Create your first batch of briefs for this brand. Batches help you organize and manage multiple brief concepts together.
                            </p>
                            <Button 
                                className="bg-primary-600 text-white hover:bg-primary-700"
                                onClick={() => setShowNewBatchDialog(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Batch
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {batches.map((batch) => {
                            // Determine the correct route based on content type
                            const getConceptEditorRoute = (batch: BriefBatch) => {
                                const baseRoute = `/app/powerbrief/${brand.id}/${batch.id}`;
                                switch (batch.content_type) {
                                    case 'email':
                                        return `${baseRoute}/email`;
                                    case 'sms':
                                        return `${baseRoute}/sms`;
                                    case 'web-assets':
                                        return `${baseRoute}/web-assets`;
                                    case 'organic-social':
                                        return `${baseRoute}/organic-social`;
                                    case 'blog':
                                        return `${baseRoute}/blog`;
                                    default:
                                        // Default to generic editor for ads and unknown types
                                        return baseRoute;
                                }
                            };

                            return (
                                <div key={batch.id} className="relative group">
                                    <Link href={getConceptEditorRoute(batch)}>
                                        <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <Folder className="h-5 w-5 mr-2 text-primary-600" />
                                                        {batch.name}
                                                    </div>
                                                    {batch.allow_new_concepts === false && (
                                                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                                                            Batch Closed
                                                        </span>
                                                    )}
                                                </CardTitle>
                                                <CardDescription>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            Created: {new Date(batch.created_at).toLocaleDateString()}
                                                            {batch.content_type && (
                                                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                                    {batch.content_type.replace('-', ' ').replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {batch.allow_new_concepts === false && (
                                                            <span className="text-xs text-red-600 ml-2">
                                                                No new concepts allowed
                                                            </span>
                                                        )}
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-center h-16 bg-gray-50 rounded-md">
                                                        <Folder className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    
                                                    {/* Status Count Tags */}
                                                    {conceptCounts[batch.id] && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(conceptCounts[batch.id])
                                                                .sort(([, a], [, b]) => b - a) // Sort by count descending
                                                                .slice(0, 3) // Show only top 3 statuses
                                                                .map(([status, count]) => {
                                                                    const colorConfig = getStatusColorConfig(status);
                                                                    return (
                                                                        <span
                                                                            key={status}
                                                                            className={`px-2 py-1 text-xs rounded-full font-medium border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
                                                                            title={status}
                                                                        >
                                                                            {status}: {count}
                                                                        </span>
                                                                    );
                                                                })}
                                                            {Object.keys(conceptCounts[batch.id]).length > 3 && (
                                                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full font-medium border border-gray-300">
                                                                    +{Object.keys(conceptCounts[batch.id]).length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                    
                                    {/* Batch Actions Menu */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                                                    onClick={(e) => e.preventDefault()}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.preventDefault();
                                                    openRenameBatchDialog(batch);
                                                }}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        openDeleteBatchDialog(batch);
                                                    }}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* New Batch Dialog */}
            <Dialog open={showNewBatchDialog} onOpenChange={setShowNewBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Batch</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new brief batch. This will help you organize related concepts together.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Batch Name (e.g., 'Q1 Campaign', 'Product Launch')"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            disabled={creatingBatch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newBatchName.trim() && !creatingBatch) {
                                    handleCreateBatch();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowNewBatchDialog(false)}
                            disabled={creatingBatch}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="bg-primary-600 text-white hover:bg-primary-700"
                            onClick={handleCreateBatch}
                            disabled={!newBatchName.trim() || creatingBatch}
                        >
                            {creatingBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Rename Batch Dialog */}
            <Dialog open={showRenameBatchDialog} onOpenChange={setShowRenameBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Batch</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the batch &quot;{selectedBatch?.name}&quot;
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="batch-name">Batch Name</Label>
                        <Input
                            id="batch-name"
                            value={renameBatchValue}
                            onChange={(e) => setRenameBatchValue(e.target.value)}
                            placeholder="Enter new batch name..."
                            disabled={renamingBatch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && renameBatchValue.trim() && !renamingBatch) {
                                    handleRenameBatch();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowRenameBatchDialog(false)}
                            disabled={renamingBatch}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleRenameBatch}
                            disabled={!renameBatchValue.trim() || renamingBatch}
                        >
                            {renamingBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Renaming...
                                </>
                            ) : (
                                'Rename'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Batch Dialog */}
            <Dialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Batch</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the batch &quot;{selectedBatch?.name}&quot;? This action cannot be undone and will delete all concepts within this batch.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteBatchDialog(false)}
                            disabled={deletingBatch}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteBatch}
                            disabled={deletingBatch}
                        >
                            {deletingBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Batch'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 