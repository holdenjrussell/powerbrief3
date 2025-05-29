# Video Compression Quality Improvements

## Overview

We've significantly improved video compression quality to address pixelation issues, especially during clip transitions. The new compression system provides multiple quality levels and optimized encoding parameters.

## Key Improvements

### 1. **Higher Quality Encoding**
- **Lower CRF values**: Now using CRF 18-20 (was 23-28) for superior visual quality
- **Higher bitrates**: Now using 5M-8M bitrates (was 2M-4M) for smoother transitions
- **Better presets**: Using 'slow' and 'veryslow' presets for optimal quality

### 2. **Optimized for Transitions**
- **Shorter keyframe intervals**: 20-30 frames (was 60) for better transition handling
- **Advanced motion estimation**: UMH method with larger search ranges
- **Scene change detection**: Optimized thresholds for better cut handling
- **B-frame optimization**: More B-frames for better compression efficiency

### 3. **Quality Levels**

| Quality Level | Use Case | CRF | Bitrate | Preset | Processing Time |
|---------------|----------|-----|---------|--------|-----------------|
| **Fast** | Quick previews | 23-25 | 3M-4M | medium | ~1.5s per MB |
| **Balanced** | General use | 20-22 | 5M-6M | slow/medium | ~2.5s per MB |
| **High** | Ad uploads (current default) | 18-20 | 7M-8M | slow | ~4s per MB |
| **Ultra** | Archival quality | 16-18 | 10M-12M | veryslow | ~8s per MB |

## Current Configuration

**Default Quality**: `HIGH` - Provides excellent quality with reasonable processing time, optimized for Meta ad uploads.

## How to Adjust Quality Settings

### Quick Configuration
Edit the `DEFAULT_COMPRESSION_QUALITY` setting in `/src/lib/utils/videoCompression.ts`:

```typescript
export const DEFAULT_COMPRESSION_QUALITY: CompressionQuality = 'high'; // Change this
```

Available options:
- `'fast'` - For quick processing when quality is less critical
- `'balanced'` - Good balance of quality and speed
- `'high'` - **Current default** - Excellent quality for ad uploads
- `'ultra'` - Maximum quality for archival purposes

### Advanced Configuration
For fine-tuned control, modify the `getCompressionSettings()` function parameters:

- **CRF**: Lower values = higher quality (16-28 range)
- **Bitrate**: Higher values = better quality but larger files
- **Preset**: slower = better quality (ultrafast → veryslow)

## Technical Details

### Encoding Parameters (High Quality)
- **Video Codec**: H.264 (libx264)
- **CRF**: 18-20 (constant rate factor for quality)
- **Bitrate**: 7M-8M maximum
- **Preset**: slow (balanced quality/speed)
- **Profile**: high (better compression features)
- **Audio**: AAC 192k, 48kHz stereo

### Advanced Features
- **Adaptive quantization**: Better detail preservation
- **Trellis quantization**: Improved compression efficiency
- **Mixed references**: Better motion prediction
- **Psychovisual optimization**: Better perceived quality

## Testing Results

With the new `HIGH` quality setting:
- ✅ Significantly reduced pixelation during transitions
- ✅ Better detail preservation in motion scenes
- ✅ Improved color accuracy and gradients
- ✅ Still maintains Meta compatibility
- ⚠️ Processing time increased ~2x (worth it for quality)

## Troubleshooting

### If videos are still pixelated:
1. Try changing to `'ultra'` quality for maximum quality
2. Check if original video has sufficient quality
3. Ensure sufficient processing time/resources

### If processing is too slow:
1. Use `'balanced'` for faster processing
2. Consider `'fast'` for quick previews
3. Process smaller batches

### If file sizes are too large:
1. The system auto-adjusts for files >200MB
2. Consider using `'balanced'` instead of `'high'`
3. Check Meta's upload limits (typically handled automatically)

## Support

For issues or questions:
1. Check console logs for compression details
2. Verify file formats are supported (MP4, MOV, AVI)
3. Ensure sufficient browser memory for large files

---

**Note**: These improvements apply to all upload areas: PowerBrief Asset Upload, Ad Uploader Tool, and Public Sharing features. 