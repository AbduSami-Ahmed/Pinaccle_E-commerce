/**
 * Pinnacle shared contracts — Auth & permissions.
 * These types are shared between the NestJS API and Next.js frontend.
 * Do NOT import backend-specific packages here.
 */

// ---------------------------------------------------------------------------
// Health (existing)
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  service?: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'ok' | 'down';
  uptimeSeconds?: number;
  timestamp: string;
  version?: string;
  environment?: string;
  services?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionCode =
  // Catalog
  | 'catalog:product:view'
  | 'catalog:product:view_draft'
  | 'catalog:product:create'
  | 'catalog:product:update'
  | 'catalog:product:publish'
  | 'catalog:product:delete'
  | 'catalog:category:manage'
  | 'catalog:spec:manage'
  // Fitment
  | 'fitment:matrix:view'
  | 'fitment:matrix:manage'
  | 'fitment:verify'
  // Inventory
  | 'inventory:stock:view_quantity'
  | 'inventory:stock:view_cost_price'
  | 'inventory:stock:inward_bulk'
  | 'inventory:stock:serialize_item'
  | 'inventory:stock:update_location'
  | 'inventory:stock:adjust'
  | 'inventory:stock:write_off'
  | 'inventory:stock:edit_condition'
  // Orders
  | 'orders:view:own'
  | 'orders:view:all'
  | 'orders:create:customer'
  | 'orders:create:manual'
  | 'orders:override_price'
  | 'orders:status:update'
  | 'orders:fulfill:pick_pack'
  | 'orders:fulfill:dispatch'
  | 'orders:cancel:own'
  | 'orders:cancel:any'
  // Payments
  | 'payments:view:transactions'
  | 'payments:capture:manual'
  | 'payments:refund:process'
  | 'payments:view:gateway_creds'
  // Returns
  | 'returns:request:own'
  | 'returns:view:all'
  | 'returns:review:approve_reject'
  | 'returns:inspect:disposition'
  // Customers
  | 'customers:profile:own'
  | 'customers:view:directory'
  | 'customers:view:pii_contact'
  | 'customers:gdpr:anonymize'
  // Staff
  | 'staff:users:view'
  | 'staff:users:manage'
  | 'staff:roles:assign'
  // Audit
  | 'audit:logs:view'
  // System
  | 'system:settings:manage';

// ---------------------------------------------------------------------------
// Authenticated User (JWT payload shape — same in local dev and Cognito modes)
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  /** User UUID (Prisma User.id) */
  sub: string;
  email: string;
  isStaff: boolean;
  /** Resolved permission codes — checked by PermissionsGuard */
  permissions: PermissionCode[];
  /** Set when the user holds the CUSTOMER role; used for ownership checks */
  customerId?: string;
}

// ---------------------------------------------------------------------------
// Auth API response shapes (safe — never includes passwordHash)
// ---------------------------------------------------------------------------

