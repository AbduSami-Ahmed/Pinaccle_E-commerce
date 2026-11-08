import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { MockPaymentGatewayAdapter } from './mock-payment.adapter';
import { StripePaymentGatewayAdapter } from './stripe-payment.adapter';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let inventoryService: any;
  let mockAdapter: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      paymentTransaction: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      paymentWebhookLog: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    inventoryService = {
      commitStockReservation: jest.fn().mockResolvedValue({ success: true }),
      releaseStockReservation: jest.fn().mockResolvedValue({ success: true }),
    };

    mockAdapter = new MockPaymentGatewayAdapter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
        { provide: MockPaymentGatewayAdapter, useValue: mockAdapter },
        {
          provide: StripePaymentGatewayAdapter,
          useValue: {
            providerName: 'STRIPE',
            createPaymentIntent: jest.fn(),
            verifyWebhook: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PAYMENT_DEFAULT_PROVIDER') return 'MOCK';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createPaymentSession', () => {
    it('creates a new payment transaction with pending status', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'PIN-2026-10001',
        totalAmount: 290.0,
        currency: 'NZD',
        customerEmail: 'tradesman@example.co.nz',
        paymentStatus: 'UNPAID',
        orderStatus: 'PENDING_PAYMENT',
        stockReservations: [
          { id: 'res-1', status: 'ACTIVE', expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        ],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.paymentTransaction.upsert.mockResolvedValue({});

      const session = await service.createPaymentSession({
        orderId: 'order-1',
        provider: 'MOCK',
      });

      expect(session.orderId).toBe('order-1');
      expect(session.orderNumber).toBe('PIN-2026-10001');
      expect(session.amount).toBe(290.0);
      expect(session.status).toBe('PENDING');
      expect(session.clientSecret).toBeDefined();
      expect(prisma.paymentTransaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            orderId: 'order-1',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('rejects payment session if order is already paid', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-paid',
        orderNumber: 'PIN-2026-99999',
        paymentStatus: 'PAID',
        stockReservations: [],
      });

      await expect(
        service.createPaymentSession({ orderId: 'order-paid', provider: 'MOCK' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects payment session if reservation has expired', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-expired',
        orderNumber: 'PIN-2026-10002',
        paymentStatus: 'UNPAID',
        orderStatus: 'PENDING_PAYMENT',
        stockReservations: [
          { id: 'res-old', status: 'ACTIVE', expiresAt: new Date(Date.now() - 5000) }, // Expired!
        ],
      });

      await expect(
        service.createPaymentSession({ orderId: 'order-expired', provider: 'MOCK' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook (Replay Protection & Atomic State Transitions)', () => {
    it('detects duplicate webhook events and returns without re-executing (idempotency)', async () => {
      prisma.paymentWebhookLog.findUnique.mockResolvedValue({
        id: 'log-1',
        eventId: 'evt_dup_123',
        status: 'PROCESSED',
      });

      const res = await service.handleWebhook(
        'MOCK',
        {
          id: 'evt_dup_123',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test' } },
        },
        {},
      );

      expect(res.received).toBe(true);
      expect(res.duplicate).toBe(true);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(inventoryService.commitStockReservation).not.toHaveBeenCalled();
    });

    it('atomically marks order as PAID and commits stock reservations on payment_intent.succeeded', async () => {
      prisma.paymentWebhookLog.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookLog.create.mockResolvedValue({});
      prisma.paymentWebhookLog.update.mockResolvedValue({});

      const mockOrder = {
        id: 'order-1',
        orderNumber: 'PIN-2026-10001',
        paymentStatus: 'UNPAID',
        stockReservations: [{ id: 'res-1', status: 'ACTIVE' }],
      };

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        transactionReference: 'pi_success_123',
        order: mockOrder,
      });

      const res = await service.handleWebhook(
        'MOCK',
        {
          id: 'evt_new_456',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_success_123',
              status: 'succeeded',
              amount: 29000,
              currency: 'nzd',
            },
          },
        },
        {},
      );

      expect(res.received).toBe(true);
      expect(res.status).toBe('SUCCESS');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { orderStatus: 'PAID', paymentStatus: 'PAID' },
      });
      expect(prisma.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'SUCCESS' },
      });
      expect(inventoryService.commitStockReservation).toHaveBeenCalledWith(
        'res-1',
        'order-1',
        'PAYMENT_WEBHOOK_COMMITTED',
      );
    });

    it('atomically releases stock reservations on payment_intent.payment_failed', async () => {
      prisma.paymentWebhookLog.findUnique.mockResolvedValue(null);
      prisma.paymentWebhookLog.create.mockResolvedValue({});
      prisma.paymentWebhookLog.update.mockResolvedValue({});

      const mockOrder = {
        id: 'order-2',
        orderNumber: 'PIN-2026-10002',
        paymentStatus: 'UNPAID',
        stockReservations: [{ id: 'res-2', status: 'ACTIVE' }],
      };

      prisma.paymentTransaction.findUnique.mockResolvedValue({
        id: 'tx-2',
        transactionReference: 'pi_failed_123',
        order: mockOrder,
      });

      const res = await service.handleWebhook(
        'MOCK',
        {
          id: 'evt_fail_789',
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: 'pi_failed_123',
              status: 'failed',
            },
          },
        },
        {},
      );

      expect(res.received).toBe(true);
      expect(res.status).toBe('FAILED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-2' },
        data: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' },
      });
      expect(inventoryService.releaseStockReservation).toHaveBeenCalledWith(
        'res-2',
        'PAYMENT_WEBHOOK_FAILED',
        'PAYMENT_TRANSACTION_FAILED',
      );
    });
  });
});
