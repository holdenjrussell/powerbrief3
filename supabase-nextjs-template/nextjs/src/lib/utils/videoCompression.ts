import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

// Check if a file needs compression (over 50MB)
export const needsCompression = (file: File): boolean => {
  const maxSizeBytes = 50 * 1024 * 1024; // 50MB in bytes
  return file.size > maxSizeBytes && file.type.startsWith('video/');
};

// Get file size in MB for display
export const getFileSizeMB = (file: File): number => {
  return file.size / (1024 * 1024);
};

// Compress video file
export const compressVideo = async (
  file: File,
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
    
    // Compression settings optimized for Meta ads
    // - Reduce bitrate significantly for file size reduction
    // - Use H.264 codec for compatibility
    // - Maintain reasonable quality while prioritizing file size
    const compressionArgs = [
      '-i', inputFileName,
      '-c:v', 'libx264',           // Use H.264 codec
      '-preset', 'medium',         // Balance between speed and compression
      '-crf', '28',                // Constant Rate Factor (higher = more compression)
      '-maxrate', '1M',            // Maximum bitrate of 1Mbps
      '-bufsize', '2M',            // Buffer size
      '-c:a', 'aac',               // Audio codec
      '-b:a', '128k',              // Audio bitrate
      '-movflags', '+faststart',   // Optimize for web streaming
      '-y',                        // Overwrite output file
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
    const compressedFileName = `${nameWithoutExt}_compressed.mp4`;
    
    const compressedFile = new File([compressedBlob], compressedFileName, {
      type: 'video/mp4',
      lastModified: Date.now(),
    });
    
    console.log(`Video compression complete:
      Original: ${getFileSizeMB(file).toFixed(2)}MB
      Compressed: ${getFileSizeMB(compressedFile).toFixed(2)}MB
      Reduction: ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`);
    
    return compressedFile;
    
  } catch (error) {
    console.error('Video compression failed:', error);
    throw new Error(`Failed to compress video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Batch compress multiple videos with progress tracking
export const compressVideos = async (
  files: File[],
  onProgress?: (fileIndex: number, fileProgress: number, fileName: string) => void
): Promise<File[]> => {
  const compressedFiles: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (needsCompression(file)) {
      console.log(`Compressing video ${i + 1}/${files.length}: ${file.name}`);
      
      const compressedFile = await compressVideo(file, (progress) => {
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

// Estimate compression time (rough estimate based on file size)
export const estimateCompressionTime = (file: File): number => {
  // Rough estimate: ~1 minute per 100MB of video
  const sizeInMB = getFileSizeMB(file);
  return Math.ceil(sizeInMB / 100); // Returns estimated minutes
}; 