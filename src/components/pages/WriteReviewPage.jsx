import { useState, useContext } from 'react';
import { t } from "../../utils/translation-fallback";
import { Star, Camera, X } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';
import { useBackButton } from '../../hooks/useBackButton';
import { useToast } from '../../context/ToastContext';

const WriteReviewPage = ({ onNavigate, pageData }) => {
  const { user } = useContext(UserContext);
  const { addReview } = useContext(AdminContext);
  const toast = useToast();

  // Use native Telegram BackButton
  useBackButton(() => onNavigate('myReviews'));

  const { productId, orderId, productName, productImage } = pageData || {};

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (reviewImages.length + validFiles.length > 5) {
      toast.warning('Maksimal 5 ta rasm yuklash mumkin');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Import storageAPI
      const { storageAPI } = await import('../../services/api');
      
      // Upload each file and get permanent URLs
      const uploadPromises = validFiles.map(async (file) => {
        const result = await storageAPI.uploadProductImage(file);
        return result.url;
      });

      const newUrls = await Promise.all(uploadPromises);
      
      // Add preview URLs for UI
      const previewUrls = validFiles.map(file => URL.createObjectURL(file));
      setReviewImages([...reviewImages, ...previewUrls]);
      
      // Store permanent URLs
      setUploadedImageUrls([...uploadedImageUrls, ...newUrls]);
      
      console.log('✅ Images uploaded successfully:', newUrls);
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      toast.error('Rasm yuklanmadi. Qayta urinib ko\'ring.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(reviewImages[index]);
    setReviewImages(reviewImages.filter((_, i) => i !== index));
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.warning('Iltimos, baho bering');
      return;
    }

    if (!comment.trim() || comment.trim().length < 10) {
      toast.warning('Sharh kamida 10 ta belgi bo\'lishi kerak');
      return;
    }

    setIsSubmitting(true);

    const review = {
      userId: user.id,
      userName: user.name,
      productId,
      orderId,
      rating,
      comment: comment.trim(),
      images: uploadedImageUrls, // Use permanent Supabase URLs
      date: new Date().toISOString().split('T')[0],
      verified: true, // This is a verified purchase
      approved: false // Needs admin approval
    };

    addReview(productId, review);

    // Revoke object URLs to free memory
    reviewImages.forEach(url => URL.revokeObjectURL(url));

    toast.success('Sharh yuborildi! Admin tasdiqlashidan keyin ko\'rinadi.');
    onNavigate('myReviews');
  };

  if (!productId) {
    return (
      <div className="pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Noto'g'ri so'rov</p>
          <button
            onClick={() => onNavigate('profile')}
            className="text-accent font-semibold hover:underline"
          >
            Profilga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Sharh yozish</h1>
      </div>

      {/* Content */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <img
                src={productImage}
                alt={productName}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div>
                <p className="font-semibold text-gray-900">{productName}</p>
                <p className="text-sm text-gray-500">Buyurtma #{orderId}</p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Mahsulotni baholang
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600 mt-3">
                {rating === 1 && 'Yomon'}
                {rating === 2 && 'Qoniqarli'}
                {rating === 3 && 'Yaxshi'}
                {rating === 4 && 'Juda yaxshi'}
                {rating === 5 && 'Ajoyib'}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Sharhingizni yozing
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Mahsulot haqidagi tajribangizni baham ko'ring..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Kamida 10 ta belgi ({comment.length}/10)
            </p>
          </div>

          {/* Image Upload Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              <Camera className="w-4 h-4 inline mr-1" />
              Rasm qo'shish (ixtiyoriy, max 5)
            </label>

            {/* File Input Button */}
            {reviewImages.length < 5 && (
              <label className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg font-semibold transition-colors border-2 border-dashed border-gray-300 mb-3 ${
                isUploadingImage 
                  ? 'bg-gray-200 text-gray-500 cursor-wait' 
                  : 'bg-gray-100 text-gray-700 cursor-pointer hover:bg-gray-200'
              }`}>
                <Camera className="w-5 h-5" />
                <span>{isUploadingImage ? 'Yuklanmoqda...' : 'Rasm olish yoki Galereyadan tanlash'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploadingImage}
                />
              </label>
            )}

            {/* Image Preview */}
            {reviewImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {reviewImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img}
                      alt={`Review ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reviewImages.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {reviewImages.length}/5 rasm qo'shildi
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || comment.length < 10}
            className="w-full bg-accent text-white px-6 py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Yuborilmoqda...' : 'Sharhni yuborish'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Sharhingiz admin tasdiqlashidan keyin ko'rinadi
          </p>
        </form>
      </div>
    </div>
  );
};

export default WriteReviewPage;
