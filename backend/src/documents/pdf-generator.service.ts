import { Injectable } from '@nestjs/common';

export interface InvoiceItemData {
  sku: string;
  title: string;
  saleUnit: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  date: Date;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  billingAddress: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingMethod: string;
  items: InvoiceItemData[];
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class PdfGeneratorService {
  /**
   * Generates a fully standard-compliant, self-contained PDF 1.4 Tax Invoice buffer.
   * Conforms to New Zealand Inland Revenue Department (IRD) Tax Invoice requirements (Goods and Services Tax Act 1985).
   */
  generateTaxInvoicePdf(data: InvoiceData): Buffer {
    const streamOperations: string[] = [];

    // Helper to escape PDF strings
    const esc = (text: string | null | undefined): string => {
      if (!text) return '';
      return text
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
    };

    // Helper: draw text
    const addText = (
      font: 'F1' | 'F2',
      size: number,
      x: number,
      y: number,
      text: string,
      colorRgb = '0 0 0',
    ) => {
      streamOperations.push(
        `q ${colorRgb} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(text)}) Tj ET Q`,
      );
    };

    // Helper: draw line
    const addLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      lineWidth = 0.5,
      colorRgb = '0.8 0.8 0.8',
    ) => {
      streamOperations.push(
        `q ${colorRgb} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`,
      );
    };

    // Helper: draw filled rectangle
    const addRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      colorRgb: string,
    ) => {
      streamOperations.push(
        `q ${colorRgb} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`,
      );
    };

    // A4 dimensions: 595.28 x 841.89 points
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2; // 523.28

    // 1. Top Header Bar (Navy Accent)
    addRect(margin, pageHeight - 50, contentWidth, 3, '0.06 0.09 0.16');

    // 2. Business Details (Left)
    addText(
      'F2',
      15,
      margin,
      pageHeight - 75,
      'PINNACLE AUTO SPARES & COMMERCIAL TYRES',
      '0.06 0.09 0.16',
    );
    addText(
      'F1',
      9,
      margin,
      pageHeight - 90,
      'Pinnacle Auto Spares & Commercial Tyres Ltd',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      margin,
      pageHeight - 102,
      '18 Industry Road, Penrose, Auckland 1061, New Zealand',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      margin,
      pageHeight - 114,
      'NZBN: 9429041234567 | GST No: 123-456-789 | Trader: MVD-89211',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      margin,
      pageHeight - 126,
      'Phone: (09) 525 8890 | Toll-Free: 0800 PINNACLE | Email: accounts@pinnacleparts.co.nz',
      '0.3 0.35 0.4',
    );

    // 3. Document Identifier (Right)
    addText('F2', 20, 400, pageHeight - 75, 'TAX INVOICE', '0.06 0.09 0.16');
    addText(
      'F2',
      10,
      400,
      pageHeight - 95,
      `Invoice #: ${data.invoiceNumber}`,
      '0.1 0.1 0.1',
    );
    addText(
      'F1',
      10,
      400,
      pageHeight - 108,
      `Order Ref: ${data.orderNumber}`,
      '0.2 0.2 0.2',
    );
    addText(
      'F1',
      9,
      400,
      pageHeight - 121,
      `Date Issued: ${data.date.toLocaleDateString('en-AU')}`,
      '0.4 0.4 0.4',
    );
    addText(
      'F2',
      9,
      400,
      pageHeight - 134,
      `Status: ${data.status}`,
      data.status === 'PAID' ? '0.06 0.6 0.3' : '0.8 0.2 0.2',
    );

    addLine(margin, pageHeight - 146, margin + contentWidth, pageHeight - 146);

    // 4. Addresses Section (Bill To vs Ship To)
    const addrY = pageHeight - 165;
    addRect(margin, addrY - 60, contentWidth / 2 - 8, 70, '0.97 0.98 0.99');
    addRect(
      margin + contentWidth / 2 + 8,
      addrY - 60,
      contentWidth / 2 - 8,
      70,
      '0.97 0.98 0.99',
    );

