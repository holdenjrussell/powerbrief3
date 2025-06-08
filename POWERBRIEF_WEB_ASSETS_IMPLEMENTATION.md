# PowerBrief Web Assets Implementation

## Overview

This document outlines the implementation of the PowerBrief Web Assets feature, which is specifically designed for creating design briefs for web assets only. This implementation eliminates the duplication with the ads version and provides a focused, comprehensive brief builder for web-specific creative assets.

## Branch Information

**Branch:** `powerbrief-web-assets`

This feature is implemented on a dedicated branch to allow for focused development and testing of web asset-specific functionality.

## Key Differences from Ads Version

### 1. Asset Type Focus
- **Ads Version**: Focuses on paid advertising campaigns across platforms (Meta, Google, TikTok, etc.)
- **Web Assets Version**: Specifically designed for web assets including:
  - Landing Pages
  - Web Banners (Static/Animated)
  - Promotional Popups/Modals
  - Homepage Heroes
  - Product Explainers
  - Brand Story Videos
  - Animated Logos/Bumpers
  - Video Animations
  - Custom asset types with input saving capability

### 2. Brief Structure

#### Core Creative Idea Section
- **Project Name**: Clear, descriptive title for the asset
- **Primary Message/The Hook**: Single most important idea the viewer must understand
- **Call to Action (CTA)**: Exact text for primary button or desired user action
- **The Offer**: Clearly stated promotion that needs visual highlighting

#### Visual & Sensory Direction
- **Inspiration Gallery**: Upload images or link to URLs (Behance, Dribbble, competitor sites)
- **Look & Feel Keywords**: Visual style descriptors (Minimal & Clean, Bold & Energetic, etc.)
- **Color Palette**: Primary, secondary, accent colors with HEX codes and avoid colors
- **Typography**: Font family, weights, styles for headlines, body text, and CTAs
- **Mandatory Elements Checklist**:
  - Logo (with version specification)
  - Specific Product Shots
  - Legal Disclaimer/Fine Print
  - Custom elements

#### Asset-Specific Structure & Specs
Different specifications based on asset type:

**For Landing Pages/Web Heroes:**
- Section Flow/Wireframe
- Interactive Notes (hover states, animations)

**For Web Banners:**
- Dimensions (all required ad sizes)
- Animation Sequence for animated banners

**For Videos:**
- Shot List/Storyboard
- Aspect Ratios checklist
- Required End Card specifications

### 3. AI Features

#### Creative Angle Generator
- Suggests creative hooks and messaging angles based on product and offer
- Tailored for web conversion optimization

#### AI-Powered Mood Board
- Generates curated mood boards from "Look & Feel Keywords"
- Pulls from visual platforms for inspiration

#### Animation Sequence Suggester
- Proposes effective animation sequences for web banners
- Based on provided content elements

## Implementation Details

### File Structure
```
supabase-nextjs-template/nextjs/src/app/app/powerbrief/[brandId]/[batchId]/web-assets/
└── page.tsx
```

### Key Components

#### 1. Web Asset Brief Builder Page (`page.tsx`)
- **Location**: `/app/powerbrief/[brandId]/[batchId]/web-assets/page.tsx`
- **Purpose**: Main interface for creating and managing web asset briefs
- **Features**:
  - Concept management sidebar
  - Interactive brief builder (to be implemented)
  - AI-powered brief generation
  - Real-time preview of generated content

#### 2. WebAssetBriefBuilder Component (To Be Implemented)
- **Location**: `/components/WebAssetBriefBuilder.tsx`
- **Purpose**: Interactive form builder for web asset specifications
- **Features**:
  - Dynamic asset type selection with dropdown
  - Section-by-section brief building
  - Auto-save functionality
  - AI integration for content generation

### Data Structure

#### WebAssetBriefData Interface
```typescript
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
}
```

### AI Integration

#### System Instructions for Web Assets
The AI system is specifically trained for web asset creation with focus on:
- Conversion optimization
- User experience best practices
- Brand consistency
- Visual inspiration integration
- Web-specific technical requirements

#### Response Format
```json
{
  "asset_type": "banner|landing_page|infographic|promo|gif|popup|hero",
  "primary_headline": "Main headline that captures attention",
  "secondary_headline": "Supporting headline or subheader",
  "body_copy": "Main content text optimized for the asset type",
  "cta_primary": "Primary call-to-action text",
  "cta_secondary": "Secondary CTA if applicable",
  "visual_elements": [...],
  "design_specifications": {...},
  "conversion_elements": [...],
  "section_structure": [...]
}
```

## Features Maintained from Original PowerBrief

### 1. Team Management
- Assigned Designer field
- Creative Strategist field
- ClickUp integration
- Status tracking

### 2. Sharing & Collaboration
- Public share page functionality
- Public batch share page
- Asset upload capability for final deliverables
- Review and approval workflow

### 3. Brand Integration
- Full brand context integration
- Target audience data utilization
- Competition analysis integration
- Brand guidelines linking

## Implementation Status

### ✅ Completed
- [x] New branch creation (`powerbrief-web-assets`)
- [x] Web assets page structure
- [x] Basic UI layout and navigation
- [x] Concept management functionality
- [x] AI integration framework
- [x] Data structure definitions

### 🚧 In Progress
- [ ] WebAssetBriefBuilder component implementation
- [ ] Asset type dropdown with dynamic sections
- [ ] Interactive brief building interface
- [ ] Auto-save functionality

### 📋 To Do
- [ ] AI Creative Angle Generator
- [ ] AI-Powered Mood Board feature
- [ ] Animation Sequence Suggester
- [ ] Public sharing pages for web assets
- [ ] Asset upload and review workflow
- [ ] Integration testing
- [ ] Documentation completion

## Usage Flow

1. **Navigate to Web Assets**: Users select "Web Assets" tab in PowerBrief
2. **Create Batch**: Create a new batch specifically for web assets
3. **Asset Type Selection**: Choose from predefined asset types or create custom
4. **Brief Building**: Use interactive builder to specify requirements
5. **AI Generation**: Generate comprehensive brief using AI assistance
6. **Review & Refine**: Review generated content and make adjustments
7. **Share & Assign**: Share with designers and track progress
8. **Asset Upload**: Receive and review final assets

## Technical Considerations

### Routing
- Web assets use dedicated route: `/app/powerbrief/[brandId]/[batchId]/web-assets`
- Maintains consistency with existing PowerBrief structure
- Allows for asset-type-specific functionality

### Database Integration
- Utilizes existing PowerBrief database schema
- Stores web asset-specific data in concept descriptions
- Maintains compatibility with existing review and sharing systems

### AI Integration
- Uses existing AI brief generation API
- Implements web asset-specific system instructions
- Optimized for conversion-focused web content

## Future Enhancements

### Phase 2 Features
- Advanced animation timeline builder
- Interactive wireframe creator
- A/B testing brief variations
- Performance tracking integration

### Integration Opportunities
- Figma plugin for direct design handoff
- Adobe Creative Suite integration
- Web analytics integration for performance tracking
- CMS integration for direct publishing

## Conclusion

The PowerBrief Web Assets implementation provides a focused, comprehensive solution for web asset brief creation. By eliminating duplication with the ads version and providing web-specific features, this implementation serves as the single source of truth for web creative teams while maintaining all the collaborative and sharing features of the original PowerBrief platform.