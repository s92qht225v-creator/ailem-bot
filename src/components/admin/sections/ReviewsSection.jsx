import { useState, useContext } from 'react';
import { Star, CheckCircle, Trash2, Download } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatDate } from '../../../utils/helpers';
import { exportReviews } from '../../../utils/csvExport';

const ReviewsSection = () => {
  const { reviews, approveReview, deleteReview } = useContext(AdminContext);
  const [filter, setFilter] = useState('all');

  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;

  const filteredReviews = reviews?.filter(review => {
    if (filter === 'pending') return !review.approved;
    if (filter === 'approved') return review.approved;
    return true;
  }) || [];

  const handleApprove = async (reviewId) => {
    try {
      await approveReview(reviewId);
      console.log('✅ Review approved successfully');
    } catch (error) {
      console.error('❌ Failed to approve review:', error);
      alert('Failed to approve review. Please try again.');
    }
  };

  const handleDelete = async (reviewId) => {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      try {
        await deleteReview(reviewId);
        console.log('✅ Review deleted successfully');
      } catch (error) {
        console.error('❌ Failed to delete review:', error);
        alert('Failed to delete review. Please try again.');
      }
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Reviews Management</h3>
        <button
          onClick={() => exportReviews(filteredReviews, `reviews_${filter}`)}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'all'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Reviews ({reviews?.length || 0})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                filter === 'pending'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({pendingReviews})
              {pendingReviews > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingReviews}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-6 py-3 font-medium transition-colors ${
                filter === 'approved'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved ({reviews?.filter(r => r.approved).length || 0})
            </button>
          </div>
        </div>
      </div>

      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {(review.user_name || review.userName)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{review.user_name || review.userName || 'Anonymous'}</h4>
                        <p className="text-sm text-gray-500">{formatDate(review.created_at || review.createdAt)}</p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      review.approved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {review.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>

                {review.productName && (
                  <div className="mb-3 pb-3 border-b flex items-center gap-3">
                    {review.productImage && (
                      <img
                        src={review.productImage}
                        alt={review.productName}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Product</p>
                      <p className="font-medium text-gray-900">{review.productName}</p>
                    </div>
                  </div>
                )}

                {review.comment && (
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {!review.approved && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Review
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === 'pending' ? 'No pending reviews' : filter === 'approved' ? 'No approved reviews yet' : 'No reviews yet'}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'Customer reviews will appear here when submitted' : `Switch to another tab to see ${filter === 'pending' ? 'approved' : 'pending'} reviews`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
