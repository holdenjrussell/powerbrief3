import { Json } from "./supabase";
import { TLShape } from '@tldraw/tldraw';

// Page Type interfaces
export interface PageType {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  description?: string;
  example_urls?: string[];
  example_images?: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Module types
export type ModuleType = 'text' | 'video' | 'button' | 'container' | 'header' | 'footer';
export type AlignmentType = 'left' | 'center' | 'right' | 'justify';

// Module position and dimensions
export interface ModulePosition {
  row: number;
  column: number;
  width: number; // in grid units (1-12)
  height: number; // in pixels or 'auto'
}

// Module content based on type
export interface TextContent {
  text: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
}

export interface VideoContent {
  url?: string;
  thumbnail?: string;
  placeholder?: string;
}

export interface ButtonContent {
  text: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'outline';
}

export interface ContainerContent {
  backgroundColor?: string;
  padding?: string;
  border?: string;
  placeholder?: string; // For image placeholders
}

export type ModuleContent = TextContent | VideoContent | ButtonContent | ContainerContent;

// Wireframe Module interface
export interface WireframeModule {
  id: string;
  wireframe_id: string;
  type: ModuleType;
  content: ModuleContent;
  position: ModulePosition;
  alignment: AlignmentType;
  is_content_placeholder: boolean;
  is_design_descriptor: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Wireframe structure
export interface WireframeRow {
  id: string;
  columns: number; // Number of columns in this row (1-12)
  height?: string; // Optional height for the row
  modules: WireframeModule[];
  order_index?: number;
  layout?: 'horizontal' | 'grid'; // Added for new editor
  name?: string; // Added for new editor
}

export interface WireframeStructure {
  rows?: WireframeRow[]; // Made rows optional
  columns?: number; // e.g., overall grid columns for the wireframe
  backgroundColor?: string;
  tldrawShapes?: TLShape[];
}

// Extracted module from competitor snapshot
export interface ExtractedModule {
  type: string;
  description: string;
  position: string;
  content?: string;
}

// AI Generated Content
export interface AIGeneratedContent {
  [moduleId: string]: {
    content: string;
    metadata?: Record<string, Json>;
  };
}

// Wireframe interface
export interface Wireframe {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  page_type_id?: string;
  competitor_snapshot_url?: string;
  extracted_modules?: ExtractedModule[];
  structure: WireframeStructure;
  ai_generated_content?: AIGeneratedContent;
  system_instructions?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'shared';
  share_settings?: ShareSettings;
  tldraw_data?: Json; // Store complete tldraw document/store state
  created_at: string;
  updated_at: string;
}

// Share Settings
export interface ShareSettings {
  is_editable: boolean;
  expires_at?: string;
}

// Wireframe Share
export interface WireframeShare {
  id: string;
  wireframe_id: string;
  share_id: string;
  is_editable: boolean;
  expires_at?: string;
  created_by: string;
  created_at: string;
}

// API Request/Response types
export interface CreatePageTypeRequest {
  brand_id: string;
  name: string;
  description?: string;
  example_urls?: string[];
  example_images?: string[];
}

export interface CreateWireframeRequest {
  brand_id: string;
  name: string;
  page_type_id?: string;
  competitor_snapshot_url?: string;
}

export interface UpdateWireframeStructureRequest {
  structure: WireframeStructure;
}

export interface UpdateWireframeTldrawDataRequest {
  tldraw_data: Json;
}

export interface GenerateAIContentRequest {
  wireframe_id: string;
  module_ids?: string[]; // Optional: specific modules to generate content for
  system_instructions?: string;
}

export interface ExtractModulesRequest {
  snapshot_url: string;
}

export interface CreateShareRequest {
  wireframe_id: string;
  is_editable: boolean;
  expires_at?: string;
}

// Database types
export type DbPageType = {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  description?: string;
  example_urls?: string[];
  example_images?: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type DbWireframe = {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  page_type_id?: string;
  competitor_snapshot_url?: string;
  extracted_modules?: Json;
  structure: Json;
  ai_generated_content?: Json;
  system_instructions?: string;
  status: string;
  share_settings?: Json;
  tldraw_data?: Json; // Store complete tldraw document/store state
  created_at: string;
  updated_at: string;
};

export type DbWireframeModule = {
  id: string;
  wireframe_id: string;
  type: string;
  content: Json;
  position: Json;
  alignment: string;
  is_content_placeholder: boolean;
  is_design_descriptor: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}; 