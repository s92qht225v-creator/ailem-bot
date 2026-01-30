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
  RefreshCw,
  CameraOff,
  User,
  Phone,
  UserPlus,
  Users
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { UserContext } from '../../context/UserContext';
import { productsAPI, ordersAPI, walkInCustomersAPI } from '../../services/api';
import { formatPrice } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';
import {
  getVolumePricedUnit,
  getVolumeDiscountDescription,
  getTierThreshold,
  getTierGroupQuantity
} from '../../utils/volumePricing';

const CashierMode = () => {
  const { user } = useContext(UserContext);
  const toast = useToast();

  // Products and cart state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const scannerRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scannerContainerId = 'barcode-scanner-container';
  const SCAN_COOLDOWN_MS = 2000; // 2 second cooldown between scans

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Daily stats
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });

  // Walk-in customer state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

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
      toast.error('Failed to load products');
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
               order.paymentMethod === 'cash' &&
               order.cashierId === user?.id;
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

  // Search customers (debounced)
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearchQuery.trim().length < 2) {
        setCustomerSearchResults([]);
        return;
      }

      setSearchingCustomers(true);
      try {
        const results = await walkInCustomersAPI.search(customerSearchQuery.trim());
        setCustomerSearchResults(results);
      } catch (error) {
        console.error('Customer search error:', error);
        setCustomerSearchResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerSearchQuery]);

  // Add new walk-in customer
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      toast.error('Ism va telefon raqamini kiriting');
      return;
    }

    setAddingCustomer(true);
    try {
      const customer = await walkInCustomersAPI.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim()
      });
      setSelectedCustomer(customer);
      setCustomerPhone(customer.phone);
      setShowAddCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
      toast.success('Mijoz qo\'shildi');
    } catch (error) {
      console.error('Add customer error:', error);
      toast.error(error.message || 'Mijozni qo\'shishda xatolik');
    } finally {
      setAddingCustomer(false);
    }
  };

  // Select existing customer
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerPhone(customer.phone);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
    toast.success(`Mijoz tanlandi: ${customer.name}`);
  };

  // Clear selected customer
  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPhone('');
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Scanner functions
  const startScanner = async () => {
    try {
      setScannerError(null);
      lastScanTimeRef.current = 0;

      // First set scanner active to make the container visible
      setScannerActive(true);

      // Wait for next render cycle so container is visible and has dimensions
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create scanner instance
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 5,
        qrbox: 200, // Square scan area - only scans within this box
        aspectRatio: 1.0,
        disableFlip: false,
        showTorchButtonIfSupported: true
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // Check cooldown to prevent multiple rapid scans
          const now = Date.now();
          if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) {
            return; // Still in cooldown period
          }
          lastScanTimeRef.current = now;

          console.log('📷 Barcode scanned:', decodedText);
          // Process the scanned barcode
          await handleBarcodeScan(decodedText);
        },
        () => {
          // Ignore scan errors (no barcode found in frame)
        }
      );

      toast.success('Skaner yoqildi');

    } catch (error) {
      console.error('Failed to start scanner:', error);
      setScannerActive(false);
      setScannerError('Kameraga ruxsat berilmadi. Iltimos, kamera ruxsatini yoqing.');
      toast.error('Kameraga kirish imkoni yo\'q');
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
    setScannerActive(false);
    lastScanTimeRef.current = 0;
  };

  // Handle barcode scan (simulated - would be triggered by actual scanner)
  const handleBarcodeScan = async (barcode) => {
    if (!barcode || !barcode.trim()) {
      toast.error('Shtrix-kod kiriting');
      return;
    }

    setScanningBarcode(true);
    try {
      console.log('🔍 Scanning barcode:', barcode);
      const result = await productsAPI.getByBarcode(barcode.trim());
      console.log('📦 Scan result:', result);

      if (result) {
        // If a specific variant was matched, add with that variant
        if (result.matchedVariant) {
          addToCart(result, result.matchedVariant);
          const variantInfo = `${result.matchedVariant.color} / ${result.matchedVariant.size}`;
          toast.success(`Qo'shildi: ${result.name} (${variantInfo})`);
        } else {
          // Product-level barcode - add without variant
          addToCart(result);
          toast.success(`Qo'shildi: ${result.name}`);
        }
        setManualBarcode(''); // Clear input on success
      } else {
        toast.error(`Mahsulot topilmadi: ${barcode}`);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      toast.error('Mahsulotni topishda xatolik');
    } finally {
      setScanningBarcode(false);
    }
  };

  // Cart functions
  const addToCart = useCallback((product, variant = null) => {
    console.log('🛒 Adding to cart:', {
      name: product.name,
      price: product.price,
      volume_pricing: product.volume_pricing,
      variant: variant
    });

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

  // Group cart items by tier threshold for tier-based volume pricing
  const groupCashierCartByTier = () => {
    const tierGroups = {};
    cart.forEach(item => {
      const threshold = getTierThreshold(item.product.volume_pricing);
      if (threshold !== null) {
        if (!tierGroups[threshold]) {
          tierGroups[threshold] = [];
        }
        tierGroups[threshold].push(item);
      }
    });
    return tierGroups;
  };

  // Get combined quantity for an item's tier group
  const getTierCombinedQty = (item) => {
    const threshold = getTierThreshold(item.product.volume_pricing);
    if (threshold === null) return item.quantity;

    const tierGroups = groupCashierCartByTier();
    const sameThresholdItems = tierGroups[threshold] || [];
    return sameThresholdItems.reduce((total, i) => total + i.quantity, 0);
  };

  // Calculate totals with tier-based volume pricing
  const cartTotal = cart.reduce((sum, item) => {
    const basePrice = item.variant?.price || item.product.price;
    const volumePricing = item.product.volume_pricing;

    // Use combined quantity from same-tier products
    const combinedQty = getTierCombinedQty(item);
    const effectivePrice = getVolumePricedUnit(combinedQty, basePrice, volumePricing);
    const itemTotal = effectivePrice * item.quantity;

    console.log('💰 Cart item calculation:', {
      name: item.product.name,
      qty: item.quantity,
      combinedQty,
      basePrice,
      effectivePrice,
      itemTotal
    });
    return sum + itemTotal;
  }, 0);
  const changeAmount = cashReceived ? Number(cashReceived) - cartTotal : 0;

  // Helper to get effective price for display (using tier-based grouping)
  const getEffectivePrice = (item) => {
    const basePrice = item.variant?.price || item.product.price;
    const volumePricing = item.product.volume_pricing;
    const combinedQty = getTierCombinedQty(item);
    return getVolumePricedUnit(combinedQty, basePrice, volumePricing);
  };

  // Helper to check if volume discount is applied (using tier-based grouping)
  const getDiscount = (item) => {
    const basePrice = item.variant?.price || item.product.price;
    const volumePricing = item.product.volume_pricing;
    const combinedQty = getTierCombinedQty(item);
    return getVolumeDiscountDescription(combinedQty, basePrice, volumePricing);
  };

  // Process cash checkout
  const processCashCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!cashReceived || Number(cashReceived) < cartTotal) {
      toast.error('Insufficient cash received');
      return;
    }

    setProcessing(true);
    try {
      // Create order
      const orderData = {
        user_name: selectedCustomer ? selectedCustomer.name : (customerPhone ? `Naqd mijoz (${customerPhone})` : 'Naqd mijoz'),
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
        walk_in_customer_id: selectedCustomer?.id || null,
        walk_in_customer_name: selectedCustomer?.name || null,
        walk_in_customer_phone: selectedCustomer?.phone || customerPhone || null,
        items: cart.map(item => {
          const basePrice = item.variant?.price || item.product.price;
          // Use tier-based combined quantity for effective price
          const combinedQty = getTierCombinedQty(item);
          const effectivePrice = getVolumePricedUnit(combinedQty, basePrice, item.product.volume_pricing);
          return {
            id: item.product.id,
            name: item.product.name,
            price: effectivePrice, // Use tier-based volume-discounted price
            basePrice: basePrice, // Store original price for reference
            quantity: item.quantity,
            variant: item.variant,
            image: item.product.image
          };
        })
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
        change: changeAmount,
        customerName: selectedCustomer?.name
      });

      // Update walk-in customer stats if customer selected
      if (selectedCustomer && customerPhone) {
        await walkInCustomersAPI.updateStatsAfterOrder(customerPhone, cartTotal);
      }

      // Reset state
      setCart([]);
      setCashReceived('');
      setCustomerPhone('');
      setSelectedCustomer(null);
      setShowCheckout(false);

      // Refresh data
      loadProducts();
      loadTodaySales();

      toast.success('Sale completed!');
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(`Checkout failed: ${error.message}`);
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
              onClick={() => scannerActive ? stopScanner() : startScanner()}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                scannerActive
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <Camera className="w-5 h-5" />
              {scannerActive ? 'Skanerni to\'xtatish' : 'Shtrix-kodni skanerlash'}
            </button>
          </div>

          {/* Scanner container - always mounted, visibility controlled by style */}
          <div
            id={scannerContainerId}
            className="rounded-lg overflow-hidden mb-4"
            style={{
              width: '100%',
              display: scannerActive ? 'block' : 'none'
            }}
          />

          {/* Custom styles to fix scanner frame */}
          {scannerActive && (
            <style>{`
              #${scannerContainerId} video {
                width: 100% !important;
                height: auto !important;
                max-height: 250px !important;
                object-fit: cover !important;
              }
              #${scannerContainerId} > div {
                border: none !important;
              }
              #qr-shaded-region {
                border-width: 2px !important;
              }
            `}</style>
          )}

          {!scannerActive && (
            <div className="bg-gray-100 rounded-lg p-6 mb-4 text-center">
              <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Skaner o'chirilgan</p>
            </div>
          )}

          {scannerError && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              {scannerError}
            </div>
          )}

          {/* Manual barcode input */}
          <div className="space-y-3">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Shtrix-kodni kiriting..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualBarcode) {
                  handleBarcodeScan(manualBarcode);
                }
              }}
              disabled={scanningBarcode}
            />
            <button
              onClick={() => handleBarcodeScan(manualBarcode)}
              disabled={!manualBarcode || scanningBarcode}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                !manualBarcode || scanningBarcode
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {scanningBarcode ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Qidirish
            </button>
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
                    toast.success(`Added: ${product.name}`);
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
              {cart.map((item, index) => {
                const discount = getDiscount(item);
                const effectivePrice = getEffectivePrice(item);
                const basePrice = item.variant?.price || item.product.price;
                const itemTotal = effectivePrice * item.quantity;

                return (
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
                      <div className="text-sm">
                        {discount ? (
                          <>
                            <span className="text-gray-400 line-through mr-1">{formatPrice(basePrice)}</span>
                            <span className="text-green-600 font-medium">{formatPrice(effectivePrice)}</span>
                            <span className="text-gray-500"> x {item.quantity}</span>
                            <span className="ml-1 text-xs text-orange-500 font-medium">(-{formatPrice(discount.savingsTotal)})</span>
                          </>
                        ) : (
                          <span className="text-green-600 font-medium">
                            {formatPrice(effectivePrice)} x {item.quantity}
                          </span>
                        )}
                      </div>
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
                );
              })}
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
              <p>Buyurtma: #{lastOrder.orderNumber}</p>
              {lastOrder.customerName && (
                <p>Mijoz: {lastOrder.customerName}</p>
              )}
              <p>Jami: {formatPrice(lastOrder.total)}</p>
              <p>Qabul qilindi: {formatPrice(lastOrder.cashReceived)}</p>
              <p className="font-bold">Qaytim: {formatPrice(lastOrder.change)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal - higher z-index than checkout modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-sm rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Yangi mijoz
              </h2>
              <button
                onClick={() => {
                  setShowAddCustomer(false);
                  setNewCustomerName('');
                  setNewCustomerPhone('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Mijoz ismi"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon raqam *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <button
                onClick={handleAddCustomer}
                disabled={addingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  addingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {addingCustomer ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Mijozni qo'shish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Customer Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Mijoz (ixtiyoriy)
                </label>

                {selectedCustomer ? (
                  // Selected customer display
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                          <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                          {selectedCustomer.total_orders > 0 && (
                            <p className="text-xs text-green-600">
                              {selectedCustomer.total_orders} ta buyurtma
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={clearSelectedCustomer}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Customer search
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        placeholder="Telefon yoki ism bo'yicha qidirish..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      {searchingCustomers && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                      )}
                    </div>

                    {/* Customer search results */}
                    {customerSearchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                        {customerSearchResults.map(customer => (
                          <button
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                              <p className="text-sm text-gray-500">{customer.phone}</p>
                            </div>
                            {customer.total_orders > 0 && (
                              <span className="text-xs text-gray-400">
                                {customer.total_orders} buyurtma
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results - show add button */}
                    {customerSearchQuery.length >= 2 && !searchingCustomers && customerSearchResults.length === 0 && (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        <p>Mijoz topilmadi</p>
                      </div>
                    )}

                    {/* Add new customer button */}
                    <button
                      onClick={() => setShowAddCustomer(true)}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Yangi mijoz qo'shish
                    </button>
                  </>
                )}
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
