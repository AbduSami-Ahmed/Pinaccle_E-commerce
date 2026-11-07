import {
  renderAccountMessage,
  renderDispatchUpdate,
  renderOrderCancelled,
  renderOrderConfirmation,
  renderPaymentStatusUpdate,
  renderReturnUpdate,
} from './email-templates';

describe('EmailTemplates', () => {
  describe('renderOrderConfirmation', () => {
    it('renders complete Australian order confirmation template with tax calculations', () => {
      const rendered = renderOrderConfirmation({
        orderNumber: 'PIN-2026-10042',
        customerName: 'Marcus Vance',
        items: [
          {
            title: 'Bridgestone Dueler A/T 001 265/65R17',
            sku: 'TYRE-BRI-2656517',
            saleUnit: 'Set of 4',
            quantity: 1,
            unitPrice: 1120.0,
            totalPrice: 1120.0,
          },
        ],
        subtotal: 1120.0,
        taxAmount: 101.82,
        shippingFee: 0.0,
        totalAmount: 1120.0,
        currency: 'AUD',
        shippingMethod: 'Click & Collect (Prestons Warehouse)',
        shippingAddressText: '42 Jedda Rd, Prestons NSW 2170',
      });

      expect(rendered.subject).toContain('Order Confirmed: PIN-2026-10042');
      expect(rendered.html).toContain('PINNACLE AUTO SPARES');
      expect(rendered.html).toContain('Marcus Vance');
      expect(rendered.html).toContain('Bridgestone Dueler');
      expect(rendered.html).toContain('$1120.00 AUD');
      expect(rendered.html).toContain('GST (10%)');
      expect(rendered.html).toContain('MVRL-58291');
      expect(rendered.text).toContain('PIN-2026-10042');
    });
  });

  describe('renderPaymentStatusUpdate', () => {
    it('renders paid payment status with transaction confirmation', () => {
      const rendered = renderPaymentStatusUpdate({
        orderNumber: 'PIN-2026-10042',
        customerName: 'Marcus Vance',
        status: 'PAID',
        amount: 1120.0,
        currency: 'AUD',
        gatewayReference: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
      });

      expect(rendered.subject).toContain('Payment Confirmed');
      expect(rendered.html).toContain('pi_3MtwBwLkdIwHu7ix28a3tqPa');
      expect(rendered.html).toContain('$1120.00 AUD');
    });

    it('renders failed payment warning without exposing raw internal card details', () => {
      const rendered = renderPaymentStatusUpdate({
        orderNumber: 'PIN-2026-10043',
        customerName: 'Sarah Jenkins',
        status: 'FAILED',
        amount: 340.0,
        currency: 'AUD',
        reason: 'Insufficient funds on credit card',
      });

      expect(rendered.subject).toContain('Payment Action Required');
      expect(rendered.html).toContain('Insufficient funds on credit card');
      expect(rendered.html).not.toContain('4111');
    });
  });

  describe('renderDispatchUpdate', () => {
    it('renders courier tracking details for dispatched freight', () => {
      const rendered = renderDispatchUpdate({
        orderNumber: 'PIN-2026-10044',
        customerName: 'Dave Miller',
        type: 'COURIER_DISPATCH',
        carrierName: 'StarTrack Express',
        trackingNumber: 'ST-99882211',
        trackingUrl: 'https://startrack.com.au/track/ST-99882211',
      });

      expect(rendered.subject).toContain('Your Parts Have Been Dispatched');
      expect(rendered.html).toContain('StarTrack Express');
      expect(rendered.html).toContain('ST-99882211');
      expect(rendered.html).toContain('https://startrack.com.au/track/ST-99882211');
    });

    it('renders trade depot pickup details for click & collect', () => {
      const rendered = renderDispatchUpdate({
        orderNumber: 'PIN-2026-10045',
        customerName: 'Dave Miller',
        type: 'DEPOT_READY',
      });

      expect(rendered.subject).toContain('Ready for Trade Counter Collection');
      expect(rendered.html).toContain('42 Jedda Road, Prestons NSW 2170');
    });
  });

  describe('renderOrderCancelled & renderReturnUpdate', () => {
    it('renders cancellation reason and refund details', () => {
      const rendered = renderOrderCancelled({
        orderNumber: 'PIN-2026-10046',
        customerName: 'Bob White',
        reason: 'Customer ordered incorrect rim diameter for vehicle',
        refundAmount: 560.0,
        currency: 'AUD',
      });

      expect(rendered.subject).toContain('Order Cancelled: PIN-2026-10046');
      expect(rendered.html).toContain('Customer ordered incorrect rim diameter');
      expect(rendered.html).toContain('$560.00 AUD');
    });

    it('renders return RMA update with inspection notes', () => {
      const rendered = renderReturnUpdate({
        returnNumber: 'RMA-2026-004',
        orderNumber: 'PIN-2026-10046',
        customerName: 'Bob White',
        returnStatus: 'APPROVED',
        decisionNote: 'Item inspected in original unbolted packaging. Restock approved.',
        refundAmount: 560.0,
        currency: 'AUD',
      });

      expect(rendered.subject).toContain('Return Update: RMA RMA-2026-004');
      expect(rendered.html).toContain('Restock approved');
    });
  });

  describe('renderAccountMessage', () => {
    it('renders password reset link with expiry disclaimer', () => {
      const rendered = renderAccountMessage({
        customerName: 'Alex Thorne',
        type: 'PASSWORD_RESET',
        actionUrl: 'https://pinnacleautospares.com.au/auth/reset-password?token=sec_abc123',
        expiresInMinutes: 30,
      });

      expect(rendered.subject).toContain('Reset Your Pinnacle Account Password');
      expect(rendered.html).toContain('30 minutes');
      expect(rendered.html).toContain('https://pinnacleautospares.com.au/auth/reset-password?token=sec_abc123');
    });
  });
});

