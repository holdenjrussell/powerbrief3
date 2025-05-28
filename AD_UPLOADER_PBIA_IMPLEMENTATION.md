# Ad Uploader Page-Backed Instagram Account Implementation

## Overview

This document outlines the implementation of Page-Backed Instagram Account (PBIA) functionality in the ad uploader, including auto-selection of linked Instagram accounts and "Use Page as Actor" support.

## Features Implemented

### 1. Auto-Selection of Linked Instagram Accounts

When a Facebook page is selected in the ad uploader settings, the system automatically:

- **Checks for manual pairings**: If a manual Instagram account is linked to the page in brand settings
- **Applies Use Page as Actor**: If the brand has "Use Page as Actor" enabled, automatically selects PBIA
- **Updates account names**: Automatically populates the Instagram account name field

#### Implementation Details

```typescript
// Auto-selection logic in handlePageSelect
const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const pageId = e.target.value;
  setFormData(prev => {
    const newFormData = { ...prev, fbPage: pageId };
    
    // Check for manual pairing first
    const manualPairing = brand.metaConfig.manualInstagramPairings?.[pageId];
    if (manualPairing) {
      newFormData.igAccount = manualPairing;
      newFormData.igAccountName = brand.metaConfig.manualInstagramLabels?.[manualPairing] || null;
    } else if (brand.metaConfig.usePageAsActor) {
      // If Use Page as Actor is enabled, set special indicator
      newFormData.igAccount = `PBIA:${pageId}`;
      newFormData.igAccountName = 'Page-Backed Instagram Account';
    }
    
    return newFormData;
  });
};
```

### 2. Use Page as Actor Support

The system supports Meta's "Use Page as Actor" functionality for Instagram ads:

- **PBIA Format**: Instagram accounts are stored as `PBIA:{pageId}` when using Page as Actor
- **Auto-Creation**: Page-Backed Instagram Accounts are created automatically during ad launch
- **Visual Indicators**: Clear UI indicators show when PBIA will be used

#### PBIA Display Logic

```typescript
// Special handling for PBIA display names
if (id.startsWith('PBIA:')) {
  const pageId = id.replace('PBIA:', '');
  const pageName = getDisplayName(pageId, brand.metaConfig?.facebookPages || [], brand.metaConfig?.manualPageLabels || {});
  return `Page-Backed IG (${pageName})`;
}
```

### 3. Enhanced Configuration Saving

Ad configurations now properly save and restore:

- **Instagram account IDs and names**: Both regular and PBIA accounts
- **Use Page as Actor setting**: Preserved in configuration settings
- **Auto-selection state**: Configurations remember linked account preferences

## Database Schema

### Migration: `20250117000002_add_use_page_as_actor.sql`

```sql
-- Add columns to store "Use Page As Actor" settings
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS meta_use_page_as_actor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_page_backed_instagram_accounts JSONB DEFAULT '{}'::jsonb;
```

### Data Structure

```json
{
  "meta_use_page_as_actor": true,
  "meta_page_backed_instagram_accounts": {
    "123456789": "987654321",  // Facebook Page ID -> PBIA ID
    "111222333": "444555666"
  }
}
```

## PBIA Utility Functions

### File: `src/lib/utils/pbia.ts`

#### Key Functions:

1. **`resolveInstagramUserId()`**: Resolves Instagram User ID for ad creation
2. **`updatePBIAMappings()`**: Updates PBIA mappings in database
3. **`isPBIA()`**: Checks if account ID represents a PBIA
4. **`extractPageIdFromPBIA()`**: Extracts page ID from PBIA format

#### Usage Example:

```typescript
import { resolveInstagramUserId, updatePBIAMappings } from '@/lib/utils/pbia';

// During ad creation
const result = await resolveInstagramUserId(
  igAccount,           // "PBIA:123456789" or regular ID
  fbPageId,           // Facebook Page ID
  accessToken,        // Meta access token
  existingPBIAs       // Existing PBIA mappings
);

if (result.success) {
  // Use result.instagramUserId for ad creative
  const adCreative = {
    object_story_spec: {
      page_id: fbPageId,
      instagram_user_id: result.instagramUserId
    }
  };
}
```

## UI Components Enhanced

### 1. Settings Modal Improvements

- **Auto-selection dropdowns**: Facebook page selection triggers Instagram account auto-selection
- **PBIA indicators**: Visual indicators when Page-Backed Instagram Account will be used
- **Enhanced display names**: Shows meaningful names instead of IDs

