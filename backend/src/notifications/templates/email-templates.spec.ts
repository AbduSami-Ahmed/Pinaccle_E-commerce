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
    it('renders complete New Zealand order confirmation template with tax calculations', () => {
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
        taxAmount: 146.09,
        shippingFee: 0.0,
        totalAmount: 1120.0,
        currency: 'NZD',
        shippingMethod: 'Click & Collect (Auckland Trade Hub)',
        shippingAddressText: '18 Industry Road, Penrose, Auckland 1061',
      });

      expect(rendered.subject).toContain('Order Confirmed: PIN-2026-10042');
      expect(rendered.html).toContain('PINNACLE AUTO SPARES');
      expect(rendered.html).toContain('Marcus Vance');
      expect(rendered.html).toContain('Bridgestone Dueler');
      expect(rendered.html).toContain('$1120.00 NZD');
      expect(rendered.html).toContain('GST (15%)');
      expect(rendered.html).toContain('MVD-89211');
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
        currency: 'NZD',
        gatewayReference: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
      });

      expect(rendered.subject).toContain('Payment Confirmed');
      expect(rendered.html).toContain('pi_3MtwBwLkdIwHu7ix28a3tqPa');
      expect(rendered.html).toContain('$1120.00 NZD');
    });

    it('renders failed payment warning without exposing raw internal card details', () => {
      const rendered = renderPaymentStatusUpdate({
        orderNumber: 'PIN-2026-10043',
        customerName: 'Sarah Jenkins',
        status: 'FAILED',
        amount: 340.0,
        currency: 'NZD',
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
        carrierName: 'CourierPost / NZ Post',
        trackingNumber: 'NZP-99882211',
        trackingUrl: 'https://www.nzpost.co.nz/tools/tracking?track=NZP-99882211',
      });

      expect(rendered.subject).toContain('Your Parts Have Been Dispatched');
      expect(rendered.html).toContain('CourierPost / NZ Post');
      expect(rendered.html).toContain('NZP-99882211');
      expect(rendered.html).toContain('https://www.nzpost.co.nz/tools/tracking?track=NZP-99882211');
    });

    it('renders trade depot pickup details for click & collect', () => {
      const rendered = renderDispatchUpdate({
        orderNumber: 'PIN-2026-10045',
        customerName: 'Dave Miller',
        type: 'DEPOT_READY',
      });

      expect(rendered.subject).toContain('Ready for Trade Counter Collection');
      expect(rendered.html).toContain('18 Industry Road, Penrose, Auckland 1061');
    });
  });

  describe('renderOrderCancelled & renderReturnUpdate', () => {
    it('renders cancellation reason and refund details', () => {
      const rendered = renderOrderCancelled({
        orderNumber: 'PIN-2026-10046',
        customerName: 'Bob White',
        reason: 'Customer ordered incorrect rim diameter for vehicle',
        refundAmount: 560.0,
        currency: 'NZD',
      });

      expect(rendered.subject).toContain('Order Cancelled: PIN-2026-10046');
      expect(rendered.html).toContain('Customer ordered incorrect rim diameter');
      expect(rendered.html).toContain('$560.00 NZD');
    });

    it('renders return RMA update with inspection notes', () => {
      const rendered = renderReturnUpdate({
        returnNumber: 'RMA-2026-004',
        orderNumber: 'PIN-2026-10046',
        customerName: 'Bob White',
        returnStatus: 'APPROVED',
        decisionNote: 'Item inspected in original unbolted packaging. Restock approved.',
        refundAmount: 560.0,
        currency: 'NZD',
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
        actionUrl: 'https://pinnacleparts.co.nz/auth/reset-password?token=sec_abc123',
        expiresInMinutes: 30,
      });

      expect(rendered.subject).toContain('Reset Your Pinnacle Account Password');
      expect(rendered.html).toContain('30 minutes');
      expect(rendered.html).toContain('https://pinnacleparts.co.nz/auth/reset-password?token=sec_abc123');
    });
  });
});

