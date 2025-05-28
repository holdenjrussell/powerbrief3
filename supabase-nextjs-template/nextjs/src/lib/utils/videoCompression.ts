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
    
    // Adaptive compression based on file size (Meta's approach)
    const fileSizeMB = getFileSizeMB(file);
    let crf = '28';
    let maxrate = '2M';
    let audioRate = '96k';
    
    // For very large files (>200MB), use even more aggressive settings
    if (fileSizeMB > 200) {
      crf = '32';        // More aggressive CRF
      maxrate = '1.5M';  // Lower bitrate
      audioRate = '64k'; // Lower audio bitrate
    }
    
    console.log(`Compressing ${fileSizeMB.toFixed(2)}MB file with CRF: ${crf}, maxrate: ${maxrate}`);
    
    // Meta's most aggressive compression settings for maximum file size reduction
    // Based on Instagram/Facebook's internal compression pipeline:
    // - Adaptive CRF (28-32) based on file size
    // - ultrafast preset for maximum speed
    // - Adaptive bitrate (1.5M-2M) for optimal file sizes
    // - Optimized for mobile viewing and fast uploads
    const compressionArgs = [
      '-i', inputFileName,
      '-c:v', 'libx264',           // Use H.264 codec
      '-preset', 'ultrafast',      // Maximum speed preset
      '-crf', crf,                 // Adaptive CRF for file size optimization
      '-maxrate', maxrate,         // Adaptive max bitrate for smaller files
      '-bufsize', '4M',            // Buffer size
      '-profile:v', 'baseline',    // Baseline profile for maximum compatibility
      '-level:v', '3.0',           // Level 3.0 for mobile optimization
      '-movflags', '+faststart',   // Optimize for web streaming
      '-c:a', 'aac',               // AAC audio codec
      '-b:a', audioRate,           // Adaptive audio bitrate
      '-ar', '44100',              // Standard sample rate
      '-ac', '2',                  // Stereo audio
      '-r', '30',                  // Force 30fps (Meta standard)
      '-g', '60',                  // Keyframe interval (2 seconds at 30fps)
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

// Estimate compression time (updated based on real-world testing)
export const estimateCompressionTime = (file: File): number => {
  const sizeInMB = getFileSizeMB(file);
  
  // Updated estimates based on real-world testing:
  // - 120MB file takes ~1 minute (60 seconds)
  // - This gives us ~30 seconds per 60MB or ~0.5 seconds per MB
  return Math.ceil(sizeInMB * 0.5); // ~30 seconds per 60MB
}; 