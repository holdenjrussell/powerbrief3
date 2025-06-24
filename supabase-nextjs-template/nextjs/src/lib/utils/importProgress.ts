// Simple in-memory progress tracking for import operations
// In production, you might want to use Redis or a database

interface ImportProgress {
  progress: number;
  message: string;
  timestamp: number;
}

// Store progress by request ID
const progressStore = new Map<string, ImportProgress>();

// Clean up old entries after 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_AGE = 5 * 60 * 1000;

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of progressStore.entries()) {
    if (now - value.timestamp > MAX_AGE) {
      progressStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function setImportProgress(requestId: string, progress: number, message: string) {
  progressStore.set(requestId, {
    progress,
    message,
    timestamp: Date.now()
  });
}

export function getImportProgress(requestId: string): ImportProgress | null {
  return progressStore.get(requestId) || null;
}

export function clearImportProgress(requestId: string) {
  progressStore.delete(requestId);
}

export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
} 