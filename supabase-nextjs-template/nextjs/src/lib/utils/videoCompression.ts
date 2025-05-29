import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// ========================================
// VIDEO COMPRESSION CONFIGURATION
// ========================================
// To improve video quality further (reduce pixelation), you can:
// 1. Change DEFAULT_COMPRESSION_QUALITY to 'ultra' for maximum quality (slower)
// 2. Change DEFAULT_COMPRESSION_QUALITY to 'high' for excellent quality (balanced)
// 3. Change DEFAULT_COMPRESSION_QUALITY to 'balanced' for good quality (faster)
// 4. Change DEFAULT_COMPRESSION_QUALITY to 'fast' for basic quality (fastest)
//
// Current setting provides good quality with faster processing time (~2x speed improvement)
export const DEFAULT_COMPRESSION_QUALITY: CompressionQuality = 'balanced';

// Advanced users: You can also modify the settings in getCompressionSettings() 
// function below to fine-tune CRF, bitrates, and other encoding parameters
// ========================================

let ffmpeg: FFmpeg | null = null;

// Initialize FFmpeg instance
const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Load FFmpeg core
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
};

// Check if a file needs compression (over 150MB)
export const needsCompression = (file: File): boolean => {
  const maxSizeBytes = 150 * 1024 * 1024; // 150MB in bytes
  return file.size > maxSizeBytes && file.type.startsWith('video/');
};

// Get file size in MB for display
export const getFileSizeMB = (file: File): number => {
  return file.size / (1024 * 1024);
};

// Compression quality levels
export type CompressionQuality = 'fast' | 'balanced' | 'high' | 'ultra';

// Get compression settings based on quality level
const getCompressionSettings = (fileSizeMB: number, quality: CompressionQuality = 'balanced') => {
  switch (quality) {
    case 'fast':
      return {
        crf: fileSizeMB > 200 ? '25' : '23',
        maxrate: fileSizeMB > 200 ? '3M' : '4M',
        audioRate: '128k',
        preset: 'medium',
        bufsize: '8M',
        keyframeInterval: '60',
        extraArgs: []
      };
    
    case 'balanced':
      return {
        crf: fileSizeMB > 200 ? '22' : '20',
        maxrate: fileSizeMB > 200 ? '5M' : '6M',
        audioRate: '160k',
        preset: fileSizeMB > 200 ? 'medium' : 'slow',
        bufsize: '12M',
        keyframeInterval: '30',
        extraArgs: [
          '-bf', '3',
          '-refs', '4',
          '-subq', '7',
          '-trellis', '1',
          '-me_method', 'umh',
          '-me_range', '16',
          '-sc_threshold', '40'
        ]
      };
    
    case 'high':
      return {
        crf: fileSizeMB > 200 ? '20' : '18',
        maxrate: fileSizeMB > 200 ? '7M' : '8M',
        audioRate: '192k',
        preset: 'slow',
        bufsize: '16M',
        keyframeInterval: '25',
        extraArgs: [
          '-bf', '4',
          '-refs', '6',
          '-subq', '9',
          '-trellis', '2',
          '-me_method', 'umh',
          '-me_range', '24',
          '-sc_threshold', '30',
          '-aq-mode', '2',
          '-aq-strength', '1.0'
        ]
      };
    
    case 'ultra':
      return {
        crf: fileSizeMB > 200 ? '18' : '16',
        maxrate: fileSizeMB > 200 ? '10M' : '12M',
        audioRate: '256k',
        preset: 'veryslow',
        bufsize: '20M',
        keyframeInterval: '20',
        extraArgs: [
          '-bf', '6',
          '-refs', '8',
          '-subq', '10',
          '-trellis', '2',
          '-me_method', 'umh',
          '-me_range', '32',
          '-sc_threshold', '25',
          '-aq-mode', '3',
          '-aq-strength', '1.2',
          '-psy-rd', '1.0:0.15',
          '-mixed-refs', '1',
          '-8x8dct', '1'
        ]
      };
      
    default:
      return getCompressionSettings(fileSizeMB, 'balanced');
  }
};

