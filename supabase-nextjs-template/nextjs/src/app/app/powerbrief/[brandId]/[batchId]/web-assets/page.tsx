"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch, BriefConcept, AiBriefingRequest } from '@/lib/types/powerbrief';
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, X, Monitor, Layout, Image, MousePointer, Palette, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
// import WebAssetBriefBuilder from '@/components/WebAssetBriefBuilder';

// Helper to unwrap params safely
type ParamsType = { brandId: string, batchId: string };

interface WebAssetBriefData {
  // Core Configuration
  assetType: 'landing_page' | 'web_banner_static' | 'web_banner_animated' | 'promotional_popup' | 'homepage_hero' | 'product_explainer' | 'brand_story_video' | 'animated_logo' | 'video_animation' | 'other';
  customAssetType?: string;
  dueDate: string;
  assignedDesigner: string;
  projectName: string;
  finalAssetsFolder: string;
  
  // Core Creative Idea
  primaryMessage: string;
  callToAction: string;
  offer?: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  lookAndFeelKeywords: string[];
  
  // Visual & Sensory Direction
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    avoidColors: string[];
  };
  typography: {
    fontFamily: string;
    weights: string[];
    styles: string[];
  };
  
  // Mandatory Elements
  mandatoryElements: {
    logo: boolean;
    logoVersion: 'primary' | 'stacked' | 'whiteout';
    productShots: boolean;
    legalDisclaimer: boolean;
    customElements: string[];
  };
  
  // Asset-Specific Structure & Specs
  assetSpecs: {
    dimensions?: string[];
    interactiveNotes?: string;
    animationSequence?: string;
    aspectRatios?: string[];
    sectionFlow?: string[];
  };
  
  // Final Instructions
  strictlyAvoid: string;
  brandGuidelinesLink: string;
}

interface WebAssetSection {
  id: string;
  type: 'hero_section' | 'feature_grid' | 'testimonial' | 'cta_section' | 'product_showcase' | 'text_block' | 'image_banner';
  content: Record<string, string>;
}

interface AIWebAssetResponse {
  asset_type?: string;
  primary_headline?: string;
  secondary_headline?: string;
  body_copy?: string;
  cta_primary?: string;
  cta_secondary?: string;
  visual_elements?: Array<{
    element_type: string;
    description: string;
    placement: string;
  }>;
  design_specifications?: {
    dimensions?: string;
    color_scheme?: string;
    typography?: string;
    layout_style?: string;
  };
  conversion_elements?: string[];
  section_structure?: Array<{
    section_type: string;
    content: {
      headline?: string;
      body_text?: string;
      cta_text?: string;
    };
    visual_direction?: string;
  }>;
}

