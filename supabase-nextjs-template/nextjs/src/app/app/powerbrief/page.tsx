"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Building2, AlertCircle, Zap, Mail, MessageSquare, Share2, PenTool, Folder, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBriefBatch, getBriefBatches } from '@/lib/services/powerbriefService';
import { BriefBatch } from '@/lib/types/powerbrief';
import Link from 'next/link';

export default function PowerBriefPage() {
    const { user } = useGlobal();
    const { brands, selectedBrand } = useBrand();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('ads');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New state for existing brief batches
    const [existingBatches, setExistingBatches] = useState<BriefBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);

    // Fetch existing brief batches when selected brand changes
    useEffect(() => {
        const fetchExistingBatches = async () => {
            if (!selectedBrand?.id || !user?.id) {
                setExistingBatches([]);
                return;
            }
            
            try {
                setLoadingBatches(true);
                const batches = await getBriefBatches(selectedBrand.id);
                setExistingBatches(batches);
            } catch (err) {
                console.error('Error fetching existing batches:', err);
                // Don't show error for this, just leave empty
                setExistingBatches([]);
            } finally {
                setLoadingBatches(false);
            }
        };

        fetchExistingBatches();
    }, [selectedBrand?.id, user?.id]);

    // Filter batches by content type
    const getBatchesForContentType = (contentType: string) => {
        return existingBatches.filter(batch => 
            (batch.content_type || 'ads') === contentType
        );
    };

    // Get content type configuration
    const getContentTypeConfig = (contentType: string) => {
        const configs = {
            ads: {
                title: 'Ad Campaigns',
                description: 'Create briefs for paid advertising campaigns across platforms',
                icon: Zap,
                color: 'bg-orange-50 text-orange-700 border-orange-200',
                fields: [
                    'Campaign Type', 'Target Audience', 'Ad Format', 'Platform Specifications',
                    'Creative Requirements', 'Budget Considerations', 'Performance Metrics'
                ]
            },
            'web-assets': {
                title: 'Web Assets',
                description: 'Design briefs for web banners, landing pages, and promotional materials',
                icon: Share2,
                color: 'bg-blue-50 text-blue-700 border-blue-200',
                fields: [
                    'Asset Type', 'Dimensions', 'Visual Requirements', 'Copy Elements',
                    'Conversion Goals', 'Technical Specifications', 'Brand Guidelines'
                ]
            },
            email: {
                title: 'Email Marketing',
                description: 'Campaign and flow specifications for email marketing',
                icon: Mail,
                color: 'bg-green-50 text-green-700 border-green-200',
                fields: [
                    'Campaign Type', 'Subject Lines', 'Email Structure', 'Personalization',
                    'CTA Strategy', 'Deliverability', 'Automation Flow'
                ]
            },
            sms: {
                title: 'SMS Marketing',
                description: 'Mobile messaging campaigns and automated flows',
                icon: MessageSquare,
                color: 'bg-purple-50 text-purple-700 border-purple-200',
                fields: [
                    'Message Type', 'Character Limits', 'Timing Strategy', 'Compliance',
                    'Personalization', 'Link Strategy', 'Follow-up Sequence'
                ]
            },
            'organic-social': {
                title: 'Organic Social',
                description: 'Platform-specific content for organic social media growth',
                icon: Share2,
                color: 'bg-pink-50 text-pink-700 border-pink-200',
                fields: [
                    'Platform Focus', 'Content Type', 'Caption Strategy', 'Hashtag Research',
                    'Visual Requirements', 'Engagement Strategy', 'Community Building'
                ]
            },
            blog: {
                title: 'Blog Content',
                description: 'SEO-optimized blog posts and thought leadership content',
                icon: PenTool,
                color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                fields: [
                    'Content Type', 'SEO Strategy', 'Content Structure', 'Internal Linking',
                    'Visual Content', 'Conversion Elements', 'Promotion Strategy'
                ]
            }
        };
        return configs[contentType as keyof typeof configs];
    };

    const handleCreateBrief = async (contentType: string) => {
        if (!selectedBrand) {
            setError('Please select a brand first');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const config = getContentTypeConfig(contentType);
            const briefData = {
                brand_id: selectedBrand.id,
                name: `${config?.title} Brief - ${new Date().toLocaleDateString()}`,
                content_type: contentType,
                user_id: user?.id
            };

            const newBatch = await createBriefBatch(briefData);
            
            // Update the existing batches list to include the new batch
            setExistingBatches(prev => [newBatch, ...prev]);
            
            router.push(`/app/powerbrief/${selectedBrand.id}/${newBatch.id}?content_type=${contentType}`);
        } catch (err) {
            console.error('Error creating brief:', err);
            setError('Failed to create brief. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Render existing batches section for a specific content type
    const renderExistingBatches = (contentType: string) => {
        const batches = getBatchesForContentType(contentType);
        const config = getContentTypeConfig(contentType);
        
        if (loadingBatches) {
            return (
                <Card className="mb-6">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading your {config?.title.toLowerCase()} batches...</p>
                    </CardContent>
                </Card>
            );
        }

        if (batches.length === 0) {
            return (
                <Card className="mb-6 border-dashed border-2 border-gray-200">
                    <CardContent className="p-8 text-center">
                        <Folder className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No {config?.title.toLowerCase()} batches yet</h3>
                        <p className="text-gray-600 mb-4">
                            Create your first {config?.title.toLowerCase()} batch for {selectedBrand?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                            Use the creation card below to get started
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Your {config?.title} Batches</h3>
                    <Link href={`/app/powerbrief/${selectedBrand?.id}/briefs`}>
                        <Button variant="outline" size="sm">
                            View All
                        </Button>
                    </Link>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {batches.slice(0, 6).map((batch) => {
                        // Determine the correct route based on content type
                        const getConceptEditorRoute = (batch: BriefBatch) => {
                            const baseRoute = `/app/powerbrief/${selectedBrand?.id}/${batch.id}`;
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
                                <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-base">
                                            <Folder className="h-5 w-5 mr-2 text-primary-600" />
                                            {batch.name}
                                        </CardTitle>
                                        <CardDescription className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-1" />
                                            {new Date(batch.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-center h-16 bg-gray-50 rounded-md">
                                            <Folder className="h-6 w-6 text-gray-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                    {batches.length > 6 && (
                        <Link href={`/app/powerbrief/${selectedBrand?.id}/briefs`}>
                            <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 border-dashed border-2 border-gray-200">
                                <CardContent className="p-8 text-center">
                                    <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-gray-600 font-medium">
                                        +{batches.length - 6} more batches
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        View all
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    const renderContentTypeCard = (contentType: string) => {
        const config = getContentTypeConfig(contentType);
        if (!config) return null;

        const Icon = config.icon;

        return (
            <Card className={`transition-all duration-200 hover:shadow-lg hover:scale-105 ${config.color}`}>
                <CardHeader className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Icon className="h-8 w-8" />
                        <div>
                            <CardTitle className="text-xl">{config.title}</CardTitle>
                            <CardDescription className="mt-1">
                                {config.description}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Brief Includes:</h4>
                        <div className="flex flex-wrap gap-2">
                            {config.fields.slice(0, 4).map((field) => (
                                <Badge key={field} variant="secondary" className="text-xs">
                                    {field}
                                </Badge>
                            ))}
                            {config.fields.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                    +{config.fields.length - 4} more
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        onClick={() => handleCreateBrief(contentType)}
                        disabled={loading || !selectedBrand}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create {config.title} Brief
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    if (!brands || brands.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No brands found</h3>
                    <p className="text-gray-600 mt-2">Create your first brand to start generating briefs.</p>
                    <Button
                        onClick={() => router.push('/app/brands')}
                        className="mt-4"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Brand
                    </Button>
                </div>
            </div>
        );
    }

    if (!selectedBrand) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Please select a brand from the sidebar to create content briefs.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        PowerBrief Creative Hub
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Create comprehensive creative briefs for any content type. Each brief type is optimized 
                        with industry best practices and tailored system instructions.
                    </p>
            </div>
            
            {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                </Alert>
            )}
            
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold">Selected Brand</h2>
                        <Button 
                            variant="outline"
                            onClick={() => router.push('/app/brands')}
                        >
                            Manage Brands
                        </Button>
                    </div>
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">{selectedBrand.name}</h3>
                                    <p className="text-gray-600">Ready to create content briefs</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 mb-8">
                        <TabsTrigger value="ads" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Ads
                        </TabsTrigger>
                        <TabsTrigger value="web-assets" className="flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            Web Assets
                        </TabsTrigger>
                        <TabsTrigger value="email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            SMS
                        </TabsTrigger>
                        <TabsTrigger value="organic-social" className="flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            Organic Social
                        </TabsTrigger>
                        <TabsTrigger value="blog" className="flex items-center gap-2">
                            <PenTool className="h-4 w-4" />
                            Blog
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ads" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">Advertising Campaigns</h3>
                            <p className="text-gray-600">Create comprehensive briefs for paid advertising across all platforms</p>
                        </div>
                        
                        {/* Existing Ad Batches */}
                        {selectedBrand && renderExistingBatches('ads')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('ads')}
                        </div>
                    </TabsContent>

                    <TabsContent value="web-assets" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">Web Assets</h3>
                            <p className="text-gray-600">Design briefs for web banners, landing pages, infographics, and promotional materials</p>
                        </div>
                        
                        {/* Existing Web Asset Batches */}
                        {selectedBrand && renderExistingBatches('web-assets')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('web-assets')}
                        </div>
                    </TabsContent>

                    <TabsContent value="email" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">Email Marketing</h3>
                            <p className="text-gray-600">Campaign specifications and automated flow designs for email marketing</p>
                        </div>
                        
                        {/* Existing Email Batches */}
                        {selectedBrand && renderExistingBatches('email')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('email')}
                        </div>
                    </TabsContent>

                    <TabsContent value="sms" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">SMS Marketing</h3>
                            <p className="text-gray-600">Mobile messaging campaigns and automated SMS flows</p>
                        </div>
                        
                        {/* Existing SMS Batches */}
                        {selectedBrand && renderExistingBatches('sms')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('sms')}
                        </div>
                    </TabsContent>

                    <TabsContent value="organic-social" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">Organic Social Media</h3>
                            <p className="text-gray-600">Platform-specific content strategies for organic social media growth</p>
                        </div>
                        
                        {/* Existing Organic Social Batches */}
                        {selectedBrand && renderExistingBatches('organic-social')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('organic-social')}
                        </div>
                    </TabsContent>

                    <TabsContent value="blog" className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-semibold mb-2">Blog Content</h3>
                            <p className="text-gray-600">SEO-optimized blog posts and thought leadership content briefs</p>
                        </div>
                        
                        {/* Existing Blog Batches */}
                        {selectedBrand && renderExistingBatches('blog')}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {renderContentTypeCard('blog')}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 