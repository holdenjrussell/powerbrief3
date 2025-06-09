/**
 * Standardized logging utility for the application
 * Provides consistent logging across all components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    console.info(`[INFO] ${message}`, context || '');
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, context || '');
  }
  
  /**
   * Log a thumbnail operation with standardized format
   */
  logThumbnailOperation(operation: string, videoName: string, success: boolean, error?: string): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `[THUMBNAIL] ${operation} - ${videoName}: ${status}`;
    
    if (success) {
      this.info(message);
    } else {
      this.error(message, { error });
    }
  }
  
  /**
   * Log an aspect ratio detection result
   */
  logAspectRatioDetection(filename: string, result: { baseName: string; detectedRatio: string | null; version: string | null; groupKey: string }): void {
    this.debug('Aspect ratio detection result', { filename, result });
  }
  
  /**
   * Log file validation result
   */
  logFileValidation(filename: string, isValid: boolean, error?: string): void {
    if (isValid) {
      this.debug('File validation passed', { filename });
    } else {
      this.warn('File validation failed', { filename, error });
    }
  }
  
  /**
   * Log upload progress
   */
  logUploadProgress(filename: string, progress: number, stage: string): void {
    this.debug(`Upload progress: ${filename}`, { progress, stage });
  }
  
  /**
   * Log component lifecycle events
   */
  logComponentEvent(component: string, event: string, context?: LogContext): void {
    this.debug(`[${component}] ${event}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual log functions for convenience
export const { debug, info, warn, error, logThumbnailOperation, logAspectRatioDetection, logFileValidation, logUploadProgress, logComponentEvent } = logger;