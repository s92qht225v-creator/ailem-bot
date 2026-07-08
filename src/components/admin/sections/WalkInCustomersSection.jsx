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
    <div className="a-card">
      <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="a-muted flex items-center gap-2" style={{ fontSize: 16, fontWeight: 650 }}>
            <Users className="w-5 h-5" />
            Do'kon mijozlari
          </h3>
          <div className="flex gap-2">
            <button
              onClick={loadCustomers}
              disabled={loading}
              className="a-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
            <div className="relative group">
              <button className="a-btn a-btn-primary" style={{ background: 'var(--ok)', borderColor: 'var(--ok)' }}>
                <Download className="w-4 h-4" />
                Eksport
              </button>
              <div className="absolute right-0 mt-1 w-48 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                <button
                  onClick={exportToCSV}
                  className="a-muted w-full px-4 py-2 text-left text-sm"
                >
                  CSV (Excel uchun)
                </button>
                <button
                  onClick={exportPhoneNumbers}
                  className="a-muted w-full px-4 py-2 text-left text-sm"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  Telefon raqamlar (SMS)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
              <Users className="w-4 h-4" />
              Jami mijozlar
            </div>
            <p className="a-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--info)', marginTop: 4 }}>{totalCustomers}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ok)' }}>
              <ShoppingBag className="w-4 h-4" />
              Jami buyurtmalar
            </div>
            <p className="a-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ok)', marginTop: 4 }}>{totalOrders}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <DollarSign className="w-4 h-4" />
              Jami savdo
            </div>
            <p className="a-num text-purple-600" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatPrice(totalSpent)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            className="a-input w-full"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="a-table">
          <thead>
            <tr>
              <th>Ism</th>
              <th>Telefon</th>
              <th>Buyurtmalar</th>
              <th>Jami xarid</th>
              <th>Qo'shilgan</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-3)' }} />
                  <p className="a-faint mt-2">Yuklanmoqda...</p>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" className="a-faint px-6 py-12 text-center">
                  {searchQuery ? 'Mijoz topilmadi' : 'Hali mijozlar yo\'q'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{customer.name}</div>
                    {customer.notes && (
                      <div className="a-faint truncate max-w-[200px]" style={{ fontSize: 12 }}>{customer.notes}</div>
                    )}
                  </td>
                  <td>
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </a>
                  </td>
                  <td>
                    <span className="a-pill a-pill-info">
                      <ShoppingBag className="w-3 h-3" />
                      {customer.total_orders || 0}
                    </span>
                  </td>
                  <td className="a-num" style={{ fontWeight: 500, color: 'var(--text)' }}>
                    {formatPrice(customer.total_spent || 0)}
                  </td>
                  <td className="a-faint">
                    {customer.created_at ? formatDate(customer.created_at) : '-'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(customer)}
                        className="p-1.5 rounded"
                        style={{ color: 'var(--accent)' }}
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1.5 rounded"
                        style={{ color: 'var(--danger)' }}
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
          <div className="a-card max-w-md w-full">
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650 }}>Mijozni tahrirlash</h3>
              <button onClick={cancelEdit} className="a-muted p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="a-muted block text-sm font-medium mb-1">Ism</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="a-input w-full"
                />
              </div>
              <div>
                <label className="a-muted block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="a-input w-full"
                />
              </div>
              <div>
                <label className="a-muted block text-sm font-medium mb-1">Izoh</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="a-input w-full"
                />
              </div>
            </div>
            <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={cancelEdit}
                className="a-btn"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveEdit}
                className="a-btn a-btn-primary"
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