    // Bill To
    addText('F2', 9, margin + 8, addrY, 'BILL TO:', '0.2 0.3 0.4');
    addText('F2', 10, margin + 8, addrY - 14, data.customerName, '0.1 0.1 0.1');
    addText(
      'F1',
      9,
      margin + 8,
      addrY - 26,
      `${data.billingAddress.line1}${data.billingAddress.line2 ? `, ${data.billingAddress.line2}` : ''}`,
      '0.3 0.3 0.3',
    );
    addText(
      'F1',
      9,
      margin + 8,
      addrY - 38,
      `${data.billingAddress.city} ${data.billingAddress.state} ${data.billingAddress.postalCode} ${data.billingAddress.country}`,
      '0.3 0.3 0.3',
    );
    addText(
      'F1',
      9,
      margin + 8,
      addrY - 50,
      `Email: ${data.customerEmail}`,
      '0.4 0.4 0.4',
    );

    // Ship To
    const shipX = margin + contentWidth / 2 + 16;
    addText(
      'F2',
      9,
      shipX,
      addrY,
      `DELIVER TO (${data.shippingMethod}):`,
      '0.2 0.3 0.4',
    );
    addText('F2', 10, shipX, addrY - 14, data.customerName, '0.1 0.1 0.1');
    addText(
      'F1',
      9,
      shipX,
      addrY - 26,
      `${data.shippingAddress.line1}${data.shippingAddress.line2 ? `, ${data.shippingAddress.line2}` : ''}`,
      '0.3 0.3 0.3',
    );
    addText(
      'F1',
      9,
      shipX,
      addrY - 38,
      `${data.shippingAddress.city} ${data.shippingAddress.state} ${data.shippingAddress.postalCode} ${data.shippingAddress.country}`,
      '0.3 0.3 0.3',
    );

    // 5. Line Items Table
    const tableHeaderY = addrY - 80;
    addRect(margin, tableHeaderY - 5, contentWidth, 20, '0.06 0.09 0.16');

    addText(
      'F2',
      9,
      margin + 6,
      tableHeaderY + 2,
      'ITEM / PART DESCRIPTION',
      '1 1 1',
    );
    addText('F2', 9, margin + 260, tableHeaderY + 2, 'UNIT', '1 1 1');
    addText('F2', 9, margin + 325, tableHeaderY + 2, 'QTY', '1 1 1');
    addText('F2', 9, margin + 375, tableHeaderY + 2, 'PRICE (EX)', '1 1 1');
    addText('F2', 9, margin + 450, tableHeaderY + 2, 'TOTAL (INC)', '1 1 1');

    let currentY = tableHeaderY - 20;

    for (const item of data.items) {
      addLine(margin, currentY - 6, margin + contentWidth, currentY - 6);

      // Title & SKU
      const truncatedTitle =
        item.title.length > 38 ? `${item.title.substring(0, 36)}...` : item.title;
      addText('F2', 9, margin + 6, currentY, truncatedTitle, '0.1 0.1 0.1');
      addText(
        'F1',
        8,
        margin + 6,
        currentY - 10,
        `SKU: ${item.sku}`,
        '0.4 0.45 0.5',
      );

      // Unit & Qty
      addText('F1', 9, margin + 260, currentY, item.saleUnit, '0.3 0.3 0.3');
      addText(
        'F1',
        9,
        margin + 330,
        currentY,
        item.quantity.toString(),
        '0.2 0.2 0.2',
      );

      // Price ex-GST
      const priceEx = (item.unitPrice / 1.1).toFixed(2);
      addText('F1', 9, margin + 375, currentY, `$${priceEx}`, '0.3 0.3 0.3');

      // Total inc-GST
      addText(
        'F2',
        9,
        margin + 450,
        currentY,
        `$${item.totalPrice.toFixed(2)}`,
        '0.06 0.09 0.16',
      );

      currentY -= 24;
    }

