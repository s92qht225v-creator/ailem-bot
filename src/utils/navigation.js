// Centralized mapping from page names to URL paths
// Used to bridge existing onNavigate(page, data) calls to Next.js router.push()
export function getHref(page, data = {}) {
  switch (page) {
    case 'home':
      return '/';
    case 'shop': {
      const params = new URLSearchParams();
      if (data.category) params.set('category', data.category);
      if (data.q) params.set('q', data.q);
      const qs = params.toString();
      return qs ? `/shop?${qs}` : '/shop';
    }
    case 'product':
      return `/product/${data.productId}`;
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'payment':
      return '/payment';
    case 'paymentStatus': {
      const params = new URLSearchParams();
      if (data.orderId) params.set('order', data.orderId);
      if (data.paymentMethod) params.set('method', data.paymentMethod);
      return `/payment/status?${params}`;
    }
    case 'account':
      return '/account';
    case 'profile':
      return '/profile';
    case 'orderHistory':
      return '/orders';
    case 'orderDetails':
      return `/orders/${data.orderId}`;
    case 'myReviews':
      return '/reviews';
    case 'writeReview':
      return '/reviews/write';
    case 'favorites':
      return '/favorites';
    case 'referrals':
      return '/referrals';
    case 'login':
      return data.returnTo ? `/login?returnTo=${data.returnTo}` : '/login';
    case 'admin':
      return '/admin';
    default:
      return `/${page}`;
  }
}
