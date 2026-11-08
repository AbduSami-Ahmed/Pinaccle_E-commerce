export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BUSINESS_HEADER = `
  <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; margin: 0; letter-spacing: 0.5px;">
      PINNACLE AUTO SPARES &amp; COMMERCIAL TYRES
    </h1>
    <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0; letter-spacing: 0.3px;">
      Auckland Central Trade Hub &bull; Registered Trader MVD-89211 &bull; NZBN 9429041234567
    </p>
  </div>
`;

const BUSINESS_FOOTER = `
  <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-radius: 0 0 8px 8px; font-family: sans-serif;">
    <p style="margin: 0 0 4px 0;"><strong>Pinnacle Auto Spares &amp; Commercial Tyres Ltd</strong></p>
    <p style="margin: 0 0 4px 0;">18 Industry Road, Penrose, Auckland 1061, New Zealand | Toll-Free: 0800 PINNACLE | Phone: (09) 525 8890</p>
    <p style="margin: 0 0 8px 0;">NZ Registered Motor Vehicle Trader: MVD-89211 &bull; GST No: 123-456-789 &bull; Trade Enquiries: trade@pinnacleparts.co.nz</p>
    <p style="margin: 0; color: #94a3b8; font-size: 10px;">
      This is an automated operational notification. For your security, Pinnacle will never ask for your card PIN or full password via email.
    </p>
  </div>
`;

function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    ${BUSINESS_HEADER}
    <div style="padding: 28px 24px; color: #1e293b; line-height: 1.5; font-size: 14px;">
      ${bodyContent}
    </div>
    ${BUSINESS_FOOTER}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Order Confirmation Template
// ---------------------------------------------------------------------------

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  items: Array<{
    title: string;
    sku: string;
    saleUnit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  shippingMethod: string;
  shippingAddressText: string;
}

