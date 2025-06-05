import { useCallback, useEffect, useRef } from 'react';
import { updateWireframeTldrawData, getWireframe } from '@/lib/services/powerframeService';
import { Json } from '@/lib/types/supabase';

// Dynamic types that will be loaded at runtime
// These avoid direct imports that cause duplicate library issues
type TLStoreSnapshot = Record<string, unknown>;
type Editor = {
  store: {
    getSnapshot: () => TLStoreSnapshot;
    loadSnapshot: (snapshot: TLStoreSnapshot) => void;
    listen: (callback: () => void, options?: { scope: string }) => () => void;
  };
};

interface UseTldrawPersistenceOptions {
  wireframeId: string;
  editor: Editor | null;
  autoSaveIntervalMs?: number;
}

// Custom debounce function
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  
  return debounced as T & { cancel: () => void };
}

export function useTldrawPersistence({ 
  wireframeId, 
  editor, 
  autoSaveIntervalMs = 2000 
}: UseTldrawPersistenceOptions) {
  const hasLoadedInitialData = useRef(false);
  const lastSavedSnapshot = useRef<string | null>(null);

  // Debounced save function to avoid too frequent saves
  const debouncedSave = useCallback(
    debounce(async (snapshot: TLStoreSnapshot) => {
      try {
        const snapshotString = JSON.stringify(snapshot);
        
        // Don't save if it's the same as the last saved snapshot
        if (lastSavedSnapshot.current === snapshotString) {
          return;
        }

        console.log('Saving tldraw data to Supabase...');
        await updateWireframeTldrawData(wireframeId, { 
          tldraw_data: JSON.parse(snapshotString) as Json
        });
        
        lastSavedSnapshot.current = snapshotString;
        console.log('Tldraw data saved successfully');
      } catch (error) {
        console.error('Failed to save tldraw data:', error);
      }
    }, autoSaveIntervalMs),
    [wireframeId, autoSaveIntervalMs]
  );

  // Load initial data from Supabase
  const loadInitialData = useCallback(async () => {
    if (!editor || hasLoadedInitialData.current) return;

    try {
      console.log('Loading tldraw data from Supabase...');
      const wireframe = await getWireframe(wireframeId);
      
      if (wireframe?.tldraw_data) {
        // Load the saved state into the editor
        const snapshot = wireframe.tldraw_data as unknown as TLStoreSnapshot;
        editor.store.loadSnapshot(snapshot);
        lastSavedSnapshot.current = JSON.stringify(snapshot);
        console.log('Tldraw data loaded successfully');
      } else {
        console.log('No existing tldraw data found');
      }
    } catch (error) {
      console.error('Failed to load tldraw data:', error);
    } finally {
      hasLoadedInitialData.current = true;
    }
  }, [editor, wireframeId]);

  // Manual save function for immediate saves
  const saveNow = useCallback(async () => {
    if (!editor) return;

    const snapshot = editor.store.getSnapshot();
    try {
      console.log('Manually saving tldraw data...');
      const snapshotString = JSON.stringify(snapshot);
      await updateWireframeTldrawData(wireframeId, { 
        tldraw_data: JSON.parse(snapshotString) as Json
      });
      lastSavedSnapshot.current = snapshotString;
      console.log('Manual save completed');
    } catch (error) {
      console.error('Failed to manually save tldraw data:', error);
      throw error;
    }
  }, [editor, wireframeId]);

  // Set up auto-save when editor changes
  useEffect(() => {
    if (!editor) return;

    // Load initial data when editor is ready
    loadInitialData();

    // Set up auto-save listener
    const unsubscribe = editor.store.listen(() => {
      const snapshot = editor.store.getSnapshot();
      debouncedSave(snapshot);
    }, { scope: 'document' });

    return () => {
      unsubscribe();
      debouncedSave.cancel();
    };
  }, [editor, loadInitialData, debouncedSave]);

  return {
    saveNow,
    hasLoadedInitialData: hasLoadedInitialData.current,
  };
} 