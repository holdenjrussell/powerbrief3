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

### Phase 3: API Endpoint Integration ✅ COMPLETED
- [x] Updated script status endpoints to trigger notifications
  - [x] Script approval notifications
  - [x] Revision request notifications
  - [x] Revision submission notifications
  - [x] Creator response notifications
  - [x] Content revision notifications
- [x] Updated creator assignment endpoints
- [x] Updated content submission endpoints
- [x] Added test endpoint for settings page (`/api/ugc/slack-test`)

### Phase 4: Frontend UI Updates ✅ COMPLETED
- [x] Added UGC Slack channel configuration to brand settings
- [x] Added enable/disable toggle for UGC notifications
- [x] Added test notification button
- [x] Updated SlackIntegrationCard component
- [x] Updated save-settings API to handle UGC fields

### Phase 5: Frontend Component Updates ✅ COMPLETED
- [x] Added revision tags to script cards
- [x] Added resubmission tags to content cards
- [x] Updated status displays with revision counts

## Notification Types Implemented

1. **Script Approved** (`sendUGCScriptApprovedNotification`)
   - Triggered when script status changes to `APPROVED`
   - Includes available creator count
   - Links to public share and dashboard

2. **Script Revision Requested** (`sendUGCScriptRevisionNotification`)
   - Triggered when status changes to `REVISION_REQUESTED`
   - Includes feedback/revision notes
   - Links to script editor

3. **Script Revision Submitted** (`sendUGCScriptRevisionSubmittedNotification`)
   - Triggered when status changes from `REVISION_REQUESTED` to `PENDING_APPROVAL`
   - Shows revision count
   - Links to review dashboard

4. **Creator Assigned** (`sendUGCCreatorAssignedNotification`)
   - Triggered in creator assignment endpoint
   - Includes creator details and contract status
   - Links to dashboard

5. **Creator Response** (`sendUGCScriptResponseNotification`)
   - Triggered for both approval (`CREATOR_APPROVED`) and rejection (`CREATOR_REASSIGNMENT`)
   - Includes creator feedback if rejected
   - Links to dashboard

6. **Content Submitted** (`sendUGCContentSubmittedNotification`)
   - Triggered when content is submitted
   - Includes content links
   - Links to approval dashboard

7. **Content Revision Requested** (`sendUGCContentRevisionNotification`)
   - Triggered when status changes to `CONTENT_REVISION_REQUESTED`
   - Includes revision feedback
   - Links to creator dashboard

8. **Content Revision Submitted** (`sendUGCContentRevisionSubmittedNotification`)
   - Triggered when content is resubmitted after revision
   - Shows resubmission count
   - Links to approval dashboard

## Files Created/Modified

### Created:
- `/workspace/supabase-nextjs-template/supabase/migrations/20250203000000_add_ugc_slack_notifications.sql`
- `/workspace/supabase-nextjs-template/nextjs/src/lib/services/ugcSlackService.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/ugc/slack-test/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/docs/UGC_SLACK_NOTIFICATIONS_IMPLEMENTATION.md`

### Modified:
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/ugc/scripts/[scriptId]/status/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/ugc/scripts/[scriptId]/assign/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/ugc/scripts/[scriptId]/submit-content/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/ugc/scripts/[scriptId]/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/components/SlackIntegrationCard.tsx`
- `/workspace/supabase-nextjs-template/nextjs/src/app/api/slack/save-settings/route.ts`
- `/workspace/supabase-nextjs-template/nextjs/src/components/ugc-creator/ScriptCard.tsx`

## Next Steps for User

1. **Run the database migration**:
   ```bash
   cd supabase-nextjs-template
   npx supabase db push
   ```

2. **Regenerate TypeScript types**:
   ```bash
   npx supabase gen types typescript --local > nextjs/src/lib/database.types.ts
   ```

3. **Test the implementation**:
   - Configure UGC Slack settings in brand settings
   - Use the "Test UGC" button to verify webhook
   - Test each notification type through the UGC pipeline workflow

## Configuration

In the brand settings Slack integration:
1. Enable general Slack notifications
2. Configure UGC-specific channel (optional)
3. Enable UGC Pipeline notifications
4. Test using the "Test UGC" button

## Troubleshooting

- **Type errors in development**: Expected until migration is run
- **Notifications not sending**: Check that both general and UGC notifications are enabled
- **Wrong channel**: Verify UGC channel configuration, falls back to general channel if not set