"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBrandById, updateBrand, deleteBrand, getBriefBatches, createBriefBatch } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch, EditingResource, ResourceLogin, DosAndDonts } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, Save, Trash2, Plus, Folder, Facebook } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import MarkdownTextarea from '@/components/ui/markdown-textarea';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MetaAssetsSelector from '@/components/MetaAssetsSelector';

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
        competitiveAdvantage: '',
        videoInstructions: '',
        designerInstructions: ''
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
    const [defaultVideoInstructions, setDefaultVideoInstructions] = useState<string>('');
    const [defaultDesignerInstructions, setDefaultDesignerInstructions] = useState<string>('');
    const [systemInstructionsImage, setSystemInstructionsImage] = useState<string>('');
    const [systemInstructionsVideo, setSystemInstructionsVideo] = useState<string>('');
    const [elevenLabsApiKey, setElevenLabsApiKey] = useState<string>('');

    // New state for editing resources, resource logins, and dos/donts
    const [editingResources, setEditingResources] = useState<EditingResource[]>([]);
    const [newResource, setNewResource] = useState<EditingResource>({ name: '', url: '' });
    const [resourceLogins, setResourceLogins] = useState<ResourceLogin[]>([]);
    const [newLogin, setNewLogin] = useState<ResourceLogin>({ resourceName: '', username: '', password: '' });
    const [dosAndDonts, setDosAndDonts] = useState<DosAndDonts>({
        imagesDos: [],
        imagesDonts: [],
        videosDos: [],
        videosDonts: []
    });
    const [newImageDo, setNewImageDo] = useState<string>('');
    const [newImageDont, setNewImageDont] = useState<string>('');
    const [newVideoDo, setNewVideoDo] = useState<string>('');
    const [newVideoDont, setNewVideoDont] = useState<string>('');

    // Meta Integration State
    const [metaConnectionStatus, setMetaConnectionStatus] = useState<string>('Not Connected'); // Example states: 'Connected', 'Error'
    const [disconnectingMeta, setDisconnectingMeta] = useState<boolean>(false);

    // Extract params using React.use()
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId } = unwrappedParams;

    // Check Meta connection status based on brand data
    const checkMetaConnectionStatus = (brandData: Brand) => {
        // Check if brand has encrypted token and it's not expired
        if (brandData.meta_access_token && 
            brandData.meta_access_token_expires_at) {
            const expirationDate = new Date(brandData.meta_access_token_expires_at);
            const now = new Date();
            
            if (expirationDate > now) {
                setMetaConnectionStatus('Connected');
            } else {
                setMetaConnectionStatus('Expired');
            }
        } else {
            setMetaConnectionStatus('Not Connected');
        }
    };

    // Handle Meta Assets Saved
    const handleMetaAssetsSaved = async () => {
        // Refresh brand data to get updated Meta assets
        try {
            const updatedBrand = await getBrandById(brandId);
            if (updatedBrand) {
                setBrand(updatedBrand);
            }
        } catch (err) {
            console.error('Error refreshing brand data:', err);
        }
    };

    // Handle Meta Disconnection
    const handleDisconnectMeta = async () => {
        if (!brand) return;
        
        try {
            setDisconnectingMeta(true);
            
            const response = await fetch('/api/meta/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ brandId: brand.id }),
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect Meta integration');
            }

            // Update the brand state to reflect disconnection
            setBrand({
                ...brand,
                meta_access_token: null,
                meta_access_token_expires_at: null,
                meta_user_id: null,
                meta_ad_account_id: null,
                meta_facebook_page_id: null,
                meta_instagram_actor_id: null,
                meta_pixel_id: null
            });
            
            setMetaConnectionStatus('Not Connected');
            setError(null);
        } catch (err) {
            console.error('Error disconnecting Meta:', err);
            setError('Failed to disconnect Meta integration. Please try again.');
        } finally {
            setDisconnectingMeta(false);
        }
    };

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
                
                // Check Meta connection status
                checkMetaConnectionStatus(brandData);
                
                // Set form fields
                setBrandName(brandData.name);
                setBrandInfo(brandData.brand_info_data);
                setTargetAudience(brandData.target_audience_data);
                setCompetition(brandData.competition_data);
                setDefaultVideoInstructions(brandData.default_video_instructions || '');
                setDefaultDesignerInstructions(brandData.default_designer_instructions || '');
                setSystemInstructionsImage(brandData.system_instructions_image || '');
                setSystemInstructionsVideo(brandData.system_instructions_video || '');
                setElevenLabsApiKey(brandData.elevenlabs_api_key || '');
                
                // Set new data fields
                setEditingResources(brandData.editing_resources || []);
                setResourceLogins(brandData.resource_logins || []);
                setDosAndDonts(brandData.dos_and_donts || {
                    imagesDos: [],
                    imagesDonts: [],
                    videosDos: [],
                    videosDonts: []
                });
                
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

    // Handle meta_connected URL parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const metaConnected = urlParams.get('meta_connected');
        
        if (metaConnected === 'true' && brand) {
            // Refetch brand data to get the updated connection status
            getBrandById(brandId).then((updatedBrand) => {
                if (updatedBrand) {
                    setBrand(updatedBrand);
                    checkMetaConnectionStatus(updatedBrand);
                }
            });
            
            // Clean up URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [brand, brandId]);

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
                competition_data: competition,
                editing_resources: editingResources,
                resource_logins: resourceLogins,
                dos_and_donts: dosAndDonts,
                default_video_instructions: defaultVideoInstructions,
                default_designer_instructions: defaultDesignerInstructions,
                system_instructions_image: systemInstructionsImage,
                system_instructions_video: systemInstructionsVideo,
                elevenlabs_api_key: elevenLabsApiKey
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

    // Handle Meta Connection
    const handleConnectMeta = () => {
        const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
        if (!metaAppId) {
            setError("Meta App ID is not configured. Please check environment variables.");
            console.error("NEXT_PUBLIC_META_APP_ID is not set.");
            return;
        }

        // Use the same redirect URI logic as the backend for consistency
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/meta/callback`);
        
        // Define the scopes your application needs
        // ads_management: Manage ads for ad accounts you have access to.
        // pages_show_list: Get a list of Pages that a person manages.
        // instagram_basic: Get basic metadata about an Instagram Business or Creator Account.
        // read_insights: Read insights data for Pages, Apps, and web properties you own. (Often used for Pixel data)
        // business_management: Manage a business, including ad accounts, Pages, and other assets.
        // TODO: review these scopes based on exact needs.
        const scopes = [
            'ads_management',
            'pages_show_list',
            'instagram_basic',
            'read_insights',
            'business_management' 
        ].join(','); 

        // Optional: Add a state parameter for CSRF protection
        const state = encodeURIComponent(JSON.stringify({ brandId: brand?.id, userId: user?.id })); // Example state

        const oauthUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}&response_type=code`;
        
        console.log('Redirecting to Meta OAuth:', oauthUrl);
        console.log('Using redirect URI:', `${baseUrl}/api/auth/meta/callback`);
        window.location.href = oauthUrl;
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
            
            <div className="flex overflow-x-auto pb-4 space-x-6 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Brand Info Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
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
                            <MarkdownTextarea
                                value={brandInfo.positioning}
                                onChange={(value) => setBrandInfo({...brandInfo, positioning: value})}
                                placeholder="Brand Positioning"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Product</label>
                            <MarkdownTextarea
                                value={brandInfo.product}
                                onChange={(value) => setBrandInfo({...brandInfo, product: value})}
                                placeholder="Product"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Technology</label>
                            <MarkdownTextarea
                                value={brandInfo.technology}
                                onChange={(value) => setBrandInfo({...brandInfo, technology: value})}
                                placeholder="Grounding Technology"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Testimonials/Quotes</label>
                            <MarkdownTextarea
                                value={brandInfo.testimonials}
                                onChange={(value) => setBrandInfo({...brandInfo, testimonials: value})}
                                placeholder="Testimonials or Quotes"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Health Benefits</label>
                            <MarkdownTextarea
                                value={brandInfo.healthBenefits}
                                onChange={(value) => setBrandInfo({...brandInfo, healthBenefits: value})}
                                placeholder="Health Benefits"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Audience Summary</label>
                            <MarkdownTextarea
                                value={brandInfo.targetAudienceSummary}
                                onChange={(value) => setBrandInfo({...brandInfo, targetAudienceSummary: value})}
                                placeholder="Target Audience Summary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Brand Voice</label>
                            <MarkdownTextarea
                                value={brandInfo.brandVoice}
                                onChange={(value) => setBrandInfo({...brandInfo, brandVoice: value})}
                                placeholder="Brand Voice"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Competitive Advantage</label>
                            <MarkdownTextarea
                                value={brandInfo.competitiveAdvantage}
                                onChange={(value) => setBrandInfo({...brandInfo, competitiveAdvantage: value})}
                                placeholder="Competitive Advantage"
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Target Audience Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Target Audience</CardTitle>
                        <CardDescription>Define your audience demographics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <MarkdownTextarea
                                value={targetAudience.gender}
                                onChange={(value) => setTargetAudience({...targetAudience, gender: value})}
                                placeholder="Gender demographics"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Age</label>
                            <MarkdownTextarea
                                value={targetAudience.age}
                                onChange={(value) => setTargetAudience({...targetAudience, age: value})}
                                placeholder="Age range"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Top Spending Demographics</label>
                            <MarkdownTextarea
                                value={targetAudience.topSpendingDemographics}
                                onChange={(value) => setTargetAudience({...targetAudience, topSpendingDemographics: value})}
                                placeholder="Top spending demographics"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Location</label>
                            <MarkdownTextarea
                                value={targetAudience.location}
                                onChange={(value) => setTargetAudience({...targetAudience, location: value})}
                                placeholder="Where they live"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Characteristics</label>
                            <MarkdownTextarea
                                value={targetAudience.characteristics}
                                onChange={(value) => setTargetAudience({...targetAudience, characteristics: value})}
                                placeholder="Who they are"
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Competition Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Competition</CardTitle>
                        <CardDescription>Competitor analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Competitor Ad Libraries</label>
                            <MarkdownTextarea
                                value={competition.competitorAdLibraries}
                                onChange={(value) => setCompetition({...competition, competitorAdLibraries: value})}
                                placeholder="Competitor Ad Libraries"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <MarkdownTextarea
                                value={competition.notes}
                                onChange={(value) => setCompetition({...competition, notes: value})}
                                placeholder="Additional notes about competitors"
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* Default Creative Instructions Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Default Creative Instructions</CardTitle>
                        <CardDescription>Set default instructions for concepts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Default Video Instructions</label>
                            <MarkdownTextarea
                                value={defaultVideoInstructions}
                                onChange={(value) => setDefaultVideoInstructions(value)}
                                placeholder="Enter default video instructions... e.g.\n- Use AI voiceover from ElevenLabs\n- Add B-roll footage\n- Logo at 10-15% opacity\n- Add captions\n- Add light background music"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Default Designer Instructions (for Images)</label>
                            <MarkdownTextarea
                                value={defaultDesignerInstructions}
                                onChange={(value) => setDefaultDesignerInstructions(value)}
                                placeholder="Enter default designer instructions for image assets..."
                            />
                        </div>
                    </CardContent>
                </Card>
                
                {/* AI System Instructions Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>AI System Instructions</CardTitle>
                        <CardDescription>Customize AI system instructions by content type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">System Instructions for Images</label>
                            <MarkdownTextarea
                                value={systemInstructionsImage}
                                onChange={(value) => setSystemInstructionsImage(value)}
                                placeholder="Enter system instructions for image generation..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">System Instructions for Videos</label>
                            <MarkdownTextarea
                                value={systemInstructionsVideo}
                                onChange={(value) => setSystemInstructionsVideo(value)}
                                placeholder="Enter system instructions for video generation..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ElevenLabs API Key</label>
                            <Input
                                type="password"
                                value={elevenLabsApiKey}
                                onChange={(e) => setElevenLabsApiKey(e.target.value)}
                                placeholder="Enter ElevenLabs API Key for voice generation"
                                className="font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This key will be used for voice generation. If not provided, the system will use the default key.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Editing Resources Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Editing Resources</CardTitle>
                        <CardDescription>Add links to important editing resources</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {editingResources.map((resource, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-md border">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">{resource.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Visit</a>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setEditingResources(prev => prev.filter((_, i) => i !== index))}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Add New Resource</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <Input
                                        value={newResource.name}
                                        onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                                        placeholder="Name"
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-span-2 flex space-x-2">
                                    <Input
                                        value={newResource.url}
                                        onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                                        placeholder="URL"
                                        className="w-full"
                                    />
                                    <Button 
                                        onClick={() => {
                                            if (newResource.name && newResource.url) {
                                                setEditingResources(prev => [...prev, {...newResource}]);
                                                setNewResource({ name: '', url: '' });
                                            }
                                        }}
                                        disabled={!newResource.name || !newResource.url}
                                        className="bg-primary-600 text-white hover:bg-primary-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Resource Logins Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Resource Logins</CardTitle>
                        <CardDescription>Store login credentials for important resources</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {resourceLogins.map((login, index) => (
                                <div key={index} className="p-3 rounded-md border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{login.resourceName}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setResourceLogins(prev => prev.filter((_, i) => i !== index))}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">Username:</span>
                                            <span className="break-all">{login.username}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 font-medium">Password:</span>
                                            <span className="break-all">{login.password}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Add New Login</h3>
                            <div className="space-y-2">
                                <Input
                                    value={newLogin.resourceName}
                                    onChange={(e) => setNewLogin({...newLogin, resourceName: e.target.value})}
                                    placeholder="Resource Name"
                                    className="w-full"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        value={newLogin.username}
                                        onChange={(e) => setNewLogin({...newLogin, username: e.target.value})}
                                        placeholder="Username"
                                        className="w-full"
                                    />
                                    <Input
                                        value={newLogin.password}
                                        onChange={(e) => setNewLogin({...newLogin, password: e.target.value})}
                                        placeholder="Password"
                                        className="w-full"
                                        type="password"
                                    />
                                </div>
                                <Button 
                                    onClick={() => {
                                        if (newLogin.resourceName && newLogin.username && newLogin.password) {
                                            setResourceLogins(prev => [...prev, {...newLogin}]);
                                            setNewLogin({ resourceName: '', username: '', password: '' });
                                        }
                                    }}
                                    disabled={!newLogin.resourceName || !newLogin.username || !newLogin.password}
                                    className="w-full bg-primary-600 text-white hover:bg-primary-700"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Login
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Do&apos;s and Don&apos;ts Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Do&apos;s and Don&apos;ts</CardTitle>
                        <CardDescription>Define guidelines for images and videos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Image Guidelines */}
                            <div className="space-y-4">
                                <h3 className="text-md font-semibold">Image Guidelines</h3>
                                
                                {/* Image Do&apos;s */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-green-600">Do&apos;s</h4>
                                    <div className="space-y-2">
                                        {dosAndDonts.imagesDos.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-green-50 border border-green-200">
                                                <span className="text-sm">{item}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setDosAndDonts({
                                                        ...dosAndDonts,
                                                        imagesDos: dosAndDonts.imagesDos.filter((_, i) => i !== index)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex space-x-2">
                                            <Input
                                                value={newImageDo}
                                                onChange={(e) => setNewImageDo(e.target.value)}
                                                placeholder="Add a new image Do"
                                                className="w-full"
                                            />
                                            <Button 
                                                onClick={() => {
                                                    if (newImageDo) {
                                                        setDosAndDonts({
                                                            ...dosAndDonts,
                                                            imagesDos: [...dosAndDonts.imagesDos, newImageDo]
                                                        });
                                                        setNewImageDo('');
                                                    }
                                                }}
                                                disabled={!newImageDo}
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Image Don&apos;ts */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-red-600">Don&apos;ts</h4>
                                    <div className="space-y-2">
                                        {dosAndDonts.imagesDonts.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-red-50 border border-red-200">
                                                <span className="text-sm">{item}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setDosAndDonts({
                                                        ...dosAndDonts,
                                                        imagesDonts: dosAndDonts.imagesDonts.filter((_, i) => i !== index)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex space-x-2">
                                            <Input
                                                value={newImageDont}
                                                onChange={(e) => setNewImageDont(e.target.value)}
                                                placeholder="Add a new image Don&apos;t"
                                                className="w-full"
                                            />
                                            <Button 
                                                onClick={() => {
                                                    if (newImageDont) {
                                                        setDosAndDonts({
                                                            ...dosAndDonts,
                                                            imagesDonts: [...dosAndDonts.imagesDonts, newImageDont]
                                                        });
                                                        setNewImageDont('');
                                                    }
                                                }}
                                                disabled={!newImageDont}
                                                className="bg-red-600 text-white hover:bg-red-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Video Guidelines */}
                            <div className="space-y-4">
                                <h3 className="text-md font-semibold">Video Guidelines</h3>
                                
                                {/* Video Do&apos;s */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-green-600">Do&apos;s</h4>
                                    <div className="space-y-2">
                                        {dosAndDonts.videosDos.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-green-50 border border-green-200">
                                                <span className="text-sm">{item}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setDosAndDonts({
                                                        ...dosAndDonts,
                                                        videosDos: dosAndDonts.videosDos.filter((_, i) => i !== index)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex space-x-2">
                                            <Input
                                                value={newVideoDo}
                                                onChange={(e) => setNewVideoDo(e.target.value)}
                                                placeholder="Add a new video Do"
                                                className="w-full"
                                            />
                                            <Button 
                                                onClick={() => {
                                                    if (newVideoDo) {
                                                        setDosAndDonts({
                                                            ...dosAndDonts,
                                                            videosDos: [...dosAndDonts.videosDos, newVideoDo]
                                                        });
                                                        setNewVideoDo('');
                                                    }
                                                }}
                                                disabled={!newVideoDo}
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Video Don&apos;ts */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-red-600">Don&apos;ts</h4>
                                    <div className="space-y-2">
                                        {dosAndDonts.videosDonts.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-red-50 border border-red-200">
                                                <span className="text-sm">{item}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => setDosAndDonts({
                                                        ...dosAndDonts,
                                                        videosDonts: dosAndDonts.videosDonts.filter((_, i) => i !== index)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex space-x-2">
                                            <Input
                                                value={newVideoDont}
                                                onChange={(e) => setNewVideoDont(e.target.value)}
                                                placeholder="Add a new video Don&apos;t"
                                                className="w-full"
                                            />
                                            <Button 
                                                onClick={() => {
                                                    if (newVideoDont) {
                                                        setDosAndDonts({
                                                            ...dosAndDonts,
                                                            videosDonts: [...dosAndDonts.videosDonts, newVideoDont]
                                                        });
                                                        setNewVideoDont('');
                                                    }
                                                }}
                                                disabled={!newVideoDont}
                                                className="bg-red-600 text-white hover:bg-red-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Meta Integration Column */}
                <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Meta Integration</CardTitle>
                        <CardDescription>Connect your Meta Ad Account, Pages, and Pixels.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-2">
                                Status: <span className={`font-semibold ${
                                    metaConnectionStatus === 'Connected' ? 'text-green-600' : 
                                    metaConnectionStatus === 'Expired' ? 'text-orange-600' : 
                                    'text-gray-600'
                                }`}>{metaConnectionStatus}</span>
                            </p>
                            
                            {metaConnectionStatus === 'Connected' && (
                                <div className="space-y-3">
                                    {/* Connected Account Details */}
                                    <div className="p-3 border rounded-md bg-green-50 border-green-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-green-800">Connected Account</h4>
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        </div>
                                        <div className="space-y-1 text-xs text-green-700">
                                            {brand?.meta_user_id && (
                                                <p><span className="font-medium">User ID:</span> {brand.meta_user_id}</p>
                                            )}
                                            {brand?.meta_access_token_expires_at && (
                                                <p><span className="font-medium">Expires:</span> {new Date(brand.meta_access_token_expires_at).toLocaleDateString()}</p>
                                            )}
                                            {brand?.meta_ad_account_id && (
                                                <p><span className="font-medium">Ad Account:</span> {brand.meta_ad_account_id}</p>
                                            )}
                                            {brand?.meta_facebook_page_id && (
                                                <p><span className="font-medium">Facebook Page:</span> {brand.meta_facebook_page_id}</p>
                                            )}
                                            {brand?.meta_instagram_actor_id && (
                                                <p><span className="font-medium">Instagram Account:</span> {brand.meta_instagram_actor_id}</p>
                                            )}
                                            {brand?.meta_pixel_id && (
                                                <p><span className="font-medium">Pixel ID:</span> {brand.meta_pixel_id}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Disconnect Button */}
                                    <Button 
                                        onClick={handleDisconnectMeta}
                                        disabled={disconnectingMeta}
                                        variant="outline"
                                        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                    >
                                        {disconnectingMeta ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Disconnecting...
                                            </>
                                        ) : (
                                            'Disconnect Meta'
                                        )}
                                    </Button>
                                </div>
                            )}
                            
                            {metaConnectionStatus === 'Expired' && (
                                <div className="space-y-3">
                                    <div className="p-3 border rounded-md bg-orange-50 border-orange-200">
                                        <p className="text-sm text-orange-800">
                                            Your Meta access token has expired. Please reconnect to continue using Meta features.
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={handleConnectMeta} 
                                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        <Facebook className="h-4 w-4 mr-2" />
                                        Reconnect to Meta
                                    </Button>
                                </div>
                            )}
                            
                            {metaConnectionStatus === 'Not Connected' && (
                                <Button 
                                    onClick={handleConnectMeta} 
                                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Facebook className="h-4 w-4 mr-2" />
                                    Connect to Meta
                                </Button>
                            )}
                        </div>
                        
                        {/* Meta Assets Selection */}
                        {metaConnectionStatus === 'Connected' && (
                            <div className="mt-4">
                                <MetaAssetsSelector
                                    brandId={brandId}
                                    currentAdAccountId={brand?.meta_ad_account_id}
                                    currentFacebookPageId={brand?.meta_facebook_page_id}
                                    currentInstagramAccountId={brand?.meta_instagram_actor_id}
                                    currentPixelId={brand?.meta_pixel_id}
                                    onAssetsSaved={handleMetaAssetsSaved}
                                />
                            </div>
                        )}
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
                                                <div className="mr-4 flex-shrink-0 text-lg font-semibold text-primary-600">
                                                    {batch.name}
                                                </div>
                                                <Folder className="h-5 w-5 mr-3 text-gray-500" />
                                                <div>
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