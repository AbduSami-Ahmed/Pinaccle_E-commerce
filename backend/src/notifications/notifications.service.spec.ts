import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MockEmailAdapter } from './adapters/mock-email.adapter';
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter';
import { DocumentsService } from '../documents/documents.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockEmailAdapter: MockEmailAdapter;
  let prisma: {
    notificationRecord: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    order: {
      findUnique: jest.Mock;
    };
    returnRequest: {
      findUnique: jest.Mock;
    };
  };
  let documentsService: {
    generateTaxInvoiceForOrder: jest.Mock;
    getDocumentFile: jest.Mock;
  };

  beforeEach(async () => {
    mockEmailAdapter = new MockEmailAdapter();

    prisma = {
      notificationRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn(),
      },
    };

    documentsService = {
      generateTaxInvoiceForOrder: jest.fn().mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'INV-PIN-2026-10042',
        fileName: 'INV-PIN-2026-10042.pdf',
      }),
      getDocumentFile: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4 test invoice'),
        mimeType: 'application/pdf',
        fileName: 'INV-PIN-2026-10042.pdf',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('MOCK') } },
        { provide: MockEmailAdapter, useValue: mockEmailAdapter },
        {
          provide: SmtpEmailAdapter,
          useValue: { providerName: 'SMTP', sendEmail: jest.fn() },
        },
        { provide: DocumentsService, useValue: documentsService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('dispatchNotification', () => {
    it('dispatches email through adapter and transitions record to SENT', async () => {
      prisma.notificationRecord.upsert.mockResolvedValue({
        id: 'notif-1',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      });

      prisma.notificationRecord.update.mockResolvedValue({
        id: 'notif-1',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'SENT',
        sentAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        messageId: 'mock-msg-123',
        errorMessage: null,
        nextRetryAt: null,
        orderId: null,
        customerId: null,
        createdAt: new Date(),
      });

      const result = await service.dispatchNotification({
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        html: '<p>Order confirmed</p>',
        text: 'Order confirmed',
      });

      expect(result.status).toBe('SENT');
      expect(prisma.notificationRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        }),
      );
      expect(mockEmailAdapter.getSentEmails().length).toBe(1);
    });

    it('enforces idempotency: does not re-send if event is already SENT', async () => {
      prisma.notificationRecord.findUnique.mockResolvedValue({
        id: 'notif-existing',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'SENT',
        retryCount: 0,
        maxRetries: 3,
        sentAt: new Date(),
        errorMessage: null,
        nextRetryAt: null,
        orderId: 'ord-1',
        customerId: 'cust-1',
        createdAt: new Date(),
      });

      const result = await service.dispatchNotification({
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        html: '<p>Order confirmed</p>',
        text: 'Order confirmed',
        idempotencyKey: 'event-key-123',
      });

      expect(result.status).toBe('SENT');
      expect(prisma.notificationRecord.upsert).not.toHaveBeenCalled();
      expect(mockEmailAdapter.getSentEmails().length).toBe(0);
    });

    it('handles transient adapter failure by setting status to FAILED with backoff retry', async () => {
      mockEmailAdapter.setSimulateTransientFailure(true);

      prisma.notificationRecord.upsert.mockResolvedValue({
        id: 'notif-transient',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      });

      prisma.notificationRecord.update.mockResolvedValue({
        id: 'notif-transient',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'FAILED',
        retryCount: 1,
        maxRetries: 3,
        errorMessage: 'Simulated 503 Service Unavailable (Transient)',
        nextRetryAt: new Date(Date.now() + 10 * 60 * 1000),
        sentAt: null,
        orderId: null,
        customerId: null,
        createdAt: new Date(),
      });

      const result = await service.dispatchNotification({
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        html: '<p>Order confirmed</p>',
        text: 'Order confirmed',
      });

      expect(result.status).toBe('FAILED');
      expect(result.retryCount).toBe(1);
      expect(prisma.notificationRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            retryCount: 1,
          }),
        }),
      );
    });
  });

  describe('retryNotification', () => {
    it('successfully retries failed notification and transitions it to SENT', async () => {
      prisma.notificationRecord.findUnique.mockResolvedValue({
        id: 'notif-failed',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        status: 'FAILED',
        retryCount: 1,
        maxRetries: 3,
      });

      prisma.notificationRecord.update.mockResolvedValue({
        id: 'notif-failed',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'buyer@example.com',
        subject: 'Order Confirmed',
        templateName: 'order_confirmation',
        status: 'SENT',
        sentAt: new Date(),
        retryCount: 2,
        maxRetries: 3,
        messageId: 'mock-msg-retry',
        errorMessage: null,
        nextRetryAt: null,
        orderId: null,
        customerId: null,
        createdAt: new Date(),
      });

      const result = await service.retryNotification('notif-failed');

      expect(result.status).toBe('SENT');
      expect(mockEmailAdapter.getSentEmails().length).toBe(1);
    });
  });

  describe('notifyOrderConfirmed', () => {
    it('generates invoice attachment and dispatches confirmation email', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-100',
        orderNumber: 'PIN-2026-10042',
        customerId: 'cust-1',
        customerEmail: 'trade@example.co.nz',
        shippingAddress: {
          firstName: 'Dave',
          lastName: 'Miller',
          line1: '18 Industry Road',
          city: 'Penrose',
          state: 'Auckland',
          postalCode: '1061',
        },
        items: [
          {
            titleSnapshot: 'Bridgestone Dueler',
            skuSnapshot: 'TYRE-BRI-01',
            saleUnitNameSnapshot: 'Single',
            quantity: 2,
            unitPrice: 280.0,
            totalPrice: 560.0,
          },
        ],
        subtotal: 560.0,
        taxAmount: 50.91,
        shippingFee: 0.0,
        totalAmount: 560.0,
        currency: 'NZD',
      });

      prisma.notificationRecord.upsert.mockResolvedValue({
        id: 'notif-confirm',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'trade@example.co.nz',
        subject: 'Order Confirmed: PIN-2026-10042 - Pinnacle Auto Spares',
        templateName: 'order_confirmation',
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      });

      prisma.notificationRecord.update.mockResolvedValue({
        id: 'notif-confirm',
        channel: 'EMAIL',
        type: 'ORDER_CONFIRMATION',
        recipient: 'trade@example.co.nz',
        subject: 'Order Confirmed: PIN-2026-10042 - Pinnacle Auto Spares',
        templateName: 'order_confirmation',
        status: 'SENT',
        sentAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        messageId: 'mock-msg-confirm',
        errorMessage: null,
        nextRetryAt: null,
        orderId: 'ord-100',
        customerId: 'cust-1',
        createdAt: new Date(),
      });

      const result = await service.notifyOrderConfirmed('ord-100');

      expect(result.status).toBe('SENT');
      expect(documentsService.generateTaxInvoiceForOrder).toHaveBeenCalledWith('ord-100', 'cust-1');
      expect(documentsService.getDocumentFile).toHaveBeenCalled();
      expect(mockEmailAdapter.getSentEmails()[0]?.attachments?.length).toBe(1);
      expect(mockEmailAdapter.getSentEmails()[0]?.attachments?.[0]?.filename).toBe('INV-PIN-2026-10042.pdf');
    });
  });
});

