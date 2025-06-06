import { useCallback, useEffect, useRef } from 'react';
import { updateWireframeTldrawData, getWireframe } from '@/lib/services/powerframeService';
import { Json } from '@/lib/types/supabase';

// Modern tldraw APIs - avoid deprecated store methods
type TLStoreSnapshot = Record<string, unknown>;
type Editor = {
  store: {
    getSnapshot?: () => TLStoreSnapshot;
    loadSnapshot?: (snapshot: TLStoreSnapshot) => void;
  };
};

interface UseTldrawPersistenceOptions {
  wireframeId: string;
  editor: Editor | null;
}

export function useTldrawPersistence({ 
  wireframeId, 
  editor
}: UseTldrawPersistenceOptions) {
  const hasLoadedInitialData = useRef(false);

  // Load initial data from Supabase (one-time only)
  const loadInitialData = useCallback(async () => {
    if (!editor || hasLoadedInitialData.current) return;

    try {
      console.log('Loading tldraw data from Supabase...');
      const wireframe = await getWireframe(wireframeId);
      
      if (wireframe?.tldraw_data) {
        // More lenient validation for tldraw snapshot data
        const snapshotData = wireframe.tldraw_data as unknown as TLStoreSnapshot;
        
        // Basic validation - just check if it's an object
        if (!snapshotData || typeof snapshotData !== 'object') {
          console.warn('Invalid tldraw snapshot data: not an object');
          return;
        }
        
        // Log the structure for debugging
        console.log('Tldraw snapshot structure:', Object.keys(snapshotData));
        
        // Try to load the snapshot with error handling
        try {
          editor.store.loadSnapshot(snapshotData);
          console.log('Tldraw data loaded successfully - now using local persistence');
        } catch (loadError) {
          console.error('Failed to load snapshot into tldraw:', loadError);
          console.log('Snapshot data that failed:', snapshotData);
          // Don't throw - just continue with empty canvas
          console.log('Continuing with empty canvas due to load error');
        }
      } else {
        console.log('No existing tldraw data found - starting with empty canvas');
      }
    } catch (error) {
      console.error('Failed to load tldraw data:', error);
      // Don't throw the error - just log it and continue with empty canvas
    } finally {
      hasLoadedInitialData.current = true;
    }
  }, [editor, wireframeId]);

  // Manual save function for explicit saves
  const saveNow = useCallback(async () => {
    if (!editor) return;

    try {
      console.log('Manually saving tldraw data to Supabase...');
      const snapshot = editor.store.getSnapshot();
      const snapshotString = JSON.stringify(snapshot);
      await updateWireframeTldrawData(wireframeId, { 
        tldraw_data: JSON.parse(snapshotString) as Json
      });
      console.log('Manual save to Supabase completed');
    } catch (error) {
      console.error('Failed to manually save tldraw data:', error);
      throw error;
    }
  }, [editor, wireframeId]);

  // Load initial data when editor is ready (no auto-save listeners)
  useEffect(() => {
    if (!editor) return;

    // Only load initial data - no auto-save
    loadInitialData();
    
    // Let tldraw handle its own local persistence from here
    console.log('Tldraw persistence initialized - using local storage only. Save to Supabase manually.');
  }, [editor, loadInitialData]);

  return {
    saveNow,
    hasLoadedInitialData: hasLoadedInitialData.current,
  };
} 