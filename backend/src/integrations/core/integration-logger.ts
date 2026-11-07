import { Logger } from '@nestjs/common';

export class IntegrationLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, correlationId?: string, meta?: Record<string, unknown>) {
    this.logger.log(this.formatMessage(message, correlationId, meta));
  }

  warn(message: string, correlationId?: string, meta?: Record<string, unknown>) {
    this.logger.warn(this.formatMessage(message, correlationId, meta));
  }

  error(message: string, error?: Error | string, correlationId?: string, meta?: Record<string, unknown>) {
    const errorMsg = error instanceof Error ? error.message : (error || '');
    this.logger.error(this.formatMessage(`${message} | Error: ${errorMsg}`, correlationId, meta));
  }

  private formatMessage(
    message: string,
    correlationId?: string,
    meta?: Record<string, unknown>,
  ): string {
    const corrTag = correlationId ? `[Corr:${correlationId}] ` : '';
    const sanitizedMeta = meta ? ` | Meta: ${JSON.stringify(this.scrubSecrets(meta))}` : '';
    return `${corrTag}${message}${sanitizedMeta}`;
  }

  /**
   * Recursively sanitizes sensitive credential keys before logging.
   */
  scrubSecrets(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.scrubSecrets(item));
    }

    const sensitiveKeyPatterns = [
      /secret/i,
      /token/i,
      /password/i,
      /auth/i,
      /api[_-]?key/i,
      /credential/i,
      /private[_-]?key/i,
      /cvv/i,
      /card/i,
    ];

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveKeyPatterns.some((pattern) => pattern.test(key))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.scrubSecrets(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

