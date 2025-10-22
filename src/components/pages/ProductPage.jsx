import { ArrowLeft } from 'lucide-react';
import ProductDetails from '../product/ProductDetails';
import ReviewSection from '../product/ReviewSection';
import RelatedProducts from '../product/RelatedProducts';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';

const ProductPage = ({ productId, onNavigate }) => {
  const { getProductById, selectedCategory } = useProducts();
  const { addToCart } = useCart();
  const product = getProductById(productId);

  const handleBackToShop = () => {
    onNavigate('shop', { category: selectedCategory });
  };

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-500 mb-4">Product not found</p>
        <button
          onClick={handleBackToShop}
          className="text-accent font-semibold hover:underline"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const handleAddToCart = (product, quantity, color, size) => {
    addToCart(product, quantity, color, size);
    alert('Product added to cart!');
  };

  return (
    <div className="pb-20">
      {/* Back Button */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <button
          onClick={handleBackToShop}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back</span>
        </button>
      </div>

      {/* Product Details */}
      <ProductDetails product={product} onAddToCart={handleAddToCart} />

      {/* Review Section */}
      <ReviewSection product={product} />

      {/* Related Products */}
      <RelatedProducts currentProduct={product} onNavigate={onNavigate} />
    </div>
  );
};

export default ProductPage;
