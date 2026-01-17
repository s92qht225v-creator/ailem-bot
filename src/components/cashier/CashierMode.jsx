import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  X,
  Package,
  Calculator,
  Receipt,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import { productsAPI, ordersAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const CashierMode = () => {
  const { user } = useContext(UserContext);
  const { showToast } = useToast();

  // Products and cart state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Daily stats
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadTodaySales();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySales = async () => {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const orders = await ordersAPI.getAll();
      const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at || order.createdAt);
        return orderDate >= today &&
               order.payment_method === 'cash' &&
               order.cashier_id === user?.id;
      });

      setTodaySales({
        count: todayOrders.length,
        total: todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      });
    } catch (error) {
      console.error('Failed to load today sales:', error);
    }
  };

  // Search products
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = products.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.barcode?.includes(query)
      ).slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  // Scanner functions
  const startScanner = async () => {
    try {
      setScannerError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScannerActive(true);

      // Note: For actual barcode scanning, you'd integrate with a library like
      // html5-qrcode or quagga. For now, this just activates the camera.
      // The barcode detection would happen in a separate scanning loop.

    } catch (error) {
      console.error('Failed to start scanner:', error);
      setScannerError('Camera access denied. Please allow camera permissions.');
      showToast('Failed to access camera', 'error');
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  };

  // Handle barcode scan (simulated - would be triggered by actual scanner)
  const handleBarcodeScan = async (barcode) => {
    try {
      const result = await productsAPI.getByBarcode(barcode);
      if (result) {
        // If a specific variant was matched, add with that variant
        if (result.matchedVariant) {
          addToCart(result, result.matchedVariant);
          const variantInfo = `${result.matchedVariant.color} / ${result.matchedVariant.size}`;
          showToast(`Qo'shildi: ${result.name} (${variantInfo})`, 'success');
        } else {
          // Product-level barcode - add without variant
          addToCart(result);
          showToast(`Qo'shildi: ${result.name}`, 'success');
        }
      } else {
        showToast('Mahsulot topilmadi', 'error');
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      showToast('Mahsulotni topishda xatolik', 'error');
    }
  };

  // Cart functions
  const addToCart = useCallback((product, variant = null) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.product.id === product.id &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [...prev, {
        product,
        variant,
        quantity: 1,
        price: variant?.price || product.price
      }];
    });
  }, []);

  const updateQuantity = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity += delta;

      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }

      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculate totals
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const changeAmount = cashReceived ? Number(cashReceived) - cartTotal : 0;

  // Process cash checkout
  const processCashCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    if (!cashReceived || Number(cashReceived) < cartTotal) {
      showToast('Insufficient cash received', 'error');
      return;
    }

    setProcessing(true);
    try {
      // Create order
      const orderData = {
        user_name: customerPhone ? `Cash Customer (${customerPhone})` : 'Cash Customer',
        user_phone: customerPhone || 'N/A',
        delivery_info: { type: 'in-store', address: 'In-store purchase' },
        courier: null,
        status: 'completed',
        subtotal: cartTotal,
        delivery_fee: 0,
        bonus_discount: 0,
        bonus_points_used: 0,
        total: cartTotal,
        payment_method: 'cash',
        cash_received: Number(cashReceived),
        change_given: changeAmount,
        cashier_id: user?.id,
        cashier_name: user?.name,
        items: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant,
          image: item.product.image
        }))
      };

      const order = await ordersAPI.create(orderData);

      // Update stock for each item
      for (const item of cart) {
        const newStock = (item.product.stock || 0) - item.quantity;
        await productsAPI.update(item.product.id, { stock: Math.max(0, newStock) });
      }

      setLastOrder({
        orderNumber: order.order_number,
        total: cartTotal,
        cashReceived: Number(cashReceived),
        change: changeAmount
      });

      // Reset state
      setCart([]);
      setCashReceived('');
      setCustomerPhone('');
      setShowCheckout(false);

      // Refresh data
      loadProducts();
      loadTodaySales();

      showToast('Sale completed!', 'success');
    } catch (error) {
      console.error('Checkout failed:', error);
      showToast(`Checkout failed: ${error.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [1000, 5000, 10000, 20000, 50000, 100000];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ailem POS</h1>
            <p className="text-sm text-green-100">Cashier: {user?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">Today's Sales</p>
            <p className="text-lg font-bold">{todaySales.count} orders</p>
            <p className="text-sm">{formatPrice(todaySales.total)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={scannerActive ? stopScanner : startScanner}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                scannerActive
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <Camera className="w-5 h-5" />
              {scannerActive ? 'Stop Scanner' : 'Scan Barcode'}
            </button>
          </div>

          {scannerActive && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-green-400 rounded-lg"></div>
              </div>
            </div>
          )}

          {scannerError && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              {scannerError}
            </div>
          )}

          {/* Manual barcode input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter barcode manually..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  handleBarcodeScan(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    addToCart(product);
                    setSearchQuery('');
                    showToast(`Added: ${product.name}`, 'success');
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">Stock: {product.stock || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatPrice(product.price)}</p>
                    <Plus className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Cart ({cart.length} items)
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 text-sm font-medium hover:text-red-600"
              >
                Clear All
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
              <p className="text-sm">Scan or search products to add</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{item.product.name}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-500">
                        {item.variant.color} / {item.variant.size}
                      </p>
                    )}
                    <p className="text-sm text-green-600 font-medium">
                      {formatPrice(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total and Checkout */}
          {cart.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(cartTotal)}</span>
              </div>
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <Banknote className="w-6 h-6" />
                Cash Checkout
              </button>
            </div>
          )}
        </div>

        {/* Last Order Receipt */}
        {lastOrder && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Last Sale Completed</span>
              <button
                onClick={() => setLastOrder(null)}
                className="ml-auto text-green-600 hover:text-green-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <p>Order: #{lastOrder.orderNumber}</p>
              <p>Total: {formatPrice(lastOrder.total)}</p>
              <p>Received: {formatPrice(lastOrder.cashReceived)}</p>
              <p className="font-bold">Change: {formatPrice(lastOrder.change)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cash Checkout
              </h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Order Total</p>
                <p className="text-3xl font-bold text-gray-900">{formatPrice(cartTotal)}</p>
              </div>

              {/* Customer Phone (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Phone (optional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Cash Received */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Received
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xl font-bold"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setCashReceived(String(amount))}
                    className="py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                  >
                    {formatPrice(amount)}
                  </button>
                ))}
              </div>

              {/* Exact Amount Button */}
              <button
                onClick={() => setCashReceived(String(cartTotal))}
                className="w-full py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium transition-colors"
              >
                Exact Amount ({formatPrice(cartTotal)})
              </button>

              {/* Change Calculation */}
              {cashReceived && (
                <div className={`rounded-lg p-4 ${changeAmount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-600 mb-1">Change to Return</p>
                  <p className={`text-2xl font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {changeAmount >= 0 ? formatPrice(changeAmount) : `Missing: ${formatPrice(Math.abs(changeAmount))}`}
                  </p>
                </div>
              )}

              {/* Complete Button */}
              <button
                onClick={processCashCheckout}
                disabled={processing || !cashReceived || Number(cashReceived) < cartTotal}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                  processing || !cashReceived || Number(cashReceived) < cartTotal
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    Complete Sale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierMode;
