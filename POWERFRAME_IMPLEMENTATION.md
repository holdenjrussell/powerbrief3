# PowerFrame Implementation Summary

## Overview
PowerFrame is an AI-powered wireframing tool integrated into the existing application. It allows users to create, manage, and share wireframes for different page types with drag-and-drop functionality and AI-generated content.

## Database Schema

### Tables Created
1. **page_types** - Stores different types of pages (Home, Collection, PDP, etc.)
2. **wireframes** - Main wireframe documents with structure and AI content
3. **wireframe_modules** - Individual modules/elements within wireframes
4. **wireframe_shares** - Public sharing functionality

### Migration File
- Location: `supabase/migrations/20250120000000_create_powerframe_schema.sql`
- Includes RLS policies for secure access
- Creates storage bucket for media files
- Includes function to create default page types

## File Structure

### Frontend Pages
1. **Main PowerFrame Page** - `/src/app/app/powerframe/page.tsx`
   - Lists all brands
   - Navigation to brand-specific PowerFrame pages

2. **Brand PowerFrame Page** - `/src/app/app/powerframe/[brandId]/page.tsx`
   - Lists wireframes for a specific brand
   - Create new wireframes
   - Manage page types
   - Delete wireframes

3. **Wireframe Editor** - `/src/app/app/powerframe/[brandId]/[wireframeId]/page.tsx`
   - Drag-and-drop interface
   - Add/remove rows and modules
   - Upload competitor snapshots
   - Save wireframe structure
   - Generate AI content (button ready, API integration needed)

4. **Public Share Page** - `/src/app/public/wireframe/[shareId]/page.tsx`
   - View-only access to shared wireframes
   - Displays AI-generated content if available

### Services & Types
1. **Types** - `/src/lib/types/powerframe.ts`
   - All TypeScript interfaces for PowerFrame
   - Module types, wireframe structure, etc.

2. **Service** - `/src/lib/services/powerframeService.ts`
   - CRUD operations for page types, wireframes, and modules
   - Sharing functionality
   - File upload for competitor snapshots

### API Routes
1. **Extract Modules** - `/src/app/api/powerframe/extract-modules/route.ts`
   - Analyzes competitor snapshots using Gemini AI
   - Extracts page modules/sections

2. **Generate Content** - `/src/app/api/powerframe/generate-content/route.ts`
   - Generates content for wireframe modules using Gemini AI
   - Uses brand context for personalized content

### Navigation
- Added PowerFrame tab to AppLayout navigation menu
- Icon: Frame from lucide-react

## Features Implemented

### Core Features
1. ✅ Page type management (with defaults: Home, Collection, PDP, Listicle, Advertorial)
2. ✅ Create and manage wireframes
3. ✅ Drag-and-drop module system
4. ✅ Row-based layout structure
5. ✅ Module types: text, image, video, button, container, header, footer
6. ✅ Upload competitor snapshots
7. ✅ Public sharing with unique share links

### Partial Implementation
1. ⚠️ AI module extraction from snapshots (API ready, needs frontend integration)
2. ⚠️ AI content generation (API ready, needs frontend integration)
3. ⚠️ Module resizing and advanced positioning
4. ⚠️ Column management within rows

## Next Steps

### To Complete Implementation
1. **Run Database Migration**
   ```bash
   supabase db push
   ```

2. **Generate TypeScript Types**
   ```bash
   supabase gen types typescript --local > src/lib/types/supabase.ts
   ```

3. **Frontend Enhancements**
   - Connect "Generate Content" button to API
   - Add module extraction from competitor snapshots
   - Implement module resizing
   - Add column management UI
   - Add alignment controls for modules

4. **Additional Features**
   - Export wireframes as PDF/Image
   - Version history
   - Collaborative editing
   - Templates library
   - Custom module types

## Usage

1. Navigate to PowerFrame from the main navigation
2. Select a brand or create one
3. Create a new wireframe with optional page type
4. Add rows and drag modules into them
5. Upload competitor snapshot for inspiration
6. Generate AI content for text modules
7. Share wireframe with designers via public link

## Technical Notes

- Uses same authentication and RLS patterns as PowerBrief
- Integrates with existing brand management
- Gemini AI for content generation and image analysis
- Drag-and-drop implemented with HTML5 drag events
- Responsive grid system using Tailwind CSS

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only see/edit their own content
- Public shares use unique IDs and optional expiration
- Storage bucket configured with proper access policies 