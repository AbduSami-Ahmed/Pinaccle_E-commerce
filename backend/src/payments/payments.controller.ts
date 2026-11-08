import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { CreatePaymentIntentRequestDto, MockPaymentConfirmRequestDto } from './dto/payment.dto';
import { PaymentSessionResponseDto, PaymentWebhookResultDto } from '@pinnacle/contracts';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ---------------------------------------------------------------------------
  // POST /payments/session
  // ---------------------------------------------------------------------------

  @Public()
  @RateLimit({ windowSeconds: 60, maxRequests: 10, message: 'Payment intent limit exceeded. Please wait 1 minute before retrying.' })
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create payment session/intent for an order' })
  @ApiOkResponse({ description: 'Payment session created' })
  async createSession(
    @Body() dto: CreatePaymentIntentRequestDto,
  ): Promise<PaymentSessionResponseDto> {
    return this.paymentsService.createPaymentSession(dto);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/webhook
  // ---------------------------------------------------------------------------

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generic webhook callback handler for payment gateways' })
  @ApiOkResponse({ description: 'Webhook acknowledged' })
  async handleGenericWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<PaymentWebhookResultDto> {
    const rawPayload = (req as any).rawBody || body;
    return this.paymentsService.handleWebhook('STRIPE', rawPayload, headers);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/webhook/stripe
  // ---------------------------------------------------------------------------

  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver with signature verification' })
  @ApiOkResponse({ description: 'Stripe webhook acknowledged' })
  async handleStripeWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<PaymentWebhookResultDto> {
    const rawPayload = (req as any).rawBody || body;
    return this.paymentsService.handleWebhook('STRIPE', rawPayload, headers);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/mock/confirm
  // ---------------------------------------------------------------------------

  @Public()
  @Post('mock/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate instant payment confirmation in development' })
  @ApiCreatedResponse({ description: 'Payment simulated' })
  async confirmMockPayment(
    @Body() dto: MockPaymentConfirmRequestDto,
  ): Promise<{ success: boolean; status: string; orderNumber: string }> {
    return this.paymentsService.confirmMockPayment(
      dto.transactionReference,
      dto.simulateSuccess !== false,
    );
  }
}
