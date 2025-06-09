/**
 * Shared utility functions for aspect ratio detection and filename parsing
 * Used across PowerBriefAssetUpload, AssetImportModal, and Meta API
 */

// Constants
export const ASPECT_RATIO_IDENTIFIERS = ['4x5', '9x16', '16x9', '1x1'];
export const KNOWN_FILENAME_SUFFIXES_TO_REMOVE = ['_compressed', '-compressed', '_comp', '-comp'];

// Timeout constants
export const TIMEOUTS = {
  THUMBNAIL_EXTRACTION: 30000, // 30 seconds
  VIDEO_DIMENSIONS: 10000,     // 10 seconds
  TOAST_AUTO_REMOVE: 5000,     // 5 seconds
} as const;

/**
 * Enhanced aspect ratio detection function that handles various naming conventions
 * @param filename - The filename to analyze
 * @returns The detected aspect ratio in x format (e.g., "4x5") or null if not found
 */
export function detectAspectRatioFromFilename(filename: string): string | null {
  const normalizedName = filename.toLowerCase();
  
  // Comprehensive patterns to catch various naming conventions
  const patterns = [
    // Standard patterns with separators
    /[_-]4x5[_-]?/,
    /[_-]9x16[_-]?/,
    /[_-]16x9[_-]?/,
    /[_-]1x1[_-]?/,
    
    // With parentheses
    /\(4x5\)/,
    /\(9x16\)/,
    /\(16x9\)/,
    /\(1x1\)/,
    
    // With spaces
    /\s4x5\s/,
    /\s9x16\s/,
    /\s16x9\s/,
    /\s1x1\s/,
    
    // At end of filename (before extension)
    /4x5$/,
    /9x16$/,
    /16x9$/,
    /1x1$/,
    
    // With dots
    /\.4x5\./,
    /\.9x16\./,
    /\.16x9\./,
    /\.1x1\./,
    
    // Alternative formats with colon
    /[_-]4:5[_-]?/,
    /[_-]9:16[_-]?/,
    /[_-]16:9[_-]?/,
    /[_-]1:1[_-]?/,
    
    // Handle decimal ratios
    /[_-]4\.0x5\.0[_-]?/,
    /[_-]9\.0x16\.0[_-]?/,
    /[_-]16\.0x9\.0[_-]?/,
    /[_-]1\.0x1\.0[_-]?/
  ];
  
  for (const pattern of patterns) {
    const match = normalizedName.match(pattern);
    if (match) {
      // Extract just the ratio and normalize to x format
      let ratio = match[0].replace(/[^0-9x:.]/g, '');
      
      // Normalize different formats to x format
      if (ratio.includes(':')) {
        ratio = ratio.replace(':', 'x');
      }
      
      // Remove decimal points for standard ratios
      ratio = ratio.replace(/\.0/g, '');
      
      return ratio;
    }
  }
  
  return null;
}

/**
 * Detects version information from filename
 * @param filename - The filename to analyze
 * @returns The detected version (e.g., "v1") or null if not found
 */
export function detectVersionFromFilename(filename: string): string | null {
  const versionPatterns = [
    /[_-]v(\d+)/i,
    /[_-]version(\d+)/i,
    /[_-]ver(\d+)/i,
    /\sv(\d+)/i,
    /\(v(\d+)\)/i
  ];
  
  for (const versionPattern of versionPatterns) {
    const match = filename.match(versionPattern);
    if (match) {
      return `v${match[1]}`;
    }
  }
  
  return null;
}

/**
 * Removes known suffixes from filename
 * @param filename - The filename to clean
 * @param suffixesToRemove - Array of suffixes to remove
 * @returns Cleaned filename
 */
export function removeKnownSuffixes(filename: string, suffixesToRemove: string[] = KNOWN_FILENAME_SUFFIXES_TO_REMOVE): string {
  let cleanedName = filename;
  
  for (const suffix of suffixesToRemove) {
    if (cleanedName.endsWith(suffix)) {
      cleanedName = cleanedName.substring(0, cleanedName.length - suffix.length);
      break;
    }
  }
  
  return cleanedName;
}

/**
 * Safely removes detected ratio pattern from filename
 * @param filename - The filename to process
 * @param detectedRatio - The detected aspect ratio
 * @returns Filename with ratio pattern removed
 */
export function removeRatioFromFilename(filename: string, detectedRatio: string): string {
  // Escape special regex characters to prevent injection issues
  const escapedRatio = detectedRatio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ratioPatterns = [
    new RegExp(`[_-]${escapedRatio}[_-]?`, 'gi'),
    new RegExp(`\\(${escapedRatio}\\)`, 'gi'),
    new RegExp(`\\s${escapedRatio}\\s`, 'gi'),
    new RegExp(`\\.${escapedRatio}\\.`, 'gi'),
    new RegExp(`${escapedRatio}$`, 'gi')
  ];
  
  let cleanedName = filename;
  for (const pattern of ratioPatterns) {
    if (pattern.test(cleanedName)) {
      cleanedName = cleanedName.replace(pattern, '').trim();
      break;
    }
  }
  
  return cleanedName;
}

/**
 * Safely removes version pattern from filename
 * @param filename - The filename to process
 * @param version - The detected version
 * @returns Filename with version pattern removed
 */
export function removeVersionFromFilename(filename: string, version: string): string {
  const versionPatterns = [
    new RegExp(`[_-]${version}`, 'gi'),
    new RegExp(`[_-]version${version.substring(1)}`, 'gi'),
    new RegExp(`[_-]ver${version.substring(1)}`, 'gi'),
    new RegExp(`\\s${version}`, 'gi'),
    new RegExp(`\\(${version}\\)`, 'gi')
  ];
  
  let cleanedName = filename;
  for (const pattern of versionPatterns) {
    if (pattern.test(cleanedName)) {
      cleanedName = cleanedName.replace(pattern, '').trim();
      break;
    }
  }
  
  return cleanedName;
}

/**
 * Comprehensive filename parsing that extracts base name, aspect ratio, and version
 * Prioritizes version-based grouping over aspect ratio grouping
 * @param filename - The filename to parse
 * @returns Parsed filename components
 */
export function parseFilename(filename: string): {
  baseName: string;
  detectedRatio: string | null;
  version: string | null;
  groupKey: string;
} {
  // Remove file extension
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Remove known trailing suffixes first
  nameWorkInProgress = removeKnownSuffixes(nameWorkInProgress);
  
  // Detect aspect ratio and remove it from the name
  const detectedRatio = detectAspectRatioFromFilename(nameWorkInProgress);
  if (detectedRatio) {
    nameWorkInProgress = removeRatioFromFilename(nameWorkInProgress, detectedRatio);
  }
  
  // Detect version and remove it from the name
  const version = detectVersionFromFilename(nameWorkInProgress);
  if (version) {
    nameWorkInProgress = removeVersionFromFilename(nameWorkInProgress, version);
  }
  
  const baseName = nameWorkInProgress.trim();
  
  // Create a group key that combines base name and version
  // This ensures assets with same version but different aspect ratios are grouped together
  const groupKey = version ? `${baseName}_${version}` : baseName;
  
  return {
    baseName,
    detectedRatio,
    version,
    groupKey
  };
}

/**
 * For Meta API compatibility - returns aspect ratio in colon format
 * @param filename - The filename to analyze
 * @returns The detected aspect ratio in colon format (e.g., "4:5") or null
 */
export function detectAspectRatioForMeta(filename: string): string | null {
  const ratio = detectAspectRatioFromFilename(filename);
  return ratio ? ratio.replace('x', ':') : null;
}