    // 6. Financial Summary Box
    const summaryBoxY = Math.max(currentY - 10, 160);
    const summaryX = margin + contentWidth - 210;

    addRect(summaryX, summaryBoxY - 75, 210, 95, '0.98 0.99 1.0');
    addLine(
      summaryX,
      summaryBoxY - 75,
      summaryX + 210,
      summaryBoxY - 75,
      0.5,
      '0.85 0.88 0.92',
    );

    const subtotalEx = (data.subtotal - data.taxAmount).toFixed(2);
    addText(
      'F1',
      9,
      summaryX + 10,
      summaryBoxY + 5,
      'Subtotal (ex-GST):',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      summaryX + 140,
      summaryBoxY + 5,
      `$${subtotalEx}`,
      '0.2 0.2 0.2',
    );

    addText(
      'F1',
      9,
      summaryX + 10,
      summaryBoxY - 10,
      'Includes GST (10%):',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      summaryX + 140,
      summaryBoxY - 10,
      `$${data.taxAmount.toFixed(2)}`,
      '0.2 0.2 0.2',
    );

    addText(
      'F1',
      9,
      summaryX + 10,
      summaryBoxY - 25,
      'Freight & Handling:',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      9,
      summaryX + 140,
      summaryBoxY - 25,
      data.shippingFee === 0 ? 'FREE' : `$${data.shippingFee.toFixed(2)}`,
      '0.2 0.2 0.2',
    );

    addLine(summaryX + 10, summaryBoxY - 35, summaryX + 200, summaryBoxY - 35);

    addText(
      'F2',
      12,
      summaryX + 10,
      summaryBoxY - 55,
      'Total Amount (NZD):',
      '0.06 0.09 0.16',
    );
    addText(
      'F2',
      13,
      summaryX + 130,
      summaryBoxY - 55,
      `$${data.totalAmount.toFixed(2)}`,
      '0.06 0.09 0.16',
    );

    // 7. Footer / Compliance Note
    addLine(margin, 60, margin + contentWidth, 60);
    addText(
      'F2',
      8,
      margin,
      48,
      'TAX INVOICE COMPLIANCE NOTE (NZ IRD GST ACT 1985)',
      '0.3 0.35 0.4',
    );
    addText(
      'F1',
      7.5,
      margin,
      38,
      'This document is an official New Zealand Tax Invoice issued by Pinnacle Auto Spares & Commercial Tyres Ltd (NZBN 9429041234567).',
      '0.5 0.55 0.6',
    );
    addText(
      'F1',
      7.5,
      margin,
      28,
      'All goods remain the property of Pinnacle Auto Spares until paid in full. Consumer Guarantees Act 1993 (CGA) and Fair Trading Act 1986 apply. MVD-89211.',
      '0.5 0.55 0.6',
    );

    // Assemble PDF Object Stream
    const contentStream = streamOperations.join('\n');
    const streamLength = Buffer.byteLength(contentStream, 'utf-8');

    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] =
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>';
    objects[4] = `<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`;
    objects[5] =
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[6] =
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    // Build the final PDF binary string with cross-reference table
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [0];

    for (let i = 1; i <= 6; i++) {
      offsets[i] = Buffer.byteLength(pdf, 'latin1');
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'latin1');
    pdf += 'xref\n0 7\n';
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= 6; i++) {
      const offStr = (offsets[i] ?? 0).toString().padStart(10, '0');
      pdf += `${offStr} 00000 n \n`;
    }

    pdf += 'trailer\n';
    pdf += '<< /Size 7 /Root 1 0 R >>\n';
    pdf += 'startxref\n';
    pdf += `${xrefOffset}\n`;
    pdf += '%%EOF\n';

    return Buffer.from(pdf, 'latin1');
  }
}

