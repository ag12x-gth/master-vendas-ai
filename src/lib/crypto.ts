
// src/lib/crypto.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Singleton pattern to ensure key is only hashed once
class EncryptionKeyManager {
  private static instance: EncryptionKeyManager;
  private key: Buffer;
  private hasLoggedWarning = false;

  private constructor() {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables.');
    }

    // Ensure key is exactly 32 bytes by hashing if needed
    if (ENCRYPTION_KEY.length === 32) {
      this.key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
    } else {
      // Hash the key to get exactly 32 bytes
      this.key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      
      // Log warning only once
      if (!this.hasLoggedWarning) {
        console.log('⚠️ [Crypto] ENCRYPTION_KEY was hashed to 32 bytes for compatibility (this message appears only once).');
        this.hasLoggedWarning = true;
      }
    }
  }

  public static getInstance(): EncryptionKeyManager {
    if (!EncryptionKeyManager.instance) {
      EncryptionKeyManager.instance = new EncryptionKeyManager();
    }
    return EncryptionKeyManager.instance;
  }

  public getKey(): Buffer {
    return this.key;
  }
}

// Get the key using singleton pattern
const keyManager = EncryptionKeyManager.getInstance();
const key = keyManager.getKey();

export function encrypt(text: string): string {
  if (!text) {
    return text;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

export function decrypt(encryptedHex: string): string {
  if (!encryptedHex) {
    return encryptedHex;
  }
  try {
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return an empty string or a specific error indicator if decryption fails
    // This can happen if the data was not encrypted or used a different key
    return '';
  }
}
