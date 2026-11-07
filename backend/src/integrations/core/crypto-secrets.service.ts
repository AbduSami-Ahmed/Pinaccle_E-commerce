import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export interface EncryptedSecretPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

@Injectable()
export class CryptoSecretsService {
  private readonly logger = new Logger(CryptoSecretsService.name);
  private readonly masterKey: Buffer;
  private readonly keyVersion = 1;

  constructor(private readonly config: ConfigService) {
    const rawSecret =
      this.config.get<string>('INTEGRATION_SECRETS_KEY') ||
      this.config.get<string>('JWT_SECRET') ||
      'pinnacle-default-insecure-dev-encryption-key-32b!';

    // Derive 256-bit (32 bytes) master key using SHA-256
    this.masterKey = createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypts arbitrary key-value credentials into an AES-256-GCM payload.
   */
  encryptSecrets(credentials: Record<string, string>): EncryptedSecretPayload {
    const iv = randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);

    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  /**
   * Decrypts an AES-256-GCM payload back into credential key-values.
   */
  decryptSecrets(payload: {
    encryptedData: string;
    iv: string;
    authTag: string;
  }): Record<string, string> {
    try {
      const iv = Buffer.from(payload.iv, 'base64');
      const authTag = Buffer.from(payload.authTag, 'base64');
      const encryptedText = Buffer.from(payload.encryptedData, 'base64');

      const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
      this.logger.error(`Failed to decrypt integration credentials: ${(err as Error).message}`);
      throw new Error('Could not decrypt integration credentials. Key mismatch or corrupted ciphertext.');
    }
  }

  /**
   * Safely masks all credential values so that API keys, tokens, and secrets
   * are never returned to frontend callers or logged in plain text.
   */
  maskCredentials(credentials: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, val] of Object.entries(credentials)) {
      if (!val || val.length === 0) {
        masked[key] = '';
      } else if (val.length <= 8) {
        masked[key] = '••••••••';
      } else {
        const start = val.slice(0, 3);
        const end = val.slice(-3);
        masked[key] = `${start}••••••••${end}`;
      }
    }
    return masked;
  }
}

