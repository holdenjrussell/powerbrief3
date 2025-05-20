"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getBrands, createBrand } from '@/lib/services/powerbriefService';
import { Brand, BrandInfoData, TargetAudienceData, CompetitionData } from '@/lib/types/powerbrief';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function PowerBriefPage() {
    const { user } = useGlobal();
    const [loading, setLoading] = useState<boolean>(true);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showNewBrandDialog, setShowNewBrandDialog] = useState<boolean>(false);
    const [newBrandName, setNewBrandName] = useState<string>('');
    const [creatingBrand, setCreatingBrand] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        const fetchBrands = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                const brandsData = await getBrands(user.id);
                setBrands(brandsData);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch brands:', err);
                setError('Failed to load brands. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, [user?.id]);

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
                competitiveAdvantage: ''
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
            
            setBrands(prev => [newBrand, ...prev]);
            setNewBrandName('');
            setShowNewBrandDialog(false);
            
            // Navigate to the new brand
            router.push(`/app/powerbrief/${newBrand.id}`);
        } catch (err) {
            console.error('Failed to create brand:', err);
            setError('Failed to create brand. Please try again.');
        } finally {
            setCreatingBrand(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Main Menu - Brand List</h1>
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
                <div className="flex overflow-x-auto pb-4 space-x-6 hide-scrollbar">
                    {brands.map((brand) => (
                        <Link href={`/app/powerbrief/${brand.id}`} key={brand.id} className="min-w-[300px]">
                            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
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
                                <CardFooter>
                                    <Button variant="outline" className="w-full">View Brand</Button>
                                </CardFooter>
                            </Card>
                        </Link>
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