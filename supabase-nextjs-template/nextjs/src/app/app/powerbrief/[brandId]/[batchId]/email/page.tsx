"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept } from '@/lib/services/powerbriefService';
import { Brand, BriefBatch, BriefConcept, AiBriefingRequest } from '@/lib/types/powerbrief';
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import EmailBriefBuilder from '@/components/EmailBriefBuilder';

// Helper to unwrap params safely
type ParamsType = { brandId: string, batchId: string };

interface EmailBriefData {
  // Core Configuration
  briefType: 'campaign' | 'flow';
  dueDate: string;
  assignedDesigner: string;
  strategist: string;
  creativeCoordinator: string;
  campaignFlowName: string;
  finalAssetsFolder: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  primaryGoal: string;
  
  // Inbox Presence
  subjectLineVariations: Array<{
    id: string;
    subject: string;
    preheader: string;
  }>;
  
  // Email Storyboard
  storyboardSections: EmailSection[];
  
  // Final Instructions
  mandatoryInclusions: string;
  thingsToAvoid: string;
  deliverablesFormat: 'image_slices' | 'full_html';
  emailWidth: '600px' | '640px' | 'custom';
  customWidth?: string;
  brandGuidelinesLink: string;
}

interface EmailSection {
  id: string;
  type: 'hero_image' | 'text_block' | 'product_grid' | 'image_text' | 'cta_button' | 'social_proof' | 'spacer';
  content: Record<string, string>;
}

interface AISubjectLineVariation {
  subject: string;
  preheader: string;
  tone_rationale: string;
}

interface AIEmailStoryboardSection {
  section_type: string;
  content: {
    headline?: string;
    body_text?: string;
    cta_text?: string;
  };
  visual_direction?: string;
}

interface EmailBriefResponse {
  campaign_type?: string;
  inbox_presence?: {
    subject_line_variations?: AISubjectLineVariation[];
  };
  email_storyboard?: AIEmailStoryboardSection[];
  primary_cta?: {
    button_text?: string;
    destination_url_placeholder?: string;
    visual_recommendation?: string;
  };
  design_notes?: {
    overall_aesthetic?: string;
    color_palette?: string;
    typography_style?: string;
    layout_approach?: string;
    mobile_optimization?: string;
  };
  personalization_elements?: string[];
}

