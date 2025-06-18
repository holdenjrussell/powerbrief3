# OneSheet Application Revamp - Implementation Guide

## Overview
This guide tracks the progressive implementation of the OneSheet application revamp, transforming it from a URL-dependent system to a comprehensive context-driven research platform with manual entry capabilities.

## Implementation Progress

### Phase 1: Database Schema Updates ✅ **COMPLETED**

- [x] Create `onesheet_context_data` table
  - [x] Fields: id, onesheet_id, source_type, source_name, source_url, content_text, extracted_data, metadata, is_active, timestamps
  - [x] RLS policies for brand-based access control
  - [x] Indexes for performance optimization
  - [x] Foreign key relationships to onesheet table

- [x] Enhance `onesheet` table with new columns
  - [x] `manual_entries` (JSONB) - Store user-entered data alongside AI
  - [x] `creative_outputs` (JSONB) - Final outputs in 4-part structure
  - [x] `context_loaded` (JSONB) - Track completion status per source type
  - [x] `workflow_stage` (TEXT) - Track current workflow position
  - [x] `last_context_update` (TIMESTAMP) - Track when context was last modified

- [x] Update TypeScript interfaces
  - [x] Enhanced `OneSheet` interface with new fields
  - [x] New `ContextData` interface for context storage
  - [x] `ManualEntryData` interface for user inputs
  - [x] `CreativeOutput` interface for final results

- [x] Apply database migration and regenerate types

**Migration Applied**: `20250617090000_onesheet_revamp_schema.sql` ✅
**TypeScript Types Updated**: All new tables and columns included ✅

### Phase 2: Context Hub Implementation ✅ **COMPLETED**

- [x] Create `ContextHub.tsx` component with tabbed interface
  - [x] 8 source types: brand_website, brand_social, competitor_website, competitor_ads, reviews, reddit, articles, tiktok/youtube
  - [x] Progress tracking with completion percentage
  - [x] Required vs optional source indicators
  - [x] Visual feedback for completed sources

- [x] Create `ContextLoader.tsx` component with dual modes
  - [x] URL input mode with automatic extraction
  - [x] Text paste mode for manual entry
  - [x] Character/word count tracking
  - [x] Auto-save functionality

- [x] Integrate ContextHub into workflow
  - [x] Shows when workflow_stage is 'context_loading'
  - [x] Users must complete required context before proceeding

- [x] Create `/api/onesheet/context` endpoint
  - [x] GET: Fetch context data for onesheet
  - [x] POST: Create/update context entries
  - [x] DELETE: Soft delete context entries
  - [x] Proper authentication and validation

### Phase 3: Web Scraping Integration ✅ **COMPLETED**

- [x] Install and configure Crawlee web scraping library
  - [x] Crawlee with Playwright for robust web scraping
  - [x] Puppeteer integration for browser automation
  - [x] Support for headless and headful modes

- [x] Create `/api/onesheet/extract` endpoint
  - [x] Automatic content extraction from URLs
  - [x] **Link crawling capability** - discovers and scrapes additional pages
  - [x] Smart content selection using multiple CSS selectors
  - [x] **Gemini AI integration** for markdown conversion
  - [x] Same-domain crawling restrictions for safety
  - [x] Configurable max pages (1-10 pages)

- [x] Create `/api/onesheet/analyze-video` endpoint
  - [x] TikTok and YouTube video analysis
  - [x] Comprehensive video content analysis framework
  - [x] Fallback templates for manual analysis

- [x] Enhanced ContextLoader with extraction features
  - [x] **Website scraping** with optional link crawling
  - [x] **Multi-page extraction** with progress indicators
  - [x] **Crawl settings** - checkbox to enable link crawling
  - [x] **Max pages selector** - limit crawling scope
  - [x] Real-time extraction status and results preview
  - [x] Edit capability for extracted content
  - [x] Visual indicators for extraction success

**Key Features Implemented:**
- **Intelligent Content Extraction**: Uses multiple CSS selectors to find main content
- **Link Discovery**: Automatically finds and crawls related pages on the same domain
- **AI-Powered Markdown Conversion**: Gemini converts raw content to clean, structured markdown
- **Safety Controls**: Domain restrictions and page limits prevent excessive crawling
- **User Control**: Optional link crawling with configurable limits (1-10 pages)
- **Rich Preview**: Shows extracted content with page count indicators
- **Fallback Support**: Manual editing when automatic extraction fails

### Phase 4: Enhanced AI Integration (85% Complete)

### Key Improvements

