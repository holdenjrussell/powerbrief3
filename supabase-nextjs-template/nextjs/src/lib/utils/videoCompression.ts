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
    
    // Less aggressive compression for better quality
    const fileSizeMB = getFileSizeMB(file);
    let crf = '23';      // Higher quality (was 28)
    let maxrate = '4M';  // Higher bitrate (was 2M)
    let audioRate = '128k'; // Higher audio quality (was 96k)
    
    // For very large files (>200MB), use moderately more compression
    if (fileSizeMB > 200) {
      crf = '25';        // Still better quality than before (was 32)
      maxrate = '3M';    // Higher bitrate (was 1.5M)
      audioRate = '128k'; // Keep high audio quality (was 64k)
    }
    
    console.log(`Compressing ${fileSizeMB.toFixed(2)}MB file with CRF: ${crf}, maxrate: ${maxrate}`);
    
    // Balanced compression settings for better quality while maintaining reasonable file sizes
    // - Lower CRF (23-25) for better visual quality
    // - Higher bitrates (3M-4M) for better overall quality
    // - Medium preset for better quality/speed balance
    // - Higher audio bitrate for better audio quality
    const compressionArgs = [
      '-i', inputFileName,
      '-c:v', 'libx264',           // Use H.264 codec
      '-preset', 'medium',         // Better quality preset (was ultrafast)
      '-crf', crf,                 // Better quality CRF (23-25 vs 28-32)
      '-maxrate', maxrate,         // Higher max bitrate for better quality
      '-bufsize', '8M',            // Larger buffer size (was 4M)
      '-profile:v', 'high',        // High profile for better compression efficiency (was baseline)
      '-level:v', '4.0',           // Higher level for better features (was 3.0)
      '-movflags', '+faststart',   // Optimize for web streaming
      '-c:a', 'aac',               // AAC audio codec
      '-b:a', audioRate,           // Higher audio bitrate for better quality
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
  
  // Updated estimates for medium preset (slower but better quality):
  // - Medium preset takes ~2-3x longer than ultrafast
  // - 120MB file now takes ~2-3 minutes instead of 1 minute
  // - This gives us ~1-1.5 seconds per MB
  return Math.ceil(sizeInMB * 1.2); // ~1.2 seconds per MB for medium preset
}; 