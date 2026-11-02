# Requirements Specification: Pinnacle E-Commerce

## 1. Introduction

This document defines the comprehensive Functional Requirements (FR) and Non-Functional Requirements (NFR) governing the Pinnacle Automotive Parts E-Commerce platform. Every requirement is uniquely indexed for end-to-end traceability across development, testing, and acceptance verification.

---

## 2. Functional Requirements

### 2.1 Catalogue & Category Specifications (FR-CAT)

- **FR-CAT-01 (Category Hierarchy)**: The system must support nested product categories with category-specific attribute schemas.
- **FR-CAT-02 (Tyre Dimensional Attributes)**: The catalogue must mandate standard tyre specifications for tyre products:
  - Section width (mm, e.g., 205)
  - Aspect ratio (%, e.g., 55)
  - Rim diameter (inches, e.g., 16)
  - Load index (numeric, e.g., 91)
  - Speed rating (character code, e.g., V)
  - Season/terrain classification (Summer, Winter, All-Season, All-Terrain, Mud-Terrain)
  - Run-flat flag (boolean)
- **FR-CAT-03 (Seat Belt Specifications)**: The catalogue must mandate seat belt specifications for seat belt products:
  - Vehicle position (Front-Left, Front-Right, Rear-Left, Rear-Right, Rear-Center, 3rd Row)
  - Component type (3-point retractor, buckle/stalk, lap belt, pretensioner)
  - Webbing color and length
  - Pretensioner status (Active, Deployed, Non-Pyrotechnic)
  - OEM part number reference
- **FR-CAT-04 (Media Management)**: The catalogue must support multiple product images, primary hero image selection, and sort ordering, stored in S3-compatible object storage via pre-signed upload URLs.
- **FR-CAT-05 (Product Lifecycle)**: Products must support status states (`DRAFT`, `PUBLISHED`, `ARCHIVED`) preventing unready items from appearing on the public storefront.

### 2.2 Physical Inventory & Stock Tracking (FR-INV)

- **FR-INV-01 (Separation of Catalogue vs Inventory)**: The system must strictly decouple catalogue product definitions from physical inventory items and warehouse bin locations.
- **FR-INV-02 (Bulk / Quantity-Tracked Stock)**: For commodity items (e.g., brand-new tyres), inventory must be tracked by aggregated quantity per warehouse location, batch receipt date, and unit cost price.
- **FR-INV-03 (Serialized Stock for Used / Unique Parts)**: For used/reconditioned parts (e.g., seat belts), each individual physical unit must possess:
  - A unique generated Stock ID / Serial Number barcode.
  - Condition grade (`NEW_OLD_STOCK`, `GRADE_A_EXCELLENT`, `GRADE_B_GOOD`, `GRADE_C_FAIR`).
  - Free-form physical condition inspection notes.
  - Dedicated actual photographs of that specific unit (buckle condition, label tag, retractor housing).
  - Exact warehouse shelf/bin location.
  - Lifecycle state (`AVAILABLE`, `RESERVED`, `SOLD`, `SCRAPPED`, `RETURN_UNDER_INSPECTION`).
- **FR-INV-04 (Stock Adjustments & Audit)**: Any manual increment, decrement, or relocation of physical stock must be executed as an atomic transaction requiring:
  - Mandatory reason code (e.g., `CYCLE_COUNT_DISCREPANCY`, `DAMAGED_IN_TRANSIT`, `SCRAP`).
  - Operator identity recorded in the audit log.
  - Explicit authorization check for value write-offs exceeding configured thresholds.

### 2.3 Sale Units & Deduction Mapping (FR-SALE)

- **FR-SALE-01 (Sale Unit Configurations)**: A single catalogue product must support multiple configured sale units (e.g., Tyre Model X can be purchased as: "Single" = 1 base unit, "Pair" = 2 base units, "Set of 4" = 4 base units).
- **FR-SALE-02 (Inventory Consumption Calculation)**: The system must enforce that ordering a sale unit consumes `N` base inventory units (`base_quantity_multiplier * ordered_quantity`).
- **FR-SALE-03 (Dynamic Stock Availability)**: Available purchase quantities on the storefront must dynamically compute based on floor division: `Floor(Available_Base_Stock / base_quantity_multiplier)`.
- **FR-SALE-04 (Serialized Sale Units)**: For serialized items (seat belts), the sale unit multiplier is strictly 1:1, binding the purchase directly to that unique Stock ID.

### 2.4 Vehicle Fitment & Compatibility Engine (FR-FIT)

- **FR-FIT-01 (Vehicle Taxonomy)**: The system must maintain a hierarchical vehicle database: `Year -> Make -> Model -> Submodel/Trim -> Body Type / Chassis Code`.
- **FR-FIT-02 (Product Fitment Mapping)**: Products must be mapped to compatible vehicles with an explicit fitment status:
  - `VERIFIED_OEM_DIRECT_FIT`: Confirmed exact replacement.
  - `UNIVERSAL_FIT`: Requires customer dimensional confirmation.
  - `REQUIRES_MODIFICATION`: Specific notes required.
