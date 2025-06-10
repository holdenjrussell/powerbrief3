# 4x5 Aspect Ratio Facebook Feed Placement Fix

## Issue Summary
The ad uploader tool was not correctly placing 4x5 aspect ratio video assets in Facebook Feed placements. Instead, these videos were using Meta's default placement optimization, which often resulted in placement on Stories or other positions rather than the intended Facebook Feed.

## Root Cause Analysis

### Primary Issue: Video Assets Bypass Placement Customization
The main problem was in `/api/meta/launch-ads/route.ts` around **lines 1462-1515**. When the system detected video assets (including 4x5 videos), it would:

1. Use a "primary asset" approach with `object_story_spec`
2. Completely delete the `asset_feed_spec` object
3. Skip all placement customization logic
4. Let Meta's algorithm choose placements automatically

```typescript
// OLD PROBLEMATIC CODE:
if (hasVideos) {
  // Uses primary asset approach - NO placement customization
  delete creativeSpec.asset_feed_spec; // ❌ This removed all placement targeting!
}
```

### Secondary Issues
1. **Single Video Assets**: Even single 4x5 videos would use `object_story_spec` without placement targeting
2. **Mixed Asset Handling**: When ads had both videos and images, only the first video was used
3. **Format Deduplication**: Missing checks for duplicate ad formats in the array

## Solution Implemented

### 1. **Enhanced Video Placement Targeting**
Now video assets (including 4x5 videos) use `asset_feed_spec` with explicit placement targeting:

```typescript
// NEW FIXED CODE:
if (hasVideos) {
  console.log(`[Launch API]     Videos detected - using asset_feed_spec for proper placement targeting`);
  
  // Add feed videos with placement targeting for Facebook Feed
  feedAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
    const assetLabel = `feed_asset_${index}`;
    if (asset.type === 'video' && asset.metaVideoId) {
      const thumbnailHash = videoThumbnailCache[asset.metaVideoId];
      
      creativeSpec.asset_feed_spec.videos.push({
        video_id: asset.metaVideoId,
        adlabels: [{ name: assetLabel }],
        ...(thumbnailHash && { thumbnail_hash: thumbnailHash })
      });
      
      // CRITICAL: Add placement targeting for 4x5 videos to show in Facebook Feed!
      creativeSpec.asset_feed_spec.asset_customization_rules.push({
        customization_spec: {
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video'],
          instagram_positions: ['stream', 'explore']
        },
        video_label: { name: assetLabel }
      });
    }
  });
}
```

### 2. **Single Video Asset Support**
Added special handling for single 4x5 video assets to ensure they get proper Facebook Feed placement:

```typescript
if (hasSingleVideoAsset) {
  // For single video assets, use asset_feed_spec to maintain placement targeting
  console.log(`[Launch API]     Single video asset - using asset_feed_spec for placement targeting`);
  
  if (feedAssets.length > 0) {
    const feedAsset = feedAssets[0];
    // ... configure asset_feed_spec with explicit Facebook Feed targeting
    
    // CRITICAL: Add placement targeting for 4x5 videos to ensure Facebook Feed placement
    creativeSpec.asset_feed_spec.asset_customization_rules.push({
      customization_spec: {
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video'],
        instagram_positions: ['stream', 'explore']
      },
      video_label: { name: assetLabel }
    });
  }
}
```

### 3. **Format Deduplication**
Added checks to prevent duplicate ad formats:

```typescript
if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_VIDEO')) {
  creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
}
```

## Key Changes Made

### File: `supabase-nextjs-template/nextjs/src/app/api/meta/launch-ads/route.ts`

1. **Lines ~1467-1540**: Complete rewrite of video handling logic to use `asset_feed_spec` instead of `object_story_spec`
2. **Lines ~1590-1650**: Enhanced single asset handling for videos with placement targeting
3. **Multiple locations**: Added format deduplication checks

### Specific Placement Targeting for 4x5 Videos
- **Facebook positions**: `['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video']`
- **Instagram positions**: `['stream', 'explore']`

