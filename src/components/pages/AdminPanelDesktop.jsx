import { useState } from 'react';
import { Shield, BarChart3, Package, ShoppingBag, Users, Star, MapPin, Truck, Settings, Gift } from 'lucide-react';
import AdminPanel from './AdminPanel';

const AdminPanelDesktop = () => {
  const [activeSection, setActiveSection] = useState('analytics');

  const menuItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      section: 'analytics',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      subsections: [
        { id: 'orders-pending', label: 'Pending', badge: 'pending' },
        { id: 'orders-approved', label: 'Approved', badge: 'approved' },
        { id: 'orders-shipped', label: 'Shipped', badge: 'shipped' },
        { id: 'orders-delivered', label: 'Delivered', badge: 'delivered' },
        { id: 'orders-rejected', label: 'Rejected', badge: 'rejected' }
      ]
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      subsections: [
        { id: 'products-manage', label: 'Manage Products' },
        { id: 'products-add', label: 'Add Product' },
        { id: 'categories-manage', label: 'Manage Categories' },
        { id: 'categories-add', label: 'Add Category' }
      ]
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: Star,
      subsections: [
        { id: 'reviews-pending', label: 'Pending Reviews' },
        { id: 'reviews-approved', label: 'Approved Reviews' }
      ]
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      subsections: [
        { id: 'users-manage', label: 'Manage Users' },
        { id: 'users-referrals', label: 'Referral Settings' }
      ]
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: Truck,
      subsections: [
        { id: 'pickup-points', label: 'Pickup Points' },
        { id: 'shipping-rates', label: 'Shipping Rates' }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      subsections: [
        { id: 'promotions-upload', label: 'App Settings' }
      ]
    }
  ];

  const [expandedMenu, setExpandedMenu] = useState('orders');

  const toggleMenu = (menuId) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-gray-700 text-white p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Admin Panel</h2>
              <p className="text-xs opacity-90">Ailem Store</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {menuItems.map((item) => (
            <div key={item.id} className="mb-2">
              {item.subsections ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      expandedMenu === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        expandedMenu === item.id ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {expandedMenu === item.id && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subsections.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSection(sub.id)}
                          className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                            activeSection === sub.id
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setActiveSection(item.section)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.section
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>Ailem Admin v1.0</p>
            <p className="mt-1">Desktop View</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Pass active section to AdminPanel as a forced section */}
        <AdminPanelContentWrapper activeSection={activeSection} />
      </div>
    </div>
  );
};

// Wrapper component that forces AdminPanel into a specific section
const AdminPanelContentWrapper = ({ activeSection }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <AdminPanelContent section={activeSection} />
      </div>
    </div>
  );
};

// Import section components from AdminPanel
const AdminPanelContent = ({ section }) => {
  // This will render the appropriate tab based on section
  // We'll need to expose the tab components from AdminPanel
  return (
    <div className="min-h-screen">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 capitalize">
        {section?.replace('-', ' ') || 'Analytics'}
      </h2>
      <div className="text-gray-600">
        {/* Content for {section} will be rendered here */}
        <p>Section: {section}</p>
        <p className="mt-4 text-sm">
          This is the desktop layout. The mobile AdminPanel component needs to be refactored
          to export individual tab components that can be used here.
        </p>
      </div>
    </div>
  );
};

export default AdminPanelDesktop;