- **FR-FIT-03 (Storefront Vehicle Selector)**: The customer must be able to select and "save" their vehicle in local storage / user profile ("My Garage"). All catalogue views must visually indicate compatibility ("Fits your 2017 Honda Civic" or "Does not fit").
- **FR-FIT-04 (Tyre Spec Matching)**: Allow filtering tyres by vehicle OE size or manual dimensional parameters (Width, Aspect, Rim).

### 2.5 Shopping Cart & Stock Reservation (FR-CART)

- **FR-CART-01 (Guest & Customer Carts)**: Carts must persist across browser sessions for guests (via secure session token) and automatically merge upon customer login.
- **FR-CART-02 (Soft Stock Reservation)**: Proceeding to checkout creates a time-limited soft reservation (e.g., 15 minutes) on the inventory units to prevent concurrent purchase collisions, particularly for unique serialized seat belts.
- **FR-CART-03 (Reservation Expiry)**: Expired reservations must automatically release stock back to the public pool without blocking other customers.

### 2.6 Order Lifecycle & State Machine (FR-ORD)

- **FR-ORD-01 (Order State Machine)**: Orders must follow a strictly defined, forward-moving state machine:
  `DRAFT -> PENDING_PAYMENT -> PAID -> PROCESSING (PICKING/PACKING) -> READY_FOR_DISPATCH -> SHIPPED -> DELIVERED`
  Terminal failure states: `CANCELLED`, `EXPIRED`, `REFUNDED`.
- **FR-ORD-02 (Transactional Order Creation)**: Conversion from checkout to order and permanent stock deduction must occur within an atomic PostgreSQL transaction.
- **FR-ORD-03 (Order Splitting / Partial Dispatch)**: Support multi-package fulfillments if an order contains items from different warehouse locations.
- **FR-ORD-04 (Customer Order History)**: Authenticated customers can view their order history, order line details, download invoices, and view live carrier tracking links.

### 2.7 Payment Processing & Idempotency (FR-PAY)

- **FR-PAY-01 (Payment Gateway Abstraction)**: All payment interactions must occur through an abstract `PaymentGatewayAdapter` interface, isolating third-party SDKs.
- **FR-PAY-02 (Webhook Durability & Idempotency)**: All inbound payment webhooks must be verified using cryptographic signatures, logged to `PaymentWebhookLog`, and processed idempotently via unique transaction references to prevent duplicate order confirmations.
- **FR-PAY-03 (Refund Processing)**: Support full and partial refunds linked directly to original payment transactions with mandatory reason recording.

### 2.8 Fulfillment & Shipping (FR-SHIP)

- **FR-SHIP-01 (Delivery Options)**: Support standard carrier delivery, express delivery, and Depot / Click & Collect pickup.
- **FR-SHIP-02 (Shipping Rate Calculation)**: Calculate rates based on weight, volume, destination postcode, and delivery tier.
- **FR-SHIP-03 (Dispatch & Tracking)**: Record carrier name, consignment/tracking number, and ship date, automatically transitioning the order to `SHIPPED` and notifying the customer.

### 2.9 Returns & RMA Management (FR-RET)

- **FR-RET-01 (Customer Return Request)**: Customers can request an RMA within the policy window (e.g., 30 days) selecting items, quantity, reason code, and uploading defect/mismatch photos.
- **FR-RET-02 (Staff Review & Approval)**: Support staff can approve or reject RMAs with custom instructions and generate return shipping authorizations.
- **FR-RET-03 (Inspection & Disposition)**: Upon receipt, warehouse staff inspects items and records disposition:
  - `RESTOCK`: Returns item to active inventory.
  - `SCRAP_WRITEOFF`: Decommissions damaged item to waste.
  - `RETURN_TO_CUSTOMER`: Disallowed return sent back.

### 2.10 Identity, Authentication & RBAC (FR-AUTH)

- **FR-AUTH-01 (Secure Authentication)**: Secure user registration and login supporting email/password (argon2/bcrypt hashed) and standard session/JWT tokens.
- **FR-AUTH-02 (Fine-Grained Permission Enforcement)**: All backend API routes must validate granular permissions (`domain:action`), not loose role names.
- **FR-AUTH-03 (Customer Data Isolation)**: Customers are strictly isolated; a customer token cannot access another customer's cart, orders, addresses, or profile.
- **FR-AUTH-04 (Staff RBAC Assignment)**: Administrative users can be assigned specific roles composed of granular permission sets.

### 2.11 Audit Logging & Compliance (FR-AUDIT)

