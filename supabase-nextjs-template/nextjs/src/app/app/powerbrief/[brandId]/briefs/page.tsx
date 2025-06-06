"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBrandById, getBriefBatches, createBriefBatch } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch } from '@/lib/types/powerbrief';
import { Loader2, Plus, Folder } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function BriefsPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batches, setBatches] = useState<BriefBatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showNewBatchDialog, setShowNewBatchDialog] = useState<boolean>(false);
    const [newBatchName, setNewBatchName] = useState<string>('');
    const [creatingBatch, setCreatingBatch] = useState<boolean>(false);

    // Extract params using React.use()
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId } = unwrappedParams;

    // Fetch brand and batches data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id || !brandId) return;
            
            try {
                setLoading(true);
                const [brandData, batchesData] = await Promise.all([
                    getBrandById(brandId),
                    getBriefBatches(brandId)
                ]);
                
                if (!brandData) {
                    router.push('/app/powerbrief');
                    return;
                }
                
                setBrand(brandData);
                setBatches(batchesData);
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
                                <Link href={getConceptEditorRoute(batch)} key={batch.id}>
                                    <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <Folder className="h-5 w-5 mr-2 text-primary-600" />
                                                {batch.name}
                                            </CardTitle>
                                            <CardDescription>
                                                Created: {new Date(batch.created_at).toLocaleDateString()}
                                                {batch.content_type && (
                                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                        {batch.content_type.replace('-', ' ').replace('_', ' ').toUpperCase()}
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-center h-20 bg-gray-50 rounded-md">
                                                <Folder className="h-8 w-8 text-gray-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
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
        </div>
    );
} 