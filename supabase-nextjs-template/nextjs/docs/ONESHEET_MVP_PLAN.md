# OneSheet MVP Development Plan

## Overview

This document outlines a phased approach to evolving the current OneSheet proof-of-concept into a Minimum Viable Product (MVP) that fully supports the "Strategic Creative Feedback Loop System" as described by Alex Cooper.

The current implementation has a strong AI foundation with `onesheetAIService.ts`, capable of advanced qualitative analysis. The goal now is to build the user interface, data models, and workflows around this service to create an intuitive, end-to-end system for creative strategy.

## Phase 0: Technical Housekeeping & Type Safety

Before adding new features, we must address the technical debt in the existing AI service to ensure a stable foundation.

- [X] **Fix Linter Errors:** Resolve all `any` type errors in `supabase-nextjs-template/nextjs/src/lib/services/onesheetAIService.ts`. (Completed)
- [X] **Create TypeScript Interfaces:** Define strong types and interfaces for all AI-generated and parsed objects (e.g., `AdAngle`, `Persona`, `Headline`, `MidjourneyIdea`). (Completed)

## Phase 1: Foundational UI & Qualitative Research Hub

**Goal:** Establish the core OneSheet interface and empower users to input, analyze, and store all their qualitative research in one place.

- [ ] **Create the OneSheet Main Page:**
    - [ ] Build the main page layout at `/app/powerbrief/[brandId]/onesheet/[onesheetId]`.
    - [ ] Implement a navigation structure that mirrors the four key sections: Audience Research, Competitor Analysis, Ad Account Audit, and Creative Brainstorm. A tabbed interface would be suitable.

- [ ] **Develop the "Audience Research" Section:**
    - [ ] Create a UI for users to input foundational data like Product Name and Website URL.
    - [ ] Build a text area component for users to paste raw data (e.g., Customer Reviews, Survey Responses, Support Tickets).
    - [ ] Integrate the existing `onesheetAIService.ts` functions (`adAngles`, `benefits`, `painPoints`, `onesheetFillout`, `generatePersonas`, `reviewPatterns`).
    - [ ] Design and build UI components to display the structured AI analysis results in a clean, readable format (e.g., cards for each Persona, a list of Ad Angles).

- [ ] **Implement Persistence:**
    - [ ] Enhance the `onesheets` table schema to store both the raw qualitative input and the structured AI-generated data. Consider using JSONB columns for flexibility.
    - [ ] Ensure all data entered and generated in this phase is saved to the database and reloaded when the user returns.

## Phase 2: Competitor & Market Analysis

**Goal:** Integrate competitor and social listening tools to provide a comprehensive market view.

- [ ] **Build "Competitor Analysis" Section:**
    - [ ] Create a UI to add and manage a list of competitors (Name and Website URL).
    - [ ] Integrate the `competitorGapAnalysis` and `competitorComparison` AI functions.
    - [ ] Display the analysis in a comparative format, highlighting key feature gaps and positioning opportunities.

- [ ] **Build "Social Listening" Section:**
    - [ ] Create a UI for users to paste content from external sources like Reddit threads or articles.
    - [ ] Integrate the `redditAnalysis` and `articleAnalysis` AI functions.
    - [ ] Extract and display key phrases, sentiment, and customer language in a categorized view.
    - [ ] Persist all competitor data and analysis results to the database.

## Phase 3: Quantitative Research (The Ad Account Audit)

### Implementation Checklist

- [X] **Part 1: Understand Core Purpose**: Align implementation with the goal of answering "what worked and why?" through tag-based analysis.
- [X] **Part 2: Implement UI/UX**:
    - [X] Build date range selector and "Sync" button.
    - [X] Design and implement clear loading/processing states (3 steps).
    - [X] Create the interactive spreadsheet view (Airtable-like).
    - [X] Add sorting, filtering, playable video thumbnails, and an "Analyze Ad" button per row.
- [ ] **Part 3: Build Backend Workflow**:
    - [X] Implement Meta Ads API integration for initial data pull (metadata only).
    - [ ] Handle API pagination correctly.
    - [X] Map all specified data fields from the API to the database.
    - [ ] Set up asynchronous job for video handling (download from Meta, upload to Supabase Storage).
    - [ ] Integrate transcription service (e.g., Whisper API).
- [ ] **Part 4: Implement AI Analysis Layer**:
    - [ ] Use the master tagging prompt with `gemini-2.0-flash-thinking-exp`.
    - [ ] Ensure consistent JSON output by setting temperature and top_p to 0.0 and using `response_mime_type`.
    - [ ] Parse AI response and populate tags in the database.
- [ ] **Part 5: Optimize for Vercel Serverless**:
    - [X] Architect the entire process as an asynchronous, job-queued workflow.
    - [X] Use Supabase Database Triggers + Edge Functions or an external queue (Inngest/Upstash) for background jobs.
    - [X] Implement a client-side polling mechanism for status updates.