export interface UserDto {
  id: string;
  email: string;
  isActive: boolean;
  isStaff: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginResponseDto {
  user: UserDto;
  /** Only present in local-dev mode; not emitted in Cognito mode (cookie only). */
  accessToken?: string;
}

// ---------------------------------------------------------------------------
// Catalog & Product Contracts
// ---------------------------------------------------------------------------

export type ProductType = 'BULK_QUANTITY' | 'INDIVIDUALLY_SERIALIZED';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type TyreSeason = 'SUMMER' | 'WINTER' | 'ALL_SEASON';
export type TyreTerrainType = 'HIGHWAY' | 'ALL_TERRAIN' | 'MUD_TERRAIN' | 'PERFORMANCE';

export type SeatBeltPosition =
  | 'FRONT_LEFT_DRIVER'
  | 'FRONT_RIGHT_PASSENGER'
  | 'REAR_LEFT'
  | 'REAR_RIGHT'
  | 'REAR_CENTER'
  | 'THIRD_ROW_LEFT'
  | 'THIRD_ROW_RIGHT';

export type SeatBeltComponentType =
  'RETRACTOR_ASSEMBLY' | 'BUCKLE_STALK' | 'LAP_BELT' | 'COMPLETE_ASSEMBLY';

export type PretensionerType = 'PYROTECHNIC' | 'MECHANICAL' | 'NONE';

export interface CategoryDto {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  children?: CategoryDto[];
}

export interface ProductMediaDto {
  id?: string;
  productId?: string;
  s3Key: string;
  cdnUrl: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface SaleUnitConfigDto {
  id?: string;
  code: string;
  name: string;
  baseQuantityMultiplier: number;
  retailPrice: string;
  compareAtPrice?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface TyreSpecificationDto {
  id?: string;
  productId?: string;
  sectionWidth: number;
  aspectRatio: number;
  rimDiameter: number;
  loadIndex: number;
  speedRating: string;
  season: TyreSeason;
  terrainType: TyreTerrainType;
  runFlat: boolean;
  extraLoad: boolean;
  fuelEfficiencyClass?: string | null;
  wetGripClass?: string | null;
  noiseDb?: number | null;
}

export interface SeatBeltSpecificationDto {
  id?: string;
  productId?: string;
  position: SeatBeltPosition;
  componentType: SeatBeltComponentType;
  pretensionerType: PretensionerType;
  webbingColor: string;
  mountingPoints: number;
  oemReferenceTag?: string | null;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  category?: CategoryDto;
  sku: string;
  title: string;
  slug: string;
  brand: string;
  oemPartNumber?: string | null;
  description: string;
  productType: ProductType;
  status: ProductStatus;
  media: ProductMediaDto[];
  saleUnits: SaleUnitConfigDto[];
  tyreSpecification?: TyreSpecificationDto | null;
  seatBeltSpecification?: SeatBeltSpecificationDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItemDto {
  id: string;
  sku: string;
  title: string;
  slug: string;
  brand: string;
  categoryName: string;
  categorySlug: string;
  productType: ProductType;
  status: ProductStatus;
  primaryImageUrl?: string | null;
  basePrice?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListQuery {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  brand?: string;
  productType?: ProductType;
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'sku' | 'createdAt' | 'brand' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PresignedUploadRequest {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
  cdnUrl: string;
  expiresInSeconds: number;
}

// ---------------------------------------------------------------------------
// Inventory & Ledger Contracts
// ---------------------------------------------------------------------------

export type ConditionGrade =
  'NEW_SURPLUS' | 'GRADE_A_LIKE_NEW' | 'GRADE_B_MINOR_WEAR' | 'GRADE_C_FUNCTIONAL_BLEMISH';

export type SerializedItemStatus =
  'AVAILABLE' | 'RESERVED' | 'SOLD' | 'SCRAPPED' | 'UNDER_INSPECTION';

export type InventoryMovementType =
  | 'RECEIPT'
  | 'SALE_DEDUCTION'
  | 'RESERVATION_HOLD'
  | 'RESERVATION_RELEASE'
  | 'MANUAL_ADJUSTMENT'
  | 'RETURN_RESTOCK'
  | 'SCRAP_WRITEOFF';

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONVERTED_TO_ORDER';

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
}

export interface InventoryItemDto {
  id: string;
  productId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  locationBin: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  /** Only populated if caller holds inventory:stock:view_cost_price */
  costPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedInventoryItemDto {
  id: string;
  productId: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  stockBarcode: string;
  donorVehicleVin: string | null;
  conditionGrade: ConditionGrade;
  conditionNotes: string;
  pretensionerResistanceOhms: string | null;
  actualPhotos: string[];
  locationBin: string;
  /** Only populated if caller holds inventory:stock:view_cost_price */
  costPrice?: string;
  status: SerializedItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementDto {
  id: string;
  inventoryItemId: string | null;
  serializedItemId: string | null;
  movementType: InventoryMovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reasonCode: string;
  operatorId: string;
  operatorEmail?: string;
  referenceOrderId: string | null;
  createdAt: string;
}

export interface StockReservationDto {
  id: string;
  cartItemId: string;
  inventoryItemId: string | null;
  serializedItemId: string | null;
  reservedQuantity: number;
  expiresAt: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface SellableUnitBreakdown {
  code: string;
  name: string;
  multiplier: number;
  sellableCount: number;
  retailPrice: string;
}

export interface ProductStockSummaryDto {
  productId: string;
  sku: string;
  title: string;
  brand: string;
  categoryName: string;
  categorySlug: string;
  productType: ProductType;
  totalQuantityOnHand: number;
  totalQuantityReserved: number;
  totalQuantityAvailable: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  inventoryItems: InventoryItemDto[];
  serializedItems: SerializedInventoryItemDto[];
  sellableUnits: SellableUnitBreakdown[];
}

export interface ReceiveBulkStockRequest {
  productId: string;
  warehouseId: string;
  locationBin: string;
  quantity: number;
  costPrice: string;
  referencePo?: string;
  reasonCode?: string;
}

export interface ReceiveSerializedPartRequest {
  productId: string;
  warehouseId: string;
  stockBarcode?: string;
  donorVehicleVin?: string;
  conditionGrade: ConditionGrade;
  conditionNotes: string;
  pretensionerResistanceOhms?: string;
  actualPhotos?: string[];
  locationBin: string;
  costPrice: string;
  referencePo?: string;
  reasonCode?: string;
}

export interface StockAdjustmentRequest {
  inventoryItemId?: string;
  serializedItemId?: string;
  quantityChange: number;
  reasonCode: string;
  referenceNote?: string;
}

export interface StockTransferRequest {
  productId: string;
  sourceWarehouseId: string;
  sourceBin: string;
  destinationWarehouseId: string;
  destinationBin: string;
  quantity: number;
  referenceNote?: string;
}

export interface ReconciliationResultDto {
  inventoryItemId: string;
  productId: string;
  warehouseCode: string;
  locationBin: string;
  computedOnHand: number;
  actualOnHand: number;
  isReconciled: boolean;
  discrepancy: number;
  totalMovementsCount: number;
}

export interface InventoryOverviewQuery {
  search?: string;
  warehouseId?: string;
  stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Storefront Discovery & Search (Phase 7)
// ---------------------------------------------------------------------------

export interface StorefrontProductSummaryDto {
  id: string;
  sku: string;
  title: string;
  slug: string;
  brand: string;
  categoryName: string;
  categorySlug: string;
  productType: ProductType;
  primaryImageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  defaultPrice: number;
  defaultSaleUnitCode: string;
  defaultSaleUnitName: string;
  availableSaleUnits: {
    code: string;
    name: string;
    multiplier: number;
    price: number;
  }[];
  availability: {
    inStock: boolean;
    isLowStock: boolean;
    totalOnHand: number;
    totalReserved: number;
    sellableBaseUnits: number;
    label: string;
  };
  condition: ConditionGrade;
  stockNumber?: string;
  tyreSpec?: {
    sectionWidth: number;
    aspectRatio: number;
    rimDiameter: number;
    loadIndex: number;
    speedRating: string;
    season: string;
    terrainType: string;
    runFlat: boolean;
  };
  seatBeltSpec?: {
    position: string;
    componentType: string;
    mountingPoints: number;
    webbingColor: string;
    oemReferenceTag?: string;
  };
  fitmentSummary?: {
    makes: string[];
    models: string[];
    yearRange?: string;
    verificationStatus: string;
  };
}

export interface ProductMediaItemDto {
  id?: string;
  cdnUrl: string;
  altText: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface ProductFitmentDetailDto {
  id: string;
  make: string;
  model: string;
  generation?: string;
  yearRange?: string;
  chassisCode: string;
  bodyType?: string;
  engineSpec?: string;
  verificationStatus: FitmentVerificationStatus;
  isOemDirect: boolean;
  fitmentNotes?: string | null;
}

export interface SerializedItemDetailDto {
  id: string;
  stockBarcode: string;
  conditionGrade: ConditionGrade;
  conditionNotes?: string | null;
  status: SerializedItemStatus;
  actualPhotos: string[];
  donorVin?: string | null;
  donorVehicleDesc?: string | null;
  resistanceOhms?: number | null;
  warehouseLocation?: string | null;
}

export interface WarehouseLocationDetailDto {
  name: string;
  depotCode: string;
  bay?: string;
  pickupAvailable: boolean;
  pickupLeadTime: string;
}

export interface RelatedProductDto {
  id: string;
  sku: string;
  title: string;
  slug: string;
  brand: string;
  categorySlug: string;
  defaultPrice: number;
  primaryImageUrl: string | null;
  relationReason: string;
  inStock: boolean;
}

export interface StorefrontProductDetailDto extends StorefrontProductSummaryDto {
  description: string;
  currency: string;
  allMedia: ProductMediaItemDto[];
  fitments: ProductFitmentDetailDto[];
  serializedItem?: SerializedItemDetailDto;
  warehouseLocation?: WarehouseLocationDetailDto;
  shippingInfo: {
    standardDispatch: string;
    expressCourier: string;
    cutoffTimeAEST: string;
  };
  warrantyAndReturns: {
    warrantyDays: number;
    returnPolicy: string;
    srsDisclaimer?: string;
  };
  relatedProducts: RelatedProductDto[];
}

export interface StorefrontSearchQuery {
  search?: string;
  categorySlug?: string;
  brand?: string;
  condition?: string;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  saleUnit?: string;
  // Tyre filters
  sectionWidth?: number;
  aspectRatio?: number;
  rimDiameter?: number;
  loadIndex?: number;
  speedRating?: string;
  season?: string;
  terrainType?: string;
  runFlat?: boolean;
  // Seat-belt filters
  make?: string;
  model?: string;
  year?: number;
  position?: string;
  componentType?: string;
  chassis?: string;
  // Sort & Pagination
  sortBy?: 'price_asc' | 'price_desc' | 'title' | 'createdAt' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface StorefrontFilterMetaDto {
  brands: string[];
  priceRange: { min: number; max: number };
  tyreFilters?: {
    widths: number[];
    profiles: number[];
    rimDiameters: number[];
    speedRatings: string[];
    seasons: string[];
    terrainTypes: string[];
  };
  seatBeltFilters?: {
    positions: string[];
    componentTypes: string[];
    conditionGrades: string[];
    makes: string[];
    models: string[];
  };
}

export interface VehicleMakeOptionDto {
  id: string;
  name: string;
  slug: string;
  models: {
    id: string;
    name: string;
    slug: string;
    yearStart?: number;
    yearEnd?: number | null;
  }[];
}

// ---------------------------------------------------------------------------
// Vehicle Finder & Fitment (Phase 8)
// ---------------------------------------------------------------------------

export type FitmentVerificationStatus = 'VERIFIED_OEM_DIRECT' | 'UNIVERSAL_FIT' | 'REQUIRES_CHECK';

export type FitmentConfidence =
  'CONFIRMED_EXACT' | 'UNIVERSAL_COMPATIBLE' | 'PARTIAL_REQUIRES_CHECK';

export interface VehicleMakeDto {
  id: string;
  name: string;
  slug: string;
  modelsCount?: number;
}

export interface VehicleModelDto {
  id: string;
  makeId: string;
  makeName: string;
  name: string;
  slug: string;
  yearsRange?: string;
}

export interface VehicleGenerationDto {
  id: string;
  modelId: string;
  generationName: string;
  yearStart: number;
  yearEnd: number | null;
}

export interface VehicleChassisDto {
  id: string;
  generationId: string;
  generationName: string;
  chassisCode: string;
  bodyType: string;
  engineSpec: string | null;
  yearStart: number;
  yearEnd: number | null;
  makeName: string;
  modelName: string;
}

export interface VehicleSelection {
  make: string;
  model: string;
  year?: number;
  chassisId?: string;
  chassisCode?: string;
  bodyType?: string;
  engineSpec?: string;
}

export interface ProductFitmentDto {
  id: string;
  productId: string;
  productTitle: string;
  productSku: string;
  productBrand: string;
  productCategory: string;
  categorySlug: string;
  vehicleChassisId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleGeneration: string;
  vehicleChassisCode: string;
  yearRange: string;
  verificationStatus: FitmentVerificationStatus;
  fitmentNotes: string | null;
  verifiedByUserId: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface FitmentSearchResultDto {
  product: StorefrontProductSummaryDto;
  fitmentConfidence: FitmentConfidence;
  verificationStatus: FitmentVerificationStatus;
  matchedChassisCode: string;
  matchedVehicleName: string;
  fitmentNotes: string | null;
  isOemDirect: boolean;
}

export interface CreateProductFitmentRequest {
  productId: string;
  vehicleChassisId: string;
  verificationStatus?: FitmentVerificationStatus;
  fitmentNotes?: string;
}

export interface UpdateFitmentVerificationRequest {
  verificationStatus: FitmentVerificationStatus;
  fitmentNotes?: string;
}

export interface FitmentSearchQuery {
  makeId?: string;
  make?: string;
  modelId?: string;
  model?: string;
  year?: number;
  chassisId?: string;
  chassisCode?: string;
  categorySlug?: string;
  minConfidence?: FitmentConfidence;
  page?: number;
  pageSize?: number;
}
