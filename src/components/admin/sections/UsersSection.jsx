import { useState, useContext } from 'react';
import { Users as UsersIcon, TrendingUp, ShoppingBag, ChevronRight, Download, UserCog, Store, Plus, Minus } from 'lucide-react';
import { AdminContext } from '../../../context/AdminContext';
import { formatDate } from '../../../utils/helpers';
import { exportUsers } from '../../../utils/csvExport';
import { usersAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { logAuditAction, AUDIT_ACTIONS } from '../../../services/auditLog';

const UsersSection = () => {
  const { users, refreshUsers, updateUserBonusPoints } = useContext(AdminContext);
  const toast = useToast();
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingRole, setUpdatingRole] = useState(null);
  const [bonusEditUser, setBonusEditUser] = useState(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [updatingBonus, setUpdatingBonus] = useState(false);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const cashierCount = users.filter(u => u.role === 'cashier').length;

  const handleRoleChange = async (userId, newRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const oldRole = user.role || 'customer';
    if (oldRole === newRole) return;

    setUpdatingRole(userId);
    try {
      await usersAPI.updateRole(userId, newRole);

      // Log the action
      await logAuditAction({
        action: AUDIT_ACTIONS.USER_UPDATE,
        entityType: 'user',
        entityId: userId,
        oldData: { role: oldRole },
        newData: { role: newRole },
        metadata: { userName: user.name }
      });

      toast.success(`${user.name} endi ${newRole === 'cashier' ? 'kassir' : 'mijoz'}`);

      // Refresh users list
      if (refreshUsers) {
        await refreshUsers();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error(`Rolni yangilashda xatolik: ${error.message}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleBonusUpdate = async (userId, delta) => {
    const amount = parseInt(bonusAmount);
    if (!amount || amount <= 0) {
      toast.error('Miqdorni kiriting');
      return;
    }
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const actualDelta = delta === 'add' ? amount : -amount;
    const currentPoints = user.bonusPoints || 0;
    if (delta === 'deduct' && amount > currentPoints) {
      toast.error(`Foydalanuvchida faqat ${currentPoints} ball bor`);
      return;
    }

    setUpdatingBonus(true);
    try {
      await updateUserBonusPoints(userId, actualDelta);
      toast.success(`${user.name}: ${delta === 'add' ? '+' : '-'}${amount} ball`);
      setBonusEditUser(null);
      setBonusAmount('');
    } catch (error) {
      console.error('Failed to update bonus points:', error);
      toast.error('Ballni yangilashda xatolik');
    } finally {
      setUpdatingBonus(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'cashier':
        return (
          <span className="a-pill a-pill-ok">
            <Store className="w-3 h-3" />
            Kassir
          </span>
        );
      default:
        return (
          <span className="a-pill a-pill-info">
            Mijoz
          </span>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650 }}>Foydalanuvchilarni boshqarish</h3>
        <button
          onClick={() => exportUsers(users)}
          className="a-btn"
        >
          <Download className="w-4 h-4" />
          CSV yuklab olish
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Ism, foydalanuvchi nomi, telefon yoki email bo'yicha qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="a-input flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="a-input"
        >
          <option value="all">Barcha rollar</option>
          <option value="customer">Mijozlar</option>
          <option value="cashier">Kassirlar</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="a-kpi">
          <div className="flex items-center justify-between">
            <div>
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>Jami foydalanuvchilar</p>
              <p className="a-kpi-val">{users.length}</p>
            </div>
            <div className="a-kpi-ico text-indigo-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="a-kpi">
          <div className="flex items-center justify-between">
            <div>
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>Kassirlar</p>
              <p className="a-kpi-val">{cashierCount}</p>
            </div>
            <div className="a-kpi-ico text-green-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
              <Store className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="a-kpi">
          <div className="flex items-center justify-between">
            <div>
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>Bugun faol</p>
              <p className="a-kpi-val">-</p>
            </div>
            <div className="a-kpi-ico" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="a-kpi">
          <div className="flex items-center justify-between">
            <div>
              <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>Buyurtmali</p>
              <p className="a-kpi-val">{users.filter(u => u.totalOrders > 0).length}</p>
            </div>
            <div className="a-kpi-ico text-orange-500" style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="a-card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(to bottom right, var(--info), var(--accent-ink))' }}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user.name}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="a-faint" style={{ fontSize: 13, margin: 0 }}>@{user.username || 'Foydalanuvchi nomi yo\'q'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="a-faint" style={{ fontSize: 13 }}>Bonus ballari</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setBonusEditUser(bonusEditUser === user.id ? null : user.id);
                            setBonusAmount('');
                          }}
                          className="a-num cursor-pointer"
                          style={{ fontSize: 20, fontWeight: 700, color: 'var(--info)' }}
                          title="Ballni o'zgartirish"
                        >
                          {user.bonusPoints || 0}
                        </button>
                      </div>
                      {bonusEditUser === user.id && (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min="1"
                            value={bonusAmount}
                            onChange={(e) => setBonusAmount(e.target.value)}
                            placeholder="0"
                            className="a-input text-center"
                            style={{ width: 80, padding: '4px 8px' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleBonusUpdate(user.id, 'add')}
                            disabled={updatingBonus}
                            className="p-1 rounded disabled:opacity-50"
                            style={{ color: 'var(--ok)', background: 'var(--ok-weak)' }}
                            title="Qo'shish"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBonusUpdate(user.id, 'deduct')}
                            disabled={updatingBonus}
                            className="p-1 rounded disabled:opacity-50"
                            style={{ color: 'var(--danger)', background: 'var(--danger-weak)' }}
                            title="Ayirish"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="a-faint" style={{ fontSize: 13 }}>Buyurtmalar</p>
                      <p className="a-num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{user.totalOrders || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Telefon</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{user.phone || 'Kiritilmagan'}</p>
                  </div>
                  <div>
                    <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Email</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{user.email || 'Kiritilmagan'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="a-btn flex-1"
                    style={{ justifyContent: 'center' }}
                  >
                    {expandedUser === user.id ? 'Tafsilotlarni yashirish' : 'Tafsilotlarni ko\'rsatish'}
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedUser === user.id ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Role Management */}
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 a-faint" />
                    <select
                      value={user.role || 'customer'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRole === user.id}
                      className={`a-input ${updatingRole === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="customer">Mijoz</option>
                      <option value="cashier">Kassir</option>
                    </select>
                  </div>
                </div>

                {expandedUser === user.id && (
                  <div className="mt-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Telegram ID</p>
                        <p className="a-num" style={{ fontSize: 13, color: 'var(--text)', margin: 0, fontFamily: 'ui-monospace,Menlo,monospace' }}>{user.telegramId || user.telegram_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Taklif kodi</p>
                        <p className="a-num" style={{ fontSize: 13, color: 'var(--text)', margin: 0, fontFamily: 'ui-monospace,Menlo,monospace' }}>{user.referralCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Kim taklif qilgan</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{user.referredBy || 'Yo\'q'}</p>
                      </div>
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Takliflar soni</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{user.referrals || 0}</p>
                      </div>
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Qo'shilgan sana</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{formatDate(user.createdAt)}</p>
                      </div>
                      <div>
                        <p className="a-faint" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>Oxirgi yangilanish</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{formatDate(user.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="a-card p-12 text-center">
          <UsersIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-3)' }} />
          <h3 className="a-muted" style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>
            {searchQuery ? 'Foydalanuvchi topilmadi' : 'Hozircha foydalanuvchilar yo\'q'}
          </h3>
          <p className="a-faint">
            {searchQuery ? 'Boshqa qidiruv so\'rovini kiriting' : 'Foydalanuvchilar ro\'yxatdan o\'tganda shu yerda ko\'rinadi'}
          </p>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
