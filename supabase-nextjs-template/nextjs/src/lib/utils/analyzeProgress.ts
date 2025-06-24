// In-memory storage for analyze progress
interface AnalyzeProgress {
  progress: number;
  message: string;
  currentAd: number;
  totalAds: number;
  timestamp: number;
}

const analyzeProgressMap = new Map<string, AnalyzeProgress>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analyzeProgressMap.entries()) {
    if (now - value.timestamp > 600000) { // 10 minutes
      analyzeProgressMap.delete(key);
    }
  }
}, 60000); // Check every minute

export function setAnalyzeProgress(requestId: string, currentAd: number, totalAds: number, message: string) {
  const progress = totalAds > 0 ? Math.round((currentAd / totalAds) * 100) : 0;
  analyzeProgressMap.set(requestId, {
    progress,
    message,
    currentAd,
    totalAds,
    timestamp: Date.now()
  });
}

export function getAnalyzeProgress(requestId: string): AnalyzeProgress | null {
  return analyzeProgressMap.get(requestId) || null;
}

export function clearAnalyzeProgress(requestId: string) {
  analyzeProgressMap.delete(requestId);
} 