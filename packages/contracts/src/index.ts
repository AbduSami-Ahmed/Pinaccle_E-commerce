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

// ---------------------------------------------------------------------------
// Customer Account & Profile Contracts (Phase 10)
// ---------------------------------------------------------------------------

export type AccountType = 'RETAIL' | 'TRADE' | 'WHOLESALE';

export interface CustomerProfileDto {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  accountType: AccountType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  defaultAddressId?: string | null;
}

export interface UpdateCustomerProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CustomerAddressDto {
  id: string;
  customerId: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerAddressDto {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface UpdateCustomerAddressDto {
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

// ---------------------------------------------------------------------------
// Cart Contracts (Phase 10)
// ---------------------------------------------------------------------------

export interface CartItemDto {
  id: string;
  cartId: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  productSku: string;
  productBrand: string;
  categorySlug: string;
  primaryImageUrl?: string | null;
  saleUnitConfigId: string;
  saleUnitName: string;
  saleUnitMultiplier: number;
  quantity: number;
  totalPhysicalUnits: number;
  unitPrice: number;
  lineTotal: number;
  isAvailable: boolean;
  maxAvailableQuantity: number;
  stockAvailabilityMessage?: string;
  serializedItemId?: string | null;
  serializedStockBarcode?: string | null;
  isIndividuallyTracked: boolean;
}

export interface CartTotalsDto {
  subtotal: number;
  taxIncluded: number;
  shippingEstimate: number;
  shippingMethod: 'CLICK_AND_COLLECT' | 'EXPRESS_COURIER';
  total: number;
  currency: string;
}

export interface CartDto {
  id: string;
  sessionToken: string;
  customerId?: string | null;
  currency: string;
  items: CartItemDto[];
  totals: CartTotalsDto;
  totalPacksCount: number;
  totalPhysicalUnitsCount: number;
  hasUnavailableItems: boolean;
  updatedAt: string;
}

export interface AddToCartDto {
  productId: string;
  saleUnitConfigId: string;
  quantity?: number;
  serializedItemId?: string;
}

export interface UpdateCartItemQuantityDto {
  quantity: number;
}

export interface MergeCartDto {
  guestSessionToken: string;
}

// ---------------------------------------------------------------------------
// Checkout & Orders Contracts (Phase 11)
// ---------------------------------------------------------------------------

export type ShippingMethod = 'CLICK_AND_COLLECT' | 'STANDARD_COURIER' | 'EXPRESS_COURIER';

export interface OrderAddressSnapshot {
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  deliveryNotes?: string;
}

export interface CheckoutValidationRequestDto {
  shippingMethod: ShippingMethod;
  shippingAddress?: Partial<OrderAddressSnapshot>;
}

export interface CheckoutValidationItemDto {
  productId: string;
  productTitle: string;
  sku: string;
  saleUnitName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  message?: string;
}

export interface CheckoutTotalsDto {
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  taxRatePercent: number;
  isTaxInclusive: boolean;
}

export interface CheckoutValidationResponseDto {
  isValid: boolean;
  totals: CheckoutTotalsDto;
  items: CheckoutValidationItemDto[];
  shippingMethod: ShippingMethod;
  errors?: string[];
}

export interface InitiateCheckoutOrderDto {
  customerEmail: string;
  customerPhone: string;
  customerFirstName: string;
  customerLastName: string;
  shippingMethod: ShippingMethod;
  shippingAddress: OrderAddressSnapshot;
  billingAddress?: OrderAddressSnapshot;
  notes?: string;
}

export interface OrderItemSnapshotDto {
  id: string;
  productId: string | null;
  skuSnapshot: string;
  titleSnapshot: string;
  saleUnitCodeSnapshot: string;
  saleUnitNameSnapshot: string;
  baseQuantityMultiplierSnapshot: number;
  quantity: number;
  baseUnitsConsumed: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
  serializedItemId?: string | null;
}

export interface OrderDetailsDto {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerEmail: string;
  customerPhone: string | null;
  orderStatus:
    'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'UNPAID' | 'AUTHORIZED' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';
  fulfillmentStatus: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  shippingMethod: ShippingMethod;
  shippingAddress: OrderAddressSnapshot;
  billingAddress: OrderAddressSnapshot;
  notes?: string | null;
  items: OrderItemSnapshotDto[];
  reservationExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Payment Contracts (Phase 11)
// ---------------------------------------------------------------------------

export type PaymentGatewayProvider = 'STRIPE' | 'MOCK' | 'PAYPAL' | 'MANUAL';

export interface CreatePaymentIntentDto {
  orderId: string;
  provider?: PaymentGatewayProvider;
}

export interface PaymentSessionResponseDto {
  orderId: string;
  orderNumber: string;
  provider: PaymentGatewayProvider;
  clientSecret?: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  reservationExpiresAt?: string;
}

export interface MockPaymentConfirmDto {
  transactionReference: string;
  simulateSuccess?: boolean;
}

export interface PaymentWebhookResultDto {
  received: boolean;
  duplicate?: boolean;
  status: string;
  orderNumber?: string;
}

// ---------------------------------------------------------------------------
// Phase 12: Order Operations, Fulfilment & RMA Returns
// ---------------------------------------------------------------------------

export type OrderStatus =
  'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type PaymentStatus =
  'UNPAID' | 'AUTHORIZED' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';

export type FulfillmentStatus = 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';

export type ShipmentStatus =
  'LABEL_CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED_DELIVERY';

export interface OrderQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'totalAmount' | 'orderNumber';
  sortDirection?: 'asc' | 'desc';
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  notes?: string;
}

export interface PickPackOrderDto {
  notes?: string;
}

export interface DispatchCourierShipmentDto {
  carrierName: string;
  trackingNumber: string;
  trackingUrl?: string;
  warehouseId?: string;
  notes?: string;
}

export interface ConfirmDepotCollectionDto {
  collectedBy: string;
  idDocumentType?: string;
  idReferenceLast4?: string;
  notes?: string;
}

export interface ShipmentItemDto {
  id: string;
  orderItemId: string;
  quantityShipped: number;
  sku?: string;
  title?: string;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  warehouseId?: string | null;
  carrierName: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  items: ShipmentItemDto[];
}

export interface CancelOrderDto {
  reason: string;
  refundPayment?: boolean;
}

export interface ProcessRefundDto {
  amount?: number;
  reason: string;
}

export interface RefundResultDto {
  success: boolean;
  refundAmount: number;
  transactionReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

export type ReturnReasonCode =
  'INCORRECT_FITMENT' | 'DEFECTIVE_PART' | 'DAMAGED_IN_SHIPPING' | 'CUSTOMER_CHANGED_MIND';

export type ReturnStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED_AWAITING_INSPECTION'
  | 'RESOLVED'
  | 'CLOSED';

export type ReturnDisposition = 'RESTOCK_TO_INVENTORY' | 'SCRAP_WRITEOFF' | 'RETURN_TO_SENDER';

export interface CreateReturnItemDto {
  orderItemId: string;
  quantity: number;
}

export interface CreateReturnRequestDto {
  orderId: string;
  reasonCode: ReturnReasonCode;
  customerNotes: string;
  proofPhotos?: string[];
  items: CreateReturnItemDto[];
}

export interface ReviewReturnRequestDto {
  action: 'APPROVE' | 'REJECT';
  staffNotes?: string;
}

export interface RecordReturnInspectionDto {
  returnItemId: string;
  disposition: ReturnDisposition;
  inspectionNotes: string;
  refundEligible: boolean;
}

export interface ReturnInspectionDto {
  id: string;
  returnItemId: string;
  inspectorId: string;
  inspectorName: string;
  disposition: ReturnDisposition;
  inspectionNotes: string;
  refundEligible: boolean;
  completedAt: string;
}

export interface ReturnItemDto {
  id: string;
  orderItemId: string;
  productTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  inspection?: ReturnInspectionDto | null;
}

export interface ReturnRequestDto {
  id: string;
  rmaNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  reasonCode: ReturnReasonCode;
  customerNotes: string;
  proofPhotos: string[];
  status: ReturnStatus;
  items: ReturnItemDto[];
  createdAt: string;
  updatedAt: string;
}

export type OrderTimelineEventType =
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING_STARTED'
  | 'PICK_PACKED'
  | 'DISPATCHED'
  | 'COLLECTED_AT_DEPOT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_PROCESSED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURN_INSPECTED';

export interface OrderTimelineEventDto {
  id: string;
  type: OrderTimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

export interface OrderAdminDetailsDto extends OrderDetailsDto {
  isPiiMasked?: boolean;
  shipments: ShipmentDto[];
  returnRequests: ReturnRequestDto[];
  paymentTransactions: {
    id: string;
    provider: string;
    transactionReference: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
  timeline: OrderTimelineEventDto[];
  allowedTransitions: OrderStatus[];
}

// ===========================================================================
// Phase 13: Admin Operations, Dashboard & Business Settings Contracts
// ===========================================================================

export type DashboardDateRange = 'today' | '7d' | '30d' | '90d' | 'all';

export interface DashboardPeriodDto {
  range: DashboardDateRange;
  startDate: string;
  endDate: string;
  label: string;
}

export interface DashboardSalesMetricsDto {
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  totalOrdersCount: number;
  paidOrdersCount: number;
  averageOrderValue: number;
  currency: string;
}

export interface DashboardFulfillmentQueuesDto {
  awaitingPickPackCount: number;
  inFulfillmentCount: number;
  pendingPaymentCount: number;
  shippedCount: number;
  deliveredCount: number;
  pendingRmaInspectionCount: number;
}

export interface StockAlertItemDto {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  productType: 'BULK_QUANTITY' | 'INDIVIDUALLY_SERIALIZED';
  currentStock: number;
  reservedStock: number;
  sellableStock: number;
  threshold?: number;
}

export interface DashboardStockHealthDto {
  totalPublishedProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: StockAlertItemDto[];
  outOfStockItems: StockAlertItemDto[];
}

export interface DashboardCategoryBreakdownDto {
  categoryId: string;
  name: string;
  slug: string;
  activeProductCount: number;
}

export interface DashboardRecentActivityDto {
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingMethod: ShippingMethod;
    total: number;
    createdAt: string;
  }[];
  recentMovements: {
    id: string;
    productName: string;
    sku: string;
    movementType: InventoryMovementType;
    quantity: number;
    actorName: string;
    createdAt: string;
  }[];
  recentAuditLogs: {
    id: string;
    domain: string;
    action: string;
    actorName: string;
    createdAt: string;
  }[];
}

export interface DashboardSummaryDto {
  period: DashboardPeriodDto;
  sales: DashboardSalesMetricsDto;
  fulfillmentQueues: DashboardFulfillmentQueuesDto;
  stockHealth: DashboardStockHealthDto;
  categoryBreakdown: DashboardCategoryBreakdownDto[];
  recentActivity: DashboardRecentActivityDto;
}

export interface AdminCustomerListItemDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  ordersCount: number;
  totalSpend: number;
  isPiiMasked: boolean;
  createdAt: string;
}

export interface AdminCustomerDetailDto extends AdminCustomerListItemDto {
  addresses: CustomerAddressDto[];
  savedVehicles: {
    id: string;
    make: string;
    model: string;
    year: number;
    variant?: string;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    total: number;
    createdAt: string;
  }[];
}

export interface StaffUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  isStaff: boolean;
  roles: {
    id: string;
    key: string;
    name: string;
  }[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleWithPermissionsDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: {
    id: string;
    code: string;
    description: string;
    domain: string;
  }[];
}

export interface UpdateStaffRolesDto {
  roleIds: string[];
}

export interface ToggleStaffActiveDto {
  isActive: boolean;
}

export interface BusinessSettingsDto {
  company: {
    legalName: string;
    tradeName: string;
    abn: string;
    licenseNumber: string;
    phone: string;
    email: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    operatingHours: string;
  };
  financial: {
    currency: string;
    currencySymbol: string;
    taxName: string;
    taxRatePercent: number;
    taxInclusive: boolean;
  };
  fulfillment: {
    depotPickupEnabled: boolean;
    depotName: string;
    depotAddress: string;
    depotInstructions: string;
    depotPickupFee: number;
    standardShippingFee: number;
    expressShippingFee: number;
    freeShippingThreshold: number | null;
    estimatedStandardTransit: string;
    estimatedExpressTransit: string;
  };
  policies: {
    returnWindowDays: number;
    discretionaryRestockingFeePercent: number;
    warrantyDisclaimer: string;
  };
}

export interface UpdateBusinessSettingsDto {
  company?: Partial<BusinessSettingsDto['company']>;
  financial?: Partial<BusinessSettingsDto['financial']>;
  fulfillment?: Partial<BusinessSettingsDto['fulfillment']>;
  policies?: Partial<BusinessSettingsDto['policies']>;
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  domain: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQueryDto {
  domain?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogPageDto {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GlobalInventoryMovementDto {
  id: string;
  inventoryItemId?: string;
  serializedItemId?: string;
  productId: string;
  productName: string;
  sku: string;
  movementType: InventoryMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  warehouseCode?: string | null;
  createdAt: string;
}

// ===========================================================================
// Phase 14: Notifications & Documents
// ===========================================================================

export type NotificationChannelContract = 'EMAIL' | 'SMS' | 'IN_APP';

export type NotificationStatusContract =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'PERMANENTLY_FAILED';

export type NotificationTypeContract =
  | 'ORDER_CONFIRMATION'
  | 'PAYMENT_STATUS_UPDATE'
  | 'ORDER_DISPATCHED'
  | 'ORDER_READY_FOR_COLLECTION'
  | 'ORDER_CANCELLED'
  | 'RETURN_UPDATE'
  | 'ACCOUNT_WELCOME'
  | 'PASSWORD_RESET';

export type DocumentTypeContract =
  | 'TAX_INVOICE'
  | 'RECEIPT'
  | 'CREDIT_NOTE'
  | 'DISPATCH_NOTE';

export interface NotificationRecordDto {
  id: string;
  channel: NotificationChannelContract;
  type: NotificationTypeContract;
  recipient: string;
  subject: string;
  templateName: string;
  status: NotificationStatusContract;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  sentAt: string | null;
  orderId: string | null;
  customerId: string | null;
  createdAt: string;
}

export interface DocumentRecordDto {
  id: string;
  documentNumber: string;
  orderId: string;
  documentType: DocumentTypeContract;
  fileName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  customerId: string | null;
  createdAt: string;
}

export interface NotificationQueryDto {
  status?: NotificationStatusContract;
  type?: NotificationTypeContract;
  orderId?: string;
  page?: number;
  limit?: number;
}

export interface NotificationPageDto {
  items: NotificationRecordDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===========================================================================
// Phase 15: External Integration Framework
// ===========================================================================

export type IntegrationCapability =
  | 'INVENTORY_SYNC_INBOUND'
  | 'INVENTORY_SYNC_OUTBOUND'
  | 'CATALOG_PUBLISH'
  | 'ORDERS_IMPORT'
  | 'ORDERS_STATUS_UPDATE'
  | 'VEHICLE_FITMENT_QUERY'
  | 'WEBHOOK_INGESTION';

export type IntegrationAccountStatusContract =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'SYNCING'
  | 'ERROR';

export type SyncJobStatusContract =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER';

export type SyncDirectionContract = 'INBOUND' | 'OUTBOUND';

export interface IntegrationAccountDto {
  id: string;
  provider: string;
  name: string;
  environment: string;
  status: IntegrationAccountStatusContract;
  isActive: boolean;
  capabilities: IntegrationCapability[];
  settings: Record<string, unknown> | null;
  hasConfiguredSecrets: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface ConfigureIntegrationSecretsDto {
  credentials: Record<string, string>;
}

export interface UpdateIntegrationAccountDto {
  name?: string;
  environment?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
  capabilities?: IntegrationCapability[];
}

export interface IntegrationSyncJobDto {
  id: string;
  integrationAccountId: string;
  provider: string;
  direction: SyncDirectionContract;
  jobType: string;
  status: SyncJobStatusContract;
  attempts: number;
  maxAttempts: number;
  correlationId: string;
  idempotencyKey: string | null;
  lastError: string | null;
  nextRetryAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ExternalIdMappingDto {
  id: string;
  provider: string;
  entityType: 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER';
  internalId: string;
  externalId: string;
  externalVersion: string | null;
  syncHash: string | null;
  lastSyncedAt: string;
}

export interface CreateExternalMappingDto {
  provider: string;
  entityType: 'PRODUCT' | 'LISTING' | 'CUSTOMER' | 'ORDER';
  internalId: string;
  externalId: string;
  externalVersion?: string;
  syncHash?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookIngestionResultDto {
  received: boolean;
  status: 'PROCESSED' | 'DUPLICATE_IGNORED' | 'INVALID_SIGNATURE' | 'REPLAY_REJECTED' | 'FAILED';
  correlationId: string;
  message?: string;
}
