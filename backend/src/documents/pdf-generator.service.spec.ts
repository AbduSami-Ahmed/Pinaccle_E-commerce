import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(() => {
    service = new PdfGeneratorService();
  });

  it('generates a valid binary PDF 1.4 Tax Invoice conforming to ATO requirements', () => {
    const pdfBuffer = service.generateTaxInvoicePdf({
      invoiceNumber: 'INV-PIN-2026-10042',
      orderNumber: 'PIN-2026-10042',
      date: new Date('2026-10-14T08:00:00Z'),
      status: 'PAID',
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.vance@example.co.nz',
      billingAddress: {
        line1: '18 Industry Road',
        city: 'Penrose',
        state: 'Auckland',
        postalCode: '1061',
        country: 'New Zealand',
      },
      shippingAddress: {
        line1: '18 Industry Road',
        city: 'Penrose',
        state: 'Auckland',
        postalCode: '1061',
        country: 'New Zealand',
      },
      shippingMethod: 'Express Freight',
      items: [
        {
          sku: 'SB-TOY-RAV4-FR',
          title: 'Toyota RAV4 2021 Front Right Seat Belt Assembly',
          saleUnit: 'Single',
          quantity: 1,
          unitPrice: 385.0,
          taxAmount: 35.0,
          totalPrice: 385.0,
        },
      ],
      subtotal: 385.0,
      taxAmount: 35.0,
      shippingFee: 25.0,
      totalAmount: 410.0,
      currency: 'NZD',
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const pdfString = pdfBuffer.toString('latin1');

    // 1. Valid PDF 1.4 Header
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);

    // 2. Standard objects present
    expect(pdfString).toContain('/Type /Catalog');
    expect(pdfString).toContain('/Type /Pages');
    expect(pdfString).toContain('/Type /Page');
    expect(pdfString).toContain('TAX INVOICE');
    expect(pdfString).toContain('INV-PIN-2026-10042');
    expect(pdfString).toContain('PINNACLE AUTO SPARES');
    expect(pdfString).toContain('NZBN: 9429041234567');
    expect(pdfString).toContain('MVD-89211');
    expect(pdfString).toContain('Marcus Vance');
    expect(pdfString).toContain('SB-TOY-RAV4-FR');
    expect(pdfString).toContain('$410.00');

    // 3. Proper Cross-Reference Table and EOF
    expect(pdfString).toContain('xref');
    expect(pdfString).toContain('trailer');
    expect(pdfString).toContain('startxref');
    expect(pdfString.trim().endsWith('%%EOF')).toBe(true);
  });
});

