# Database Schema Specification: Pinnacle E-Commerce

**Engine**: PostgreSQL 16  
**ORM**: Prisma Client v6.19.3  
**Migration Target**: `apps/api/prisma/migrations/20261103000000_init/migration.sql`  
**Governing Documents**: `docs/architecture/DOMAIN_MODEL.md`, `docs/decisions/0004-inventory-modality-and-sale-unit-multipliers.md`, `docs/decisions/0008-database-domain-modelling-and-schema-architecture.md`

---

## 1. Schema Overview

The database schema is organized into 12 coherent functional domains:

| Domain                            | Core Tables                                                                                                                        | Key Characteristics                                                                  |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **1. Identity & RBAC**            | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `staff_profiles`                                                | Granular permission-based access control, OIDC/Cognito compatibility.                |
| **2. Audit**                      | `audit_logs`                                                                                                                       | Append-only event ledger capturing actor, action, and before/after state diffs.      |
| **3. Catalogue**                  | `categories`, `products`, `product_media`                                                                                          | Hierarchical classification, master product definitions, S3 media links.             |
| **4. Category Specifications**    | `tyre_specifications`, `seat_belt_specifications`                                                                                  | Normalized, dedicated specification tables (no generic EAV anti-pattern).            |
| **5. Commercial Presentation**    | `sale_unit_configs`                                                                                                                | Single/Pair/Set pricing decoupled from underlying inventory consumption multipliers. |
| **6. Vehicle Taxonomy & Fitment** | `vehicle_makes`, `vehicle_models`, `vehicle_generations`, `vehicle_chassis`, `product_fitments`                                    | Multi-tier vehicle hierarchy and fitment verification states.                        |
| **7. Physical Inventory**         | `warehouses`, `inventory_items`, `serialized_inventory_items`                                                                      | Dual modality: aggregate counts (tyres) vs. unique barcodes & VINs (seat belts).     |
| **8. Inventory Ledger**           | `inventory_movements`                                                                                                              | Immutable audit trail for all stock inwarding, deduction, and reservations.          |
| **9. Customers & Garage**         | `customer_profiles`, `customer_addresses`, `saved_vehicles`                                                                        | Customer accounts, multi-address book, and saved customer vehicle garage.            |
| **10. Carts & Reservations**      | `carts`, `cart_items`, `stock_reservations`                                                                                        | Guest/customer shopping carts with 15-minute soft stock checkout holds.              |
| **11. Orders & Fulfilment**       | `orders`, `order_items`, `shipments`, `shipment_items`                                                                             | Immutable purchase-time historical snapshots, delivery tracking.                     |
| **12. Payments & Returns**        | `payment_transactions`, `return_requests`, `return_items`, `return_inspections`, `integration_accounts`, `integration_sync_events` | Idempotent gateway logs, RMA workflows, inspection dispositions.                     |

---

## 2. Table Definitions & Key Constraints

### 2.1 Identity & RBAC

#### `users`

- `id`: UUID (PK)
- `email`: VARCHAR(255) (UNIQUE)
- `password_hash`: VARCHAR(255) (NULLABLE — populated in local dev mode; null when authenticated via AWS Cognito)
- `is_active`: BOOLEAN (Default: `true`)
- `is_staff`: BOOLEAN (Default: `false`)
- `last_login_at`: TIMESTAMPTZ (NULLABLE)
- `created_at`, `updated_at`: TIMESTAMPTZ

#### `roles` & `permissions`

- `roles`: `id` (PK), `key` (UNIQUE, e.g. `SUPER_ADMIN`, `INVENTORY_MGR`), `name`, `description`.
- `permissions`: `id` (PK), `code` (UNIQUE, e.g. `inventory:stock:adjust`), `description`, `domain`.
- Junction tables: `user_roles(user_id, role_id)` and `role_permissions(role_id, permission_id)`.

#### `audit_logs`

- `id`: UUID (PK)
- `actor_id`: UUID (FK to `users`, `ON DELETE SET NULL`)
- `ip_address`: VARCHAR(45)
- `user_agent`: TEXT
- `domain`: VARCHAR(50)
- `action`: VARCHAR(100)
- `entity_type`: VARCHAR(100)
- `entity_id`: VARCHAR(100)
- `before_state`, `after_state`: JSONB
- `created_at`: TIMESTAMPTZ (Default: `NOW()`)
- Indexes: `[actor_id]`, `[entity_type, entity_id]`, `[domain, action]`, `[created_at]`.

---

### 2.2 Catalogue & Category Specifications

#### `categories`

- `id`: UUID (PK)
- `parent_id`: UUID (FK to `categories`, `ON DELETE RESTRICT`)
- `slug`: VARCHAR(100) (UNIQUE)
- `name`: VARCHAR(100)
- `description`: TEXT
- `display_order`: INTEGER (Default: 0)
- `is_active`: BOOLEAN (Default: `true`)

#### `products`

