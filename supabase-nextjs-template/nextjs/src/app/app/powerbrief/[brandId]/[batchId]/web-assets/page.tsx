"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch, BriefConcept, AiBriefingRequest } from '@/lib/types/powerbrief';
import { ArrowLeft, Plus, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import WebAssetBriefBuilder from '@/components/WebAssetBriefBuilder';

// Helper to unwrap params safely
type ParamsType = { brandId: string, batchId: string };

interface WebAssetBriefData {
  // Core Configuration
  assetType: 'landing_page' | 'web_banner' | 'promotional_popup' | 'homepage_hero' | 'product_explainer' | 'brand_story_video' | 'animated_logo' | 'video_animation' | 'custom';
  customAssetType?: string;
  dueDate: string;
  assignedDesigner: string;
  strategist: string;
  creativeCoordinator: string;
  projectName: string;
  finalAssetsFolder: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  primaryGoal: string;
  
  // Core Creative Idea
  primaryMessage: string;
  callToAction: string;
  theOffer: string;
  
  // Visual Direction
  lookAndFeelKeywords: string[];
  colorPalette: string;
  typography: string;
  mandatoryElements: string;
  strictlyAvoid: string;
  
  // Asset-Specific Specs
  assetSpecs: Record<string, unknown>;
}

interface WebAssetBriefResponse {
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
    const [populatedBriefData, setPopulatedBriefData] = useState<WebAssetBriefData | null>(null);
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
                ai_custom_prompt: "WEB_ASSET_BRIEF_CONCEPT - This is a web asset brief concept.",
                text_hook_options: [],
                spoken_hook_options: [],
                cta_script: null,
                cta_text_overlay: null,
                description: `WEB ASSET BRIEF CONCEPT - Interactive Web Asset Brief Builder

This concept is specifically for web asset content generation. The Interactive Web Asset Brief Builder will be used to create comprehensive web assets with:

- Asset type configuration (Landing Pages, Banners, Popups, etc.)
- Core creative idea and messaging
- Visual direction and design specifications
- Asset-specific technical requirements

Status: Ready for brief configuration - use the Interactive Web Asset Brief Builder below to start building your web asset.`,
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
                    system_instructions_image: `You are an expert web content strategist and conversion optimization specialist.

Given the brand context (positioning, target audience, competitors) and concept prompt, generate comprehensive web asset specifications optimized for maximum engagement and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "asset_type": "banner|landing_page|infographic|promo|gif",
  "primary_headline": "Main headline that captures attention",
  "secondary_headline": "Supporting headline or subheader",
  "body_copy": "Main content text optimized for the asset type",
  "cta_primary": "Primary call-to-action text",
  "cta_secondary": "Secondary CTA if applicable",
  "visual_elements": [
    {
      "element_type": "hero_image|icon|illustration|chart",
      "description": "Specific visual requirements",
      "placement": "Where this element should be positioned"
    }
  ],
  "design_specifications": {
    "dimensions": "Recommended dimensions for the asset",
    "color_scheme": "Color palette guidance",
    "typography": "Font and text hierarchy recommendations",
    "layout_style": "Overall design approach"
  },
  "conversion_elements": [
    "Trust indicators (testimonials, reviews, logos)",
    "Social proof elements",
    "Urgency/scarcity indicators if applicable"
  ]
}

Focus on conversion optimization, user experience, and brand consistency.`,
                    system_instructions_video: null
                },
                conceptSpecificPrompt: `INTERACTIVE WEB ASSET BRIEF BUILDER DATA:

CORE CONFIGURATION:
Asset Type: ${briefData.assetType}${briefData.customAssetType ? ` (${briefData.customAssetType})` : ''}
Project Name: ${briefData.projectName}
Due Date: ${briefData.dueDate}
Assigned Designer: ${briefData.assignedDesigner}
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}
Final Assets Folder: ${briefData.finalAssetsFolder}

CORE CREATIVE IDEA:
Primary Goal: ${briefData.primaryGoal}
Primary Message/Hook: ${briefData.primaryMessage}
Call to Action: ${briefData.callToAction}
The Offer: ${briefData.theOffer}

VISUAL & SENSORY DIRECTION:
Look & Feel Keywords: ${briefData.lookAndFeelKeywords.join(', ')}
Color Palette: ${briefData.colorPalette}
Typography: ${briefData.typography}
Mandatory Elements: ${briefData.mandatoryElements}
Strictly Avoid: ${briefData.strictlyAvoid}

INSPIRATION LINKS:
${briefData.inspirationLinks.filter(link => link.trim()).join('\n')}

ASSET-SPECIFIC SPECIFICATIONS:
${JSON.stringify(briefData.assetSpecs, null, 2)}

Please generate comprehensive web asset content based on this interactive brief configuration, optimized for the specific asset type and conversion goals.`,
                conceptCurrentData: {
                    body_content_structured: concept.body_content_structured,
                    cta_script: concept.cta_script || undefined,
                    cta_text_overlay: concept.cta_text_overlay || undefined,
                    description: concept.description || undefined
                },
                inspirationFiles: inspirationFileUrls.length > 0 ? inspirationFileUrls : undefined,
                desiredOutputFields: ['asset_type', 'primary_headline', 'secondary_headline', 'body_copy', 'cta_primary', 'cta_secondary', 'visual_elements', 'design_specifications', 'conversion_elements']
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

            const result: WebAssetBriefResponse = await response.json();
            console.log('AI Response:', result);

            // Transform the web asset response back to concept format
            const webAssetBriefResponse = result;
            
            // Create scenes from visual elements and specifications
            const scenes = [
                {
                    scene_title: "Primary Content",
                    script: `${webAssetBriefResponse.primary_headline || ''}\n${webAssetBriefResponse.secondary_headline || ''}\n${webAssetBriefResponse.body_copy || ''}`.trim(),
                    visuals: `Primary CTA: ${webAssetBriefResponse.cta_primary || ''}\nSecondary CTA: ${webAssetBriefResponse.cta_secondary || ''}`
                },
                ...(webAssetBriefResponse.visual_elements?.map((element) => ({
                    scene_title: `${element.element_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Element`,
                    script: element.description,
                    visuals: `Placement: ${element.placement}`
                })) || [])
            ];

            // Update the concept with web asset brief data
            const updatedConcept = await updateBriefConcept({
                ...concept,
                body_content_structured: scenes,
                cta_script: webAssetBriefResponse.cta_primary || '',
                cta_text_overlay: webAssetBriefResponse.cta_secondary || '',
                strategist: briefData.strategist,
                creative_coordinator: briefData.creativeCoordinator,
                video_editor: briefData.assignedDesigner,
                description: `INTERACTIVE WEB ASSET BRIEF GENERATED:

Asset Type: ${webAssetBriefResponse.asset_type || briefData.assetType}
Project: ${briefData.projectName}

PRIMARY CONTENT:
Headline: ${webAssetBriefResponse.primary_headline || 'Not specified'}
Secondary Headline: ${webAssetBriefResponse.secondary_headline || 'Not specified'}
Body Copy: ${webAssetBriefResponse.body_copy || 'Not specified'}

CALL TO ACTIONS:
Primary CTA: ${webAssetBriefResponse.cta_primary || 'Not specified'}
Secondary CTA: ${webAssetBriefResponse.cta_secondary || 'Not specified'}

DESIGN SPECIFICATIONS:
Dimensions: ${webAssetBriefResponse.design_specifications?.dimensions || 'Not specified'}
Color Scheme: ${webAssetBriefResponse.design_specifications?.color_scheme || 'Not specified'}
Typography: ${webAssetBriefResponse.design_specifications?.typography || 'Not specified'}
Layout Style: ${webAssetBriefResponse.design_specifications?.layout_style || 'Not specified'}

VISUAL ELEMENTS:
${webAssetBriefResponse.visual_elements?.map(el => `${el.element_type}: ${el.description} (${el.placement})`).join('\n') || 'No visual elements specified'}

CONVERSION ELEMENTS:
${webAssetBriefResponse.conversion_elements?.join('\n') || 'No conversion elements specified'}

TEAM ASSIGNMENTS:
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}
Designer: ${briefData.assignedDesigner}
Due Date: ${briefData.dueDate}

CREATIVE DIRECTION:
Primary Message: ${briefData.primaryMessage}
The Offer: ${briefData.theOffer}
Look & Feel: ${briefData.lookAndFeelKeywords.join(', ')}
Color Palette: ${briefData.colorPalette}
Typography: ${briefData.typography}
Mandatory Elements: ${briefData.mandatoryElements}
Avoid: ${briefData.strictlyAvoid}`,
                ai_custom_prompt: briefData.primaryGoal
            });

            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );

            // Trigger a state update to the WebAssetBriefBuilder to populate its sections
            triggerBuilderPopulation(briefData, webAssetBriefResponse);

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
    const triggerBuilderPopulation = (originalData: WebAssetBriefData, aiResponse: WebAssetBriefResponse) => {
        const populatedData = {
            ...originalData,
            // Populate from AI response
            primaryMessage: aiResponse.primary_headline || originalData.primaryMessage,
            callToAction: aiResponse.cta_primary || originalData.callToAction,
            colorPalette: aiResponse.design_specifications?.color_scheme || originalData.colorPalette,
            typography: aiResponse.design_specifications?.typography || originalData.typography,
            // Update asset specs with AI recommendations
            assetSpecs: {
                ...originalData.assetSpecs,
                dimensions: aiResponse.design_specifications?.dimensions,
                layoutStyle: aiResponse.design_specifications?.layout_style,
                generatedContent: {
                    primaryHeadline: aiResponse.primary_headline,
                    secondaryHeadline: aiResponse.secondary_headline,
                    bodyCopy: aiResponse.body_copy,
                    visualElements: aiResponse.visual_elements,
                    conversionElements: aiResponse.conversion_elements
                }
            }
        };

        // Trigger re-render of WebAssetBriefBuilder with populated data
        setPopulatedBriefData(populatedData);
    };

    // Autosave function for WebAssetBriefBuilder
    const handleAutoSave = async (briefData: WebAssetBriefData) => {
        if (!activeConceptId) return;
        
        try {
            const concept = concepts.find(c => c.id === activeConceptId);
            if (!concept) return;

            // Update concept with current builder state
            await updateBriefConcept({
                ...concept,
                ai_custom_prompt: briefData.primaryGoal,
                strategist: briefData.strategist,
                creative_coordinator: briefData.creativeCoordinator,
                video_editor: briefData.assignedDesigner,
                description: `DRAFT WEB ASSET BRIEF (Auto-saved):
                
Asset Type: ${briefData.assetType}${briefData.customAssetType ? ` (${briefData.customAssetType})` : ''}
Project: ${briefData.projectName}
Due Date: ${briefData.dueDate}
Designer: ${briefData.assignedDesigner}
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}

Primary Goal: ${briefData.primaryGoal}
Primary Message: ${briefData.primaryMessage}
Call to Action: ${briefData.callToAction}
The Offer: ${briefData.theOffer}

Look & Feel: ${briefData.lookAndFeelKeywords.join(', ')}
Color Palette: ${briefData.colorPalette}
Typography: ${briefData.typography}

This is a draft that auto-saves as you work. Click "Generate & Populate Brief" to run AI analysis.`
            });

            console.log('Auto-saved draft');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Link href="/app/powerbrief">
                    <Button className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Briefs
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
                            Back to Briefs
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">{batch?.name} - Web Assets</h1>
                </div>
                <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={handleCreateConcept}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Web Asset Concept
                </Button>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {justGenerated && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                        ✅ Web asset brief generated successfully! The form below has been populated with AI-generated content.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Concept Management Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Web Asset Concepts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {concepts.length === 0 ? (
                                <p className="text-gray-500 text-sm">No concepts yet. Create your first web asset concept to get started.</p>
                            ) : (
                                concepts.map((concept) => (
                                    <div
                                        key={concept.id}
                                        className={`p-3 border rounded cursor-pointer transition-colors ${
                                            activeConceptId === concept.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setActiveConceptId(concept.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-sm">{concept.concept_title}</h3>
                                                {concept.strategist && (
                                                    <p className="text-xs text-gray-600 mt-1">Strategist: {concept.strategist}</p>
                                                )}
                                                {concept.video_editor && (
                                                    <p className="text-xs text-gray-600">Designer: {concept.video_editor}</p>
                                                )}
                                                {concept.status && (
                                                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                                        {concept.status}
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteConcept(concept.id);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Brief Builder */}
                <div className="lg:col-span-3">
                    {activeConceptId ? (
                        <WebAssetBriefBuilder
                            key={`${activeConceptId}-${populatedBriefData ? 'populated' : 'empty'}`}
                            onGenerate={handleGenerateWebAssetBrief}
                            onAutoSave={handleAutoSave}
                            isGenerating={generatingConceptIds[activeConceptId] || false}
                            populatedData={populatedBriefData}
                            onDataPopulated={() => {
                                setPopulatedBriefData(null);
                                setJustGenerated(false);
                            }}
                        />
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Select or Create a Web Asset Concept
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Choose an existing concept from the sidebar or create a new one to start building your web asset brief.
                                </p>
                                <Button
                                    className="bg-green-600 text-white hover:bg-green-700"
                                    onClick={handleCreateConcept}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Web Asset Concept
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}