This ensures 4x5 videos appear in:
- ✅ Facebook Feed (main target)
- ✅ Facebook Video Feeds
- ✅ Facebook Marketplace
- ✅ Instagram Explore
- ✅ Other compatible placements

## How to Test the Fix

### 1. **Upload a 4x5 Video Asset**
1. Create or find a video with 4x5 aspect ratio (800x1000 pixels, for example)
2. Name it clearly: `test_video_4x5.mp4` or `product_demo_4:5.mp4`
3. Upload it through the ad uploader tool

### 2. **Check Asset Detection**
Monitor the console logs for:
```
[Launch API]         - test_video_4x5.mp4: Using ratios ["4:5"] (detected: 4:5)
[Launch API]     Found 1 feed assets and 0 story assets
```

### 3. **Verify Placement Targeting**
Look for these console messages:
```
[Launch API]     Videos detected - using asset_feed_spec for proper placement targeting
[Launch API]     Added 1 feed assets and 0 story assets with explicit placement targeting for videos
```

### 4. **Check Meta Ad Manager**
After launching the ad:
1. Go to Meta Ad Manager
2. Find your created ad
3. Check the "Placements" section
4. Verify it includes "Facebook Feed" and other expected placements

### 5. **Test Different Scenarios**
- Single 4x5 video only
- Multiple 4x5 videos
- Mixed 4x5 video + 1x1 image
- Mixed 4x5 video + 9x16 video

## Expected Behavior After Fix

### Before Fix (❌ Problematic)
- 4x5 videos used `object_story_spec`
- No explicit placement targeting
- Meta's algorithm chose placements randomly
- Often appeared in Stories instead of Feed

### After Fix (✅ Correct)
- 4x5 videos use `asset_feed_spec` with explicit rules
- Clear placement targeting for Facebook Feed
- Videos appear exactly where intended
- Better ad performance and user experience

## Monitoring and Debugging

### Console Log Indicators of Success
```
[Launch API]     Videos detected - using asset_feed_spec for proper placement targeting
[Launch API]     Single 4x5 video configured for Facebook Feed placement: video_name.mp4
[Launch API]     Added X feed assets and Y story assets with explicit placement targeting for videos
```

### Console Log Indicators of Issues
```
[Launch API]     Videos detected - using object_story_spec instead of asset_feed_spec  // ❌ Old behavior
[Launch API]     Using primary asset: video_name.mp4 (video)  // ❌ Old single-asset approach
```

### What to Watch For
1. **Aspect Ratio Detection**: Ensure filenames contain `4x5`, `4:5`, or similar patterns
2. **Asset Categorization**: 4x5 videos should appear in `feedAssets`, not `storyAssets`
3. **Creative Spec**: Should contain `asset_feed_spec.videos` array, not just `object_story_spec.video_data`
4. **Placement Rules**: Should contain `asset_customization_rules` with Facebook positions

## Performance Impact

### Positive Changes
- ✅ More accurate placement targeting
- ✅ Better ad performance due to proper placement
- ✅ Improved user experience (4x5 videos in correct feed format)
- ✅ More predictable ad delivery

### Technical Considerations
- The fix maintains backward compatibility
- Single image assets still use optimized `object_story_spec`
- Mixed asset types are properly handled
- No performance degradation expected

## Future Enhancements

Consider these improvements for even better placement control:

1. **UI Placement Selection**: Allow users to manually select target placements
2. **A/B Testing**: Compare performance of different placement strategies
3. **Smart Recommendations**: Suggest optimal placements based on asset dimensions
4. **Placement Analytics**: Track performance by placement type

## Conclusion

This fix ensures that 4x5 aspect ratio videos are correctly placed in Facebook Feed and other appropriate placements, rather than being subject to Meta's automatic placement optimization. The solution maintains compatibility with existing functionality while providing precise control over where video ads appear.

The implementation uses Meta's official `asset_feed_spec` API with explicit `asset_customization_rules` to guarantee placement targeting works as expected. 