- `id`: UUID (PK)
- `category_id`: UUID (FK to `categories`, `ON DELETE RESTRICT`)
- `sku`: VARCHAR(100) (UNIQUE) — Master base catalogue SKU.
- `title`: VARCHAR(255)
- `slug`: VARCHAR(255) (UNIQUE)
- `brand`: VARCHAR(100)
- `oem_part_number`: VARCHAR(100) (NULLABLE)
- `description`: TEXT
- `product_type`: ENUM (`BULK_QUANTITY`, `INDIVIDUALLY_SERIALIZED`)
- `status`: ENUM (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
- Indexes: `[category_id, status]`, `[brand]`, `[oem_part_number]`.

#### `tyre_specifications`

- `id`: UUID (PK)
- `product_id`: UUID (UNIQUE, FK to `products`, `ON DELETE CASCADE`)
- `section_width`: INTEGER (e.g. 205 mm)
- `aspect_ratio`: INTEGER (e.g. 55 %)
- `rim_diameter`: INTEGER (e.g. 16 inches)
- `load_index`: INTEGER (e.g. 91)
- `speed_rating`: VARCHAR(10) (e.g. 'V', 'W', 'H')
- `season`: ENUM (`SUMMER`, `WINTER`, `ALL_SEASON`)
- `terrain_type`: ENUM (`HIGHWAY`, `ALL_TERRAIN`, `MUD_TERRAIN`, `PERFORMANCE`)
- `run_flat`: BOOLEAN (Default: `false`)
- `extra_load`: BOOLEAN (Default: `false`)
- `fuel_efficiency_class`: VARCHAR(2) (NULLABLE)
- `wet_grip_class`: VARCHAR(2) (NULLABLE)
- `noise_db`: INTEGER (NULLABLE)
- Indexes: `[section_width, aspect_ratio, rim_diameter]` (Essential for dimensional vehicle tyre search).

#### `seat_belt_specifications`

- `id`: UUID (PK)
- `product_id`: UUID (UNIQUE, FK to `products`, `ON DELETE CASCADE`)
- `position`: ENUM (`FRONT_LEFT_DRIVER`, `FRONT_RIGHT_PASSENGER`, `REAR_LEFT`, `REAR_RIGHT`, `REAR_CENTER`, `THIRD_ROW_LEFT`, `THIRD_ROW_RIGHT`)
- `component_type`: ENUM (`RETRACTOR_ASSEMBLY`, `BUCKLE_STALK`, `LAP_BELT`, `COMPLETE_ASSEMBLY`)
- `pretensioner_type`: ENUM (`PYROTECHNIC`, `MECHANICAL`, `NONE`)
- `webbing_color`: VARCHAR(50) (Default: 'Black')
- `mounting_points`: INTEGER (Default: 3)
- `oem_reference_tag`: VARCHAR(100) (NULLABLE)
- Indexes: `[position, component_type]`.

---

### 2.3 Commercial Presentation (`sale_unit_configs`)

- `id`: UUID (PK)
- `product_id`: UUID (FK to `products`, `ON DELETE CASCADE`)
- `code`: VARCHAR(50) (e.g. `TYRE_SINGLE`, `TYRE_PAIR`, `TYRE_SET_OF_4`, `SEAT_BELT_UNIT`)
- `name`: VARCHAR(100) (e.g. "Single Tyre", "Pair of 2", "Set of 4")
- `base_quantity_multiplier`: INTEGER (Number of physical units consumed: 1, 2, or 4)
- `retail_price`: DECIMAL(10, 2)
- `compare_at_price`: DECIMAL(10, 2) (NULLABLE)
- `is_default`: BOOLEAN (Default: `false`)
- `is_active`: BOOLEAN (Default: `true`)
- Unique: `[product_id, code]`

---

### 2.4 Physical Inventory & Serialized Items

#### `inventory_items` (Bulk / Aggregated Modality)

- `id`: UUID (PK)
- `product_id`: UUID (FK to `products`, `ON DELETE RESTRICT`)
- `warehouse_id`: UUID (FK to `warehouses`, `ON DELETE RESTRICT`)
- `location_bin`: VARCHAR(50)
- `quantity_on_hand`: INTEGER (Default: 0)
- `quantity_reserved`: INTEGER (Default: 0)
- `cost_price`: DECIMAL(10, 2) (RBAC protected: redacted unless caller has `inventory:stock:view_cost_price`)
- Unique: `[product_id, warehouse_id, location_bin]`

#### `serialized_inventory_items` (Individually Tracked Modality)

- `id`: UUID (PK)
- `product_id`: UUID (FK to `products`, `ON DELETE RESTRICT`)
- `warehouse_id`: UUID (FK to `warehouses`, `ON DELETE RESTRICT`)
- `stock_barcode`: VARCHAR(100) (UNIQUE) — Immutable unique barcode/serial tag.
- `donor_vehicle_vin`: VARCHAR(50) (NULLABLE)
- `condition_grade`: ENUM (`NEW_SURPLUS`, `GRADE_A_LIKE_NEW`, `GRADE_B_MINOR_WEAR`, `GRADE_C_FUNCTIONAL_BLEMISH`)
- `condition_notes`: TEXT
- `pretensioner_resistance_ohms`: DECIMAL(4, 2) (NULLABLE)
- `actual_photos`: JSONB (Array of S3 image URLs of this specific physical part)
- `location_bin`: VARCHAR(50)
- `cost_price`: DECIMAL(10, 2)
- `status`: ENUM (`AVAILABLE`, `RESERVED`, `SOLD`, `SCRAPPED`, `UNDER_INSPECTION`)
- Indexes: `[product_id, status]`, `[warehouse_id, status]`.

#### `inventory_movements` (Immutable Ledger)

- `id`: UUID (PK)
- `inventory_item_id`: UUID (NULLABLE, FK to `inventory_items`, `ON DELETE SET NULL`)
- `serialized_item_id`: UUID (NULLABLE, FK to `serialized_inventory_items`, `ON DELETE SET NULL`)
- `movement_type`: ENUM (`RECEIPT`, `SALE_DEDUCTION`, `RESERVATION_HOLD`, `RESERVATION_RELEASE`, `MANUAL_ADJUSTMENT`, `RETURN_RESTOCK`, `SCRAP_WRITEOFF`)
- `quantity_change`: INTEGER (Signed integer: $+Q$ for inward/restock, $-Q$ for deduction/hold)
- `previous_quantity`, `new_quantity`: INTEGER
- `reason_code`: VARCHAR(100)
- `operator_id`: UUID (FK to `users`, `ON DELETE RESTRICT`)
- `reference_order_id`: UUID (NULLABLE)
- `created_at`: TIMESTAMPTZ (Default: `NOW()`)

---

### 2.5 Orders & Immutable Line Snapshots

#### `orders`

- `id`: UUID (PK)
- `order_number`: VARCHAR(50) (UNIQUE, e.g. `PIN-2026-10042`)
- `customer_id`: UUID (NULLABLE for guest orders, FK to `customer_profiles`, `ON DELETE SET NULL`)
- `customer_email`: VARCHAR(255)
- `customer_phone`: VARCHAR(50) (NULLABLE)
- `shipping_address`, `billing_address`: JSONB (Full immutable snapshot of recipient, street, city, state, postal code)
- `order_status`: ENUM (`PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`)
- `payment_status`: ENUM (`UNPAID`, `AUTHORIZED`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`)
- `fulfillment_status`: ENUM (`UNFULFILLED`, `PARTIALLY_FULFILLED`, `FULFILLED`)
- `subtotal`, `discount_amount`, `shipping_fee`, `tax_amount`, `total_amount`: DECIMAL(10, 2)
- `currency`: VARCHAR(3) (Default: 'AUD')

#### `order_items` (Historical Line Snapshot)

- `id`: UUID (PK)
- `order_id`: UUID (FK to `orders`, `ON DELETE CASCADE`)
- `product_id`: UUID (NULLABLE, FK to `products`, `ON DELETE SET NULL`)
- `sale_unit_config_id`: UUID (NULLABLE, FK to `sale_unit_configs`, `ON DELETE SET NULL`)
- `serialized_item_id`: UUID (NULLABLE, FK to `serialized_inventory_items`, `ON DELETE SET NULL`)
- **Immutable Historical Snapshots**:
  - `sku_snapshot`: VARCHAR(100)
  - `title_snapshot`: VARCHAR(255)
  - `sale_unit_code_snapshot`: VARCHAR(50)
  - `sale_unit_name_snapshot`: VARCHAR(100)
  - `base_quantity_multiplier_snapshot`: INTEGER
- `quantity`: INTEGER (Sale units purchased)
- `base_units_consumed`: INTEGER ($Q \times \text{multiplier}$)
- `unit_price`, `discount_amount`, `tax_amount`, `total_price`: DECIMAL(10, 2)

---

## 3. Monetary Decimal Enforcement

In accordance with strict financial accounting standards, all monetary columns in the database are stored as `DECIMAL(10, 2)`. This prevents IEEE 754 floating-point arithmetic errors. In the NestJS application, the values are manipulated using Prisma's `Decimal` class (`new Decimal('189.00')`).

---

## 4. State Transitions

### 4.1 Order Status Transitions

```
PENDING_PAYMENT ──> PAID ──> PROCESSING ──> SHIPPED ──> DELIVERED
      │               │           │
      └──> CANCELLED  └──> REFUNDED └──> REFUNDED
```

### 4.2 Serialized Part Status Transitions

```
UNDER_INSPECTION ──> AVAILABLE ──> RESERVED ──> SOLD
       │                  │            │
       └──> SCRAPPED      └──> SCRAP   └──> AVAILABLE (Timeout)
```
