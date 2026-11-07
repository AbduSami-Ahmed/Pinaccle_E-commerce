import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  SendEmailOptions,
  SendEmailResult,
  TransactionalEmailAdapter,
} from './email-provider.interface';

@Injectable()
export class MockEmailAdapter implements TransactionalEmailAdapter {
  readonly providerName = 'MOCK';
  private readonly logger = new Logger(MockEmailAdapter.name);

  private sentEmails: Array<SendEmailOptions & { messageId: string; timestamp: Date }> = [];
  private simulateTransientFailure = false;
  private simulatePermanentFailure = false;

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const maskedRecipient = this.maskEmail(options.to);
    this.logger.log(
      `[MockEmailAdapter] Sending email to "${maskedRecipient}" | Subject: "${options.subject}" | IdempotencyKey: "${options.idempotencyKey || 'none'}"`,
    );

    if (this.simulateTransientFailure) {
      this.logger.warn(
        `[MockEmailAdapter] Simulated transient gateway failure for "${maskedRecipient}"`,
      );
      return {
        success: false,
        error: 'Simulated 503 Service Unavailable (Transient)',
        isTransient: true,
      };
    }

    if (this.simulatePermanentFailure) {
      this.logger.error(
        `[MockEmailAdapter] Simulated permanent rejection for "${maskedRecipient}"`,
      );
      return {
        success: false,
        error: 'Simulated 550 Mailbox does not exist (Permanent)',
        isTransient: false,
      };
    }

    const messageId = `mock-msg-${randomUUID()}`;
    this.sentEmails.push({
      ...options,
      messageId,
      timestamp: new Date(),
    });

    return {
      success: true,
      messageId,
    };
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  clearSentEmails() {
    this.sentEmails = [];
  }

  setSimulateTransientFailure(enable: boolean) {
    this.simulateTransientFailure = enable;
  }

  setSimulatePermanentFailure(enable: boolean) {
    this.simulatePermanentFailure = enable;
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const user = parts[0] ?? '';
    const visibleChar = user.length > 0 ? user[0] : '*';
    return `${visibleChar}***@${parts[1]}`;
  }
}

