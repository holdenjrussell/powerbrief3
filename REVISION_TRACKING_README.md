# Comment Revision Tracking System

## Overview
This system automatically tracks revision versions when concepts are resubmitted after requesting revisions. Comments are tagged with the revision version they were made on, and can be resolved/marked as prior comments.

## How It Works

### 1. Database Schema Changes
- Added `revision_count` to `brief_concepts` table (starts at 1)
- Added `revision_version`, `is_resolved`, `resolved_at`, `resolved_by` to `concept_comments` table
- Created database trigger that automatically increments `revision_count`

### 2. Automatic Revision Increment
The database trigger automatically increments the revision count when:
- A concept's `review_status` changes from `'needs_revisions'` OR `'needs_additional_sizes'`
- TO `'ready_for_review'`

This means:
1. Reviewer requests revisions → concept marked as `needs_revisions`
2. Editor resubmits → concept status changes to `ready_for_review` → **revision count automatically increments**
3. New comments will be tagged with the new revision version

### 3. Comment Features

#### Revision Badges
- Comments show revision badges (v1, v2, v3, etc.)
- Prior revision comments are highlighted with orange background
- Current revision comments have blue badges

#### Comment Resolution
- Concept owners can mark comments as resolved (green checkmark)
- Resolved comments can be collapsed under a "Resolved" section
- Resolution includes timestamp and who resolved it

#### Visual Indicators
- **Orange background**: Comments from prior revisions
- **Green background**: Resolved comments
- **Blue badge**: Current revision
- **Orange badge**: Prior revision

### 4. API Endpoints

#### Comment CRUD
- `GET /api/concept-comments?conceptId=xxx` - Fetch all comments for a concept
- `POST /api/concept-comments` - Add new comment (automatically gets current revision)
- `PUT /api/concept-comments` - Edit comment or mark as resolved
- `DELETE /api/concept-comments?commentId=xxx` - Delete comment

#### Revision Management
- `POST /api/concept-revision` - Manually increment revision count
- `POST /api/concept-resubmit` - Mark concept as resubmitted (triggers revision increment)

#### Comment Resolution
- `PUT /api/concept-comments/resolve` - Resolve/unresolve specific comments

### 5. UI Components

#### Enhanced Comment Modal
- Shows revision badges for each comment
- Allows resolving comments (for concept owners)
- Collapses resolved comments
- Highlights prior revision comments

#### Reviews Page Integration
- Shows comment counts on video thumbnails
- Displays current revision number
- Integrates with existing review workflow

## Testing the System

### Manual Test Flow
1. Create a concept and submit for review
2. Add some comments → should be tagged as v1
3. Request revisions from reviewer
4. Update concept status to `ready_for_review` (simulates editor resubmission)
5. Check that `revision_count` incremented to 2
6. Add new comments → should be tagged as v2
7. Previous comments should show as "Prior" with orange styling

### SQL Test Queries
```sql
-- Check revision count
SELECT id, concept_title, revision_count, review_status FROM brief_concepts WHERE id = 'concept-id';

-- Check comment revision tracking
SELECT id, comment_text, revision_version, is_resolved FROM concept_comments WHERE concept_id = 'concept-id' ORDER BY created_at;

-- Test trigger (should increment revision_count)
UPDATE brief_concepts SET review_status = 'ready_for_review' WHERE id = 'concept-id' AND review_status = 'needs_revisions';
```

## Deployment Notes

1. Run the migration: `20250122000000_add_comment_revision_tracking.sql`
2. The trigger will be automatically created
3. Existing concepts will have `revision_count = 1`
4. Existing comments will have `revision_version = 1`
5. The system works immediately for new revisions

## File Changes Made

### Database
- `supabase/migrations/20250122000000_add_comment_revision_tracking.sql`

### Types
- Updated `supabase-nextjs-template/nextjs/src/lib/types/supabase.ts`

### API Endpoints
- `supabase-nextjs-template/nextjs/src/app/api/concept-comments/route.ts` (enhanced)
- `supabase-nextjs-template/nextjs/src/app/api/concept-comments/resolve/route.ts` (new)
- `supabase-nextjs-template/nextjs/src/app/api/concept-revision/route.ts` (new)
- `supabase-nextjs-template/nextjs/src/app/api/concept-resubmit/route.ts` (new)

### UI Components
- `supabase-nextjs-template/nextjs/src/components/CommentModal.tsx` (enhanced)
- `supabase-nextjs-template/nextjs/src/app/app/reviews/page.tsx` (updated)

The system is now ready to automatically track revisions and provide a comprehensive comment resolution workflow! 