#### 1. Context Loading System
- [ ] Create a dedicated "Context Hub" for users to load and manage reusable context
- [ ] Support both URL input and text pasting for all sources
- [ ] Integrate with AdRipper for extracting content from competitor ads
- [ ] Add Gemini video analysis for competitor content

#### 2. Enhanced UI/UX
- [ ] Create clear visual outputs for all AI-generated content
- [ ] Add manual entry fields alongside AI outputs
- [ ] Implement a guided workflow with clear steps
- [ ] Add progress tracking and visual indicators

#### 3. Data Storage & Management
- [ ] Update database schema to store all context data
- [ ] Add fields for manual entries alongside AI-generated content
- [ ] Implement proper data persistence for all sections

#### 4. Creative Output Enhancement
- [ ] Restructure final output into 4 sections: Image Concepts, Video Concepts, Hooks (by angle), Visuals (by angle)
- [ ] Add export capabilities for creative briefs

## Implementation Checklist

### Phase 2: Context Hub Implementation ✅ IN PROGRESS
- [x] Create ContextHub component with tabs for different sources
- [x] Implement URL input with preview functionality
- [x] Add text paste areas with character counters
- [x] Create guided instructions for each source type
- [ ] Integrate AdRipper API for competitor content extraction
- [ ] Add Gemini video analysis integration

### Phase 3: Enhanced AI Integration
- [x] Update prompts to use context data instead of URLs
- [x] Create new AI endpoints for each prompt type
- [ ] Add progress indicators for AI generation
- [ ] Implement error handling and retry logic
- [ ] Store all AI outputs with timestamps

### Phase 4: Manual Entry System
- [ ] Add manual input fields for all AI output sections
- [ ] Create toggle between AI and manual modes
- [ ] Implement auto-save for manual entries
- [ ] Add validation for manual inputs

### Phase 5: UI/UX Improvements
- [ ] Create visual cards for displaying insights
- [ ] Add edit/delete functionality for all items
- [ ] Implement drag-and-drop for reordering
- [ ] Add filtering and search capabilities
- [ ] Create export functionality

### Phase 6: Creative Output Section
- [ ] Redesign creative generation section
- [ ] Implement 4-part output structure
- [ ] Add angle-based organization
- [ ] Create visual preview capabilities
- [ ] Add brief export functionality

## Technical Requirements

### New Components Created:
1. `ContextHub.tsx` - Central context management ✅
2. `ContextLoader.tsx` - Individual context loading interface ✅
3. `InsightCard.tsx` - Display for insights with edit capability
4. `CreativeOutput.tsx` - New creative generation interface
5. `ManualEntryForm.tsx` - Forms for manual data entry

### API Endpoints Created:
1. `/api/onesheet/context` - Context data management ✅
2. `/api/onesheet/extract` - AdRipper integration (pending)
3. `/api/onesheet/analyze-video` - Gemini video analysis (pending)
4. `/api/onesheet/ai/generate-enhanced` - Enhanced creative generation ✅

### Database Changes: ✅ COMPLETED
```sql
-- New context_data table
CREATE TABLE onesheet_context_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  onesheet_id UUID REFERENCES onesheets(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'brand_website', 'competitor_website', 'reddit', 'reviews', etc.
  source_url TEXT,
  content_text TEXT,
  extracted_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update onesheets table
ALTER TABLE onesheets ADD COLUMN manual_entries JSONB DEFAULT '{}';
ALTER TABLE onesheets ADD COLUMN creative_outputs JSONB DEFAULT '{}';
ALTER TABLE onesheets ADD COLUMN context_loaded JSONB DEFAULT '{}';
ALTER TABLE onesheets ADD COLUMN workflow_stage TEXT DEFAULT 'context_loading';
```

## Current Status: Phase 2 - Context Hub Implementation

## Completed Today:
1. ✅ Database schema created with migration
2. ✅ ContextHub component with tabbed interface
3. ✅ ContextLoader component with URL/text input modes
4. ✅ Context API endpoint for CRUD operations
5. ✅ Enhanced AI generation endpoint using context data
6. ✅ Integration of ContextHub into HybridOneSheet workflow
7. ✅ Progress tracking and completion indicators

## Next Steps:
1. ~~Review and approve implementation plan~~
2. ~~Begin with Phase 1: Database Schema Updates~~
3. Complete Context Hub AdRipper and video analysis integration
4. Begin Phase 4: Manual Entry System

## Notes:
- All AI outputs will have corresponding manual entry options
- Context loaded once can be reused across all prompts
- Integration with existing AdRipper tool for competitor analysis
- Focus on guided UX to help users through the research process 