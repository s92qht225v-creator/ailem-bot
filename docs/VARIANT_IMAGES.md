# Product Variant Images

## Overview
Each product variant (color + size combination) can now have its own unique image. When customers select a specific variant on the product page, the product image automatically switches to show that variant's image.

## Database Schema

The `products` table's `variants` JSONB column now supports an optional `image` field:

```json
{
  "variants": [
    {
      "color": "Navy Blue",
      "size": "Queen",
      "stock": 15,
      "sku": "NAV-Q",
      "image": "https://your-supabase-url/storage/v1/object/public/product-images/navy-queen.jpg"
    },
    {
      "color": "White",
      "size": "King",
      "stock": 8,
      "sku": "WHI-K",
      "image": "https://your-supabase-url/storage/v1/object/public/product-images/white-king.jpg"
    },
    {
      "color": "Gray",
      "size": "Twin",
      "stock": 20,
      "sku": "GRA-T",
      "image": null
    }
  ]
}
```

### Variant Object Structure
- `color` (string, required): Color name
- `size` (string, required): Size name
- `stock` (number, required): Available quantity
- `sku` (string, required): Stock Keeping Unit (auto-generated)
- `image` (string|null, optional): URL to variant-specific image

**Note:** The `image` field is optional. If `null` or not set, the product will use the default product images.

## Admin Panel Usage

### Adding Variant Images

1. **Edit/Create a Product** in the Admin Panel
2. **Add Colors and Sizes** (e.g., "Navy Blue, White, Gray" and "Twin, Queen, King")
3. **Scroll to Variant Inventory section** - variants are auto-generated
4. **Click the image upload box** next to each variant you want to customize
5. **Upload an image** specific to that color+size combination
6. **Remove images** by clicking the X button on the image thumbnail
7. **Save the product** - variant images are stored with the product

### Features
- **Visual Preview**: See uploaded images directly in the variant list
- **Stock Management**: Manage stock and images for each variant in one place
- **Drag & Drop**: Upload images easily with click-to-upload
- **Image Removal**: Remove variant images with one click
- **Persistence**: Images are preserved when modifying colors/sizes

## Customer Experience

### Product Page Behavior

When customers view a product with variant images:

1. **Initial Load**: Shows the default product image
2. **Select Color/Size**: Image automatically switches to the variant's image (if set)
3. **No Variant Image**: Falls back to default product images
4. **Image Gallery**: Variant image appears first, followed by other product images
5. **Smooth Transition**: Images reset to the first when variant changes

### Example Flow
```
Customer on Product Page:
1. Default view: Shows product.images[0]
2. Selects "Navy Blue" + "Queen" → Shows navy-queen.jpg
3. Selects "White" + "King" → Shows white-king.jpg
4. Selects "Gray" + "Twin" → Shows product.images[0] (no custom image)
```

## Technical Implementation

### Frontend Components

#### 1. **ProductDetails.jsx**
- Detects selected color+size combination
- Finds matching variant with `findVariant()`
- Prepends variant image to product images array
- Auto-resets to first image on variant change

#### 2. **DesktopAdminPanel.jsx**
- Image upload for each variant
- Visual preview with thumbnail
- Stock and image management in one UI
- Preserves images when colors/sizes change

### Utilities (`src/utils/variants.js`)

#### New Functions
- `updateVariantImage(variants, color, size, imageUrl)` - Update specific variant's image
- `generateVariants()` - Now includes `image: null` in generated variants
- `mergeVariants()` - Preserves both stock and images when merging

## Best Practices

### Image Guidelines
- **Resolution**: 800x800px or higher for best quality
- **Aspect Ratio**: 1:1 (square) recommended
- **Format**: JPG or PNG
- **Size**: Under 2MB per image
- **Content**: Show the actual color/style of that specific variant

### When to Use Variant Images
✅ **Use when:**
- Colors are significantly different visually
- Different patterns or designs per variant
- Material/texture varies by variant
- Size affects appearance (e.g., king vs twin bed set)

❌ **Skip when:**
- Only size differs (same color/design)
- Minor shade variations
- Generic stock photos
- Same product, different packaging only

### Storage Management
- Variant images are stored in Supabase Storage (`product-images` bucket)
- Old images are NOT auto-deleted when changed (manual cleanup needed)
- Consider implementing image cleanup when products are deleted

## Migration Guide

### Existing Products
Existing products without variant images will continue to work normally:
- Old variants (without `image` field) → Use default product images
- No code changes needed
- Backward compatible

### Adding Images to Existing Products
1. Open product in Admin Panel → Edit
2. Variant list shows all existing variants
3. Add images to desired variants
4. Save product

## API Changes

### Storage API
Uses existing `storageAPI.uploadProductImage(file)` method:
```javascript
const result = await storageAPI.uploadProductImage(file);
// result.url → "https://..."
```

### Products API
No changes needed - variants are stored as JSONB in the `products` table:
```javascript
await productsAPI.update(productId, {
  variants: [
    { color: 'Blue', size: 'Large', stock: 10, sku: 'BLU-L', image: 'https://...' }
  ]
});
```

## Troubleshooting

### Variant image not showing on product page
- ✅ Check that image URL is valid
- ✅ Verify both color AND size are selected
- ✅ Ensure image field is not null in database
- ✅ Check browser console for image load errors

### Image upload failing
- ✅ Check file size (< 5MB recommended)
- ✅ Verify file is an image format (jpg, png, gif, webp)
- ✅ Check Supabase Storage permissions
- ✅ Ensure bucket 'product-images' is public

### Images not preserved when editing
- ✅ Don't remove and re-add colors/sizes - edit in place
- ✅ Save product after uploading images
- ✅ Check browser console for save errors

## Future Enhancements

Potential improvements for future versions:
- [ ] Bulk image upload for multiple variants
- [ ] Image optimization/compression on upload
- [ ] Automatic image cleanup on variant deletion
- [ ] Image reordering within variant
- [ ] Multiple images per variant (gallery)
- [ ] AI-based variant image suggestions
- [ ] CDN integration for faster loading

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Supabase connection and permissions
3. Review this documentation
4. Check the WARP.md file for project-specific guidance