export default function WebAssetConceptBriefingPage({ params }: { params: ParamsType }) {
    const { user } = useGlobal();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batch, setBatch] = useState<BriefBatch | null>(null);
    const [concepts, setConcepts] = useState<BriefConcept[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
    const [generatingAI, setGeneratingAI] = useState<boolean>(false);
    const [generatingConceptIds, setGeneratingConceptIds] = useState<Record<string, boolean>>({});
    const [startingConceptNumber, setStartingConceptNumber] = useState<number>(1);
    // const [populatedBriefData, setPopulatedBriefData] = useState<WebAssetBriefData | null>(null);
    const [justGenerated, setJustGenerated] = useState<boolean>(false);

    // Extract params
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId, batchId } = unwrappedParams;

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);
                setError(null);

                // Fetch brand, batch, and concepts
                const [brandData, batchData, conceptsData] = await Promise.all([
                    getBrandById(brandId),
                    getBriefBatchById(batchId),
                    getBriefConcepts(batchId)
                ]);

                setBrand(brandData);
                setBatch(batchData);
                setConcepts(conceptsData || []);
                setStartingConceptNumber(batchData?.starting_concept_number || 1);

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load brief data';
                console.error('Error fetching data:', err);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id, brandId, batchId]);

    const handleCreateConcept = async () => {
        if (!user?.id || !batch) return;

        try {
            const conceptNumber = startingConceptNumber + concepts.length;
            
            const newConcept = await createBriefConcept({
                brief_batch_id: batch.id,
                user_id: user.id,
                concept_title: `Web Asset Concept ${conceptNumber}`,
                body_content_structured: [],
                order_in_batch: concepts.length,
                clickup_id: null,
                clickup_link: null,
                custom_links: [],
                prerequisites: [],
                strategist: null,
                creative_coordinator: null,
                video_editor: null,
                editor_id: null,
                custom_editor_name: null,
                status: null,
                date_assigned: null,
                media_url: null,
                media_type: null,
                ai_custom_prompt: "WEB_ASSET_BRIEF_CONCEPT - This is a web asset design brief concept.",
                text_hook_options: [],
                spoken_hook_options: [],
                cta_script: null,
                cta_text_overlay: null,
                description: `WEB ASSET BRIEF CONCEPT - Interactive Web Asset Brief Builder

This concept is specifically for web asset design and development. The Interactive Web Asset Brief Builder will be used to create comprehensive design briefs for:

- Landing Pages
- Web Banners (Static/Animated)
- Promotional Popups/Modals
- Homepage Heroes
- Product Explainers
- Brand Story Videos
- Animated Logos/Bumpers
- Video Animations

Status: Ready for brief configuration - use the Interactive Web Asset Brief Builder below to start building your design brief.`,
                videoInstructions: brand?.default_video_instructions || '',
                designerInstructions: brand?.default_designer_instructions || '',
                review_status: null,
                review_link: null,
                review_comments: null,
                brief_revision_comments: null,
                hook_type: null,
                hook_count: null,
                product_id: null
            });

            setConcepts(prev => [...prev, newConcept]);
            setActiveConceptId(newConcept.id);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create concept';
            console.error('Error creating concept:', err);
            setError(errorMessage);
        }
    };

    const handleDeleteConcept = async (conceptId: string) => {
        try {
            await deleteBriefConcept(conceptId);
            setConcepts(prev => prev.filter(c => c.id !== conceptId));
            if (activeConceptId === conceptId) {
                setActiveConceptId(null);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete concept';
            console.error('Error deleting concept:', err);
            setError(errorMessage);
        }
    };

    const handleGenerateWebAssetBrief = async (briefData: WebAssetBriefData) => {
        if (!user?.id || !brand || !activeConceptId) return;

        try {
            setGeneratingAI(true);
            setGeneratingConceptIds(prev => ({ ...prev, [activeConceptId]: true }));

            // Find the current concept
            const concept = concepts.find(c => c.id === activeConceptId);
            if (!concept) return;

            // Upload inspiration files first if any
            let inspirationFileUrls: string[] = [];
            if (briefData.inspirationFiles.length > 0) {
                const formData = new FormData();
                briefData.inspirationFiles.forEach((file) => {
                    formData.append('files', file);
                });

                const uploadResponse = await fetch('/api/uploads/temp', {
                    method: 'POST',
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    inspirationFileUrls = uploadResult.fileUrls || [];
                }
            }

            // Prepare the AI request with web asset-specific context
            const aiRequest: AiBriefingRequest = {
                brandContext: {
                    brand_info_data: JSON.stringify(brand.brand_info_data),
                    target_audience_data: JSON.stringify(brand.target_audience_data),
                    competition_data: JSON.stringify(brand.competition_data),
                    system_instructions_image: `You are an expert web content strategist and conversion optimization specialist specializing in multimodal analysis and web asset creation.

Given the brand context, web asset brief configuration, and visual inspiration files (if provided), generate comprehensive web asset specifications optimized for maximum engagement and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "asset_type": "banner|landing_page|infographic|promo|gif|popup|hero",
  "primary_headline": "Main headline that captures attention",
  "secondary_headline": "Supporting headline or subheader",
  "body_copy": "Main content text optimized for the asset type",
  "cta_primary": "Primary call-to-action text",
  "cta_secondary": "Secondary CTA if applicable",
  "visual_elements": [
    {
      "element_type": "hero_image|icon|illustration|chart|product_shot",
      "description": "Specific visual requirements",
      "placement": "Where this element should be positioned"
    }
  ],
  "design_specifications": {
    "dimensions": "Recommended dimensions for the asset",
    "color_scheme": "Color palette guidance based on brand and inspiration",
    "typography": "Font and text hierarchy recommendations",
    "layout_style": "Overall design approach and composition"
  },
  "conversion_elements": [
    "Trust indicators (testimonials, reviews, logos)",
    "Social proof elements",
    "Urgency/scarcity indicators if applicable"
  ],
  "section_structure": [
    {
      "section_type": "hero_section|feature_grid|testimonial|cta_section",
      "content": {
        "headline": "Section headline",
        "body_text": "Section content",
        "cta_text": "Section CTA if applicable"
      },
      "visual_direction": "Detailed visual and design notes for this section"
    }
  ]
}

Focus on conversion optimization, user experience, brand consistency, and visual inspiration integration.`,
                    system_instructions_video: null
                },
                conceptSpecificPrompt: `INTERACTIVE WEB ASSET BRIEF BUILDER DATA:

CORE CONFIGURATION:
Asset Type: ${briefData.assetType}${briefData.customAssetType ? ` (Custom: ${briefData.customAssetType})` : ''}
Due Date: ${briefData.dueDate}
Assigned Designer: ${briefData.assignedDesigner}
Project Name: ${briefData.projectName}
Final Assets Folder: ${briefData.finalAssetsFolder}

CORE CREATIVE IDEA:
Primary Message/Hook: ${briefData.primaryMessage}
Call to Action: ${briefData.callToAction}
${briefData.offer ? `Offer: ${briefData.offer}` : ''}

VISUAL & SENSORY DIRECTION:
Look & Feel Keywords: ${briefData.lookAndFeelKeywords.join(', ')}
Color Palette: Primary: ${briefData.colorPalette.primary}, Secondary: ${briefData.colorPalette.secondary}, Accent: ${briefData.colorPalette.accent}
${briefData.colorPalette.avoidColors.length > 0 ? `Avoid Colors: ${briefData.colorPalette.avoidColors.join(', ')}` : ''}
Typography: ${briefData.typography.fontFamily} (Weights: ${briefData.typography.weights.join(', ')}, Styles: ${briefData.typography.styles.join(', ')})

MANDATORY ELEMENTS:
${briefData.mandatoryElements.logo ? `Logo: ${briefData.mandatoryElements.logoVersion} version` : ''}
${briefData.mandatoryElements.productShots ? 'Product Shots: Required' : ''}
${briefData.mandatoryElements.legalDisclaimer ? 'Legal Disclaimer: Required' : ''}
${briefData.mandatoryElements.customElements.length > 0 ? `Custom Elements: ${briefData.mandatoryElements.customElements.join(', ')}` : ''}

ASSET-SPECIFIC SPECS:
${briefData.assetSpecs.dimensions ? `Dimensions: ${briefData.assetSpecs.dimensions.join(', ')}` : ''}
${briefData.assetSpecs.interactiveNotes ? `Interactive Notes: ${briefData.assetSpecs.interactiveNotes}` : ''}
${briefData.assetSpecs.animationSequence ? `Animation Sequence: ${briefData.assetSpecs.animationSequence}` : ''}
${briefData.assetSpecs.aspectRatios ? `Aspect Ratios: ${briefData.assetSpecs.aspectRatios.join(', ')}` : ''}
${briefData.assetSpecs.sectionFlow ? `Section Flow: ${briefData.assetSpecs.sectionFlow.join(' → ')}` : ''}

INSPIRATION LINKS:
${briefData.inspirationLinks.filter(link => link.trim()).join('\n')}

FINAL INSTRUCTIONS:
Strictly Avoid: ${briefData.strictlyAvoid}
Brand Guidelines: ${briefData.brandGuidelinesLink}

Please generate comprehensive web asset specifications based on this interactive brief configuration.`,
                conceptCurrentData: {
                    body_content_structured: concept.body_content_structured,
                    cta_script: concept.cta_script || undefined,
                    cta_text_overlay: concept.cta_text_overlay || undefined,
                    description: concept.description || undefined
                },
                inspirationFiles: inspirationFileUrls.length > 0 ? inspirationFileUrls : undefined,
                desiredOutputFields: ['asset_type', 'primary_headline', 'secondary_headline', 'body_copy', 'cta_primary', 'cta_secondary', 'visual_elements', 'design_specifications', 'conversion_elements', 'section_structure']
            };

            console.log('Sending web asset brief AI request:', aiRequest);

            const response = await fetch('/api/ai/generate-brief', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(aiRequest)
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('AI API Error Response:', errorData);
                throw new Error(`Failed to generate web asset brief: ${response.status} ${response.statusText}`);
            }

            const result: AIWebAssetResponse = await response.json();
            console.log('AI Response:', result);

            // Transform the web asset-specific response back to concept format
            const webAssetBriefResponse = result;
            
            // Create scenes from section structure
            const scenes = webAssetBriefResponse.section_structure?.map((section) => ({
                scene_title: `${section.section_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Section`,
                script: `${section.content.headline || ''}\n${section.content.body_text || ''}\n${section.content.cta_text || ''}`.trim(),
                visuals: section.visual_direction || ''
            })) || [];

            // Update the concept with web asset brief data
            const updatedConcept = await updateBriefConcept({
                ...concept,
                body_content_structured: scenes,
                cta_script: webAssetBriefResponse.cta_primary || '',
                cta_text_overlay: webAssetBriefResponse.cta_secondary || '',
                description: `INTERACTIVE WEB ASSET BRIEF GENERATED:

Asset Type: ${webAssetBriefResponse.asset_type || 'Not specified'}

PRIMARY CONTENT:
Main Headline: ${webAssetBriefResponse.primary_headline || 'Not specified'}
Secondary Headline: ${webAssetBriefResponse.secondary_headline || 'Not specified'}
Body Copy: ${webAssetBriefResponse.body_copy || 'Not specified'}

CALL-TO-ACTIONS:
Primary CTA: ${webAssetBriefResponse.cta_primary || 'Not specified'}
Secondary CTA: ${webAssetBriefResponse.cta_secondary || 'Not specified'}

VISUAL ELEMENTS:
${webAssetBriefResponse.visual_elements?.map(element => 
    `${element.element_type}: ${element.description} (${element.placement})`
).join('\n') || 'No visual elements specified'}

DESIGN SPECIFICATIONS:
Dimensions: ${webAssetBriefResponse.design_specifications?.dimensions || 'Not specified'}
Color Scheme: ${webAssetBriefResponse.design_specifications?.color_scheme || 'Not specified'}
Typography: ${webAssetBriefResponse.design_specifications?.typography || 'Not specified'}
Layout Style: ${webAssetBriefResponse.design_specifications?.layout_style || 'Not specified'}

CONVERSION ELEMENTS:
${webAssetBriefResponse.conversion_elements?.join('\n') || 'No conversion elements specified'}

BRIEF CONFIGURATION:
Asset Type: ${briefData.assetType}${briefData.customAssetType ? ` (${briefData.customAssetType})` : ''}
Project Name: ${briefData.projectName}
Due Date: ${briefData.dueDate}
Assigned Designer: ${briefData.assignedDesigner}
Look & Feel: ${briefData.lookAndFeelKeywords.join(', ')}`,
                ai_custom_prompt: briefData.primaryMessage
            });

            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );

            // Mark as just generated to show success message
            setJustGenerated(true);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate web asset brief';
            console.error('Error generating web asset brief:', err);
            setError(errorMessage);
        } finally {
            setGeneratingAI(false);
            setGeneratingConceptIds(prev => ({ ...prev, [activeConceptId]: false }));
        }
    };

    // Function to populate the WebAssetBriefBuilder with AI-generated content
    // const triggerBuilderPopulation = (originalData: WebAssetBriefData, aiResponse: AIWebAssetResponse) => {
    //     const populatedData = {
    //         ...originalData,
    //         // Update primary message with AI-generated headline if available
    //         primaryMessage: aiResponse.primary_headline || originalData.primaryMessage,
    //         callToAction: aiResponse.cta_primary || originalData.callToAction,
    //     };

    //     // Trigger re-render of WebAssetBriefBuilder with populated data
    //     setPopulatedBriefData(populatedData);
    // };

    // Autosave function for WebAssetBriefBuilder
    // const handleAutoSave = async (briefData: WebAssetBriefData) => {
    //     if (!activeConceptId) return;
        
    //     try {
    //         const concept = concepts.find(c => c.id === activeConceptId);
    //         if (!concept) return;

    //         await updateBriefConcept({
    //             ...concept,
    //             ai_custom_prompt: briefData.primaryMessage,
    //             description: `DRAFT WEB ASSET BRIEF (Auto-saved):
                
    // Asset Type: ${briefData.assetType}${briefData.customAssetType ? ` (${briefData.customAssetType})` : ''}
    // Project: ${briefData.projectName}
    // Due Date: ${briefData.dueDate}
    // Designer: ${briefData.assignedDesigner}

    // Primary Message: ${briefData.primaryMessage}
    // Call to Action: ${briefData.callToAction}
    // ${briefData.offer ? `Offer: ${briefData.offer}` : ''}

    // Look & Feel: ${briefData.lookAndFeelKeywords.join(', ')}

    // This is a draft that auto-saves as you work. Click "Generate & Populate Brief" to run AI analysis.`
    //         });

    //         console.log('Auto-saved draft');
    //     } catch (error) {
    //         console.error('Auto-save failed:', error);
    //     }
    // };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
                    <p className="text-gray-600">Loading web asset brief...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    if (!brand || !batch) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Brand or batch not found</p>
                </div>
            </div>
        );
    }

    const activeConcept = concepts.find(c => c.id === activeConceptId);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href={`/app/powerbrief/${brandId}/briefs`}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Briefs
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <Monitor className="h-6 w-6 mr-2 text-blue-600" />
                                Web Assets Brief Builder
                            </h1>
                            <p className="text-sm text-gray-600">
                                {brand.name} • {batch.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button onClick={handleCreateConcept} className="flex items-center">
                            <Plus className="h-4 w-4 mr-2" />
                            New Web Asset Concept
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Concepts Sidebar */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <Layout className="h-5 w-5 mr-2" />
                                    Web Asset Concepts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {concepts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm mb-4">
                                            No web asset concepts yet
                                        </p>
                                        <Button onClick={handleCreateConcept} size="sm" className="w-full">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create First Concept
                                        </Button>
                                    </div>
                                ) : (
                                    concepts.map((concept) => (
                                        <div
                                            key={concept.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                activeConceptId === concept.id
                                                    ? 'border-primary-300 bg-primary-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => setActiveConceptId(concept.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-sm text-gray-900">
                                                        {concept.concept_title}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {concept.body_content_structured?.length || 0} sections
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    {generatingConceptIds[concept.id] && (
                                                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteConcept(concept.id);
                                                        }}
                                                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        {!activeConceptId ? (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <Image className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Select or Create a Web Asset Concept
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        Choose an existing concept from the sidebar or create a new one to start building your web asset brief.
                                    </p>
                                    <Button onClick={handleCreateConcept}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Web Asset Concept
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {/* Success Message */}
                                {justGenerated && (
                                    <Alert className="border-green-200 bg-green-50">
                                        <Sparkles className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                            ✨ Web asset brief generated successfully! The builder below has been populated with AI-generated content.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Concept Header */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="flex items-center">
                                                    <Palette className="h-5 w-5 mr-2 text-blue-600" />
                                                    {activeConcept?.concept_title}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Interactive Web Asset Brief Builder
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {generatingAI && (
                                                    <div className="flex items-center text-sm text-primary-600">
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        Generating brief...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-start">
                                                <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-medium text-blue-900 mb-1">
                                                        PowerBrief Creative Execution Brief: For Designers & Video Editors
                                                    </h4>
                                                    <p className="text-blue-800 text-sm">
                                                        This brief is designed to be the single source of truth for the creative team. 
                                                        It provides all the necessary visual, auditory, and content-related direction to produce exceptional web assets efficiently.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Web Asset Brief Builder */}
                                <Card>
                                    <CardContent className="p-0">
                                        {/* TODO: Create WebAssetBriefBuilder component */}
                                        <div className="p-6">
                                            <div className="text-center py-8">
                                                <Palette className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    Web Asset Brief Builder
                                                </h3>
                                                <p className="text-gray-500 mb-4">
                                                    Interactive brief builder component coming soon...
                                                </p>
                                                <Button onClick={() => handleGenerateWebAssetBrief({
                                                    assetType: 'landing_page',
                                                    dueDate: '',
                                                    assignedDesigner: '',
                                                    projectName: '',
                                                    finalAssetsFolder: '',
                                                    primaryMessage: 'Test message',
                                                    callToAction: 'Shop Now',
                                                    inspirationFiles: [],
                                                    inspirationLinks: [],
                                                    lookAndFeelKeywords: [],
                                                    colorPalette: {
                                                        primary: '',
                                                        secondary: '',
                                                        accent: '',
                                                        avoidColors: []
                                                    },
                                                    typography: {
                                                        fontFamily: '',
                                                        weights: [],
                                                        styles: []
                                                    },
                                                    mandatoryElements: {
                                                        logo: false,
                                                        logoVersion: 'primary',
                                                        productShots: false,
                                                        legalDisclaimer: false,
                                                        customElements: []
                                                    },
                                                    assetSpecs: {},
                                                    strictlyAvoid: '',
                                                    brandGuidelinesLink: ''
                                                })} disabled={generatingAI}>
                                                    {generatingAI ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="h-4 w-4 mr-2" />
                                                            Test Generate Brief
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Generated Content Preview */}
                                {activeConcept?.body_content_structured && activeConcept.body_content_structured.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <MousePointer className="h-5 w-5 mr-2 text-green-600" />
                                                Generated Web Asset Structure
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {activeConcept.body_content_structured.map((scene, index) => (
                                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                        <h4 className="font-medium text-gray-900 mb-2">
                                                            {scene.scene_title}
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Content</h5>
                                                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                                    {scene.script}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-medium text-gray-700 mb-1">Visual Direction</h5>
                                                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                                    {scene.visuals}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Full Brief Description */}
                                {activeConcept?.description && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                                                Complete Brief Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                                    {activeConcept.description}
                                                </pre>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}