import { useState, useEffect } from 'react';
import ProductDetails from '../product/ProductDetails';
import ReviewSection from '../product/ReviewSection';
import RelatedProducts from '../product/RelatedProducts';
import { useProducts } from '../../hooks/useProducts';
import { useToast } from '../../context/ToastContext';
import { useCart } from '../../hooks/useCart';
import { useBackButton } from '../../hooks/useBackButton';
import { productsAPI } from '../../services/api';

const ProductPage = ({ productId, onNavigate }) => {
  const { getProductById, selectedCategory } = useProducts();
  const { addToCart } = useCart();
  const toast = useToast();
  const baseProduct = getProductById(productId);
  const [fullProduct, setFullProduct] = useState(null);

  // Fetch full product data (description, images, a_plus_content) on mount
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    productsAPI.getById(productId).then(data => {
      if (!cancelled) setFullProduct(data);
    }).catch(err => {
      console.error('Failed to load full product:', err);
    });

    return () => { cancelled = true; };
  }, [productId]);

  // Merge: use full product when loaded, fall back to lightweight base
  const product = fullProduct || baseProduct;

  // Dynamic title for SEO
  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} — Ailem`;
    }
    return () => { document.title = 'Ailem — Uy tekstillari | ailem.uz'; };
  }, [product?.name]);

  const handleBackToShop = () => {
    onNavigate('shop', { category: selectedCategory });
  };

  // Use native Telegram BackButton
  useBackButton(handleBackToShop);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">Mahsulot topilmadi</p>
        <button
          onClick={handleBackToShop}
          className="text-accent font-semibold hover:underline"
        >
          Do'konga qaytish
        </button>
      </div>
    );
  }

  const handleAddToCart = (product, quantity, color, size, variantPrice = null) => {
    addToCart(product, quantity, color, size, variantPrice);
    toast.success('Mahsulot savatga qo\'shildi!');
  };

  return (
    <div className="pb-20 lg:pb-8">
      {/* Product Details */}
      <ProductDetails product={product} onAddToCart={handleAddToCart} onNavigate={onNavigate} />

      {/* Review Section */}
      <ReviewSection product={product} />

      {/* Related Products */}
      <RelatedProducts currentProduct={product} onNavigate={onNavigate} />
    </div>
  );
};

export default ProductPage;
