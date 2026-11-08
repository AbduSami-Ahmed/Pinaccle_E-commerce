/**
 * Pinnacle Automotive Parts — Comprehensive Seed Script (Phase 4 Domain Foundation)
 *
 * Seed Data Covers:
 *   1. RBAC Permissions (43 codes) & Roles (7 platform roles)
 *   2. Staff Users & Demo Customer Profile + Addresses + Garage
 *   3. Categories (Tyres, Seat Belts)
 *   4. Vehicle Taxonomy (Make, Model, Generation, Chassis)
 *   5. Warehouses (Sydney Central, Melbourne Depot)
 *   6. Master Catalogue Products:
 *      - Tyres (Bulk Quantity with TyreSpecification & SaleUnitConfigs: Single/Pair/Set of 4)
 *      - Seat Belts (Individually Serialized with SeatBeltSpecification & SaleUnitConfig)
 *   7. Vehicle Fitment Compatibility Records (VERIFIED_OEM_DIRECT)
 *   8. Physical Inventory:
 *      - Bulk InventoryItem records with quantity on hand and cost price
 *      - SerializedInventoryItem records with unique barcodes, donor VINs, wear grades, and ohm readings
 *   9. Immutable InventoryMovements Ledger
 *   10. Historical Order & OrderLine Snapshots
 *   11. Integration Accounts (Stripe, AusPost)
 *
 * Idempotent: Uses upsert everywhere. Safe to run repeatedly.
 * Run: pnpm --filter @pinnacle/api run prisma:seed
 */

