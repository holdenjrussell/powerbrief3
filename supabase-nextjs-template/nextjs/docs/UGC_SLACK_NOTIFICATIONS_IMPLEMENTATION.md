# UGC Pipeline Slack Notifications Implementation Guide

## Overview
Implementing Slack notifications for UGC (User Generated Content) creator pipeline events, providing real-time updates on script status, creator assignments, and content submissions.

## Implementation Progress

### Phase 1: Database Schema ✅ COMPLETED
- [x] Create migration for new columns
  - [x] `ugc_slack_channel` (text)
  - [x] `ugc_slack_notifications_enabled` (boolean)
  - [x] Script revision tracking columns
  - [x] Content revision tracking columns
- [x] Created migration file: `20250203000000_add_ugc_slack_notifications.sql`
- **Note**: Migration ready but not yet run by user

### Phase 2: Slack Service Implementation ✅ COMPLETED
- [x] Created UGC Slack Service using standalone functions pattern
- [x] Implemented all 8 notification methods
- [x] Added channel configuration logic
- [x] Added test notification method
- **Note**: Type errors expected until migration is run (columns don't exist yet)

### Phase 3: API Endpoint Integration 🚧 IN PROGRESS
- [ ] Update script status endpoints to trigger notifications
- [ ] Update creator assignment endpoints
- [ ] Update content submission endpoints
- [ ] Add test endpoint for settings page

### Phase 4: Frontend UI Updates 🚧 TODO
- [ ] Add UGC Slack channel configuration to brand settings
- [ ] Add enable/disable toggle for UGC notifications
- [ ] Add test notification button

### Phase 5: Frontend Component Updates 🚧 TODO
- [ ] Add revision tags to script cards
- [ ] Add resubmission tags to content cards
- [ ] Update status displays with revision counts

## Detailed Implementation Steps

### 1. Database Migration

```sql
-- Add UGC Slack channel configuration to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS ugc_slack_channel TEXT;

-- Add revision tracking to scripts
ALTER TABLE ugc_creator_scripts
ADD COLUMN IF NOT EXISTS has_revisions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_revision_at TIMESTAMPTZ;

-- Add resubmission tracking for content
ALTER TABLE ugc_creator_scripts
ADD COLUMN IF NOT EXISTS content_resubmitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_revision_count INTEGER DEFAULT 0;
```

### 2. Notification Types

#### 2.1 Script Approved
**Event**: Script status changes to "approved"
**Content**:
- Title: "UGC Pipeline: Script Approved ✅"
- Script title
- Public share link
- Dashboard link

#### 2.2 Script Revisions Requested
**Event**: Script status changes to "revision requested"
**Content**:
- Title: "UGC Pipeline: Revisions Requested 📝"
- Script title
- Revision notes/feedback
- Public share link
- Script editor link

#### 2.3 Script Revision Submitted
**Event**: Script updated after revision request
**Content**:
- Title: "UGC Pipeline: Revision Submitted 🔄"
- Script title
- Public share link
- Script editor link

#### 2.4 Creator Assigned
**Event**: Creator assigned to script
**Content**:
- Title: "UGC Pipeline: Creator Assigned 👤"
- Script title
- Creator name
- Public share link
- Dashboard link

#### 2.5 Creator Response
**Event**: Creator approves/rejects script
**Content**:
- Title: "UGC Pipeline: Creator [Approved/Rejected] Script"
- Script title
- Creator name
- Response status

#### 2.6 Content Submitted
**Event**: Creator submits content
**Content**:
- Title: "UGC Pipeline: Content Submitted 🎬"
- Script title
- Content link
- Approval dashboard link

#### 2.7 Content Revisions Requested
**Event**: Content revision requested
**Content**:
- Title: "UGC Pipeline: Content Revisions Requested 📝"
- Script title
- Revision feedback
- Public share link
- Creator dashboard link

#### 2.8 Content Revision Submitted
**Event**: Content resubmitted after revision
**Content**:
- Title: "UGC Pipeline: Content Revision Submitted 🔄"
- Script title
- Content link
- Approval dashboard link

### 3. Service Implementation

```typescript
class UgcSlackService extends SlackService {
  async sendScriptApprovedNotification(script, publicShareLink, dashboardLink)
  async sendScriptRevisionRequestedNotification(script, feedback, publicShareLink, editorLink)
  async sendScriptRevisionSubmittedNotification(script, publicShareLink, editorLink)
  async sendCreatorAssignedNotification(script, creator, publicShareLink, dashboardLink)
  async sendCreatorResponseNotification(script, creator, response)
  async sendContentSubmittedNotification(script, contentLink, approvalLink)
  async sendContentRevisionRequestedNotification(script, feedback, publicShareLink, creatorDashLink)
  async sendContentRevisionSubmittedNotification(script, contentLink, approvalLink)
}
```

### 4. Frontend Components to Update

- Brand Settings: Add Slack channel configuration field
- Script Cards: Add revision indicator badge
- Content Cards: Add resubmission indicator badge

### 5. Configuration UI

Add to brand settings:
- UGC Slack Channel field
- Test notification button
- Enable/disable notifications toggle

## Progress Tracking

### Completed:
- [x] Created implementation guide

### In Progress:
- [ ] Working on database migration

### Next Steps:
1. Create database migration
2. Update TypeScript types
3. Implement UgcSlackService
4. Update API endpoints
5. Update frontend components