import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { AuthenticatedUser, DocumentRecordDto, DocumentTypeContract } from '@pinnacle/contracts';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly documentsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {
    this.documentsDir = path.resolve(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(this.documentsDir)) {
      try {
        fs.mkdirSync(this.documentsDir, { recursive: true });
      } catch (err) {
        this.logger.warn(`Could not create documents directory: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Generates or retrieves the immutable Tax Invoice for an order.
   * Enforces DB-level and code-level idempotency to prevent duplicate invoices.
   */
  async generateTaxInvoiceForOrder(
    orderId: string,
    customerId?: string,
  ): Promise<DocumentRecordDto> {
    // 1. Check if invoice already exists for this order
    const existing = await this.prisma.documentRecord.findUnique({
      where: {
        orderId_documentType: {
          orderId,
          documentType: 'TAX_INVOICE',
        },
      },
    });

    if (existing) {
      return this.toDto(existing);
    }

    // 2. Fetch full immutable order snapshot
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const shippingAddress = order.shippingAddress as any;
    const billingAddress = (order.billingAddress as any) || shippingAddress;
    const customerName = `${shippingAddress.firstName || 'Valued'} ${shippingAddress.lastName || 'Customer'}`.trim();

    const documentNumber = `INV-${order.orderNumber}`;
    const fileName = `${documentNumber}.pdf`;
    const filePath = path.join(this.documentsDir, fileName);

    // 3. Generate standard compliant PDF binary
    const pdfBuffer = this.pdfGenerator.generateTaxInvoicePdf({
      invoiceNumber: documentNumber,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      status: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      billingAddress: {
        line1: billingAddress.line1 || '42 Jedda Rd',
        line2: billingAddress.line2 || null,
        city: billingAddress.city || 'Prestons',
        state: billingAddress.state || 'NSW',
        postalCode: billingAddress.postalCode || '2170',
        country: billingAddress.country || 'Australia',
      },
      shippingAddress: {
        line1: shippingAddress.line1 || '42 Jedda Rd',
        line2: shippingAddress.line2 || null,
        city: shippingAddress.city || 'Prestons',
        state: shippingAddress.state || 'NSW',
        postalCode: shippingAddress.postalCode || '2170',
        country: shippingAddress.country || 'Australia',
      },
      shippingMethod: shippingAddress.deliveryOption || 'Courier Delivery',
      items: order.items.map((i) => ({
        sku: i.skuSnapshot,
        title: i.titleSnapshot,
        saleUnit: i.saleUnitNameSnapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxAmount: Number(i.taxAmount),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
    });

    // 4. Save file to disk
    await fs.promises.writeFile(filePath, pdfBuffer);

    // 5. Persist document record
    const record = await this.prisma.documentRecord.create({
      data: {
        documentNumber,
        orderId: order.id,
        documentType: 'TAX_INVOICE',
        fileName,
        mimeType: 'application/pdf',
        fileSize: pdfBuffer.length,
        storageKey: `documents/${fileName}`,
        customerId: customerId || order.customerId,
        metadata: {
          subtotal: Number(order.subtotal),
          taxAmount: Number(order.taxAmount),
          totalAmount: Number(order.totalAmount),
          currency: order.currency,
        },
      },
    });

    this.logger.log(`Generated official Tax Invoice "${documentNumber}" for Order "${order.orderNumber}"`);
    return this.toDto(record);
  }

  /**
   * Secure document retrieval verifying customer ownership and staff permission matrix.
   */
  async getDocumentFile(
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const document = await this.prisma.documentRecord.findUnique({
      where: { id: documentId },
      include: {
        order: {
          select: {
            customerId: true,
            customerEmail: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Authorization: Staff with orders:view:all or customer owning the order
    const isStaff = user.isStaff && user.permissions.includes('orders:view:all');

    let isOwner = false;
    if (user.customerId && document.order.customerId && user.customerId === document.order.customerId) {
      isOwner = true;
    } else if (document.order.customerId) {
      // Check customer profile link by user.sub
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId: user.sub },
      });
      if (customerProfile && customerProfile.id === document.order.customerId) {
        isOwner = true;
      }
    } else if (document.order.customerEmail.toLowerCase() === user.email.toLowerCase()) {
      isOwner = true;
    }

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Access denied. You do not have permission to view this financial document.');
    }

    const filePath = path.join(this.documentsDir, document.fileName);
    if (!fs.existsSync(filePath)) {
      // Regenerate on demand if missing from local cache
      await this.generateTaxInvoiceForOrder(document.orderId);
    }

    const buffer = await fs.promises.readFile(filePath);
    return {
      buffer,
      mimeType: document.mimeType,
      fileName: document.fileName,
    };
  }

  async getInvoiceByOrderNumber(
    orderNumber: string,
    user: AuthenticatedUser,
  ): Promise<DocumentRecordDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, customerId: true, customerEmail: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    const isStaff = user.isStaff && user.permissions.includes('orders:view:all');

    let isOwner = false;
    if (user.customerId && order.customerId && user.customerId === order.customerId) {
      isOwner = true;
    } else if (order.customerId) {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId: user.sub },
      });
      if (customerProfile && customerProfile.id === order.customerId) {
        isOwner = true;
      }
    } else if (order.customerEmail.toLowerCase() === user.email.toLowerCase()) {
      isOwner = true;
    }

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('You are not authorized to view the invoice for this order.');
    }

    return this.generateTaxInvoiceForOrder(order.id, order.customerId ?? undefined);
  }

  async getCustomerDocuments(customerId: string, user: AuthenticatedUser): Promise<DocumentRecordDto[]> {
    const isStaff = user.isStaff && user.permissions.includes('orders:view:all');

    let isOwner = false;
    if (user.customerId && user.customerId === customerId) {
      isOwner = true;
    } else {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId: user.sub },
      });
      if (customerProfile && customerProfile.id === customerId) {
        isOwner = true;
      }
    }

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('You may only view your own documents.');
    }

    const documents = await this.prisma.documentRecord.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(this.toDto);
  }

  private toDto(record: {
    id: string;
    documentNumber: string;
    orderId: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    customerId: string | null;
    createdAt: Date;
  }): DocumentRecordDto {
    return {
      id: record.id,
      documentNumber: record.documentNumber,
      orderId: record.orderId,
      documentType: record.documentType as DocumentTypeContract,
      fileName: record.fileName,
      mimeType: record.mimeType,
      fileSize: record.fileSize,
      downloadUrl: `/api/v1/documents/${record.id}/download`,
      customerId: record.customerId,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

