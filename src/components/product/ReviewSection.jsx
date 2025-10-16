import { useState, useContext } from 'react';
import { Star, Camera, X } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { UserContext } from '../../context/UserContext';
import { AdminContext } from '../../context/AdminContext';

const ReviewSection = ({ product }) => {
  const { user } = useContext(UserContext);
  const { orders, addReview } = useContext(AdminContext);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);

  const approvedReviews = product.reviews?.filter(r => r.approved) || [];

  // Check if user has purchased this product
  const hasPurchased = orders?.some(order =>
    order.userId === user.id &&
    order.status === 'approved' &&
    order.items.some(item => item.productId === product.id)
  ) || false;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (reviewImages.length + validFiles.length > 5) {
      alert('You can only upload up to 5 images');
      return;
    }

    const newImageUrls = validFiles.map(file => URL.createObjectURL(file));
    setReviewImages([...reviewImages, ...newImageUrls]);
  };

  const handleRemoveImage = (index) => {
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(reviewImages[index]);
    setReviewImages(reviewImages.filter((_, i) => i !== index));
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();

    if (!hasPurchased) {
      alert('You can only review products you have purchased.');
      return;
    }

    const newReview = {
      userId: user.id,
      userName: user.name,
      rating,
      comment,
      images: reviewImages,
      date: new Date().toISOString().split('T')[0]
    };

    addReview(product.id, newReview);

    // Reset form and revoke object URLs
    reviewImages.forEach(url => URL.revokeObjectURL(url));
    setComment('');
    setRating(5);
    setReviewImages([]);
    setShowForm(false);

    alert('Review submitted! It will appear after admin approval.');
  };

  return (
    <div className="bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Reviews ({approvedReviews.length})</h2>
        {hasPurchased ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-accent font-semibold hover:underline"
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        ) : (
          <span className="text-sm text-gray-500">Purchase to review</span>
        )}
      </div>

      {/* Review Form */}
      {showForm && hasPurchased && (
        <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-warning text-warning'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows="4"
              placeholder="Share your experience with this product..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Image Upload Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              Add Photos (Optional, max 5)
            </label>

            {/* File Input Button */}
            {reviewImages.length < 5 && (
              <label className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300 mb-3">
                <Camera className="w-5 h-5" />
                <span>Take Photo or Choose from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
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
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reviewImages.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {reviewImages.length}/5 images added
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Submit Review
          </button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {approvedReviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          approvedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{review.userName}</h4>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-warning text-warning'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
              </div>
              <p className="text-gray-700 mb-3">{review.comment}</p>

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {review.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Review image ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
