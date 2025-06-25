# OneSheet Stages Implementation Guide

## Overview

This guide outlines the implementation of the next stages of OneSheet after context collection:
1. **Stage 1: Audience Research** - AI-powered analysis with manual CRUD
2. **Stage 2: Competitor Research** - Auto-populated from context
3. **Stage 3: Ad Account Audit** - Performance data analysis
4. **Stage 4: Creative Brainstorm** - Concept generation

## Implementation Checklist

### Stage 1: Audience Research
- [x] Create database schema for audience research data
- [x] Build AI prompts for auto-filling sections
- [x] Create CRUD API endpoints
- [x] Build UI components for each section
- [x] Implement manual entry/edit functionality
- [x] Add export to JSON functionality

### Stage 2: Competitor Research
- [x] Create competitor analysis table schema
- [x] Build competitor extraction from context
- [x] Create competitor analysis UI table
- [x] Add extraction API endpoint
- [ ] Implement deep analysis prompts
- [ ] Add CRUD operations for manual editing

### Stage 3: Ad Account Audit
- [x] Enhance existing ad performance schema
- [x] Create data import API from Meta
- [x] Build demographic analysis charts
- [x] Implement performance visualization
- [x] Add framework/emotion analysis
- [x] Create export functionality
- [x] Implement two-phase approach (import then analyze)
- [x] Create spreadsheet-style interface
- [x] Filter ads with 0 impressions
- [x] Move demographics below spreadsheet

### Stage 4: Creative Brainstorm
- [x] Create concepts/hooks/visuals schema
- [x] Build concept generation prompts
- [x] Create brainstorm UI components
- [x] Implement priority ranking
- [x] Add export functionality
- [x] Full edit dialogs for concepts, hooks, and visuals
- [x] Claude 4 Sonnet integration
- [x] Context selection system
- [x] Comprehensive UI with 6 tabs

## Current Status

### ✅ Completed
1. **Database Migration** - Created comprehensive schema for all stages
2. **TypeScript Types** - Added all necessary interfaces and types
3. **Stage 1: Audience Research**
   - Full CRUD API endpoints
   - AI generation from context using Gemini 2.0
   - Complete UI with manual editing
   - Export functionality
4. **Stage 2: Competitor Research**
   - Extraction API endpoint implemented
   - Basic UI component created
   - AI-powered competitor identification from context
5. **Stage 3: Ad Account Audit**
   - **Phase 1: Import API** - Fetches ads from Meta with 0 impression filtering
   - **Phase 2: Analyze API** - Uses Gemini to analyze creative attributes
   - **Spreadsheet-style UI** with all requested columns:
     - Asset (Image/Video indicator)
     - Ad Name, Landing Page
     - Performance metrics (Spend, CPA, ROAS, Hook Rate, Hold Rate)
     - Creative attributes (Type, Duration, Product Intro, Sit in Problem %)
     - Strategic analysis (Angle, Format, Emotion, Framework)
     - Transcription field
   - Demographics moved below the spreadsheet
   - Checkbox selection for batch analysis
   - Export to CSV functionality
   - Clear data option
6. **Stage 4: Creative Brainstorm** - **FULLY COMPLETED**
   - **Context Selection System** - Comprehensive checkboxes for all data sources
   - **6-Tab Interface** - Net New Concepts, Iterations, Hooks, Visuals, Best Practices, Settings
   - **Dual AI Support** - Claude 4 Sonnet and Gemini integration (user configurable)
   - **Edit Dialogs** - Beautiful, user-friendly dialogs for editing concepts, hooks, and visuals
   - **Database Storage** - All AI instructions, prompts, and schemas stored in database (no hardcoded fallbacks)
   - **Export Functionality** - JSON and CSV export capabilities
   - **Responsive Design** - Mobile-friendly interface with modern UX
   - **Validation** - Ensures all required AI configurations are set before generation
7. **Workflow UI** - Created staged workflow with progress tracking

### 🚧 In Progress
1. **Stage 2: Competitor Research** - Deep analysis features

### 📝 Next Steps
1. Implement deep competitor analysis prompts
2. Create creative concept generation prompts
3. Add manual CRUD for competitor data
4. Complete creative brainstorm functionality
5. Implement asset download and storage to Supabase
6. Add Gemini Files API integration for video analysis

