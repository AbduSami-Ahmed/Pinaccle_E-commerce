# ADR 0008: Database Domain Modelling, Category Specifications, and Multi-Tenancy Strategy

**Status**: Accepted  
**Date**: 2026-11-03  
**Deciders**: Engineering Lead, Product Architect

---

## 1. Context

In Phase 4, we define the persistent PostgreSQL data model for Pinnacle E-Commerce. Key architectural requirements include:

1. **Dual Inventory Modalities**: Commodity bulk parts (Tyres) vs. individually tracked, used safety components (Seat Belts).
2. **Sale Unit Decoupling**: Selling single tyres, axle pairs, or vehicle sets of 4 from a unified base physical stock count.
3. **Category Specification Model**: Avoiding the performance, integrity, and query degradation of generic Entity-Attribute-Value (EAV) or unstructured JSON while accommodating category-specific attributes.
4. **Historical Order Immutability**: Ensuring that catalog updates (price changes, SKU renaming, specification edits) never rewrite historical order receipts.
5. **Monetary Precision**: Guaranteeing that financial transactions and subtotal/tax/discount calculations never suffer binary floating-point rounding errors.
6. **Multi-Tenancy Evolution Path**: Designing for a single-organization production deployment today while maintaining a clean architectural path for future multi-store or multi-brand expansion.

---

## 2. Decisions

### 2.1 Dual Inventory Modalities (`InventoryItem` vs. `SerializedInventoryItem`)

- **Bulk Quantity Tracking (`InventoryItem`)**:
  - Used for brand-new commodity tyres, fasteners, and consumables.
  - Tracked as aggregate integer counts (`quantityOnHand`, `quantityReserved`) scoped to a physical `Warehouse` and `locationBin`.
  - Availability is dynamic and shared across sale unit configurations.
- **Individually Serialized Tracking (`SerializedInventoryItem`)**:
  - Used for refurbished/used safety components (seat belts, SRS modules).
  - Each item represents a unique physical part bearing an immutable `stockBarcode`.
  - Retains physical provenance: `donorVehicleVin`, physical `conditionGrade`, detailed inspection `conditionNotes`, pyrotechnic pretensioner test resistance (`pretensionerResistanceOhms`), and unit-specific inspection photographs (`actualPhotos`).
  - Strict lifecycle states: `AVAILABLE`, `RESERVED`, `SOLD`, `SCRAPPED`, `UNDER_INSPECTION`.
- **Immutable Movement Ledger (`InventoryMovement`)**:
  - Every adjustment, intake, reservation lock, sale deduction, or scrap write-off writes an append-only row recording `quantityChange`, `previousQuantity`, `newQuantity`, `reasonCode`, and `operatorId`.

### 2.2 Sale Unit Decoupling (`SaleUnitConfig`)

- A single master `Product` record defines the manufacturer SKU and product identity.
- Products link to one or more `SaleUnitConfig` records, each defining a `baseQuantityMultiplier`:
  - `TYRE_SINGLE`: multiplier = 1 (consumes 1 raw tyre).
  - `TYRE_PAIR`: multiplier = 2 (consumes 2 raw tyres, commercial axle bundle).
  - `TYRE_SET_OF_4`: multiplier = 4 (consumes 4 raw tyres, full car bundle).
- **Consumption Invariant**: An order line purchasing $Q$ sale units deducts $Q \times \text{multiplier}$ physical base inventory units.
- Available sale units are computed at query time: $\lfloor \text{Available Base Stock} / \text{multiplier} \rfloor$.

### 2.3 Normalized Category Specifications (Table-Per-Category Extension)

Instead of storing category attributes in a generic JSON blob or EAV table (which ruins indexing, type safety, and SQL query planning), we use a **Normalized Table-Per-Category Extension Model**:

```
Product (1) <---> (0..1) TyreSpecification
Product (1) <---> (0..1) SeatBeltSpecification
```

- Each category with distinct dimensional or regulatory attributes receives a dedicated 1-to-1 extension table linked via `@unique productId`.
- **How New Categories Are Added**:
  1. Define a new Prisma model (e.g., `BrakeRotorSpecification`, `HeadlightSpecification`).
  2. Add a 1-to-1 optional relation to `Product` (`brakeRotorSpecification BrakeRotorSpecification?`).
  3. Create an explicit migration.
  4. The catalogue querying module fetches the corresponding specification based on `category.slug`.

### 2.4 Immutable Historical Order Snapshots

To preserve legal and financial auditability:

- `OrderItem` does **not** rely on live joins to `Product` or `SaleUnitConfig` for historical values.
- At checkout time, the application writes immutable snapshots:
  - `skuSnapshot`, `titleSnapshot`, `saleUnitCodeSnapshot`, `saleUnitNameSnapshot`, `baseQuantityMultiplierSnapshot`.
  - `unitPrice`, `discountAmount`, `taxAmount`, `totalPrice`.
- Foreign keys (`productId`, `saleUnitConfigId`, `serializedItemId`) are configured with `onDelete: SetNull`. If a catalogue item is archived or purged years later, historical order lines remain intact.

### 2.5 Monetary Precision: Strict Decimal Database Persistence

- All monetary columns (`retailPrice`, `costPrice`, `subtotal`, `shippingFee`, `taxAmount`, `totalAmount`, `unitPrice`, `totalPrice`, `amount`) are defined as `Decimal(10, 2)`.
- Never use binary floating-point (`Float` / `Double`) for currency.
- In TypeScript and Prisma runtime, values are manipulated via the exact-arithmetic `Decimal` class.

### 2.6 Multi-Tenancy Strategy & Future Roadmap

**Current Scope**: Single-organization deployment for Pinnacle Automotive Parts (one legal entity, multiple physical warehouses).

**Future Evolution Path (Multi-Store / Multi-Brand)**:
If Pinnacle expands to host multiple independent merchant stores or white-label automotive brands:

1. Introduce a `Store` (or `Organization`) model:
   ```prisma
   model Store {
     id       String @id @default(uuid())
     slug     String @unique
     name     String
     currency String @default("AUD")
   }
   ```
2. Add `storeId String` to `Category`, `Product`, `Warehouse`, `Order`, and `CustomerProfile`.
3. Scoping foreign keys: change unique constraints (e.g. `[sku]` to `[storeId, sku]`).
4. Implement a NestJS `TenantInterceptor` / `TenantMiddleware` that extracts the `storeId` from the request hostname or JWT claims and automatically scopes all Prisma queries via Prisma Client extensions (`$extends.query`).
5. **No core tables need redesigning** — the foundational domain entities remain identical.

---

## 3. Consequences

- ✅ **Inventory Accuracy**: Shared physical tyre stock eliminates out-of-sync multi-pack inventory errors.
- ✅ **Customer Confidence**: Used seat belt buyers receive the exact physical part inspected and photographed.
- ✅ **Audit & Regulatory Compliance**: Immutable order line snapshots protect legal records against catalog updates.
- ✅ **Performant Search**: Dedicated indexes on `[sectionWidth, aspectRatio, rimDiameter]` enable sub-millisecond tyre dimension search.
- ✅ **Type Safety**: Full Prisma Client TypeScript types guarantee compile-time verification across the API.