// Enhanced compress video file with quality options
export const compressVideoWithQuality = async (
  file: File,
  quality: CompressionQuality = 'balanced',
  onProgress?: (progress: number) => void
): Promise<File> => {
  try {
    const ffmpegInstance = await initFFmpeg();
    
    // Set up progress callback
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }
    
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';
    
    // Write input file to FFmpeg filesystem
    await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));
    
    const fileSizeMB = getFileSizeMB(file);
    const settings = getCompressionSettings(fileSizeMB, quality);
    
    console.log(`Compressing ${fileSizeMB.toFixed(2)}MB file with quality: ${quality}, CRF: ${settings.crf}, maxrate: ${settings.maxrate}, preset: ${settings.preset}`);
    
    // Build compression arguments
    const compressionArgs = [
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-preset', settings.preset,
      '-crf', settings.crf,
      '-maxrate', settings.maxrate,
      '-bufsize', settings.bufsize,
      '-profile:v', 'high',
      '-level:v', '4.1',
      '-movflags', '+faststart',
      '-c:a', 'aac',
      '-b:a', settings.audioRate,
      '-ar', '48000',
      '-ac', '2',
      '-r', '30',
      '-g', settings.keyframeInterval,
      ...settings.extraArgs,
      '-y',
      outputFileName
    ];
    
    // Run compression
    await ffmpegInstance.exec(compressionArgs);
    
    // Read compressed file
    const compressedData = await ffmpegInstance.readFile(outputFileName);
    
    // Clean up FFmpeg filesystem
    await ffmpegInstance.deleteFile(inputFileName);
    await ffmpegInstance.deleteFile(outputFileName);
    
    // Create new File object with compressed data
    const compressedBlob = new Blob([compressedData], { type: 'video/mp4' });
    const originalName = file.name;
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    const compressedFileName = `${nameWithoutExt}_compressed_${quality}.mp4`;
    
    const compressedFile = new File([compressedBlob], compressedFileName, {
      type: 'video/mp4',
      lastModified: Date.now(),
    });
    
    console.log(`Video compression complete (${quality} quality):
      Original: ${getFileSizeMB(file).toFixed(2)}MB
      Compressed: ${getFileSizeMB(compressedFile).toFixed(2)}MB
      Reduction: ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`);
    
    return compressedFile;
    
  } catch (error) {
    console.error('Video compression failed:', error);
    throw new Error(`Failed to compress video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Compress video file (using 'balanced' quality by default)
export const compressVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> => {
  return compressVideoWithQuality(file, DEFAULT_COMPRESSION_QUALITY, onProgress);
};

// Batch compress multiple videos with progress tracking
export const compressVideos = async (
  files: File[],
  quality: CompressionQuality = DEFAULT_COMPRESSION_QUALITY,
  onProgress?: (fileIndex: number, fileProgress: number, fileName: string) => void
): Promise<File[]> => {
  const compressedFiles: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (needsCompression(file)) {
      console.log(`Compressing video ${i + 1}/${files.length}: ${file.name} with ${quality} quality`);
      
      const compressedFile = await compressVideoWithQuality(file, quality, (progress) => {
        onProgress?.(i, progress, file.name);
      });
      
      compressedFiles.push(compressedFile);
    } else {
      // File doesn't need compression, use original
      compressedFiles.push(file);
    }
  }
  
  return compressedFiles;
};

// Estimate compression time based on quality level
export const estimateCompressionTime = (file: File, quality: CompressionQuality = DEFAULT_COMPRESSION_QUALITY): number => {
  const sizeInMB = getFileSizeMB(file);
  
  // Time multipliers based on quality preset
  const timeMultipliers = {
    'fast': 1.5,      // ~1.5 seconds per MB (medium preset)
    'balanced': 2.5,  // ~2.5 seconds per MB (slow/medium preset)
    'high': 4.0,      // ~4 seconds per MB (slow preset)
    'ultra': 8.0      // ~8 seconds per MB (veryslow preset)
  };
  
  const multiplier = timeMultipliers[quality];
  const estimatedSeconds = Math.ceil(sizeInMB * multiplier);
  
  console.log(`Estimated compression time for ${sizeInMB.toFixed(2)}MB file with ${quality} quality: ${estimatedSeconds} seconds`);
  
  return estimatedSeconds;
};

// Get quality recommendations based on file size and use case
export const getQualityRecommendation = (fileSizeMB: number, useCase: 'upload' | 'archive' | 'preview' = 'upload') => {
  switch (useCase) {
    case 'upload':
      // For Meta uploads, prioritize compatibility while maintaining good quality
      if (fileSizeMB > 500) return 'fast';
      if (fileSizeMB > 200) return 'balanced';
      return 'high';
      
    case 'archive':
      // For archival, prioritize quality over time
      return 'ultra';
      
    case 'preview':
      // For quick previews, prioritize speed
      return 'fast';
      
    default:
      return 'balanced';
  }
};