- **FR-AUDIT-01 (Immutable Audit Log)**: All sensitive administrative actions (stock manual adjustments, cost price changes, order cancellations, refund issuances, role modifications) must be recorded in an append-only `AuditLog` table capturing timestamp, actor ID, IP address, resource ID, action name, and before/after JSON state snapshots.
- **FR-AUDIT-02 (Cost Price Concealment)**: Wholesale/cost prices must be redacted from API responses unless the requesting actor possesses the explicit `inventory:view_cost_price` permission.

---

## 3. Non-Functional Requirements

### 3.1 Performance & Scalability (NFR-PERF)

- **NFR-PERF-01 (API Latency)**: 95th percentile (p95) response time for read endpoints (catalogue, search, fitment lookup) must remain under 200ms under standard load.
- **NFR-PERF-02 (Core Web Vitals)**: Storefront pages must meet Google Core Web Vitals thresholds: Largest Contentful Paint (LCP) < 2.5s, Cumulative Layout Shift (CLS) < 0.1, Interaction to Next Paint (INP) < 200ms.
- **NFR-PERF-03 (Database Indexing)**: Composite indices must be defined for frequent filter queries (e.g., `(category_id, tyre_width, tyre_aspect, tyre_rim)`, `(vehicle_make, vehicle_model, vehicle_year)`).
- **NFR-PERF-04 (Static Asset Delivery)**: All product media must be cached via CDN and responsive images served using Next.js Image optimization (`next/image`).

### 3.2 Security & Compliance (NFR-SEC)

- **NFR-SEC-01 (Zero Direct Database Access)**: The frontend client must never possess direct credentials or network access to PostgreSQL. All data operations pass through the NestJS REST API.
- **NFR-SEC-02 (Input Validation & Sanitization)**: All inbound payloads must be strictly validated using NestJS global `ValidationPipe` with class-validator/Zod DTOs, rejecting unknown properties (`whitelist: true, forbidNonWhitelisted: true`).
- **NFR-SEC-03 (Credential & Secret Storage)**: Zero hardcoded secrets in source control. All credentials must be injected via environment variables. Committed `.env.example` must contain placeholders only.
- **NFR-SEC-04 (Rate Limiting)**: Authentication endpoints (login, password reset) and checkout submission endpoints must enforce IP-based and user-based rate limiting to prevent brute-force attacks.
- **NFR-SEC-05 (OWASP Top 10 Mitigation)**: Strict parameterized SQL queries via Prisma (preventing SQL injection), secure HTTP headers (Helmet), CORS configuration restricted to authorized frontend origins, and CSRF protection on mutation routes.

### 3.3 Reliability, Concurrency & Data Integrity (NFR-REL)

- **NFR-REL-01 (ACID Transactions)**: All multi-step state mutations (inventory reservation, stock adjustment, order creation, refund execution) must run within explicit Prisma database transactions (`prisma.$transaction`).
- **NFR-REL-02 (Race Condition Prevention)**: Serialized items must use row-level locking or optimistic concurrency controls (`version` column or `status = 'AVAILABLE'` atomic update guards) to prevent double-booking.
- **NFR-REL-03 (Database Migrations)**: All schema changes must be applied via forward-only, reviewed Prisma migrations (`prisma migrate deploy`). No direct schema edits or destructive resets on shared/production environments.

### 3.4 Accessibility & Interface Standards (NFR-ACC)

- **NFR-ACC-01 (Accessibility Standard)**: Storefront and Admin UI must conform to WCAG 2.1 Level AA guidelines, including keyboard tab navigation, accessible ARIA labels, and minimum color contrast ratios (4.5:1 for normal text).
- **NFR-ACC-02 (Restrained Professional Aesthetic)**: UI must adhere to clean, high-contrast, modern utility styling using Tailwind CSS and shadcn/ui. Flashy animations, decorative neon gradients, and uninformative glassmorphism are explicitly prohibited.
- **NFR-ACC-03 (Responsive Layouts)**: Fluid layout adaptation across standard viewports (Mobile: 375px–767px, Tablet: 768px–1023px, Desktop: 1024px+).

### 3.5 Code Quality, Maintainability & Testing (NFR-TEST)

- **NFR-TEST-01 (Strict TypeScript)**: Strict type checking enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`). Use of `any`, unsafe type casts, and ESLint rule disables are prohibited without written technical justification.
- **NFR-TEST-02 (Test Coverage on Business Rules)**: Unit and integration tests must cover:
  - Sale unit inventory deduction math.
  - Soft reservation timeout and release.
  - Order state machine transitions.
  - Granular RBAC permission guards.
  - Idempotent webhook handling.
- **NFR-TEST-03 (Automated CI Pipeline)**: GitHub Actions workflow must validate linting, type-checking, automated unit tests, and production builds on every pull request.
