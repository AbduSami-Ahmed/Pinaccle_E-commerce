'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CategoryDto,
  ProductDto,
  ProductMediaDto,
  ProductStatus,
  ProductType,
  SaleUnitConfigDto,
  SeatBeltComponentType,
  SeatBeltPosition,
  TyreSeason,
  TyreTerrainType,
} from '@pinnacle/contracts';
import {
  createProduct,
  fetchCategories,
  presignMediaUpload,
  updateProduct,
  uploadMediaDirect,
} from '@/lib/catalog';

interface ProductFormProps {
  initialProduct?: ProductDto;
  isEditMode?: boolean;
}

export function ProductForm({ initialProduct, isEditMode = false }: ProductFormProps) {
  const router = useRouter();

  // Categories list
  const [categories, setCategories] = React.useState<CategoryDto[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  // Form State
  const [categoryId, setCategoryId] = React.useState(initialProduct?.categoryId ?? '');
  const [title, setTitle] = React.useState(initialProduct?.title ?? '');
  const [brand, setBrand] = React.useState(initialProduct?.brand ?? '');
  const [sku, setSku] = React.useState(initialProduct?.sku ?? '');
  const [autoGenerateSku, setAutoGenerateSku] = React.useState(!initialProduct?.sku);
  const [oemPartNumber, setOemPartNumber] = React.useState(initialProduct?.oemPartNumber ?? '');
  const [description, setDescription] = React.useState(initialProduct?.description ?? '');
  const [productType, setProductType] = React.useState<ProductType>(
    initialProduct?.productType ?? 'BULK_QUANTITY',
  );
  const [status, setStatus] = React.useState<ProductStatus>(initialProduct?.status ?? 'DRAFT');

  // Commercial / Pricing
  const [basePrice, setBasePrice] = React.useState(
    initialProduct?.saleUnits?.[0]?.retailPrice ?? '150.00',
  );

  // Tyre Specs
  const [sectionWidth, setSectionWidth] = React.useState<number>(
    initialProduct?.tyreSpecification?.sectionWidth ?? 225,
  );
  const [aspectRatio, setAspectRatio] = React.useState<number>(
    initialProduct?.tyreSpecification?.aspectRatio ?? 45,
  );
  const [rimDiameter, setRimDiameter] = React.useState<number>(
    initialProduct?.tyreSpecification?.rimDiameter ?? 17,
  );
  const [loadIndex, setLoadIndex] = React.useState<number>(
    initialProduct?.tyreSpecification?.loadIndex ?? 94,
  );
  const [speedRating, setSpeedRating] = React.useState<string>(
    initialProduct?.tyreSpecification?.speedRating ?? 'Y',
  );
  const [season, setSeason] = React.useState<TyreSeason>(
    initialProduct?.tyreSpecification?.season ?? 'SUMMER',
  );
  const [terrainType, setTerrainType] = React.useState<TyreTerrainType>(
    initialProduct?.tyreSpecification?.terrainType ?? 'HIGHWAY',
  );
  const [runFlat, setRunFlat] = React.useState<boolean>(
    initialProduct?.tyreSpecification?.runFlat ?? false,
  );
  const [extraLoad, setExtraLoad] = React.useState<boolean>(
    initialProduct?.tyreSpecification?.extraLoad ?? true,
  );

  // Seat Belt Specs
  const [position, setPosition] = React.useState<SeatBeltPosition>(
    initialProduct?.seatBeltSpecification?.position ?? 'FRONT_LEFT_DRIVER',
  );
  const [componentType, setComponentType] = React.useState<SeatBeltComponentType>(
    initialProduct?.seatBeltSpecification?.componentType ?? 'RETRACTOR_ASSEMBLY',
  );
  const [pretensionerType, setPretensionerType] = React.useState(
    initialProduct?.seatBeltSpecification?.pretensionerType ?? 'PYROTECHNIC',
  );
  const [webbingColor, setWebbingColor] = React.useState(
    initialProduct?.seatBeltSpecification?.webbingColor ?? 'Black',
  );
  const [mountingPoints, setMountingPoints] = React.useState(
    initialProduct?.seatBeltSpecification?.mountingPoints ?? 3,
  );
  const [oemReferenceTag, setOemReferenceTag] = React.useState(
    initialProduct?.seatBeltSpecification?.oemReferenceTag ?? '',
  );

  // Media
  const [media, setMedia] = React.useState<ProductMediaDto[]>(initialProduct?.media ?? []);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // UI state
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Load Categories on mount
  React.useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats);
      setLoadingCategories(false);
      if (!categoryId && cats.length > 0 && cats[0]) {
        setCategoryId(cats[0].id);
      }
    });
  }, [categoryId]);

  // Unsaved changes guard
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Determine active category slug
  const activeCategory = categories.find((c) => c.id === categoryId);
  const isTyreCategory =
    activeCategory?.slug === 'tyres' || (!activeCategory && categoryId.includes('tyre'));
  const isSeatBeltCategory =
    activeCategory?.slug === 'seat-belts' || (!activeCategory && categoryId.includes('seat-belt'));

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds maximum 10MB limit.`);
        }

        // 1. Authorize upload
        const presign = await presignMediaUpload({
          fileName: file.name,
          fileType: file.type || 'image/jpeg',
          fileSizeBytes: file.size,
        });

        // 2. Read as base64 for direct fallback upload
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        const uploaded = await uploadMediaDirect(
          presign.s3Key,
          base64Data,
          file.type || 'image/jpeg',
        );

        const newMediaItem: ProductMediaDto = {
          s3Key: uploaded.s3Key,
          cdnUrl: uploaded.cdnUrl,
          altText: `${title || 'Product'} photo`,
          displayOrder: media.length,
          isPrimary: media.length === 0,
        };

        setMedia((prev) => [...prev, newMediaItem]);
        markDirty();
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const setPrimaryImage = (index: number) => {
    markDirty();
    setMedia((prev) =>
      prev.map((item, i) => ({
        ...item,
        isPrimary: i === index,
      })),
    );
  };

  const removeImage = (index: number) => {
    markDirty();
    setMedia((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && next[0] && !next.some((m) => m.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next.map((item, i) => ({ ...item, displayOrder: i }));
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    markDirty();
    setMedia((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const currentItem = copy[index];
      const targetItem = copy[targetIndex];
      if (currentItem && targetItem) {
        copy[index] = targetItem;
        copy[targetIndex] = currentItem;
      }
      return copy.map((m, i) => ({ ...m, displayOrder: i }));
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Assemble sale units
      const configuredSaleUnits: SaleUnitConfigDto[] = [
        {
          code: isTyreCategory ? 'TYRE_SINGLE' : 'UNIT',
          name: isTyreCategory ? 'Single Tyre' : 'Single Unit',
          baseQuantityMultiplier: 1,
          retailPrice: basePrice,
          isDefault: true,
          isActive: true,
        },
      ];

      // Add Tyre bundle units if enabled
      if (isTyreCategory) {
        const singleP = parseFloat(basePrice) || 0;
        configuredSaleUnits.push({
          code: 'TYRE_PAIR',
          name: 'Axle Pair (2x)',
          baseQuantityMultiplier: 2,
          retailPrice: (singleP * 2 * 0.98).toFixed(2), // 2% bundle savings
          compareAtPrice: (singleP * 2).toFixed(2),
          isDefault: false,
          isActive: true,
        });
        configuredSaleUnits.push({
          code: 'TYRE_SET_OF_4',
          name: 'Complete Set of 4 (4x)',
          baseQuantityMultiplier: 4,
          retailPrice: (singleP * 4 * 0.95).toFixed(2), // 5% bundle savings
          compareAtPrice: (singleP * 4).toFixed(2),
          isDefault: false,
          isActive: true,
        });
      }

      const payload: any = {
        categoryId,
        title,
        brand,
        oemPartNumber: oemPartNumber || undefined,
        description,
        productType,
        status,
        media,
        saleUnits: configuredSaleUnits,
      };

      if (!autoGenerateSku && sku.trim()) {
        payload.sku = sku.trim();
      }

      if (isTyreCategory) {
        payload.tyreSpecification = {
          sectionWidth: Number(sectionWidth),
          aspectRatio: Number(aspectRatio),
          rimDiameter: Number(rimDiameter),
          loadIndex: Number(loadIndex),
          speedRating: speedRating.toUpperCase(),
          season,
          terrainType,
          runFlat,
          extraLoad,
        };
      } else if (isSeatBeltCategory) {
        payload.seatBeltSpecification = {
          position,
          componentType,
          pretensionerType,
          webbingColor,
          mountingPoints: Number(mountingPoints),
          oemReferenceTag: oemReferenceTag || undefined,
        };
      }

      let savedProduct: ProductDto;
      if (isEditMode && initialProduct) {
        savedProduct = await updateProduct(initialProduct.id, payload);
        setSuccessMessage(`Product "${savedProduct.title}" successfully updated.`);
      } else {
        savedProduct = await createProduct(payload);
        setSuccessMessage(
          `Product "${savedProduct.title}" successfully created (${savedProduct.sku}).`,
        );
      }

      setIsDirty(false);
      setTimeout(() => {
        router.push(`/admin/products/${savedProduct.id}`);
      }, 800);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alert Banners */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="default" className="border-emerald-500 bg-emerald-50 text-emerald-900">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Discard?')) {
                return;
              }
              router.push('/admin/products');
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {isEditMode ? `Edit: ${initialProduct?.title}` : 'Create New Product'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Master catalogue definition. Physical stock balances are maintained separately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting || loadingCategories}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main 2-Column Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Core product attributes and categorization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Category *
                </label>
                <select
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
                  }}
                  disabled={isEditMode}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.slug})
                    </option>
                  ))}
                </select>
                {isEditMode && (
                  <p className="text-xs text-slate-400 mt-1">
                    Category cannot be changed after creation.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Product Title *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Michelin Pilot Sport 5 (225/45 R17)"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Brand / Manufacturer *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Michelin, Continental, Toyota"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Master SKU
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoGenerateSku}
                        onChange={(e) => {
                          setAutoGenerateSku(e.target.checked);
                          markDirty();
                        }}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0"
                      />
                      Auto-generate
                    </label>
                  </div>
                  <Input
                    placeholder={
                      autoGenerateSku ? 'Generated on save...' : 'e.g. TYR-MICH-2254517-PS5'
                    }
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value);
                      markDirty();
                    }}
                    disabled={autoGenerateSku}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    OEM Part Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 73210-42210 or MICH-99201"
                    value={oemPartNumber}
                    onChange={(e) => {
                      setOemPartNumber(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Description *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Comprehensive technical overview, warranty parameters, and vehicle fitment guidelines..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category-Specific Specifications Card */}
          {isTyreCategory && (
            <Card className="border-amber-200 bg-amber-50/20">
              <CardHeader>
                <CardTitle className="text-amber-950 flex items-center gap-2">
                  <span>Tyre Dimensional Specifications</span>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-800">
                    Mandatory for Tyres
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Normalized attributes used for dimensional vehicle matching and regulatory labels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Section Width (mm)
                    </label>
                    <Input
                      type="number"
                      required
                      min={125}
                      max={355}
                      value={sectionWidth}
                      onChange={(e) => {
                        setSectionWidth(Number(e.target.value));
                        markDirty();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Aspect Ratio (%)
                    </label>
                    <Input
                      type="number"
                      required
                      min={20}
                      max={90}
                      value={aspectRatio}
                      onChange={(e) => {
                        setAspectRatio(Number(e.target.value));
                        markDirty();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rim Size (inches)
                    </label>
                    <Input
                      type="number"
                      required
                      min={12}
                      max={24}
                      value={rimDiameter}
                      onChange={(e) => {
                        setRimDiameter(Number(e.target.value));
                        markDirty();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Load Index
                    </label>
                    <Input
                      type="number"
                      required
                      min={60}
                      max={130}
                      value={loadIndex}
                      onChange={(e) => {
                        setLoadIndex(Number(e.target.value));
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Speed Rating
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={speedRating}
                      onChange={(e) => {
                        setSpeedRating(e.target.value);
                        markDirty();
                      }}
                    >
                      {['H', 'V', 'W', 'Y', 'Z', 'T', 'S'].map((r) => (
                        <option key={r} value={r}>
                          {r} (Rating)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Season
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={season}
                      onChange={(e) => {
                        setSeason(e.target.value as TyreSeason);
                        markDirty();
                      }}
                    >
                      <option value="SUMMER">Summer</option>
                      <option value="ALL_SEASON">All Season</option>
                      <option value="WINTER">Winter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Terrain Type
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={terrainType}
                      onChange={(e) => {
                        setTerrainType(e.target.value as TyreTerrainType);
                        markDirty();
                      }}
                    >
                      <option value="HIGHWAY">Highway / Touring</option>
                      <option value="PERFORMANCE">Ultra High Performance</option>
                      <option value="ALL_TERRAIN">All Terrain (A/T)</option>
                      <option value="MUD_TERRAIN">Mud Terrain (M/T)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={runFlat}
                      onChange={(e) => {
                        setRunFlat(e.target.checked);
                        markDirty();
                      }}
                      className="rounded border-slate-300"
                    />
                    Run-Flat Technology
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraLoad}
                      onChange={(e) => {
                        setExtraLoad(e.target.checked);
                        markDirty();
                      }}
                      className="rounded border-slate-300"
                    />
                    Extra Load (XL) Reinforced
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {isSeatBeltCategory && (
            <Card className="border-blue-200 bg-blue-50/20">
              <CardHeader>
                <CardTitle className="text-blue-950 flex items-center gap-2">
                  <span>Seat Belt Safety & Fitment Specifications</span>
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-800">
                    Mandatory for Seat Belts
                  </Badge>
                </CardTitle>
                <CardDescription>
                  ADR compliance and physical installation specifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seating Position *
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={position}
                      onChange={(e) => {
                        setPosition(e.target.value as SeatBeltPosition);
                        markDirty();
                      }}
                    >
                      <option value="FRONT_LEFT_DRIVER">Front Left (Driver - RHD)</option>
                      <option value="FRONT_RIGHT_PASSENGER">Front Right (Passenger - RHD)</option>
                      <option value="REAR_LEFT">Rear Left</option>
                      <option value="REAR_RIGHT">Rear Right</option>
                      <option value="REAR_CENTER">Rear Center</option>
                      <option value="THIRD_ROW_LEFT">Third Row Left</option>
                      <option value="THIRD_ROW_RIGHT">Third Row Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Component Type *
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={componentType}
                      onChange={(e) => {
                        setComponentType(e.target.value as SeatBeltComponentType);
                        markDirty();
                      }}
                    >
                      <option value="RETRACTOR_ASSEMBLY">Retractor Assembly with Webbing</option>
                      <option value="BUCKLE_STALK">Buckle Stalk / Receiver</option>
                      <option value="COMPLETE_ASSEMBLY">Complete Assembly</option>
                      <option value="LAP_BELT">Lap Belt Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pretensioner Type
                    </label>
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                      value={pretensionerType}
                      onChange={(e) => {
                        setPretensionerType(e.target.value as any);
                        markDirty();
                      }}
                    >
                      <option value="PYROTECHNIC">Pyrotechnic Gas Squib</option>
                      <option value="MECHANICAL">Mechanical Inertia</option>
                      <option value="NONE">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Webbing Colour
                    </label>
                    <Input
                      value={webbingColor}
                      onChange={(e) => {
                        setWebbingColor(e.target.value);
                        markDirty();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mounting Points
                    </label>
                    <Input
                      type="number"
                      min={2}
                      max={5}
                      value={mountingPoints}
                      onChange={(e) => {
                        setMountingPoints(Number(e.target.value));
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    OEM Compliance / Tag Reference (Optional)
                  </label>
                  <Input
                    placeholder="e.g. ADR 4/05 compliant tag #44892"
                    value={oemReferenceTag}
                    onChange={(e) => {
                      setOemReferenceTag(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media & Photos Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Media & Inspection Photos</CardTitle>
                  <CardDescription>
                    Multiple product photographs stored securely in object storage.
                  </CardDescription>
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {uploadingImage && (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-600 bg-slate-50 rounded-md mb-4 border border-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                  <span>Processing and uploading image to object storage...</span>
                </div>
              )}

              {media.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <ImageIcon className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-500">No images uploaded yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Upload JPEG, PNG, or WebP files up to 10MB each.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {media.map((item, index) => (
                    <div
                      key={item.s3Key || index}
                      className="relative group border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col justify-between"
                    >
                      <div className="aspect-square bg-slate-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.cdnUrl}
                          alt={item.altText}
                          className="w-full h-full object-cover"
                        />
                        {item.isPrimary && (
                          <div className="absolute top-2 left-2">
                            <Badge
                              variant="default"
                              className="text-[10px] bg-amber-500 text-white"
                            >
                              Primary Hero
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="p-2 border-t bg-slate-50 flex items-center justify-between gap-1">
                        {!item.isPrimary && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-600 px-2"
                            onClick={() => setPrimaryImage(index)}
                          >
                            <Star className="h-3 w-3 mr-1 text-slate-400" />
                            Set Primary
                          </Button>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={index === 0}
                            onClick={() => moveImage(index, 'up')}
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={index === media.length - 1}
                            onClick={() => moveImage(index, 'down')}
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeImage(index)}
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar 1-Column Section */}
        <div className="space-y-6">
          {/* Status & Lifecycle Card */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Catalogue Status
                </label>
                <select
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as ProductStatus);
                    markDirty();
                  }}
                >
                  <option value="DRAFT">DRAFT (Hidden from Store)</option>
                  <option value="PUBLISHED">PUBLISHED (Active on Store)</option>
                  <option value="ARCHIVED">ARCHIVED (Deactivated)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Publishing enforces specification completeness and valid retail pricing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Modality
                </label>
                <select
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value as ProductType);
                    markDirty();
                  }}
                >
                  <option value="BULK_QUANTITY">Bulk Quantity (Tyres / Commodity)</option>
                  <option value="INDIVIDUALLY_SERIALIZED">
                    Individually Serialized (Seat Belts)
                  </option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Commercial Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle>Commercial Pricing</CardTitle>
              <CardDescription>Base sale price and customer multi-pack units.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Single Unit Price ($ AUD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-medium">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    min={0.01}
                    value={basePrice}
                    onChange={(e) => {
                      setBasePrice(e.target.value);
                      markDirty();
                    }}
                    className="pl-7"
                  />
                </div>
              </div>

              {isTyreCategory && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-900">Configured Sale Units:</p>
                  <div className="flex justify-between">
                    <span>Single (1x base):</span>
                    <span className="font-mono">${Number(basePrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pair of 2 (2x base):</span>
                    <span className="font-mono">${(Number(basePrice) * 2 * 0.98).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Set of 4 (4x base):</span>
                    <span className="font-mono">${(Number(basePrice) * 4 * 0.95).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