import {
  PrismaClient,
  ProductType,
  ProductStatus,
  TyreSeason,
  TyreTerrainType,
  SeatBeltPosition,
  SeatBeltComponentType,
  PretensionerType,
  ConditionGrade,
  SerializedItemStatus,
  InventoryMovementType,
  FitmentVerificationStatus,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentProvider,
  PaymentTransactionStatus,
  AccountType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('------------------------------------------------------------');
  console.log('[Seed] Starting Pinnacle Phase 4 Domain Seed...');
  console.log('------------------------------------------------------------');

  // =========================================================================
  // 1. RBAC Permissions & Roles
  // =========================================================================
  console.log('[Seed 1/11] Seeding Permissions & Roles...');

  const PERMISSIONS = [
    // Catalog
    { code: 'catalog:product:view', description: 'View published products', domain: 'catalog' },
    {
      code: 'catalog:product:view_draft',
      description: 'View draft/unpublished products',
      domain: 'catalog',
    },
    {
      code: 'catalog:product:create',
      description: 'Create new product records',
      domain: 'catalog',
    },
    {
      code: 'catalog:product:update',
      description: 'Update existing product records',
      domain: 'catalog',
    },
    {
      code: 'catalog:product:publish',
      description: 'Publish or unpublish products',
      domain: 'catalog',
    },
    { code: 'catalog:product:delete', description: 'Delete product records', domain: 'catalog' },
    {
      code: 'catalog:category:manage',
      description: 'Create and manage categories',
      domain: 'catalog',
    },
    {
      code: 'catalog:spec:manage',
      description: 'Manage category specifications',
      domain: 'catalog',
    },
    // Fitment
    { code: 'fitment:matrix:view', description: 'View vehicle fitment matrix', domain: 'fitment' },
    {
      code: 'fitment:matrix:manage',
      description: 'Manage vehicle fitment matrix',
      domain: 'fitment',
    },
    { code: 'fitment:verify', description: 'Mark fitment as verified', domain: 'fitment' },
    // Inventory
    {
      code: 'inventory:stock:view_quantity',
      description: 'View stock quantities',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:view_cost_price',
      description: 'View cost/wholesale prices',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:inward_bulk',
      description: 'Bulk inward stock movements',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:serialize_item',
      description: 'Assign serial numbers to items',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:update_location',
      description: 'Update warehouse location',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:adjust',
      description: 'Create stock adjustment entries',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:write_off',
      description: 'Write off damaged/lost stock',
      domain: 'inventory',
    },
    {
      code: 'inventory:stock:edit_condition',
      description: 'Edit condition notes on items',
      domain: 'inventory',
    },
    // Orders
    { code: 'orders:view:own', description: 'View own orders (customer)', domain: 'orders' },
    { code: 'orders:view:all', description: 'View all orders (staff)', domain: 'orders' },
    { code: 'orders:create:customer', description: 'Place orders as customer', domain: 'orders' },
    { code: 'orders:create:manual', description: 'Create manual orders (staff)', domain: 'orders' },
    { code: 'orders:override_price', description: 'Override line item prices', domain: 'orders' },
    { code: 'orders:status:update', description: 'Update order status', domain: 'orders' },
    {
      code: 'orders:fulfill:pick_pack',
      description: 'Pick and pack fulfilment step',
      domain: 'orders',
    },
    { code: 'orders:fulfill:dispatch', description: 'Dispatch/ship orders', domain: 'orders' },
    { code: 'orders:cancel:own', description: 'Cancel own orders', domain: 'orders' },
    { code: 'orders:cancel:any', description: 'Cancel any order (staff)', domain: 'orders' },
    // Payments
    {
      code: 'payments:view:transactions',
      description: 'View payment transactions',
      domain: 'payments',
    },
    {
      code: 'payments:capture:manual',
      description: 'Manually capture payments',
      domain: 'payments',
    },
    { code: 'payments:refund:process', description: 'Process refunds', domain: 'payments' },
    {
      code: 'payments:view:gateway_creds',
      description: 'View payment gateway credentials',
      domain: 'payments',
    },
    // Returns
    { code: 'returns:request:own', description: 'Request a return (customer)', domain: 'returns' },
    { code: 'returns:view:all', description: 'View all return requests', domain: 'returns' },
    {
      code: 'returns:review:approve_reject',
      description: 'Approve or reject returns',
      domain: 'returns',
    },
    {
      code: 'returns:inspect:disposition',
      description: 'Inspect and disposition returns',
      domain: 'returns',
    },
    // Customers
    {
      code: 'customers:profile:own',
      description: 'Access own customer profile',
      domain: 'customers',
    },
    {
      code: 'customers:view:directory',
      description: 'View customer directory',
      domain: 'customers',
    },
    {
      code: 'customers:view:pii_contact',
      description: 'View customer PII / contact info',
      domain: 'customers',
    },
    {
      code: 'customers:gdpr:anonymize',
      description: 'Anonymise customer data (GDPR)',
      domain: 'customers',
    },
    // Staff
    { code: 'staff:users:view', description: 'View staff user list', domain: 'staff' },
    { code: 'staff:users:manage', description: 'Create/disable staff users', domain: 'staff' },
    { code: 'staff:roles:assign', description: 'Assign roles to users', domain: 'staff' },
    // Audit & System
    { code: 'audit:logs:view', description: 'View audit log entries', domain: 'audit' },
    {
      code: 'system:settings:manage',
      description: 'Manage system-wide settings',
      domain: 'system',
    },
  ];

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: { description: perm.description, domain: perm.domain },
    });
  }

  const ALL_CODES = PERMISSIONS.map((p) => p.code);
  const allExcept = (...ex: string[]) => ALL_CODES.filter((c) => !ex.includes(c));

  const ROLES = [
    { key: 'SUPER_ADMIN', name: 'Super Admin', permissions: ALL_CODES },
    {
      key: 'BUSINESS_ADMIN',
      name: 'Business Admin',
      permissions: allExcept('payments:view:gateway_creds', 'customers:gdpr:anonymize'),
    },
    {
      key: 'CATALOG_MGR',
      name: 'Catalogue Manager',
      permissions: [
        'catalog:product:view',
        'catalog:product:view_draft',
        'catalog:product:create',
        'catalog:product:update',
        'catalog:product:publish',
        'catalog:category:manage',
        'catalog:spec:manage',
        'fitment:matrix:view',
        'fitment:matrix:manage',
        'fitment:verify',
        'inventory:stock:view_quantity',
      ],
    },
    {
      key: 'INVENTORY_MGR',
      name: 'Inventory Manager',
      permissions: [
        'catalog:product:view',
        'fitment:matrix:view',
        'inventory:stock:view_quantity',
        'inventory:stock:view_cost_price',
        'inventory:stock:inward_bulk',
        'inventory:stock:serialize_item',
        'inventory:stock:update_location',
        'inventory:stock:adjust',
        'inventory:stock:write_off',
        'inventory:stock:edit_condition',
      ],
    },
    {
      key: 'ORDERS_MGR',
      name: 'Sales / Orders Manager',
      permissions: [
        'catalog:product:view',
        'inventory:stock:view_quantity',
        'orders:view:all',
        'orders:create:manual',
        'orders:override_price',
        'orders:status:update',
        'orders:fulfill:pick_pack',
        'orders:fulfill:dispatch',
        'orders:cancel:any',
        'payments:view:transactions',
        'payments:capture:manual',
        'payments:refund:process',
        'returns:view:all',
        'returns:review:approve_reject',
        'returns:inspect:disposition',
        'customers:view:directory',
        'customers:view:pii_contact',
      ],
    },
    {
      key: 'SUPPORT_REP',
      name: 'Customer Support',
      permissions: [
        'catalog:product:view',
        'orders:view:all',
        'payments:view:transactions',
        'returns:view:all',
        'returns:review:approve_reject',
        'customers:view:directory',
        'customers:view:pii_contact',
      ],
    },
    {
      key: 'CUSTOMER',
      name: 'Customer',
      permissions: [
        'catalog:product:view',
        'fitment:matrix:view',
        'inventory:stock:view_quantity',
        'orders:view:own',
        'orders:create:customer',
        'orders:cancel:own',
        'returns:request:own',
        'customers:profile:own',
      ],
    },
  ];

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      create: { key: r.key, name: r.name },
      update: { name: r.name },
    });

    for (const code of r.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  // =========================================================================
  // 2. Users (Staff & Customer)
  // =========================================================================
  console.log('[Seed 2/11] Seeding Staff & Customer Accounts...');

  const passwordHash = await bcrypt.hash('Pinnacle2026!Secure', BCRYPT_ROUNDS);

  // Super Admin
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' } });
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pinnacle.local' },
    create: {
      email: 'admin@pinnacle.local',
      passwordHash,
      isStaff: true,
      staffProfile: {
        create: { firstName: 'Alex', lastName: 'Mercer', jobTitle: 'Principal Platform Admin' },
      },
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: { isStaff: true },
  });

  // Inventory Manager Staff
  const invMgrRole = await prisma.role.findUniqueOrThrow({ where: { key: 'INVENTORY_MGR' } });
  const inventoryStaffUser = await prisma.user.upsert({
    where: { email: 'inventory@pinnacle.local' },
    create: {
      email: 'inventory@pinnacle.local',
      passwordHash,
      isStaff: true,
      staffProfile: {
        create: { firstName: 'Marcus', lastName: 'Vance', jobTitle: 'Warehouse Operations Lead' },
      },
      userRoles: { create: { roleId: invMgrRole.id } },
    },
    update: { isStaff: true },
  });

  // Demo Customer
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { key: 'CUSTOMER' } });
  const demoCustomerUser = await prisma.user.upsert({
    where: { email: 'customer@pinnacle.local' },
    create: {
      email: 'customer@pinnacle.local',
      passwordHash,
      isStaff: false,
      userRoles: { create: { roleId: customerRole.id } },
      customerProfile: {
        create: {
          firstName: 'Jordan',
          lastName: 'Miller',
          phone: '+64211234567',
          accountType: AccountType.RETAIL,
          addresses: {
            create: [
              {
                label: 'Home Delivery',
                line1: '14 Queen Street',
                line2: 'Apartment 5B',
                city: 'Auckland CBD',
                state: 'Auckland',
                postalCode: '1010',
                country: 'NZ',
                isDefault: true,
              },
            ],
          },
        },
      },
    },
    update: {},
    include: { customerProfile: true },
  });

  const customerProfile = await prisma.customerProfile.findUniqueOrThrow({
    where: { userId: demoCustomerUser.id },
  });

  // =========================================================================
  // 3. Categories
  // =========================================================================
  console.log('[Seed 3/11] Seeding Categories...');

  const tyreCategory = await prisma.category.upsert({
    where: { slug: 'tyres' },
    create: {
      slug: 'tyres',
      name: 'Tyres',
      description:
        'Passenger, SUV, and commercial vehicle tyres sold as singles, axle pairs, or complete sets.',
      displayOrder: 1,
      isActive: true,
    },
    update: { name: 'Tyres' },
  });

  const seatBeltCategory = await prisma.category.upsert({
    where: { slug: 'seat-belts' },
    create: {
      slug: 'seat-belts',
      name: 'Seat Belts',
      description:
        'Individually serialized OEM automotive seat belts, pretensioners, and buckle assemblies.',
      displayOrder: 2,
      isActive: true,
    },
    update: { name: 'Seat Belts' },
  });

  // =========================================================================
  // 4. Vehicle Taxonomy
  // =========================================================================
  console.log('[Seed 4/11] Seeding Vehicle Taxonomy...');

  // Toyota RAV4
  const toyotaMake = await prisma.vehicleMake.upsert({
    where: { slug: 'toyota' },
    create: { name: 'Toyota', slug: 'toyota' },
    update: {},
  });

  const rav4Model = await prisma.vehicleModel.upsert({
    where: { makeId_slug: { makeId: toyotaMake.id, slug: 'rav4' } },
    create: { makeId: toyotaMake.id, name: 'RAV4', slug: 'rav4' },
    update: {},
  });

  let rav4Gen = await prisma.vehicleGeneration.findFirst({
    where: { modelId: rav4Model.id, generationName: '5th Gen (XA50)' },
  });
  if (!rav4Gen) {
    rav4Gen = await prisma.vehicleGeneration.create({
      data: {
        modelId: rav4Model.id,
        generationName: '5th Gen (XA50)',
        yearStart: 2018,
        yearEnd: null,
      },
    });
  }

  let rav4Chassis = await prisma.vehicleChassis.findFirst({
    where: { generationId: rav4Gen.id, chassisCode: 'AXAH54' },
  });
  if (!rav4Chassis) {
    rav4Chassis = await prisma.vehicleChassis.create({
      data: {
        generationId: rav4Gen.id,
        chassisCode: 'AXAH54',
        bodyType: 'SUV 5-Door',
        engineSpec: '2.5L Hybrid AWD (A25A-FXS)',
      },
    });
  }

  // Ford Ranger
  const fordMake = await prisma.vehicleMake.upsert({
    where: { slug: 'ford' },
    create: { name: 'Ford', slug: 'ford' },
    update: {},
  });

  const rangerModel = await prisma.vehicleModel.upsert({
    where: { makeId_slug: { makeId: fordMake.id, slug: 'ranger' } },
    create: { makeId: fordMake.id, name: 'Ranger', slug: 'ranger' },
    update: {},
  });

  let rangerGen = await prisma.vehicleGeneration.findFirst({
    where: { modelId: rangerModel.id, generationName: 'Next-Gen (PY)' },
  });
  if (!rangerGen) {
    rangerGen = await prisma.vehicleGeneration.create({
      data: {
        modelId: rangerModel.id,
        generationName: 'Next-Gen (PY)',
        yearStart: 2022,
        yearEnd: null,
      },
    });
  }

  let rangerChassis = await prisma.vehicleChassis.findFirst({
    where: { generationId: rangerGen.id, chassisCode: 'PY24' },
  });
  if (!rangerChassis) {
    rangerChassis = await prisma.vehicleChassis.create({
      data: {
        generationId: rangerGen.id,
        chassisCode: 'PY24',
        bodyType: 'Dual Cab Ute 4x4',
        engineSpec: '2.0L Bi-Turbo Diesel',
      },
    });
  }

  // Saved vehicle in customer garage
  await prisma.savedVehicle.deleteMany({ where: { customerId: customerProfile.id } });
  await prisma.savedVehicle.create({
    data: {
      customerId: customerProfile.id,
      vehicleChassisId: rav4Chassis.id,
      nickname: "Jordan's Daily RAV4 Cruiser",
      registrationPlate: 'NZ-RAV50',
      isPrimary: true,
    },
  });

  // =========================================================================
  // 5. Warehouses
  // =========================================================================
  console.log('[Seed 5/11] Seeding Warehouses...');

  const sydneyWarehouse = await prisma.warehouse.upsert({
    where: { code: 'AKL-CENTRAL' },
    create: {
      code: 'AKL-CENTRAL',
      name: 'Auckland Central Fulfillment Centre',
      addressLine1: '18 Industry Road',
      city: 'Penrose',
      state: 'Auckland',
      postalCode: '1061',
      country: 'NZ',
      isActive: true,
    },
    update: {},
  });

  const melbourneWarehouse = await prisma.warehouse.upsert({
    where: { code: 'CHC-DEPOT' },
    create: {
      code: 'CHC-DEPOT',
      name: 'Christchurch South Island Depot',
      addressLine1: '45 Waterloo Road',
      city: 'Hornby',
      state: 'Canterbury',
      postalCode: '8042',
      country: 'NZ',
      isActive: true,
    },
    update: {},
  });

  // =========================================================================
  // 6. Master Products — Tyres (Bulk Quantity Modality)
  // =========================================================================
  console.log('[Seed 6/11] Seeding Bulk Tyre Products & Specifications...');

  // Product 1: Michelin Pilot Sport 5
  const michelinProduct = await prisma.product.upsert({
    where: { sku: 'TYR-MICH-PS5-2055516' },
    create: {
      categoryId: tyreCategory.id,
      sku: 'TYR-MICH-PS5-2055516',
      title: 'Michelin Pilot Sport 5 205/55R16 91V',
      slug: 'michelin-pilot-sport-5-205-55r16',
      brand: 'Michelin',
      oemPartNumber: 'MICH-91V-PS5',
      description:
        'Maximized grip and longevity with Dual Sport tread design and Dynamic Response Technology.',
      productType: ProductType.BULK_QUANTITY,
      status: ProductStatus.PUBLISHED,
      media: {
        create: [
          {
            s3Key: 'products/tyres/michelin-ps5-front.webp',
            cdnUrl: 'https://cdn.pinnacleparts.local/products/tyres/michelin-ps5-front.webp',
            altText: 'Michelin Pilot Sport 5 Tread Pattern',
            displayOrder: 0,
            isPrimary: true,
          },
        ],
      },
      tyreSpecification: {
        create: {
          sectionWidth: 205,
          aspectRatio: 55,
          rimDiameter: 16,
          loadIndex: 91,
          speedRating: 'V',
          season: TyreSeason.SUMMER,
          terrainType: TyreTerrainType.PERFORMANCE,
          runFlat: false,
          extraLoad: false,
          fuelEfficiencyClass: 'C',
          wetGripClass: 'A',
          noiseDb: 71,
        },
      },
      saleUnits: {
        create: [
          {
            code: 'TYRE_SINGLE',
            name: 'Single Tyre',
            baseQuantityMultiplier: 1,
            retailPrice: 189.0,
            compareAtPrice: 205.0,
            isDefault: true,
            isActive: true,
          },
          {
            code: 'TYRE_PAIR',
            name: 'Pair of 2 Tyres (Axle Set)',
            baseQuantityMultiplier: 2,
            retailPrice: 360.0,
            compareAtPrice: 378.0,
            isDefault: false,
            isActive: true,
          },
          {
            code: 'TYRE_SET_OF_4',
            name: 'Full Vehicle Set of 4 Tyres',
            baseQuantityMultiplier: 4,
            retailPrice: 699.0,
            compareAtPrice: 756.0,
            isDefault: false,
            isActive: true,
          },
        ],
      },
    },
    update: {},
    include: { saleUnits: true },
  });

  // =========================================================================
  // 7. Master Products — Seat Belts (Individually Serialized Modality)
  // =========================================================================
  console.log('[Seed 7/11] Seeding Serialized Seat Belt Products & Specifications...');

  const rav4SeatBeltProduct = await prisma.product.upsert({
    where: { sku: 'SB-TOY-RAV4-FR-01' },
    create: {
      categoryId: seatBeltCategory.id,
      sku: 'SB-TOY-RAV4-FR-01',
      title: 'Toyota RAV4 (XA50) Front Right Driver Seat Belt Retractor Assembly',
      slug: 'toyota-rav4-xa50-front-right-driver-seat-belt',
      brand: 'Toyota Genuine Parts',
      oemPartNumber: '73210-42350-C0',
      description:
        'OEM Toyota pyrotechnic retractor assembly harvested from collision-free donor vehicles. Individually inspected, ohms continuity verified, and graded.',
      productType: ProductType.INDIVIDUALLY_SERIALIZED,
      status: ProductStatus.PUBLISHED,
      media: {
        create: [
          {
            s3Key: 'products/seatbelts/toyota-rav4-sb-diagram.webp',
            cdnUrl:
              'https://cdn.pinnacleparts.local/products/seatbelts/toyota-rav4-sb-diagram.webp',
            altText: 'Toyota RAV4 Retractor Component Blueprint',
            displayOrder: 0,
            isPrimary: true,
          },
        ],
      },
      seatBeltSpecification: {
        create: {
          position: SeatBeltPosition.FRONT_LEFT_DRIVER,
          componentType: SeatBeltComponentType.RETRACTOR_ASSEMBLY,
          pretensionerType: PretensionerType.PYROTECHNIC,
          webbingColor: 'Standard Black',
          mountingPoints: 3,
          oemReferenceTag: 'TK-73210-XA50',
        },
      },
      saleUnits: {
        create: [
          {
            code: 'SEAT_BELT_UNIT',
            name: 'Individual Serialized Seat Belt',
            baseQuantityMultiplier: 1,
            retailPrice: 245.0,
            compareAtPrice: 420.0,
            isDefault: true,
            isActive: true,
          },
        ],
      },
    },
    update: {},
    include: { saleUnits: true },
  });

  // =========================================================================
  // 8. Vehicle Fitment Compatibility
  // =========================================================================
  console.log('[Seed 8/11] Mapping Vehicle Fitment Matrix...');

  await prisma.productFitment.upsert({
    where: {
      productId_vehicleChassisId: {
        productId: rav4SeatBeltProduct.id,
        vehicleChassisId: rav4Chassis.id,
      },
    },
    create: {
      productId: rav4SeatBeltProduct.id,
      vehicleChassisId: rav4Chassis.id,
      verificationStatus: FitmentVerificationStatus.VERIFIED_OEM_DIRECT,
      fitmentNotes:
        'Direct factory replacement for AXAH54 AWD Hybrid and MXAA52 2.0L Petrol models.',
      verifiedByUserId: adminUser.id,
      verifiedAt: new Date(),
    },
    update: {},
  });

  await prisma.productFitment.upsert({
    where: {
      productId_vehicleChassisId: {
        productId: michelinProduct.id,
        vehicleChassisId: rav4Chassis.id,
      },
    },
    create: {
      productId: michelinProduct.id,
      vehicleChassisId: rav4Chassis.id,
      verificationStatus: FitmentVerificationStatus.UNIVERSAL_FIT,
      fitmentNotes: 'Standard factory OE tyre specification for base 16-inch alloy variants.',
      verifiedByUserId: adminUser.id,
      verifiedAt: new Date(),
    },
    update: {},
  });

  // =========================================================================
  // 9. Physical Inventory & Movements Ledger
  // =========================================================================
  console.log('[Seed 9/11] Seeding Physical Inventory Balances & Serialized Stock...');

  // Bulk Inventory: Michelin Tyres in Sydney
  const michelinSydInventory = await prisma.inventoryItem.upsert({
    where: {
      productId_warehouseId_locationBin: {
        productId: michelinProduct.id,
        warehouseId: sydneyWarehouse.id,
        locationBin: 'TYRE-RACK-A04',
      },
    },
    create: {
      productId: michelinProduct.id,
      warehouseId: sydneyWarehouse.id,
      locationBin: 'TYRE-RACK-A04',
      quantityOnHand: 40,
      quantityReserved: 0,
      costPrice: 115.0,
    },
    update: { quantityOnHand: 40 },
  });

  // Record initial bulk inward receipt movement
  const existingBulkMovement = await prisma.inventoryMovement.findFirst({
    where: {
      inventoryItemId: michelinSydInventory.id,
      movementType: InventoryMovementType.RECEIPT,
    },
  });
  if (!existingBulkMovement) {
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: michelinSydInventory.id,
        movementType: InventoryMovementType.RECEIPT,
        quantityChange: 40,
        previousQuantity: 0,
        newQuantity: 40,
        reasonCode: 'PO-2026-INWARD-001',
        operatorId: inventoryStaffUser.id,
      },
    });
  }

  // Serialized Items: 2 Unique Used Seat Belts
  const serializedSeatBelt1 = await prisma.serializedInventoryItem.upsert({
    where: { stockBarcode: 'SB-SN-89421A' },
    create: {
      productId: rav4SeatBeltProduct.id,
      warehouseId: sydneyWarehouse.id,
      stockBarcode: 'SB-SN-89421A',
      donorVehicleVin: 'JTMB6RFV5MD019482',
      conditionGrade: ConditionGrade.GRADE_A_LIKE_NEW,
      conditionNotes:
        'Tested 2.2 ohms pretensioner resistance. Webbing undamaged, retractor locks smoothly.',
      pretensionerResistanceOhms: 2.2,
      actualPhotos: [
        'https://cdn.pinnacleparts.local/inventory/sb-89421a-front.webp',
        'https://cdn.pinnacleparts.local/inventory/sb-89421a-tag.webp',
      ],
      locationBin: 'BIN-SAFETY-012',
      costPrice: 85.0,
      status: SerializedItemStatus.AVAILABLE,
    },
    update: { status: SerializedItemStatus.AVAILABLE },
  });

  const serializedSeatBelt2 = await prisma.serializedInventoryItem.upsert({
    where: { stockBarcode: 'SB-SN-89422B' },
    create: {
      productId: rav4SeatBeltProduct.id,
      warehouseId: sydneyWarehouse.id,
      stockBarcode: 'SB-SN-89422B',
      donorVehicleVin: 'JTMB6RFV7MD023190',
      conditionGrade: ConditionGrade.GRADE_B_MINOR_WEAR,
      conditionNotes:
        'Minor cosmetic wear on buckle release button casing. Webbing clean, tested 2.15 ohms.',
      pretensionerResistanceOhms: 2.15,
      actualPhotos: ['https://cdn.pinnacleparts.local/inventory/sb-89422b-front.webp'],
      locationBin: 'BIN-SAFETY-013',
      costPrice: 70.0,
      status: SerializedItemStatus.AVAILABLE,
    },
    update: { status: SerializedItemStatus.AVAILABLE },
  });

  // Record initial serialized inward receipt movements
  for (const item of [serializedSeatBelt1, serializedSeatBelt2]) {
    const existingMovement = await prisma.inventoryMovement.findFirst({
      where: { serializedItemId: item.id, movementType: InventoryMovementType.RECEIPT },
    });
    if (!existingMovement) {
      await prisma.inventoryMovement.create({
        data: {
          serializedItemId: item.id,
          movementType: InventoryMovementType.RECEIPT,
          quantityChange: 1,
          previousQuantity: 0,
          newQuantity: 1,
          reasonCode: 'SALVAGE-INWARD-BATCH-04',
          operatorId: inventoryStaffUser.id,
        },
      });
    }
  }

  // =========================================================================
  // 10. Sample Order with Immutable Line Snapshots
  // =========================================================================
  console.log('[Seed 10/11] Seeding Historical Order & Immutable Line Snapshots...');

  const tyreSaleUnitPair = michelinProduct.saleUnits.find((su) => su.code === 'TYRE_PAIR');
  if (tyreSaleUnitPair) {
    const sampleOrderNumber = 'PIN-2026-10001';
    let sampleOrder = await prisma.order.findUnique({ where: { orderNumber: sampleOrderNumber } });

    if (!sampleOrder) {
      sampleOrder = await prisma.order.create({
        data: {
          orderNumber: sampleOrderNumber,
          customerId: customerProfile.id,
          customerEmail: 'customer@pinnacle.local',
          customerPhone: '+64211234567',
          shippingAddress: {
            name: 'Jordan Miller',
            line1: '14 Queen Street',
            city: 'Auckland CBD',
            state: 'Auckland',
            postalCode: '1010',
            country: 'NZ',
          },
          billingAddress: {
            name: 'Jordan Miller',
            line1: '14 Queen Street',
            city: 'Auckland CBD',
            state: 'Auckland',
            postalCode: '1010',
            country: 'NZ',
          },
          orderStatus: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          fulfillmentStatus: FulfillmentStatus.FULFILLED,
          subtotal: 360.0,
          discountAmount: 0.0,
          shippingFee: 25.0,
          taxAmount: 50.22,
          totalAmount: 385.0,
          currency: 'NZD',
          items: {
            create: [
              {
                productId: michelinProduct.id,
                saleUnitConfigId: tyreSaleUnitPair.id,
                skuSnapshot: michelinProduct.sku,
                titleSnapshot: michelinProduct.title,
                saleUnitCodeSnapshot: tyreSaleUnitPair.code,
                saleUnitNameSnapshot: tyreSaleUnitPair.name,
                baseQuantityMultiplierSnapshot: tyreSaleUnitPair.baseQuantityMultiplier, // 2 base tyres
                quantity: 1, // 1 Pair purchased
                baseUnitsConsumed: 2, // 2 raw physical tyres consumed
                unitPrice: 360.0,
                discountAmount: 0.0,
                taxAmount: 46.96,
                totalPrice: 360.0,
              },
            ],
          },
          paymentTransactions: {
            create: [
              {
                provider: PaymentProvider.STRIPE,
                transactionReference: 'pi_3LxxxxSAMPLE001',
                idempotencyKey: 'idemp_seed_tx_001',
                amount: 385.0,
                currency: 'NZD',
                status: PaymentTransactionStatus.SUCCESS,
                rawResponse: { chargeId: 'ch_sample_01', status: 'succeeded' },
              },
            ],
          },
        },
      });
    }
  }

  // =========================================================================
  // 11. Integration Accounts
  // =========================================================================
  console.log('[Seed 11/11] Seeding Integration Accounts...');

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'STRIPE', environment: 'sandbox' } },
    create: {
      provider: 'STRIPE',
      name: 'Stripe Payments Test Gateway',
      environment: 'sandbox',
      isActive: true,
      settings: { publishableKey: 'pk_test_sample', webhookEndpointId: 'we_test_sample' },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'NZPOST', environment: 'sandbox' } },
    create: {
      provider: 'NZPOST',
      name: 'CourierPost / NZ Post Shipping Test Adapter',
      environment: 'sandbox',
      isActive: true,
      settings: {
        accountNumber: 'NZP-TEST-001',
        apiEndpoint: 'https://api.nzpost.co.nz/test',
      },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'EBAY', environment: 'sandbox' } },
    create: {
      provider: 'EBAY',
      name: 'eBay Marketplace (AU/NZ Motors)',
      environment: 'sandbox',
      status: 'DISCONNECTED',
      isActive: false,
      settings: {
        marketplaceId: 'EBAY_AU',
        apiEndpoint: 'https://api.sandbox.ebay.com',
      },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'TRADE_ME', environment: 'sandbox' } },
    create: {
      provider: 'TRADE_ME',
      name: 'Trade Me Motors & Parts (NZ)',
      environment: 'sandbox',
      status: 'DISCONNECTED',
      isActive: false,
      settings: {
        apiEndpoint: 'https://api.tmsandbox.co.nz/v1',
        isInTrade: true,
      },
    },
    update: {},
  });

  console.log('------------------------------------------------------------');
  console.log('[Seed] Phase 4 Domain Seed completed successfully! 🎉');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
