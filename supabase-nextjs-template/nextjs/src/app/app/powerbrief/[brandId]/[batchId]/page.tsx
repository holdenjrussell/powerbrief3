"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useRouter } from 'next/navigation';
import { getBriefBatchById, getBrandById, getBriefConcepts, createBriefConcept, updateBriefConcept, deleteBriefConcept, deleteBriefBatch, updateBriefBatch, uploadMedia, shareBriefBatch, shareBriefConcept } from '@/lib/services/powerbriefService';
import { getProductsByBrand } from '@/lib/services/productService';
import { Brand, BriefBatch, BriefConcept, Scene, Hook, AiBriefingRequest, ShareSettings, Product, CustomLink, Prerequisite } from '@/lib/types/powerbrief';
import { 
    Sparkles, Plus, X, FileUp, Trash2, Share2, MoveUp, MoveDown, 
    Loader2, Check, Pencil, Bug, Film, FileImage, ArrowLeft, Copy, LinkIcon, Mail,
    Filter, SortAsc, RotateCcw, ExternalLink, XCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MarkdownTextarea from '@/components/ui/markdown-textarea';
import ConceptVoiceGenerator from '@/components/ConceptVoiceGenerator';
import { v4 as uuidv4 } from 'uuid';

// Helper to unwrap params safely
type ParamsType = { brandId: string, batchId: string };

export default function ConceptBriefingPage({ params }: { params: ParamsType }) {
    const { user } = useGlobal();
    const router = useRouter();
    const [loading, setLoading] = useState<boolean>(true);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [batch, setBatch] = useState<BriefBatch | null>(null);
    const [concepts, setConcepts] = useState<BriefConcept[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState<boolean>(false);
    const [deletingBatch, setDeletingBatch] = useState<boolean>(false);
    const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
    const [savingConceptId, setSavingConceptId] = useState<string | null>(null);
    const [generatingAI, setGeneratingAI] = useState<boolean>(false);
    const [generatingConceptIds, setGeneratingConceptIds] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const multipleFileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef<Record<string, boolean>>({});
    const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
    const [localCtaScript, setLocalCtaScript] = useState<Record<string, string>>({});
    const [localCtaTextOverlay, setLocalCtaTextOverlay] = useState<Record<string, string>>({});
    const [localScenes, setLocalScenes] = useState<Record<string, Scene[]>>({});
    const [localDescriptions, setLocalDescriptions] = useState<Record<string, string>>({});
    const [localVideoInstructions, setLocalVideoInstructions] = useState<Record<string, string>>({});
    const [localDesignerInstructions, setLocalDesignerInstructions] = useState<Record<string, string>>({});
    const [showPromptDebugDialog, setShowPromptDebugDialog] = useState<boolean>(false);
    const [debugPrompt, setDebugPrompt] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);
    const [startingConceptNumber, setStartingConceptNumber] = useState<number>(1);
    const [showBatchSettingsDialog, setShowBatchSettingsDialog] = useState<boolean>(false);
    const [localClickupLinks, setLocalClickupLinks] = useState<Record<string, string>>({});
    const [editingClickupLink, setEditingClickupLink] = useState<string | null>(null);
    const [localStrategists, setLocalStrategists] = useState<Record<string, string>>({});
    const [localCreativeCoordinators, setLocalCreativeCoordinators] = useState<Record<string, string>>({});
    const [localVideoEditors, setLocalVideoEditors] = useState<Record<string, string>>({});
    const [localBriefRevisionComments, setLocalBriefRevisionComments] = useState<Record<string, string>>({});
    
    // Sharing related state
    const [showShareBatchDialog, setShowShareBatchDialog] = useState<boolean>(false);
    const [showShareConceptDialog, setShowShareConceptDialog] = useState<boolean>(false);
    const [sharingConceptId, setSharingConceptId] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState<string>('');
    const [shareEmail, setShareEmail] = useState<string>('');
    const [shareIsEditable, setShareIsEditable] = useState<boolean>(true);
    const [sharingInProgress, setSharingInProgress] = useState<boolean>(false);
    const [shareSuccess, setShareSuccess] = useState<boolean>(false);
    const [localMediaTypes, setLocalMediaTypes] = useState<Record<string, 'video' | 'image'>>({});
    const [localHookTypes, setLocalHookTypes] = useState<Record<string, 'text' | 'verbal' | 'both'>>({});
    const [localHookCounts, setLocalHookCounts] = useState<Record<string, number>>({});
    
    // Individual hooks state
    const [localTextHooksList, setLocalTextHooksList] = useState<Record<string, Hook[]>>({});
    const [localSpokenHooksList, setLocalSpokenHooksList] = useState<Record<string, Hook[]>>({});

    // Custom links state
    const [localCustomLinks, setLocalCustomLinks] = useState<Record<string, CustomLink[]>>({});

    // Prerequisites state
    const [localPrerequisites, setLocalPrerequisites] = useState<Record<string, Prerequisite[]>>({});
    const [customPrerequisiteTypes, setCustomPrerequisiteTypes] = useState<Record<string, string[]>>({});

    // Filtering and sorting state
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterEditor, setFilterEditor] = useState<string>('all');
    const [filterProduct, setFilterProduct] = useState<string>('all');
    const [filterStrategist, setFilterStrategist] = useState<string>('all');
    const [filterMediaType, setFilterMediaType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('default');

    // Content type detection
    const [contentType, setContentType] = useState<string>('ads');

    // Hard-coded system instructions for different content types
    const SYSTEM_INSTRUCTIONS = {
        ads: {
            image: `You are an expert advertising strategist and direct response copywriter.

Given the brand context (positioning, target audience, competitors), concept prompt, and image (if provided), analyze the ad and generate a concise, image-based creative brief. Your goal is to recreate the image as closely as possible with a focus on matching the word count, tone, structure, placement, and visual composition.

The "description" is NOT a creative description—it is a set of specific, visual instructions for a designer. It should include:
• The reworded or matched headline and any subtext
• Text length and positioning
• Shot type or framing (e.g. close-up of product, lifestyle background, text placement)
• Any graphic or layout cues (font treatment, overlay placement, etc.)

Reword lightly only if the prompt asks for it—otherwise, mimic the image precisely.

Only generate a cta if the prompt explicitly asks for it.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
"description": "Designer-facing instructions based on the image (tone, layout, copy length, shot composition)",
"cta": "Only include if explicitly requested in the prompt"
}

Only return that JSON structure. No preamble or explanations.`,
            video: `You are an expert advertising strategist and copywriter specializing in direct response marketing.
Given the brand context (positioning, target audience, competitors), concept prompt, and video content (if provided), generate ad creative components that specifically relate to the video content. DO NOT EVER use another brand than specified in brand name: [Insert Brand name here]

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "text_hook_options": ["Hook 1 with emojis 🎯", "Hook 2 with emojis 💪", "Hook 3 with emojis ✨"],
  "spoken_hook_options": ["Verbal hook 1 to be spoken", "Verbal hook 2 to be spoken", "Verbal hook 3 to be spoken"],
  "body_content_structured_scenes": [
    {
      "scene_title": "Scene 1 (optional)",
      "script": "Script content for this scene",
      "visuals": "Visual description for this scene"
    }
  ],
  "cta_script": "Call to action script",
  "cta_text_overlay": "Text overlay for the CTA"
}

NOTES:
- text_hook_options: Array of text hooks with emojis suitable for social media captions (TikTok titles, Instagram reel titles)
- spoken_hook_options: Array of verbal hooks meant to be spoken in videos
- Each hook should be a separate string in the array
- Generate exactly the number of hooks requested

Important that we automatically ensure the content is optimized for the specific platform and campaign type.`
        },
        'web-assets': {
            default: `You are an expert web content strategist and conversion optimization specialist.

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

Focus on conversion optimization, user experience, and brand consistency.`
        },
        email: {
            default: `You are an expert email marketing strategist and multimodal AI assistant specializing in high-converting campaigns and automated flows. Your goal is to take a user's high-level goal AND their visual inspiration to generate a structured, effective email brief for a graphic designer. You specialize in direct-to-consumer e-commerce and Klaviyo.

**Input Analysis Priority:**

1. **Visual Analysis (HIGHEST PRIORITY - Multimodal Analysis):**
   - If images are provided via Files API, perform deep visual analysis
   - Identify mood & vibe: luxurious, playful, minimalist, urgent, natural, technical
   - Extract color palette: primary, secondary, accent colors and their tones
   - Analyze typography style: serif/sans-serif, bold/light, modern/classic
   - Study layout & composition: dense/spacious, symmetrical/asymmetrical, whitespace usage
   - Examine image style: dark/moody, bright/airy, product-focused, lifestyle shots
   - Note design elements: patterns, textures, icons, graphics, borders
   - Assess brand aesthetic: premium, approachable, edgy, clean, organic

2. **Textual Analysis:**
   - Analyze the Primary Goal & Core Message provided by the user
   - Consider Brief Type (Campaign or Flow) and specific details
   - Factor in brand context and target audience

**Generation Requirements:**

Generate structured email brief components that seamlessly blend visual inspiration with strategic email marketing:

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "campaign_type": "promotional|welcome_series|nurture|cart_abandonment|re_engagement",
  "inbox_presence": {
    "subject_line_variations": [
      {
        "subject": "Subject line 1 (tone matched to visual mood - if visuals are elegant/luxurious, use sophisticated language; if bright/playful, use energetic language)",
        "preheader": "Preheader text that complements subject",
        "tone_rationale": "Brief explanation of tone choice based on visual inspiration analysis"
      },
      {
        "subject": "Subject line 2 (alternative approach but consistent visual mood)",
        "preheader": "Alternative preheader text",
        "tone_rationale": "Rationale for this variation"
      }
    ]
  },
  "email_storyboard": [
    {
      "section_type": "hero_image|text_block|product_grid|cta_button|spacer",
      "content": {
        "headline": "Copy for this section",
        "body_text": "Supporting copy if applicable",
        "cta_text": "Button text if applicable"
      },
      "visual_direction": "Specific visual recommendations based on uploaded inspiration. Include color palette from analysis (e.g., 'Use warm terracotta primary from inspiration with cream accents'), typography style (e.g., 'Modern sans-serif, bold weight matching inspiration aesthetic'), layout approach (e.g., 'Spacious layout with generous whitespace like inspiration images'), and image treatment (e.g., 'Bright, airy product photography style matching inspiration mood'). Be specific about how each element should reflect the visual inspiration."
    }
  ],
  "primary_cta": {
    "button_text": "Action-oriented button text",
    "destination_url_placeholder": "Where this should link (e.g., 'Product landing page')",
    "visual_recommendation": "Button design suggestions based on inspiration analysis (colors extracted from uploaded images, shape and styling that matches inspiration aesthetic, hover effects that align with brand mood from visuals)"
  },
  "design_notes": {
    "overall_aesthetic": "Summary of the visual direction based on comprehensive analysis of uploaded inspiration (mood, style, sophistication level)",
    "color_palette": "Specific colors extracted from inspiration images with hex codes if discernible (e.g., 'Primary: Deep forest green #2B4A3F, Secondary: Warm cream #F7F3E9, Accent: Rose gold #E8B4A0')",
    "typography_style": "Font recommendations based on visual analysis (specific font families or styles that match inspiration, weight and character)",
    "layout_approach": "Spacing, grid, and composition recommendations directly informed by inspiration layout analysis",
    "mobile_optimization": "Mobile-specific design considerations that maintain inspiration aesthetic on smaller screens"
  },
  "personalization_elements": [
    "Dynamic content areas based on customer data (product recommendations, location-based offers)",
    "Segmentation opportunities for different customer types",
    "Behavioral triggers to incorporate (browse abandonment, purchase history)"
  ]
}

**Critical Requirements:**
- Always prioritize and reference uploaded inspiration images in your visual recommendations
- Create a direct connection between analyzed visual elements and generated content
- Align copy tone with visual mood (sophisticated visuals = elevated language, playful visuals = energetic copy)
- Provide specific, actionable design direction that a designer can immediately implement
- Extract and specify color palettes, typography styles, and layout approaches from visual analysis
- Focus on e-commerce conversion optimization while maintaining visual inspiration alignment
- Generate 2-3 subject line variations with different approaches but consistent visual mood alignment
- Ensure all recommendations work cohesively to create a unified email experience

Focus on deliverability, engagement metrics, conversion optimization, and seamless integration of visual inspiration with strategic email marketing best practices.`
        },
        sms: {
            default: `You are an expert SMS marketing strategist specializing in high-converting mobile campaigns and automated messaging flows.

Given the brand context (positioning, target audience, competitors) and concept prompt, generate comprehensive SMS campaign specifications optimized for mobile engagement and conversion within character limits.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "campaign_type": "promotional|welcome|abandoned_cart|flash_sale|appointment_reminder|customer_service",
  "message_options": [
    {
      "message": "SMS message 1 (under 160 characters)",
      "character_count": 45,
      "tone": "direct|friendly|urgent|professional"
    },
    {
      "message": "SMS message 2 (under 160 characters)", 
      "character_count": 52,
      "tone": "direct|friendly|urgent|professional"
    },
    {
      "message": "SMS message 3 (under 160 characters)",
      "character_count": 38,
      "tone": "direct|friendly|urgent|professional"
    }
  ],
  "link_strategy": {
    "link_placement": "Where to place links for maximum impact",
    "link_text": "How to present links (full URL vs branded short link)",
    "landing_page_optimization": "Landing page requirements for SMS traffic"
  },
  "timing_recommendations": {
    "optimal_send_times": "Best times to send based on audience",
    "frequency_caps": "How often to message to avoid fatigue",
    "timezone_considerations": "Geographic timing optimization"
  },
  "compliance_notes": [
    "TCPA compliance requirements",
    "Opt-out mechanisms", 
    "Required disclaimers or legal text"
  ],
  "personalization_options": [
    "Name personalization opportunities",
    "Location-based customization",
    "Purchase history integration"
  ],
  "follow_up_sequence": [
    {
      "timing": "Time delay for follow-up",
      "message": "Follow-up message content",
      "condition": "When to send this follow-up"
    }
  ]
}

Focus on compliance, engagement within character limits, and mobile-first user experience.`
        },
        'organic-social': {
            default: `You are an expert organic social media strategist specializing in platform-specific content that drives engagement and builds authentic community.

Given the brand context (positioning, target audience, competitors) and concept prompt, generate comprehensive social media content specifications optimized for organic reach and authentic engagement.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "platform_focus": "instagram|tiktok|facebook|linkedin|twitter|pinterest|youtube_shorts",
  "content_type": "image_post|video_post|carousel|story|reel|live_stream",
  "caption_options": [
    {
      "caption": "Caption 1 with appropriate hashtags and emojis",
      "tone": "educational|entertaining|inspirational|behind_scenes",
      "character_count": 150
    },
    {
      "caption": "Caption 2 with appropriate hashtags and emojis", 
      "tone": "educational|entertaining|inspirational|behind_scenes",
      "character_count": 180
    }
  ],
  "hashtag_strategy": {
    "branded_hashtags": ["Brand-specific hashtags"],
    "community_hashtags": ["Community and niche hashtags"],
    "trending_hashtags": ["Current trending hashtags to consider"],
    "hashtag_count": "Optimal number for the platform"
  },
  "visual_content": {
    "image_style": "Photography style and aesthetic requirements",
    "video_specifications": "Video format, length, and style requirements",
    "graphic_elements": "Text overlays, graphics, or design elements",
    "brand_consistency": "Brand guideline adherence requirements"
  },
  "engagement_strategy": {
    "cta_in_caption": "Specific call-to-action for engagement",
    "story_elements": "How to encourage shares and saves",
    "community_building": "Ways to foster community interaction"
  },
  "posting_optimization": {
    "optimal_posting_times": "Best times for the target audience",
    "content_series_potential": "How this fits into a content series",
    "cross_platform_adaptation": "How to adapt for other platforms"
  },
  "analytics_focus": [
    "Key metrics to track for this content type",
    "Engagement indicators to monitor",
    "Content performance optimization strategies"
  ]
}

Focus on authentic engagement, platform-specific optimization, and community building.`
        },
        blog: {
            default: `You are an expert content strategist and SEO copywriter specializing in blog content that ranks well and drives meaningful engagement.

Given the brand context (positioning, target audience, competitors) and concept prompt, generate comprehensive blog content specifications optimized for search visibility, reader engagement, and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:

{
  "content_type": "how_to_guide|listicle|case_study|opinion_piece|news_analysis|comparison|ultimate_guide",
  "seo_elements": {
    "primary_keyword": "Main target keyword",
    "secondary_keywords": ["Supporting keywords for content optimization"],
    "title_options": [
      "SEO-optimized title option 1",
      "SEO-optimized title option 2", 
      "SEO-optimized title option 3"
    ],
    "meta_description": "160-character meta description optimized for CTR",
    "target_word_count": "1500-3000"
  },
  "content_structure": {
    "introduction": "Hook and value proposition for readers",
    "main_sections": [
      {
        "heading": "H2 section heading",
        "key_points": ["Main points to cover in this section"],
        "supporting_content": "Examples, data, or case studies to include"
      }
    ],
    "conclusion": "Summary and clear next steps for readers"
  },
  "engagement_elements": {
    "visual_content": [
      "Featured image requirements",
      "In-content visuals (charts, screenshots, infographics)",
      "Video content opportunities"
    ],
    "interactive_elements": [
      "Calls-to-action throughout the content",
      "Lead magnets or content upgrades",
      "Social sharing optimization"
    ]
  },
  "internal_linking": {
    "target_pages": ["Relevant internal pages to link to"],
    "anchor_text_suggestions": ["Natural anchor text options"],
    "linking_strategy": "How to distribute internal links effectively"
  },
  "conversion_optimization": {
    "primary_cta": "Main conversion goal for this content",
    "lead_magnets": "Content upgrades or free resources to offer",
    "email_capture": "Newsletter signup strategy and placement"
  },
  "content_promotion": {
    "social_media_angles": ["How to promote on different social platforms"],
    "email_newsletter": "How to feature in email marketing",
    "repurposing_opportunities": ["Ways to repurpose this content"]
  }
}

Focus on search optimization, reader value, and conversion potential.`
        }
    };

    // Extract params using React.use()
    const unwrappedParams = params instanceof Promise ? React.use(params) : params;
    const { brandId, batchId } = unwrappedParams;

    // Detect content type from URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlContentType = urlParams.get('content_type');
        if (urlContentType) {
            setContentType(urlContentType);
        }
    }, []);

    // Helper function to parse hooks from string format
    const parseHooksFromString = (hooksString: string): Hook[] => {
        if (!hooksString || typeof hooksString !== 'string') {
            return [];
        }
        return hooksString.split('\\n').filter(line => line.trim() !== '').map((line, index) => ({
            id: uuidv4(), 
            title: `Hook ${index + 1}`, 
            content: line.trim(),
            is_active: true 
        }));
    };

    const convertHooksToString = (hooks: Hook[]): string => {
        if (!hooks || !Array.isArray(hooks)) return '';
        return hooks.map(hook => hook.content).join('\\n');
    };

    // Filtering and sorting functions
    const getUniqueValues = (field: keyof BriefConcept): string[] => {
        const values = concepts
            .map(concept => concept[field] as string)
            .filter(value => value && value.trim() !== '')
            .filter((value, index, array) => array.indexOf(value) === index);
        return values.sort();
    };

    const getUniqueProducts = (): Product[] => {
        const usedProductIds = concepts
            .map(concept => concept.product_id)
            .filter(id => id !== null);
        return products.filter(product => usedProductIds.includes(product.id));
    };

    const filterConcepts = (conceptsToFilter: BriefConcept[]): BriefConcept[] => {
        return conceptsToFilter.filter(concept => {
            // Status filter
            if (filterStatus !== 'all' && concept.status !== filterStatus) {
                return false;
            }
            
            // Editor filter
            if (filterEditor !== 'all' && concept.video_editor !== filterEditor) {
                return false;
            }
            
            // Product filter
            if (filterProduct !== 'all' && concept.product_id !== filterProduct) {
                return false;
            }
            
            // Strategist filter
            if (filterStrategist !== 'all' && concept.strategist !== filterStrategist) {
                return false;
            }
            
            // Media type filter
            if (filterMediaType !== 'all' && concept.media_type !== filterMediaType) {
                return false;
            }
            
            return true;
        });
    };

    const sortConcepts = (conceptsToSort: BriefConcept[]): BriefConcept[] => {
        const sorted = [...conceptsToSort];
        
        switch (sortBy) {
            case 'date_assigned_newest':
                return sorted.sort((a, b) => {
                    if (!a.date_assigned && !b.date_assigned) return 0;
                    if (!a.date_assigned) return 1;
                    if (!b.date_assigned) return -1;
                    return new Date(b.date_assigned).getTime() - new Date(a.date_assigned).getTime();
                });
            case 'date_assigned_oldest':
                return sorted.sort((a, b) => {
                    if (!a.date_assigned && !b.date_assigned) return 0;
                    if (!a.date_assigned) return 1;
                    if (!b.date_assigned) return -1;
                    return new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime();
                });
            case 'status':
                return sorted.sort((a, b) => {
                    const statusA = a.status || '';
                    const statusB = b.status || '';
                    return statusA.localeCompare(statusB);
                });
            case 'editor':
                return sorted.sort((a, b) => {
                    const editorA = a.video_editor || '';
                    const editorB = b.video_editor || '';
                    return editorA.localeCompare(editorB);
                });
            case 'strategist':
                return sorted.sort((a, b) => {
                    const strategistA = a.strategist || '';
                    const strategistB = b.strategist || '';
                    return strategistA.localeCompare(strategistB);
                });
            default:
                return sorted.sort((a, b) => a.order_in_batch - b.order_in_batch);
        }
    };

    // Get filtered and sorted concepts
    const sortedAndFilteredConcepts = sortConcepts(filterConcepts(concepts));

    const resetFilters = () => {
        setFilterStatus('all');
        setFilterEditor('all');
        setFilterProduct('all');
        setFilterStrategist('all');
        setFilterMediaType('all');
        setSortBy('default');
    };

    const hasActiveFilters = filterStatus !== 'all' || filterEditor !== 'all' || filterProduct !== 'all' || filterStrategist !== 'all' || filterMediaType !== 'all' || sortBy !== 'default';

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id || !brandId || !batchId) return;
            
            try {
                setLoading(true);
                const [brandData, batchData, conceptsData, productsData] = await Promise.all([
                    getBrandById(brandId),
                    getBriefBatchById(batchId),
                    getBriefConcepts(batchId),
                    getProductsByBrand(brandId)
                ]);
                
                if (!brandData || !batchData) {
                    router.push('/app/powerbrief');
                    return;
                }
                
                setBrand(brandData);
                setBatch(batchData);
                setConcepts(conceptsData);
                setProducts(productsData);

                // Set the starting concept number from the batch data, defaulting to 1 if not set
                setStartingConceptNumber(batchData.starting_concept_number || 1);

                // Initialize local states for each concept based on fetched data
                const initialLocalPrompts: Record<string, string> = {};
                // These are temporary holders if data is string, before converting to Hook[]
                const tempLegacyTextHooks: Record<string, string> = {}; 
                const tempLegacySpokenHooks: Record<string, string> = {};
                const initialLocalCtaScript: Record<string, string> = {};
                const initialLocalCtaTextOverlay: Record<string, string> = {};
                const initialLocalScenes: Record<string, Scene[]> = {};
                const initialLocalDescriptions: Record<string, string> = {};
                const initialLocalVideoInstructions: Record<string, string> = {};
                const initialLocalDesignerInstructions: Record<string, string> = {};
                const initialLocalClickupLinks: Record<string, string> = {};
                const initialLocalStrategists: Record<string, string> = {};
                const initialLocalCreativeCoordinators: Record<string, string> = {};
                const initialLocalVideoEditors: Record<string, string> = {};
                const initialLocalBriefRevisionComments: Record<string, string> = {};
                const initialLocalMediaTypes: Record<string, 'video' | 'image'> = {};
                const initialLocalHookTypes: Record<string, 'text' | 'verbal' | 'both'> = {};
                const initialLocalHookCounts: Record<string, number> = {};
                const initialLocalTextHooksList: Record<string, Hook[]> = {};
                const initialLocalSpokenHooksList: Record<string, Hook[]> = {};
                const initialLocalCustomLinks: Record<string, CustomLink[]> = {};
                const initialLocalPrerequisites: Record<string, Prerequisite[]> = {};

                conceptsData.forEach(concept => {
                    initialLocalPrompts[concept.id] = concept.ai_custom_prompt || '';
                    tempLegacyTextHooks[concept.id] = typeof concept.text_hook_options === 'string' ? concept.text_hook_options : ''; 
                    tempLegacySpokenHooks[concept.id] = typeof concept.spoken_hook_options === 'string' ? concept.spoken_hook_options : '';
                    initialLocalCtaScript[concept.id] = concept.cta_script || '';
                    initialLocalCtaTextOverlay[concept.id] = concept.cta_text_overlay || '';
                    initialLocalScenes[concept.id] = concept.body_content_structured || [];
                    initialLocalDescriptions[concept.id] = concept.description || '';
                    initialLocalVideoInstructions[concept.id] = concept.videoInstructions || '';
                    initialLocalDesignerInstructions[concept.id] = concept.designerInstructions || '';
                    initialLocalClickupLinks[concept.id] = concept.clickup_id || ''; // Note: uses clickup_id from concept
                    initialLocalStrategists[concept.id] = concept.strategist || '';
                    initialLocalCreativeCoordinators[concept.id] = concept.creative_coordinator || '';
                    initialLocalVideoEditors[concept.id] = concept.video_editor || '';
                    initialLocalBriefRevisionComments[concept.id] = concept.brief_revision_comments || '';
                    initialLocalMediaTypes[concept.id] = concept.media_type === 'image' ? 'image' : 'video'; // Corrected line
                    initialLocalHookTypes[concept.id] = concept.hook_type || 'both';
                    initialLocalHookCounts[concept.id] = concept.hook_count || 5;
                    
                    // Initialize custom links
                    initialLocalCustomLinks[concept.id] = concept.custom_links || [];
                    
                    // Initialize prerequisites
                    initialLocalPrerequisites[concept.id] = concept.prerequisites || [];
                    
                    // Initialize Hook lists
                    if (Array.isArray(concept.text_hook_options)) { // New JSONB format (Hook[])
                        initialLocalTextHooksList[concept.id] = concept.text_hook_options.map((hook: Hook | string, index: number) => (
                            typeof hook === 'string' 
                                ? { id: uuidv4(), title: `Hook ${index + 1}`, content: hook } 
                                : { id: hook.id || uuidv4(), title: hook.title || `Hook ${index + 1}`, content: hook.content || '' }
                        ));
                    } else if (typeof concept.text_hook_options === 'string') { // Old TEXT format
                        initialLocalTextHooksList[concept.id] = parseHooksFromString(concept.text_hook_options as string); 
                    } else {
                        initialLocalTextHooksList[concept.id] = []; // Default to empty array
                    }

                    if (Array.isArray(concept.spoken_hook_options)) { // New JSONB format (Hook[])
                        initialLocalSpokenHooksList[concept.id] = concept.spoken_hook_options.map((hook: Hook | string, index: number) => (
                            typeof hook === 'string' 
                                ? { id: uuidv4(), title: `Hook ${index + 1}`, content: hook } 
                                : { id: hook.id || uuidv4(), title: hook.title || `Hook ${index + 1}`, content: hook.content || '' }
                        ));
                    } else if (typeof concept.spoken_hook_options === 'string') { // Old TEXT format
                        initialLocalSpokenHooksList[concept.id] = parseHooksFromString(concept.spoken_hook_options as string);
                    } else {
                        initialLocalSpokenHooksList[concept.id] = []; // Default to empty array
                    }
                });

                setLocalPrompts(initialLocalPrompts);
                setLocalCtaScript(initialLocalCtaScript);
                setLocalCtaTextOverlay(initialLocalCtaTextOverlay);
                setLocalScenes(initialLocalScenes);
                setLocalDescriptions(initialLocalDescriptions);
                setLocalVideoInstructions(initialLocalVideoInstructions);
                setLocalDesignerInstructions(initialLocalDesignerInstructions);
                setLocalClickupLinks(initialLocalClickupLinks);
                setLocalStrategists(initialLocalStrategists);
                setLocalCreativeCoordinators(initialLocalCreativeCoordinators);
                setLocalVideoEditors(initialLocalVideoEditors);
                setLocalBriefRevisionComments(initialLocalBriefRevisionComments);
                setLocalMediaTypes(initialLocalMediaTypes);
                setLocalHookTypes(initialLocalHookTypes);
                setLocalHookCounts(initialLocalHookCounts);
                setLocalTextHooksList(initialLocalTextHooksList); // This is the Hook[] list
                setLocalSpokenHooksList(initialLocalSpokenHooksList); // This is the Hook[] list
                setLocalCustomLinks(initialLocalCustomLinks); // This is the CustomLink[] list
                setLocalPrerequisites(initialLocalPrerequisites); // This is the Prerequisite[] list
                
                if (conceptsData.length > 0 && !activeConceptId) {
                    setActiveConceptId(conceptsData[0].id);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user?.id, brandId, batchId, router, activeConceptId]);

    // Delete batch
    const handleDeleteBatch = async () => {
        if (!batch) return;
        
        try {
            setDeletingBatch(true);
            await deleteBriefBatch(batch.id);
            router.push(`/app/powerbrief/${brandId}/briefs`);
        } catch (err) {
            console.error('Error deleting batch:', err);
            setError('Failed to delete batch. Please try again.');
            setDeletingBatch(false);
            setShowDeleteBatchDialog(false);
        }
    };

    // Update concept title with new numbering
    const updateConceptNumbering = async (startNumber: number) => {
        if (!concepts.length || !batch) return;
        
        const updatedConcepts = [...concepts].map((concept, index) => {
            return {
                ...concept,
                concept_title: `Concept ${startNumber + index}`
            };
        });
        
        try {
            // Update all concepts with new titles
            const updatePromises = updatedConcepts.map(concept => updateBriefConcept(concept));
            const updatedConceptsList = await Promise.all(updatePromises);
            
            // Update the batch with the new starting concept number
            const updatedBatch = await updateBriefBatch({
                ...batch,
                starting_concept_number: startNumber
            });
            
            // Update local state
            setConcepts(updatedConceptsList);
            setBatch(updatedBatch);
            setStartingConceptNumber(startNumber);
        } catch (err) {
            console.error('Failed to update concept numbering:', err);
            setError('Failed to update concept numbering. Please try again.');
        }
    };

    // Create new concept
    const handleCreateConcept = async () => {
        if (!user?.id || !batch || !brand) return;
        
        try {
            // Use the current starting number plus the existing concepts length
            const conceptNumber = startingConceptNumber + concepts.length;
            
            const newConcept = await createBriefConcept({
                brief_batch_id: batch.id,
                user_id: user.id,
                concept_title: `Concept ${conceptNumber}`,
                body_content_structured: [],
                order_in_batch: concepts.length,
                clickup_id: null,
                clickup_link: null,
                custom_links: [],
                strategist: null,
                creative_coordinator: null,
                video_editor: null,
                editor_id: null,
                custom_editor_name: null,
                status: null,
                date_assigned: null,
                media_url: null,
                media_type: null,
                ai_custom_prompt: null,
                text_hook_options: [], // Initialize as empty Hook[] for JSONB
                spoken_hook_options: [], // Initialize as empty Hook[] for JSONB
                cta_script: null,
                cta_text_overlay: null,
                description: null,
                videoInstructions: brand.default_video_instructions || '',
                designerInstructions: brand.default_designer_instructions || '',
                product_id: null,
                review_status: null,
                review_link: null,
                review_comments: null,
                brief_revision_comments: null,
                hook_type: null,
                hook_count: null,
                prerequisites: [] // Initialize as empty Prerequisite[] for JSONB
            });
            
            setConcepts(prev => [...prev, newConcept]);
            
            // Initialize local state for the new concept
            setLocalVideoInstructions(prev => ({
                ...prev,
                [newConcept.id]: newConcept.videoInstructions || ''
            }));
            
            setLocalDesignerInstructions(prev => ({
                ...prev,
                [newConcept.id]: newConcept.designerInstructions || ''
            }));
            
            // Only set the new concept as active if there's no active concept already
            if (!activeConceptId) {
                setActiveConceptId(newConcept.id);
            }
        } catch (err) {
            console.error('Failed to create concept:', err);
            setError('Failed to create concept. Please try again.');
        } finally {
            // Removed setSaving(false) as 'saving' state is no longer used
        }
    };

    // Delete concept
    const handleDeleteConcept = async (conceptId: string) => {
        try {
            setSavingConceptId(conceptId);
            await deleteBriefConcept(conceptId);
            
            setConcepts(prev => prev.filter(c => c.id !== conceptId));
            
            if (activeConceptId === conceptId) {
                const remaining = concepts.filter(c => c.id !== conceptId);
                setActiveConceptId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            console.error('Failed to delete concept:', err);
            setError('Failed to delete concept. Please try again.');
        } finally {
            setSavingConceptId(null);
        }
    };

    // Update concept
    const handleUpdateConcept = async (concept: BriefConcept) => {
        try {
            // Store the previous status to check if it changed
            const previousStatus = concepts.find(c => c.id === concept.id)?.status;
            
            // Set date_assigned when status changes to READY FOR EDITOR or READY FOR DESIGNER
            if (previousStatus !== concept.status && 
                (concept.status === 'READY FOR EDITOR' || concept.status === 'READY FOR DESIGNER')) {
                concept.date_assigned = new Date().toISOString();
            }
            
            // Synchronize review_status based on status
            if (concept.status === 'APPROVED' && concept.review_status !== 'approved') {
                concept.review_status = 'approved';
            } else if (concept.status === 'REVISIONS REQUESTED' && concept.review_status !== 'needs_revisions') {
                concept.review_status = 'needs_revisions';
            } else if (concept.status === 'READY FOR REVIEW' && concept.review_status !== 'ready_for_review') {
                concept.review_status = 'ready_for_review';
            }
            
            const updatedConcept = await updateBriefConcept(concept);
            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );
            
            // Send Slack notification if status changed to "READY FOR EDITOR"
            if (previousStatus !== 'READY FOR EDITOR' && concept.status === 'READY FOR EDITOR' && batch) {
                try {
                    // Create share links for the concept and batch
                    const conceptShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const batchShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const [conceptShareResult, batchShareResult] = await Promise.all([
                        shareBriefConcept(concept.id, 'link', conceptShareSettings),
                        shareBriefBatch(batch.id, 'link', batchShareSettings)
                    ]);
                    
                    await fetch('/api/slack/concept-ready-for-editor', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: concept.id,
                            conceptTitle: concept.concept_title,
                            batchName: batch.name,
                            brandId: batch.brand_id,
                            assignedEditor: concept.video_editor,
                            assignedStrategist: concept.strategist,
                            assignedCreativeCoordinator: concept.creative_coordinator,
                            briefRevisionComments: concept.brief_revision_comments,
                            conceptShareUrl: conceptShareResult.share_url,
                            batchShareUrl: batchShareResult.share_url
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for concept ready for editor:', slackError);
                    // Don't fail the status update if Slack notification fails
                }
            }
            
            // Send Slack notification if status changed to "READY FOR EDITOR ASSIGNMENT"
            if (previousStatus !== 'READY FOR EDITOR ASSIGNMENT' && concept.status === 'READY FOR EDITOR ASSIGNMENT' && batch) {
                try {
                    // Create share links for the concept and batch
                    const conceptShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const batchShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const [conceptShareResult, batchShareResult] = await Promise.all([
                        shareBriefConcept(concept.id, 'link', conceptShareSettings),
                        shareBriefBatch(batch.id, 'link', batchShareSettings)
                    ]);
                    
                    await fetch('/api/slack/concept-ready-for-editor-assignment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: concept.id,
                            conceptTitle: concept.concept_title,
                            batchName: batch.name,
                            brandId: batch.brand_id,
                            assignedEditor: concept.video_editor,
                            assignedStrategist: concept.strategist,
                            assignedCreativeCoordinator: concept.creative_coordinator,
                            conceptShareUrl: conceptShareResult.share_url,
                            batchShareUrl: batchShareResult.share_url
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for concept ready for editor assignment:', slackError);
                    // Don't fail the status update if Slack notification fails
                }
            }
            
            // Send Slack notification if status changed to "BRIEF REVISIONS NEEDED"
            if (previousStatus !== 'BRIEF REVISIONS NEEDED' && concept.status === 'BRIEF REVISIONS NEEDED' && batch) {
                try {
                    // Create share links for the concept and batch
                    const conceptShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const batchShareSettings = {
                        is_editable: true,
                        expires_at: null
                    };
                    
                    const [conceptShareResult, batchShareResult] = await Promise.all([
                        shareBriefConcept(concept.id, 'link', conceptShareSettings),
                        shareBriefBatch(batch.id, 'link', batchShareSettings)
                    ]);
                    
                    await fetch('/api/slack/brief-revisions-needed', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: concept.id,
                            conceptTitle: concept.concept_title,
                            batchName: batch.name,
                            brandId: batch.brand_id,
                            assignedStrategist: concept.strategist,
                            assignedCreativeCoordinator: concept.creative_coordinator,
                            briefRevisionComments: concept.brief_revision_comments,
                            conceptShareUrl: conceptShareResult.share_url,
                            batchShareUrl: batchShareResult.share_url
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for brief revisions needed:', slackError);
                    // Don't fail the status update if Slack notification fails
                }
            }
            
            return updatedConcept;
        } catch (err) {
            console.error('Error updating concept:', err);
            throw err;
        }
    };

    // Upload media for a concept
    const handleUploadMedia = async (file: File, conceptId: string) => {
        if (!user?.id) return;
        
        try {
            setSavingConceptId(conceptId);
            
            const mediaUrl = await uploadMedia(file, user.id);
            const concept = concepts.find(c => c.id === conceptId);
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            
            if (concept) {
                const updatedConcept = await updateBriefConcept({
                    ...concept,
                    id: conceptId,
                    media_url: mediaUrl,
                    media_type: mediaType
                });
                
                setConcepts(prev => 
                    prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
                );
                
                // Also update local media type
                setLocalMediaTypes(prev => ({
                    ...prev,
                    [conceptId]: mediaType
                }));
            }
        } catch (err) {
            console.error('Failed to upload media:', err);
            setError('Failed to upload media. Please try again.');
        } finally {
            setSavingConceptId(null);
        }
    };

    // Bulk upload media (EZ UPLOAD)
    const handleBulkUploadMedia = async (files: FileList) => {
        if (!user?.id || !batch) return;
        
        try {
            setGeneratingAI(true);
            setError(null);
            
            const fileCount = files.length;
            console.log(`EZ UPLOAD: Starting to process ${fileCount} files`);
            
            // Convert FileList to array to ensure we can iterate properly
            const filesArray = Array.from(files);
            console.log(`EZ UPLOAD: Converted FileList to array with ${filesArray.length} items`);
            
            // Keep track of all successfully created concepts
            const newConcepts: BriefConcept[] = [];
            
            // Process each file one by one
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                console.log(`EZ UPLOAD: Processing file ${i+1}/${filesArray.length}: "${file.name}" (${file.type})`);
                
                try {
                    // Step 1: Upload the media file
                    console.log(`EZ UPLOAD: Uploading file ${i+1} to storage...`);
                    const mediaUrl = await uploadMedia(file, user.id);
                    console.log(`EZ UPLOAD: File ${i+1} uploaded successfully: ${mediaUrl}`);
                    
                    // Step 2: Create a new concept with the media URL
                    console.log(`EZ UPLOAD: Creating new concept for file ${i+1}...`);
                    const conceptNumber = startingConceptNumber + concepts.length + newConcepts.length;
                    console.log(`EZ UPLOAD: Using concept number ${conceptNumber}`);
                    
                    const newConcept = await createBriefConcept({
                        brief_batch_id: batch.id,
                        user_id: user.id,
                        concept_title: `Concept ${conceptNumber}`,
                        media_url: mediaUrl,
                        media_type: file.type.startsWith('video/') ? 'video' : 'image',
                        body_content_structured: [],
                        order_in_batch: concepts.length + newConcepts.length,
                        clickup_id: null,
                        clickup_link: null,
                        custom_links: [],
                        strategist: null,
                        creative_coordinator: null,
                        video_editor: null,
                        editor_id: null,
                        custom_editor_name: null,
                        status: null,
                        date_assigned: null,
                        ai_custom_prompt: null,
                        text_hook_options: [], // Initialize as empty Hook[] for JSONB
                        spoken_hook_options: [], // Initialize as empty Hook[] for JSONB
                        cta_script: null,
                        cta_text_overlay: null,
                        description: null,
                        videoInstructions: brand?.default_video_instructions || '',
                        designerInstructions: brand?.default_designer_instructions || '',
                        review_status: null,
                        review_link: null,
                        review_comments: null,
                        brief_revision_comments: null,
                        hook_type: null,
                        hook_count: null,
                        product_id: null,
                        prerequisites: [] // Initialize as empty Prerequisite[] for JSONB
                    });
                    
                    console.log(`EZ UPLOAD: Created new concept for file ${i+1} with ID: ${newConcept.id}`);
                    
                    // Step 3: Add the new concept to our tracking array
                    newConcepts.push(newConcept);
                    console.log(`EZ UPLOAD: Added concept to newConcepts array (now contains ${newConcepts.length} concepts)`);
                    
                    // Force a small delay to ensure processing completes
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // After adding the concept to newConcepts array
                    // Update local media type state to match
                    setLocalMediaTypes(prev => ({
                        ...prev,
                        [newConcept.id]: file.type.startsWith('video/') ? 'video' : 'image'
                    }));
                    
                } catch (fileErr) {
                    console.error(`EZ UPLOAD: Error processing file ${i+1}/${filesArray.length}:`, fileErr);
                    setError(prev => {
                        const newError = `Failed to process file ${i+1} (${file.name}): ${fileErr instanceof Error ? fileErr.message : 'Unknown error'}`;
                        return prev ? `${prev}\n${newError}` : newError;
                    });
                }
                
                // Force a small delay between files
                console.log(`EZ UPLOAD: Completed processing file ${i+1}/${filesArray.length}, waiting before next file...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // After all files are processed, update the concepts state once with all new concepts
            console.log(`EZ UPLOAD: All files processed. Created ${newConcepts.length} new concepts. Updating state...`);
            
            if (newConcepts.length > 0) {
                // Update all concepts at once to avoid state race conditions
                setConcepts(prevConcepts => {
                    const allConcepts = [...prevConcepts, ...newConcepts];
                    console.log(`EZ UPLOAD: State update - combining ${prevConcepts.length} existing concepts with ${newConcepts.length} new concepts = ${allConcepts.length} total`);
                    return allConcepts;
                });
                
                // Set the active concept ID if needed
                if (!activeConceptId) {
                    console.log(`EZ UPLOAD: Setting active concept ID to ${newConcepts[0].id}`);
                    setActiveConceptId(newConcepts[0].id);
                }
            }
            
            // Final status message
            if (newConcepts.length === 0) {
                console.error('EZ UPLOAD: Failed to upload any files');
                setError('Failed to upload any files. Please try again.');
            } else if (newConcepts.length < filesArray.length) {
                console.warn(`EZ UPLOAD: Partial success - uploaded ${newConcepts.length}/${filesArray.length} files`);
                setError(`Uploaded ${newConcepts.length}/${filesArray.length} files. Some files could not be uploaded.`);
            } else {
                console.log(`EZ UPLOAD: Success - processed all ${filesArray.length} files`);
            }
            
        } catch (err) {
            console.error('EZ UPLOAD: Fatal error in bulk upload:', err);
            setError(`Failed to upload media: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setGeneratingAI(false);
            console.log(`EZ UPLOAD: Process completed.`);
        }
    };

    // Generate AI brief for a concept
    const handleGenerateAI = async (conceptId: string) => {
        if (!brand || !user?.id) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        try {
            // Save the current prompt first if there's unsaved content in the input field
            const currentPromptValue = localPrompts[conceptId] || '';
            if (currentPromptValue !== concept.ai_custom_prompt) {
                // Clear any pending debounced updates
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                }
                
                // Update the concept with the current prompt immediately
                const updatedConceptWithPrompt = {
                    ...concept,
                    ai_custom_prompt: currentPromptValue
                };
                
                // Save the updated prompt first
                await updateBriefConcept(updatedConceptWithPrompt);
                
                // Update the local concepts state to reflect the saved prompt
                setConcepts(prev => 
                    prev.map(c => c.id === conceptId ? { ...c, ai_custom_prompt: currentPromptValue } : c)
                );
            }
            
            // Set this specific concept as generating
            setGeneratingConceptIds(prev => ({
                ...prev,
                [conceptId]: true
            }));
            
            // Now use the updated concept with the saved prompt
            // Re-fetch concept from state AFTER prompt save to ensure it includes the latest prompt
            const conceptWithSavedPrompt = concepts.find(c => c.id === conceptId) || concept; 
            
            // Get the current hook type and count from local state first, falling back to the concept values
            const hookType = localHookTypes[conceptId] || conceptWithSavedPrompt.hook_type || 'both';
            const hookCount = localHookCounts[conceptId] || conceptWithSavedPrompt.hook_count || 5;
            
            // Get product information if a product is selected for this concept
            let productInfo = null;
            if (conceptWithSavedPrompt.product_id) {
                const selectedProduct = products.find(p => p.id === conceptWithSavedPrompt.product_id);
                if (selectedProduct) {
                    productInfo = {
                        name: selectedProduct.name,
                        identifier: selectedProduct.identifier,
                        description: selectedProduct.description,
                        category: selectedProduct.category,
                        price: selectedProduct.price,
                        currency: selectedProduct.currency
                    };
                }
            }
            
            // First, save the hook type and count to the database to ensure consistency
            const updatedConceptWithHooks = {
                ...conceptWithSavedPrompt,
                hook_type: hookType,
                hook_count: hookCount
            };
            
            // Save the hook settings
            await updateBriefConcept(updatedConceptWithHooks);
            
            // Update the local concept state
            setConcepts(prev => 
                prev.map(c => c.id === conceptId ? updatedConceptWithHooks : c)
            );
            
            // Get the appropriate system instructions based on content type and media type
            let systemInstructions = '';
            
            // Use hard-coded system instructions based on content type
            if (contentType === 'ads') {
                if (conceptWithSavedPrompt.media_type === 'image') {
                    systemInstructions = SYSTEM_INSTRUCTIONS.ads.image;
                } else {
                    systemInstructions = SYSTEM_INSTRUCTIONS.ads.video;
                }
            } else {
                // For other content types, use the default instruction
                const contentInstructions = SYSTEM_INSTRUCTIONS[contentType as keyof typeof SYSTEM_INSTRUCTIONS];
                if (contentInstructions && 'default' in contentInstructions) {
                    systemInstructions = contentInstructions.default;
                } else {
                    // Fallback to ads if content type not found
                    systemInstructions = conceptWithSavedPrompt.media_type === 'image' ? SYSTEM_INSTRUCTIONS.ads.image : SYSTEM_INSTRUCTIONS.ads.video;
                }
            }
            
            const request: AiBriefingRequest = {
                brandContext: {
                    brand_info_data: JSON.stringify(brand.brand_info_data),
                    target_audience_data: JSON.stringify(brand.target_audience_data),
                    competition_data: JSON.stringify(brand.competition_data),
                    system_instructions_image: systemInstructions, // Use hard-coded instructions
                    system_instructions_video: systemInstructions, // Use hard-coded instructions  
                    product_info: productInfo
                },
                conceptSpecificPrompt: currentPromptValue, 
                conceptCurrentData: { 
                    text_hook_options: (localTextHooksList[conceptId] || []).map(h => h.content), 
                    spoken_hook_options: (localSpokenHooksList[conceptId] || []).map(h => h.content), 
                    body_content_structured: conceptWithSavedPrompt.body_content_structured || [],
                    cta_script: conceptWithSavedPrompt.cta_script || '',
                    cta_text_overlay: conceptWithSavedPrompt.cta_text_overlay || '',
                    description: conceptWithSavedPrompt.description || ''
                },
                media: {
                    url: conceptWithSavedPrompt.media_url || '',
                    type: conceptWithSavedPrompt.media_type || ''
                },
                desiredOutputFields: conceptWithSavedPrompt.media_type === 'image' 
                    ? ['description', 'cta'] // For image briefs
                    : ['text_hook_options', 'spoken_hook_options', 'body_content_structured_scenes', 'cta_script', 'cta_text_overlay'], // For video briefs
                hookOptions: {
                    type: hookType,
                    count: hookCount
                }
            };
            
            console.log('Sending AI generation request with hook options:', request.hookOptions);
            
            const response = await fetch('/api/ai/generate-brief', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error || `Failed to generate AI brief (HTTP ${response.status})`;
                throw new Error(errorMessage);
            }
            
            const aiResponse = await response.json();
            
            // Update concept with AI response
            const updatedConceptData: Partial<BriefConcept> = {
                body_content_structured: aiResponse.body_content_structured_scenes || conceptWithSavedPrompt.body_content_structured,
                cta_script: aiResponse.cta_script || conceptWithSavedPrompt.cta_script,
                cta_text_overlay: aiResponse.cta_text_overlay || conceptWithSavedPrompt.cta_text_overlay,
                description: aiResponse.description || conceptWithSavedPrompt.description
            };
            
            if (aiResponse.text_hook_options && Array.isArray(aiResponse.text_hook_options)) {
                console.log('AI Response - Text hooks array received:', aiResponse.text_hook_options);
                const newTextHooks: Hook[] = aiResponse.text_hook_options.map((hookContent: string, index: number) => ({ id: uuidv4(), title: `Hook ${index + 1}`, content: hookContent }));
                updatedConceptData.text_hook_options = newTextHooks;
                setLocalTextHooksList(prev => ({
                    ...prev,
                    [conceptId]: newTextHooks
                }));
            } else if (conceptWithSavedPrompt.text_hook_options) {
                updatedConceptData.text_hook_options = conceptWithSavedPrompt.text_hook_options;
            }
            
            if (aiResponse.spoken_hook_options && Array.isArray(aiResponse.spoken_hook_options)) {
                console.log('AI Response - Spoken hooks array received:', aiResponse.spoken_hook_options);
                const newSpokenHooks: Hook[] = aiResponse.spoken_hook_options.map((hookContent: string, index: number) => ({ id: uuidv4(), title: `Hook ${index + 1}`, content: hookContent }));
                updatedConceptData.spoken_hook_options = newSpokenHooks;
                setLocalSpokenHooksList(prev => ({
                    ...prev,
                    [conceptId]: newSpokenHooks
                }));
            } else if (conceptWithSavedPrompt.spoken_hook_options) {
                updatedConceptData.spoken_hook_options = conceptWithSavedPrompt.spoken_hook_options;
            }
            
            const conceptToUpdate = {
                ...conceptWithSavedPrompt,
                ...updatedConceptData
            };
            
            const updatedConcept = await updateBriefConcept(conceptToUpdate);
            
            // Update local text and spoken hooks state
            if (aiResponse.text_hook_options && Array.isArray(aiResponse.text_hook_options)) {
                console.log('AI Response - Text hooks received:', aiResponse.text_hook_options);
                const newTextHooksList = aiResponse.text_hook_options.map((content: string, index: number) => ({ id: uuidv4(), title: `Hook ${index + 1}`, content, is_active: true }));
                setLocalTextHooksList(prev => ({
                    ...prev,
                    [conceptId]: newTextHooksList
                }));
            }
            
            // Update local spoken hooks state when received from AI
            if (aiResponse.spoken_hook_options && Array.isArray(aiResponse.spoken_hook_options)) {
                console.log('AI Response - Spoken hooks received:', aiResponse.spoken_hook_options);
                const newSpokenHooksList = aiResponse.spoken_hook_options.map((content: string, index: number) => ({ id: uuidv4(), title: `Hook ${index + 1}`, content, is_active: true }));
                setLocalSpokenHooksList(prev => ({
                    ...prev,
                    [conceptId]: newSpokenHooksList
                }));
            } else {
                console.log('AI Response - No spoken hooks received. Full AI response:', aiResponse);
            }
            
            // Update local description state when received from AI (for image concepts)
            if (aiResponse.description) {
                console.log('AI Response - Description received:', aiResponse.description);
                setLocalDescriptions(prev => ({
                    ...prev,
                    [conceptId]: aiResponse.description
                }));
            }
            
            setConcepts(prev => 
                prev.map(c => c.id === updatedConcept.id ? updatedConcept : c)
            );
        } catch (err: unknown) {
            console.error('Failed to generate AI brief:', err);
            setError(`AI brief generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            // Clear the loading state for this specific concept
            setGeneratingConceptIds(prev => {
                const updated = { ...prev };
                delete updated[conceptId];
                return updated;
            });
        }
    };

    // Generate AI briefs for all concepts
    const handleGenerateAllAI = async () => {
        if (!brand || !user?.id || concepts.length === 0) return;
        
        try {
            setGeneratingAI(true);
            setError(null);
            
            // First, save any unsaved prompts for all concepts
            for (const concept of concepts) {
                const currentPromptValue = localPrompts[concept.id] || '';
                if (currentPromptValue !== concept.ai_custom_prompt) {
                    try {
                        // Update the concept with the current prompt immediately
                        const updatedConceptWithPrompt = {
                            ...concept,
                            ai_custom_prompt: currentPromptValue
                        };
                        
                        // Save the updated prompt
                        const savedConcept = await updateBriefConcept(updatedConceptWithPrompt);
                        
                        // Update the local concepts state to reflect the saved prompt
                        setConcepts(prev => 
                            prev.map(c => c.id === concept.id ? savedConcept : c)
                        );
                    } catch (promptSaveError) {
                        console.error(`Failed to save prompt for concept ${concept.id}:`, promptSaveError);
                        // Continue with the next concept even if saving this prompt fails
                    }
                }
                
                // Also save hook type and count settings if they differ from the database
                const localHookType = localHookTypes[concept.id] || 'both';
                const localHookCount = localHookCounts[concept.id] || 5;
                
                if (localHookType !== concept.hook_type || localHookCount !== concept.hook_count) {
                    try {
                        // Update the concept with the current hook settings
                        const updatedConceptWithHooks = {
                            ...concept,
                            hook_type: localHookType,
                            hook_count: localHookCount
                        };
                        
                        // Save the updated hook settings
                        const savedConcept = await updateBriefConcept(updatedConceptWithHooks);
                        
                        // Update the local concepts state
                        setConcepts(prev => 
                            prev.map(c => c.id === concept.id ? savedConcept : c)
                        );
                    } catch (hookSaveError) {
                        console.error(`Failed to save hook settings for concept ${concept.id}:`, hookSaveError);
                        // Continue with the next concept even if saving hook settings fails
                    }
                }
            }
            
            // Clear any pending debounced updates
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            
            // Get the refreshed concepts list after saving all prompts
            const refreshedConcepts = [...concepts];
            
            let successCount = 0;
            let failCount = 0;
            
            for (const concept of refreshedConcepts) {
                try {
                    console.log(`Generating AI brief for concept: ${concept.id} (${concept.concept_title})`);
                    // Add this concept to the loading states
                    setGeneratingConceptIds(prev => ({
                        ...prev,
                        [concept.id]: true
                    }));
                    
                    // Get the latest prompt from local state (which should be synchronized with DB at this point)
                    const currentPromptValue = localPrompts[concept.id] || concept.ai_custom_prompt || '';
                    
                    // Get the hook type and count for this concept
                    const hookType = localHookTypes[concept.id] || concept.hook_type || 'both';
                    const hookCount = localHookCounts[concept.id] || concept.hook_count || 5;
                    
                    // Get product information if a product is selected for this concept
                    let productInfo = null;
                    if (concept.product_id) {
                        const selectedProduct = products.find(p => p.id === concept.product_id);
                        if (selectedProduct) {
                            productInfo = {
                                name: selectedProduct.name,
                                identifier: selectedProduct.identifier,
                                description: selectedProduct.description,
                                category: selectedProduct.category,
                                price: selectedProduct.price,
                                currency: selectedProduct.currency
                            };
                        }
                    }
                    
                    console.log(`Using hook type: ${hookType}, hook count: ${hookCount} for concept ${concept.id}`);
                    
                    // Get the appropriate system instructions based on content type and media type
                    let systemInstructions = '';
                    
                    // Use hard-coded system instructions based on content type
                    if (contentType === 'ads') {
                        if (concept.media_type === 'image') {
                            systemInstructions = SYSTEM_INSTRUCTIONS.ads.image;
                        } else {
                            systemInstructions = SYSTEM_INSTRUCTIONS.ads.video;
                        }
                    } else {
                        // For other content types, use the default instruction
                        const contentInstructions = SYSTEM_INSTRUCTIONS[contentType as keyof typeof SYSTEM_INSTRUCTIONS];
                        if (contentInstructions && 'default' in contentInstructions) {
                            systemInstructions = contentInstructions.default;
                        } else {
                            // Fallback to ads if content type not found
                            systemInstructions = concept.media_type === 'image' ? SYSTEM_INSTRUCTIONS.ads.image : SYSTEM_INSTRUCTIONS.ads.video;
                        }
                    }
                    
                    const request: AiBriefingRequest = {
                        brandContext: {
                            brand_info_data: JSON.stringify(brand.brand_info_data),
                            target_audience_data: JSON.stringify(brand.target_audience_data),
                            competition_data: JSON.stringify(brand.competition_data),
                            system_instructions_image: systemInstructions, // Use hard-coded instructions
                            system_instructions_video: systemInstructions, // Use hard-coded instructions  
                            product_info: productInfo
                        },
                        conceptSpecificPrompt: currentPromptValue,
                        conceptCurrentData: {
                            text_hook_options: (concept.text_hook_options && Array.isArray(concept.text_hook_options) ? concept.text_hook_options.map(h => (h as Hook).content) : []), 
                            spoken_hook_options: (concept.spoken_hook_options && Array.isArray(concept.spoken_hook_options) ? concept.spoken_hook_options.map(h => (h as Hook).content) : []), 
                            body_content_structured: concept.body_content_structured || [],
                            cta_script: concept.cta_script || '',
                            cta_text_overlay: concept.cta_text_overlay || '',
                            description: concept.description || ''
                        },
                        media: {
                            url: concept.media_url || '',
                            type: concept.media_type || ''
                        },
                        desiredOutputFields: concept.media_type === 'image' 
                            ? ['description', 'cta'] // For image briefs
                            : ['text_hook_options', 'spoken_hook_options', 'body_content_structured_scenes', 'cta_script', 'cta_text_overlay'], // For video briefs
                        hookOptions: {
                            type: hookType,
                            count: hookCount
                        }
                    };
                    
                    const response = await fetch('/api/ai/generate-brief', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(request)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        const errorMessage = errorData?.error || `Failed to generate AI brief (HTTP ${response.status})`;
                        throw new Error(errorMessage);
                    }
                    
                    const aiResponse = await response.json();
                    
                    // Update concept with AI response
                    const updatedConceptData: Partial<BriefConcept> = {
                        body_content_structured: aiResponse.body_content_structured_scenes || concept.body_content_structured,
                        cta_script: aiResponse.cta_script || concept.cta_script,
                        cta_text_overlay: aiResponse.cta_text_overlay || concept.cta_text_overlay,
                        description: aiResponse.description || concept.description
                    };
                    
                    if (aiResponse.text_hook_options && Array.isArray(aiResponse.text_hook_options)) {
                        console.log(`Generate All AI - Text hooks array received for concept ${concept.id}:`, aiResponse.text_hook_options);
                        const newTextHooks: Hook[] = aiResponse.text_hook_options.map((hookContent: string, index: number) => ({ id: uuidv4(), title: `Hook ${index + 1}`, content: hookContent }));
                        updatedConceptData.text_hook_options = newTextHooks;
                        setLocalTextHooksList(prev => ({
                            ...prev,
                            [concept.id]: newTextHooks
                        }));
                    } else if (concept.text_hook_options) {
                        updatedConceptData.text_hook_options = concept.text_hook_options;
                    }
                    
                    if (aiResponse.spoken_hook_options && Array.isArray(aiResponse.spoken_hook_options)) {
                        console.log(`Generate All AI - Spoken hooks array received for concept ${concept.id}:`, aiResponse.spoken_hook_options);
                        // Correctly update localSpokenHooksList with Hook[] objects
                        const newSpokenHooksList = aiResponse.spoken_hook_options.map((content: string, index: number) => ({ 
                            id: uuidv4(), 
                            title: `Hook ${index + 1}`, 
                            content, 
                        }));
                        updatedConceptData.spoken_hook_options = newSpokenHooksList;
                        setLocalSpokenHooksList(prev => ({
                            ...prev,
                            [concept.id]: newSpokenHooksList
                        }));
                    } else {
                        console.log(`Generate All AI - No spoken hooks received for concept ${concept.id}. Full AI response:`, aiResponse);
                    }
                    
                    // Update local description state when received from AI (for image concepts)
                    if (aiResponse.description) {
                        console.log(`Generate All AI - Description received for concept ${concept.id}:`, aiResponse.description);
                        setLocalDescriptions(prev => ({
                            ...prev,
                            [concept.id]: aiResponse.description
                        }));
                    }
                    
                    const conceptToUpdate = {
                        ...concept,
                        ...updatedConceptData
                    };
                    
                    const updatedConceptResult = await updateBriefConcept(conceptToUpdate); // Renamed to avoid conflict
                    
                    // Update the main concepts state with the result from the database update
                    setConcepts(prev => 
                        prev.map(c => c.id === updatedConceptResult.id ? updatedConceptResult : c)
                    );
                    
                    successCount++;
                    console.log(`Successfully generated AI brief for concept: ${concept.id} (${successCount}/${concepts.length})`);
                    
                    // Add a small delay between requests to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (conceptErr: unknown) {
                    console.error(`Failed to generate AI brief for concept ${concept.id}:`, conceptErr);
                    failCount++;
                } finally {
                    // Clear the loading state for this concept when done
                    setGeneratingConceptIds(prev => {
                        const updated = { ...prev };
                        delete updated[concept.id];
                        return updated;
                    });
                }
            }
            
            // Set final status message
            if (failCount > 0) {
                if (successCount > 0) {
                    setError(`Generated AI briefs for ${successCount}/${concepts.length} concepts. ${failCount} failed.`);
                } else {
                    setError('Failed to generate any AI briefs. Please try again.');
                }
            } else {
                // No error if all succeeded
                console.log(`Successfully generated AI briefs for all ${concepts.length} concepts.`);
            }
        } catch (err: unknown) {
            console.error('Failed to generate AI briefs for all concepts:', err);
            setError(`AI briefs generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setGeneratingAI(false);
        }
    };

    // Add scene to concept
    const handleAddScene = (conceptId: string) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const newScene: Scene = {
            scene_title: `Scene ${concept.body_content_structured.length + 1}`,
            script: '',
            visuals: ''
        };
        
        const updatedConcept = {
            ...concept,
            body_content_structured: [...concept.body_content_structured, newScene]
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Remove scene from concept
    const handleRemoveScene = (conceptId: string, sceneIndex: number) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: concept.body_content_structured.filter((_, i) => i !== sceneIndex)
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Update scene in concept
    const handleUpdateScene = (conceptId: string, sceneIndex: number, updatedScene: Scene) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedScenes = [...concept.body_content_structured];
        updatedScenes[sceneIndex] = updatedScene;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Move scene up in concept
    const handleMoveSceneUp = (conceptId: string, sceneIndex: number) => {
        if (sceneIndex === 0) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex - 1];
        updatedScenes[sceneIndex - 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Move scene down in concept
    const handleMoveSceneDown = (conceptId: string, sceneIndex: number) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept || sceneIndex >= concept.body_content_structured.length - 1) return;
        
        const updatedScenes = [...concept.body_content_structured];
        const temp = updatedScenes[sceneIndex + 1];
        updatedScenes[sceneIndex + 1] = updatedScenes[sceneIndex];
        updatedScenes[sceneIndex] = temp;
        
        const updatedConcept = {
            ...concept,
            body_content_structured: updatedScenes
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Update concept with debounce
    const debouncedUpdateConcept = (concept: BriefConcept) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            handleUpdateConcept(concept);
            saveTimeoutRef.current = null;
        }, 1000); // 1 second debounce
    };

    // Clean up timeout on component unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Debounced update scene
    const debouncedUpdateScene = (conceptId: string, sceneIndex: number, updatedScene: Scene) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            handleUpdateScene(conceptId, sceneIndex, updatedScene);
            saveTimeoutRef.current = null;
        }, 1000); // 1 second debounce
    };

    // Update localPrompts when concepts change
    useEffect(() => {
        const promptMap: Record<string, string> = {};
        const ctaScriptMap: Record<string, string> = {};
        const ctaTextOverlayMap: Record<string, string> = {};
        const scenesMap: Record<string, Scene[]> = {};
        const clickupLinksMap: Record<string, string> = {};
        const strategistsMap: Record<string, string> = {};
        const creativeCoordinatorsMap: Record<string, string> = {};
        const videoEditorsMap: Record<string, string> = {};
        const videoInstructionsMap: Record<string, string> = {};
        const designerInstructionsMap: Record<string, string> = {};
        const mediaTypesMap: Record<string, 'video' | 'image'> = {};
        const descriptionsMap: Record<string, string> = {};
        
        concepts.forEach(concept => {
            promptMap[concept.id] = concept.ai_custom_prompt || '';
            ctaScriptMap[concept.id] = concept.cta_script || '';
            ctaTextOverlayMap[concept.id] = concept.cta_text_overlay || '';
            scenesMap[concept.id] = [...(concept.body_content_structured || [])];
            clickupLinksMap[concept.id] = concept.clickup_id || '';
            strategistsMap[concept.id] = concept.strategist || '';
            creativeCoordinatorsMap[concept.id] = concept.creative_coordinator || '';
            videoEditorsMap[concept.id] = concept.video_editor || '';
            videoInstructionsMap[concept.id] = concept.videoInstructions || '';
            designerInstructionsMap[concept.id] = concept.designerInstructions || '';
            mediaTypesMap[concept.id] = (concept.media_type as 'video' | 'image') || 'video';
            descriptionsMap[concept.id] = concept.description || '';
        });
        
        setLocalPrompts(promptMap);
        setLocalCtaScript(ctaScriptMap);
        setLocalCtaTextOverlay(ctaTextOverlayMap);
        setLocalScenes(scenesMap);
        setLocalClickupLinks(clickupLinksMap);
        setLocalStrategists(strategistsMap);
        setLocalCreativeCoordinators(creativeCoordinatorsMap);
        setLocalVideoEditors(videoEditorsMap);
        setLocalVideoInstructions(videoInstructionsMap);
        setLocalDesignerInstructions(designerInstructionsMap);
        setLocalMediaTypes(mediaTypesMap);
        setLocalDescriptions(descriptionsMap);
        
        // Handle hook lists separately to prevent focus loss during typing
        const newLocalTextHooksList: Record<string, Hook[]> = {};
        const newLocalSpokenHooksList: Record<string, Hook[]> = {};

        concepts.forEach(concept => {
            // Prioritize existing local list if user is typing
            if (isTypingRef.current[`text-${concept.id}`] && localTextHooksList[concept.id]) {
                newLocalTextHooksList[concept.id] = localTextHooksList[concept.id];
            } else {
                if (Array.isArray(concept.text_hook_options)) { // New JSONB format (Hook[])
                    newLocalTextHooksList[concept.id] = concept.text_hook_options.map((hook: Hook | string, index: number) => (
                        typeof hook === 'string' 
                            ? { id: uuidv4(), title: `Hook ${index + 1}`, content: hook } 
                            : { id: hook.id || uuidv4(), title: hook.title || `Hook ${index + 1}`, content: hook.content || '' }
                    ));
                } else if (typeof concept.text_hook_options === 'string' && concept.text_hook_options) { // Old TEXT format
                    newLocalTextHooksList[concept.id] = parseHooksFromString(concept.text_hook_options); 
                } else {
                    newLocalTextHooksList[concept.id] = localTextHooksList[concept.id] || []; // Fallback to existing or empty
                }
            }

            if (isTypingRef.current[`spoken-${concept.id}`] && localSpokenHooksList[concept.id]) {
                newLocalSpokenHooksList[concept.id] = localSpokenHooksList[concept.id];
            } else {
                if (Array.isArray(concept.spoken_hook_options)) { // New JSONB format (Hook[])
                    newLocalSpokenHooksList[concept.id] = concept.spoken_hook_options.map((hook: Hook | string, index: number) => (
                        typeof hook === 'string' 
                            ? { id: uuidv4(), title: `Hook ${index + 1}`, content: hook } 
                            : { id: hook.id || uuidv4(), title: hook.title || `Hook ${index + 1}`, content: hook.content || '' }
                    ));
                } else if (typeof concept.spoken_hook_options === 'string' && concept.spoken_hook_options) { // Old TEXT format
                    newLocalSpokenHooksList[concept.id] = parseHooksFromString(concept.spoken_hook_options);
                } else {
                    newLocalSpokenHooksList[concept.id] = localSpokenHooksList[concept.id] || []; // Fallback to existing or empty
                }
            }
        });
        setLocalTextHooksList(newLocalTextHooksList);
        setLocalSpokenHooksList(newLocalSpokenHooksList);

    }, [concepts]); // Dependency array might need isTypingRef if its changes should trigger this

    // Debug prompt for a concept
    const handleDebugPrompt = async (conceptId: string) => {
        if (!brand || !user?.id) return;
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        // Use the local state value for the custom prompt
        const customPrompt = localPrompts[conceptId] || concept.ai_custom_prompt || '';
        
        // Determine media type
        const mediaType = concept.media_type || 'video';
        
        // Get product information if a product is selected for this concept
        let productInfo = null;
        if (concept.product_id) {
            const selectedProduct = products.find(p => p.id === concept.product_id);
            if (selectedProduct) {
                productInfo = {
                    name: selectedProduct.name,
                    identifier: selectedProduct.identifier,
                    description: selectedProduct.description,
                    category: selectedProduct.category,
                    price: selectedProduct.price,
                    currency: selectedProduct.currency
                };
            }
        }
        
        // Get the appropriate system instructions based on content type and media type
        let systemInstructions = '';
        
        // Use hard-coded system instructions based on content type
        if (contentType === 'ads') {
            if (mediaType === 'image') {
                systemInstructions = SYSTEM_INSTRUCTIONS.ads.image;
            } else {
                systemInstructions = SYSTEM_INSTRUCTIONS.ads.video;
            }
        } else {
            // For other content types, use the default instruction
            const contentInstructions = SYSTEM_INSTRUCTIONS[contentType as keyof typeof SYSTEM_INSTRUCTIONS];
            if (contentInstructions && 'default' in contentInstructions) {
                systemInstructions = contentInstructions.default;
            } else {
                // Fallback to ads if content type not found
                systemInstructions = mediaType === 'image' ? SYSTEM_INSTRUCTIONS.ads.image : SYSTEM_INSTRUCTIONS.ads.video;
            }
        }
        
        // Construct the request object that would be sent to the API
        const request: AiBriefingRequest = {
            brandContext: {
                brand_info_data: JSON.stringify(brand.brand_info_data),
                target_audience_data: JSON.stringify(brand.target_audience_data),
                competition_data: JSON.stringify(brand.competition_data),
                system_instructions_image: systemInstructions, // Use hard-coded instructions
                system_instructions_video: systemInstructions, // Use hard-coded instructions  
                product_info: productInfo
            },
            conceptSpecificPrompt: customPrompt, // Use the local value
            conceptCurrentData: {
                text_hook_options: (localTextHooksList[conceptId] || []).map(h => h.content), 
                spoken_hook_options: (localSpokenHooksList[conceptId] || []).map(h => h.content), 
                body_content_structured: localScenes[conceptId] || concept.body_content_structured || [],
                cta_script: localCtaScript[conceptId] || concept.cta_script || '',
                cta_text_overlay: localCtaTextOverlay[conceptId] || concept.cta_text_overlay || '',
                description: localDescriptions[conceptId] || concept.description || ''
            },
            media: {
                url: concept.media_url || '',
                type: mediaType
            },
            desiredOutputFields: mediaType === 'image' 
                ? ['description', 'cta'] // For image briefs (using system_instructions_image format)
                : ['text_hook_options', 'spoken_hook_options', 'body_content_structured_scenes', 'cta_script', 'cta_text_overlay'], // For video briefs
            hookOptions: {
                type: concept.hook_type || localHookTypes[conceptId] || 'both',
                count: concept.hook_count || localHookCounts[conceptId] || 5
            }
        };
        
        // Simulate the prompt construction similar to what happens in the API route
        const brandContextStr = JSON.stringify(request.brandContext, null, 2);
        
        // Create media type appropriate currentData string
        let currentDataStr;
        if (mediaType === 'image') {
            // For image briefs, only include description and cta
            currentDataStr = JSON.stringify({
                description: localDescriptions[conceptId] || concept.description || '',
                cta: localCtaScript[conceptId] || concept.cta_script || '' // Assuming cta_script is used for image CTA
            }, null, 2);
        } else {
            // For video briefs, use the full structure
            currentDataStr = JSON.stringify({
                text_hook_options: (localTextHooksList[conceptId] || []).map(h => h.content), // Send as array of strings
                spoken_hook_options: (localSpokenHooksList[conceptId] || []).map(h => h.content), // Send as array of strings
                body_content_structured: localScenes[conceptId] || concept.body_content_structured || [],
                cta_script: localCtaScript[conceptId] || concept.cta_script || '',
                cta_text_overlay: localCtaTextOverlay[conceptId] || concept.cta_text_overlay || ''
            }, null, 2);
        }
        
        const fieldsStr = request.desiredOutputFields.join(', ');
        
        // Get media information - update to show that binary data is now sent
        const hasMedia = request.media && request.media.url;
        const mediaInfo = hasMedia ? 
            `MEDIA INFORMATION:
Type: ${request.media?.type || 'unknown'}
URL: ${request.media?.url}

NOTE: In the actual API request, the media file is downloaded and sent as binary data directly to Gemini, 
allowing it to properly analyze images and videos. This is just a text representation for debugging purposes.` :
            'No media provided for this concept.';
        
        // Enhance custom prompt importance
        let enhancedCustomPrompt = request.conceptSpecificPrompt || "";
        if (enhancedCustomPrompt) {
            // Make custom prompt stand out more by formatting it
            enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
        }
        
        // Handle hook options
        let hookInstructions = '';
        if (request.hookOptions) {
            const { type, count } = request.hookOptions;
            hookInstructions = `\nHOOK OPTIONS INSTRUCTIONS:
- Generate ${count} unique hook options
- Hook type: ${type}
- For text hooks: Use emojis and catchy phrases suitable for social media captions
- For verbal hooks: Create spoken phrases that would work well when read aloud in videos
- If hook type is 'text', only populate the text_hook_options field
- If hook type is 'verbal', only populate the spoken_hook_options field 
- If hook type is 'both', populate both fields with ${count} options each
`;
        }
        
        // Get the appropriate system instructions based on content type and media type
        let systemPrompt = '';
        
        // Use hard-coded system instructions based on content type
        if (contentType === 'ads') {
            if (request.media?.type === 'image') {
                systemPrompt = SYSTEM_INSTRUCTIONS.ads.image;
            } else {
                systemPrompt = SYSTEM_INSTRUCTIONS.ads.video;
            }
        } else {
            // For other content types, use the default instruction
            const contentInstructions = SYSTEM_INSTRUCTIONS[contentType as keyof typeof SYSTEM_INSTRUCTIONS];
            if (contentInstructions && 'default' in contentInstructions) {
                systemPrompt = contentInstructions.default;
            } else {
                // Fallback to ads if content type not found
                systemPrompt = request.media?.type === 'image' ? SYSTEM_INSTRUCTIONS.ads.image : SYSTEM_INSTRUCTIONS.ads.video;
            }
        }
        
        // Add explanation about system instructions for clarity in debug view
        const usedInstructions = `${contentType} (hard-coded optimized)`;
        systemPrompt = `/* Using ${usedInstructions} system instructions */\n\n` + systemPrompt;

        const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}${hookInstructions}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`

${mediaInfo}

CURRENT CONTENT (for refinement):
\`\`\`json
${currentDataStr}
\`\`\`

Please generate content for these fields: ${fieldsStr}
If media is provided, make sure your content directly references and relates to what's shown in the media.
Ensure your response is ONLY valid JSON matching the structure in my instructions. Do not include any other text.`;

        // Set the debug prompt
        const fullPrompt = systemPrompt + "\n\n" + userPrompt;
        setDebugPrompt(fullPrompt);
        setShowPromptDebugDialog(true);
    };

    // Handle copying to clipboard
    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(debugPrompt)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
    };

    // Share batch via link
    const handleShareBatchViaLink = async () => {
        if (!batch) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: shareIsEditable,
                expires_at: null // No expiration
            };
            
            const shareResult = await shareBriefBatch(batch.id, 'link', shareSettings);
            
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        } catch (err) {
            console.error('Failed to share batch:', err);
            setError('Failed to create share link. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Share batch via email
    const handleShareBatchViaEmail = async () => {
        if (!batch || !shareEmail) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: shareIsEditable,
                expires_at: null, // No expiration
                email: shareEmail
            };
            
            await shareBriefBatch(batch.id, 'email', shareSettings);
            
            setShareSuccess(true);
            setShareEmail('');
        } catch (err) {
            console.error('Failed to share batch via email:', err);
            setError('Failed to share via email. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Share concept via link
    const handleShareConceptViaLink = async () => {
        if (!sharingConceptId) return;
        
        try {
            setSharingInProgress(true);
            setShareSuccess(false);
            
            const shareSettings: ShareSettings = {
                is_editable: true, // Changed from false to true to allow editors to submit their work
                expires_at: null // No expiration
            };
            
            const shareResult = await shareBriefConcept(sharingConceptId, 'link', shareSettings);
            
            setShareLink(shareResult.share_url);
            setShareSuccess(true);
        } catch (err) {
            console.error('Failed to share concept:', err);
            setError('Failed to create share link. Please try again.');
        } finally {
            setSharingInProgress(false);
        }
    };
    
    // Copy share link to clipboard
    const handleCopyShareLink = () => {
        navigator.clipboard.writeText(shareLink)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy share link: ', err);
            });
    };
    
    // Reset sharing state when dialogs are closed
    useEffect(() => {
        if (!showShareBatchDialog && !showShareConceptDialog) {
            setShareLink('');
            setShareEmail('');
            setShareSuccess(false);
        }
    }, [showShareBatchDialog, showShareConceptDialog]);

    // Handle media type change
    const handleMediaTypeChange = (conceptId: string, mediaType: 'video' | 'image') => {
        setLocalMediaTypes(prev => ({
            ...prev,
            [conceptId]: mediaType
        }));
        
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;
        
        const updatedConcept = {
            ...concept,
            media_type: mediaType
        };
        
        handleUpdateConcept(updatedConcept);
    };

    // Add text hook
    const handleAddTextHook = (conceptId: string) => {
        const newHook: Hook = {
            id: uuidv4(), // Use uuidv4 for unique ID
            title: `Hook ${(localTextHooksList[conceptId] || []).length + 1}`,
            content: ''
            // Assuming Hook type does not include is_active based on lib/types/powerbrief.ts
        };

        // Update local list for immediate UI feedback of the new textarea
        setLocalTextHooksList(prevLocal => {
            const currentLocalHooks = prevLocal[conceptId] || [];
            const updatedLocalHooks = [...currentLocalHooks, newHook];
            return { ...prevLocal, [conceptId]: updatedLocalHooks };
        });

        // Update the main 'concepts' state which will trigger useEffect and persistence
        setConcepts(prevConcepts => {
            let conceptToPersist: BriefConcept | undefined;
            const newConcepts = prevConcepts.map(c => {
                if (c.id === conceptId) {
                    const existingConceptHooks = Array.isArray(c.text_hook_options) ? c.text_hook_options : [];
                    conceptToPersist = {
                        ...c,
                        text_hook_options: [...existingConceptHooks, newHook]
                    };
                    return conceptToPersist;
                }
                return c;
            });

            if (conceptToPersist) {
                // This conceptToPersist has the new hook. Debounce saving this version.
                debouncedUpdateConcept(conceptToPersist);
            }
            return newConcepts; // Return updated concepts array for state
        });
    };

    // Remove text hook
    const handleRemoveTextHook = (conceptId: string, hookId: string) => {
        const currentHooks = localTextHooksList[conceptId] || [];
        const updatedHooks = currentHooks.filter(hook => hook.id !== hookId);
        
        setLocalTextHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                text_hook_options: updatedHooks // Pass Hook[] directly
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    // Update text hook
    const handleUpdateTextHook = (conceptId: string, hookId: string, content: string) => {
        isTypingRef.current[`text-${conceptId}`] = false; // Reset typing flag
        const currentHooks = localTextHooksList[conceptId] || [];
        const updatedHooks = currentHooks.map(hook => 
            hook.id === hookId ? { ...hook, content } : hook
        );
        setLocalTextHooksList(prev => ({ ...prev, [conceptId]: updatedHooks }));

        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            debouncedUpdateConcept({ ...concept, text_hook_options: updatedHooks });
        }
    };

    // Add spoken hook
    const handleAddSpokenHook = (conceptId: string) => {
        const newHook: Hook = {
            id: uuidv4(), // Use uuidv4 for unique ID
            title: `Hook ${(localSpokenHooksList[conceptId] || []).length + 1}`,
            content: ''
            // Assuming Hook type does not include is_active
        };

        // Update local list for immediate UI feedback of the new textarea
        setLocalSpokenHooksList(prevLocal => {
            const currentLocalHooks = prevLocal[conceptId] || [];
            const updatedLocalHooks = [...currentLocalHooks, newHook];
            return { ...prevLocal, [conceptId]: updatedLocalHooks };
        });

        // Update the main 'concepts' state which will trigger useEffect and persistence
        setConcepts(prevConcepts => {
            let conceptToPersist: BriefConcept | undefined;
            const newConcepts = prevConcepts.map(c => {
                if (c.id === conceptId) {
                    const existingConceptHooks = Array.isArray(c.spoken_hook_options) ? c.spoken_hook_options : [];
                    conceptToPersist = {
                        ...c,
                        spoken_hook_options: [...existingConceptHooks, newHook]
                    };
                    return conceptToPersist;
                }
                return c;
            });

            if (conceptToPersist) {
                // This conceptToPersist has the new hook. Debounce saving this version.
                debouncedUpdateConcept(conceptToPersist);
            }
            return newConcepts; // Return updated concepts array for state
        });
    };

    // Remove spoken hook
    const handleRemoveSpokenHook = (conceptId: string, hookId: string) => {
        const currentHooks = localSpokenHooksList[conceptId] || [];
        const updatedHooks = currentHooks.filter(hook => hook.id !== hookId);
        
        setLocalSpokenHooksList(prev => ({
            ...prev,
            [conceptId]: updatedHooks
        }));
        
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedConcept = {
                ...concept,
                spoken_hook_options: updatedHooks // Pass Hook[] directly
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    // Update spoken hook
    const handleUpdateSpokenHook = (conceptId: string, hookId: string, content: string) => {
        isTypingRef.current[`spoken-${conceptId}`] = false; // Reset typing flag
        const currentHooks = localSpokenHooksList[conceptId] || [];
        const updatedHooks = currentHooks.map(hook => 
            hook.id === hookId ? { ...hook, content } : hook
        );
        setLocalSpokenHooksList(prev => ({ ...prev, [conceptId]: updatedHooks }));

        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            debouncedUpdateConcept({ ...concept, spoken_hook_options: updatedHooks });
        }
    };

    // Custom Links Handlers
    const handleAddCustomLink = (conceptId: string) => {
        const newLink: CustomLink = {
            id: uuidv4(),
            name: '',
            url: ''
        };

        // Update local state
        setLocalCustomLinks(prev => ({
            ...prev,
            [conceptId]: [...(prev[conceptId] || []), newLink]
        }));

        // Update concept in database
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedLinks = [...(concept.custom_links || []), newLink];
            const updatedConcept = {
                ...concept,
                custom_links: updatedLinks
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    const handleRemoveCustomLink = (conceptId: string, linkId: string) => {
        // Update local state
        setLocalCustomLinks(prev => ({
            ...prev,
            [conceptId]: (prev[conceptId] || []).filter(link => link.id !== linkId)
        }));

        // Update concept in database
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedLinks = (concept.custom_links || []).filter(link => link.id !== linkId);
            const updatedConcept = {
                ...concept,
                custom_links: updatedLinks
            };
            handleUpdateConcept(updatedConcept);
        }
    };

    const handleUpdateCustomLink = (conceptId: string, linkId: string, field: 'name' | 'url', value: string) => {
        // Update local state
        setLocalCustomLinks(prev => ({
            ...prev,
            [conceptId]: (prev[conceptId] || []).map(link =>
                link.id === linkId ? { ...link, [field]: value } : link
            )
        }));

        // Debounce database update
        const concept = concepts.find(c => c.id === conceptId);
        if (concept) {
            const updatedLinks = (concept.custom_links || []).map(link =>
                link.id === linkId ? { ...link, [field]: value } : link
            );
            const updatedConcept = {
                ...concept,
                custom_links: updatedLinks
            };
            debouncedUpdateConcept(updatedConcept);
        }
    };

    // Prerequisites Handlers
    const prerequisiteTypes = [
        'AI Voiceover',
        'UGC Script', 
        'UGC B Roll',
        'AI UGC',
        'AI B Roll',
        'Stock Footage',
        'Custom Animation',
        'Other'
    ] as const;

    const handleTogglePrerequisite = (conceptId: string, prerequisiteType: typeof prerequisiteTypes[number] | string) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const currentPrerequisites = localPrerequisites[conceptId] || concept.prerequisites || [];
        const existingIndex = currentPrerequisites.findIndex(p => p.type === prerequisiteType);
        
        let updatedPrerequisites: Prerequisite[];
        
        if (existingIndex >= 0) {
            // Remove the prerequisite if it exists
            updatedPrerequisites = currentPrerequisites.filter(p => p.type !== prerequisiteType);
        } else {
            // Add the prerequisite if it doesn't exist
            const newPrerequisite: Prerequisite = {
                id: uuidv4(),
                type: prerequisiteType,
                completed: false
            };
            updatedPrerequisites = [...currentPrerequisites, newPrerequisite];
        }

        // Update local state
        setLocalPrerequisites(prev => ({
            ...prev,
            [concept.id]: updatedPrerequisites
        }));

        // Update concept in database
        const updatedConcept = {
            ...concept,
            prerequisites: updatedPrerequisites
        };
        handleUpdateConcept(updatedConcept);
    };

    const handleAddCustomPrerequisite = (conceptId: string) => {
        const customTypes = customPrerequisiteTypes[conceptId] || [];
        const newCustomType = `Custom ${customTypes.length + 1}`;
        
        // Add to custom types list
        setCustomPrerequisiteTypes(prev => ({
            ...prev,
            [conceptId]: [...customTypes, newCustomType]
        }));

        // Also add as a prerequisite
        handleTogglePrerequisite(conceptId, newCustomType);
    };

    const handleRemoveCustomPrerequisite = (conceptId: string, customType: string) => {
        // Remove from custom types list
        setCustomPrerequisiteTypes(prev => ({
            ...prev,
            [conceptId]: (prev[conceptId] || []).filter(type => type !== customType)
        }));

        // Also remove from prerequisites
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const currentPrerequisites = localPrerequisites[conceptId] || concept.prerequisites || [];
        const updatedPrerequisites = currentPrerequisites.filter(p => p.type !== customType);

        setLocalPrerequisites(prev => ({
            ...prev,
            [conceptId]: updatedPrerequisites
        }));

        const updatedConcept = {
            ...concept,
            prerequisites: updatedPrerequisites
        };
        handleUpdateConcept(updatedConcept);
    };

    const handleUpdateCustomPrerequisiteName = (conceptId: string, oldType: string, newType: string) => {
        // Update custom types list
        setCustomPrerequisiteTypes(prev => ({
            ...prev,
            [conceptId]: (prev[conceptId] || []).map(type => type === oldType ? newType : type)
        }));

        // Update prerequisites - preserve the checked state and replace old type with new type
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const currentPrerequisites = localPrerequisites[conceptId] || concept.prerequisites || [];
        const updatedPrerequisites = currentPrerequisites.map(p => {
            if (p.type === oldType) {
                // Update the type but preserve all other properties (including completed status)
                return { ...p, type: newType };
            }
            return p;
        });

        setLocalPrerequisites(prev => ({
            ...prev,
            [conceptId]: updatedPrerequisites
        }));

        const updatedConcept = {
            ...concept,
            prerequisites: updatedPrerequisites
        };
        handleUpdateConcept(updatedConcept);
    };

    const handleTogglePrerequisiteCompletion = (conceptId: string, prerequisiteId: string) => {
        const concept = concepts.find(c => c.id === conceptId);
        if (!concept) return;

        const currentPrerequisites = localPrerequisites[conceptId] || concept.prerequisites || [];
        const updatedPrerequisites = currentPrerequisites.map(prereq =>
            prereq.id === prerequisiteId ? { ...prereq, completed: !prereq.completed } : prereq
        );

        // Update local state
        setLocalPrerequisites(prev => ({
            ...prev,
            [concept.id]: updatedPrerequisites
        }));

        // Update concept in database
        const updatedConcept = {
            ...concept,
            prerequisites: updatedPrerequisites
        };
        handleUpdateConcept(updatedConcept);
    };

    const getIncompletePrerequisites = (conceptId: string): string[] => {
        const prerequisites = localPrerequisites[conceptId] || [];
        return prerequisites
            .filter(prereq => !prereq.completed)
            .map(prereq => {
                switch (prereq.type) {
                    case 'AI Voiceover': return 'NEEDS AI VO';
                    case 'UGC Script': return 'NEEDS UGC SCRIPT';
                    case 'UGC B Roll': return 'NEEDS UGC B ROLL';
                    case 'AI UGC': return 'NEEDS AI UGC';
                    case 'AI B Roll': return 'NEEDS AI B ROLL';
                    case 'Stock Footage': return 'NEEDS STOCK FOOTAGE';
                    case 'Custom Animation': return 'NEEDS ANIMATION';
                    default: return `NEEDS ${prereq.type.toUpperCase()}`;
                }
            });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!brand || !batch) {
        return (
            <div className="p-6">
                <Alert>
                    <AlertDescription>Batch not found.</AlertDescription>
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
                    <h1 className="text-2xl font-bold">{batch.name}</h1>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowBatchSettingsDialog(true)}
                    >
                        Batch Settings
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowShareBatchDialog(true)}
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Batch
                    </Button>
                    <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowDeleteBatchDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Batch
                    </Button>
                    <Button
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={handleGenerateAllAI}
                        disabled={generatingAI || concepts.length === 0}
                    >
                        {generatingAI ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                EZ - BRIEF - ALL
                            </>
                        )}
                    </Button>
                    <Button
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => {
                            console.log("EZ UPLOAD: Button clicked, opening file selector");
                            if (multipleFileInputRef.current) {
                                multipleFileInputRef.current.click();
                            } else {
                                console.error("EZ UPLOAD: File input reference is null");
                                setError("Cannot open file selector. Please try again.");
                            }
                        }}
                        disabled={generatingAI}
                    >
                        {generatingAI ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <FileUp className="h-4 w-4 mr-2" />
                                EZ UPLOAD
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

            {/* Filtering and Sorting Controls */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            {getUniqueValues('status').map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterEditor} onValueChange={setFilterEditor}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Editor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Editors</SelectItem>
                            {getUniqueValues('video_editor').map(editor => (
                                <SelectItem key={editor} value={editor}>{editor}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterStrategist} onValueChange={setFilterStrategist}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Strategist" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Strategists</SelectItem>
                            {getUniqueValues('strategist').map(strategist => (
                                <SelectItem key={strategist} value={strategist}>{strategist}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterProduct} onValueChange={setFilterProduct}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {getUniqueProducts().map(product => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterMediaType} onValueChange={setFilterMediaType}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Media Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 ml-4">
                        <SortAsc className="h-4 w-4" />
                        <span className="text-sm font-medium">Sort:</span>
                    </div>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default Order</SelectItem>
                            <SelectItem value="date_assigned_newest">Date Assigned (Newest)</SelectItem>
                            <SelectItem value="date_assigned_oldest">Date Assigned (Oldest)</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="strategist">Strategist</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="ml-2"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                    )}

                    <div className="ml-auto text-sm text-gray-500">
                        Showing {sortedAndFilteredConcepts.length} of {concepts.length} concepts
                    </div>
                </div>
            </Card>
            
            <div className="flex flex-col space-y-4">
                {/* Concept Cards with scroll indicators */}
                <div className="relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-12 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
                    
                    <div className="flex overflow-x-auto pb-4 space-x-6 hide-scrollbar" style={{ scrollbarWidth: 'none', minHeight: "750px" }}>
                        {sortedAndFilteredConcepts.map((concept) => (
                            <Card 
                                key={concept.id} 
                                className={`${
                                    concept.status === "REVISIONS REQUESTED" 
                                    ? "border-amber-300 border-2" 
                                    : concept.status === "APPROVED" 
                                        ? "border-green-300 border-2"
                                        : ""
                                } mb-4 transition-all duration-200 ease-in-out p-3 relative`}
                            >
                                <CardHeader className="relative">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base">
                                            {concept.concept_title}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConcept(concept.id);
                                            }}
                                            disabled={savingConceptId === concept.id}
                                        >
                                            {savingConceptId === concept.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <X className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    
                                    {/* ClickUp ID Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp ID:</label>
                                        <Input
                                            value={localClickupLinks[concept.id] || ''}
                                            onChange={(e) => {
                                                // Update the local state for UI updates
                                                setLocalClickupLinks(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                                
                                                // Also update the concepts state directly for immediate feedback
                                                setConcepts(prevConcepts => 
                                                    prevConcepts.map(c => 
                                                        c.id === concept.id ? { ...c, clickup_id: e.target.value } : c
                                                    )
                                                );
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    clickup_id: e.target.value
                                                };
                                                debouncedUpdateConcept(updatedConcept);
                                            }}
                                            onBlur={() => {
                                                if (saveTimeoutRef.current) {
                                                    clearTimeout(saveTimeoutRef.current);
                                                    saveTimeoutRef.current = null;
                                                }
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    clickup_id: localClickupLinks[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter ClickUp ID"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* ClickUp Link Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">ClickUp Link:</label>
                                        <div className="flex">
                                            {editingClickupLink === concept.id ? (
                                                <div className="flex w-full">
                                                    <Input
                                                        value={concept.clickup_link || ''}
                                                        onChange={(e) => {
                                                            // Store the value directly in a temporary variable to prevent loss
                                                            const newValue = e.target.value;
                                                            // Update the concept in state immediately for better typing responsiveness
                                                            setConcepts(prevConcepts => 
                                                                prevConcepts.map(c => 
                                                                    c.id === concept.id ? { ...c, clickup_link: newValue } : c
                                                                )
                                                            );
                                                            
                                                            // Still send the update to the debounced handler
                                                            const updatedConcept = {
                                                                ...concept,
                                                                clickup_link: newValue
                                                            };
                                                            debouncedUpdateConcept(updatedConcept);
                                                        }}
                                                        onBlur={() => {
                                                            setEditingClickupLink(null);
                                                            
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                                saveTimeoutRef.current = null;
                                                            }
                                                            
                                                            handleUpdateConcept(concept);
                                                        }}
                                                        placeholder="Paste ClickUp URL"
                                                        className="text-sm"
                                                        autoFocus
                                                    />
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => {
                                                            setEditingClickupLink(null);
                                                            
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                                saveTimeoutRef.current = null;
                                                            }
                                                            
                                                            handleUpdateConcept(concept);
                                                        }}
                                                        className="ml-1"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex w-full items-center">
                                                    {concept.clickup_link ? (
                                                        <a 
                                                            href={concept.clickup_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline text-sm truncate flex-1"
                                                        >
                                                            {concept.clickup_link}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500 text-sm italic flex-1">No link added</span>
                                                    )}
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => setEditingClickupLink(concept.id)}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Custom Links Section */}
                                    <div className="mt-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-medium">Custom Links:</label>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAddCustomLink(concept.id)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        
                                        {(localCustomLinks[concept.id] || []).length === 0 ? (
                                            <div className="text-gray-500 text-xs italic p-2 bg-gray-50 rounded">
                                                No custom links added
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(localCustomLinks[concept.id] || []).map((link) => (
                                                    <div key={link.id} className="p-2 border rounded space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-medium text-gray-600">Link {(localCustomLinks[concept.id] || []).indexOf(link) + 1}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-red-500"
                                                                onClick={() => handleRemoveCustomLink(concept.id, link.id)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <Input
                                                            value={link.name}
                                                            onChange={(e) => handleUpdateCustomLink(concept.id, link.id, 'name', e.target.value)}
                                                            placeholder="Link name (e.g., Asset Pack)"
                                                            className="text-xs"
                                                        />
                                                        <div className="flex items-center space-x-1">
                                                            <Input
                                                                value={link.url}
                                                                onChange={(e) => handleUpdateCustomLink(concept.id, link.id, 'url', e.target.value)}
                                                                placeholder="https://..."
                                                                className="text-xs flex-1"
                                                            />
                                                            {link.url && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => window.open(link.url, '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Prerequisites Section */}
                                    <div className="mt-2">
                                        <details className="group">
                                            <summary className="flex justify-between items-center cursor-pointer p-2 border rounded hover:bg-gray-50">
                                                <div className="text-xs font-medium">
                                                    <div>Prerequisites</div>
                                                    <div className="text-gray-500 font-normal">(Missing Assets)</div>
                                                </div>
                                                <span className="text-xs text-gray-500 group-open:hidden">Click to expand</span>
                                                <span className="text-xs text-gray-500 hidden group-open:inline">Click to collapse</span>
                                            </summary>
                                            
                                            <div className="mt-2 p-3 border border-t-0 rounded-b bg-gray-50 space-y-2">
                                                <p className="text-xs text-gray-600 mb-3">Check the assets we DON&apos;T have:</p>
                                                
                                                {/* Standard prerequisite types */}
                                                {prerequisiteTypes.filter(type => type !== 'Other').map((prerequisiteType) => {
                                                    const currentPrerequisites = localPrerequisites[concept.id] || [];
                                                    const isMissing = currentPrerequisites.some(p => p.type === prerequisiteType && !p.completed);
                                                    
                                                    return (
                                                        <div key={prerequisiteType} className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isMissing}
                                                                onChange={() => {
                                                                    const currentConcept = concepts.find(c => c.id === concept.id);
                                                                    if (!currentConcept) return;

                                                                    const currentPrerequisites = localPrerequisites[concept.id] || currentConcept.prerequisites || [];
                                                                    const existingIndex = currentPrerequisites.findIndex(p => p.type === prerequisiteType);
                                                                    
                                                                    let updatedPrerequisites: Prerequisite[];
                                                                    
                                                                    if (existingIndex >= 0) {
                                                                        if (isMissing) {
                                                                            // Currently missing, remove it (we now have it)
                                                                            updatedPrerequisites = currentPrerequisites.filter(p => p.type !== prerequisiteType);
                                                                        } else {
                                                                            // Currently have it, mark as missing
                                                                            updatedPrerequisites = currentPrerequisites.map(p => 
                                                                                p.type === prerequisiteType ? { ...p, completed: false } : p
                                                                            );
                                                                        }
                                                                    } else {
                                                                        // Add as missing
                                                                        const newPrerequisite: Prerequisite = {
                                                                            id: uuidv4(),
                                                                            type: prerequisiteType,
                                                                            completed: false
                                                                        };
                                                                        updatedPrerequisites = [...currentPrerequisites, newPrerequisite];
                                                                    }

                                                                    // Update local state
                                                                    setLocalPrerequisites(prev => ({
                                                                        ...prev,
                                                                        [concept.id]: updatedPrerequisites
                                                                    }));

                                                                    // Update concept in database
                                                                    const updatedConcept = {
                                                                        ...currentConcept,
                                                                        prerequisites: updatedPrerequisites
                                                                    };
                                                                    handleUpdateConcept(updatedConcept);
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300"
                                                                aria-label={`Mark ${prerequisiteType} as missing`}
                                                            />
                                                            <span className="text-xs flex items-center">
                                                                {isMissing && <XCircle className="h-3 w-3 text-red-500 mr-1" />}
                                                                {prerequisiteType}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Custom prerequisite types */}
                                                {(customPrerequisiteTypes[concept.id] || []).map((customType, index) => {
                                                    const currentPrerequisites = localPrerequisites[concept.id] || [];
                                                    const isMissing = currentPrerequisites.some(p => p.type === customType && !p.completed);
                                                    
                                                    return (
                                                        <div key={`custom-${concept.id}-${index}`} className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isMissing}
                                                                onChange={() => {
                                                                    // Use the current value from the array, not the stale customType
                                                                    const currentType = (customPrerequisiteTypes[concept.id] || [])[index];
                                                                    handleTogglePrerequisite(concept.id, currentType);
                                                                }}
                                                                className="h-4 w-4 rounded border-gray-300"
                                                                aria-label={`Mark ${customType} as missing`}
                                                            />
                                                            <div className="flex items-center space-x-1 flex-1">
                                                                {isMissing && <XCircle className="h-3 w-3 text-red-500" />}
                                                                <Input
                                                                    value={customType}
                                                                    onChange={(e) => {
                                                                        // Update the custom types array directly
                                                                        const newCustomTypes = [...(customPrerequisiteTypes[concept.id] || [])];
                                                                        newCustomTypes[index] = e.target.value;
                                                                        setCustomPrerequisiteTypes(prev => ({
                                                                            ...prev,
                                                                            [concept.id]: newCustomTypes
                                                                        }));
                                                                    }}
                                                                    onBlur={() => {
                                                                        // Only update the prerequisite when losing focus
                                                                        const newValue = (customPrerequisiteTypes[concept.id] || [])[index];
                                                                        if (newValue !== customType) {
                                                                            handleUpdateCustomPrerequisiteName(concept.id, customType, newValue);
                                                                        }
                                                                    }}
                                                                    className="text-xs h-6 px-2"
                                                                    placeholder="Custom prerequisite"
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-red-500"
                                                                    onClick={() => handleRemoveCustomPrerequisite(concept.id, customType)}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Add custom prerequisite button */}
                                                <div className="pt-2 border-t border-gray-200">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddCustomPrerequisite(concept.id)}
                                                        className="w-full h-8 text-xs"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add Other
                                                    </Button>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                    
                                    {/* Frame.io Review Link - Display when concept is ready for review or approved */}
                                    {(concept.status === 'READY FOR REVIEW' || concept.status === 'APPROVED' || concept.review_status === 'ready_for_review' || concept.review_status === 'approved') && 
                                        concept.review_link && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-medium mb-1">Frame.io Review Link:</label>
                                            <div className="flex w-full items-center">
                                                <a 
                                                    href={concept.review_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-sm truncate flex-1"
                                                >
                                                    {concept.review_link}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Status Dropdown */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1" id={`status-label-${concept.id}`}>Status:</label>
                                        <select
                                            value={concept.status || ''}
                                            onChange={(e) => {
                                                const updatedConcept = {
                                                    ...concept,
                                                    status: e.target.value
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            className="w-full p-2 text-sm border rounded"
                                            aria-labelledby={`status-label-${concept.id}`}
                                        >
                                            <option value="">Select Status</option>
                                            <option value="BRIEFING IN PROGRESS">BRIEFING IN PROGRESS</option>
                                            <option value="BRIEF REVIEW">BRIEF REVIEW</option>
                                            <option value="BRIEF REVISIONS NEEDED">BRIEF REVISIONS NEEDED</option>
                                            <option value="READY FOR DESIGNER">READY FOR DESIGNER</option>
                                            <option value="READY FOR EDITOR">READY FOR EDITOR</option>
                                            <option value="READY FOR EDITOR ASSIGNMENT">READY FOR EDITOR ASSIGNMENT</option>
                                            <option value="READY FOR REVIEW">READY FOR REVIEW</option>
                                            <option value="APPROVED">APPROVED</option>
                                            <option value="REVISIONS REQUESTED">REVISIONS REQUESTED</option>
                                        </select>
                                    </div>

                                    {/* Product Dropdown */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1" id={`product-label-${concept.id}`}>Product:</label>
                                        <select
                                            value={concept.product_id || ''}
                                            onChange={(e) => {
                                                const updatedConcept = {
                                                    ...concept,
                                                    product_id: e.target.value || null
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            className="w-full p-2 text-sm border rounded"
                                            aria-labelledby={`product-label-${concept.id}`}
                                        >
                                            <option value="">Select Product</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>
                                                    {product.name} {product.identifier && `(${product.identifier})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Strategist Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Strategist:</label>
                                        <Input
                                            value={localStrategists[concept.id] || ''}
                                            onChange={(e) => {
                                                // Only update local state during typing
                                                setLocalStrategists(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                            }}
                                            onBlur={() => {
                                                // Save to database only when field loses focus
                                                const updatedConcept = {
                                                    ...concept,
                                                    strategist: localStrategists[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter strategist name"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* Creative Coordinator Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Creative Coordinator:</label>
                                        <Input
                                            value={localCreativeCoordinators[concept.id] || ''}
                                            onChange={(e) => {
                                                // Only update local state during typing
                                                setLocalCreativeCoordinators(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                            }}
                                            onBlur={() => {
                                                // Save to database only when field loses focus
                                                const updatedConcept = {
                                                    ...concept,
                                                    creative_coordinator: localCreativeCoordinators[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter creative coordinator name"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* Video Editor/Designer Field */}
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Video Editor/Designer:</label>
                                        <Input
                                            value={localVideoEditors[concept.id] || ''}
                                            onChange={(e) => {
                                                // Only update local state during typing
                                                setLocalVideoEditors(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                            }}
                                            onBlur={() => {
                                                // Save to database only when field loses focus
                                                const updatedConcept = {
                                                    ...concept,
                                                    video_editor: localVideoEditors[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            placeholder="Enter editor/designer name"
                                            className="text-sm"
                                        />
                                    </div>
                                    
                                    {/* Brief Revision Comments Field - Only show when status is BRIEF REVISIONS NEEDED */}
                                    {concept.status === 'BRIEF REVISIONS NEEDED' && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-medium mb-1">Revision Comments:</label>
                                            <Textarea
                                                value={localBriefRevisionComments[concept.id] || ''}
                                                onChange={(e) => {
                                                    // Only update local state during typing
                                                    setLocalBriefRevisionComments(prev => ({
                                                        ...prev,
                                                        [concept.id]: e.target.value
                                                    }));
                                                }}
                                                onBlur={() => {
                                                    // Save to database only when field loses focus
                                                    const updatedConcept = {
                                                        ...concept,
                                                        brief_revision_comments: localBriefRevisionComments[concept.id] || ''
                                                    };
                                                    handleUpdateConcept(updatedConcept);
                                                }}
                                                placeholder="Enter specific comments about what needs to be revised..."
                                                className="text-sm min-h-[80px]"
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                                        {concept.status && (
                                            <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                                                concept.status === "REVISIONS REQUESTED" 
                                                ? "bg-amber-100 text-amber-800 border border-amber-300" 
                                                : concept.status === "BRIEF REVISIONS NEEDED"
                                                    ? "bg-red-100 text-red-800 border border-red-300"
                                                    : concept.status === "APPROVED" 
                                                        ? "bg-green-100 text-green-800 border border-green-300"
                                                        : concept.status === "READY FOR REVIEW"
                                                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                                                            : "bg-green-100 text-green-700 border border-green-200"
                                            }`}>
                                                Status: {concept.status}
                                            </div>
                                        )}
                                        {concept.date_assigned && (
                                            <div className="text-xs px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full font-medium border border-gray-200">
                                                Assigned: {new Date(concept.date_assigned).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                        {concept.product_id && (() => {
                                            const selectedProduct = products.find(p => p.id === concept.product_id);
                                            return selectedProduct ? (
                                                <div className="text-xs px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full font-medium border border-orange-200">
                                                    Product: {selectedProduct.name}
                                                </div>
                                            ) : null;
                                        })()}
                                        {concept.strategist && (
                                            <div className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full font-medium border border-indigo-200">
                                                Strategist: {concept.strategist}
                                            </div>
                                        )}
                                        {concept.creative_coordinator && (
                                            <div className="text-xs px-3 py-1.5 bg-pink-100 text-pink-800 rounded-full font-medium border border-pink-200">
                                                Creative Coordinator: {concept.creative_coordinator}
                                            </div>
                                        )}
                                        {concept.video_editor && (
                                            <div className="text-xs px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full font-medium border border-purple-200">
                                                Editor: {concept.video_editor}
                                            </div>
                                        )}
                                        {concept.review_link && (
                                            <div className="text-xs px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full font-medium border border-blue-200 flex items-center">
                                                <LinkIcon className="h-3 w-3 mr-1" />
                                                Frame.io Available
                                            </div>
                                        )}
                                        {/* Prerequisite tags for incomplete items */}
                                        {getIncompletePrerequisites(concept.id).map((prerequisiteTag, index) => (
                                            <div key={index} className="text-xs px-3 py-1.5 bg-red-100 text-red-800 rounded-full font-medium border border-red-300">
                                                {prerequisiteTag}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Share button for individual concept */}
                                    <div className="flex justify-end mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSharingConceptId(concept.id);
                                                setShowShareConceptDialog(true);
                                            }}
                                        >
                                            <Share2 className="h-3 w-3 mr-1" />
                                            Share
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Media Preview */}
                                    <div 
                                        className="h-[150px] bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (fileInputRef.current) {
                                                fileInputRef.current.setAttribute('data-concept-id', concept.id);
                                                fileInputRef.current.click();
                                            }
                                        }}
                                    >
                                        {concept.media_url ? (
                                            concept.media_type === 'video' ? (
                                                <video
                                                    src={concept.media_url}
                                                    controls
                                                    crossOrigin="anonymous"
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <img
                                                    src={concept.media_url}
                                                    alt="Concept media"
                                                    crossOrigin="anonymous"
                                                    className="h-full w-full object-contain"
                                                />
                                            )
                                        ) : (
                                            <p className="text-gray-500">Upload video/image</p>
                                        )}
                                    </div>
                                    
                                    {/* Media Type Selector */}
                                    <div className="flex items-center space-x-2">
                                        <label className="text-xs font-medium">Media Type:</label>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant={localMediaTypes[concept.id] === 'video' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`flex items-center ${localMediaTypes[concept.id] === 'video' ? 'bg-primary-600 text-white' : ''}`}
                                                onClick={() => handleMediaTypeChange(concept.id, 'video')}
                                            >
                                                <Film className="h-3 w-3 mr-1" />
                                                Video
                                            </Button>
                                            <Button
                                                variant={localMediaTypes[concept.id] === 'image' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`flex items-center ${localMediaTypes[concept.id] === 'image' ? 'bg-primary-600 text-white' : ''}`}
                                                onClick={() => handleMediaTypeChange(concept.id, 'image')}
                                            >
                                                <FileImage className="h-3 w-3 mr-1" />
                                                Image
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* AI Prompt */}
                                    <div>
                                        <Textarea
                                            placeholder="Custom prompt here..."
                                            value={localPrompts[concept.id] || ''}
                                            onChange={(e) => {
                                                // Update local state immediately for responsive typing
                                                setLocalPrompts(prev => ({
                                                    ...prev,
                                                    [concept.id]: e.target.value
                                                }));
                                                
                                                // Debounce the actual save operation
                                                const updatedConcept = {
                                                    ...concept,
                                                    ai_custom_prompt: e.target.value
                                                };
                                                debouncedUpdateConcept(updatedConcept);
                                            }}
                                            onBlur={() => {
                                                // Save immediately on blur (when user tabs out or clicks elsewhere)
                                                if (saveTimeoutRef.current) {
                                                    clearTimeout(saveTimeoutRef.current);
                                                    saveTimeoutRef.current = null;
                                                }
                                                
                                                const updatedConcept = {
                                                    ...concept,
                                                    ai_custom_prompt: localPrompts[concept.id] || ''
                                                };
                                                handleUpdateConcept(updatedConcept);
                                            }}
                                            className="text-sm w-full min-h-fit"
                                            style={{ height: 'auto', overflow: 'hidden' }}
                                        />
                                    </div>
                                    
                                    {/* AI Button */}
                                    {concept.media_url && (
                                        <Button
                                            size="sm"
                                            className="ml-2 bg-primary-600 text-white hover:bg-primary-700 flex items-center"
                                            disabled={generatingConceptIds[concept.id]}
                                            onClick={() => handleGenerateAI(concept.id)}
                                        >
                                            {generatingConceptIds[concept.id] ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                    Generate AI
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    
                                    {/* Debug Prompt Button */}
                                    <Button
                                        size="sm"
                                        className="ml-2 bg-gray-500 text-white hover:bg-gray-600 flex items-center"
                                        onClick={() => handleDebugPrompt(concept.id)}
                                    >
                                        <Bug className="h-4 w-4 mr-2" />
                                        Debug Prompt
                                    </Button>
                                    
                                    {/* Hook Options UI - only for videos */}
                                    {localMediaTypes[concept.id] !== 'image' && (
                                        <div className="space-y-2 mt-4">
                                            <h3 className="font-medium text-sm mb-1">Hook Generation Options</h3>
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-xs font-medium">Hook Type:</label>
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant={localHookTypes[concept.id] === 'text' ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => {
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'text'
                                                                }));
                                                                // Update concept in database
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: 'text' as const
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Text
                                                        </Button>
                                                        <Button
                                                            variant={localHookTypes[concept.id] === 'verbal' ? 'default' : 'outline'}
                                                            size="sm"
                                                            className={`flex items-center ${localHookTypes[concept.id] === 'verbal' ? 'bg-primary-600 text-white' : ''}`}
                                                            onClick={() => {
                                                                // Update local state first
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'verbal'
                                                                }));
                                                                
                                                                // Update concept in database
                                                                const hookTypeVerbal = 'verbal' as const;
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: hookTypeVerbal
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Verbal
                                                        </Button>
                                                        <Button
                                                            variant={!localHookTypes[concept.id] || localHookTypes[concept.id] === 'both' ? 'default' : 'outline'}
                                                            size="sm"
                                                            className={`flex items-center ${!localHookTypes[concept.id] || localHookTypes[concept.id] === 'both' ? 'bg-primary-600 text-white' : ''}`}
                                                            onClick={() => {
                                                                // Update local state first
                                                                setLocalHookTypes(prev => ({
                                                                    ...prev,
                                                                    [concept.id]: 'both'
                                                                }));
                                                                
                                                                // Update concept in database
                                                                const hookTypeBoth = 'both' as const;
                                                                const updatedConcept = {
                                                                    ...concept,
                                                                    hook_type: hookTypeBoth
                                                                };
                                                                handleUpdateConcept(updatedConcept);
                                                            }}
                                                        >
                                                            Both
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <label className="text-xs font-medium">Number of Hooks:</label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        value={localHookCounts[concept.id] || 5}
                                                        onChange={(e) => {
                                                            const count = parseInt(e.target.value) || 5;
                                                            
                                                            // Update local state first
                                                            setLocalHookCounts(prev => ({
                                                                ...prev,
                                                                [concept.id]: count
                                                            }));
                                                            
                                                            // Update concept in database
                                                            const updatedConcept = {
                                                                ...concept,
                                                                hook_count: count
                                                            };
                                                            handleUpdateConcept(updatedConcept);
                                                        }}
                                                        className="w-20 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Text Hook Box - Moved Below Generate AI */}
                                    {localMediaTypes[concept.id] === 'video' && (
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-medium text-sm">Text Hook options (with emojis)</h3>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddTextHook(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Hook
                                                </Button>
                                            </div>
                                            
                                            {(localTextHooksList[concept.id] || []).length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No text hooks yet. Add a hook or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {(localTextHooksList[concept.id] || []).map((hook) => (
                                                        <div key={hook.id} className="p-3 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-gray-600">{hook.title}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveTextHook(concept.id, hook.id);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                value={hook.content}
                                                                onFocus={() => {
                                                                    // Set typing state when user focuses on the field
                                                                    isTypingRef.current[`text-${concept.id}`] = true;
                                                                }}
                                                                onChange={(e) => {
                                                                    handleUpdateTextHook(concept.id, hook.id, e.target.value);
                                                                }}
                                                                onBlur={() => {
                                                                    // Clear typing state when user leaves the field
                                                                    isTypingRef.current[`text-${concept.id}`] = false;
                                                                    
                                                                    // Save immediately on blur
                                                                    if (saveTimeoutRef.current) {
                                                                        clearTimeout(saveTimeoutRef.current);
                                                                        saveTimeoutRef.current = null;
                                                                    }
                                                                    
                                                                    const currentConcept = concepts.find(c => c.id === concept.id);
                                                                    if (currentConcept) {
                                                                        const currentHooks = localTextHooksList[concept.id] || [];
                                                                        const updatedConcept = {
                                                                            ...currentConcept,
                                                                            text_hook_options: currentHooks // Pass Hook[] directly
                                                                        };
                                                                        handleUpdateConcept(updatedConcept);
                                                                    }
                                                                }}
                                                                placeholder="Enter text hook with emojis"
                                                                className="text-sm w-full min-h-fit"
                                                                style={{ height: 'auto', overflow: 'hidden' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Spoken Hook Box - Moved Below Generate AI */}
                                    {localMediaTypes[concept.id] === 'video' && (
                                        <div className="mt-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-medium text-sm">Spoken Hook options (verbal)</h3>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddSpokenHook(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Hook
                                                </Button>
                                            </div>
                                            
                                            {(localSpokenHooksList[concept.id] || []).length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No spoken hooks yet. Add a hook or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {(localSpokenHooksList[concept.id] || []).map((hook) => (
                                                        <div key={hook.id} className="p-3 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-medium text-gray-600">{hook.title}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-red-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveSpokenHook(concept.id, hook.id);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                value={hook.content}
                                                                onFocus={() => {
                                                                    // Set typing state when user focuses on the field
                                                                    isTypingRef.current[`spoken-${concept.id}`] = true;
                                                                }}
                                                                onChange={(e) => {
                                                                    handleUpdateSpokenHook(concept.id, hook.id, e.target.value);
                                                                }}
                                                                onBlur={() => {
                                                                    // Clear typing state when user leaves the field
                                                                    isTypingRef.current[`spoken-${concept.id}`] = false;
                                                                    
                                                                    // Save immediately on blur
                                                                    if (saveTimeoutRef.current) {
                                                                        clearTimeout(saveTimeoutRef.current);
                                                                        saveTimeoutRef.current = null;
                                                                    }
                                                                    
                                                                    const currentConcept = concepts.find(c => c.id === concept.id);
                                                                    if (currentConcept) {
                                                                        const currentHooks = localSpokenHooksList[concept.id] || [];
                                                                        const updatedConcept = {
                                                                            ...currentConcept,
                                                                            spoken_hook_options: currentHooks // Pass Hook[] directly
                                                                        };
                                                                        handleUpdateConcept(updatedConcept);
                                                                    }
                                                                }}
                                                                placeholder="Enter spoken hook (verbal)"
                                                                className="text-sm w-full min-h-fit"
                                                                style={{ height: 'auto', overflow: 'hidden' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Body Content - conditional based on media type */}
                                    <div className="space-y-4 mt-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-medium text-sm">
                                                {localMediaTypes[concept.id] === 'video' 
                                                    ? "Body (Script & Visual Recommendations)" 
                                                    : "Image Description"}
                                            </h3>
                                            {localMediaTypes[concept.id] === 'video' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddScene(concept.id);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Scene
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {localMediaTypes[concept.id] === 'video' ? (
                                            // Video content with scenes
                                            concept.body_content_structured.length === 0 ? (
                                                <div className="p-4 bg-gray-50 rounded text-sm text-gray-500 text-center">
                                                    No scenes yet. Add a scene or use AI to generate content.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {(localScenes[concept.id] || []).map((scene, index) => (
                                                        <div key={index} className="p-4 border rounded space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                                                            <Textarea
                                                value={scene.scene_title}
                                                onChange={(e) => {
                                                    const updatedScenes = [...(localScenes[concept.id] || [])];
                                                    updatedScenes[index] = {
                                                        ...scene,
                                                        scene_title: e.target.value
                                                    };
                                                    
                                                    // Update local state
                                                    setLocalScenes(prev => ({
                                                        ...prev,
                                                        [concept.id]: updatedScenes
                                                    }));
                                                    
                                                    // Debounce save
                                                    debouncedUpdateScene(
                                                        concept.id, 
                                                        index, 
                                                        updatedScenes[index]
                                                    );
                                                }}
                                                onBlur={() => {
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    handleUpdateScene(
                                                        concept.id, 
                                                        index, 
                                                        (localScenes[concept.id] || [])[index]
                                                    );
                                                }}
                                                placeholder="Scene Title (optional)"
                                                className="text-sm font-medium w-full min-h-fit"
                                                style={{ height: 'auto', overflow: 'hidden', resize: 'none' }}
                                            />
                                                                <div className="flex space-x-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        disabled={index === 0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveSceneUp(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <MoveUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        disabled={index === concept.body_content_structured.length - 1}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveSceneDown(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <MoveDown className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveScene(concept.id, index);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">Script:</label>
                                                                <Textarea
                                                                    value={scene.script}
                                                                    onChange={(e) => {
                                                                        const updatedScenes = [...(localScenes[concept.id] || [])];
                                                                        updatedScenes[index] = {
                                                                            ...scene,
                                                                            script: e.target.value
                                                                        };
                                                                        
                                                                        // Update local state
                                                                        setLocalScenes(prev => ({
                                                                            ...prev,
                                                                            [concept.id]: updatedScenes
                                                                        }));
                                                                        
                                                                        // Debounce save
                                                                        debouncedUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            updatedScenes[index]
                                                                        );
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (saveTimeoutRef.current) {
                                                                            clearTimeout(saveTimeoutRef.current);
                                                                            saveTimeoutRef.current = null;
                                                                        }
                                                                        
                                                                        handleUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            (localScenes[concept.id] || [])[index]
                                                                        );
                                                                    }}
                                                                    placeholder="Enter script content"
                                                                    rows={3}
                                                                    className="text-sm"
                                                                />
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="block text-xs font-medium mb-1">Visuals:</label>
                                                                <Textarea
                                                                    value={scene.visuals}
                                                                    onChange={(e) => {
                                                                        const updatedScenes = [...(localScenes[concept.id] || [])];
                                                                        updatedScenes[index] = {
                                                                            ...scene,
                                                                            visuals: e.target.value
                                                                        };
                                                                        
                                                                        // Update local state
                                                                        setLocalScenes(prev => ({
                                                                            ...prev,
                                                                            [concept.id]: updatedScenes
                                                                        }));
                                                                        
                                                                        // Debounce save
                                                                        debouncedUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            updatedScenes[index]
                                                                        );
                                                                    }}
                                                                    onBlur={() => {
                                                                        if (saveTimeoutRef.current) {
                                                                            clearTimeout(saveTimeoutRef.current);
                                                                            saveTimeoutRef.current = null;
                                                                        }
                                                                        
                                                                        handleUpdateScene(
                                                                            concept.id, 
                                                                            index, 
                                                                            (localScenes[concept.id] || [])[index]
                                                                        );
                                                                    }}
                                                                    placeholder="Describe visuals for this scene"
                                                                    rows={3}
                                                                    className="text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            // Image content (single description block)
                                            <div className="p-4 border rounded space-y-2">
                                                <label className="block text-xs font-medium mb-1">Description:</label>
                                                <Textarea
                                                    value={
                                                        // Use local description state if available, otherwise use the concept description
                                                        localDescriptions[concept.id] !== undefined
                                                            ? localDescriptions[concept.id]
                                                            : concept.description || ""
                                                    }
                                                    onChange={(e) => {
                                                        // Update local description state
                                                        setLocalDescriptions(prev => ({
                                                            ...prev,
                                                            [concept.id]: e.target.value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            description: e.target.value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        // Save the description field
                                                        const updatedConcept = {
                                                            ...concept,
                                                            description: localDescriptions[concept.id] || ""
                                                        };
                                                        
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Describe the image content, style, elements, and composition..."
                                                    className="text-sm w-full min-h-fit"
                                                    style={{ height: 'auto', overflow: 'hidden' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* CTA Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-sm">CTA (Call to Action)</h3>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Script:</label>
                                            <MarkdownTextarea
                                                value={localCtaScript[concept.id] || ''}
                                                onChange={(value) => {
                                                    // Update local state immediately for responsive typing
                                                    setLocalCtaScript(prev => ({
                                                        ...prev,
                                                        [concept.id]: value
                                                    }));
                                                    
                                                    // Debounce the actual save operation
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_script: value
                                                    };
                                                    debouncedUpdateConcept(updatedConcept);
                                                }}
                                                onBlur={() => {
                                                    // Save immediately on blur
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_script: localCtaScript[concept.id] || ''
                                                    };
                                                    handleUpdateConcept(updatedConcept);
                                                }}
                                                placeholder="Enter CTA script"
                                                className="text-sm w-full min-h-fit"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Text overlay:</label>
                                            <MarkdownTextarea
                                                value={localCtaTextOverlay[concept.id] || ''}
                                                onChange={(value) => {
                                                    // Update local state immediately for responsive typing
                                                    setLocalCtaTextOverlay(prev => ({
                                                        ...prev,
                                                        [concept.id]: value
                                                    }));
                                                    
                                                    // Debounce the actual save operation
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_text_overlay: value
                                                    };
                                                    debouncedUpdateConcept(updatedConcept);
                                                }}
                                                onBlur={() => {
                                                    // Save immediately on blur
                                                    if (saveTimeoutRef.current) {
                                                        clearTimeout(saveTimeoutRef.current);
                                                        saveTimeoutRef.current = null;
                                                    }
                                                    
                                                    const updatedConcept = {
                                                        ...concept,
                                                        cta_text_overlay: localCtaTextOverlay[concept.id] || ''
                                                    };
                                                    handleUpdateConcept(updatedConcept);
                                                }}
                                                placeholder="Enter text overlay"
                                                className="text-sm w-full min-h-fit"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Voice Generator - moved below CTA */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <ConceptVoiceGenerator 
                                            scenes={localScenes[concept.id] || concept.body_content_structured || []}
                                            spokenHooks={convertHooksToString(localSpokenHooksList[concept.id] || [])} // Use list and convert to string
                                            ctaScript={localCtaScript[concept.id] || concept.cta_script || ''}
                                            conceptId={concept.id}
                                            brandId={brandId}
                                        />
                                    </div>
                                    
                                    {/* Creative Instructions Section */}
                                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                                        <h3 className="font-medium text-sm">Creative Instructions</h3>
                                        
                                        {/* Only show video instructions for video media type */}
                                        {localMediaTypes[concept.id] === 'video' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Video Editor Instructions:</label>
                                                <MarkdownTextarea
                                                    value={localVideoInstructions[concept.id] || ''}
                                                    onChange={(value) => {
                                                        // Update local state immediately for responsive typing
                                                        setLocalVideoInstructions(prev => ({
                                                            ...prev,
                                                            [concept.id]: value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            videoInstructions: value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        // Save immediately on blur
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        const updatedConcept = {
                                                            ...concept,
                                                            videoInstructions: localVideoInstructions[concept.id] || ''
                                                        };
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Instructions for video editors... e.g.&#10;- Use AI voiceover from ElevenLabs&#10;- Add B-roll footage&#10;- Logo at 10-15% opacity&#10;- Add captions&#10;- Add light background music"
                                                    className="text-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Only show designer instructions for image media type */}
                                        {localMediaTypes[concept.id] === 'image' && (
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Designer Instructions (for Images):</label>
                                                <MarkdownTextarea
                                                    value={localDesignerInstructions[concept.id] || ''}
                                                    onChange={(value) => {
                                                        // Update local state immediately for responsive typing
                                                        setLocalDesignerInstructions(prev => ({
                                                            ...prev,
                                                            [concept.id]: value
                                                        }));
                                                        
                                                        // Debounce the actual save operation
                                                        const updatedConcept = {
                                                            ...concept,
                                                            designerInstructions: value
                                                        };
                                                        debouncedUpdateConcept(updatedConcept);
                                                    }}
                                                    onBlur={() => {
                                                        // Save immediately on blur
                                                        if (saveTimeoutRef.current) {
                                                            clearTimeout(saveTimeoutRef.current);
                                                            saveTimeoutRef.current = null;
                                                        }
                                                        
                                                        const updatedConcept = {
                                                            ...concept,
                                                            designerInstructions: localDesignerInstructions[concept.id] || ''
                                                        };
                                                        handleUpdateConcept(updatedConcept);
                                                    }}
                                                    placeholder="Instructions for designers creating image assets..."
                                                    className="text-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Show a message if no media type is selected */}
                                        {!localMediaTypes[concept.id] && (
                                            <div className="text-gray-500 text-sm p-2">
                                                Select a media type (Image/Video) to see relevant instructions
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {/* Add Concept Card */}
                        <div 
                            className="min-w-[350px] max-w-[350px] flex-shrink-0 border-2 border-dashed rounded-lg h-[600px] flex items-center justify-center cursor-pointer hover:bg-gray-50"
                            onClick={handleCreateConcept}
                        >
                            <div className="text-center">
                                <Plus className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Add New Concept</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-12 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
                </div>
            </div>
            
            {/* Delete Batch Dialog */}
            <Dialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Batch</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this batch? This action cannot be undone and will delete all concepts in this batch.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteBatchDialog(false)}
                            disabled={deletingBatch}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleDeleteBatch}
                            disabled={deletingBatch}
                        >
                            {deletingBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Hidden File Input for Single Upload */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden"
                accept="image/*,video/*"
                aria-label="Upload media file"
                title="Upload media file"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        // Get the concept ID from the data attribute set when clicking upload
                        const conceptId = e.target.getAttribute('data-concept-id');
                        if (conceptId) {
                            handleUploadMedia(e.target.files[0], conceptId);
                            e.target.value = ''; // Reset input
                        } else if (activeConceptId) {
                            handleUploadMedia(e.target.files[0], activeConceptId);
                            e.target.value = ''; // Reset input
                        }
                    }
                }}
            />
            
            {/* Hidden File Input for Bulk Upload */}
            <input 
                type="file" 
                ref={multipleFileInputRef} 
                className="hidden"
                accept="image/*,video/*"
                multiple={true}
                aria-label="Bulk upload media files"
                title="Bulk upload media files"
                onChange={(e) => {
                    try {
                        // Ensure we have a valid file input event
                        if (!e.target || !e.target.files) {
                            console.error("EZ UPLOAD: File input event or files property is null");
                            setError("File selection failed. Please try again.");
                            return;
                        }
                        
                        // Check if any files were selected
                        const fileCount = e.target.files.length;
                        if (fileCount === 0) {
                            console.log("EZ UPLOAD: No files were selected");
                            return;
                        }
                        
                        console.log(`EZ UPLOAD: File input change detected - ${fileCount} files selected`);
                        
                        // Log each file that was selected to verify we have the correct files
                        for (let i = 0; i < fileCount; i++) {
                            const file = e.target.files[i];
                            console.log(`EZ UPLOAD: Selected file ${i+1}: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
                        }
                        
                        // Start the bulk upload process
                        console.log("EZ UPLOAD: Starting bulk upload process...");
                        handleBulkUploadMedia(e.target.files);
                        
                        // Reset the file input to allow reselection of the same files
                        e.target.value = '';
                        console.log("EZ UPLOAD: File input has been reset");
                    } catch (err) {
                        console.error("EZ UPLOAD: Error in file input handler:", err);
                        setError(`File selection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                        
                        // Make sure to reset the file input even if an error occurs
                        if (e.target) {
                            e.target.value = '';
                        }
                    }
                }}
            />
            
            {/* Debug Prompt Dialog */}
            <Dialog open={showPromptDebugDialog} onOpenChange={setShowPromptDebugDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>AI Prompt Debug</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            This shows the prompt structure that will be sent to the AI model. 
                            <span className="text-green-600 font-medium block mt-2">
                                Media files (images and videos) are now directly uploaded to Gemini as binary data, enabling accurate analysis of visual content. The actual API request will include the binary data, not just the URL shown here.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 bg-gray-900 text-gray-200 p-4 rounded-md overflow-x-auto whitespace-pre-wrap font-mono text-sm relative">
                        {debugPrompt}
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
                            onClick={handleCopyPrompt}
                        >
                            {copied ? (
                                <span className="text-green-400 flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied!
                                </span>
                            ) : (
                                <span className="text-gray-300 flex items-center">
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </span>
                            )}
                        </Button>
                    </div>
                    
                    <DialogFooter className="mt-4">
                        <Button 
                            variant="outline"
                            onClick={() => setShowPromptDebugDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Batch Settings Dialog */}
            <Dialog open={showBatchSettingsDialog} onOpenChange={setShowBatchSettingsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batch Settings</DialogTitle>
                        <DialogDescription>
                            Configure settings for this batch of concepts
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Starting Concept Number:</label>
                            <div className="flex items-center space-x-2">
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={startingConceptNumber}
                                    onChange={(e) => setStartingConceptNumber(parseInt(e.target.value) || 1)}
                                />
                                <Button
                                    onClick={() => updateConceptNumbering(startingConceptNumber)}
                                >
                                    Apply
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This will renumber all concepts in the batch, starting from this number</p>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowBatchSettingsDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Share Batch Dialog */}
            <Dialog open={showShareBatchDialog} onOpenChange={setShowShareBatchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Batch</DialogTitle>
                        <DialogDescription>
                            Create a sharable link or invite users via email to view this batch.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="shareEditable"
                                checked={shareIsEditable}
                                onChange={(e) => setShareIsEditable(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor="shareEditable" className="text-sm font-medium text-gray-700">
                                Allow editing
                            </label>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Share via Link</h3>
                            {shareSuccess && shareLink ? (
                                <div className="flex items-center space-x-2">
                                    <Input value={shareLink} readOnly className="flex-1" />
                                    <Button size="sm" onClick={handleCopyShareLink}>
                                        {copied ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    onClick={handleShareBatchViaLink}
                                    disabled={sharingInProgress}
                                    className="w-full"
                                >
                                    {sharingInProgress ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <LinkIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Create Link
                                </Button>
                            )}
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t">
                            <h3 className="text-sm font-medium">Invite via Email</h3>
                            <div className="flex space-x-2">
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleShareBatchViaEmail}
                                    disabled={sharingInProgress || !shareEmail}
                                >
                                    {sharingInProgress ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Mail className="h-4 w-4 mr-2" />
                                    )}
                                    Invite
                                </Button>
                            </div>
                            {shareSuccess && !shareLink && (
                                <p className="text-sm text-green-600">Invitation sent!</p>
                            )}
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowShareBatchDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Share Concept Dialog */}
            <Dialog open={showShareConceptDialog} onOpenChange={setShowShareConceptDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Concept</DialogTitle>
                        <DialogDescription>
                            Create a view-only sharable link for this concept.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-gray-500">
                            This will create a public view-only link to share just this concept. Anyone with the link can view it, but cannot make edits.
                        </p>
                        
                        {shareSuccess && shareLink ? (
                            <div className="flex items-center space-x-2">
                                <Input value={shareLink} readOnly className="flex-1" />
                                <Button size="sm" onClick={handleCopyShareLink}>
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                onClick={handleShareConceptViaLink}
                                disabled={sharingInProgress}
                                className="w-full"
                            >
                                {sharingInProgress ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <LinkIcon className="h-4 w-4 mr-2" />
                                )}
                                Create Link
                            </Button>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowShareConceptDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 