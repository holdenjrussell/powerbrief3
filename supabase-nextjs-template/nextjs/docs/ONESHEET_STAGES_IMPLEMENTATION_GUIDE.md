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
- [ ] Build concept generation prompts
- [x] Create brainstorm UI components (placeholder)
- [ ] Implement priority ranking
- [ ] Add export functionality

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
6. **Workflow UI** - Created staged workflow with progress tracking

### 🚧 In Progress
1. **Stage 2: Competitor Research** - Deep analysis features
2. **Stage 4: Creative Brainstorm** - AI generation implementation

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