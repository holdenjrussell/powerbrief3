# Debugging PowerBrief Public Share Issues

## Overview
This guide helps diagnose and fix issues with PowerBrief public share links for batches and concepts.

## Common Issues

### 1. "Shared content not found or has expired"
This error typically means:
- The share ID doesn't exist in any batch's `share_settings`
- The batch was deleted
- The share settings were cleared/corrupted

### 2. User sees content they shouldn't
This could mean:
- RLS policies are too permissive
- The share validation logic has issues

## Debugging Steps

### Step 1: Enable Debug Mode
Add `?debug=true` to any public share URL:
```
https://www.powerbrief.ai/public/brief/4145e8f9-feea-46a5-9874-92bcf9ec7f39?debug=true
```

This will show:
- Current user info (if logged in)
- Total batches with shares found
- Whether the share ID was found
- Details about the matching batch
- List of all available shares if not found

### Step 2: Use the Debug API
Visit the debug API directly:
```
/api/debug-share?shareId=YOUR_SHARE_ID
```

Or with a specific brand:
```
/api/debug-share?shareId=YOUR_SHARE_ID&brandId=BRAND_ID
```

### Step 3: Check Console Logs
The public share page logs detailed information:
```
=== PUBLIC SHARE DEBUGGING ===
Share ID: 4145e8f9-feea-46a5-9874-92bcf9ec7f39
Total shared batches found: 10
Batches with matching shareId: 0
```

### Step 4: Verify Share Creation
When creating a share, the `shareBriefBatch` function:
1. Generates a unique share ID
2. Merges with existing share_settings
3. Updates the batch record

Check that:
- The batch exists
- The user has permission to share (owner or editor)
- The share_settings update succeeds

## RLS Policy Configuration

### Current Policies for `brief_batches`:

1. **SELECT Policies**:
   - "Allow public access to shared brief batches" - allows ALL access (`qual: "true"`)
   - "Anon can view shared batches" - requires non-empty share_settings
   - "Users can view brief batches for accessible brands" - for authenticated users

2. **UPDATE Policies**:
   - Only batch owners and brand editors can update batches
   - This includes updating share_settings

### Important Notes:
- The overly permissive SELECT policy is intentional for public shares
- Share validation happens in the application layer
- The app checks if the provided shareId exists in share_settings JSON

## How Sharing Works

1. **Creating a Share**:
   ```typescript
   const shareSettings = {
     is_editable: true/false,
     expires_at: null, // or ISO date string
     created_at: new Date().toISOString(),
     share_type: 'link'
   };
   
   const result = await shareBriefBatch(batchId, 'link', shareSettings);
   // Returns: { share_id: 'uuid', share_url: 'https://...' }
   ```

2. **Share Storage**:
   Shares are stored in the `share_settings` JSONB column:
   ```json
   {
     "4145e8f9-feea-46a5-9874-92bcf9ec7f39": {
       "is_editable": false,
       "expires_at": null,
       "created_at": "2024-01-27T00:00:00Z",
       "share_type": "link"
     }
   }
   ```

3. **Accessing a Share**:
   - Anonymous Supabase client fetches all batches with share_settings
   - JavaScript filters to find batch with matching shareId
   - Validates expiration and permissions

## Troubleshooting Checklist

- [ ] Verify the share ID format (should be a valid UUID)
- [ ] Check if the batch still exists in the database
- [ ] Confirm share_settings contains the share ID
- [ ] Ensure RLS policies allow public/anon access
- [ ] Check for JavaScript errors in browser console
- [ ] Verify Supabase URL and anon key are correct
- [ ] Test with debug mode enabled
- [ ] Check if user creating share has proper permissions
- [ ] Verify the batch belongs to the correct brand
- [ ] Ensure no migration errors affected share_settings column

## Common Fixes

### Share Not Found
1. The share was never created properly
2. The batch was deleted
3. Someone manually cleared share_settings

**Fix**: Re-create the share from the batch page

### Permission Denied
1. RLS policies are too restrictive
2. User doesn't have access to the brand

**Fix**: Check RLS policies match the configuration above

### Expired Share
1. The expires_at date has passed

**Fix**: Create a new share without expiration

## Testing Public Shares

1. Create a share as brand owner
2. Copy the share link
3. Open in incognito/private browser
4. Should see content without login
5. Test with ?debug=true to see details

## API Endpoints

- `/api/debug-share` - Debug share information
- `/api/share/send-invitation` - Send email invitations
- `/public/brief/[shareId]` - Public batch view
- `/public/concept/[shareId]/[conceptId]` - Public concept view 