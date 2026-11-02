# ADR 0004: Dual Inventory Modalities and Sale-Unit Multipliers

## Status

Accepted

## Context

Automotive parts e-commerce platforms struggle when attempting to force all products into a uniform "SKU with an integer quantity" model:

- **Commodity Bulk Parts (e.g., Tyres)**: Handled as bulk stock. However, retail customers buy tyres in different commercial configurations: a single replacement tyre, a pair of 2 for an axle, or a full vehicle set of 4. A merchant holding 20 tyres does not have three distinct physical piles of tyres; they have 20 base tyres that can fulfill 20 singles, 10 pairs, or 5 sets of 4.
- **Individually Serialized Parts (e.g., Used Seat Belts)**: Each physical unit is unique. A used seat belt has a specific history, donor vehicle VIN, physical wear grade, actual inspection photos showing stitch/buckle condition, and pyrotechnic pretensioner test results. Treating it as a generic quantity count creates high return rates when customers receive an item differing from the display photo.

## Decision

We implement a decoupled domain model separating **Product Definitions**, **Sale Units**, and **Physical Inventory**:

1. **Dual Physical Inventory Modality**:
   - `InventoryItem`: Tracks aggregate integer stock for bulk commodities (tyres) per warehouse and bin.
   - `SerializedInventoryItem`: Tracks a unique physical part (seat belt) with its own generated barcode, donor vehicle VIN, condition grade, condition notes, inspection photos, and status (`AVAILABLE`, `RESERVED`, `SOLD`).
2. **Sale Unit Configurations (`SaleUnitConfig`)**:
   - A catalogue product is associated with one or more `SaleUnitConfig` records.
   - Each configuration specifies a `base_quantity_multiplier`:
     - Single Tyre: Multiplier = 1
     - Pair of Tyres: Multiplier = 2
     - Set of 4 Tyres: Multiplier = 4
     - Used Seat Belt: Multiplier = 1 (bound to unique serialized item ID)
3. **Inventory Consumption & Availability**:
   - Available sale quantity is computed dynamically: `Floor(Available_Base_Stock / base_quantity_multiplier)`.
   - Ordering an item reserves and deducts `ordered_quantity * base_quantity_multiplier` base units from physical inventory within an atomic database transaction.

## Consequences

- Eliminates stock synchronization errors across different tyre pack sizes.
- Provides total transparency for used seat belt buyers by binding orders directly to serialized physical items.
- Protects inventory integrity through atomic transactional reservations during checkout.