## Database Schema Updates

### 1. Create new migration for audience research stages

```sql
-- 20250131000000_onesheet_audience_research_stages.sql

-- Stage 1: Audience Research Data
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS audience_research JSONB DEFAULT '{
  "angles": [],
  "benefits": [],
  "painPoints": [],
  "features": [],
  "objections": [],
  "failedSolutions": [],
  "other": [],
  "personas": []
}';

-- Stage 2: Competitor Research Data
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS competitor_research JSONB DEFAULT '{
  "competitors": [],
  "deepAnalysis": {
    "qualityComparison": {},
    "formatStrategies": {},
    "creatorApproaches": {},
    "learningsOverTime": []
  }
}';

-- Stage 3: Ad Account Audit Enhanced
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS ad_account_audit JSONB DEFAULT '{
  "ads": [],
  "demographicBreakdown": {
    "age": {},
    "gender": {},
    "placement": {}
  },
  "performanceByAngle": {},
  "performanceByFormat": {},
  "performanceByEmotion": {},
  "performanceByFramework": {}
}';

-- Stage 4: Creative Brainstorm
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS creative_brainstorm JSONB DEFAULT '{
  "concepts": [],
  "hooks": [],
  "visuals": []
}';

-- Add stage tracking
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'context_loading',
ADD COLUMN IF NOT EXISTS stages_completed JSONB DEFAULT '{
  "context": false,
  "audience_research": false,
  "competitor_research": false,
  "ad_audit": false,
  "creative_brainstorm": false
}';
```

## API Endpoints

### Stage 1: Audience Research ✅

```typescript
// /api/onesheet/audience-research/generate
POST - Generate AI analysis from context
Request: { onesheet_id, sections: ['angles', 'benefits', etc] }
Response: { angles: [], benefits: [], etc }

// /api/onesheet/audience-research
GET - Get current audience research data
POST - Create/Update audience research item
PUT - Update specific item
DELETE - Delete specific item
```

### Stage 2: Competitor Research ✅

```typescript
// /api/onesheet/competitor-research/extract
POST - Extract competitors from context
Request: { onesheet_id }
Response: { competitors: [...] }

// /api/onesheet/competitor-research/analyze
POST - Deep analysis of competitors
Request: { onesheet_id, competitor_id }
Response: { analysis: {...} }

// /api/onesheet/competitor-research
CRUD operations for competitor data
```

### Stage 3: Ad Account Audit ✅

```typescript
// Phase 1: Import ads from Meta
// /api/onesheet/ad-audit/import
POST - Import ad performance data from Meta
Request: { onesheet_id, date_range?, fetch_limit? }
Response: { 
  success: true, 
  data: { 
    adsImported: number,
    dateRange: {...},
    summary: {...}
  }
}

// Phase 2: Analyze ads with Gemini
// /api/onesheet/ad-audit/analyze
POST - Analyze creative attributes using Gemini
Request: { onesheet_id, ad_ids?: string[] }
Response: {
  success: true,
  data: {
    adsAnalyzed: number,
    totalAds: number
  }
}

// Clear all ad data
// /api/onesheet/ad-audit/clear
POST - Clear all ad audit data
Request: { onesheet_id }

// Features implemented:
- Automatic Meta OAuth token usage
- Filters out ads with 0 impressions
- Extracts asset URLs and types
- Calculates performance metrics (CPA, ROAS, Hook Rate, Hold Rate)
- Two-phase approach: import first, then analyze
- Batch processing for Gemini analysis
- Spreadsheet-style data structure
```

### Stage 4: Creative Brainstorm 🚧

```typescript
// /api/onesheet/creative/generate
POST - Generate concepts from research
Request: { onesheet_id, type: 'concepts'|'hooks'|'visuals' }

// /api/onesheet/creative
CRUD operations for creative elements
```

## UI Components Structure

### 1. AudienceResearchPanel.tsx ✅
- Complete implementation with all sections
- AI generation from context
- Manual CRUD operations
- Export functionality

