"use client";

import React, { useState } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, AlertCircle, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrand, deleteBrand } from '@/lib/services/powerbriefService';
import { Brand, BrandInfoData, TargetAudienceData, CompetitionData } from '@/lib/types/powerbrief';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function BrandsPage() {
    const { user } = useGlobal();
    const { brands, isLoading, setSelectedBrand, refreshBrands } = useBrand();
    const [error, setError] = useState<string | null>(null);
    const [showNewBrandDialog, setShowNewBrandDialog] = useState<boolean>(false);
    const [newBrandName, setNewBrandName] = useState<string>('');
    const [creatingBrand, setCreatingBrand] = useState<boolean>(false);
    const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);
    const router = useRouter();

    const handleCreateBrand = async () => {
        if (!user?.id || !newBrandName.trim()) return;
        
        try {
            setCreatingBrand(true);
            
            // Create empty data structures for new brand
            const emptyBrandInfo: BrandInfoData = {
                positioning: '',
                product: '',
                technology: '',
                testimonials: '',
                healthBenefits: '',
                targetAudienceSummary: '',
                brandVoice: '',
                competitiveAdvantage: '',
                videoInstructions: '',
                designerInstructions: ''
            };
            
            const emptyTargetAudience: TargetAudienceData = {
                gender: '',
                age: '',
                topSpendingDemographics: '',
                location: '',
                characteristics: ''
            };
            
            const emptyCompetition: CompetitionData = {
                competitorAdLibraries: '',
                notes: ''
            };
            
            const newBrand = await createBrand({
                user_id: user.id,
                name: newBrandName.trim(),
                brand_info_data: emptyBrandInfo,
                target_audience_data: emptyTargetAudience,
                competition_data: emptyCompetition
            });
            
            setNewBrandName('');
            setShowNewBrandDialog(false);
            
            // Refresh brands list to include the new brand
            await refreshBrands();
            
            // Select the new brand and navigate to it
            setSelectedBrand(newBrand);
            router.push('/app/powerbrief');
        } catch (err) {
            console.error('Failed to create brand:', err);
            setError('Failed to create brand. Please try again.');
        } finally {
            setCreatingBrand(false);
        }
    };

    const handleDeleteBrand = async (brandId: string) => {
        if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
            return;
        }

        try {
            setDeletingBrandId(brandId);
            await deleteBrand(brandId);
            // Refresh the brands list
            await refreshBrands();
        } catch (err) {
            console.error('Failed to delete brand:', err);
            setError('Failed to delete brand. Please try again.');
        } finally {
            setDeletingBrandId(null);
        }
    };

    const handleSelectBrand = (brand: Brand) => {
        setSelectedBrand(brand);
        router.push('/app/powerbrief');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Brand Management</h1>
                    <p className="text-gray-600 mt-1">Create and manage your brands</p>
                </div>
                <Button 
                    className="bg-primary-600 text-white hover:bg-primary-700"
                    onClick={() => setShowNewBrandDialog(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Brand
                </Button>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {brands.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No brands created yet</h3>
                        <p className="max-w-md mx-auto">
                            Add your first brand to get started!
                        </p>
                        <Button 
                            className="mt-6 bg-primary-600 text-white hover:bg-primary-700"
                            onClick={() => setShowNewBrandDialog(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Brand
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brands.map((brand) => (
                        <Card key={brand.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle>{brand.name}</CardTitle>
                                <CardDescription>
                                    Created: {new Date(brand.created_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-24 bg-gray-100 rounded-md">
                                    <Building2 className="h-10 w-10 text-gray-400" />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button 
                                    variant="outline" 
                                    onClick={() => handleSelectBrand(brand)}
                                    className="flex-1 mr-2"
                                >
                                    Select Brand
                                </Button>
                                <Link href={`/app/powerbrief/${brand.id}`}>
                                    <Button variant="ghost" size="icon">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteBrand(brand.id)}
                                    disabled={deletingBrandId === brand.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    {deletingBrandId === brand.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
            
            {/* New Brand Dialog */}
            <Dialog open={showNewBrandDialog} onOpenChange={setShowNewBrandDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Brand</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new brand. You can add more details later.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <Input
                            placeholder="Brand Name"
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            disabled={creatingBrand}
                        />
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowNewBrandDialog(false)}
                            disabled={creatingBrand}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="bg-primary-600 text-white hover:bg-primary-700"
                            onClick={handleCreateBrand}
                            disabled={!newBrandName.trim() || creatingBrand}
                        >
                            {creatingBrand ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Brand
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}