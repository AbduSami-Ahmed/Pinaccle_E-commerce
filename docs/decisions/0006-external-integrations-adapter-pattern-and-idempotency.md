# ADR 0006: External Integration Adapters and Webhook Idempotency

## Status

Accepted

## Context

E-commerce platforms rely on third-party external services: payment gateways (e.g., Stripe, PayPal), shipping and courier APIs (e.g., Australia Post, FedEx), transactional email providers (e.g., AWS SES, Resend), and S3-compatible storage.

Coupling domain logic directly to vendor-specific SDKs creates vendor lock-in, complicates automated testing, and exposes the application to external network instability and duplicate webhook events.

## Decision

We enforce strict integration boundaries via **Provider Adapters** and **Idempotency**:

1. **Provider-Agnostic Adapter Pattern**:
   - Every external service must be hidden behind a TypeScript interface:
     - `PaymentGatewayAdapter` (`createPaymentIntent`, `capturePayment`, `refundPayment`)
     - `ShippingCarrierAdapter` (`calculateRates`, `createShipment`, `getTrackingStatus`)
     - `StorageService` (`getPresignedUploadUrl`, `deleteObject`)
     - `NotificationAdapter` (`sendOrderConfirmation`, `sendShippingUpdate`)
   - Domain modules depend exclusively on these abstract interfaces.
   - For local development and testing, mock implementations (`MockPaymentGatewayAdapter`, `LocalMinioStorageAdapter`) simulate external interactions without requiring paid credentials or network access.
2. **Webhook Idempotency & Cryptographic Verification**:
   - Inbound webhooks from payment gateways and carriers must first be verified cryptographically using vendor signing secrets.
   - Every webhook payload is recorded in a `PaymentWebhookLog` table with a unique external event ID.
   - Processing uses atomic database idempotency keys: duplicate events are safely acknowledged with HTTP 200 without executing duplicate order creations, payment captures, or refunds.

## Consequences

- Clean separation of business logic from vendor SDKs.
- Frictionless local testing and CI test runs without external API dependencies.
- Resilience against duplicate webhook delivery and network retries.