### 2. CompetitorResearchTable.tsx ✅
- Basic implementation completed
- Displays extracted competitors
- Shows similarities, differences, opportunities
- Needs deep analysis features

### 3. AdAccountAuditDashboard.tsx ✅
- **Spreadsheet-style interface** with all columns
- **Two-phase operation:**
  - Import button fetches ads from Meta
  - Analyze button processes with Gemini
- **Features:**
  - Checkbox selection for batch operations
  - Asset type indicators (video/image icons)
  - All requested metrics and attributes
  - Demographics charts moved below table
  - Export to CSV
  - Clear data option
  - Direct links to Facebook Ads Manager
- **Columns:**
  - Asset, Ad Name, Landing Page
  - Spend, CPA, ROAS, Hook Rate, Hold Rate
  - Type, Ad Duration, Product Intro, Sit in Problem %
  - Creators Used, Angle, Format, Emotion, Framework
  - Actions (link to Ads Manager)

### 4. CreativeBrainstormPanel.tsx 🚧
- Placeholder created
- Needs implementation for:
  - Concept generation
  - Hook creation
  - Visual ideas

## AI Prompts Structure

### Stage 1: Audience Research Prompt ✅
```typescript
const audienceResearchPrompt = `
Using all the context data provided, analyze and extract:

1. ANGLES (Overall themes for ads):
   - List 5-10 distinct angles
   - Provide supporting evidence from context
   - Rank by potential effectiveness

2. BENEFITS (What customers gain):
   - List all key benefits mentioned
   - Include supporting quotes/data
   - Group by importance

3. PAIN POINTS (Problems without product):
   - Extract from reviews, social posts
   - Include severity indicators
   - Link to potential angles

4. FEATURES (Product attributes):
   - Technical specifications
   - Unique selling points
   - Differentiators

5. OBJECTIONS (Purchase hesitations):
   - Common concerns from reviews
   - Price sensitivity
   - Trust issues