export default function EmailConceptBriefingPage({ params }: { params: ParamsType }) {
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
    const [populatedBriefData, setPopulatedBriefData] = useState<EmailBriefData | null>(null);
    const [justGenerated, setJustGenerated] = useState<boolean>(false); // Track fresh generation

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
                concept_title: `Email Concept ${conceptNumber}`,
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
                ai_custom_prompt: "EMAIL_BRIEF_CONCEPT - This is an email marketing brief concept.",
                text_hook_options: [],
                spoken_hook_options: [],
                cta_script: null,
                cta_text_overlay: null,
                description: `EMAIL BRIEF CONCEPT - Interactive Email Brief Builder

This concept is specifically for email marketing content generation. The Interactive Email Brief Builder will be used to create comprehensive email campaigns with:

- Campaign/Flow configuration
- Subject line variations and inbox optimization
- Modular email storyboard sections
- Design notes and personalization elements

Status: Ready for brief configuration - use the Interactive Email Brief Builder below to start building your email campaign.`,
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

    const handleGenerateEmailBrief = async (briefData: EmailBriefData) => {
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

            // Prepare the AI request with email-specific context
            const aiRequest: AiBriefingRequest = {
                brandContext: {
                    brand_info_data: JSON.stringify(brand.brand_info_data),
                    target_audience_data: JSON.stringify(brand.target_audience_data),
                    competition_data: JSON.stringify(brand.competition_data),
                    system_instructions_image: `You are an expert email marketing strategist specializing in multimodal analysis and email campaign creation.

Given the brand context, email brief configuration, and visual inspiration files (if provided), generate comprehensive email marketing content optimized for engagement and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "campaign_type": "promotional|welcome_series|nurture|cart_abandonment|re_engagement",
  "inbox_presence": {
    "subject_line_variations": [
      {
        "subject": "Compelling subject line",
        "preheader": "Preheader text that complements subject",
        "tone_rationale": "Why this approach works for the target audience"
      }
    ]
  },
  "email_storyboard": [
    {
      "section_type": "hero_image",
      "content": {
        "headline": "Main headline",
        "body_text": "Supporting text",
        "cta_text": "Button text"
      },
      "visual_direction": "Detailed visual and design notes"
    }
  ],
  "primary_cta": {
    "button_text": "Shop Now",
    "destination_url_placeholder": "Product landing page",
    "visual_recommendation": "Button styling and placement notes"
  },
  "design_notes": {
    "overall_aesthetic": "Overall design approach",
    "color_palette": "Recommended colors",
    "typography_style": "Font and text styling",
    "layout_approach": "Email structure and spacing",
    "mobile_optimization": "Mobile-specific recommendations"
  },
  "personalization_elements": ["Dynamic content suggestions", "Segmentation ideas"]
}

Generate 2-3 subject line variations, 4-6 email storyboard sections, and comprehensive design guidance.`,
                    system_instructions_video: null
                },
                conceptSpecificPrompt: `INTERACTIVE EMAIL BRIEF BUILDER DATA:

CORE CONFIGURATION:
Brief Type: ${briefData.briefType}
Due Date: ${briefData.dueDate}
Assigned Designer: ${briefData.assignedDesigner}
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}
Campaign/Flow Name: ${briefData.campaignFlowName}
Final Assets Folder: ${briefData.finalAssetsFolder}

PRIMARY GOAL & MESSAGE:
${briefData.primaryGoal}

INSPIRATION LINKS:
${briefData.inspirationLinks.filter(link => link.trim()).join('\n')}

FINAL INSTRUCTIONS:
Mandatory Inclusions: ${briefData.mandatoryInclusions}
Things to Avoid: ${briefData.thingsToAvoid}
Deliverables Format: ${briefData.deliverablesFormat}
Email Width: ${briefData.emailWidth}
Brand Guidelines: ${briefData.brandGuidelinesLink}

Please generate comprehensive email content based on this interactive brief configuration.`,
                conceptCurrentData: {
                    body_content_structured: concept.body_content_structured,
                    cta_script: concept.cta_script || undefined,
                    cta_text_overlay: concept.cta_text_overlay || undefined,
                    description: concept.description || undefined
                },
                inspirationFiles: inspirationFileUrls.length > 0 ? inspirationFileUrls : undefined,
                desiredOutputFields: ['campaign_type', 'inbox_presence', 'email_storyboard', 'primary_cta', 'design_notes', 'personalization_elements']
            };

            console.log('Sending email brief AI request:', aiRequest);

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
                throw new Error(`Failed to generate email brief: ${response.status} ${response.statusText}`);
            }

            const result: EmailBriefResponse = await response.json();
            console.log('AI Response:', result);

            // Transform the email-specific response back to concept format
            const emailBriefResponse = result;
            
            // Create scenes from email storyboard
            const scenes = emailBriefResponse.email_storyboard?.map((section) => ({
                scene_title: `${section.section_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Section`,
                script: `${section.content.headline || ''}\n${section.content.body_text || ''}\n${section.content.cta_text || ''}`.trim(),
                visuals: section.visual_direction || ''
            })) || [];

            // Update the concept with email brief data
            const updatedConcept = await updateBriefConcept({
                ...concept,
                body_content_structured: scenes,
                cta_script: emailBriefResponse.primary_cta?.button_text || '',
                cta_text_overlay: emailBriefResponse.primary_cta?.destination_url_placeholder || '',
                strategist: briefData.strategist,
                creative_coordinator: briefData.creativeCoordinator,
                video_editor: briefData.assignedDesigner,
                description: `INTERACTIVE EMAIL BRIEF GENERATED:

Campaign Type: ${emailBriefResponse.campaign_type || 'Not specified'}

INBOX PRESENCE:
${emailBriefResponse.inbox_presence?.subject_line_variations?.map((variation, index) => 
    `Subject Line ${index + 1}: ${variation.subject}
Preheader: ${variation.preheader}
Rationale: ${variation.tone_rationale}`
).join('\n\n') || 'No subject line variations generated'}

DESIGN NOTES:
Overall Aesthetic: ${emailBriefResponse.design_notes?.overall_aesthetic || 'Not specified'}
Color Palette: ${emailBriefResponse.design_notes?.color_palette || 'Not specified'}
Typography: ${emailBriefResponse.design_notes?.typography_style || 'Not specified'}
Layout Approach: ${emailBriefResponse.design_notes?.layout_approach || 'Not specified'}
Mobile Optimization: ${emailBriefResponse.design_notes?.mobile_optimization || 'Not specified'}

PERSONALIZATION ELEMENTS:
${emailBriefResponse.personalization_elements?.join('\n') || 'No personalization elements specified'}

PRIMARY CTA:
Button Text: ${emailBriefResponse.primary_cta?.button_text || 'Not specified'}
Destination: ${emailBriefResponse.primary_cta?.destination_url_placeholder || 'Not specified'}
Visual Recommendations: ${emailBriefResponse.primary_cta?.visual_recommendation || 'Not specified'}

TEAM ASSIGNMENTS:
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}
Designer: ${briefData.assignedDesigner}
Due Date: ${briefData.dueDate}

BRIEF CONFIGURATION:
Brief Type: ${briefData.briefType}
Campaign/Flow Name: ${briefData.campaignFlowName}
Deliverables Format: ${briefData.deliverablesFormat}
Email Width: ${briefData.emailWidth}`,
                ai_custom_prompt: briefData.primaryGoal
            });

            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );

            // 🚀 NEW: Trigger a state update to the EmailBriefBuilder to populate its sections
            // This is what makes it a "living document" - the AI populates the actual builder interface
            triggerBuilderPopulation(briefData, emailBriefResponse);

            // Mark as just generated to show success message
            setJustGenerated(true);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate email brief';
            console.error('Error generating email brief:', err);
            setError(errorMessage);
        } finally {
            setGeneratingAI(false);
            setGeneratingConceptIds(prev => ({ ...prev, [activeConceptId]: false }));
        }
    };

    // 🚀 NEW: Function to populate the EmailBriefBuilder with AI-generated content
    const triggerBuilderPopulation = (originalData: EmailBriefData, aiResponse: EmailBriefResponse) => {
        // This will be passed to EmailBriefBuilder to populate its internal state
        const populatedData = {
            ...originalData,
            // Populate subject line variations from AI response
            subjectLineVariations: aiResponse.inbox_presence?.subject_line_variations?.map((variation: AISubjectLineVariation, index: number) => ({
                id: (index + 1).toString(),
                subject: variation.subject || '',
                preheader: variation.preheader || ''
            })) || originalData.subjectLineVariations,
            
            // Populate storyboard sections from AI response
            storyboardSections: aiResponse.email_storyboard?.map((section: AIEmailStoryboardSection, index: number) => ({
                id: Date.now().toString() + index,
                type: mapSectionTypeToBuilderType(section.section_type),
                content: mapSectionContentToBuilderContent(section)
            })) || originalData.storyboardSections
        };

        // Trigger re-render of EmailBriefBuilder with populated data
        setPopulatedBriefData(populatedData);
    };

    // Helper functions to map AI response to builder format
    const mapSectionTypeToBuilderType = (aiSectionType: string): EmailSection['type'] => {
        const mapping: Record<string, EmailSection['type']> = {
            'hero_image': 'hero_image',
            'text_block': 'text_block', 
            'product_grid': 'product_grid',
            'cta_button': 'cta_button',
            'social_proof': 'social_proof',
            'spacer': 'spacer'
        };
        return mapping[aiSectionType] || 'text_block';
    };

    const mapSectionContentToBuilderContent = (aiSection: AIEmailStoryboardSection): Record<string, string> => {
        return {
            headline: aiSection.content?.headline || '',
            bodyText: aiSection.content?.body_text || '',
            buttonText: aiSection.content?.cta_text || '',
            visualNotes: aiSection.visual_direction || ''
        };
    };

    // 🚀 NEW: Autosave function for EmailBriefBuilder
    const handleAutoSave = async (briefData: EmailBriefData) => {
        if (!activeConceptId) return;
        
        try {
            // Save the builder data to the concept description (non-intrusive)
            const concept = concepts.find(c => c.id === activeConceptId);
            if (!concept) return;

            // Only update description with builder state for autosave
            await updateBriefConcept({
                ...concept,
                ai_custom_prompt: briefData.primaryGoal,
                strategist: briefData.strategist,
                creative_coordinator: briefData.creativeCoordinator,
                video_editor: briefData.assignedDesigner,
                description: `DRAFT EMAIL BRIEF (Auto-saved):
                
Brief Type: ${briefData.briefType}
Campaign/Flow: ${briefData.campaignFlowName}
Due Date: ${briefData.dueDate}
Designer: ${briefData.assignedDesigner}
Strategist: ${briefData.strategist}
Creative Coordinator: ${briefData.creativeCoordinator}

Primary Goal: ${briefData.primaryGoal}

Subject Lines: ${briefData.subjectLineVariations.map(v => v.subject).filter(s => s.trim()).join(', ')}

Storyboard Sections: ${briefData.storyboardSections.length} sections created

This is a draft that auto-saves as you work. Click "Generate & Populate Brief" to run AI analysis.`
            });

            console.log('Auto-saved draft');
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't show error to user for auto-save failures
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <Link href={`/app/powerbrief/${brandId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Brand
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{batch?.name}</h1>
                        <p className="text-gray-600">{brand?.name} - Interactive Email Brief Builder</p>
                    </div>
                </div>
                <Button onClick={handleCreateConcept}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Email Concept
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Concepts List Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Concepts ({concepts.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {concepts.map((concept) => (
                                    <div
                                        key={concept.id}
                                        className={`p-3 rounded border cursor-pointer transition-colors ${
                                            activeConceptId === concept.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setActiveConceptId(concept.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{concept.concept_title}</p>
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
                                            <div className="flex items-center space-x-1">
                                                {generatingConceptIds[concept.id] && (
                                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteConcept(concept.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {concepts.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <p className="text-sm">No email concepts yet.</p>
                                        <p className="text-xs">Create your first email concept to get started.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Interactive Email Brief Builder */}
                <div className="lg:col-span-3">
                    {activeConceptId ? (
                        <>
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold flex items-center">
                                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                                    Interactive Email Brief Builder
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    This is a living document - build your brief interactively with modular sections and AI assistance.
                                </p>
                            </div>
                            
                            <EmailBriefBuilder
                                onSave={handleGenerateEmailBrief}
                                onAutoSave={handleAutoSave}
                                isGenerating={generatingAI}
                                populatedData={populatedBriefData}
                            />
                        </>
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Select an Email Concept
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Choose an email concept from the sidebar or create a new one to start building your interactive brief.
                                </p>
                                <Button onClick={handleCreateConcept}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Email Concept
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Success Message - Only show after fresh generation, positioned higher */}
            {justGenerated && activeConceptId && (
                <div className="mt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Sparkles className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                    Brief Generated Successfully
                                </h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>
                                        Your interactive email brief has been populated with AI-generated content. 
                                        Review and edit the sections above as needed.
                                    </p>
                                </div>
                            </div>
                            <div className="ml-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setJustGenerated(false)}
                                    className="text-green-600 hover:text-green-800"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Brief Status Summary - Only show if concept has content and not just generated */}
            {activeConceptId && !justGenerated && (
                <div className="mt-8">
                    {(() => {
                        const activeConcept = concepts.find(c => c.id === activeConceptId);
                        if (!activeConcept?.body_content_structured?.length) return null;

                        return (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Email Brief Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {activeConcept.body_content_structured?.length > 0 && (
                                            <div>
                                                <h4 className="font-medium mb-2">Email Storyboard Summary</h4>
                                                <div className="space-y-2">
                                                    {activeConcept.body_content_structured.map((scene, index) => (
                                                        <div key={index} className="text-sm bg-gray-50 p-2 rounded border-l-4 border-blue-400">
                                                            <span className="font-medium">{scene.scene_title}:</span> {scene.script.substring(0, 100)}...
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })()}
                </div>
            )}
        </div>
    );
} 