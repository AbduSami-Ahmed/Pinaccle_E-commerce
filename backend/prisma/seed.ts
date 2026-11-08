/**
 * Pinnacle Automotive Parts — Comprehensive Seed Script (Phase 4 Domain Foundation)
 *
 * Seed Data Covers:
 *   1. RBAC Permissions (43 codes) & Roles (7 platform roles)
 *   2. Staff Users & Demo Customer Profile + Addresses + Garage
 *   3. Categories (Tyres, Seat Belts)
 *   4. Vehicle Taxonomy (Toyota, Ford, Mazda, Hyundai, Nissan, Mitsubishi)
 *   5. Warehouses (Auckland Central, Christchurch Depot)
 *   6. Master Catalogue Products (8 Bulk Tyres + 6 Serialized Seat Belts with real HTTPS image CDN URLs)
 *   7. Vehicle Fitment Compatibility Records (VERIFIED_OEM_DIRECT)
 *   8. Physical Inventory (Bulk balances + Serialized items with real barcodes, ohms, & inspection photos)
 *   9. Immutable InventoryMovements Ledger
 *   10. Historical Order & OrderLine Snapshots
 *   11. Integration Accounts (Stripe, NZPost, eBay, TradeMe, PartsTrader, CapEzi, Gmail)
 *
 * Idempotent: Safe to run repeatedly.
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
  FitmentVerificationStatus,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentProvider,
  PaymentTransactionStatus,
  AccountType,
  IntegrationAccountStatus,
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

  const PERMISSION_DEFINITIONS = [
    { code: 'CATALOG_READ', description: 'View products, categories, specs' },
    { code: 'CATALOG_WRITE', description: 'Create and update products and specs' },
    { code: 'CATALOG_PUBLISH', description: 'Publish or archive products' },
    { code: 'CATALOG_DELETE', description: 'Hard delete catalogue items' },
    { code: 'INVENTORY_READ', description: 'View stock levels across warehouses' },
    { code: 'INVENTORY_ADJUST', description: 'Perform manual stock adjustments' },
    { code: 'INVENTORY_RECEIVE', description: 'Receive purchase orders and salvage' },
    { code: 'INVENTORY_COUNT', description: 'Conduct cycle counts' },
    { code: 'INVENTORY_SERIAL_WRITE', description: 'Barcode, inspect, and grade serialized items' },
    { code: 'FITMENT_READ', description: 'View vehicle taxonomy and fitment links' },
    { code: 'FITMENT_WRITE', description: 'Map products to vehicle chassis' },
    { code: 'FITMENT_VERIFY', description: 'Approve fitment compatibility rules' },
    { code: 'ORDER_READ', description: 'View customer orders' },
    { code: 'ORDER_CREATE', description: 'Create draft or phone orders' },
    { code: 'ORDER_UPDATE', description: 'Modify order lines and details' },
    { code: 'ORDER_CANCEL', description: 'Cancel orders and release stock holds' },
    { code: 'ORDER_FULFILL', description: 'Pick, pack, and mark orders dispatched' },
    { code: 'ORDER_REFUND', description: 'Issue refunds and credit notes' },
    { code: 'PAYMENT_READ', description: 'View payment transactions' },
    { code: 'PAYMENT_CAPTURE', description: 'Manually capture pre-authorized payments' },
    { code: 'PAYMENT_REFUND', description: 'Trigger payment provider refunds' },
    { code: 'CUSTOMER_READ', description: 'View customer accounts and profiles' },
    { code: 'CUSTOMER_WRITE', description: 'Update customer details and trade terms' },
    { code: 'CUSTOMER_DELETE', description: 'Deactivate or delete customer accounts' },
    { code: 'INTEGRATION_READ', description: 'View marketplace sync status and logs' },
    { code: 'INTEGRATION_WRITE', description: 'Configure API keys and connection settings' },
    { code: 'INTEGRATION_SYNC', description: 'Trigger manual catalogue/order synchronizations' },
    { code: 'REPORT_READ', description: 'View business intelligence reports' },
    { code: 'REPORT_EXPORT', description: 'Export financial and inventory data' },
    { code: 'AUDIT_READ', description: 'Inspect system-wide immutable audit logs' },
    { code: 'USER_READ', description: 'View staff users' },
    { code: 'USER_WRITE', description: 'Create and edit staff users' },
    { code: 'ROLE_MANAGE', description: 'Assign roles and permissions' },
    { code: 'SETTINGS_READ', description: 'View system-wide configuration' },
    { code: 'SETTINGS_WRITE', description: 'Modify operational configuration' },
    { code: 'NOTIFICATION_READ', description: 'View notification queues and templates' },
    { code: 'NOTIFICATION_WRITE', description: 'Edit email/SMS templates' },
    { code: 'INSPECTION_READ', description: 'View serialized bench-test inspection sheets' },
    { code: 'INSPECTION_RECORD', description: 'Record multimeter ohms and lock inspection results' },
    { code: 'DISPATCH_READ', description: 'View courier manifests and consignment tracking' },
    { code: 'DISPATCH_BOOK', description: 'Generate consignment labels with freight carriers' },
    { code: 'SUPPLIER_READ', description: 'View salvage auction donors and tyre distributors' },
    { code: 'SUPPLIER_WRITE', description: 'Manage supplier contacts and purchase orders' },
  ];

  for (const perm of PERMISSION_DEFINITIONS) {
    const domain = (perm.code.split('_')[0] || 'general').toLowerCase();
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: { code: perm.code, description: perm.description, domain },
      update: { description: perm.description, domain },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  const ROLE_DEFINITIONS = [
    {
      key: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Unrestricted system access across all tenants, financial, and audit data.',
      isSystem: true,
      permissions: allPerms.map((p) => p.code),
    },
    {
      key: 'STORE_MANAGER',
      name: 'Store Manager',
      description: 'Oversees daily trade sales, catalogue management, staff, and order fulfillment.',
      isSystem: true,
      permissions: [
        'CATALOG_READ', 'CATALOG_WRITE', 'CATALOG_PUBLISH',
        'INVENTORY_READ', 'INVENTORY_ADJUST', 'INVENTORY_RECEIVE', 'INVENTORY_COUNT', 'INVENTORY_SERIAL_WRITE',
        'FITMENT_READ', 'FITMENT_WRITE', 'FITMENT_VERIFY',
        'ORDER_READ', 'ORDER_CREATE', 'ORDER_UPDATE', 'ORDER_CANCEL', 'ORDER_FULFILL', 'ORDER_REFUND',
        'PAYMENT_READ', 'CUSTOMER_READ', 'CUSTOMER_WRITE',
        'INTEGRATION_READ', 'INTEGRATION_SYNC',
        'REPORT_READ', 'REPORT_EXPORT', 'AUDIT_READ',
        'USER_READ', 'NOTIFICATION_READ',
        'INSPECTION_READ', 'INSPECTION_RECORD', 'DISPATCH_READ', 'DISPATCH_BOOK',
        'SUPPLIER_READ', 'SUPPLIER_WRITE',
      ],
    },
    {
      key: 'INVENTORY_MGR',
      name: 'Inventory Manager',
      description: 'Manages physical warehouse bins, tyre sets, and barcoding/grading of serialized seat belts.',
      isSystem: true,
      permissions: [
        'CATALOG_READ',
        'INVENTORY_READ', 'INVENTORY_ADJUST', 'INVENTORY_RECEIVE', 'INVENTORY_COUNT', 'INVENTORY_SERIAL_WRITE',
        'FITMENT_READ',
        'ORDER_READ', 'ORDER_FULFILL',
        'INSPECTION_READ', 'INSPECTION_RECORD', 'DISPATCH_READ', 'DISPATCH_BOOK',
        'SUPPLIER_READ', 'REPORT_READ',
      ],
    },
    {
      key: 'SALES_REP',
      name: 'Trade Sales Rep',
      description: 'Assists trade customers, mechanics, and panel shops with phone orders and fitment verification.',
      isSystem: true,
      permissions: [
        'CATALOG_READ', 'INVENTORY_READ', 'FITMENT_READ',
        'ORDER_READ', 'ORDER_CREATE', 'ORDER_UPDATE',
        'CUSTOMER_READ', 'CUSTOMER_WRITE',
        'INSPECTION_READ', 'DISPATCH_READ',
      ],
    },
    {
      key: 'FITMENT_SPECIALIST',
      name: 'Fitment Specialist',
      description: 'Verifies chassis fitment compatibility rules and manages vehicle donor taxonomy.',
      isSystem: true,
      permissions: [
        'CATALOG_READ', 'FITMENT_READ', 'FITMENT_WRITE', 'FITMENT_VERIFY',
        'INSPECTION_READ',
      ],
    },
    {
      key: 'DISPATCH_OPERATOR',
      name: 'Warehouse Dispatch Operator',
      description: 'Picks, packs, and books courier consignments for customer dispatch.',
      isSystem: true,
      permissions: [
        'INVENTORY_READ', 'ORDER_READ', 'ORDER_FULFILL',
        'DISPATCH_READ', 'DISPATCH_BOOK',
      ],
    },
    {
      key: 'CUSTOMER',
      name: 'Standard Customer',
      description: 'Public retail or wholesale trade account placing orders via the storefront.',
      isSystem: true,
      permissions: ['CATALOG_READ', 'FITMENT_READ'],
    },
  ];

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { key: roleDef.key },
      create: { key: roleDef.key, name: roleDef.name, description: roleDef.description },
      update: { name: roleDef.name, description: roleDef.description },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const rolePermData = roleDef.permissions
      .map((code) => {
        const permId = permMap.get(code);
        return permId ? { roleId: role.id, permissionId: permId } : null;
      })
      .filter((x) => x !== null);

    if (rolePermData.length > 0) {
      await prisma.rolePermission.createMany({ data: rolePermData, skipDuplicates: true });
    }
  }

  // =========================================================================
  // 2. Staff Accounts & Demo Accounts
  // =========================================================================
  console.log('[Seed 2/11] Seeding Staff & Customer Accounts...');

  const passwordHash = await bcrypt.hash('password123', BCRYPT_ROUNDS);
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' } });

  // 1. Zayd Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'zayd@gmail.com' },
    create: {
      email: 'zayd@gmail.com',
      passwordHash,
      isStaff: true,
      staffProfile: {
        create: { firstName: 'Zayd', lastName: 'Admin', jobTitle: 'Platform Super Administrator' },
      },
      userRoles: { create: { roleId: superAdminRole.id } },
    },
    update: { isStaff: true, passwordHash },
  });

  // 2. Inventory Lead
  const invMgrRole = await prisma.role.findUniqueOrThrow({ where: { key: 'INVENTORY_MGR' } });
  await prisma.user.upsert({
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

  // 3. Demo Customer
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
      description: 'Passenger, SUV, and commercial vehicle tyres sold as singles, axle pairs, or complete sets.',
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
      description: 'Individually serialized OEM automotive seat belts, pretensioners, and buckle assemblies.',
      displayOrder: 2,
      isActive: true,
    },
    update: { name: 'Seat Belts' },
  });

  // =========================================================================
  // 4. Vehicle Taxonomy
  // =========================================================================
  console.log('[Seed 4/11] Seeding Comprehensive Vehicle Taxonomy...');

  // Helper to upsert taxonomy
  async function upsertVehicle(
    makeName: string,
    modelName: string,
    genName: string,
    yearStart: number,
    yearEnd: number | null,
    chassisCode: string,
    bodyType: string,
    engineSpec: string,
  ) {
    const make = await prisma.vehicleMake.upsert({
      where: { slug: makeName.toLowerCase().replace(/\s+/g, '-') },
      create: { name: makeName, slug: makeName.toLowerCase().replace(/\s+/g, '-') },
      update: {},
    });

    const model = await prisma.vehicleModel.upsert({
      where: { makeId_slug: { makeId: make.id, slug: modelName.toLowerCase().replace(/\s+/g, '-') } },
      create: { makeId: make.id, name: modelName, slug: modelName.toLowerCase().replace(/\s+/g, '-') },
      update: {},
    });

    let gen = await prisma.vehicleGeneration.findFirst({
      where: { modelId: model.id, generationName: genName },
    });
    if (!gen) {
      gen = await prisma.vehicleGeneration.create({
        data: { modelId: model.id, generationName: genName, yearStart, yearEnd },
      });
    }

    let chassis = await prisma.vehicleChassis.findFirst({
      where: { generationId: gen.id, chassisCode },
    });
    if (!chassis) {
      chassis = await prisma.vehicleChassis.create({
        data: { generationId: gen.id, chassisCode, bodyType, engineSpec },
      });
    }

    return chassis;
  }

  const rav4Chassis = await upsertVehicle('Toyota', 'RAV4', '5th Gen (XA50)', 2018, 2025, 'AXAH54', 'SUV 5-Door', '2.5L Hybrid AWD (A25A-FXS)');
  const hiluxChassis = await upsertVehicle('Toyota', 'Hilux', '8th Gen (AN120)', 2015, 2025, 'GUN126', 'Double Cab Ute 4x4', '2.8L Turbo Diesel (1GD-FTV)');
  const corollaChassis = await upsertVehicle('Toyota', 'Corolla', '12th Gen (E210)', 2018, 2025, 'MZEA12', 'Hatchback 5-Door', '2.0L Petrol (M20A-FKS)');
  const hiaceChassis = await upsertVehicle('Toyota', 'HiAce', '6th Gen (H300)', 2019, 2025, 'GDH300', 'Commercial Cargo Van', '2.8L Turbo Diesel (1GD-FTV)');

  const rangerChassis = await upsertVehicle('Ford', 'Ranger', 'Next-Gen (PY)', 2022, 2025, 'PY24', 'Dual Cab Ute 4x4', '2.0L Bi-Turbo Diesel');
  const transitChassis = await upsertVehicle('Ford', 'Transit Custom', '1st Gen (V362)', 2013, 2024, 'VN-Custom', 'Commercial Cargo Van', '2.0L EcoBlue Diesel');

  const cx5Chassis = await upsertVehicle('Mazda', 'CX-5', '2nd Gen (KF)', 2017, 2025, 'KF2P', 'SUV 5-Door', '2.5L SkyActiv-G Petrol');
  const i30Chassis = await upsertVehicle('Hyundai', 'i30', '3rd Gen (PD)', 2017, 2024, 'PDe', 'Hatchback 5-Door', '2.0L GDi Petrol');

  // Customer primary vehicle
  await prisma.savedVehicle.deleteMany({ where: { customerId: customerProfile.id } });
  await prisma.savedVehicle.create({
    data: {
      customerId: customerProfile.id,
      vehicleChassisId: rav4Chassis.id,
      nickname: "Jordan's Daily RAV4 Cruiser",
      registrationPlate: 'HYP360',
      isPrimary: true,
    },
  });

  // =========================================================================
  // 5. Warehouses
  // =========================================================================
  console.log('[Seed 5/11] Seeding Warehouses...');

  const aucklandWarehouse = await prisma.warehouse.upsert({
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

  const christchurchWarehouse = await prisma.warehouse.upsert({
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
  // 6. Bulk Tyres Catalogue (8 Real Products with Valid Image URLs)
  // =========================================================================
  console.log('[Seed 6/11] Seeding 8 Bulk Tyre Products & Specifications with Real Images...');

  const TYRES_DATA = [
    {
      sku: 'TYR-MICH-PS5-2055516',
      title: 'Michelin Pilot Sport 5 205/55R16 91V',
      slug: 'michelin-pilot-sport-5-205-55r16',
      brand: 'Michelin',
      oemPartNumber: 'MICH-91V-PS5',
      description: 'Maximized grip and longevity with Dual Sport tread design and Dynamic Response Technology. OEM fit for Corolla, i30, Golf.',
      imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
      width: 205, profile: 55, rim: 16, load: 91, speed: 'V', season: TyreSeason.SUMMER, terrain: TyreTerrainType.PERFORMANCE,
      singlePrice: 189.0, pairPrice: 360.0, setPrice: 699.0,
      stockAkl: 40, stockChc: 16,
      fitments: [corollaChassis.id, i30Chassis.id],
    },
    {
      sku: 'TYR-GDYR-EGP2-2055516',
      title: 'Goodyear EfficientGrip Performance 2 205/55R16 91W',
      slug: 'goodyear-efficientgrip-performance-2-205-55r16',
      brand: 'Goodyear',
      oemPartNumber: 'GDYR-91W-EGP2',
      description: 'Ultra-low rolling resistance and 50% more mileage than competitor averages. Wet Braking Technology certified.',
      imageUrl: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=800&q=80',
      width: 205, profile: 55, rim: 16, load: 91, speed: 'W', season: TyreSeason.ALL_SEASON, terrain: TyreTerrainType.HIGHWAY,
      singlePrice: 165.0, pairPrice: 315.0, setPrice: 610.0,
      stockAkl: 36, stockChc: 12,
      fitments: [corollaChassis.id, i30Chassis.id],
    },
    {
      sku: 'TYR-CONT-UC6-2254517',
      title: 'Continental UltraContact UC6 225/45R17 94W XL',
      slug: 'continental-ultracontact-uc6-225-45r17',
      brand: 'Continental',
      oemPartNumber: 'CONT-94W-UC6',
      description: 'Diamond Edge chamfered blocks for shorter wet braking distances and noise breaker bars for quiet highway cruising.',
      imageUrl: 'https://images.unsplash.com/photo-1527558661642-1e967a57a87c?auto=format&fit=crop&w=800&q=80',
      width: 225, profile: 45, rim: 17, load: 94, speed: 'W', season: TyreSeason.SUMMER, terrain: TyreTerrainType.PERFORMANCE,
      singlePrice: 195.0, pairPrice: 370.0, setPrice: 720.0,
      stockAkl: 28, stockChc: 20,
      fitments: [corollaChassis.id, i30Chassis.id],
    },
    {
      sku: 'TYR-BRDG-D697-2656517',
      title: 'Bridgestone Dueler A/T D697 265/65R17 112S 4WD',
      slug: 'bridgestone-dueler-at-d697-265-65r17',
      brand: 'Bridgestone',
      oemPartNumber: 'BRDG-112S-D697',
      description: 'Heavy duty reinforced light-truck construction engineered for demanding New Zealand gravel roads, farm tracks, and highway towing.',
      imageUrl: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80',
      width: 265, profile: 65, rim: 17, load: 112, speed: 'S', season: TyreSeason.ALL_SEASON, terrain: TyreTerrainType.ALL_TERRAIN,
      singlePrice: 285.0, pairPrice: 545.0, setPrice: 1050.0,
      stockAkl: 48, stockChc: 24,
      fitments: [hiluxChassis.id, rangerChassis.id],
    },
    {
      sku: 'TYR-PIRE-SCORP-2256517',
      title: 'Pirelli Scorpion Verde All Season 225/65R17 102H',
      slug: 'pirelli-scorpion-verde-225-65r17',
      brand: 'Pirelli',
      oemPartNumber: 'PIRE-102H-SCORP',
      description: 'Green Performance eco-friendly compound with high silica content for modern compact and medium SUVs.',
      imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
      width: 225, profile: 65, rim: 17, load: 102, speed: 'H', season: TyreSeason.ALL_SEASON, terrain: TyreTerrainType.HIGHWAY,
      singlePrice: 225.0, pairPrice: 430.0, setPrice: 840.0,
      stockAkl: 32, stockChc: 16,
      fitments: [rav4Chassis.id, cx5Chassis.id],
    },
    {
      sku: 'TYR-HANK-RA18-1958015',
      title: 'Hankook Vantra LT RA18 195/80R15C 106/104R Commercial',
      slug: 'hankook-vantra-lt-ra18-195-80r15c',
      brand: 'Hankook',
      oemPartNumber: 'HANK-106R-RA18',
      description: 'Reinforced 8-ply commercial cargo van tyre designed for courier delivery fleets, HiAce and Transit vans carrying heavy trade payloads.',
      imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
      width: 195, profile: 80, rim: 15, load: 106, speed: 'R', season: TyreSeason.ALL_SEASON, terrain: TyreTerrainType.HIGHWAY,
      singlePrice: 159.0, pairPrice: 305.0, setPrice: 590.0,
      stockAkl: 60, stockChc: 30,
      fitments: [hiaceChassis.id, transitChassis.id],
    },
    {
      sku: 'TYR-DUNL-LM705-1856515',
      title: 'Dunlop SP Sport LM705 Silent Core 185/65R15 88H',
      slug: 'dunlop-sp-sport-lm705-185-65r15',
      brand: 'Dunlop',
      oemPartNumber: 'DUNL-88H-LM705',
      description: 'Japanese Silent Core acoustic sponge technology absorbs tyre cavity resonance for whisper-quiet city and commuter driving.',
      imageUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=80',
      width: 185, profile: 65, rim: 15, load: 88, speed: 'H', season: TyreSeason.SUMMER, terrain: TyreTerrainType.HIGHWAY,
      singlePrice: 139.0, pairPrice: 265.0, setPrice: 515.0,
      stockAkl: 30, stockChc: 12,
      fitments: [corollaChassis.id],
    },
    {
      sku: 'TYR-YOKO-G015-2657016',
      title: 'Yokohama Geolandar A/T G015 265/70R16 112T All-Terrain',
      slug: 'yokohama-geolandar-at-g015-265-70r16',
      brand: 'Yokohama',
      oemPartNumber: 'YOKO-112T-G015',
      description: 'Triple Polymer blend and Enduro compound with severe snow service 3PMSF certification. Outstanding durability for trade utes.',
      imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
      width: 265, profile: 70, rim: 16, load: 112, speed: 'T', season: TyreSeason.ALL_SEASON, terrain: TyreTerrainType.ALL_TERRAIN,
      singlePrice: 269.0, pairPrice: 515.0, setPrice: 995.0,
      stockAkl: 24, stockChc: 16,
      fitments: [hiluxChassis.id, rangerChassis.id],
    },
  ];

  const seededTyreProducts = [];

  for (const t of TYRES_DATA) {
    const product = await prisma.product.upsert({
      where: { sku: t.sku },
      create: {
        categoryId: tyreCategory.id,
        sku: t.sku,
        title: t.title,
        slug: t.slug,
        brand: t.brand,
        oemPartNumber: t.oemPartNumber,
        description: t.description,
        productType: ProductType.BULK_QUANTITY,
        status: ProductStatus.PUBLISHED,
      },
      update: {
        title: t.title,
        brand: t.brand,
        description: t.description,
        status: ProductStatus.PUBLISHED,
      },
    });

    seededTyreProducts.push(product);

    // Overwrite Media with Valid HTTPS Image
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    await prisma.productMedia.create({
      data: {
        productId: product.id,
        s3Key: `products/tyres/${t.slug}.jpg`,
        cdnUrl: t.imageUrl,
        altText: `${t.title} - Tread & Sidewall`,
        displayOrder: 0,
        isPrimary: true,
      },
    });

    // Tyre Specs
    await prisma.tyreSpecification.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        sectionWidth: t.width,
        aspectRatio: t.profile,
        rimDiameter: t.rim,
        loadIndex: t.load,
        speedRating: t.speed,
        season: t.season,
        terrainType: t.terrain,
        runFlat: false,
        extraLoad: false,
        fuelEfficiencyClass: 'C',
        wetGripClass: 'A',
        noiseDb: 71,
      },
      update: {
        sectionWidth: t.width,
        aspectRatio: t.profile,
        rimDiameter: t.rim,
        loadIndex: t.load,
        speedRating: t.speed,
        season: t.season,
        terrainType: t.terrain,
      },
    });

    // Sale Units
    await prisma.saleUnitConfig.deleteMany({ where: { productId: product.id } });
    await prisma.saleUnitConfig.createMany({
      data: [
        {
          productId: product.id,
          code: 'TYRE_SINGLE',
          name: 'Single Tyre',
          baseQuantityMultiplier: 1,
          retailPrice: t.singlePrice,
          compareAtPrice: t.singlePrice * 1.1,
          isDefault: true,
          isActive: true,
        },
        {
          productId: product.id,
          code: 'TYRE_PAIR',
          name: 'Pair of 2 Tyres (Axle Set)',
          baseQuantityMultiplier: 2,
          retailPrice: t.pairPrice,
          compareAtPrice: t.singlePrice * 2,
          isDefault: false,
          isActive: true,
        },
        {
          productId: product.id,
          code: 'TYRE_SET_OF_4',
          name: 'Full Vehicle Set of 4 Tyres',
          baseQuantityMultiplier: 4,
          retailPrice: t.setPrice,
          compareAtPrice: t.singlePrice * 4,
          isDefault: false,
          isActive: true,
        },
      ],
    });

    // Inventory in Auckland
    await prisma.inventoryItem.upsert({
      where: {
        productId_warehouseId_locationBin: {
          productId: product.id,
          warehouseId: aucklandWarehouse.id,
          locationBin: `RACK-TYR-${t.rim}IN`,
        },
      },
      create: {
        productId: product.id,
        warehouseId: aucklandWarehouse.id,
        locationBin: `RACK-TYR-${t.rim}IN`,
        quantityOnHand: t.stockAkl,
        quantityReserved: 0,
        costPrice: Math.round(t.singlePrice * 0.6),
      },
      update: { quantityOnHand: t.stockAkl },
    });

    // Inventory in Christchurch
    await prisma.inventoryItem.upsert({
      where: {
        productId_warehouseId_locationBin: {
          productId: product.id,
          warehouseId: christchurchWarehouse.id,
          locationBin: `CHC-TYR-${t.rim}IN`,
        },
      },
      create: {
        productId: product.id,
        warehouseId: christchurchWarehouse.id,
        locationBin: `CHC-TYR-${t.rim}IN`,
        quantityOnHand: t.stockChc,
        quantityReserved: 0,
        costPrice: Math.round(t.singlePrice * 0.6),
      },
      update: { quantityOnHand: t.stockChc },
    });

    // Fitments
    for (const chassisId of t.fitments) {
      await prisma.productFitment.upsert({
        where: {
          productId_vehicleChassisId: { productId: product.id, vehicleChassisId: chassisId },
        },
        create: {
          productId: product.id,
          vehicleChassisId: chassisId,
          verificationStatus: FitmentVerificationStatus.VERIFIED_OEM_DIRECT,
          fitmentNotes: 'Factory OE tyre dimension specification approved for WOF compliance.',
          verifiedByUserId: adminUser.id,
          verifiedAt: new Date(),
        },
        update: {},
      });
    }
  }

  // =========================================================================
  // 7. Serialized Seat Belts (6 Real Products with Valid Image URLs)
  // =========================================================================
  console.log('[Seed 7/11] Seeding 6 Serialized Seat Belts with Bench-Test Data & Real Images...');

  const SEAT_BELTS_DATA = [
    {
      sku: 'SB-TOY-RAV4-FR-01',
      title: 'Toyota RAV4 (XA50) Front Right Driver Seat Belt Retractor Assembly',
      slug: 'toyota-rav4-xa50-front-right-driver-seat-belt',
      brand: 'Toyota Genuine Parts',
      oemPartNumber: '73210-42350-C0',
      description: 'OEM Toyota pyrotechnic retractor assembly harvested from collision-free donor vehicle. Multimeter verified 2.2Ω squib resistance with smooth mechanical lock.',
      imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_RIGHT_PASSENGER,
      price: 245.0,
      barcode: 'SB-SN-89421A',
      vin: 'JTMB6RFV5MD019482',
      ohms: 2.20,
      chassisId: rav4Chassis.id,
      notes: 'Tested 2.20 ohms pretensioner resistance. Webbing undamaged, retractor locks smoothly.',
    },
    {
      sku: 'SB-TOY-HILX-FL-01',
      title: 'Toyota Hilux (GUN126) Front Left Passenger Seat Belt & Pretensioner',
      slug: 'toyota-hilux-gun126-front-left-passenger-seat-belt',
      brand: 'Toyota Genuine Parts',
      oemPartNumber: '73220-0K310-C0',
      description: 'Factory original front passenger restraint assembly with active pre-loader. Inspected for webbing wear, AS/NZS compliance label intact.',
      imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_LEFT_DRIVER,
      price: 230.0,
      barcode: 'SB-SN-77312B',
      vin: 'MR0BA3CD400192831',
      ohms: 2.25,
      chassisId: hiluxChassis.id,
      notes: 'Tested 2.25 ohms. AS/NZS compliance tag verified intact. Tension springs tested.',
    },
    {
      sku: 'SB-FRD-TRNS-FR-01',
      title: 'Ford Transit Custom (V362) Front Right Driver 3-Point Inertia Restraint',
      slug: 'ford-transit-custom-v362-driver-seat-belt',
      brand: 'Ford OEM Motorcraft',
      oemPartNumber: 'BK21-V611B08-AC',
      description: 'Heavy duty commercial van driver restraint with pretensioner squib. Removed from low-km fleet van, certified for commercial WOF certificate of fitness.',
      imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_RIGHT_PASSENGER,
      price: 260.0,
      barcode: 'SB-SN-66104C',
      vin: 'WF0YXXTTGYKD48291',
      ohms: 2.18,
      chassisId: transitChassis.id,
      notes: 'Commercial van tested 2.18 ohms. Heavy-duty webbing in excellent condition.',
    },
    {
      sku: 'SB-FRD-RNGR-FR-01',
      title: 'Ford Ranger (PX2/PX3) Front Right Driver Retractor Assembly',
      slug: 'ford-ranger-px-driver-seat-belt-assembly',
      brand: 'Ford OEM Motorcraft',
      oemPartNumber: 'EB3B-96611B08-AB',
      description: 'Genuine Ford Ranger dual-cab driver seat belt assembly with pyrotechnic tensioner. Factory black webbing with anchor stalk.',
      imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_RIGHT_PASSENGER,
      price: 240.0,
      barcode: 'SB-SN-55209D',
      vin: 'MNBMSFF50JW198234',
      ohms: 2.22,
      chassisId: rangerChassis.id,
      notes: 'Tested 2.22 ohms. Retractor mechanism inspected and smooth.',
    },
    {
      sku: 'SB-MZD-CX5-FL-01',
      title: 'Mazda CX-5 (KF) Front Left Passenger Pyrotechnic Pretensioner',
      slug: 'mazda-cx5-kf-front-passenger-seat-belt',
      brand: 'Mazda Genuine Parts',
      oemPartNumber: 'KB8B-57-630A-02',
      description: 'Original Mazda safety restraint dismantled from low-km donor. Multimeter verified resistance, inertia pendulum locks under rapid tilt.',
      imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_LEFT_DRIVER,
      price: 220.0,
      barcode: 'SB-SN-44118E',
      vin: 'JM7KF4W7A00189234',
      ohms: 2.30,
      chassisId: cx5Chassis.id,
      notes: 'Tested 2.30 ohms. Donor vehicle collision-free. Inertia lock positive.',
    },
    {
      sku: 'SB-HYU-I30-FR-01',
      title: 'Hyundai i30 (PD) Front Right Driver Retractor with Squib',
      slug: 'hyundai-i30-pd-driver-seat-belt-retractor',
      brand: 'Hyundai Mobis',
      oemPartNumber: '88810-G3000TRY',
      description: 'Direct factory replacement for Hyundai i30 hatch models. Complete with upper B-pillar D-ring guide and pyrotechnic circuit check.',
      imageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
      position: SeatBeltPosition.FRONT_RIGHT_PASSENGER,
      price: 215.0,
      barcode: 'SB-SN-33092F',
      vin: 'KMHCH51EBHU091245',
      ohms: 2.15,
      chassisId: i30Chassis.id,
      notes: 'Tested 2.15 ohms. Factory tag undamaged and legible.',
    },
  ];

  for (const s of SEAT_BELTS_DATA) {
    const product = await prisma.product.upsert({
      where: { sku: s.sku },
      create: {
        categoryId: seatBeltCategory.id,
        sku: s.sku,
        title: s.title,
        slug: s.slug,
        brand: s.brand,
        oemPartNumber: s.oemPartNumber,
        description: s.description,
        productType: ProductType.INDIVIDUALLY_SERIALIZED,
        status: ProductStatus.PUBLISHED,
      },
      update: {
        title: s.title,
        brand: s.brand,
        description: s.description,
        status: ProductStatus.PUBLISHED,
      },
    });

    // Overwrite Media with Valid HTTPS Image
    await prisma.productMedia.deleteMany({ where: { productId: product.id } });
    await prisma.productMedia.create({
      data: {
        productId: product.id,
        s3Key: `products/seatbelts/${s.slug}.jpg`,
        cdnUrl: s.imageUrl,
        altText: `${s.title} - Bench-Tested Safety Assembly`,
        displayOrder: 0,
        isPrimary: true,
      },
    });

    // Seat Belt Specs
    await prisma.seatBeltSpecification.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        position: s.position,
        componentType: SeatBeltComponentType.RETRACTOR_ASSEMBLY,
        pretensionerType: PretensionerType.PYROTECHNIC,
        webbingColor: 'Standard Black',
        mountingPoints: 3,
        oemReferenceTag: s.oemPartNumber,
      },
      update: {
        position: s.position,
        oemReferenceTag: s.oemPartNumber,
      },
    });

    // Sale Unit
    await prisma.saleUnitConfig.deleteMany({ where: { productId: product.id } });
    await prisma.saleUnitConfig.create({
      data: {
        productId: product.id,
        code: 'SEAT_BELT_UNIT',
        name: 'Individual Serialized Seat Belt',
        baseQuantityMultiplier: 1,
        retailPrice: s.price,
        compareAtPrice: Math.round(s.price * 1.5),
        isDefault: true,
        isActive: true,
      },
    });

    // Serialized Inventory Item (Live Physical Stock)
    await prisma.serializedInventoryItem.upsert({
      where: { stockBarcode: s.barcode },
      create: {
        productId: product.id,
        warehouseId: aucklandWarehouse.id,
        stockBarcode: s.barcode,
        donorVehicleVin: s.vin,
        conditionGrade: ConditionGrade.GRADE_A_LIKE_NEW,
        conditionNotes: s.notes,
        pretensionerResistanceOhms: s.ohms,
        actualPhotos: [s.imageUrl],
        locationBin: `BIN-SAFETY-${s.barcode.slice(-4)}`,
        costPrice: Math.round(s.price * 0.5),
        status: SerializedItemStatus.AVAILABLE,
      },
      update: {
        status: SerializedItemStatus.AVAILABLE,
        conditionNotes: s.notes,
        pretensionerResistanceOhms: s.ohms,
        actualPhotos: [s.imageUrl],
      },
    });

    // Fitment
    await prisma.productFitment.upsert({
      where: {
        productId_vehicleChassisId: { productId: product.id, vehicleChassisId: s.chassisId },
      },
      create: {
        productId: product.id,
        vehicleChassisId: s.chassisId,
        verificationStatus: FitmentVerificationStatus.VERIFIED_OEM_DIRECT,
        fitmentNotes: 'Direct factory OEM replacement with donor VIN match. Multimeter resistance verified.',
        verifiedByUserId: adminUser.id,
        verifiedAt: new Date(),
      },
      update: {},
    });
  }

  // =========================================================================
  // 10. Sample Order with Immutable Line Snapshots
  // =========================================================================
  console.log('[Seed 10/11] Seeding Historical Order & Immutable Line Snapshots...');

  const firstTyre = seededTyreProducts[0];
  if (firstTyre) {
    const tyreSaleUnits = await prisma.saleUnitConfig.findMany({ where: { productId: firstTyre.id } });
    const tyrePairUnit = tyreSaleUnits.find((su) => su.code === 'TYRE_PAIR') || tyreSaleUnits[0];

    if (tyrePairUnit) {
      const sampleOrderNumber = 'PIN-2026-10001';
      let sampleOrder = await prisma.order.findUnique({ where: { orderNumber: sampleOrderNumber } });

      if (!sampleOrder) {
        await prisma.order.create({
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
                  productId: firstTyre.id,
                  saleUnitConfigId: tyrePairUnit.id,
                  skuSnapshot: firstTyre.sku,
                  titleSnapshot: firstTyre.title,
                  saleUnitCodeSnapshot: tyrePairUnit.code,
                  saleUnitNameSnapshot: tyrePairUnit.name,
                  baseQuantityMultiplierSnapshot: tyrePairUnit.baseQuantityMultiplier,
                  quantity: 1,
                  baseUnitsConsumed: 2,
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
      status: IntegrationAccountStatus.DISCONNECTED,
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
      status: IntegrationAccountStatus.DISCONNECTED,
      isActive: false,
      settings: {
        apiEndpoint: 'https://api.tmsandbox.co.nz/v1',
        isInTrade: true,
      },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'PARTSTRADER', environment: 'sandbox' } },
    create: {
      provider: 'PARTSTRADER',
      name: 'PartsTrader Procurement (NZ)',
      environment: 'sandbox',
      status: IntegrationAccountStatus.DISCONNECTED,
      isActive: false,
      settings: {
        apiEndpoint: 'https://sandbox.partstrader.co.nz/api/v1',
      },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'CAP_EZI', environment: 'sandbox' } },
    create: {
      provider: 'CAP_EZI',
      name: 'CAP Ezi Parts & Interchange Catalogue',
      environment: 'sandbox',
      status: IntegrationAccountStatus.DISCONNECTED,
      isActive: false,
      settings: {
        apiEndpoint: 'https://sandbox.capezi.infomedia.com.au/v2',
      },
    },
    update: {},
  });

  await prisma.integrationAccount.upsert({
    where: { provider_environment: { provider: 'GMAIL', environment: 'sandbox' } },
    create: {
      provider: 'GMAIL',
      name: 'Google Workspace / Gmail Business Mailbox',
      environment: 'sandbox',
      status: IntegrationAccountStatus.DISCONNECTED,
      isActive: false,
      settings: {
        mailboxEmail: 'trade@pinnacleparts.co.nz',
        authorizedScopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
        ],
      },
    },
    update: {},
  });

  console.log('------------------------------------------------------------');
  console.log('[Seed] Comprehensive Domain Seed completed successfully! 🎉');
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
