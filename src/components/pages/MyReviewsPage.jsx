import { useContext, useState, useEffect } from 'react';
import { ChevronLeft, Star, Edit2, Package } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { useOrders } from '../../hooks/useOrders';
import { AdminContext } from '../../context/AdminContext';
import { formatDate } from '../../utils/helpers';

const MyReviewsPage = ({ onNavigate }) => {
  const { user } = useContext(UserContext);
  const { getUserOrders } = useOrders();
  const { reviews } = useContext(AdminContext);
  const userOrders = getUserOrders();

  // Get delivered orders
  const deliveredOrders = userOrders.filter(order => order.status === 'delivered');

  // Get user's reviews
  const userReviews = reviews?.filter(review => (review.user_id || review.userId) === user.id) || [];

  // Get items that can be reviewed (from delivered orders, not yet reviewed)
  const reviewableItems = [];
  deliveredOrders.forEach(order => {
    order.items.forEach(item => {
      const alreadyReviewed = userReviews.some(
        review => (review.product_id || review.productId) === item.productId
      );
      if (!alreadyReviewed) {
        reviewableItems.push({
          id: item.productId,
          name: item.productName,
          image: item.image,
          orderId: order.id,
          orderDate: order.date
        });
      }
    });
  });

  // Get completed reviews
  const completedReviews = userReviews.map(review => {
    // Find the product details from orders
    let productDetails = null;
    deliveredOrders.forEach(order => {
      const item = order.items.find(i => i.productId === (review.product_id || review.productId));
      if (item) {
        productDetails = {
          id: item.productId,
          name: item.productName,
          image: item.image,
          orderId: order.id
        };
      }
    });
    return {
      ...review,
      productDetails
    };
  }).filter(r => r.productDetails); // Only show reviews with valid product details

  return (
    <div className="pb-20 pt-16 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('profile')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Pending Reviews */}
        {reviewableItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Pending Reviews ({reviewableItems.length})
            </h2>
            <div className="space-y-3">
              {reviewableItems.map((item, index) => (
                <PendingReviewCard
                  key={`${item.orderId}-${item.id}-${index}`}
                  item={item}
                  onWriteReview={() => onNavigate('writeReview', {
                    productId: item.id,
                    orderId: item.orderId,
                    productName: item.name,
                    productImage: item.image
                  })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Reviews */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Completed Reviews ({completedReviews.length})
          </h2>
          {completedReviews.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Complete your orders to write reviews
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedReviews.map((review) => (
                <CompletedReviewCard
                  key={review.id}
                  review={review}
                  onEdit={() => alert('Edit review coming soon!')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Empty State - No Delivered Orders */}
        {deliveredOrders.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No delivered orders yet</p>
            <p className="text-sm text-gray-400 mb-6">
              You can write reviews after your orders are delivered
            </p>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PendingReviewCard = ({ item, onWriteReview }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex gap-3">
        <img
          src={item.image}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
          <p className="text-xs text-gray-500">Order #{item.orderId}</p>
        </div>
      </div>
      <button
        onClick={onWriteReview}
        className="w-full mt-3 bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
      >
        Write Review
      </button>
    </div>
  );
};

const CompletedReviewCard = ({ review, onEdit }) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex gap-3 mb-3">
        <img
          src={review.productDetails.image}
          alt={review.productDetails.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 mb-1">
            {review.productDetails.name}
          </p>
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">{formatDate(review.date)}</p>
        </div>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors h-fit"
        >
          <Edit2 className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <p className="text-sm text-gray-700">{review.comment}</p>
      {review.verified && (
        <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-semibold">
          ✓ Verified Purchase
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
