# Ad Upload Tool: Thumbnail & Asset Grouping Issues Analysis

## Current Issues Identified

### 1. Thumbnail Generation Problems

#### Issue: Thumbnails Not Populating in Sheet View
- **Root Cause**: Thumbnails are being generated and uploaded to storage, but not consistently saved to the `thumbnail_url` column in the database
- **Impact**: Users see missing thumbnail indicators and have to manually generate thumbnails using the scrubber tool

#### Current Thumbnail Flow Issues:
1. **PowerBriefAssetUpload**: Generates thumbnails during upload but may not save to database properly
2. **Send-to-Ad-Batch**: Transfers `thumbnailUrl` from concept assets but may get lost in the process
3. **Ad Review → Approval → Batch Upload**: Thumbnail URLs may not persist through status changes
4. **Meta Launch**: Looks for thumbnails but can't find them due to missing database entries

### 2. Asset Grouping Problems

#### Issue: Incorrect Asset Grouping by Editors
- **Current Behavior**: Editors are grouping all 4x5 assets together and all 9x16 assets together
- **Desired Behavior**: Group V1, V2, V3 versions together (each version should have both 4x5 and 9x16)
- **Impact**: Incorrect ad creative organization and placement targeting

#### Issue: Inconsistent Aspect Ratio Detection
- **Root Cause**: Various naming formats not being detected properly
- **Current Detection**: Only looks for exact patterns like `_4x5` and `_9x16`
- **Reality**: Files have different formats like `ProductDemo-4x5-v1.mp4`, `concept_v2_4x5.mp4`, etc.

## Proposed Solutions

### 1. Fix Thumbnail Generation & Persistence

#### A. Enhance PowerBriefAssetUpload Thumbnail Saving
```typescript
// In PowerBriefAssetUpload.tsx - after thumbnail upload
if (thumbnailPublicUrl) {
  // Save thumbnail URL to database immediately
  const { error: dbError } = await supabase
    .from('ad_draft_assets')
    .update({ thumbnail_url: thumbnailPublicUrl })
    .eq('ad_draft_id', conceptId)
    .eq('name', assetFile.file.name);
    
  if (dbError) {
    console.error('Failed to save thumbnail URL to database:', dbError);
  }
}
```

#### B. Auto-Generate Thumbnails on Public Page Submission
```typescript
// Add to PowerBriefAssetUpload.tsx processAndUpload function
// After successful asset upload, automatically generate and save thumbnails
const autoGenerateThumbnails = async (uploadedAssets: UploadedAsset[]) => {
  const videoAssets = uploadedAssets.filter(asset => asset.type === 'video');
  
  for (const videoAsset of videoAssets) {
    try {
      // Extract thumbnail from video URL
      const { thumbnailBlob, error } = await extractVideoThumbnailFromUrl(videoAsset.supabaseUrl);
      
      if (!error && thumbnailBlob) {
        // Upload thumbnail
        const thumbnailPath = `${conceptId}/${Date.now()}_${videoAsset.name.split('.')[0]}_thumbnail.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from('ad-creatives')
          .upload(thumbnailPath, thumbnailBlob);
          
        if (!uploadError && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('ad-creatives')
            .getPublicUrl(thumbnailPath);
            
          // Save to database
          await supabase
            .from('ad_draft_assets')
            .update({ thumbnail_url: publicUrl })
            .eq('supabase_url', videoAsset.supabaseUrl);
        }
      }
    } catch (error) {
      console.error('Auto thumbnail generation failed:', error);
    }
  }
};
```

#### C. Add Thumbnail Scrubber to Public Pages
- Allow editors to adjust thumbnails before submission
- Provide custom thumbnail upload option
- Save thumbnail preferences to database immediately

### 2. Improve Asset Grouping

#### A. Enhanced Aspect Ratio Detection
```typescript
// Improved detection function
const detectAspectRatioFromFilename = (filename: string): string | null => {
  const normalizedName = filename.toLowerCase();
  
  // More comprehensive patterns
  const patterns = [
    // Standard patterns
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
    
    // At end of filename
    /4x5$/,
    /9x16$/,
    /16x9$/,
    /1x1$/,
    
    // With dots
    /\.4x5\./,
    /\.9x16\./,
    /\.16x9\./,
    /\.1x1\./
  ];
  
  for (const pattern of patterns) {
    const match = normalizedName.match(pattern);
    if (match) {
      return match[0].replace(/[^0-9x]/g, ''); // Extract just the ratio
    }
  }
  
  return null;
};
```

#### B. Improved Grouping Logic
```typescript
// Enhanced grouping that prioritizes version over aspect ratio
const getBaseNameAndVersion = (filename: string): { baseName: string; version: string | null; aspectRatio: string | null } => {
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Remove known suffixes
  const suffixesToRemove = ['_compressed', '-compressed', '_comp', '-comp'];
  for (const suffix of suffixesToRemove) {
    if (nameWorkInProgress.endsWith(suffix)) {
      nameWorkInProgress = nameWorkInProgress.substring(0, nameWorkInProgress.length - suffix.length);
      break;
    }
  }
  
  // Extract aspect ratio
  const aspectRatio = detectAspectRatioFromFilename(nameWorkInProgress);
  if (aspectRatio) {
    // Remove aspect ratio from name
    nameWorkInProgress = nameWorkInProgress.replace(new RegExp(`[_-]?${aspectRatio}[_-]?`, 'gi'), '');
  }
  
  // Extract version (v1, v2, v3, etc.)
  const versionMatch = nameWorkInProgress.match(/[_-]?v(\d+)[_-]?/i);
  let version = null;
  if (versionMatch) {
    version = `v${versionMatch[1]}`;
    nameWorkInProgress = nameWorkInProgress.replace(versionMatch[0], '');
  }
  
  return {
    baseName: nameWorkInProgress.trim(),
    version,
    aspectRatio
  };
};

