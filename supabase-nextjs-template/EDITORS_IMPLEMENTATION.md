# Editors Implementation

This document describes the implementation of the saved editors functionality for the PowerBrief system.

## Overview

The editors feature allows users to:
1. Save frequently used editors/designers for each brand
2. Assign saved editors to concepts with a dropdown selection
3. Still allow free-text editor input for flexibility
4. Maintain backward compatibility with existing `video_editor` field

## Database Changes

### New Tables

#### `editors` Table
```sql
CREATE TABLE public.editors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'editor' CHECK (role IN ('editor', 'designer', 'video_editor', 'both')),
    specialties TEXT[], -- Array of specialties like ['video', 'image', 'motion_graphics']
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(brand_id, name)
);
```

### Modified Tables

#### `brief_concepts` Table - New Columns
- `editor_id UUID` - Reference to saved editor (nullable)
- `custom_editor_name TEXT` - Free-text editor name (nullable)
- `video_editor TEXT` - Legacy field (kept for backward compatibility)

### Views and Functions

#### `concept_editors` View
Provides a unified view of editor information across all concepts, handling the priority logic:
1. Saved editor (via `editor_id`)
2. Custom editor name (via `custom_editor_name`)
3. Legacy editor (via `video_editor`)

#### `get_brand_editors()` Function
Returns active editors for a specific brand, used for populating dropdowns.

## TypeScript Types

### New Interfaces

```typescript
export interface Editor {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  email?: string;
  role: 'editor' | 'designer' | 'video_editor' | 'both';
  specialties?: string[];
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EditorOption {
  type: 'saved' | 'custom';
  id?: string;
  name: string;
  email?: string;
  role?: string;
  specialties?: string[];
}
```

### Updated Interfaces

The `BriefConcept` interface now includes:
- `editor_id: string | null`
- `custom_editor_name: string | null`
- `video_editor: string | null` (legacy, maintained for compatibility)

## Service Functions

### Editor Management (`editorsService.ts`)

- `getEditorsForBrand(brandId)` - Get all active editors for a brand
- `createEditor(editorData)` - Create a new saved editor
- `updateEditor(editorData)` - Update an existing editor
- `deleteEditor(editorId)` - Delete an editor
- `deactivateEditor(editorId)` - Soft delete (set is_active = false)

### Concept Editor Assignment

- `updateConceptEditor(conceptId, editorOption)` - Assign editor to concept
- `getConceptEditorInfo(conceptId)` - Get full editor info for a concept
- `migrateLegacyEditor(conceptId, createAsSaved, brandId)` - Migrate legacy data

## UI Implementation Strategy

### Editor Selection Component

The UI should provide a combined input that allows:

1. **Dropdown with saved editors** - Shows all active editors for the brand
2. **"Add new editor" option** - Allows creating a new saved editor
3. **Free-text input** - For one-off editor names
4. **Clear option** - Remove editor assignment

### Example UI Flow

```typescript
// Pseudo-code for editor selection component
const EditorSelector = ({ concept, brandId, onUpdate }) => {
  const [savedEditors, setSavedEditors] = useState([]);
  const [inputMode, setInputMode] = useState('dropdown'); // 'dropdown' | 'text' | 'new'
  
  // Load saved editors for brand
  useEffect(() => {
    getEditorsForBrand(brandId).then(setSavedEditors);
  }, [brandId]);
  
  const handleSavedEditorSelect = (editorId) => {
    updateConceptEditor(concept.id, { type: 'saved', editorId });
  };
  
  const handleCustomEditorInput = (name) => {
    updateConceptEditor(concept.id, { type: 'custom', name });
  };
  
  // Render dropdown with saved editors + custom options
};
```

## Migration Strategy

### Backward Compatibility

1. **Existing data** - All existing `video_editor` values remain functional
2. **Display priority** - UI shows saved editor > custom editor > legacy editor
3. **Gradual migration** - Users can migrate legacy data to saved editors over time

### Migration Function

The `migrateLegacyEditor()` function can:
- Convert legacy `video_editor` to `custom_editor_name`
- Optionally create a new saved editor from legacy data
- Handle duplicate name conflicts gracefully

## Security

### Row Level Security (RLS)

All editor operations are protected by RLS policies:
- Users can only view/edit editors for brands they own
- Editor assignments follow the same brand ownership rules
- The `concept_editors` view respects existing concept permissions

### Data Validation

- Editor names must be unique per brand
- Role field is constrained to valid values
- Specialties array allows flexible skill tracking

## Benefits

1. **Improved UX** - Quick selection of frequently used editors
2. **Data consistency** - Standardized editor names and contact info
3. **Flexibility** - Still allows free-text input when needed
4. **Backward compatibility** - No breaking changes to existing data
5. **Enhanced sorting** - Better sorting capabilities on public share pages
6. **Contact management** - Store editor email addresses and specialties

## Usage Examples

### Creating a Saved Editor
```typescript
const newEditor = await createEditor({
  brand_id: 'brand-uuid',
  name: 'John Smith',
  email: 'john@example.com',
  role: 'video_editor',
  specialties: ['video', 'motion_graphics'],
  notes: 'Specializes in product videos'
});
```

### Assigning Editor to Concept
```typescript
// Assign saved editor
await updateConceptEditor(conceptId, { 
  type: 'saved', 
  editorId: 'editor-uuid' 
});

// Assign custom editor name
await updateConceptEditor(conceptId, { 
  type: 'custom', 
  name: 'Jane Doe' 
});
```

### Getting Editor Display Name
```typescript
const displayName = getEditorDisplayName(concept);
// Returns the appropriate editor name based on priority
```

## Next Steps

1. **Run the migration** - Apply the database migration to add tables and columns
2. **Update UI components** - Modify the concept editing interface to use the new editor selector
3. **Test thoroughly** - Ensure backward compatibility and new functionality work correctly
4. **Update public share page** - Enhance sorting to use the new editor system
5. **Add editor management UI** - Create interface for managing saved editors per brand 