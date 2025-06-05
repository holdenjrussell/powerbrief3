# PowerFrame Supabase Persistence & Brand Sharing

This document describes the complete implementation of saving PowerFrame designs to Supabase with full brand sharing support.

## Overview

PowerFrame now saves all tldraw designs directly to Supabase instead of localStorage, enabling:
- **Cross-device access** - Designs sync across all devices
- **Brand sharing** - Users can collaborate on wireframes when brands are shared
- **Auto-save** - Designs save automatically every 3 seconds
- **Manual save** - Users can save immediately with a save button
- **Persistent storage** - No data loss when clearing browser storage

## Database Changes

### New Column: `tldraw_data`
Added to the `wireframes` table to store complete tldraw document state:

```sql
ALTER TABLE public.wireframes 
ADD COLUMN IF NOT EXISTS tldraw_data JSONB;
```

### Updated RLS Policies
All PowerFrame RLS policies now support brand sharing:

#### Wireframes Table
- **Viewers**: Can view wireframes for brands they own or have been shared with
- **Editors**: Can view, create, update, and delete wireframes for brands they have editor access to
- **Owners**: Full access to wireframes in their own brands

#### Page Types Table
- Same permission model as wireframes
- Shared users can view page types for accessible brands
- Only editors can create/modify page types

#### Wireframe Modules Table
- Inherits permissions from parent wireframe
- Shared users can view modules for accessible wireframes
- Only editors can create/modify modules

## Implementation Details

### Backend Changes

#### 1. Database Migration (`20250121000000_add_tldraw_data_to_wireframes.sql`)
- Adds `tldraw_data` JSONB column
- Creates auto-update trigger for `updated_at` timestamp

#### 2. RLS Policy Updates (`20250121000001_fix_powerframe_brand_sharing.sql`)
- Updates all PowerFrame RLS policies to respect brand sharing
- Supports both `viewer` and `editor` roles
- Maintains backward compatibility

#### 3. TypeScript Types (`powerframe.ts`)
```typescript
export interface Wireframe {
  // ... existing fields
  tldraw_data?: Json; // Store complete tldraw document/store state
}

export interface UpdateWireframeTldrawDataRequest {
  tldraw_data: Json;
}
```

#### 4. Service Functions (`powerframeService.ts`)
```typescript
export async function updateWireframeTldrawData(
  id: string,
  request: UpdateWireframeTldrawDataRequest
): Promise<Wireframe> {
  return updateWireframe(id, { tldraw_data: request.tldraw_data });
}
```

### Frontend Changes

#### 1. Custom Hook (`useTldrawPersistence.ts`)
Replaces tldraw's built-in localStorage persistence:

```typescript
export function useTldrawPersistence({ 
  wireframeId, 
  editor, 
  autoSaveIntervalMs = 2000 
}: UseTldrawPersistenceOptions) {
  // Auto-save every X seconds
  // Load initial data from Supabase
  // Manual save function
  // Debounced save to prevent excessive API calls
}
```

#### 2. Wireframe Editor Updates (`page.tsx`)
- Integrates custom persistence hook
- Removes localStorage `persistenceKey`
- Adds save button with loading states
- Shows save status and data loaded indicators
- Displays auto-save information

## Brand Sharing Integration

### Permission Model

#### Brand Owner
- Full access to all wireframes and page types
- Can create, view, edit, and delete everything
- Can share brand with other users

#### Editor Role (Shared Users)
- Can view all wireframes and page types for shared brands
- Can create new wireframes and page types
- Can edit existing wireframes and page types
- **Can save tldraw designs** - Full collaboration capability
- Cannot delete the brand itself

#### Viewer Role (Shared Users)
- Can view all wireframes and page types for shared brands
- **Cannot create, edit, or save designs**
- Read-only access for reviewing and feedback

### Access Control Flow

1. **User opens wireframe editor**
2. **RLS policies check**:
   - Does user own the wireframe? → Full access
   - Is user shared with brand as editor? → Edit access + save capability
   - Is user shared with brand as viewer? → View only
   - Neither? → Access denied

3. **Save operations respect permissions**:
   - Auto-save only works for users with edit permissions
   - Manual save button disabled for viewers
   - Error handling for permission failures

## Usage Examples

### Scenario 1: Brand Owner
```
1. Creates wireframe
2. Draws design on tldraw canvas
3. Design auto-saves every 3 seconds to Supabase
4. Can manually save anytime
5. Design persists across all devices
```

### Scenario 2: Shared Editor
```
1. Receives brand sharing invitation with editor role
2. Accepts invitation
3. Can see all wireframes for shared brand
4. Opens wireframe editor
5. Can edit and save designs (full collaboration)
6. Changes sync with other team members
```

### Scenario 3: Shared Viewer
```
1. Receives brand sharing invitation with viewer role
2. Accepts invitation
3. Can see all wireframes for shared brand
4. Opens wireframe editor in read-only mode
5. Save button disabled, auto-save inactive
6. Can view and provide feedback only
```

## Testing the Implementation

### 1. Basic Persistence
- Create wireframe, draw shapes, refresh page
- Verify design loads from Supabase

### 2. Brand Sharing - Editor
- Share brand with user as "editor"
- User accepts invitation
- User can open wireframes and save changes
- Changes persist and sync across users

### 3. Brand Sharing - Viewer
- Share brand with user as "viewer"
- User accepts invitation
- User can view wireframes but cannot save
- Save button disabled, auto-save inactive

### 4. Cross-Device Sync
- Create design on one device
- Open same wireframe on different device
- Verify design loads correctly

## Migration Steps

If you haven't run the migrations yet:

```bash
# Run both migrations in order
npx supabase db push
```

The migrations are:
1. `20250121000000_add_tldraw_data_to_wireframes.sql` - Adds tldraw_data column
2. `20250121000001_fix_powerframe_brand_sharing.sql` - Updates RLS policies

## Benefits

✅ **Real Collaboration** - Multiple users can work on the same wireframe
✅ **Cross-Device Sync** - Designs available everywhere
✅ **No Data Loss** - Designs persist even if browser storage is cleared
✅ **Permission Control** - Fine-grained access control via brand sharing
✅ **Auto-Save** - Never lose work with automatic saving
✅ **Instant Feedback** - Save status and loading indicators
✅ **Scalable** - Leverages Supabase's built-in scaling and performance

This implementation transforms PowerFrame from a single-user, localStorage-based tool into a fully collaborative, cloud-persisted wireframing platform! 