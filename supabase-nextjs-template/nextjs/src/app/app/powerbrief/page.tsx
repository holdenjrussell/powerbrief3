"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, AlertCircle, Settings, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getBriefBatches, createBriefBatch } from '@/lib/services/powerbriefService';
import { BriefBatch } from '@/lib/types/powerbrief';
import Link from 'next/link';

export default function PowerBriefPage() {
    const { user } = useGlobal();
    const { selectedBrand, isLoading: brandsLoading } = useBrand();
    const [loading, setLoading] = useState<boolean>(true);
    const [briefBatches, setBriefBatches] = useState<BriefBatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchBriefBatches = async () => {
            if (!user?.id || !selectedBrand?.id) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                const batches = await getBriefBatches(selectedBrand.id);
                setBriefBatches(batches);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch brief batches:', err);
                setError('Failed to load brief batches. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchBriefBatches();
    }, [user?.id, selectedBrand?.id]);

    const handleCreateBatch = async () => {
        if (!user?.id || !selectedBrand?.id) return;
        
        try {
            const newBatch = await createBriefBatch({
                brand_id: selectedBrand.id,
                user_id: user.id,
                name: `Brief Batch ${new Date().toLocaleDateString()}`,
                status: 'active'
            });
            
            // Navigate to the new batch
            router.push(`/app/powerbrief/${selectedBrand.id}/${newBatch.id}`);
        } catch (err) {
            console.error('Failed to create brief batch:', err);
            setError('Failed to create brief batch. Please try again.');
        }
    };

    if (brandsLoading || loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!selectedBrand) {
        return (
            <div className="space-y-6 p-6">
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
                        <p className="max-w-md mx-auto">
                            Please select a brand from the dropdown above to view its briefs.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">{selectedBrand.name} - Brief Batches</h1>
                    <p className="text-gray-600 mt-1">Manage your creative briefs and campaigns</p>
                </div>
                <div className="flex space-x-3">
                    <Link href={`/app/powerbrief/${selectedBrand.id}/brand-config`}>
                        <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Brand Settings
                        </Button>
                    </Link>
                    <Button 
                        className="bg-primary-600 text-white hover:bg-primary-700"
                        onClick={handleCreateBatch}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Brief Batch
                    </Button>
                </div>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {briefBatches.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No brief batches yet</h3>
                        <p className="max-w-md mx-auto">
                            Create your first brief batch to start managing creative briefs for {selectedBrand.name}.
                        </p>
                        <Button 
                            className="mt-6 bg-primary-600 text-white hover:bg-primary-700"
                            onClick={handleCreateBatch}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Brief Batch
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {briefBatches.map((batch) => (
                        <Link href={`/app/powerbrief/${selectedBrand.id}/${batch.id}`} key={batch.id}>
                            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                                <CardHeader>
                                    <CardTitle>{batch.name}</CardTitle>
                                    <CardDescription>
                                        Created: {new Date(batch.created_at).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`font-medium ${
                                                batch.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                            }`}>
                                                {batch.status}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full">View Briefs</Button>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
} 