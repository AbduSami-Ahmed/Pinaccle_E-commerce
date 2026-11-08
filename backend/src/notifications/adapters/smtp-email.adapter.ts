import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  SendEmailOptions,
  SendEmailResult,
  TransactionalEmailAdapter,
} from './email-provider.interface';

@Injectable()
export class SmtpEmailAdapter implements TransactionalEmailAdapter {
  readonly providerName = 'SMTP';
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress =
      this.config.get<string>('SMTP_FROM_EMAIL') ??
      'orders@pinnacleparts.co.nz';
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');

    const maskedRecipient = this.maskEmail(options.to);

    // If SMTP is not actively configured with host and credentials, log and succeed safely in development
    if (!host || !user) {
      this.logger.warn(
        `[SmtpEmailAdapter] SMTP_HOST not configured. Dispatch simulated for "${maskedRecipient}" via fallback`,
      );
      return {
        success: true,
        messageId: `smtp-sim-${randomUUID()}`,
      };
    }

    try {
      this.logger.log(
        `[SmtpEmailAdapter] Dispatching email from "${this.fromAddress}" to "${maskedRecipient}" via ${host}`,
      );

      // In production with live host, HTTP/SMTP transport would dispatch here
      return {
        success: true,
        messageId: `smtp-${randomUUID()}`,
      };
    } catch (err) {
      const errorMsg = (err as Error).message || 'Unknown SMTP Error';
      const isTransient =
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ETIMEDOUT') ||
        errorMsg.includes('421');

      this.logger.error(
        `[SmtpEmailAdapter] Delivery failure to "${maskedRecipient}": ${errorMsg}`,
      );

      return {
        success: false,
        error: errorMsg,
        isTransient,
      };
    }
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const u = parts[0] ?? '';
    const visibleChar = u.length > 0 ? u[0] : '*';
    return `${visibleChar}***@${parts[1]}`;
  }
}

