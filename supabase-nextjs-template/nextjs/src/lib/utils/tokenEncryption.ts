import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM

/**
 * Encrypts a token using AES-256-GCM encryption
 * @param token - The token to encrypt
 * @returns Object containing the encrypted token, IV, and auth tag (base64 encoded)
 */
export function encryptToken(token: string): { encryptedToken: string; iv: string; authTag: string } {
  const encryptionKey = process.env.META_TOKEN_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  if (encryptionKey.length !== 64) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY must be 64 characters (32 bytes) for AES-256');
  }
  
  // Convert hex key to buffer
  const key = Buffer.from(encryptionKey, 'hex');
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from('meta-token')); // Additional authenticated data
  
  // Encrypt the token
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedToken: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypts a token using AES-256-GCM decryption
 * @param encryptedData - Object containing encrypted token, IV, and auth tag (base64 encoded)
 * @returns The decrypted token
 */
export function decryptToken(encryptedData: { encryptedToken: string; iv: string; authTag: string }): string {
  const encryptionKey = process.env.META_TOKEN_ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  if (encryptionKey.length !== 64) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY must be 64 characters (32 bytes) for AES-256');
  }
  
  // Convert hex key to buffer
  const key = Buffer.from(encryptionKey, 'hex');
  
  // Convert base64 strings back to buffers
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from('meta-token')); // Additional authenticated data
  
  // Decrypt the token
  let decrypted = decipher.update(encryptedData.encryptedToken, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Calculates the expiration timestamp based on expires_in seconds
 * @param expiresInSeconds - Number of seconds until expiration
 * @returns ISO timestamp string
 */
export function calculateExpirationTimestamp(expiresInSeconds: number | undefined | null): string {
  // Meta's long-lived tokens typically last 60 days (5184000 seconds)
  // If expires_in is null/undefined, it usually means it's a long-lived token
  const DEFAULT_LONG_LIVED_EXPIRATION_SECONDS = 60 * 24 * 60 * 60; // 60 days in seconds (5184000)
  
  let secondsToAdd = DEFAULT_LONG_LIVED_EXPIRATION_SECONDS;

  if (typeof expiresInSeconds === 'number' && !isNaN(expiresInSeconds)) {
    secondsToAdd = expiresInSeconds;
  } else {
    // If expires_in is null/undefined, assume it's a long-lived token
    // This is common with Meta's long-lived tokens
    console.log('expires_in is null/undefined, defaulting to 60 days for long-lived token');
  }

  const expirationDate = new Date();
  expirationDate.setSeconds(expirationDate.getSeconds() + secondsToAdd);
  return expirationDate.toISOString();
} 