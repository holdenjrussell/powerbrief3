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
- [ ] Build competitor extraction from context
- [x] Create competitor analysis UI table (placeholder)
- [ ] Add deep analysis prompts
- [ ] Implement CRUD operations

### Stage 3: Ad Account Audit
- [x] Enhance existing ad performance schema
- [ ] Create data visualization components
- [x] Build demographic analysis charts (placeholder)
- [ ] Implement performance tagging system
- [ ] Add framework/emotion analysis

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
4. **Workflow UI** - Created staged workflow with progress tracking

### 🚧 In Progress
1. **Stage 2: Competitor Research** - Placeholder UI created, needs implementation
2. **Stage 3: Ad Account Audit** - Placeholder UI created, needs implementation
3. **Stage 4: Creative Brainstorm** - Placeholder UI created, needs implementation

### 📝 Next Steps
1. Implement competitor extraction from context API
2. Build ad performance data import/analysis
3. Create creative concept generation prompts
4. Add visualization components for data analysis

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

### Stage 2: Competitor Research 🚧

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

### Stage 3: Ad Account Audit 🚧

```typescript
// /api/onesheet/ad-audit/import
POST - Import ad performance data
Request: { onesheet_id, ads: [...] }

// /api/onesheet/ad-audit/analyze
POST - Analyze performance patterns
Request: { onesheet_id }
Response: { demographics: {...}, insights: {...} }

// /api/onesheet/ad-audit
CRUD operations for ad data
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

### 2. CompetitorResearchTable.tsx 🚧
- Placeholder created
- Needs implementation for:
  - Table with competitor data
  - Deep analysis modal
  - CRUD operations

### 3. AdAccountAuditDashboard.tsx 🚧
- Placeholder created
- Needs implementation for:
  - Data import/upload
  - Performance charts
  - Demographic visualizations

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

### Stage 2: Competitor Analysis Prompt 🚧
```typescript
const competitorAnalysisPrompt = `
Analyze the competitor data and provide:

1. For each competitor, identify:
   - Similarities to our product
   - Key differences
   - Opportunities (gaps, complaints)
   - Format strategies
   - Creator approaches

2. Answer these questions:
   - Is our product better quality? Why?
   - What makes us the best choice?
   - What can we learn from their evolution?

Format as structured JSON.
`;
```

## Implementation Timeline

### Week 1: Database & API Foundation ✅
- Created migrations
- Built core API endpoints for Stage 1
- Set up data models

### Week 2: AI Integration ✅
- Implemented Gemini prompts for Stage 1
- Built context processing
- Created auto-population logic

### Week 3: UI Components 🚧
- Built audience research panel ✅
- Create competitor table (in progress)
- Implement CRUD operations

### Week 4: Advanced Features
- Add ad audit dashboard
- Build creative brainstorm
- Implement export/import

### Week 5: Polish & Testing
- Add loading states
- Implement error handling
- Create user guides

## Next Steps

1. ~~Start with database migration~~ ✅
2. ~~Build API endpoints for Stage 1~~ ✅
3. ~~Create UI components incrementally~~ 🚧
4. Test AI prompts with real data
5. Iterate based on user feedback 