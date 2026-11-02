# Open Decisions & Client Confirmations: Pinnacle E-Commerce

This document tracks critical architectural, functional, and commercial decisions requiring client review and confirmation before or during implementation.

---

### OD-001: Custom Checkout vs. Shopify / Hosted Checkout

- **Context**: The project brief specifies building a production-minded automotive parts platform using Next.js, NestJS, and PostgreSQL. Some legacy automotive retailers use hosted checkouts (like Shopify Buy Button or Shopify Storefront API) while others maintain fully custom checkouts.
- **Analysis**:
  - _Shopify / Hosted Checkout_: Reduces initial compliance burden for PCI-DSS, but severely fragments the user experience, creates dual sources of truth for inventory, disrupts time-limited soft stock reservations on serialized seat belts, and imposes recurring Shopify platform fees on gross merchandise value.
  - _Custom Checkout (Next.js + NestJS + Stripe Elements / Hosted Fields)_: Provides complete control over the checkout funnel, enables vehicle fitment verification checks during checkout, enforces transactional atomic inventory reservation (essential for unique serialized seat belts and tyre bundle consumption), maintains zero external SaaS platform fees, and leaves customer data within Pinnacle's own PostgreSQL database.
- **Recommendation**: **Custom Checkout** powered by Next.js and NestJS, using Stripe Elements / Payment Intents for secure, SAQ-A compliant card tokenization without handling raw card numbers.
- **Status**: **Pending Client Confirmation**.

---

### OD-002: Primary Payment Provider Selection

- **Context**: The platform requires credit card processing, digital wallets (Apple Pay, Google Pay), and potentially buy-now-pay-later (Afterpay / Klarna / Zip) popular in automotive parts retail.
- **Options**:
  1. _Stripe_: Industry standard, comprehensive TypeScript SDK, robust webhooks, built-in Apple Pay/Google Pay via Payment Element, pre-authorizations, and automated refund APIs.
  2. _Adyen_: Suited for enterprise omnichannel and point-of-sale terminal integration, higher setup complexity.
  3. _PayPal / Braintree_: High global recognition, but higher integration friction and dual webhook architecture.
- **Recommendation**: Launch with **Stripe** behind our abstract `PaymentGatewayAdapter`. This enables adding PayPal or local gateways in future iterations without changing the checkout interface or order module.
- **Status**: **Pending Client Confirmation**.

---

### OD-003: Shipping & Click-and-Collect Pickup Rules

- **Context**: Automotive tyres are heavy, bulky freight, while seat belts are lightweight parcels. Delivering a set of four 20" 4x4 tyres across regional zones has significantly different logistics economics compared to shipping a padded satchel seat belt.
- **Options**:
  1. _Fixed Flat-Rate Tier_: Simple flat rate for standard items, fixed surcharge per tyre (e.g., \$15/tyre).
  2. _Live Carrier API Calculation (e.g., Australia Post, FedEx, StarTrack, TNT)_: Real-time API rate query based on customer destination postcode and cubic parcel weight.
  3. _Depot / Click & Collect Pickup_: Customer collects from warehouse or certified partner depot with zero shipping charges.
- **Recommendation**: Implement a hybrid model:
  - Phase 1: Zone-based table rates with tyre per-unit surcharge, plus free Click & Collect at warehouse locations.
  - Phase 2: Live carrier API calculation integrated via `ShippingCarrierAdapter`.
- **Status**: **Pending Client Confirmation** (Client must define regional shipping zones, flat rates, and warehouse pickup locations).

---

### OD-004: Currency, Tax, and Pricing Configuration

- **Context**: Retail tax rules depend on operating jurisdiction:
  - _Australia (AUD)_: Prices must be advertised **inclusive** of 10% GST.
  - _USA (USD)_: Prices advertised **exclusive** of tax; state/county sales tax calculated at checkout.
  - _UK/EU (GBP/EUR)_: Prices advertised **inclusive** of 20% VAT.
- **Questions for Client**:
  1. What is the primary operational country and default billing currency (e.g., AUD, USD, GBP, CAD)?
  2. Are display prices tax-inclusive (GST/VAT) or tax-exclusive (US style)?
  3. Is multi-currency support required for initial launch, or single local currency?
- **Recommendation**: Configure single primary currency with tax-inclusive pricing setting toggle in `system_settings` to allow regional adjustment.
- **Status**: **Pending Client Confirmation**.

---

### OD-005: Stock Sale-Unit Consumption & Shared Inventory Deductions

- **Context**: Tyres can be purchased as a Single (1), Pair (2), or Set of 4. A customer purchasing 1 "Set of 4" consumes 4 units of the underlying tyre SKU.
- **Concurrency & Reservation Rules**:
  - What occurs if only 3 tyres remain in stock? The "Single" and "Pair" sale units remain available, but the "Set of 4" option must automatically become disabled.
  - Soft Reservation: When a customer enters checkout with 2 pairs (4 units), should those 4 units be temporarily locked (e.g. 15 minutes) to prevent a concurrent buyer from checking out?
- **Recommendation**: Enforce dynamic availability calculation via `Floor(Available_Stock / Sale_Unit_Multiplier)` and implement a 15-minute soft reservation lock backed by database transaction row locking.
- **Status**: **Proposed / Awaiting Confirmation**.

---

### OD-006: Required Product Fields & Category Schema Definitions

- **Context**: To ensure data consistency across thousands of parts, required versus optional fields must be agreed upon.
- **Proposed Required Fields for Tyres**:
  - Brand (e.g., Michelin, Bridgestone)
  - Pattern / Model (e.g., Pilot Sport 4)
  - Width (mm), Aspect Ratio (%), Rim Diameter (inches)
  - Load Index & Speed Rating
  - Season (Summer, Winter, All-Season)
- **Proposed Required Fields for Seat Belts**:
  - Vehicle Make & Model compatibility
  - Vehicle Position (Front-Left, Front-Right, Rear-Left, Rear-Right, Center)
  - Pretensioner status (Active, Deployed, Non-Pyrotechnic)
  - Condition Grade (New Surplus, Grade A, Grade B, Grade C)
  - High-resolution photographs of the actual physical unit
- **Status**: **Pending Client Confirmation**.

---

### OD-007: External Provider API Access & Secrets Availability

- **Context**: The platform interacts with several external services (Payment Gateway, S3 Object Storage, Transactional Email, Shipping Carriers).
- **Current Development Reality**: Real production API credentials and paid sandbox accounts are not yet provided.
- **Strategy**:
  - Implement fully functional **Mock/Sandbox Adapters** for local development and CI testing (e.g., MinIO for local S3, Local Mock Payment Gateway simulating successful and failed charges).
  - External production adapters (Stripe, AWS S3, AWS SES) will be activated cleanly via environment variables as soon as credentials are provided.
- **Status**: **Confirmed Engineering Strategy**.

---

### OD-008: Monorepo Workspace Tooling (npm vs pnpm vs Turborepo)

- **Context**: Node.js `v22.13.1` and `npm 10.9.2` are installed locally. `pnpm` is not globally installed in PATH.
- **Options**:
  1. _npm workspaces + Turborepo_: Standard npm package manager, zero external installation friction, combined with Turborepo for fast parallel task caching.
  2. _pnpm workspaces_: Fast disk symlinking, but requires enabling Corepack or installing pnpm globally.
- **Recommendation**: Initialize repository with standard npm workspaces (`apps/web`, `apps/api`, `packages/*`) and Turborepo for build pipelines.
- **Status**: **Proposed / Awaiting Confirmation**.
