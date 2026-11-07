import { ConfigService } from '@nestjs/config';
import { CryptoSecretsService } from './crypto-secrets.service';

describe('CryptoSecretsService', () => {
  let service: CryptoSecretsService;

  beforeEach(() => {
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'INTEGRATION_SECRETS_KEY') {
          return 'test-32-byte-encryption-secret-key!!';
        }
        return null;
      }),
    } as unknown as ConfigService;

    service = new CryptoSecretsService(config);
  });

  it('encrypts and decrypts credentials using authenticated AES-256-GCM', () => {
    const credentials = {
      apiKey: 'pk_live_9988223311aabbcc',
      apiSecret: 'sk_live_supersecrettokenxyz123',
      webhookSecret: 'whsec_9988776655',
    };

    const encrypted = service.encryptSecrets(credentials);

    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.keyVersion).toBe(1);

    // Verify ciphertext does not contain raw secrets
    expect(encrypted.encryptedData).not.toContain('pk_live');
    expect(encrypted.encryptedData).not.toContain('sk_live');

    // Decrypt
    const decrypted = service.decryptSecrets(encrypted);
    expect(decrypted).toEqual(credentials);
  });

  it('throws an error if ciphertext or authentication tag is tampered with', () => {
    const credentials = { token: 'secret-token' };
    const encrypted = service.encryptSecrets(credentials);

    // Tamper with the authTag
    const tampered = {
      ...encrypted,
      authTag: Buffer.from('invalid-16-bytes-tag!').toString('base64'),
    };

    expect(() => service.decryptSecrets(tampered)).toThrow();
  });

  it('masks sensitive credentials preventing secret exposure to frontend or logs', () => {
    const credentials = {
      shortSecret: '1234',
      apiKey: 'pk_test_abcdef1234567890xyz',
      emptyKey: '',
    };

    const masked = service.maskCredentials(credentials);

    expect(masked['shortSecret']).toBe('••••••••');
    expect(masked['apiKey']).toBe('pk_••••••••xyz');
    expect(masked['apiKey']).not.toContain('abcdef');
    expect(masked['emptyKey']).toBe('');
  });
});