export function renderOrderConfirmation(data: OrderConfirmationData): RenderedEmail {
  const subject = `Order Confirmed: ${data.orderNumber} - Pinnacle Auto Spares`;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0;">
          <div style="font-weight: 600; color: #0f172a;">${item.title}</div>
          <div style="font-size: 12px; color: #64748b;">SKU: ${item.sku} &bull; Unit: ${item.saleUnit}</div>
        </td>
        <td style="padding: 10px 8px; text-align: center; color: #334155;">${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">
          $${item.totalPrice.toFixed(2)} ${data.currency}
        </td>
      </tr>`,
    )
    .join('');

  const itemsText = data.items
    .map(
      (item) =>
        `- ${item.title} (SKU: ${item.sku}, Unit: ${item.saleUnit}) x ${item.quantity} = $${item.totalPrice.toFixed(2)}`,
    )
    .join('\n');

  const html = wrapHtml(
    subject,
    `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Thank You, ${data.customerName}</h2>
    <p style="margin-bottom: 20px; color: #475569;">
      Your order <strong>${data.orderNumber}</strong> has been received and confirmed. Our Auckland warehouse team is preparing your parts.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Fulfilment Details</h3>
      <p style="margin: 0 0 4px 0; font-size: 13px;"><strong>Method:</strong> ${data.shippingMethod}</p>
      <p style="margin: 0; font-size: 13px;"><strong>Destination:</strong> ${data.shippingAddressText}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase;">
          <th style="padding-bottom: 6px;">Item Description</th>
          <th style="padding-bottom: 6px; text-align: center;">Qty</th>
          <th style="padding-bottom: 6px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; margin-left: auto; max-width: 260px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
        <span>Subtotal (ex GST):</span>
        <span>$${(data.subtotal - data.taxAmount).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
        <span>GST (15%):</span>
        <span>$${data.taxAmount.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
        <span>Freight / Delivery:</span>
        <span>${data.shippingFee === 0 ? 'FREE' : `$${data.shippingFee.toFixed(2)}`}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #cbd5e1; font-weight: 700; font-size: 15px; color: #0f172a;">
        <span>Total Paid:</span>
        <span>$${data.totalAmount.toFixed(2)} ${data.currency}</span>
      </div>
    </div>
  `,
  );

  const text = `
PINNACLE AUTO SPARES & COMMERCIAL TYRES
Order Confirmation: ${data.orderNumber}
Thank you, ${data.customerName}!

Your order has been confirmed.
Fulfilment Method: ${data.shippingMethod}
Destination: ${data.shippingAddressText}

Items Ordered:
${itemsText}

Subtotal (ex GST): $${(data.subtotal - data.taxAmount).toFixed(2)}
GST (15%): $${data.taxAmount.toFixed(2)}
Freight: ${data.shippingFee === 0 ? 'FREE' : `$${data.shippingFee.toFixed(2)}`}
Total Paid: $${data.totalAmount.toFixed(2)} ${data.currency}

Pinnacle Auto Spares Ltd, 18 Industry Rd, Penrose, Auckland 1061 (MVD-89211)
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 2. Payment Status Update Template
// ---------------------------------------------------------------------------

export interface PaymentStatusData {
  orderNumber: string;
  customerName: string;
  status: 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
  gatewayReference?: string;
  reason?: string;
}

export function renderPaymentStatusUpdate(data: PaymentStatusData): RenderedEmail {
  const isPaid = data.status === 'PAID';
  const isRefund = data.status === 'REFUNDED';
  const statusLabel = isPaid ? 'Payment Confirmed' : isRefund ? 'Refund Processed' : 'Payment Action Required';
  const subject = `${statusLabel}: Order ${data.orderNumber} - Pinnacle Auto Spares`;

  const bannerColor = isPaid ? '#10b981' : isRefund ? '#6366f1' : '#ef4444';

  const html = wrapHtml(
    subject,
    `
    <div style="border-left: 4px solid ${bannerColor}; padding-left: 14px; margin-bottom: 18px;">
      <h2 style="margin: 0; font-size: 17px; color: #0f172a;">${statusLabel}</h2>
      <p style="margin: 4px 0 0 0; color: #475569; font-size: 13px;">Order Reference: <strong>${data.orderNumber}</strong></p>
    </div>

    <p style="color: #334155;">Hello ${data.customerName},</p>

    ${
      isPaid
        ? `<p style="color: #334155;">We have received your payment of <strong>$${data.amount.toFixed(2)} ${data.currency}</strong> for order ${data.orderNumber}. Your order is now being processed for dispatch from our Auckland trade warehouse.</p>`
        : isRefund
          ? `<p style="color: #334155;">A refund of <strong>$${data.amount.toFixed(2)} ${data.currency}</strong> has been successfully processed to your original payment method for order ${data.orderNumber}. Please allow 2-5 business days for financial institution clearance.</p>`
          : `<p style="color: #b91c1c;">Your recent payment attempt of <strong>$${data.amount.toFixed(2)} ${data.currency}</strong> could not be processed. ${data.reason ? `Reason: ${data.reason}.` : ''} Please log into your Pinnacle account to update payment information.</p>`
    }

    ${
      data.gatewayReference
        ? `<p style="font-size: 12px; color: #64748b;">Transaction Reference: <code>${data.gatewayReference}</code></p>`
        : ''
    }
  `,
  );

  const text = `
PINNACLE AUTO SPARES - ${statusLabel}
Order: ${data.orderNumber}
Customer: ${data.customerName}
Amount: $${data.amount.toFixed(2)} ${data.currency}
Status: ${data.status}
${data.reason ? `Note: ${data.reason}` : ''}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 3. Dispatch / Collection Update Template
// ---------------------------------------------------------------------------

export interface DispatchUpdateData {
  orderNumber: string;
  customerName: string;
  type: 'COURIER_DISPATCH' | 'DEPOT_READY';
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  collectionLocation?: string;
  collectionPin?: string;
}

export function renderDispatchUpdate(data: DispatchUpdateData): RenderedEmail {
  const isCourier = data.type === 'COURIER_DISPATCH';
  const subject = isCourier
    ? `Your Parts Have Been Dispatched: Order ${data.orderNumber}`
    : `Ready for Trade Counter Collection: Order ${data.orderNumber}`;

  const html = wrapHtml(
    subject,
    `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">
      ${isCourier ? 'Goods Dispatched from Auckland Warehouse' : 'Ready for Trade Depot Collection'}
    </h2>

    <p style="color: #334155;">Hello ${data.customerName},</p>

    ${
      isCourier
        ? `
      <p style="color: #334155;">Your order <strong>${data.orderNumber}</strong> has been carefully packed and handed to our logistics carrier.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Carrier:</strong> ${data.carrierName || 'Courier Freight'}</p>
        <p style="margin: 0 0 10px 0; font-size: 13px;"><strong>Tracking Consignment:</strong> <code>${data.trackingNumber || 'Tracking Pending'}</code></p>
        ${
          data.trackingUrl
            ? `<a href="${data.trackingUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 8px 14px; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 600;">Track Consignment &rarr;</a>`
            : ''
        }
      </div>`
        : `
      <p style="color: #334155;">Your order <strong>${data.orderNumber}</strong> is ready for pickup at our Penrose trade counter.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Collection Point:</strong> 18 Industry Road, Penrose, Auckland 1061</p>
        <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Trade Hours:</strong> Monday - Friday 7:30 AM &ndash; 5:00 PM NZST</p>
        <p style="margin: 0; font-size: 13px; color: #0f172a;"><strong>Order Number for Counter Staff:</strong> <code>${data.orderNumber}</code></p>
      </div>`
    }
  `,
  );

  const text = `
PINNACLE AUTO SPARES
Order: ${data.orderNumber}
Customer: ${data.customerName}
${isCourier ? `Goods Dispatched via ${data.carrierName || 'Courier'}. Consignment: ${data.trackingNumber || 'N/A'}` : 'Your order is ready for collection at 18 Industry Rd, Penrose, Auckland 1061.'}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 4. Order Cancellation Template
// ---------------------------------------------------------------------------

export interface OrderCancelledData {
  orderNumber: string;
  customerName: string;
  reason: string;
  refundAmount?: number;
  currency: string;
}

export function renderOrderCancelled(data: OrderCancelledData): RenderedEmail {
  const subject = `Order Cancelled: ${data.orderNumber} - Pinnacle Auto Spares`;

  const html = wrapHtml(
    subject,
    `
    <h2 style="margin-top: 0; color: #991b1b; font-size: 18px;">Order Cancellation Confirmation</h2>
    <p style="color: #334155;">Hello ${data.customerName},</p>
    <p style="color: #334155;">Order <strong>${data.orderNumber}</strong> has been cancelled as requested.</p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #991b1b;"><strong>Reason for Cancellation:</strong></p>
      <p style="margin: 0; font-size: 13px; color: #7f1d1d;">${data.reason}</p>
    </div>

    ${
      data.refundAmount !== undefined && data.refundAmount > 0
        ? `<p style="color: #334155;">A full refund of <strong>$${data.refundAmount.toFixed(2)} ${data.currency}</strong> has been issued to your payment provider.</p>`
        : ''
    }
  `,
  );

  const text = `
PINNACLE AUTO SPARES
Order Cancellation: ${data.orderNumber}
Hello ${data.customerName}, your order has been cancelled.
Reason: ${data.reason}
${data.refundAmount ? `Refund: $${data.refundAmount.toFixed(2)} ${data.currency}` : ''}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 5. Return Status Update Template
// ---------------------------------------------------------------------------

export interface ReturnUpdateData {
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  returnStatus: string;
  decisionNote?: string;
  restockOrDispose?: string;
  refundAmount?: number;
  currency: string;
}

export function renderReturnUpdate(data: ReturnUpdateData): RenderedEmail {
  const subject = `Return Update: RMA ${data.returnNumber} (Order ${data.orderNumber}) - Pinnacle Auto Spares`;

  const html = wrapHtml(
    subject,
    `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Return Merchandise Update</h2>
    <p style="color: #334155;">Hello ${data.customerName},</p>
    <p style="color: #334155;">Your return RMA <strong>${data.returnNumber}</strong> for order <strong>${data.orderNumber}</strong> has been updated.</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px;"><strong>Current RMA Status:</strong> <span style="font-weight: 700; color: #0f172a;">${data.returnStatus}</span></p>
      ${data.decisionNote ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"><strong>Inspection Note:</strong> ${data.decisionNote}</p>` : ''}
      ${data.refundAmount ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d;"><strong>Refund Approved:</strong> $${data.refundAmount.toFixed(2)} ${data.currency}</p>` : ''}
    </div>
  `,
  );

  const text = `
PINNACLE AUTO SPARES
Return RMA: ${data.returnNumber} for Order ${data.orderNumber}
Status: ${data.returnStatus}
${data.decisionNote ? `Inspection Note: ${data.decisionNote}` : ''}
${data.refundAmount ? `Refund Approved: $${data.refundAmount.toFixed(2)} ${data.currency}` : ''}
`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 6. Account Welcome / Password Messages
// ---------------------------------------------------------------------------

export interface AccountMessageData {
  customerName: string;
  type: 'WELCOME' | 'PASSWORD_RESET';
  actionUrl: string;
  expiresInMinutes?: number;
}

export function renderAccountMessage(data: AccountMessageData): RenderedEmail {
  const isWelcome = data.type === 'WELCOME';
  const subject = isWelcome
    ? 'Welcome to Pinnacle Auto Spares & Commercial Tyres'
    : 'Reset Your Pinnacle Account Password';

  const html = wrapHtml(
    subject,
    `
    <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">
      ${isWelcome ? 'Welcome to Pinnacle Auto Spares' : 'Password Reset Request'}
    </h2>
    <p style="color: #334155;">Hello ${data.customerName},</p>

    ${
      isWelcome
        ? `
      <p style="color: #334155;">Thank you for registering with Pinnacle Auto Spares. Your account provides direct access to our verified vehicle fitment catalogue, trade pricing tiers, and rapid order dispatch from our Auckland hub.</p>
      <div style="margin: 24px 0;">
        <a href="${data.actionUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px;">
          Access Your Trade Account &rarr;
        </a>
      </div>`
        : `
      <p style="color: #334155;">We received a request to reset your password for your Pinnacle account. Click the button below to choose a new password.</p>
      <div style="margin: 24px 0;">
        <a href="${data.actionUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 13px;">
          Reset Password &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b;">
        This link is cryptographically protected and will expire in ${data.expiresInMinutes || 30} minutes. If you did not request this, you can safely ignore this email.
      </p>`
    }
  `,
  );

  const text = `
PINNACLE AUTO SPARES
${isWelcome ? 'Welcome to Pinnacle Auto Spares!' : 'Password Reset Request'}
Hello ${data.customerName},
Please visit the following secure link:
${data.actionUrl}
`;

  return { subject, html, text };
}

