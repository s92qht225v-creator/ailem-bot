import { useState, useEffect } from 'react';
import {
  Users,
  Download,
  Search,
  Phone,
  ShoppingBag,
  DollarSign,
  Calendar,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { walkInCustomersAPI } from '../../../services/api';
import { formatPrice, formatDate } from '../../../utils/helpers';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

const WalkInCustomersSection = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    console.log('🔄 Loading walk-in customers...');
    setLoading(true);
    try {
      const data = await walkInCustomersAPI.getAll();
      console.log('✅ Walk-in customers loaded:', data);
      setCustomers(data || []);
    } catch (error) {
      console.error('❌ Failed to load customers:', error);
      toast.error('Mijozlarni yuklashda xatolik');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers by search
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  });

  // Export to CSV
  const exportToCSV = () => {
    if (customers.length === 0) {
      toast.warning('Eksport qilish uchun mijozlar yo\'q');
      return;
    }

    const headers = ['Ism', 'Telefon', 'Buyurtmalar soni', 'Jami xarid', 'Izoh', 'Qo\'shilgan sana'];
    const rows = customers.map(c => [
      c.name,
      c.phone,
      c.total_orders || 0,
      c.total_spent || 0,
      c.notes || '',
      c.created_at ? new Date(c.created_at).toLocaleDateString('uz-UZ') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mijozlar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`${customers.length} ta mijoz eksport qilindi`);
  };

  // Export for SMS (just phone numbers)
  const exportPhoneNumbers = () => {
    if (customers.length === 0) {
      toast.warning('Eksport qilish uchun mijozlar yo\'q');
      return;
    }

    const phones = customers
      .map(c => c.phone)
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([phones], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `telefon_raqamlar_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    toast.success(`${customers.length} ta telefon raqam eksport qilindi`);
  };

  // Delete customer
  const handleDelete = async (customer) => {
    const confirmed = await confirm({
      title: 'Mijozni o\'chirish',
      message: `"${customer.name}" ni o'chirmoqchimisiz?`,
      type: 'danger',
      confirmText: 'O\'chirish',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      try {
        await walkInCustomersAPI.delete(customer.id);
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        toast.success('Mijoz o\'chirildi');
      } catch (error) {
        console.error('Failed to delete customer:', error);
        toast.error('Mijozni o\'chirishda xatolik');
      }
    }
  };

  // Edit customer
  const startEdit = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingCustomer(null);
    setEditForm({ name: '', phone: '', notes: '' });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error('Ism va telefon raqamini kiriting');
      return;
    }

    try {
      const updated = await walkInCustomersAPI.update(editingCustomer.id, editForm);
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...updated } : c));
      setEditingCustomer(null);
      toast.success('Mijoz yangilandi');
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast.error(error.message || 'Mijozni yangilashda xatolik');
    }
  };

  // Stats
  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const totalSpent = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Do'kon mijozlari
          </h3>
          <div className="flex gap-2">
            <button
              onClick={loadCustomers}
              disabled={loading}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
            <div className="relative group">
              <button className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Eksport
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  CSV (Excel uchun)
                </button>
                <button
                  onClick={exportPhoneNumbers}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-t"
                >
                  Telefon raqamlar (SMS)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Users className="w-4 h-4" />
              Jami mijozlar
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{totalCustomers}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <ShoppingBag className="w-4 h-4" />
              Jami buyurtmalar
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{totalOrders}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 text-sm">
              <DollarSign className="w-4 h-4" />
              Jami savdo
            </div>
            <p className="text-2xl font-bold text-purple-700 mt-1">{formatPrice(totalSpent)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ism</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyurtmalar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jami xarid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qo'shilgan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Yuklanmoqda...</p>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'Mijoz topilmadi' : 'Hali mijozlar yo\'q'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    {customer.notes && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{customer.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      <ShoppingBag className="w-3 h-3" />
                      {customer.total_orders || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatPrice(customer.total_spent || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {customer.created_at ? formatDate(customer.created_at) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(customer)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mijozni tahrirlash</h3>
              <button onClick={cancelEdit} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkInCustomersSection;
