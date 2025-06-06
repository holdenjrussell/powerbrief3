import { useCallback, useEffect, useRef } from 'react';
import { updateWireframeTldrawData, getWireframe } from '@/lib/services/powerframeService';
import { Json } from '@/lib/types/supabase';

// Modern tldraw APIs - avoid deprecated store methods
type TLStoreSnapshot = Record<string, unknown>;
type Editor = {
  store: {
    getSnapshot?: () => TLStoreSnapshot; // Deprecated - we'll use tldraw functions instead
    loadSnapshot?: (snapshot: TLStoreSnapshot) => void; // Deprecated
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
  autoSaveIntervalMs = 10000  // Much longer interval - 10 seconds
}: UseTldrawPersistenceOptions) {
  const hasLoadedInitialData = useRef(false);
  const lastSavedSnapshot = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Much less aggressive debounced save function
  const debouncedSave = useCallback(
    debounce(async () => {
      if (!editor) return;
      
      try {
        // Use editor's built-in snapshot methods to avoid conflicts
        const snapshot = editor.store.getSnapshot();
        
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
    [wireframeId, autoSaveIntervalMs, editor]
  );

  // Load initial data from Supabase
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
          lastSavedSnapshot.current = JSON.stringify(snapshotData);
          console.log('Tldraw data loaded successfully');
        } catch (loadError) {
          console.error('Failed to load snapshot into tldraw:', loadError);
          console.log('Snapshot data that failed:', snapshotData);
          // Don't throw - just continue with empty canvas
          console.log('Continuing with empty canvas due to load error');
        }
      } else {
        console.log('No existing tldraw data found');
      }
    } catch (error) {
      console.error('Failed to load tldraw data:', error);
      // Don't throw the error - just log it and continue with empty canvas
    } finally {
      hasLoadedInitialData.current = true;
    }
  }, [editor, wireframeId]);

  // Manual save function for immediate saves
  const saveNow = useCallback(async () => {
    if (!editor) return;

    try {
      console.log('Manually saving tldraw data...');
      const snapshot = editor.store.getSnapshot();
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

  // Set up auto-save when editor changes - with much reduced frequency
  useEffect(() => {
    if (!editor) return;

    // Load initial data when editor is ready
    loadInitialData();

    // Much less aggressive auto-save listener - only listen occasionally
    let isThrottled = false;
    const throttledListener = () => {
      if (isThrottled) return;
      isThrottled = true;
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Much longer timeout to avoid interfering with user interactions
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave();
        isThrottled = false;
      }, 5000); // Wait 5 seconds before attempting save (much longer)
    };

    const unsubscribe = editor.store.listen(throttledListener, { scope: 'document' });

    return () => {
      unsubscribe();
      debouncedSave.cancel();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editor, loadInitialData, debouncedSave]);

  return {
    saveNow,
    hasLoadedInitialData: hasLoadedInitialData.current,
  };
} 