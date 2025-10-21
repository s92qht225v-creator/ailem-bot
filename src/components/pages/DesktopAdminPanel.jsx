import { useState, useContext } from 'react';
import { 
  Shield, Package, Star, Users as UsersIcon, CheckCircle, XCircle, 
  Edit, Trash2, Plus, ChevronRight, Edit2, ShoppingBag, Truck, Gift, 
  Image, MapPin, Clock, Phone, Copy, DollarSign, LayoutGrid, Upload, 
  TrendingUp, TrendingDown, BarChart3, Calendar, AlertTriangle,
  Menu, X, Home, Settings, Bell
} from 'lucide-react';
import { AdminContext } from '../../context/AdminContext';
import { PickupPointsContext } from '../../context/PickupPointsContext';
import { ShippingRatesContext } from '../../context/ShippingRatesContext';
import { formatPrice, formatDate, loadFromLocalStorage, saveToLocalStorage } from '../../utils/helpers';
import { calculateAnalytics, getRevenueChartData } from '../../utils/analytics';
import { generateVariants, updateVariantStock, getTotalVariantStock } from '../../utils/variants';

const DesktopAdminPanel = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { products, categories, orders, reviews, users, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, approveReview, deleteReview } = useContext(AdminContext);

  // Calculate stats
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const approvedOrders = orders.filter(o => o.status === 'approved').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const pendingReviews = reviews?.filter(r => !r.approved).length || 0;
  const totalRevenue = orders
    .filter(o => o.status === 'approved' || o.status === 'shipped')
    .reduce((sum, order) => sum + order.total, 0);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      color: 'text-blue-600'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      color: 'text-green-600',
      badge: pendingOrders > 0 ? pendingOrders : null
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      color: 'text-purple-600',
      count: products.length
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: LayoutGrid,
      color: 'text-orange-600',
      count: categories.length
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: Star,
      color: 'text-yellow-600',
      badge: pendingReviews > 0 ? pendingReviews : null
    },
    {
      id: 'users',
      label: 'Users',
      icon: UsersIcon,
      color: 'text-indigo-600'
    },
    {
      id: 'pickup-points',
      label: 'Pickup Points',
      icon: MapPin,
      color: 'text-pink-600'
    },
    {
      id: 'shipping-rates',
      label: 'Shipping Rates',
      icon: Truck,
      color: 'text-cyan-600'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'text-teal-600'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Ailem Store</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.count && !item.badge && (
                      <span className="text-gray-400 text-sm">{item.count}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeSection.replace('-', ' ')}
              </h2>
              <p className="text-gray-600">
                {activeSection === 'dashboard' && 'Overview of your store performance'}
                {activeSection === 'orders' && `${orders.length} total orders`}
                {activeSection === 'products' && `${products.length} products in your catalog`}
                {activeSection === 'categories' && `${categories.length} product categories`}
                {activeSection === 'reviews' && `${reviews?.length || 0} customer reviews`}
                {activeSection === 'users' && 'Manage customers and administrators'}
                {activeSection === 'pickup-points' && 'Manage courier pickup locations'}
                {activeSection === 'shipping-rates' && 'Configure delivery pricing by region'}
                {activeSection === 'analytics' && 'Detailed business insights'}
                {activeSection === 'settings' && 'System configuration and preferences'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <button
                  onClick={onLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Logout from admin panel"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeSection === 'dashboard' && <DashboardContent />}
          {activeSection === 'orders' && <OrdersContent />}
          {activeSection === 'products' && <ProductsContent />}
          {activeSection === 'categories' && <CategoriesContent />}
          {activeSection === 'reviews' && <ReviewsContent />}
          {activeSection === 'users' && <UsersContent />}
          {activeSection === 'pickup-points' && <PickupPointsContent />}
          {activeSection === 'shipping-rates' && <ShippingRatesContent />}
          {activeSection === 'analytics' && <AnalyticsContent />}
          {activeSection === 'settings' && <SettingsContent />}
        </main>
      </div>
    </div>
  );

  // Dashboard Content Component
  function DashboardContent() {
    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatPrice(totalRevenue)}
            icon={DollarSign}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            title="Pending Orders"
            value={pendingOrders}
            icon={Clock}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard
            title="Products"
            value={products.length}
            icon={Package}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="Pending Reviews"
            value={pendingReviews}
            icon={Star}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#{order.id}</p>
                    <p className="text-sm text-gray-600">{order.userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('products')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <Plus className="w-5 h-5 text-purple-600" />
                <span>Add New Product</span>
              </button>
              <button
                onClick={() => setActiveSection('orders')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Review Pending Orders ({pendingOrders})</span>
              </button>
              <button
                onClick={() => setActiveSection('reviews')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <Star className="w-5 h-5 text-yellow-600" />
                <span>Review Customer Feedback ({pendingReviews})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Other content components would be implemented similarly...
  function OrdersContent() {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Orders Management</h3>
            <div className="flex gap-2">
              <select className="px-3 py-2 border rounded-lg text-sm">
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Shipped</option>
                <option>Delivered</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.userName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.createdAt || order.date)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatPrice(order.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800">View</button>
                      {order.status === 'pending' && (
                        <>
                          <button className="text-green-600 hover:text-green-800">Approve</button>
                          <button className="text-red-600 hover:text-red-800">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Products Content with full functionality
  function ProductsContent() {
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [allImages, setAllImages] = useState([]); // Array of all product images
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      price: '',
      salePrice: '',
      imageUrl: '',
      additionalImages: '',
      category: 'Bedsheets',
      weight: '',
      stock: '',
      badge: '',
      material: '',
      colors: '',
      sizes: '',
      tags: '',
      inStock: true,
      variants: []
    });

    const handleImageUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingImage(true);
        console.log('📤 Uploading image to Supabase...');

        // Import storageAPI
        const { storageAPI } = await import('../../services/api');
        const result = await storageAPI.uploadProductImage(file);

        console.log('✅ Image uploaded:', result.url);

        // Add to images array
        setAllImages(prev => [...prev, result.url]);
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
        // Reset file input
        e.target.value = '';
      }
    };

    const handleRemoveImage = (indexToRemove) => {
      setAllImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleMoveImage = (fromIndex, toIndex) => {
      setAllImages(prev => {
        const newImages = [...prev];
        const [movedImage] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedImage);
        return newImages;
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        // Ensure we have at least one image
        if (allImages.length === 0) {
          alert('Please add at least one product image.');
          return;
        }

        // Prepare product data in app format (API will handle database conversion)
        const productData = {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.salePrice || formData.price), // Use sale price if available, otherwise regular price
          originalPrice: formData.salePrice ? parseFloat(formData.price) : null, // Original price only if there's a sale
          category: formData.category,  // Use category (API converts to category_name)
          imageUrl: allImages[0],  // First image is the main image
          images: allImages,  // All images in order
          weight: formData.weight ? parseFloat(formData.weight) : null,
          stock: parseInt(formData.stock) || 0,
          badge: formData.badge || null,
          material: formData.material || null,
          colors: formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [],
          sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [],
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [],
          variants: formData.variants || []
        };

        if (editingProduct) {
          // Update existing product
          await updateProduct(editingProduct.id, productData);
          console.log('✅ Product updated successfully');
        } else {
          // Create new product
          await addProduct(productData);
          console.log('✅ Product created successfully');
        }

        // Reset form and close
        setShowForm(false);
        setEditingProduct(null);
        setAllImages([]);
        setFormData({
          name: '',
          description: '',
          price: '',
          salePrice: '',
          imageUrl: '',
          additionalImages: '',
          category: 'Bedsheets',
          weight: '',
          stock: '',
          badge: '',
          material: '',
          colors: '',
          sizes: '',
          tags: '',
          inStock: true,
          variants: []
        });
      } catch (error) {
        console.error('❌ Failed to save product:', error);
        alert('Failed to save product. Please try again.');
      }
    };

    const handleEdit = (product) => {
      setEditingProduct(product);
      // Set images array from product
      const productImages = product.images || [product.image || product.imageUrl];
      setAllImages(productImages.filter(url => url)); // Filter out any null/undefined
      
      setFormData({
        name: product.name,
        description: product.description || '',
        // If originalPrice exists, it's the regular price and price is the sale price
        price: product.originalPrice ? product.originalPrice.toString() : product.price.toString(),
        salePrice: product.originalPrice ? product.price.toString() : '',
        imageUrl: product.image || product.imageUrl,
        additionalImages: product.images ? product.images.slice(1).join(', ') : '',
        category: product.category,
        weight: product.weight ? product.weight.toString() : '',
        stock: product.stock ? product.stock.toString() : '',
        badge: product.badge || '',
        material: product.material || '',
        colors: product.colors ? product.colors.join(', ') : '',
        sizes: product.sizes ? product.sizes.join(', ') : '',
        tags: product.tags ? product.tags.join(', ') : '',
        inStock: product.inStock !== false,
        variants: product.variants || []
      });
      setShowForm(true);
    };

    const handleDelete = async (productId) => {
      if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
          await deleteProduct(productId);
          console.log('✅ Product deleted successfully');
        } catch (error) {
          console.error('❌ Failed to delete product:', error);
          alert('Failed to delete product. Please try again.');
        }
      }
    };

    // Auto-generate variants when colors or sizes change
    const handleColorsOrSizesChange = (field, value) => {
      const updatedFormData = { ...formData, [field]: value };

      // Parse colors and sizes
      const colors = updatedFormData.colors ? updatedFormData.colors.split(',').map(c => c.trim()).filter(c => c) : [];
      const sizes = updatedFormData.sizes ? updatedFormData.sizes.split(',').map(s => s.trim()).filter(s => s) : [];

      // Generate new variants if both colors and sizes exist
      if (colors.length > 0 && sizes.length > 0) {
        const newVariants = generateVariants(colors, sizes, 0);

        // Merge with existing variants to preserve stock
        const mergedVariants = newVariants.map(newV => {
          const existing = formData.variants.find(v =>
            v.color?.toLowerCase() === newV.color.toLowerCase() &&
            v.size?.toLowerCase() === newV.size.toLowerCase()
          );
          return existing ? { ...newV, stock: existing.stock } : newV;
        });

        updatedFormData.variants = mergedVariants;
      } else {
        updatedFormData.variants = [];
      }

      setFormData(updatedFormData);
    };

    // Update variant stock
    const handleVariantStockChange = (color, size, newStock) => {
      const updatedVariants = updateVariantStock(formData.variants, color, size, parseInt(newStock) || 0);
      setFormData({ ...formData, variants: updatedVariants });
    };

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Product Management</h3>
            <p className="text-gray-600">{products.length} products in catalog</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h4>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setAllImages([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (UZS) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (UZS)</label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="">Select a category</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., 1.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="e.g., Cotton"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                <select
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="">None</option>
                  <option value="BEST SELLER">BEST SELLER</option>
                  <option value="NEW ARRIVAL">NEW ARRIVAL</option>
                  <option value="SALE">SALE</option>
                  <option value="LIMITED">LIMITED</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                <input
                  type="text"
                  value={formData.colors}
                  onChange={(e) => handleColorsOrSizesChange('colors', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="White, Gray, Navy Blue (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) => handleColorsOrSizesChange('sizes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Twin, Full, Queen, King (comma separated)"
                />
              </div>

              {/* Variant Stock Management */}
              {formData.variants.length > 0 && (
                <div className="md:col-span-2 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-blue-900">
                      Variant Inventory ({formData.variants.length} variants)
                    </label>
                    <span className="text-xs text-blue-700 font-medium">
                      Total: {getTotalVariantStock(formData.variants)} units
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Set stock quantity for each color + size combination
                  </p>

                  {/* Variant Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {formData.variants.map((variant, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-white p-2 rounded border"
                      >
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{variant.color}</span>
                          <span className="text-gray-500 mx-1">•</span>
                          <span className="font-medium">{variant.size}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => handleVariantStockChange(variant.color, variant.size, e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      💡 <strong>Note:</strong> The "Stock Quantity" field above is now ignored when variants are present.
                      Inventory is tracked per variant instead.
                    </p>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images * {allImages.length > 0 && <span className="text-gray-500 font-normal">({allImages.length} image{allImages.length !== 1 ? 's' : ''})</span>}
                </label>
                
                {/* Image Gallery */}
                {allImages.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {allImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                          <img
                            src={imageUrl}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        
                        {/* Image Badge */}
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                            Main
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, index - 1)}
                              className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Move left"
                            >
                              <ChevronRight className="w-4 h-4 rotate-180" />
                            </button>
                          )}
                          {index < allImages.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(index, index + 1)}
                              className="bg-white text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Move right"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <label className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>{uploadingImage ? 'Uploading...' : (allImages.length === 0 ? 'Upload Product Images' : 'Add More Images')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {allImages.length === 0 ? 'Upload at least one product image. ' : ''}
                  First image will be the main product image. Click and drag to reorder.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags *</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="bedsheet, cotton, luxury, soft (comma separated, lowercase)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Tags are used for search - enter keywords separated by commas</p>
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    setAllImages([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg mr-4"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description?.substring(0, 50)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</div>
                      {product.originalPrice && (
                        <div className="text-sm text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.stock > 10 ? 'bg-green-100 text-green-800' :
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function CategoriesContent() {
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [formData, setFormData] = useState({
      name: '',
      image: ''
    });

    const handleImageUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingImage(true);
        console.log('📤 Uploading image to Supabase...');

        const { storageAPI } = await import('../../services/api');
        const result = await storageAPI.uploadProductImage(file);

        console.log('✅ Image uploaded:', result.url);
        setFormData(prev => ({ ...prev, image: result.url }));
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const categoryData = {
          name: formData.name,
          image: formData.image || null
        };

        if (editingCategory) {
          await updateCategory(editingCategory.id, categoryData);
          console.log('✅ Category updated successfully');
        } else {
          await addCategory(categoryData);
          console.log('✅ Category created successfully');
        }

        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', image: '' });
      } catch (error) {
        console.error('❌ Failed to save category:', error);
        alert('Failed to save category. Please try again.');
      }
    };

    const handleEdit = (category) => {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image: category.image || ''
      });
      setShowForm(true);
    };

    const handleDelete = async (categoryId) => {
      if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
        try {
          await deleteCategory(categoryId);
          console.log('✅ Category deleted successfully');
        } catch (error) {
          console.error('❌ Failed to delete category:', error);
          alert('Failed to delete category. Please try again.');
        }
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Category Management</h3>
            <p className="text-gray-600">{categories.length} categories</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h4>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
                <div className="space-y-3">
                  <div>
                    <label className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image from Device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Paste image URL (https://...)"
                  />

                  {formData.image && (
                    <div className="mt-2">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-100">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl text-gray-400">
                    📷
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{category.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && !showForm && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <LayoutGrid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">Create your first category to organize products</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-accent hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Category
            </button>
          </div>
        )}
      </div>
    );
  }

  function ReviewsContent() {
    const [filter, setFilter] = useState('all'); // all, pending, approved

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
        {/* Filter Tabs */}
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

        {/* Reviews List */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
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

                  {/* Product Info */}
                  {review.productName && (
                    <div className="mb-3 pb-3 border-b flex items-center gap-3">
                      {review.productImage && (
                        <img
                          src={review.productImage}
                          alt={review.productName}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Product</p>
                        <p className="font-medium text-gray-900">{review.productName}</p>
                      </div>
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  )}

                  {/* Actions */}
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
  }

  function UsersContent() {
    const { users } = useContext(AdminContext);
    const [expandedUser, setExpandedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter users based on search
    const filteredUsers = users.filter(user => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div>
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by name, username, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
              <UsersIcon className="w-12 h-12 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Today</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">With Orders</p>
                <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.totalOrders > 0).length}</p>
              </div>
              <ShoppingBag className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">@{user.username || 'No username'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Bonus Points</p>
                        <p className="text-xl font-bold text-indigo-600">{user.bonusPoints || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Orders</p>
                        <p className="text-xl font-bold text-gray-900">{user.totalOrders || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Phone</p>
                      <p className="text-sm text-gray-900">{user.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                      <p className="text-sm text-gray-900">{user.email || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedUser === user.id ? 'Hide Details' : 'Show Details'}
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedUser === user.id ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedUser === user.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Telegram ID</p>
                          <p className="text-sm text-gray-900 font-mono">{user.telegramId || user.telegram_id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referral Code</p>
                          <p className="text-sm text-gray-900 font-mono">{user.referralCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referred By</p>
                          <p className="text-sm text-gray-900">{user.referredBy || 'None'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Referrals Made</p>
                          <p className="text-sm text-gray-900">{user.referrals || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Joined Date</p>
                          <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Last Updated</p>
                          <p className="text-sm text-gray-900">{formatDate(user.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No users found' : 'No users yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search query' : 'Users will appear here when they sign up'}
            </p>
          </div>
        )}
      </div>
    );
  }

  function AnalyticsContent() {
    const analytics = calculateAnalytics(orders, users, products);
    const chartData = getRevenueChartData(orders);

    return (
      <div className="space-y-6">
        {/* Revenue Overview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.totalRevenue)}</p>
              <div className="mt-2 flex items-center gap-1">
                {analytics.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">This Month</p>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.monthRevenue)}</p>
              <p className="text-sm text-gray-500 mt-2">{analytics.monthOrdersCount} orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">This Week</p>
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.weekRevenue)}</p>
              <p className="text-sm text-gray-500 mt-2">{analytics.weekOrdersCount} orders</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <ShoppingBag className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics.avgOrderValue)}</p>
              <p className="text-sm text-gray-500 mt-2">Per order</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 7 Days Revenue</h3>
          <div className="space-y-4">
            {chartData.map((day, index) => {
              const maxRevenue = Math.max(...chartData.map(d => d.revenue));
              const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{day.date}</span>
                    <span className="font-semibold text-gray-900">{formatPrice(day.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{day.orders} orders</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order & Customer Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">Completed</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalOrders}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="text-gray-700">Pending</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.pendingOrdersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">Approved</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.ordersByStatus.approved}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Shipped</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.ordersByStatus.shipped}</span>
              </div>
            </div>
          </div>

          {/* Customer Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-gray-700">Total Customers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalCustomers}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="text-gray-700">Conversion Rate</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.conversionRate.toFixed(1)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-gray-700">Total Referrals</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.totalReferrals}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-gray-700">Active Referrers</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{analytics.usersWithReferrals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.productId} className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatPrice(product.revenue)}</p>
                      <p className="text-sm text-gray-500">Revenue</p>
                    </div>
                  </div>
                  
                  {/* Variant Breakdown */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Variants:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {product.variants.slice(0, 4).map((variant, vIdx) => (
                          <div key={vIdx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-xs text-gray-700">{variant.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{variant.quantity} sold</span>
                          </div>
                        ))}
                      </div>
                      {product.variants.length > 4 && (
                        <p className="text-xs text-gray-500 mt-2">+{product.variants.length - 4} more variant{product.variants.length - 4 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          )}
        </div>

        {/* Inventory Alerts */}
        {(analytics.lowStockProducts > 0 || analytics.outOfStockProducts > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Inventory Alerts</h3>
                <div className="space-y-2">
                  {analytics.outOfStockProducts > 0 && (
                    <p className="text-yellow-800">
                      <strong>{analytics.outOfStockProducts}</strong> product{analytics.outOfStockProducts !== 1 ? 's' : ''} out of stock
                    </p>
                  )}
                  {analytics.lowStockProducts > 0 && (
                    <p className="text-yellow-800">
                      <strong>{analytics.lowStockProducts}</strong> product{analytics.lowStockProducts !== 1 ? 's' : ''} low on stock (&lt;10 units)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PickupPointsContent() {
    const {
      pickupPoints,
      addPickupPoint,
      updatePickupPoint,
      deletePickupPoint,
      togglePickupPointStatus,
      duplicatePickupPoint
    } = useContext(PickupPointsContext);

    const [showForm, setShowForm] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [expandedCouriers, setExpandedCouriers] = useState(new Set());
    const [expandedStates, setExpandedStates] = useState(new Set());
    const [expandedCities, setExpandedCities] = useState(new Set());
    const [formData, setFormData] = useState({
      courierService: '',
      state: '',
      city: '',
      address: '',
      workingHours: '09:00 - 20:00',
      phone: ''
    });

    // Group pickup points by courier → state → city
    const groupedPoints = pickupPoints.reduce((acc, point) => {
      if (!acc[point.courierService]) {
        acc[point.courierService] = {};
      }
      if (!acc[point.courierService][point.state]) {
        acc[point.courierService][point.state] = {};
      }
      if (!acc[point.courierService][point.state][point.city]) {
        acc[point.courierService][point.state][point.city] = [];
      }
      acc[point.courierService][point.state][point.city].push(point);
      return acc;
    }, {});

    const toggleCourier = (courier) => {
      const newSet = new Set(expandedCouriers);
      if (newSet.has(courier)) {
        newSet.delete(courier);
        const newStatesSet = new Set(expandedStates);
        const newCitiesSet = new Set(expandedCities);
        Object.keys(groupedPoints[courier] || {}).forEach((state) => {
          newStatesSet.delete(`${courier}-${state}`);
          Object.keys(groupedPoints[courier][state] || {}).forEach((city) => {
            newCitiesSet.delete(`${courier}-${state}-${city}`);
          });
        });
        setExpandedStates(newStatesSet);
        setExpandedCities(newCitiesSet);
      } else {
        newSet.add(courier);
      }
      setExpandedCouriers(newSet);
    };

    const toggleState = (courier, state) => {
      const stateKey = `${courier}-${state}`;
      const newSet = new Set(expandedStates);
      if (newSet.has(stateKey)) {
        newSet.delete(stateKey);
        const newCitiesSet = new Set(expandedCities);
        Object.keys(groupedPoints[courier]?.[state] || {}).forEach((city) => {
          newCitiesSet.delete(`${courier}-${state}-${city}`);
        });
        setExpandedCities(newCitiesSet);
      } else {
        newSet.add(stateKey);
      }
      setExpandedStates(newSet);
    };

    const toggleCity = (courier, state, city) => {
      const cityKey = `${courier}-${state}-${city}`;
      const newSet = new Set(expandedCities);
      if (newSet.has(cityKey)) {
        newSet.delete(cityKey);
      } else {
        newSet.add(cityKey);
      }
      setExpandedCities(newSet);
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!formData.courierService || !formData.state || !formData.city || !formData.address || !formData.phone) {
        alert('Please fill in all required fields');
        return;
      }

      if (editingPoint) {
        updatePickupPoint(editingPoint.id, formData);
      } else {
        addPickupPoint(formData);
      }

      setFormData({
        courierService: '',
        state: '',
        city: '',
        address: '',
        workingHours: '09:00 - 20:00',
        phone: ''
      });
      setEditingPoint(null);
      setShowForm(false);
    };

    const handleEdit = (point) => {
      setEditingPoint(point);
      setFormData({
        courierService: point.courierService,
        state: point.state,
        city: point.city,
        address: point.address,
        workingHours: point.workingHours,
        phone: point.phone
      });
      setShowForm(true);
    };

    const handleDelete = (pointId) => {
      if (confirm('Are you sure you want to delete this pickup point?')) {
        deletePickupPoint(pointId);
      }
    };

    return (
      <div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Pickup Point
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-xl font-bold mb-4">
              {editingPoint ? 'Edit Pickup Point' : 'Add New Pickup Point'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Courier Service *</label>
                <input
                  type="text"
                  value={formData.courierService}
                  onChange={(e) => setFormData({ ...formData, courierService: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Yandex, Uzum, Express24"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">State/Region *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Tashkent Region"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Tashkent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="+998 XX XXX XXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Working Hours *</label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 09:00 - 20:00"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Address *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                  placeholder="Full address of pickup point"
                  required
                />
              </div>

              <div className="col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  {editingPoint ? 'Update Pickup Point' : 'Add Pickup Point'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPoint(null);
                    setFormData({
                      courierService: '',
                      state: '',
                      city: '',
                      address: '',
                      workingHours: '09:00 - 20:00',
                      phone: ''
                    });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {Object.keys(groupedPoints).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No pickup points found</p>
            </div>
          ) : (
            Object.entries(groupedPoints).map(([courier, stateGroups]) => {
              const isCourierExpanded = expandedCouriers.has(courier);
              const totalPoints = Object.values(stateGroups).reduce((sum, cityGroups) =>
                sum + Object.values(cityGroups).reduce((citySum, addresses) => citySum + addresses.length, 0), 0
              );

              return (
                <div key={courier} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleCourier(courier)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      isCourierExpanded ? 'rotate-90' : ''
                    }`} />
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-gray-800">{courier}</h2>
                      <p className="text-sm text-gray-500">{totalPoints} pickup points</p>
                    </div>
                  </button>

                  {isCourierExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {Object.entries(stateGroups).map(([state, cityGroups]) => {
                        const isStateExpanded = expandedStates.has(`${courier}-${state}`);
                        const statePoints = Object.values(cityGroups).reduce((sum, addresses) => sum + addresses.length, 0);

                        return (
                          <div key={state} className="bg-gray-50 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleState(courier, state)}
                              className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                            >
                              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                isStateExpanded ? 'rotate-90' : ''
                              }`} />
                              <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                              <div className="flex-1 text-left">
                                <h3 className="font-bold text-gray-800">{state}</h3>
                                <p className="text-xs text-gray-500">{statePoints} locations</p>
                              </div>
                            </button>

                            {isStateExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                {Object.entries(cityGroups).map(([city, addresses]) => {
                                  const isCityExpanded = expandedCities.has(`${courier}-${state}-${city}`);

                                  return (
                                    <div key={city} className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                      <button
                                        onClick={() => toggleCity(courier, state, city)}
                                        className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors"
                                      >
                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                                          isCityExpanded ? 'rotate-90' : ''
                                        }`} />
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                                          <MapPin className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                          <h4 className="font-semibold text-gray-800">{city}</h4>
                                          <p className="text-xs text-gray-500">{addresses.length} addresses</p>
                                        </div>
                                      </button>

                                      {isCityExpanded && (
                                        <div className="px-3 pb-3 space-y-2">
                                          {addresses.map((point) => (
                                            <div key={point.id} className="bg-gray-50 rounded-lg p-3">
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                      point.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                      {point.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                  </div>
                                                  <p className="text-gray-800 font-medium mb-1">{point.address}</p>
                                                  <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                      <Clock className="w-4 h-4" />
                                                      {point.workingHours}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                      <Phone className="w-4 h-4" />
                                                      {point.phone}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => togglePickupPointStatus(point.id)}
                                                    className={`text-sm px-3 py-1 rounded ${
                                                      point.active
                                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    }`}
                                                  >
                                                    {point.active ? 'Deactivate' : 'Activate'}
                                                  </button>
                                                  <button
                                                    onClick={() => handleEdit(point)}
                                                    className="text-accent p-2 hover:bg-blue-50 rounded"
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => duplicatePickupPoint(point.id)}
                                                    className="text-gray-600 p-2 hover:bg-gray-100 rounded"
                                                  >
                                                    <Copy className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDelete(point.id)}
                                                    className="text-error p-2 hover:bg-red-50 rounded"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function ShippingRatesContent() {
    const {
      shippingRates,
      addShippingRate,
      updateShippingRate,
      deleteShippingRate
    } = useContext(ShippingRatesContext);

    const [showForm, setShowForm] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [formData, setFormData] = useState({
      courier: '',
      state: '',
      firstKg: '',
      additionalKg: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!formData.courier || !formData.state || !formData.firstKg) {
        alert('Please fill in all required fields');
        return;
      }

      const rateData = {
        ...formData,
        firstKg: parseFloat(formData.firstKg),
        additionalKg: parseFloat(formData.additionalKg) || 0
      };

      if (editingRate) {
        updateShippingRate(editingRate.id, rateData);
      } else {
        addShippingRate(rateData);
      }

      setFormData({ courier: '', state: '', firstKg: '', additionalKg: '' });
      setEditingRate(null);
      setShowForm(false);
    };

    const handleEdit = (rate) => {
      setEditingRate(rate);
      setFormData({
        courier: rate.courier,
        state: rate.state,
        firstKg: rate.firstKg.toString(),
        additionalKg: rate.additionalKg.toString()
      });
      setShowForm(true);
    };

    const handleDelete = (rateId) => {
      if (confirm('Are you sure you want to delete this shipping rate?')) {
        deleteShippingRate(rateId);
      }
    };

    const groupedRates = shippingRates.reduce((acc, rate) => {
      if (!acc[rate.courier]) {
        acc[rate.courier] = [];
      }
      acc[rate.courier].push(rate);
      return acc;
    }, {});

    return (
      <div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-4 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Shipping Rate
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h3 className="text-xl font-bold mb-4">
              {editingRate ? 'Edit Shipping Rate' : 'Add New Shipping Rate'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Courier Service *</label>
                <input
                  type="text"
                  value={formData.courier}
                  onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., BTS, Yandex, Starex"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">State/Region *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Tashkent Region"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">First KG Rate (UZS) *</label>
                <input
                  type="number"
                  value={formData.firstKg}
                  onChange={(e) => setFormData({ ...formData, firstKg: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 15000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Additional KG Rate (UZS)</label>
                <input
                  type="number"
                  value={formData.additionalKg}
                  onChange={(e) => setFormData({ ...formData, additionalKg: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 5000 (0 for flat rate)"
                />
              </div>

              <div className="col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  {editingRate ? 'Update Rate' : 'Add Rate'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRate(null);
                    setFormData({ courier: '', state: '', firstKg: '', additionalKg: '' });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {Object.keys(groupedRates).length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Truck className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No shipping rates configured</p>
            </div>
          ) : (
            Object.entries(groupedRates).map(([courier, rates]) => (
              <div key={courier} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                  <Truck className="w-6 h-6 text-accent" />
                  <h3 className="text-xl font-bold text-gray-800">{courier}</h3>
                </div>

                <div className="grid gap-3">
                  {rates.map((rate) => (
                    <div key={rate.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 mb-2">{rate.state}</p>
                        <div className="flex gap-6 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">First KG:</span> {formatPrice(rate.firstKg)}
                          </div>
                          <div>
                            <span className="font-medium">Additional KG:</span> {rate.additionalKg > 0 ? formatPrice(rate.additionalKg) : 'Flat rate'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(rate)}
                          className="text-accent p-2 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rate.id)}
                          className="text-error p-2 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function SettingsContent() {
    return <div className="bg-white rounded-lg shadow p-6">Settings panel coming soon...</div>;
  }

  // Stat Card Component
  function StatCard({ title, value, icon: Icon, color, bgColor }) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  }
};

export default DesktopAdminPanel;