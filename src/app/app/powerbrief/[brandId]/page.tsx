"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBrandById, updateBrand, deleteBrand, getBriefBatches, createBriefBatch } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, Save, Trash2, Plus, Folder } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function BrandDetailPage({ params }: { params: ParamsType }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batches, setBatches] = useState<BriefBatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [showNewBatchDialog, setShowNewBatchDialog] = useState<boolean>(false);
    const [newBatchName, setNewBatchName] = useState<string>('');
    const [creatingBatch, setCreatingBatch] = useState<boolean>(false);

    // Brand form fields
    const [brandName, setBrandName] = useState<string>('');
    const [brandInfo, setBrandInfo] = useState({
        positioning: '',
        product: '',
        technology: '',
        testimonials: '',
        healthBenefits: '',
        targetAudienceSummary: '',
        brandVoice: '',
        competitiveAdvantage: ''
    });
    const [targetAudience, setTargetAudience] = useState({
        gender: '',
        age: '',
        topSpendingDemographics: '',
        location: '',
        characteristics: ''
    });
    const [competition, setCompetition] = useState({
        competitorAdLibraries: '',
        notes: ''
    });

    // Extract params using React.use()
    const unwrappedParams = React.use(params as any) as ParamsType;
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
                
                // Set form fields
                setBrandName(brandData.name);
                setBrandInfo(brandData.brand_info_data);
                setTargetAudience(brandData.target_audience_data);
                setCompetition(brandData.competition_data);
                
                setError(null);
            } catch (err) {
                console.error('Error fetching brand data:', err);
                setError('Failed to load brand data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user?.id, brandId, router]);

    // Save brand changes
    const handleSaveBrand = async () => {
        if (!brand) return;
        
        try {
            setSaving(true);
            
            const updatedBrand = await updateBrand({
                id: brand.id,
                name: brandName,
                brand_info_data: brandInfo,
                target_audience_data: targetAudience,
                competition_data: competition
            });
            
            setBrand(updatedBrand);
            setError(null);
        } catch (err) {
            console.error('Error saving brand:', err);
            setError('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Delete brand
    const handleDeleteBrand = async () => {
        if (!brand) return;
        
        try {
            setDeleting(true);
            await deleteBrand(brand.id);
            router.push('/app/powerbrief');
        } catch (err) {
            console.error('Error deleting brand:', err);
            setError('Failed to delete brand. Please try again.');
            setDeleting(false);
            setShowDeleteDialog(false);
        }
    };

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
                <Link href="/app/powerbrief">
                    <Button className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Brands
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link href="/app/powerbrief">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Brands
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">{brand.name}</h1>
                </div>
                <div className="flex space-x-2">
                    <Button 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Brand
                    </Button>
                    <Button 
                        className="bg-primary-600 text-white hover:bg-primary-700"
                        onClick={handleSaveBrand}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Brand Info Column */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Brand Info</CardTitle>
                        <CardDescription>Enter brand information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Brand Name</label>
                            <Input
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                placeholder="Brand Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Brand Positioning</label>
                            <Textarea
                                value={brandInfo.positioning}
                                onChange={(e) => setBrandInfo({...brandInfo, positioning: e.target.value})}
                                placeholder="Brand Positioning"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Product</label>
                            <Textarea
                                value={brandInfo.product}
                                onChange={(e) => setBrandInfo({...brandInfo, product: e.target.value})}
                                placeholder="Product"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Technology</label>
                            <Textarea
                                value={brandInfo.technology}
                                onChange={(e) => setBrandInfo({...brandInfo, technology: e.target.value})}
                                placeholder="Grounding Technology"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Testimonials/Quotes</label>
                            <Textarea
                                value={brandInfo.testimonials}
                                onChange={(e) => setBrandInfo({...brandInfo, testimonials: e.target.value})}
                                placeholder="Testimonials or Quotes"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Health Benefits</label>
                            <Textarea
                                value={brandInfo.healthBenefits}
                                onChange={(e) => setBrandInfo({...brandInfo, healthBenefits: e.target.value})}
                                placeholder="Health Benefits"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Audience Summary</label>
                            <Textarea
                                value={brandInfo.targetAudienceSummary}
                                onChange={(e) => setBrandInfo({...brandInfo, targetAudienceSummary: e.target.value})}
                                placeholder="Target Audience Summary"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Brand Voice</label>
                            <Textarea
                                value={brandInfo.brandVoice}
                                onChange={(e) => setBrandInfo({...brandInfo, brandVoice: e.target.value})}
                                placeholder="Brand Voice"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Competitive Advantage</label>
                            <Textarea
                                value={brandInfo.competitiveAdvantage}
                                onChange={(e) => setBrandInfo({...brandInfo, competitiveAdvantage: e.target.value})}
                                placeholder="Competitive Advantage"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Target Audience Column */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Target Audience</CardTitle>
                        <CardDescription>Define your audience demographics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <Textarea
                                value={targetAudience.gender}
                                onChange={(e) => setTargetAudience({...targetAudience, gender: e.target.value})}
                                placeholder="Gender demographics"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Age</label>
                            <Textarea
                                value={targetAudience.age}
                                onChange={(e) => setTargetAudience({...targetAudience, age: e.target.value})}
                                placeholder="Age range"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Top Spending Demographics</label>
                            <Textarea
                                value={targetAudience.topSpendingDemographics}
                                onChange={(e) => setTargetAudience({...targetAudience, topSpendingDemographics: e.target.value})}
                                placeholder="Top spending demographics"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Location</label>
                            <Textarea
                                value={targetAudience.location}
                                onChange={(e) => setTargetAudience({...targetAudience, location: e.target.value})}
                                placeholder="Where they live"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Characteristics</label>
                            <Textarea
                                value={targetAudience.characteristics}
                                onChange={(e) => setTargetAudience({...targetAudience, characteristics: e.target.value})}
                                placeholder="Who they are"
                                rows={5}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Competition Column */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Competition</CardTitle>
                        <CardDescription>Competitor analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Competitor Ad Libraries</label>
                            <Textarea
                                value={competition.competitorAdLibraries}
                                onChange={(e) => setCompetition({...competition, competitorAdLibraries: e.target.value})}
                                placeholder="Competitor Ad Libraries"
                                rows={8}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <Textarea
                                value={competition.notes}
                                onChange={(e) => setCompetition({...competition, notes: e.target.value})}
                                placeholder="Additional notes about competitors"
                                rows={8}
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Briefs Column */}
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Brief Batches</CardTitle>
                            <CardDescription>Manage brief batches for this brand</CardDescription>
                        </div>
                        <Button 
                            className="bg-primary-600 text-white hover:bg-primary-700"
                            onClick={() => setShowNewBatchDialog(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Batch
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {batches.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Folder className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3>
                                <p className="max-w-md mx-auto">
                                    Create your first batch of briefs for this brand.
                                </p>
                                <Button 
                                    className="mt-6 bg-primary-600 text-white hover:bg-primary-700"
                                    onClick={() => setShowNewBatchDialog(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Batch
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {batches.map((batch) => (
                                    <Link href={`/app/powerbrief/${brand.id}/${batch.id}`} key={batch.id}>
                                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 flex items-center">
                                                <Folder className="h-5 w-5 mr-3 text-gray-500" />
                                                <div>
                                                    <h3 className="font-medium">{batch.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        Created: {new Date(batch.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* Delete Brand Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Brand</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this brand? This action cannot be undone and will delete all associated batches and concepts.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteBrand}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Brand
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* New Batch Dialog */}
            <Dialog open={showNewBatchDialog} onOpenChange={setShowNewBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Batch</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new brief batch.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Batch Name"
                            value={newBatchName}
                            onChange={(e) => setNewBatchName(e.target.value)}
                            disabled={creatingBatch}
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