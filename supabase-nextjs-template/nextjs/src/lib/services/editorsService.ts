import { createSPAClient } from '@/lib/supabase/client';
import { 
  Editor, 
  CreateEditorRequest, 
  UpdateEditorRequest, 
  BriefConcept,
  EditorOption,
  ConceptEditorInfo 
} from '@/lib/types/powerbrief';

const getSupabaseClient = async () => {
  return createSPAClient();
};

// Editor CRUD operations
export async function getEditorsForBrand(brandId: string): Promise<Editor[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('editors')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching editors:', error);
    throw error;
  }

  return data || [];
}

export async function createEditor(editorData: CreateEditorRequest): Promise<Editor> {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('editors')
    .insert({
      ...editorData,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating editor:', error);
    throw error;
  }

  return data;
}

export async function updateEditor(editorData: UpdateEditorRequest): Promise<Editor> {
  const supabase = await getSupabaseClient();
  const { id, ...updateData } = editorData;

  const { data, error } = await supabase
    .from('editors')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating editor:', error);
    throw error;
  }

  return data;
}

export async function deleteEditor(editorId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  
  const { error } = await supabase
    .from('editors')
    .delete()
    .eq('id', editorId);

  if (error) {
    console.error('Error deleting editor:', error);
    throw error;
  }
}

export async function deactivateEditor(editorId: string): Promise<Editor> {
  return updateEditor({ id: editorId, is_active: false });
}

// Utility functions for working with concept editors
export function getEditorDisplayName(concept: BriefConcept): string | null {
  // Priority: saved editor > custom editor name > legacy video_editor field
  if (concept.editor_id) {
    // This would need to be resolved with editor data in the UI
    return null; // Will be resolved by the UI component
  }
  
  if (concept.custom_editor_name) {
    return concept.custom_editor_name;
  }
  
  return concept.video_editor;
}

export function getEditorOptions(savedEditors: Editor[]): EditorOption[] {
  return savedEditors.map(editor => ({
    type: 'saved' as const,
    id: editor.id,
    name: editor.name,
    email: editor.email,
    role: editor.role,
    specialties: editor.specialties
  }));
}

// Function to get concept editor information with full details
export async function getConceptEditorInfo(conceptId: string): Promise<ConceptEditorInfo | null> {
  const supabase = await getSupabaseClient();
  
  const { data, error } = await supabase
    .from('concept_editors')
    .select('*')
    .eq('concept_id', conceptId)
    .single();

  if (error) {
    console.error('Error fetching concept editor info:', error);
    return null;
  }

  return data;
}

// Function to update concept editor assignment
export async function updateConceptEditor(
  conceptId: string, 
  editorOption: { type: 'saved'; editorId: string } | { type: 'custom'; name: string } | { type: 'clear' }
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  let updateData: any = {};
  
  switch (editorOption.type) {
    case 'saved':
      updateData = {
        editor_id: editorOption.editorId,
        custom_editor_name: null,
        video_editor: null // Clear legacy field when using new system
      };
      break;
    case 'custom':
      updateData = {
        editor_id: null,
        custom_editor_name: editorOption.name,
        video_editor: null // Clear legacy field when using new system
      };
      break;
    case 'clear':
      updateData = {
        editor_id: null,
        custom_editor_name: null,
        video_editor: null
      };
      break;
  }

  const { error } = await supabase
    .from('brief_concepts')
    .update(updateData)
    .eq('id', conceptId);

  if (error) {
    console.error('Error updating concept editor:', error);
    throw error;
  }
}

// Function to migrate legacy video_editor field to new system
export async function migrateLegacyEditor(
  conceptId: string, 
  createAsSaved: boolean = false, 
  brandId?: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Get the concept with legacy editor
  const { data: concept, error: conceptError } = await supabase
    .from('brief_concepts')
    .select('video_editor, brief_batch_id')
    .eq('id', conceptId)
    .single();

  if (conceptError || !concept?.video_editor) {
    return;
  }

  if (createAsSaved && brandId) {
    // Create a new saved editor and assign it
    try {
      const newEditor = await createEditor({
        brand_id: brandId,
        name: concept.video_editor,
        role: 'editor'
      });
      
      await updateConceptEditor(conceptId, { type: 'saved', editorId: newEditor.id });
    } catch (error) {
      // If creation fails (e.g., duplicate name), fall back to custom
      await updateConceptEditor(conceptId, { type: 'custom', name: concept.video_editor });
    }
  } else {
    // Move to custom editor name
    await updateConceptEditor(conceptId, { type: 'custom', name: concept.video_editor });
  }
} 