# Creative Brainstorm Fixes & Enhancements

## Issues to Address

### 1. Ad Selector Modal Issues
- [ ] Ad name showing ID/number instead of actual ad name
- [ ] Image/video previews from Supabase not displaying
- [ ] Cannot scroll right on the table (horizontal scroll issue)

### 2. Concept Builder Modal Issues
- [ ] Dropdowns not pulling options from ad audit settings (angle, emotion, framework, awareness level, type, format, content variables)
- [ ] Persona field should pull from audience research tab instead of being a text input

### 3. Split Generation API Structure
- [ ] Create separate prompts/system instructions for each prompt type:
  - [ ] Net New Concepts
  - [ ] Iterations
  - [ ] Hooks (Visual & Audio)
  - [ ] Visuals
  - [ ] Best Practices
- [ ] For Gemini: Add response schema for each type
- [ ] For Claude: Include response structure in system instructions/prompt
- [ ] Create migration for new database fields
- [ ] Update existing brands with defaults
- [ ] Set defaults for future brands

### 4. Progress Tracker for Generation
- [ ] Add progress tracking UI component
- [ ] Link to server-side checkpoints
- [ ] Show real-time status updates during generation
- [ ] Display which prompt type is currently being processed

## Implementation Progress

### Phase 1: Fix Ad Selector Modal
**Status: Partially Complete**
- [x] Fixed ad name display (was showing ID, now shows adName)
- [x] Added image/video preview functionality with hover-to-play for videos
- [x] Fixed horizontal scroll issue by adding `display: block` to table wrapper
- [x] Added preview styles (60x60px thumbnails with rounded corners)
- [ ] Need to verify asset URLs are being loaded from database

### Phase 2: Fix Concept Builder
**Status: In Progress**
- [x] Changed persona field to dropdown pulling from audience research
- [x] Added audience research data fetching
- [x] Added debug logging for AI instructions
- [ ] Need to investigate why analysis_fields dropdowns are empty
- [ ] Need to ensure AI instructions are properly loaded before opening dialog

### Phase 3: Database Schema Updates
**Status: Complete**
- [x] Created migration for separate prompts/system instructions for each type
- [x] Added fields for both Gemini (with response schemas) and Claude models
- [x] Set default values for all fields
- [x] Migration includes proper defaults for existing brands

### Phase 4: Progress Tracker
**Status: Complete**
- [x] Created GenerationProgressTracker component
- [x] Added progress tracking state to main component
- [x] Integrated progress updates in handleGenerate function
- [x] Shows real-time status for each generation step
- [x] Displays errors if any step fails
- [x] Auto-clears progress after completion 