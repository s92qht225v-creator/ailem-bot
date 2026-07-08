import { useState, useContext } from 'react';
import { Star, CheckCircle, Trash2, Download } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { formatDate } from '../../../utils/helpers';
import { exportReviews } from '../../../utils/csvExport';

const ReviewsSection = () => {
  const { reviews, approveReview, deleteReview } = useContext(AdminContext);
  const toast = useToast();
  const confirm = useConfirm();
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
      toast.success('Sharh muvaffaqiyatli tasdiqlandi');
    } catch (error) {
      console.error('❌ Failed to approve review:', error);
      toast.error('Sharhni tasdiqlashda xatolik. Qayta urinib ko\'ring.');
    }
  };

  const handleDelete = async (reviewId) => {
    const confirmed = await confirm({
      title: 'Sharhni o\'chirish',
      message: 'Ushbu sharhni o\'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo\'lmaydi.',
      type: 'danger',
      confirmText: 'O\'chirish',
      cancelText: 'Bekor qilish'
    });
    if (confirmed) {
      try {
        await deleteReview(reviewId);
        console.log('✅ Review deleted successfully');
        toast.success('Sharh muvaffaqiyatli o\'chirildi');
      } catch (error) {
        console.error('❌ Failed to delete review:', error);
        toast.error('Sharhni o\'chirishda xatolik. Qayta urinib ko\'ring.');
      }
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="w-5 h-5"
            style={star <= rating
              ? { fill: 'var(--warn)', color: 'var(--warn)' }
              : { color: 'var(--text-3)' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650 }}>Sharhlarni boshqarish</h3>
        <button
          onClick={() => exportReviews(filteredReviews, `reviews_${filter}`)}
          className="a-btn"
        >
          <Download className="w-4 h-4" />
          CSV yuklab olish
        </button>
      </div>

      <div className="a-card">
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex" style={{ gap: 8, padding: 8 }}>
            <button
              onClick={() => setFilter('all')}
              className={`a-tab ${filter === 'all' ? 'a-tab-on' : ''}`}
            >
              Barcha sharhlar ({reviews?.length || 0})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`a-tab relative ${filter === 'pending' ? 'a-tab-on' : ''}`}
            >
              Kutilmoqda ({pendingReviews})
              {pendingReviews > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--danger)' }}>
                  {pendingReviews}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`a-tab ${filter === 'approved' ? 'a-tab-on' : ''}`}
            >
              Tasdiqlangan ({reviews?.filter(r => r.approved).length || 0})
            </button>
          </div>
        </div>
      </div>

      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="a-card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(to bottom right, var(--accent), var(--accent-ink))' }}>
                        {(review.user_name || review.userName)?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{review.user_name || review.userName || 'Anonim'}</h4>
                        <p className="a-faint" style={{ fontSize: 13, margin: 0 }}>{formatDate(review.created_at || review.createdAt)}</p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`a-pill ${review.approved ? 'a-pill-ok' : 'a-pill-warn'}`}>
                      {review.approved ? 'Tasdiqlangan' : 'Kutilmoqda'}
                    </span>
                  </div>
                </div>

                {review.productName && (
                  <div className="mb-3 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    {review.productImage && (
                      <img
                        src={review.productImage}
                        alt={review.productName}
                        className="w-16 h-16 object-cover rounded-lg"
                        style={{ border: '1px solid var(--border)' }}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div>
                      <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Mahsulot</p>
                      <p style={{ fontWeight: 500, color: 'var(--text)', margin: 0 }}>{review.productName}</p>
                    </div>
                  </div>
                )}

                {review.comment && (
                  <div className="mb-4">
                    <p className="a-muted" style={{ lineHeight: 1.6 }}>{review.comment}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  {!review.approved && (
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="a-btn flex-1"
                      style={{ justifyContent: 'center', color: 'var(--ok)', background: 'var(--ok-weak)', borderColor: 'var(--ok-weak)' }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Sharhni tasdiqlash
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="a-btn flex-1"
                    style={{ justifyContent: 'center', color: 'var(--danger)', background: 'var(--danger-weak)', borderColor: 'var(--danger-weak)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    O'chirish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="a-card p-12 text-center">
          <Star className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-3)' }} />
          <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>
            {filter === 'pending' ? 'Kutilayotgan sharhlar yo\'q' : filter === 'approved' ? 'Hozircha tasdiqlangan sharhlar yo\'q' : 'Hozircha sharhlar yo\'q'}
          </h3>
          <p className="a-faint">
            {filter === 'all' ? 'Mijoz sharhlari yuborilganda shu yerda ko\'rinadi' : `${filter === 'pending' ? 'Tasdiqlangan' : 'Kutilayotgan'} sharhlarni ko\'rish uchun boshqa bo\'limga o\'ting`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