### 2. Configuration Display

- **Status indicators**: Shows current PBIA settings in Meta Integration Status
- **Help text**: Contextual help explaining PBIA functionality
- **Visual feedback**: Clear indication when PBIA will be auto-created

## Meta API Integration

### PBIA Creation Flow

1. **Check existing PBIAs**: `GET /{page_id}/page_backed_instagram_accounts`
2. **Create if needed**: `POST /{page_id}/page_backed_instagram_accounts`
3. **Update database**: Store PBIA mapping for future use

### Ad Creative Structure

```javascript
// For regular Instagram accounts
{
  object_story_spec: {
    page_id: "123456789",
    instagram_user_id: "987654321"  // Regular Instagram account ID
  }
}

// For Page-Backed Instagram Accounts
{
  object_story_spec: {
    page_id: "123456789",
    instagram_user_id: "555666777"  // PBIA ID (auto-created)
  }
}
```

## Configuration Settings Structure

### Enhanced AdConfigurationSettings

```typescript
interface AdConfigurationSettings {
  // ... existing fields
  
  // Meta account settings with names
  fbPage?: string;
  fbPageName?: string | null;
  igAccount?: string;  // Can be regular ID or "PBIA:pageId"
  igAccountName?: string | null;
  
  // Use Page as Actor setting
  usePageAsActor?: boolean;
}
```

## User Experience Flow

### 1. Brand Setup
1. User configures Meta integration in Brand Settings
2. User enables "Use Page as Actor" if desired
3. User sets up manual Instagram account pairings (optional)

### 2. Ad Configuration
1. User selects Facebook page in ad uploader settings
2. System automatically selects linked Instagram account:
   - Manual pairing if configured
   - PBIA if "Use Page as Actor" enabled
   - No selection if no linking configured
3. User sees clear indication of what will be used

### 3. Ad Creation
1. User creates ads with configured settings
2. System resolves Instagram User ID:
   - Uses regular Instagram account ID directly
   - Creates PBIA if needed for "Use Page as Actor"
3. PBIA mappings stored for future use

## Benefits

1. **Simplified Setup**: Auto-selection reduces manual configuration
2. **Consistent Branding**: PBIA uses Facebook Page identity
3. **Reduced Errors**: Automatic linking prevents mismatched accounts
4. **Better UX**: Clear indicators and helpful explanations
5. **API Compliance**: Proper implementation per Meta API docs

## Testing Scenarios

### 1. Manual Instagram Account Linking
- Select Facebook page with manually linked Instagram account
- Verify Instagram account auto-selects
- Verify proper names display

### 2. Use Page as Actor
- Enable "Use Page as Actor" in brand settings
- Select Facebook page in ad uploader
- Verify PBIA indicator appears
- Verify PBIA creation during ad launch

### 3. Configuration Persistence
- Save configuration with PBIA settings
- Load configuration
- Verify settings restore correctly

### 4. Mixed Account Types
- Test with both regular and PBIA accounts
- Verify proper display and functionality
- Test switching between account types

## Migration Path

### For Existing Users
1. **No immediate action required**: Existing configurations continue to work
2. **Enhanced functionality**: New auto-selection features available immediately
3. **Gradual adoption**: Users can enable "Use Page as Actor" when ready

### For New Users
1. **Full functionality**: All features available from setup
2. **Guided experience**: Clear indicators and help text
3. **Best practices**: Automatic linking encourages proper setup

## Files Modified

### Core Implementation
- `src/app/app/ad-upload-tool/page.tsx` - Main ad uploader with auto-selection
- `src/app/ad-upload-tool/page.tsx` - Secondary ad uploader (consistency)
- `src/lib/types/adConfigurations.ts` - Enhanced configuration types
- `src/lib/utils/pbia.ts` - PBIA utility functions

### Database
- `supabase/migrations/20250117000002_add_use_page_as_actor.sql` - Schema changes

### Documentation
- `AD_UPLOADER_IMPROVEMENTS.md` - Overall improvements documentation
- `AD_UPLOADER_PBIA_IMPLEMENTATION.md` - This document

## Future Enhancements

1. **Bulk PBIA Management**: Interface to manage multiple PBIAs
2. **PBIA Analytics**: Track performance of Page-Backed accounts
3. **Advanced Pairing**: More sophisticated account linking options
4. **Validation**: Real-time validation of account configurations
5. **Sync Status**: Show sync status between pages and Instagram accounts 