// Group by baseName + version, not by aspect ratio
const groupAssetsByVersion = (files: AssetFile[]): Record<string, AssetFile[]> => {
  const groups: Record<string, AssetFile[]> = {};
  
  files.forEach(file => {
    const { baseName, version } = getBaseNameAndVersion(file.file.name);
    const groupKey = version ? `${baseName}_${version}` : baseName;
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(file);
  });
  
  return groups;
};
```

#### C. Add Clear Instructions for Editors
```typescript
// Enhanced UI instructions in AssetImportModal
const GroupingInstructions = () => (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
    <h4 className="text-sm font-semibold text-blue-800 mb-2">
      📝 Asset Grouping Guidelines
    </h4>
    <div className="text-sm text-blue-700 space-y-2">
      <p><strong>Correct Grouping:</strong> Group by version (V1, V2, V3), not by aspect ratio</p>
      <p><strong>Example:</strong></p>
      <ul className="ml-4 space-y-1">
        <li>• Group 1: ProductDemo_v1_4x5.mp4 + ProductDemo_v1_9x16.mp4</li>
        <li>• Group 2: ProductDemo_v2_4x5.mp4 + ProductDemo_v2_9x16.mp4</li>
      </ul>
      <p className="text-red-600"><strong>Avoid:</strong> Grouping all 4x5 together and all 9x16 together</p>
    </div>
  </div>
);
```

### 3. Database Schema Enhancements

#### A. Add Thumbnail Timestamp Field
```sql
-- Already exists in migration
ALTER TABLE ad_draft_assets 
ADD COLUMN thumbnail_timestamp DECIMAL;

COMMENT ON COLUMN ad_draft_assets.thumbnail_timestamp IS 'Timestamp in seconds where custom thumbnail was captured from video';
```

#### B. Add Asset Version Tracking
```sql
ALTER TABLE ad_draft_assets 
ADD COLUMN asset_version TEXT,
ADD COLUMN aspect_ratio TEXT;

COMMENT ON COLUMN ad_draft_assets.asset_version IS 'Version identifier (v1, v2, v3, etc.)';
COMMENT ON COLUMN ad_draft_assets.aspect_ratio IS 'Detected aspect ratio (4x5, 9x16, etc.)';
```

### 4. Implementation Priority

#### Phase 1: Critical Fixes (Immediate)
1. Fix thumbnail persistence in PowerBriefAssetUpload
2. Ensure thumbnails transfer properly in send-to-ad-batch
3. Add auto-thumbnail generation for public page submissions

#### Phase 2: Enhanced Detection (Week 1)
1. Implement improved aspect ratio detection
2. Update grouping logic to prioritize versions
3. Add clear UI instructions for editors

#### Phase 3: Advanced Features (Week 2)
1. Add thumbnail scrubber to public pages
2. Implement custom thumbnail upload
3. Add database schema enhancements

### 5. Testing Strategy

#### A. Thumbnail Testing
1. Upload videos via public concept page → verify thumbnails appear in sheet view
2. Send concept to ad upload → verify thumbnails persist
3. Launch ads to Meta → verify thumbnails are found and used

#### B. Grouping Testing
1. Upload files with various naming conventions
2. Verify correct grouping by version, not aspect ratio
3. Test aspect ratio detection with edge cases

### 6. Monitoring & Alerts

#### A. Add Logging
```typescript
// Enhanced logging for thumbnail operations
const logThumbnailOperation = (operation: string, videoName: string, success: boolean, error?: string) => {
  console.log(`[THUMBNAIL] ${operation} - ${videoName}: ${success ? 'SUCCESS' : 'FAILED'}`, error ? { error } : {});
};
```

#### B. Add Health Checks
- Monitor thumbnail generation success rates
- Alert when thumbnail URLs are missing for video assets
- Track asset grouping accuracy

This comprehensive approach should resolve both the thumbnail persistence issues and the asset grouping problems while providing a better user experience for video editors.