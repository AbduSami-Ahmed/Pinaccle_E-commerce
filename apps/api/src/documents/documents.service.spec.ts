import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    promises: {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content')),
    },
  };
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    documentRecord: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    order: {
      findUnique: jest.Mock;
    };
    customerProfile: {
      findUnique: jest.Mock;
    };
  };
  let pdfGenerator: {
    generateTaxInvoicePdf: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      documentRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      customerProfile: {
        findUnique: jest.fn(),
      },
    };

    pdfGenerator = {
      generateTaxInvoicePdf: jest.fn().mockReturnValue(Buffer.from('%PDF-1.4 test invoice buffer')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PdfGeneratorService, useValue: pdfGenerator },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('generateTaxInvoiceForOrder', () => {
    it('creates a new invoice record and writes PDF file if not yet generated', async () => {
      prisma.documentRecord.findUnique.mockResolvedValue(null);

      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-100',
        orderNumber: 'PIN-2026-10042',
        customerId: 'cust-1',
        customerEmail: 'trade@sydneytyres.com.au',
        customerPhone: '0298765432',
        shippingAddress: {
          firstName: 'Marcus',
          lastName: 'Vance',
          line1: '42 Jedda Rd',
          city: 'Prestons',
          state: 'NSW',
          postalCode: '2170',
          country: 'Australia',
          deliveryOption: 'Courier Freight',
        },
        billingAddress: null,
        orderStatus: 'PAID',
        paymentStatus: 'PAID',
        subtotal: 1000.0,
        taxAmount: 100.0,
        shippingFee: 50.0,
        totalAmount: 1150.0,
        currency: 'AUD',
        createdAt: new Date('2026-10-14'),
        items: [
          {
            skuSnapshot: 'TYRE-MIC-01',
            titleSnapshot: 'Michelin Agilis 3',
            saleUnitNameSnapshot: 'Pair (2 tyres)',
            quantity: 2,
            unitPrice: 500.0,
            taxAmount: 50.0,
            totalPrice: 1000.0,
          },
        ],
      });

      prisma.documentRecord.create.mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'INV-PIN-2026-10042',
        orderId: 'ord-100',
        documentType: 'TAX_INVOICE',
        fileName: 'INV-PIN-2026-10042.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'documents/INV-PIN-2026-10042.pdf',
        customerId: 'cust-1',
        createdAt: new Date('2026-10-14'),
      });

      const result = await service.generateTaxInvoiceForOrder('ord-100', 'cust-1');

      expect(result.documentNumber).toBe('INV-PIN-2026-10042');
      expect(pdfGenerator.generateTaxInvoicePdf).toHaveBeenCalledTimes(1);
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(prisma.documentRecord.create).toHaveBeenCalled();
    });

    it('enforces idempotency: returns existing document without duplicate creation', async () => {
      prisma.documentRecord.findUnique.mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'INV-PIN-2026-10042',
        orderId: 'ord-100',
        documentType: 'TAX_INVOICE',
        fileName: 'INV-PIN-2026-10042.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        storageKey: 'documents/INV-PIN-2026-10042.pdf',
        customerId: 'cust-1',
        createdAt: new Date('2026-10-14'),
      });

      const result = await service.generateTaxInvoiceForOrder('ord-100');

      expect(result.documentNumber).toBe('INV-PIN-2026-10042');
      expect(pdfGenerator.generateTaxInvoicePdf).not.toHaveBeenCalled();
      expect(prisma.documentRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentFile access control', () => {
    it('allows customer to access their own invoice', async () => {
      prisma.documentRecord.findUnique.mockResolvedValue({
        id: 'doc-1',
        orderId: 'ord-100',
        fileName: 'INV-PIN-2026-10042.pdf',
        mimeType: 'application/pdf',
        order: {
          customerId: 'cust-1',
          customerEmail: 'marcus@example.com',
        },
      });

      prisma.customerProfile.findUnique.mockResolvedValue({
        id: 'cust-1',
        userId: 'user-marcus',
      });

      const file = await service.getDocumentFile('doc-1', {
        sub: 'user-marcus',
        email: 'marcus@example.com',
        isStaff: false,
        permissions: [],
      });

      expect(file.mimeType).toBe('application/pdf');
      expect(file.fileName).toBe('INV-PIN-2026-10042.pdf');
    });

    it('denies access if customer does not own the document (ForbiddenException)', async () => {
      prisma.documentRecord.findUnique.mockResolvedValue({
        id: 'doc-1',
        orderId: 'ord-100',
        fileName: 'INV-PIN-2026-10042.pdf',
        mimeType: 'application/pdf',
        order: {
          customerId: 'cust-1',
          customerEmail: 'marcus@example.com',
        },
      });

      prisma.customerProfile.findUnique.mockResolvedValue({
        id: 'cust-2',
        userId: 'user-intruder',
      });

      await expect(
        service.getDocumentFile('doc-1', {
          sub: 'user-intruder',
          email: 'intruder@example.com',
          isStaff: false,
          permissions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows staff with orders:view:all permission to view any invoice', async () => {
      prisma.documentRecord.findUnique.mockResolvedValue({
        id: 'doc-1',
        orderId: 'ord-100',
        fileName: 'INV-PIN-2026-10042.pdf',
        mimeType: 'application/pdf',
        order: {
          customerId: 'cust-1',
          customerEmail: 'marcus@example.com',
        },
      });

      const file = await service.getDocumentFile('doc-1', {
        sub: 'staff-1',
        email: 'admin@pinnacle.com.au',
        isStaff: true,
        permissions: ['orders:view:all'],
      });

      expect(file.mimeType).toBe('application/pdf');
    });
  });
});

