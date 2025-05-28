# Use Page As Actor Feature Implementation

## Overview

The "Use Page As Actor" feature enables Instagram advertising using Page-Backed Instagram Accounts (PBIA). This allows brands to run Instagram ads without needing a separate Instagram Business Account by creating "shadow" Instagram accounts backed by their Facebook Pages.

## What is Page-Backed Instagram Account (PBIA)?

A Page-Backed Instagram Account is a special type of Instagram account that:
- Uses the same name and profile picture as your Facebook Page
- Cannot be logged into directly
- Is managed entirely through Meta's APIs
- Allows running Instagram ads using your Facebook Page's identity
- Enables ad comment management through Meta's APIs

## Implementation Status

✅ **Completed Components:**

### 1. Database Schema
- Added `meta_use_page_as_actor` BOOLEAN field to brands table
- Added `meta_page_backed_instagram_accounts` JSONB field to store page ID → PBIA ID mappings
- Migration file: `add_use_page_as_actor_migration.sql`

### 2. MetaAssetsSelector Component
- Added "Use Page As Actor" checkbox in Instagram Settings section
- State management for `usePageAsActor` and `pageBackedInstagramAccounts`
- Initialization from brand configuration
- Save functionality to persist settings

### 3. API Routes Updated
- **save-assets route**: Updated to handle new PBIA fields
- **brand-config route**: Updated to return PBIA settings
- **launch-ads route**: Updated Instagram User ID resolution logic

### 4. Ad Launch Logic
- Automatic PBIA creation/retrieval when "Use Page As Actor" is enabled
- Fallback to regular Instagram accounts when PBIA creation fails
- Database updates to store PBIA mappings for future use

### 5. UI Updates
- Ad uploader settings modal shows "Use Page As Actor" feature availability
- Clear explanations of PBIA functionality

## How It Works

### 1. Configuration
1. User selects Facebook Pages in Brand Settings → Meta Integration
2. For each selected page without an auto-linked Instagram account, user sees two options:
   - **Link existing Instagram Business Account**: Manual Instagram account ID input
   - **Use Page As Actor for Instagram Ads**: Creates Page-Backed Instagram Account
3. Settings are saved to database with per-page configuration

### 2. Ad Launch Process
When launching ads with "Use Page As Actor" enabled:

1. **Check for existing PBIA**: Look up `meta_page_backed_instagram_accounts` for the Facebook Page ID
2. **Create PBIA if needed**: Call Meta API `POST /{page_id}/page_backed_instagram_accounts`
3. **Use PBIA for ads**: Set the PBIA ID as `instagram_user_id` in ad creatives
4. **Update database**: Store the new PBIA mapping for future use

### 3. Meta API Integration
```javascript
// Check for existing PBIA
GET /{page_id}/page_backed_instagram_accounts

// Create new PBIA
POST /{page_id}/page_backed_instagram_accounts

// Use in ad creative
{
  object_story_spec: {
    page_id: fbPageId,
    instagram_user_id: pbiaId  // PBIA ID instead of regular Instagram account
  }
}
```

### 4. User Experience Flow
```
Facebook Page Selection
├── Auto-linked Instagram Account Found
│   └── Use existing Instagram account
└── No Instagram Account Found
    ├── Option 1: Link existing Instagram Business Account
    │   ├── Enter Instagram Account ID
    │   ├── Enter Label (optional)
    │   └── Click "Link"
    └── Option 2: Use Page As Actor for Instagram Ads
        ├── Select radio button
        └── PBIA will be created automatically during ad launch
```

## Database Structure

### brands table additions:
```sql
-- Boolean flag to enable "Use Page As Actor"
meta_use_page_as_actor BOOLEAN DEFAULT false

-- JSON mapping of Facebook Page ID → PBIA ID
meta_page_backed_instagram_accounts JSONB DEFAULT '{}'::jsonb

-- Example data:
-- meta_page_backed_instagram_accounts: {"123456789": "987654321", "111222333": "444555666"}
```

## Code Files Modified

### Core Implementation:
- `add_use_page_as_actor_migration.sql` - Database schema
- `src/components/MetaAssetsSelector.tsx` - UI configuration
- `src/app/api/meta/save-assets/route.ts` - Save settings API
- `src/app/api/meta/brand-config/route.ts` - Load settings API
- `src/app/api/meta/launch-ads/route.ts` - Ad launch logic

### UI Updates:
- `src/app/app/ad-upload-tool/page.tsx` - Settings modal updates
- `src/app/ad-upload-tool/page.tsx` - Settings modal updates

## Benefits

1. **Simplified Setup**: No need to create separate Instagram Business Accounts
2. **Consistent Branding**: Instagram ads use Facebook Page name and profile picture
3. **Centralized Management**: All managed through Facebook Page settings
4. **API-Only Management**: Ad comments managed through Meta APIs

## Limitations

1. **No Direct Login**: Cannot log into PBIA accounts directly
2. **API Dependency**: All management must be done through Meta APIs
3. **Limited Features**: Some Instagram features may not be available
4. **Page Dependency**: Requires active Facebook Page

## Testing

To test the implementation:

1. **Enable Feature**: Go to Brand Settings → Meta Integration → Check "Use Page As Actor"
2. **Launch Ads**: Create ads through the ad uploader tool
3. **Verify PBIA Creation**: Check database for new entries in `meta_page_backed_instagram_accounts`
4. **Check Ad Creatives**: Verify Instagram ads use PBIA ID instead of regular Instagram account

## Migration Required

Before using this feature, apply the database migration:

```bash
# Copy migration to Supabase migrations directory
cp add_use_page_as_actor_migration.sql supabase-nextjs-template/supabase/migrations/20250201000000_add_use_page_as_actor.sql

# Apply migration
npx supabase db push --include-all
```

## Future Enhancements

1. **PBIA Management UI**: Interface to view and manage created PBIAs
2. **Comment Management**: UI for managing Instagram ad comments
3. **Analytics Integration**: Track PBIA performance separately
4. **Bulk PBIA Creation**: Create PBIAs for multiple pages at once

## Meta API Documentation

- [Page-Backed Instagram Accounts](https://developers.facebook.com/docs/marketing-api/guides/page-backed-instagram-accounts/)
- [Instagram Business Account API](https://developers.facebook.com/docs/instagram-api/)
- [Ad Creative API](https://developers.facebook.com/docs/marketing-api/reference/ad-creative/) 