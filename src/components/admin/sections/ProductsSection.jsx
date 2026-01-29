import { useState, useContext, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { marked } from 'marked';
import {
  Edit, Trash2, Plus, ChevronRight, Upload, AlertTriangle, X, Download, Search, ImagePlus
} from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { formatPrice } from '../../../utils/helpers';
import { updateVariantStock, updateVariantImage, updateVariantPrice, getTotalVariantStock } from '../../../utils/variants';
import { storageAPI } from '../../../services/api';
import { exportProducts } from '../../../utils/csvExport';
import { notifyProductBackInStock } from '../../../services/stockNotifications';
import APlusEditor from '../shared/APlusEditor';

// Configure marked for proper line breaks
marked.setOptions({
  breaks: true,
  gfm: true
});

const ProductsSection = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useContext(AdminContext);
  const toast = useToast();
  const confirm = useConfirm();

  // Form state - all managed internally now
  const [allImages, setAllImages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    imageUrl: '',
    additionalImages: '',
    category: 'Bedsheets',
    weight: '',
    stock: '',
    badge: '',
    material: '',
    colors: '',
    sizes: '',
    tags: '',
    barcode: '',
    inStock: true,
    variants: [],
    volume_pricing: null,
    aPlusContent: null
  });

  // Other local state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Filtered products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products.filter(product => {
      const matchesSearch = !searchQuery ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !categoryFilter || product.category === categoryFilter;

      let matchesStock = true;
      if (stockFilter) {
        const stock = product.variants && product.variants.length > 0
          ? getTotalVariantStock(product.variants)
          : (product.stock || 0);

        switch (stockFilter) {
          case 'in_stock':
            matchesStock = stock > 10;
            break;
          case 'low_stock':
            matchesStock = stock > 0 && stock <= 10;
            break;
          case 'out_of_stock':
            matchesStock = stock === 0;
            break;
          default:
            matchesStock = true;
        }
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);

  // Get all existing tags from products for auto-suggest
  const allExistingTags = useMemo(() => {
    const tags = new Set();
    products.forEach(product => {
      if (product.tags) {
        product.tags.forEach(tag => tags.add(tag.toLowerCase()));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  // Handle tag input and suggestions
  const handleTagInput = (value) => {
    setFormData({ ...formData, tags: value });
    const tags = value.split(',');
    const currentTag = tags[tags.length - 1].trim().toLowerCase();

    if (currentTag.length >= 2) {
      const suggestions = allExistingTags.filter(tag =>
        tag.includes(currentTag) && !tags.slice(0, -1).map(t => t.trim().toLowerCase()).includes(tag)
      ).slice(0, 5);
      setTagSuggestions(suggestions);
      setShowTagSuggestions(suggestions.length > 0);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const selectTagSuggestion = (tag) => {
    const tags = formData.tags.split(',').map(t => t.trim());
    tags[tags.length - 1] = tag;
    setFormData({ ...formData, tags: tags.join(', ') + ', ' });
    setShowTagSuggestions(false);
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Mahsulot nomi kiritilishi shart';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Narx kiritilishi shart';
    }

    if (formData.salePrice && parseFloat(formData.salePrice) >= parseFloat(formData.price)) {
      errors.salePrice = 'Chegirma narxi asosiy narxdan kam bo\'lishi kerak';
    }

    if (!formData.category) {
      errors.category = 'Kategoriya tanlanishi shart';
    }

    if (!formData.tags.trim()) {
      errors.tags = 'Kamida bitta teg kiritilishi shart';
    }

    const hasVariants = formData.variants && formData.variants.length > 0;
    if (!hasVariants && (!formData.stock || parseInt(formData.stock) < 0)) {
      errors.stock = 'Ombor miqdori kiritilishi shart';
    }

    if (allImages.length === 0) {
      errors.images = 'Kamida bitta rasm yuklanishi shart';
    }

    if (hasVariants) {
      const variantKeys = formData.variants.map(v => `${v.color}-${v.size}`);
      const uniqueKeys = new Set(variantKeys);
      if (variantKeys.length !== uniqueKeys.size) {
        errors.variants = 'Takroriy variantlar mavjud';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add image via URL
  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
      try {
        new URL(imageUrl);
        setAllImages(prev => [...prev, imageUrl.trim()]);
        setImageUrl('');
        setShowUrlInput(false);
      } catch {
        toast.error('Noto\'g\'ri URL manzili');
      }
    }
  };

  // Multi-image upload
  const handleMultiImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);

    try {
      const maxFileSize = 5 * 1024 * 1024;
      let uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          if (file.size > maxFileSize) {
            toast.error(`${file.name} juda katta (max 5MB)`);
            continue;
          }

          const result = await storageAPI.uploadProductImage(file);
          setAllImages(prev => [...prev, result.url]);
          uploadedCount++;

          if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.name}:`, uploadError);
          toast.error(`${file.name} yuklashda xatolik`);
        }
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} ta rasm yuklandi`);
      }
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      toast.error(`Rasm yuklashda xatolik: ${error.message}`);
    } finally {
      setUploadingImage(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setAllImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleMoveImage = (fromIndex, toIndex) => {
    setAllImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      if (!addProduct || !updateProduct) {
        toast.error('Tizim tayyor emas. Iltimos, biroz kuting va qayta urinib ko\'ring.');
        return;
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.salePrice || formData.price),
        originalPrice: formData.salePrice ? parseFloat(formData.price) : null,
        category: formData.category,
        imageUrl: allImages[0],
        images: allImages,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        stock: parseInt(formData.stock) || 0,
        badge: formData.badge || null,
        material: formData.material,
        colors: formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [],
        sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [],
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [],
        variants: formData.variants || [],
        volume_pricing: formData.volume_pricing && formData.volume_pricing.length > 0 ? formData.volume_pricing : null,
        barcode: formData.barcode || null,
        aPlusContent: formData.aPlusContent || null
      };

      if (editingProduct) {
        const oldStock = editingProduct.stock || 0;
        const newStock = productData.stock || 0;
        const stockIncreased = oldStock === 0 && newStock > 0;

        const variantsToNotify = [];
        if (productData.variants && productData.variants.length > 0) {
          productData.variants.forEach((newVariant) => {
            const oldVariant = editingProduct.variants?.find(
              v => v.color === newVariant.color && v.size === newVariant.size
            );
            const oldVarStock = oldVariant?.stock || 0;
            const newVarStock = newVariant.stock || 0;

            if (oldVarStock === 0 && newVarStock > 0) {
              variantsToNotify.push({
                color: newVariant.color,
                size: newVariant.size
              });
            }
          });
        }

        await updateProduct(editingProduct.id, productData);

        if (stockIncreased || variantsToNotify.length > 0) {
          const productWithId = { ...productData, id: editingProduct.id };
          (async () => {
            try {
              if (stockIncreased && (!productData.variants || productData.variants.length === 0)) {
                await notifyProductBackInStock(productWithId);
              }
              for (const variant of variantsToNotify) {
                await notifyProductBackInStock(productWithId, variant.color, variant.size);
              }
            } catch (error) {
              console.error('❌ Failed to send stock notifications:', error);
            }
          })();
        }
      } else {
        await addProduct(productData);
      }

      toast.success(editingProduct ? 'Mahsulot yangilandi' : 'Mahsulot qo\'shildi');

      setShowForm(false);
      setEditingProduct(null);
      setAllImages([]);
      setFormErrors({});

      setFormData({
        name: '',
        description: '',
        price: '',
        salePrice: '',
        imageUrl: '',
        additionalImages: '',
        category: '',
        weight: '',
        stock: '',
        badge: '',
        material: '',
        colors: '',
        sizes: '',
        tags: '',
        inStock: true,
        variants: [],
        volume_pricing: null,
        aPlusContent: null
      });
    } catch (error) {
      console.error('❌ Failed to save product:', error);
      toast.error(`Mahsulotni saqlashda xatolik: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const productImages = product.images || [product.image || product.imageUrl];
    setAllImages(productImages.filter(url => url));

    let description = product.description || '';
    if (description && (description.includes('**') || description.includes('*') || description.includes('- ') || description.includes('\n'))) {
      description = marked.parse(description);
    }

    setFormData({
      name: product.name || '',
      description: description,
      price: product.originalPrice ? product.originalPrice.toString() : product.price.toString(),
      salePrice: product.originalPrice ? product.price.toString() : '',
      imageUrl: product.image || product.imageUrl,
      additionalImages: product.images ? product.images.slice(1).join(', ') : '',
      category: product.category,
      weight: product.weight ? product.weight.toString() : '',
      stock: product.stock ? product.stock.toString() : '',
      badge: product.badge || '',
      material: product.material || '',
      colors: product.colors ? product.colors.join(', ') : '',
      sizes: product.sizes ? product.sizes.join(', ') : '',
      tags: product.tags ? product.tags.join(', ') : '',
      barcode: product.barcode || '',
      inStock: product.inStock !== false,
      variants: product.variants || [],
      volume_pricing: product.volume_pricing || null,
      aPlusContent: product.aPlusContent || null
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    const confirmed = await confirm({
      title: 'Mahsulotni o\'chirish',
      message: 'Ushbu mahsulotni o\'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo\'lmaydi.',
      type: 'danger',
      confirmText: 'O\'chirish',
      cancelText: 'Bekor qilish'
    });
    if (confirmed) {
      try {
        await deleteProduct(productId);
        toast.success('Mahsulot muvaffaqiyatli o\'chirildi');
      } catch (error) {
        console.error('❌ Failed to delete product:', error);
        toast.error('Mahsulotni o\'chirishda xatolik. Qayta urinib ko\'ring.');
      }
    }
  };

  const handleColorsOrSizesChange = (field, value) => {
    const updatedFormData = { ...formData, [field]: value };

    const colors = updatedFormData.colors ? updatedFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
    const sizes = updatedFormData.sizes ? updatedFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

    if (colors.length === 0 && sizes.length === 0) {
      updatedFormData.variants = [];
      setFormData(updatedFormData);
      return;
    }

    if (colors.length > 0 && sizes.length > 0) {
      const newVariants = [];

      colors.forEach((color) => {
        sizes.forEach((size) => {
          const existing = formData.variants.find(v =>
            v.color?.toLowerCase() === color.toLowerCase() &&
            v.size?.toLowerCase() === size.toLowerCase()
          );

          newVariants.push({
            color: color,
            size: size,
            stock: existing?.stock || 0,
            price: existing?.price || null,
            image: existing?.image || null,
            sku: `${color.substring(0, 3).toUpperCase()}-${size.substring(0, 1).toUpperCase()}`
          });
        });
      });

      updatedFormData.variants = newVariants;
    } else {
      updatedFormData.variants = [];
    }

    setFormData(updatedFormData);
  };

  const handleVariantStockChange = (color, size, newStock) => {
    const updatedVariants = updateVariantStock(formData.variants, color, size, parseInt(newStock) || 0);
    setFormData({ ...formData, variants: updatedVariants });
  };

  const handleVariantPriceChange = (color, size, newPrice) => {
    const updatedVariants = updateVariantPrice(formData.variants, color, size, parseFloat(newPrice) || 0);
    setFormData({ ...formData, variants: updatedVariants });
  };

  const handleVariantBarcodeChange = (color, size, barcode) => {
    const updatedVariants = formData.variants.map(v => {
      if (v.color?.toLowerCase() === color.toLowerCase() && v.size?.toLowerCase() === size.toLowerCase()) {
        return { ...v, barcode: barcode || null };
      }
      return v;
    });
    setFormData({ ...formData, variants: updatedVariants });
  };

  const handleVariantImageChange = (color, size, imageUrl) => {
    const updatedVariants = updateVariantImage(formData.variants, color, size, imageUrl);
    setFormData({ ...formData, variants: updatedVariants });
  };

  const handleVariantImageUpload = async (color, size, file) => {
    if (!file) return;

    try {
      const result = await storageAPI.uploadProductImage(file);
      handleVariantImageChange(color, size, result.url);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Variant rasmini yuklashda xatolik: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Mahsulotlarni boshqarish</h3>
          <p className="text-gray-600">Katalogda {products.length} ta mahsulot</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportProducts(products)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV yuklash
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Mahsulot qo'shish
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold">
              {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingProduct(null);
                setAllImages([]);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mahsulot nomi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Masalan: Choyshablar to'plami"
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tavsif</label>
                <ReactQuill
                  theme="snow"
                  value={formData.description || ''}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                  formats={['bold', 'italic', 'underline', 'list', 'bullet']}
                  placeholder="Mahsulot haqida batafsil ma'lumot..."
                  className="bg-white rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Masalan: Paxta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ranglar</label>
                <input
                  type="text"
                  value={formData.colors}
                  onChange={(e) => handleColorsOrSizesChange('colors', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Oq, Qora, Ko'k (vergul bilan ajratilgan)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">O'lchamlar</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) => handleColorsOrSizesChange('sizes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Kichik, O'rta, Katta (vergul bilan ajratilgan)"
                />
              </div>

              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Teglar *</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => {
                    handleTagInput(e.target.value);
                    if (formErrors.tags) setFormErrors({ ...formErrors, tags: null });
                  }}
                  onFocus={() => {
                    if (tagSuggestions.length > 0) setShowTagSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowTagSuggestions(false), 200);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.tags ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="choyshablar, paxta, hashamatli, yumshoq (vergul bilan ajratilgan)"
                />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {tagSuggestions.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectTagSuggestion(tag)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                {formErrors.tags && <p className="text-red-500 text-xs mt-1">{formErrors.tags}</p>}
                <p className="text-xs text-gray-500 mt-1">Teglar qidiruv uchun ishlatiladi - kalit so'zlarni vergul bilan ajrating</p>
              </div>
            </div>

            {/* Pricing and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narxi (UZS) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (formErrors.price) setFormErrors({ ...formErrors, price: null });
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.price ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chegirma narxi (UZS)</label>
              <input
                type="number"
                value={formData.salePrice}
                onChange={(e) => {
                  setFormData({ ...formData, salePrice: e.target.value });
                  if (formErrors.salePrice) setFormErrors({ ...formErrors, salePrice: null });
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.salePrice ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {formErrors.salePrice && <p className="text-red-500 text-xs mt-1">{formErrors.salePrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategoriya *</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value });
                  if (formErrors.category) setFormErrors({ ...formErrors, category: null });
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="">Kategoriyani tanlang</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
            </div>

            {(!formData.variants || formData.variants.length === 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ombor miqdori *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => {
                    setFormData({ ...formData, stock: e.target.value });
                    if (formErrors.stock) setFormErrors({ ...formErrors, stock: null });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${formErrors.stock ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
                {formErrors.stock && <p className="text-red-500 text-xs mt-1">{formErrors.stock}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vazni</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Masalan: 1.5"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">kg</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Belgisi</label>
              <select
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="">Yo'q</option>
                <option value="BEST SELLER">ENG KO'P SOTILGAN</option>
                <option value="NEW ARRIVAL">YANGI KELDI</option>
                <option value="SALE">CHEGIRMA</option>
                <option value="LIMITED">CHEKLANGAN</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shtrix-kod (Barcode)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                placeholder="Masalan: 4750001234567"
              />
              <p className="text-xs text-gray-500 mt-1">Kassir skaneri uchun mahsulot shtrix-kodi</p>
            </div>

            {/* Variant Stock Management */}
            {formData.variants.length > 0 && (
              <div className={`md:col-span-2 border-2 rounded-lg p-4 ${formErrors.variants ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-sm font-bold ${formErrors.variants ? 'text-red-900' : 'text-blue-900'}`}>
                    Variant inventarizatsiyasi ({formData.variants.length} ta variant)
                  </label>
                  <span className={`text-xs font-medium ${formErrors.variants ? 'text-red-700' : 'text-blue-700'}`}>
                    Jami: {getTotalVariantStock(formData.variants)} dona
                  </span>
                </div>
                {formErrors.variants && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {formErrors.variants}
                  </div>
                )}
                <p className={`text-xs mb-3 ${formErrors.variants ? 'text-red-700' : 'text-blue-700'}`}>
                  Har bir rang + o'lcham kombinatsiyasi uchun miqdorni kiriting
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {formData.variants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 bg-white p-3 rounded border hover:border-red-300 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {variant.image ? (
                          <div className="relative w-16 h-16 rounded overflow-hidden border-2 border-red-300">
                            <img
                              src={variant.image}
                              alt={`${variant.color} - ${variant.size}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleVariantImageChange(variant.color, variant.size, null)}
                              className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                              title="Rasmni o'chirish"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
                            <ImagePlus className="w-6 h-6 text-gray-400" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files[0] && handleVariantImageUpload(variant.color, variant.size, e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-medium mb-2">
                          <span className="text-gray-900">{variant.color}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-900">{variant.size}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-12">Narxi:</span>
                            <input
                              type="number"
                              min="0"
                              value={variant.price || ''}
                              onChange={(e) => handleVariantPriceChange(variant.color, variant.size, e.target.value)}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              placeholder={formData.salePrice || formData.price || '0'}
                            />
                            <span className="text-xs text-gray-400">UZS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-12">Ombor:</span>
                            <input
                              type="number"
                              min="0"
                              value={variant.stock}
                              onChange={(e) => handleVariantStockChange(variant.color, variant.size, e.target.value)}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-400">dona</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-12">Shtrix:</span>
                            <input
                              type="text"
                              value={variant.barcode || ''}
                              onChange={(e) => handleVariantBarcodeChange(variant.color, variant.size, e.target.value)}
                              className="w-28 px-2 py-1 border rounded text-sm font-mono"
                              placeholder="Shtrix-kod"
                            />
                          </div>
                        </div>
                        {variant.image && (
                          <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                            <ImagePlus className="w-3 h-3" />
                            Maxsus rasm o'rnatilgan
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    💡 <strong>Eslatma:</strong> Har bir variant uchun alohida narx va ombor miqdorini belgilashingiz mumkin.
                    Agar narx bo'sh qoldirilsa, asosiy narx ishlatiladi.
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mahsulot rasmlari * {allImages.length > 0 && <span className="text-gray-500 font-normal">({allImages.length} ta rasm)</span>}
              </label>

              {formErrors.images && (
                <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {formErrors.images}
                </div>
              )}

              {allImages.length > 0 && (
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {allImages.map((imgUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                        <img
                          src={imgUrl}
                          alt={`Mahsulot ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EXato%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-accent text-white text-xs px-2 py-1 rounded font-medium">
                          Asosiy
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, index - 1)}
                            className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Chapga ko'chirish"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                          </button>
                        )}
                        {index < allImages.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, index + 1)}
                            className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="O'ngga ko'chirish"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"
                          title="Rasmni o'chirish"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <label className={`flex-1 min-w-[200px] bg-gradient-to-r from-accent to-red-700 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 ${uploadingImage ? 'opacity-50 cursor-wait' : ''}`}>
                  <Upload className="w-5 h-5" />
                  <span>{uploadingImage ? 'Yuklanmoqda...' : (allImages.length === 0 ? 'Rasmlarni yuklash' : 'Rasm qo\'shish')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMultiImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ImagePlus className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">URL orqali</span>
                </button>
              </div>

              {showUrlInput && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Rasm URL manzilini kiriting..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Qo'shish
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlInput(false);
                      setImageUrl('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Bekor
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                {allImages.length === 0 ? 'Kamida bitta rasm yuklang. ' : ''}
                Birinchi rasm asosiy mahsulot rasmi bo'ladi. Tartibni o'zgartirish uchun strelkalarni bosing.
              </p>
            </div>

            </div>

            {/* Volume Pricing Section */}
            <div className="md:col-span-2 border-t border-gray-200 pt-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-green-900">
                    Hajmli narxlash (Volume Discounts)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newTier = {
                        min_qty: formData.volume_pricing?.length > 0
                          ? (formData.volume_pricing[formData.volume_pricing.length - 1].max_qty || 0) + 1
                          : 2,
                        max_qty: null,
                        price: parseFloat(formData.salePrice || formData.price) || 0
                      };
                      setFormData({
                        ...formData,
                        volume_pricing: [...(formData.volume_pricing || []), newTier]
                      });
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Daraja qo'shish
                  </button>
                </div>

                <p className="text-xs text-green-700 mb-4">
                  Ko'p miqdorda xarid qilgan xaridorlar uchun maxsus narxlarni belgilang
                </p>

                {formData.volume_pricing && formData.volume_pricing.length > 0 ? (
                  <div className="space-y-3">
                    {formData.volume_pricing
                      .sort((a, b) => a.min_qty - b.min_qty)
                      .map((tier, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-green-200 flex items-center gap-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Min miqdor
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={tier.min_qty}
                              onChange={(e) => {
                                const updated = [...(formData.volume_pricing || [])];
                                updated[index].min_qty = parseInt(e.target.value) || 1;
                                setFormData({ ...formData, volume_pricing: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max miqdor
                            </label>
                            <input
                              type="number"
                              min={tier.min_qty}
                              value={tier.max_qty || ''}
                              onChange={(e) => {
                                const updated = [...(formData.volume_pricing || [])];
                                updated[index].max_qty = e.target.value ? parseInt(e.target.value) : null;
                                setFormData({ ...formData, volume_pricing: updated });
                              }}
                              placeholder="Cheksiz"
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Har bir narxi (UZS)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={tier.price}
                              onChange={(e) => {
                                const updated = [...(formData.volume_pricing || [])];
                                updated[index].price = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, volume_pricing: updated });
                              }}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.volume_pricing.filter((_, i) => i !== index);
                            setFormData({ ...formData, volume_pricing: updated.length > 0 ? updated : null });
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                          title="Darajani o'chirish"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <div className="bg-red-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-900 mb-2">📊 Ko'rinish:</p>
                      <div className="text-xs text-blue-800 space-y-1">
                        {formData.volume_pricing
                          .sort((a, b) => a.min_qty - b.min_qty)
                          .map((tier, idx) => (
                          <div key={idx}>
                            • {tier.min_qty}{tier.max_qty ? `-${tier.max_qty}` : '+'} dona: har biri {formatPrice(tier.price)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    <p className="mb-2">Hozircha hajmli narxlash yo'q</p>
                    <p className="text-xs">Yuqoridagi "Daraja qo'shish" tugmasini bosing</p>
                  </div>
                )}
              </div>
            </div>

            {/* A+ Content Section */}
            <div className="md:col-span-2">
              <div className="border border-gray-200 rounded-lg p-4">
                <APlusEditor
                  value={formData.aPlusContent}
                  onChange={(value) => setFormData({ ...formData, aPlusContent: value })}
                />
              </div>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className={`bg-accent hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${submitting ? 'opacity-50 cursor-wait' : ''}`}
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {submitting ? 'Saqlanmoqda...' : (editingProduct ? 'Yangilash' : 'Qo\'shish')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setAllImages([]);
                  setFormErrors({});
                }}
                className={`bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">Barcha kategoriyalar</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">Ombor holati</option>
              <option value="in_stock">Mavjud (10+)</option>
              <option value="low_stock">Kam qolgan (1-10)</option>
              <option value="out_of_stock">Tugagan</option>
            </select>
          </div>

          {(searchQuery || categoryFilter || stockFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setStockFilter('');
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Tozalash
            </button>
          )}
        </div>

        <div className="mt-3 text-sm text-gray-600">
          {filteredProducts.length} ta mahsulot topildi
          {filteredProducts.length !== products.length && ` (jami: ${products.length})`}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mahsulot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategoriya</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narxi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ombor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg mr-4"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</div>
                    {product.originalPrice && (
                      <div className="text-sm text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const displayStock = product.variants && product.variants.length > 0
                        ? getTotalVariantStock(product.variants)
                        : (product.stock || 0);

                      return (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          displayStock > 10 ? 'bg-green-100 text-green-800' :
                          displayStock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {displayStock} dona
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const displayStock = product.variants && product.variants.length > 0
                        ? getTotalVariantStock(product.variants)
                        : (product.stock || 0);

                      return (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          displayStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {displayStock > 0 ? 'Mavjud' : 'Tugagan'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-accent hover:text-red-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductsSection;
