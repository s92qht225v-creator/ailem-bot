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

const DesktopAdminPanel = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { products, categories, orders, reviews, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory } = useContext(AdminContext);

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

    const handleImageUpload = async (e, isMainImage) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingImage(true);
        console.log('📤 Uploading image to Supabase...');

        // Import storageAPI
        const { storageAPI } = await import('../../services/api');
        const result = await storageAPI.uploadProductImage(file);

        console.log('✅ Image uploaded:', result.url);

        if (isMainImage) {
          setFormData(prev => ({ ...prev, imageUrl: result.url }));
        } else {
          // Add to additional images
          setFormData(prev => ({
            ...prev,
            additionalImages: prev.additionalImages
              ? `${prev.additionalImages}, ${result.url}`
              : result.url
          }));
        }
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
        // Reset file input
        e.target.value = '';
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        // Prepare product data in app format (API will handle database conversion)
        const productData = {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.salePrice || formData.price), // Use sale price if available, otherwise regular price
          originalPrice: formData.salePrice ? parseFloat(formData.price) : null, // Original price only if there's a sale
          category: formData.category,  // Use category (API converts to category_name)
          imageUrl: formData.imageUrl,  // Use imageUrl (API converts to image)
          images: formData.additionalImages ? [formData.imageUrl, ...formData.additionalImages.split(',').map(url => url.trim()).filter(url => url)] : [formData.imageUrl],
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
                  onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="White, Gray, Navy Blue (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Twin, Full, Queen, King (comma separated)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Main Product Image *</label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div>
                    <label className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image from Device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* URL Input */}
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Paste image URL (https://...)"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Upload from device or paste direct image link
                  </p>

                  {/* Image Preview */}
                  {formData.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Images (Optional)</label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div>
                    <label className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2">
                      <Upload className="w-5 h-5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload More Images'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* URL Input */}
                  <input
                    type="text"
                    value={formData.additionalImages}
                    onChange={(e) => setFormData({ ...formData, additionalImages: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Paste URLs separated by commas"
                  />
                  <p className="text-xs text-gray-500">Upload multiple images or paste URLs (comma separated)</p>
                </div>
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
      image: '',
      icon: ''
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
          image: formData.image || null,
          icon: formData.icon || null
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
        setFormData({ name: '', image: '', icon: '' });
      } catch (error) {
        console.error('❌ Failed to save category:', error);
        alert('Failed to save category. Please try again.');
      }
    };

    const handleEdit = (category) => {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image: category.image || '',
        icon: category.icon || ''
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Icon (Emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="🛏️"
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
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {category.icon || '📷'}
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
    return <div className="bg-white rounded-lg shadow p-6">Reviews management coming soon...</div>;
  }

  function UsersContent() {
    return <div className="bg-white rounded-lg shadow p-6">Users management coming soon...</div>;
  }

  function AnalyticsContent() {
    return <div className="bg-white rounded-lg shadow p-6">Analytics dashboard coming soon...</div>;
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