### Detailed Implementation Plan

#### Part 1: The Core Purpose of the Ad Account Audit
In Alex Cooper's system, this stage is about answering one critical question: "Of all the creative ideas we launched, what actually worked and why?" It bridges the gap between the art of creative strategy (the qualitative insights from Sections 1 & 2) and the science of media buying (the hard data).
The goal is to move beyond surface-level metrics (like a single campaign's ROAS) and into a granular, tag-based analysis to identify winning patterns in:
*   **Angles:** Does the "convenience" angle outperform the "health boost" angle?
*   **Formats:** Do testimonials have a better hold rate than simple UGC?
*   **Frameworks:** Does the "Problem, Agitate, Solve" (PAS) framework lead to a lower CPA?
*   **Emotions:** Do ads that evoke "Curiosity" have a higher hook rate than those that evoke "Fear"?
Your implementation should be designed to answer these questions effortlessly.

#### Part 2: UI/UX Implementation in the "OneSheet"
The user experience should feel seamless and powerful. Since the user has already linked their Meta Ad Account in the "Brand Config" section, the heavy lifting of authentication is done.

**The Initial Sync Interface:**
When the user navigates to the "Ad Account Audit" tab within their OneSheet, they are presented with a clean interface:
*   **Date Range Selector:** A simple dropdown with presets: "Last 30 Days," "Last 90 Days," "Last 6 Months," "All Time," and a "Custom Range" option.
*   **The Sync Button:** A single, prominent button labeled `Sync & Analyze Ad Data`.

**The Loading & Processing State:**
Upon clicking the button, the UI should provide clear feedback. This is a crucial trust-building step as the process can take time.
*   A progress indicator appears: "Step 1 of 3: Syncing with Meta Ads... Fetched 254 ads."
*   Followed by: "Step 2 of 3: Downloading video assets to your secure storage..."
*   And finally: "Step 3 of 3: Analyzing and transcribing ads with AI..."

**The Completed State: The Live, Interactive Spreadsheet**
Once the process is complete, the tab transforms into an embedded, interactive spreadsheet that looks and feels like a modern tool (think Airtable or the sheet in the video).
*   **The Table:** The core of the view, pre-populated with all the ad data.
*   **Sorting & Filtering:** Every column header is clickable to allow for easy sorting (e.g., sort by "Spend" descending). A filter icon allows for complex queries (e.g., Type IS Static AND Angle IS Weight Management).
*   **Playable Video Thumbnails:** The "Ad" column doesn't just show an ID. It displays a thumbnail of the ad creative. Clicking it opens a modal window with the video player.
*   **The "Analyze" Button:** This is the key to automating the workflow. For each ad row, there is a button (e.g., an icon of a brain or a magic wand) labeled `Analyze Ad`.

#### Part 3: Technical Implementation & Backend Workflow
This is the engine under the hood. The process is a chained sequence of API calls and data processing jobs.

**A. Meta Ads API Integration & Data Pull**
*   **Authentication:** Your backend uses the stored OAuth 2.0 token from the "Brand Config" to make authenticated requests to the Meta Graph API.
*   **API Endpoints:**
    *   You'll primarily hit the `/act_{ad-account-id}/ads` endpoint.
    *   You need to specify the fields you want to retrieve in your request. This is critical for efficiency.
    *   You'll need to pull related data by specifying nested fields, such as `ad_creative{video_id, image_url, thumbnail_url, body}`, `insights{spend, cpa, ctr, inline_link_clicks}`, and potentially data from the adset and campaign levels if needed.
*   **Handling Pagination:** The API will return a limited number of results per page. Your code must check for a `paging.next` URL in the response and recursively call it until all ads within the selected date range are fetched.

**B. Data Fields to Pull & Replicate**
Based on the video, you will structure your spreadsheet with the following columns. They are color-coded here as they are in the video to signify their data source.

| Column | Data Source | Meta API Field / Calculation / Entry |
| :--- | :--- | :--- |
| URL (Ad Link) | 🟪 Manual/AI | Can be constructed: `https://facebook.com/ads/library/?id={ad_id}` |
| Ad (Creative) | 🟧 Ad Account | `ad_creative{thumbnail_url}` and `ad_creative{video_id}` |
| Landing Page | 🟧 Ad Account | `ad_creative{effective_object_story_spec.link_data.link}` |
| Spend | 🟧 Ad Account | `insights.spend` |
| CPA | 🟧 Ad Account | `insights.cost_per_action_type` (for the primary conversion event) |
| Hook Rate | 🟨 Formula | (`insights.video_3_second_watched_actions` / `insights.impressions`) * 100 |
| Hold Rate | 🟨 Formula | (`insights.video_p100_watched_actions` / `insights.impressions`) * 100 |
| Type | 🟪 AI Entry | Tagged by AI (High Production, Low Production, Static, GIF, Carousel) |
| Ad Duration (s) | 🟧 Ad Account | `ad_creative{video_data.video_length}` |
| Product Intro (s) | 🟪 AI Entry | Tagged by AI after analyzing transcript |
| Sit in Problem (%)| 🟨 Formula | (Product Intro Time / Ad Duration) * 100 |
| Creators Used | 🟪 AI Entry | Tagged by AI (e.g., number of speakers in the video) |
| Angle | 🟪 AI Entry | Tagged by AI (Health Boost, Convenience, etc.) |
| Format | 🟪 AI Entry | Tagged by AI (Testimonial, Podcast, 3 Reasons Why, etc.) |
| Emotion | 🟪 AI Entry | Tagged by AI (Happiness, Fear, Curiosity, Urgency, etc.) |
| Framework | 🟪 AI Entry | Tagged by AI (PAS, AIDA, QUEST, etc.) |
| Transcription | 🟪 AI Entry | Generated by Transcription API |

**C. Video Handling and Transcription via Supabase & AI**
This workflow is triggered when the user clicks the `Analyze Ad` button for a specific row.
*   **Trigger a Backend Job:** Clicking the button initiates a serverless function (e.g., Supabase Edge Function).
*   **Fetch Video URL:** The function retrieves the `video_id` from the ad data. It makes a call to the Meta Graph API for the `/{video_id}` endpoint, requesting the `source` field, which provides a temporary downloadable URL for the video file.
*   **Download and Store in Supabase:**
    *   The serverless function downloads the video from Meta's CDN.
    *   It then uploads this video file directly to a designated bucket in Supabase Storage.
    *   The public URL of the video in your Supabase bucket is then saved in your application's database, associated with that ad. This prevents having to re-download it every time.
*   **Transcription and Description Generation:**
    *   The function takes the video file (now in Supabase Storage) and sends it to a speech-to-text API. OpenAI's Whisper API is an excellent, cost-effective, and highly accurate choice for this.
    *   The Whisper API returns a full text transcription.
    *   This transcript is then saved to the "Transcription" column in your database for that ad.
    *   Simultaneously, you can feed the transcript to a powerful LLM like Gemini 2.5 flash with a prompt: `"Based on the following ad transcript, please provide a concise summary of the video's description and key visual elements."` This fills the "Description" field.

#### Part 4: The AI-Powered Analysis Layer (Automated Tagging)
This is the final step that brings it all together and makes the data truly strategic. After transcription, the AI performs the classification.

**The Master Tagging Prompt:** A serverless function is triggered again. It takes the ad's transcript and feeds it to your LLM with a detailed, structured prompt.

*Example Master Prompt:*
```
Analyze the following ad transcript. Based on the content, classify the ad across these five categories: [Angle, Format, Emotion, Framework, Product Intro].
Return your answer ONLY in a valid JSON format.
Here are the possible values for each category:
"Angle": ["Health Boost", "Time/Convenience", "Energy/Focus", "Immunity Support", "Digestive Health", "Weight Management"]
"Format": ["Testimonial", "Podcast", "Authority Figure", "3 Reasons Why", "UGC Review"]
"Emotion": ["Happiness", "Excitement", "Hopefulness", "Curiosity", "Urgency", "Fear", "Anxiety", "Trust"]
"Framework": ["PAS (Problem, Agitate, Solve)", "AIDA (Attention, Interest, Desire, Action)", "Features, Advantages, Benefits (FAB)", "Star, Story, Solution"]
"Product Intro (s)": [Provide an integer representing the timestamp in seconds when the product is first mentioned or shown clearly.]

Here is the ad transcript:
"[PASTE FULL TRANSCRIPTION HERE]"
```

**Data Population:** Your backend parses the JSON response from the AI and populates the Angle, Format, Emotion, Framework, and Product Intro columns in the spreadsheet for that ad.

#### Part 5: Vercel Serverless Optimization Strategy (Addressing 800s Max Runtime)
The 800-second maximum runtime for a single execution implies a need for asynchronous processing and job queuing.

**Core Principle:** Break down the monolithic task into smaller, independent, and asynchronously executable jobs.

**Recommended Architecture:**
1.  **Initial Sync API Endpoint (`/api/sync-ads`):**
    *   **Trigger:** User clicks "Sync & Analyze Ad Data".
    *   **Function:** Fetches only the initial metadata from Meta, stores it in Supabase with a `pending_processing` status, and returns a `job_id` to the client. For each ad, it queues up an individual processing job.
2.  **Individual Ad Processing Endpoint/Job (`/api/process-ad` or Supabase Edge Function):**
    *   **Trigger:** Called asynchronously for each ad.
    *   **Function:** Processes a single `ad_id`: fetches the video source, downloads to `/tmp`, uploads to Supabase Storage, transcribes with Whisper, gets tags from Gemini, and updates the ad's record in the database.
3.  **Background Job Handling (Supabase Triggers & Edge Functions Recommended):**
    *   A PostgreSQL trigger on the `ads` table (on new row with `pending` status) calls a Supabase Edge Function.
    *   The Edge Function acts as the worker, performing the heavy lifting for one ad.
4.  **Client-Side Status Updates:**
    *   **Polling:** After the initial sync, the frontend polls a status endpoint (`/api/sync-status?job_id={job_id}`).
    *   **Status Endpoint:** This endpoint queries the database to get a count of `pending`, `processing`, `completed`, and `failed` jobs.
    *   **UI Updates:** The UI progress bars and messages are updated based on the polled counts until all jobs are complete.

This asynchronous approach effectively bypasses serverless execution limits by distributing the workload into many smaller, independent, and potentially parallelizable tasks.

### Phase 3 Implementation Summary

**Completed Components:**

1. **UI/UX Implementation:**
   - ✅ Enhanced performance tab in HybridOneSheet component with date range selector and sync button
   - ✅ Created AdPerformanceTable component with interactive spreadsheet features:
     - Sortable columns for all metrics
     - Filterable by angle and format
     - Search functionality
     - Individual "Analyze Ad" buttons
     - Visual indicators for performance thresholds

2. **Backend Infrastructure:**
   - ✅ Created `/api/onesheet/sync-ads` endpoint for initiating Meta ads sync
   - ✅ Created `/api/onesheet/sync-status` endpoint for checking job progress
   - ✅ Created `/api/onesheet/analyze-ad` endpoint for AI tagging
   - ✅ Database migration for `onesheet_sync_jobs` table with proper indexes and RLS

3. **Data Flow Architecture:**
   - ✅ Asynchronous job system with status tracking
   - ✅ Meta API integration for fetching ad data with insights
   - ✅ Automatic metric calculations (CPA, Hook Rate, Hold Rate)
   - ✅ AI analysis integration using Gemini 2.0 Flash with structured JSON output

**Remaining Tasks:**
- API pagination handling for large ad accounts
- Video download and storage in Supabase
- Whisper API integration for transcription
- Production-ready background job processing (Supabase Edge Functions or external queue)

The foundation is now in place for a fully functional ad account audit system that can sync Meta ads data, display it in an interactive table, and analyze ads with AI to identify winning patterns.

## Phase 4: Creative Brainstorm & Hypothesis Hub

**Goal:** Bridge the gap between research and execution by providing tools to brainstorm ideas and formulate testable hypotheses.

- [ ] **Build the "Creative Brainstorm" Section:**
    - [ ] Create dedicated spaces to generate and store lists of:
        - **Concepts:** High-level ideas inspired by research.
        - **Hooks:** Specific, attention-grabbing lines.
        - **Visuals:** Ideas for imagery or video.
    - [ ] Integrate the `testimonialHeadlines`, `oneLiners`, and `midjourneyIdeas` AI functions, allowing users to generate ideas directly from their qualitative data.

- [ ] **Develop the Hypothesis Hub:**
    - [ ] Create a distinct UI component for creating a "Testable Hypothesis."
    - [ ] A hypothesis should formally link different data points:
        - **Qualitative Insight:** (e.g., "From Reddit Analysis: Users complain competitor X is too expensive.")
        - **Quantitative Insight:** (e.g., "From Ad Account Audit: The 'Value for Money' angle has our lowest CPA.")
        - **Proposed Concept:** (e.g., "Create a UGC video directly comparing our monthly cost to competitor X.")
    - [ ] Implement status tracking for each hypothesis (e.g., `Backlog`, `Testing`, `Validated`, `Invalidated`).

## Phase 5: Closing the Loop (Integration & Iteration)

**Goal:** Ensure that learnings are not lost but are formally integrated back into the OneSheet, making it a "living" document that gets smarter over time.

- [ ] **Create an "Insights" or "Key Learnings" Section:**
    - [ ] Add a dedicated, highly visible section to the OneSheet for summarizing validated learnings.
- [ ] **Formalize the Integration Workflow:**
    - [ ] When a user marks a hypothesis as "Validated" or "Invalidated," prompt them to write a brief summary of the key takeaway.
    - [ ] This new insight should be stored and displayed in the "Key Learnings" section.
- [ ] **Link Insights Back to Research:**
    - [ ] Tag or link these key learnings back to the source sections. For example, a learning about price sensitivity could be displayed as a note within the "Audience Personas" and "Competitor Analysis" sections. This ensures that the next person starting a research cycle begins with the most up-to-date, data-backed information. 