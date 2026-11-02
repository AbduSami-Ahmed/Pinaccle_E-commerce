# Role and Permission Matrix: Pinnacle E-Commerce

## 1. Security Architecture Principles

1. **Granular Permissions Over Role Hardcoding**: System logic never evaluates `user.role === 'admin'`. Endpoints and operations evaluate atomic permissions (e.g., `inventory:adjust_stock` or `orders:refund`). Roles are simply predefined sets of permissions.
2. **Backend Enforcement**: Authorization is strictly validated at the NestJS API boundary via Guards and Decorators (`@RequirePermissions('orders:fulfill')`). Hiding UI controls is purely an ergonomic aid and provides zero security guarantees.
3. **Tenant / Customer Boundary**: Customers are isolated to their own records via ownership policies (`userId === resource.customerId`).
4. **Audit Logging for High-Privilege Actions**: Sensitive permissions (e.g., viewing wholesale cost prices, issuing refunds, manually adjusting stock) trigger automated audit log entries.

---

## 2. Defined System Roles

| Role Key         | Role Name                       | Intended User Group                                                                      |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`    | Business Owner / Super Admin    | Business owners, technical directors; full unrestricted system access.                   |
| `BUSINESS_ADMIN` | Business Administrator          | Operations directors, general managers; manages staff, stores, and policies.             |
| `CATALOG_MGR`    | Catalog Manager                 | Product specialists; manages categories, specifications, photos, and fitment.            |
| `INVENTORY_MGR`  | Inventory / Warehouse Manager   | Warehouse supervisors; manages stock intake, serialization, binning, and cycle counts.   |
| `ORDERS_MGR`     | Sales & Order Manager           | Dispatchers and fulfillment leads; manages picking, packing, shipping, and order status. |
| `SUPPORT_REP`    | Customer Support Representative | Customer service agents; assists buyers, processes RMA requests, inspects inquiries.     |
| `CUSTOMER`       | Registered B2C Customer         | End consumer shopping on the public storefront.                                          |
| `TRADE_CUST`     | B2B Trade Customer              | Commercial repair shops, mechanics _(Subject to Client Confirmation)_.                   |

---

## 3. Comprehensive Permission Matrix

Legend:

- `✓` = Granted by default
- `✗` = Denied by default
- `[CONFIRMATION REQUIRED]` = Proposed permission mapping that requires client sign-off before implementation.

### 3.1 Catalogue & Fitment Management

| Permission Code              | Description                              | SUPER_ADMIN |       BUSINESS_ADMIN        |         CATALOG_MGR         | INVENTORY_MGR | ORDERS_MGR | SUPPORT_REP | CUSTOMER |
| ---------------------------- | ---------------------------------------- | :---------: | :-------------------------: | :-------------------------: | :-----------: | :--------: | :---------: | :------: |
| `catalog:product:view`       | View published products & specs          |      ✓      |              ✓              |              ✓              |       ✓       |     ✓      |      ✓      |    ✓     |
| `catalog:product:view_draft` | View draft and archived products         |      ✓      |              ✓              |              ✓              |       ✓       |     ✓      |      ✓      |    ✗     |
| `catalog:product:create`     | Create new catalogue definitions         |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `catalog:product:update`     | Edit product titles, specs, descriptions |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `catalog:product:publish`    | Publish or archive catalogue products    |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `catalog:product:delete`     | Hard delete or purge products            |      ✓      | ✓ `[CONFIRMATION REQUIRED]` | ✗ `[CONFIRMATION REQUIRED]` |       ✗       |     ✗      |      ✗      |    ✗     |
| `catalog:category:manage`    | Create, reorder, or edit categories      |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `catalog:spec:manage`        | Define category specification templates  |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `fitment:matrix:view`        | View vehicle fitment mappings            |      ✓      |              ✓              |              ✓              |       ✓       |     ✓      |      ✓      |    ✓     |
| `fitment:matrix:manage`      | Add, edit, or remove vehicle fitments    |      ✓      |              ✓              |              ✓              |       ✗       |     ✗      |      ✗      |    ✗     |
| `fitment:verify`             | Mark fitment as "Verified OEM Direct"    |      ✓      |              ✓              | ✓ `[CONFIRMATION REQUIRED]` |       ✗       |     ✗      |      ✗      |    ✗     |

---

### 3.2 Inventory & Warehouse Operations

| Permission Code                   | Description                                        | SUPER_ADMIN | BUSINESS_ADMIN |         CATALOG_MGR         |        INVENTORY_MGR        | ORDERS_MGR | SUPPORT_REP |                CUSTOMER                |
| --------------------------------- | -------------------------------------------------- | :---------: | :------------: | :-------------------------: | :-------------------------: | :--------: | :---------: | :------------------------------------: |
| `inventory:stock:view_quantity`   | View available & reserved stock counts             |      ✓      |       ✓        |              ✓              |              ✓              |     ✓      |      ✓      | ✗ (Public only sees availability flag) |
| `inventory:stock:view_cost_price` | View wholesale acquisition cost price              |      ✓      |       ✓        | ✗ `[CONFIRMATION REQUIRED]` | ✓ `[CONFIRMATION REQUIRED]` |     ✗      |      ✗      |                   ✗                    |
| `inventory:stock:inward_bulk`     | Inward bulk batches of tyres                       |      ✓      |       ✓        |              ✗              |              ✓              |     ✗      |      ✗      |                   ✗                    |
| `inventory:stock:serialize_item`  | Register & serialize used seat belts               |      ✓      |       ✓        |              ✗              |              ✓              |     ✗      |      ✗      |                   ✗                    |
| `inventory:stock:update_location` | Relocate items to new bin/shelf                    |      ✓      |       ✓        |              ✗              |              ✓              |     ✓      |      ✗      |                   ✗                    |
| `inventory:stock:adjust`          | Manual cycle count adjustment                      |      ✓      |       ✓        |              ✗              | ✓ `[CONFIRMATION REQUIRED]` |     ✗      |      ✗      |                   ✗                    |
| `inventory:stock:write_off`       | Decommission/write-off damaged stock               |      ✓      |       ✓        |              ✗              | ✗ `[CONFIRMATION REQUIRED]` |     ✗      |      ✗      |                   ✗                    |
| `inventory:stock:edit_condition`  | Update condition notes / photos of serialized item |      ✓      |       ✓        |              ✓              |              ✓              |     ✗      |      ✗      |                   ✗                    |

---

### 3.3 Orders, Fulfillment & Shipping

| Permission Code            | Description                             | SUPER_ADMIN |       BUSINESS_ADMIN        | CATALOG_MGR | INVENTORY_MGR |         ORDERS_MGR          |         SUPPORT_REP         |          CUSTOMER           |
| -------------------------- | --------------------------------------- | :---------: | :-------------------------: | :---------: | :-----------: | :-------------------------: | :-------------------------: | :-------------------------: |
| `orders:view:own`          | View customer's own order history       |      ✓      |              ✓              |      ✗      |       ✗       |              ✗              |              ✗              |              ✓              |
| `orders:view:all`          | View all customer orders & details      |      ✓      |              ✓              |      ✗      |       ✓       |              ✓              |              ✓              |              ✗              |
| `orders:create:customer`   | Place order via storefront checkout     |      ✓      |              ✓              |      ✗      |       ✗       |              ✗              |              ✗              |              ✓              |
| `orders:create:manual`     | Create telephone/counter order manually |      ✓      |              ✓              |      ✗      |       ✗       | ✓ `[CONFIRMATION REQUIRED]` | ✓ `[CONFIRMATION REQUIRED]` |              ✗              |
| `orders:override_price`    | Manually discount order line prices     |      ✓      | ✓ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       | ✗ `[CONFIRMATION REQUIRED]` |              ✗              |              ✗              |
| `orders:status:update`     | Update order processing state           |      ✓      |              ✓              |      ✗      |       ✓       |              ✓              |              ✗              |              ✗              |
| `orders:fulfill:pick_pack` | Mark items as picked and packed         |      ✓      |              ✓              |      ✗      |       ✓       |              ✓              |              ✗              |              ✗              |
| `orders:fulfill:dispatch`  | Book shipping label & generate tracking |      ✓      |              ✓              |      ✗      |       ✓       |              ✓              |              ✗              |              ✗              |
| `orders:cancel:own`        | Cancel own order before processing      |      ✗      |              ✗              |      ✗      |       ✗       |              ✗              |              ✗              | ✓ `[CONFIRMATION REQUIRED]` |
| `orders:cancel:any`        | Administratively cancel any order       |      ✓      |              ✓              |      ✗      |       ✗       |              ✓              | ✓ `[CONFIRMATION REQUIRED]` |              ✗              |

---

### 3.4 Payments & Financial Operations

| Permission Code               | Description                            | SUPER_ADMIN |       BUSINESS_ADMIN        | CATALOG_MGR | INVENTORY_MGR |         ORDERS_MGR          |         SUPPORT_REP         | CUSTOMER |
| ----------------------------- | -------------------------------------- | :---------: | :-------------------------: | :---------: | :-----------: | :-------------------------: | :-------------------------: | :------: |
| `payments:view:transactions`  | View payment transaction logs          |      ✓      |              ✓              |      ✗      |       ✗       |              ✓              |              ✓              |    ✗     |
| `payments:capture:manual`     | Trigger manual payment capture         |      ✓      |              ✓              |      ✗      |       ✗       | ✓ `[CONFIRMATION REQUIRED]` |              ✗              |    ✗     |
| `payments:refund:process`     | Execute full or partial refund to card |      ✓      |              ✓              |      ✗      |       ✗       | ✗ `[CONFIRMATION REQUIRED]` | ✗ `[CONFIRMATION REQUIRED]` |    ✗     |
| `payments:view:gateway_creds` | View / update payment API credentials  |      ✓      | ✗ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       |              ✗              |              ✗              |    ✗     |

---

### 3.5 Returns & RMA Management

| Permission Code                 | Description                                | SUPER_ADMIN | BUSINESS_ADMIN | CATALOG_MGR | INVENTORY_MGR | ORDERS_MGR |         SUPPORT_REP         | CUSTOMER |
| ------------------------------- | ------------------------------------------ | :---------: | :------------: | :---------: | :-----------: | :--------: | :-------------------------: | :------: |
| `returns:request:own`           | Submit RMA return request with photos      |      ✗      |       ✗        |      ✗      |       ✗       |     ✗      |              ✗              |    ✓     |
| `returns:view:all`              | View all customer return requests          |      ✓      |       ✓        |      ✗      |       ✓       |     ✓      |              ✓              |    ✗     |
| `returns:review:approve_reject` | Authorize or reject customer RMA           |      ✓      |       ✓        |      ✗      |       ✗       |     ✓      | ✓ `[CONFIRMATION REQUIRED]` |    ✗     |
| `returns:inspect:disposition`   | Inspect physical part & decide disposition |      ✓      |       ✓        |      ✗      |       ✓       |     ✗      |              ✗              |    ✗     |

---

### 3.6 Customers & PII Privacy

| Permission Code              | Description                                     | SUPER_ADMIN |       BUSINESS_ADMIN        | CATALOG_MGR | INVENTORY_MGR | ORDERS_MGR | SUPPORT_REP | CUSTOMER |
| ---------------------------- | ----------------------------------------------- | :---------: | :-------------------------: | :---------: | :-----------: | :--------: | :---------: | :------: |
| `customers:profile:own`      | Manage own profile, garage, addresses           |      ✗      |              ✗              |      ✗      |       ✗       |     ✗      |      ✗      |    ✓     |
| `customers:view:directory`   | Browse list of registered customers             |      ✓      |              ✓              |      ✗      |       ✗       |     ✓      |      ✓      |    ✗     |
| `customers:view:pii_contact` | View customer phone, email, addresses           |      ✓      |              ✓              |      ✗      |       ✗       |     ✓      |      ✓      |    ✗     |
| `customers:gdpr:anonymize`   | Anonymize customer data (Right to be Forgotten) |      ✓      | ✓ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |

---

### 3.7 Staff Administration, RBAC & Audit Logs

| Permission Code          | Description                             | SUPER_ADMIN |       BUSINESS_ADMIN        | CATALOG_MGR | INVENTORY_MGR | ORDERS_MGR | SUPPORT_REP | CUSTOMER |
| ------------------------ | --------------------------------------- | :---------: | :-------------------------: | :---------: | :-----------: | :--------: | :---------: | :------: |
| `staff:users:view`       | View internal staff list                |      ✓      |              ✓              |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |
| `staff:users:manage`     | Invite, disable, or edit staff users    |      ✓      | ✓ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |
| `staff:roles:assign`     | Assign roles and permissions to staff   |      ✓      | ✗ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |
| `audit:logs:view`        | View immutable audit logs               |      ✓      |              ✓              |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |
| `system:settings:manage` | Configure store currency, tax, policies |      ✓      | ✓ `[CONFIRMATION REQUIRED]` |      ✗      |       ✗       |     ✗      |      ✗      |    ✗     |

---

## 4. Specific Items Marked for Client Confirmation

The client must explicitly review and confirm the following 9 access control policies:

1. **`inventory:stock:view_cost_price`**:
   - _Question_: Should Warehouse Managers or Catalog Managers be permitted to view wholesale acquisition cost prices, or should cost prices be strictly restricted to Super Admin and Business Admin?
   - _Recommendation_: Restrict cost price visibility to Super Admin and Business Admin to protect commercial margins.
2. **`inventory:stock:adjust` and `inventory:stock:write_off`**:
   - _Question_: Can Warehouse Managers execute write-offs and large negative stock adjustments autonomously, or should adjustments over a certain dollar value (e.g., > \$250) require approval from a Business Admin?
   - _Recommendation_: Require two-step approval for write-offs above \$250.
3. **`orders:override_price`**:
   - _Question_: Should Order Managers or Support Reps be authorized to manually override item sale prices or apply discretionary order discounts?
   - _Recommendation_: Require Business Admin authorization for price discounts exceeding a fixed limit (e.g. 10%).
4. **`payments:refund:process`**:
   - _Question_: Can Customer Support issue direct credit card refunds up to a specified cap without managerial sign-off?
   - _Recommendation_: Support Reps may authorize returns (RMA), but payment refund execution should be restricted to Orders Manager or Business Admin upon verified warehouse inspection.
5. **`orders:cancel:own`**:
   - _Question_: Can customers cancel their order directly from the storefront if it has not yet reached the `PROCESSING` stage?
   - _Recommendation_: Allow automated self-service customer cancellation only when status is strictly `PAID` and prior to warehouse `PICKING` commencement.
6. **`fitment:verify`**:
   - _Question_: Who has the legal/operational authority to flag a seat belt as "Guaranteed OEM Direct Fit"?
   - _Recommendation_: Restrict to designated Catalog Managers or technical specialists with recorded audit trails to limit liability.
7. **`catalog:product:delete`**:
   - _Question_: Should hard deletion of products be permitted at all, or should products only ever be soft-deleted / `ARCHIVED` to preserve historic order integrity?
   - _Recommendation_: Enforce soft deletion only (`ARCHIVED`). Hard delete disallowed once an item has been referenced by any order or inventory movement.
8. **`staff:users:manage` & `staff:roles:assign`**:
   - _Question_: Can Business Admins create new staff accounts, or is staff provisioning exclusive to Super Admin?
   - _Recommendation_: Business Admins can create staff accounts up to their own permission level, but cannot assign `SUPER_ADMIN` role or alter system-wide role definitions.
9. **`TRADE_CUST` Role Requirements**:
   - _Question_: Will commercial trade accounts (mechanics/workshops) be part of Release 1, requiring credit terms or wholesale pricing tiers?
   - _Recommendation_: Defer trade account tiers to Phase 2, keeping customer tier unified for initial launch.