6. FAILED SOLUTIONS (What didn't work):
   - Competitor products tried
   - DIY solutions attempted
   - Why they failed

7. PERSONAS (Customer profiles):
   - Create 3-5 detailed personas
   - Include demographics & psychographics
   - Awareness levels

Format as JSON with evidence links.
`;
```

### Stage 2: Competitor Analysis Prompt ✅
```typescript
const competitorExtractionPrompt = `
Analyze the context data to identify and extract competitor information:

1. Direct Competitors:
   - Companies offering similar products/services
   - Extract from competitor websites, ads, reviews
   
2. Indirect Competitors:
   - Alternative solutions mentioned
   - DIY approaches or substitutes

3. For each competitor, identify:
   - Product/service similarities
   - Key differences
   - Customer complaints/dissatisfaction
   - Pricing information
   - Marketing approaches

4. Opportunities:
   - Gaps in competitor offerings
   - Common customer complaints
   - Unmet needs

Format as structured JSON with source references.
`;
```

### Stage 3: Ad Audit Analysis ✅
The ad audit stage uses a two-phase approach:

**Phase 1: Direct Meta API Integration**
- Fetches real ad performance data
- Filters out ads with 0 impressions
- Calculates key metrics (CPA, ROAS, hook rate, hold rate)
- Extracts asset URLs and basic info

**Phase 2: Gemini Analysis Prompt**
```typescript
const adAnalysisPrompt = `
Analyze this Facebook ad creative and provide the following information:

Ad Name: ${ad.name}
Creative Title: ${ad.creativeTitle}
Creative Body: ${ad.creativeBody}
Asset Type: ${ad.assetType}

Please analyze and return in JSON format:
{
  "type": "High Production Video|Low Production Video (UGC)|Static Image|Carousel|GIF",
  "adDuration": number (in seconds, estimate if image),
  "productIntro": number (seconds when product first shown/mentioned),
  "creatorsUsed": number (visible people in the ad),
  "angle": "Weight Management|Time/Convenience|Energy/Focus|Digestive Health|Immunity Support|etc",
  "format": "Testimonial|Podcast Clip|Authority Figure|3 Reasons Why|Unboxing|etc",
  "emotion": "Hopefulness|Excitement|Curiosity|Urgency|Fear|Trust|etc",
  "framework": "PAS|AIDA|FAB|Star Story Solution|Before After Bridge|etc",
  "transcription": "Full transcription if video, or main text if image"
}

Base your analysis on the creative text and ad name patterns.
`;
```

## Implementation Timeline

### Week 1: Database & API Foundation ✅
- Created migrations
- Built core API endpoints for Stages 1-3
- Set up data models

### Week 2: AI Integration ✅
- Implemented Gemini prompts for Stages 1-2
- Built context processing
- Created auto-population logic

### Week 3: UI Components ✅
- Built audience research panel
- Created competitor table
- Implemented ad audit dashboard with spreadsheet interface
- Added CRUD operations

### Week 4: Advanced Features 🚧
- Deep competitor analysis (pending)
- Creative brainstorm generation (pending)
- Enhanced export/import features

### Week 5: Polish & Testing
- Add loading states ✅
- Implement error handling ✅
- Create user guides
- Add tooltips and help text

## Technical Details

### Ad Account Audit Implementation
The ad audit feature uses a two-phase approach:

**Phase 1: Import**
1. Uses brand's stored Meta access token
2. Fetches ads with performance metrics
3. Filters out ads with 0 impressions
4. Extracts landing pages from object_story_spec
5. Calculates video engagement metrics
6. Stores raw data for Phase 2

**Phase 2: Analyze**
1. Processes ads that haven't been analyzed
2. Uses Gemini to detect creative attributes
3. Analyzes emotion and framework from ad creative
4. Calculates sit in problem percentage
5. Updates ads with analysis results

### Key Metrics Calculated
- **CPA**: Cost per acquisition (spend / purchases)
- **ROAS**: Return on ad spend (revenue / spend)
- **Hook Rate**: 3-second video views / impressions × 100
- **Hold Rate**: 50% video views / 3-second views × 100
- **Sit in Problem %**: (Product intro time / Ad duration) × 100
- **Demographics**: Age and gender distribution

## Next Steps

1. **Complete Stage 4: Creative Brainstorm**
   - Build AI prompts for concept generation
   - Create hook and visual generation logic
   - Implement priority ranking system

2. **Enhance Stage 2: Competitor Research**
   - Add deep analysis questions
   - Implement manual editing capabilities
   - Create comparison visualizations

3. **Add Asset Management**
   - Download and store ad assets to Supabase
   - Implement Gemini Files API for video analysis
   - Create asset library interface

4. **Improve User Experience**
   - Add contextual help and tooltips
   - Create video tutorials
   - Implement keyboard shortcuts
   - Add collaborative features 

# Stage 4: Creative Brainstorm (Status: ✅ COMPLETE - FULLY ENHANCED)

## Overview
The Creative Brainstorm stage has been fully enhanced with comprehensive features for generating and managing creative concepts based on all previous research and analysis.

## Database Schema
```sql
-- Stored as JSONB in onesheet.creative_brainstorm column
{
  netNewConcepts: CreativeConcept[],
  iterations: CreativeIteration[],
  hooks: {
    visual: CreativeHook[],
    audio: CreativeHook[]
  },
  visuals: CreativeVisual[],
  creativeBestPractices: {
    dos: string[],
    donts: string[],
    keyLearnings: string[],
    recommendations: string[]
  }
}

-- AI Instructions stored in onesheet_ai_instructions table:
- creative_brainstorm_system_instructions (text)
- creative_brainstorm_prompt_template (text) 
- creative_brainstorm_response_schema (jsonb)
- creative_brainstorm_model (text)
- claude_system_instructions (text)
- claude_prompt_template (text)
```

## Key Features Implemented

### 1. Enhanced Ad Selector Dialog
- **Full table view** with all ad metrics and properties
- Column display: Asset type, Ad name, Landing page, Spend, CPA, ROAS, Hook rate, Hold rate, Type, Duration, Product intro, Sit in problem, Creators, Angle, Format, Emotion, Framework
- **Dual selection system**:
  - Primary selection for ads to include in context
  - Secondary selection for ads to generate iterations
- Bulk selection controls (Select All, Clear Selection)
- Real-time selection counter
- External link to view ads in Facebook Ads Manager

### 2. Unified Model Selection
- Single model selector supporting:
  - **Gemini 2.5 Pro** (default - most capable)
  - **Gemini 2.5 Flash** (balanced performance)
  - **Gemini 2.5 Flash Lite** (fastest)
  - **Claude 4 Sonnet** (superior reasoning)
- Model-specific instruction configuration
- Persistent model selection per brand

### 3. Context Options Panel
Comprehensive checkbox system with smart defaults:
- **Context Hub** (all enabled by default)
- **Audience Research** (all enabled by default)
- **Competitor Research** (all enabled by default)
- **Ad Account Audit** (Priority 1):
  - Full Data Table: OFF by default
  - Selected Ads Only: ON by default (required)
- **AI Strategist** (Priority 2, all enabled)
- **Demographics** (Priority 3, enabled)

### 4. Enhanced Concept Builder
Extended fields for comprehensive concept definition:
- Basic: Name, Description
- Strategic: Angle, Emotion, Framework, Awareness Level
- Format: Type, Format (dynamic dropdowns from AI instructions)
- Production specs:
  - Duration (seconds)
  - Product Intro Time (seconds)
  - Sit in Problem Time (seconds)
  - Number of Creators
- Content Variables (multi-select from AI instructions)
- Target Persona

### 5. Split Generation System
Separate API calls for better AI performance:
- **Concepts**: Net new creative concepts
- **Iterations**: Specific improvements for selected ads
- **Hooks**: Visual and audio attention grabbers
- **Visuals**: Detailed visual treatments
- **Practices**: Do's, don'ts, learnings, recommendations

### 6. Full CRUD Operations
Complete editing capabilities for all generated content:
- **Edit dialogs** for concepts, hooks, visuals, and best practices
- **Add new** items to any category
- **Delete** functionality with inline controls
- **Real-time updates** without page refresh
- **Drag-and-drop** ready (IDs included for future implementation)

### 7. AI Instruction Management
- Tabbed interface for Gemini and Claude instructions
- Editable system instructions, prompts, and schemas
- Save/edit toggle with visual feedback
- JSON schema validation for response formats
- No hardcoded fallbacks - all database driven

### 8. Export Functionality
- **JSON export** with full structured data
- **CSV export** with flattened format for spreadsheets
- Includes all relationships and metadata

## API Endpoints

### Generation Endpoint
`POST /api/onesheet/creative-brainstorm/generate`
- Supports `promptType` parameter for split generation
- Model selection via `model` parameter
- Context options with selected ad IDs
- Returns partial results for each prompt type

### Save Endpoint
`PUT /api/onesheet/creative-brainstorm`
- Saves complete creative brainstorm data
- Validates data structure
- Updates timestamp

### Export Endpoint
`GET /api/onesheet/creative-brainstorm/export`
- Supports `format` query param (json/csv)
- Returns downloadable file
- Includes all nested data structures

## TypeScript Interfaces

### Extended Types
```typescript
interface ExtendedCreativeConcept extends CreativeConcept {
  duration?: number;
  productIntroTime?: number;
  sitInProblemTime?: number;
  creatorsCount?: number;
  contentVariables?: string[];
  type?: string;
  format?: string;
}

interface ExtendedCreativeVisual extends CreativeVisual {
  duration?: number;
}
```

### Component State
- `data`: Current creative brainstorm data
- `selectedAds`: Primary ad selection for context
- `selectedIterationAds`: Secondary selection for iterations
- `selectedModel`: Current AI model selection
- `contextOptions`: Comprehensive context selection state
- Edit states for concepts, hooks, visuals, practices

## UI/UX Enhancements

### Responsive Design
- Mobile-friendly grid layouts
- Collapsible context panel on small screens
- Horizontal scroll for large tables
- Touch-friendly controls

### Visual Feedback
- Loading states with descriptive messages
- Empty states with clear CTAs
- Hover effects on interactive elements
- Selection highlighting in tables
- Success/error notifications

### Performance
- Debounced search/filter inputs
- Virtualized lists for large datasets
- Optimistic UI updates
- Cached API responses

## Integration Points

### Data Flow
1. User selects ads from comprehensive table
2. Configures context options
3. Generates content via split API calls
4. Reviews and edits generated content
5. Saves to database
6. Exports for use in creative production

### Connected Systems
- **Audience Research**: Pulls angles, personas, pain points
- **Competitor Research**: Incorporates differentiation strategies
- **Ad Account Audit**: Uses performance data and patterns
- **AI Strategist**: Leverages recommendations and insights

## Security & Validation

### Input Validation
- Required ad selection when enabled
- Model availability checks
- Schema validation for AI responses
- XSS prevention in user inputs

### Access Control
- Brand-level permissions
- User authentication required
- Audit trail for changes

## Future Enhancements (Not Implemented)
1. Drag-and-drop reordering
2. Collaborative editing
3. Version history
4. A/B test planning
5. Direct integration with ad creation tools
6. Performance prediction models
7. Asset library integration
8. Automated creative briefs generation

## Configuration Requirements

### Database Setup
1. Run migration to add AI instruction fields
2. Set default instructions for each model
3. Configure model API keys in environment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
```

## Usage Guide

### For Users
1. Complete stages 1-3 first for best results
2. Select relevant ads using the enhanced table
3. Choose ads for iteration separately
4. Review context options (defaults are optimized)
5. Generate ideas using selected AI model
6. Edit and refine generated content
7. Export for creative production

### For Developers
1. Component: `src/components/onesheet/CreativeBrainstormPanel.tsx`
2. Styles: `src/components/onesheet/CreativeBrainstormPanel.module.scss`
3. API routes in `src/app/api/onesheet/creative-brainstorm/`
4. Types in `src/lib/types/onesheet.ts`
5. Follow established patterns for consistency

## ✅ Stage Completion Checklist
- [x] Database schema implemented
- [x] Full CRUD operations
- [x] Enhanced ad selector with full table
- [x] Unified model selection
- [x] Context options with priorities
- [x] Extended concept fields
- [x] Split generation system
- [x] Edit dialogs for all content types
- [x] Export functionality (JSON/CSV)
- [x] AI instruction management
- [x] Mobile responsive design
- [x] Loading and error states
- [x] Type safety throughout
- [x] Default model (gemini-2.5-pro)
- [x] No hardcoded fallbacks

## Current Status
The Creative Brainstorm stage is **fully functional** with:
- Complete database-driven AI configuration (no hardcoded fallbacks)
- Claude 4 Sonnet integration (claude-sonnet-4-20250514)
- Beautiful, responsive edit dialogs with full CRUD operations
- Comprehensive type safety throughout
- Modern UX/UI design with mobile responsiveness
- Proper validation and error handling
- Split generation system for optimal AI performance
- Auto-save after generation
- Best practices CRUD with add/edit/delete functionality
- Required ad selection validation
- Default AI instructions migration for all brands

## Recent Enhancements (Latest Update)
1. **Fixed Invalid URL Error**: Added proper validation for landing page URLs
2. **Enhanced Best Practices CRUD**: Full add/edit/delete functionality with beautiful dialogs
3. **Split Generation API**: Created `/generate-split` endpoint for better performance
4. **Auto-save After Generation**: Automatically saves generated content
5. **Default AI Instructions**: Migration to set defaults for all existing brands
6. **Ad Selection Validation**: Enforces required ad selection when enabled
7. **Iteration Logic**: AI picks top 5 ads if none selected for iterations 

## 🚨 Current Issues & Fix Plan (January 2025)

### Issue 1: Hook Creation Error - Empty String Value ✅
**Problem**: Error when adding hooks - Select.Item must have non-empty value prop
**Resolution**: 
- Changed empty string values to `__none__` in Select components
- Updated value handlers to convert `__none__` back to undefined
- Fixed both hook and visual edit dialogs

### Issue 2: Missing Dropdown Options from AI Instructions ⚠️
**Problem**: Angle, emotion, frameworks, awareness level, type, format, content variables not pulling from database
**Status**: Code is ready but migration not applied
**Resolution**: 
- Component code updated to fetch and parse values from `analysis_fields`
- **MIGRATION REQUIRED**: `20250131000020_add_analysis_fields_to_ai_instructions.sql` needs to be applied to populate default dropdown values

### Issue 3: Ad Preview Issues in Selector Modal ✅
**Problem**: Images show small thumbnails (not expandable), videos show nothing
**Resolution**:
- Added `ExtendedAdData` interface to include asset URLs
- Implemented expandable image preview on click
- Fixed video preview to show thumbnails with play overlay
- Added proper error handling with fallback icons

### Issue 4: Iterations Tab Missing CRUD ✅
**Problem**: No add/edit functionality for iterations, only displays text
**Resolution**:
- Added "Add Iteration" button to each iteration type section
- Created iteration edit dialog with full form
- Implemented edit and delete buttons for each iteration
- Added proper styling for iteration cards and headers

### Issue 5: Visuals Tab Error - Empty String Value ✅
**Problem**: Same Select.Item error as hooks when navigating to visuals tab
**Resolution**:
- Applied same fix as hooks - changed empty string to `__none__`
- Updated value handler to convert `__none__` back to undefined

### Issue 6: Settings Tab Missing Separate Prompts ⚠️
**Problem**: Not showing separate prompts/instructions for different sections (concepts, iterations, hooks, visuals)
**Status**: Code is ready but migration not applied
**Resolution**:
- Updated settings tab with nested tabs for each section
- Added separate prompt fields for both Gemini and Claude models
- Updated TypeScript types to include all new fields
- **MIGRATION REQUIRED**: `20250131000001_add_split_creative_brainstorm_prompts.sql` needs to be applied

### Issue 7: Existing Brands Not Getting Defaults ⚠️
**Problem**: Pre-existing brands not pulling default values from database
**Status**: Pending migration application
**Resolution**:
- Both migrations include UPDATE statements to set defaults for existing records
- Once migrations are applied, existing brands will have default values

## Implementation Progress
- [x] Fix hook creation Select error
- [x] Load AI instruction values for dropdowns (code ready, migration needed)
- [x] Enhance ad preview functionality
- [x] Add iterations CRUD operations
- [x] Fix visuals tab Select error
- [x] Add section-specific prompts in settings (code ready, migration needed)
- [x] Update existing brands with defaults (will work after migrations)

## ⚠️ IMPORTANT: Migrations Status
Based on MCP check, the following migrations have NOT been applied yet:
1. `20250131000001_add_split_creative_brainstorm_prompts.sql` - Adds section-specific prompt fields
2. `20250131000020_add_analysis_fields_to_ai_instructions.sql` - Adds default dropdown values

**To fully enable all features, these migrations must be applied to the database.**

## Summary of Fixes Applied

### 1. Hook & Visual Creation Error ✅
- Changed empty string values to `__none__` in Select components
- Updated value handlers to convert `__none__` back to undefined
- Fixed both hook and visual edit dialogs

### 2. Enhanced Ad Preview ✅
- Added `ExtendedAdData` interface to include asset URLs
- Implemented expandable image preview on click
- Fixed video preview to show thumbnails with play overlay
- Added proper error handling with fallback icons

### 3. Iterations CRUD Operations ✅
- Added "Add Iteration" button to each iteration type section
- Created iteration edit dialog with full form
- Implemented edit and delete buttons for each iteration
- Added proper styling for iteration cards and headers

### 4. Section-Specific Prompts ✅
- Updated settings tab with nested tabs for each section
- Added separate prompts for concepts, iterations, hooks, visuals, practices
- Implemented for both Gemini and Claude models
- Updated TypeScript types to include all new fields

### 5. Database Migrations Required
The following migrations need to be applied manually:
1. `20250131000001_add_split_creative_brainstorm_prompts.sql` - Adds section-specific prompt fields
2. `20250131000020_add_analysis_fields_to_ai_instructions.sql` - Adds default dropdown values

### 6. Key Improvements
- All CRUD operations now follow consistent patterns
- Enhanced UX with expandable previews
- Better organization of AI instructions
- Type safety throughout the component
- Mobile responsive design maintained

### Next Steps
1. Apply the pending migrations to the database
2. Test with existing brands to ensure defaults are applied
3. Consider adding drag-and-drop reordering for concepts/hooks/visuals
4. Add performance tracking for generated content 