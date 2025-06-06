import { useCallback, useEffect, useRef } from 'react';
import { updateWireframeTldrawData, getWireframe } from '@/lib/services/powerframeService';
import { Json } from '@/lib/types/supabase';

// Import modern tldraw functions and types
import { loadSnapshot, getSnapshot, Editor } from '@tldraw/tldraw';

// Modern tldraw APIs
type TLStoreSnapshot = Record<string, unknown>;

interface UseTldrawPersistenceOptions {
  wireframeId: string;
  editor: Editor | null;
}

export function useTldrawPersistence({ 
  wireframeId, 
  editor
}: UseTldrawPersistenceOptions) {
  const hasLoadedInitialData = useRef(false);
  const lastSavedSnapshot = useRef<string | null>(null);

  // Load initial data from Supabase - ONLY ONCE
  const loadInitialData = useCallback(async () => {
    if (!editor || hasLoadedInitialData.current) return;

    try {
      console.log('Loading tldraw data from Supabase...');
      const wireframe = await getWireframe(wireframeId);
      
      if (wireframe?.tldraw_data) {
        const snapshotData = wireframe.tldraw_data as unknown as TLStoreSnapshot;
        
        // Basic validation - just check if it's an object
        if (!snapshotData || typeof snapshotData !== 'object') {
          console.warn('Invalid tldraw snapshot data: not an object');
          return;
        }
        
        // Try to load the snapshot using modern tldraw API
        try {
          await loadSnapshot(editor.store, snapshotData);
          lastSavedSnapshot.current = JSON.stringify(snapshotData);
          console.log('Tldraw data loaded successfully with modern API');
        } catch (loadError) {
          console.error('Failed to load snapshot into tldraw:', loadError);
          console.log('Continuing with empty canvas due to load error');
        }
      } else {
        console.log('No existing tldraw data found');
      }
    } catch (error) {
      console.error('Failed to load tldraw data:', error);
    } finally {
      hasLoadedInitialData.current = true;
    }
  }, [editor, wireframeId]);

  // Manual save function - ONLY when explicitly called
  const saveNow = useCallback(async () => {
    if (!editor) return;

    try {
      console.log('Manually saving tldraw data...');
      const snapshot = getSnapshot(editor.store);
      const snapshotString = JSON.stringify(snapshot);
      
      // Don't save if it's the same as the last saved snapshot
      if (lastSavedSnapshot.current === snapshotString) {
        console.log('No changes detected, skipping save');
        return;
      }

      await updateWireframeTldrawData(wireframeId, { 
        tldraw_data: JSON.parse(snapshotString) as Json
      });
      lastSavedSnapshot.current = snapshotString;
      console.log('Manual save completed with modern API');
    } catch (error) {
      console.error('Failed to manually save tldraw data:', error);
      throw error;
    }
  }, [editor, wireframeId]);

  // Load initial data when editor is ready - NO STORE LISTENING
  useEffect(() => {
    if (!editor) return;
    loadInitialData();
  }, [editor, loadInitialData]);

  return {
    saveNow,
    hasLoadedInitialData: hasLoadedInitialData.current,
  };
} 