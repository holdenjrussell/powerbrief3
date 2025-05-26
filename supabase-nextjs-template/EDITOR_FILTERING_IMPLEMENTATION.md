# Editor Filtering Implementation

This document describes the editor filtering functionality added to the public share page for batches.

## Overview

The public share page (`/public/brief/[shareId]`) now includes both **sorting** and **filtering** capabilities for concepts based on their assigned editors. This enhancement works alongside the existing sorting functionality and leverages the new editor system.

## Features Added

### 1. **Editor Filtering**
- **Filter by specific editor**: Show only concepts assigned to a particular editor
- **Filter by unassigned**: Show only concepts without an assigned editor
- **All editors**: Show all concepts (default)

### 2. **Enhanced Sorting**
- Updated sorting logic to use the new editor system
- Supports sorting by editor name (A-Z and Z-A)
- Maintains backward compatibility with legacy `video_editor` field

### 3. **Smart Editor Detection**
- Automatically detects all unique editors from the batch concepts
- Handles multiple editor field types:
  - Saved editors (via `editor_id` and joined editor data)
  - Custom editor names (via `custom_editor_name`)
  - Legacy editor names (via `video_editor`)

### 4. **User Experience Enhancements**
- **Results counter**: Shows "X of Y concepts" with filter context
- **Reset filters button**: Appears when filters are active, allows one-click reset
- **Responsive design**: Controls stack vertically on mobile devices
- **Clear filter indicators**: Shows which filter is currently active

## Implementation Details

### State Management

```typescript
const [sortBy, setSortBy] = useState<string>('default');
const [filterByEditor, setFilterByEditor] = useState<string>('all');
```

### Core Functions

#### `getConceptEditorName(concept)`
Extracts the editor name from a concept using priority logic:
1. Saved editor name (from joined editor data)
2. Custom editor name
3. Legacy video_editor field

#### `getUniqueEditors(conceptList)`
Extracts all unique editor names from the concept list for the filter dropdown.

#### `filterConcepts(conceptsToFilter, editorFilter)`
Filters concepts based on the selected editor filter:
- `'all'`: Returns all concepts
- `'unassigned'`: Returns concepts without an assigned editor
- `'[editor_name]'`: Returns concepts assigned to the specific editor

#### `sortConcepts(conceptsToSort, sortCriteria)`
Enhanced sorting function that uses the new editor detection logic.

### UI Components

#### Filter Controls
```typescript
<Select value={filterByEditor} onValueChange={setFilterByEditor}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="All editors" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Editors</SelectItem>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    {uniqueEditors.map((editor) => (
      <SelectItem key={editor} value={editor}>
        {editor}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Results Counter
```typescript
<div className="text-sm text-gray-500">
  Showing {sortedAndFilteredConcepts.length} of {concepts.length} concepts
  {filterByEditor !== 'all' && (
    <span className="ml-1">
      (filtered by {filterByEditor === 'unassigned' ? 'unassigned' : `editor: ${filterByEditor}`})
    </span>
  )}
</div>
```

#### Reset Button
```typescript
{hasActiveFilters && (
  <Button variant="outline" size="sm" onClick={resetFilters}>
    <X className="h-4 w-4" />
    <span>Reset</span>
  </Button>
)}
```

## Filter Options

### Available Filters

1. **All Editors** (`'all'`)
   - Shows all concepts regardless of editor assignment
   - Default state

2. **Unassigned** (`'unassigned'`)
   - Shows concepts that don't have any editor assigned
   - Useful for identifying concepts that need editor assignment

3. **Specific Editor** (`'[editor_name]'`)
   - Shows only concepts assigned to the selected editor
   - Dynamically populated based on editors found in the batch

### Filter Logic

The filtering works by:
1. Extracting the editor name from each concept using the priority system
2. Comparing against the selected filter value
3. Returning matching concepts

## Responsive Design

The controls are designed to work well on all screen sizes:

- **Desktop**: Controls display horizontally in a single row
- **Mobile**: Controls stack vertically for better usability
- **Tablet**: Adaptive layout based on available space

## Integration with Existing Features

### Sorting Integration
- Filtering is applied first, then sorting
- Sort options work on the filtered results
- Editor sorting uses the same editor detection logic

### Backward Compatibility
- Works with existing `video_editor` field data
- Gracefully handles concepts with no editor assigned
- Supports mixed editor assignment types within the same batch

## Benefits

1. **Improved Navigation**: Users can quickly find concepts assigned to specific editors
2. **Better Organization**: Easy identification of unassigned concepts
3. **Enhanced Workflow**: Editors can filter to see only their assigned work
4. **Scalability**: Works efficiently with batches containing many concepts
5. **Flexibility**: Supports all editor assignment methods (saved, custom, legacy)

## Usage Examples

### Filter by Specific Editor
1. Open the "Filter by Editor" dropdown
2. Select an editor name from the list
3. View only concepts assigned to that editor

### Find Unassigned Concepts
1. Select "Unassigned" from the filter dropdown
2. View concepts that need editor assignment

### Combine with Sorting
1. Filter by a specific editor
2. Sort the filtered results by status or title
3. Get organized view of that editor's work

### Reset All Filters
1. Click the "Reset" button (appears when filters are active)
2. Return to default view showing all concepts

## Technical Notes

- The filtering is performed client-side for optimal performance
- Editor names are case-sensitive in filtering
- Empty or whitespace-only editor names are treated as unassigned
- The unique editors list is sorted alphabetically for consistent UX

## Future Enhancements

Potential improvements could include:
- Multi-editor filtering (select multiple editors)
- Filter by editor role/specialty
- Save filter preferences
- Export filtered results
- Advanced search within editor names 