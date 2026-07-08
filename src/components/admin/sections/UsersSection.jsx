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
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <Store className="w-3 h-3" />
            Kassir
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            Mijoz
          </span>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Foydalanuvchilarni boshqarish</h3>
        <button
          onClick={() => exportUsers(users)}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
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
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
        >
          <option value="all">Barcha rollar</option>
          <option value="customer">Mijozlar</option>
          <option value="cashier">Kassirlar</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Jami foydalanuvchilar</p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <UsersIcon className="w-12 h-12 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Kassirlar</p>
              <p className="text-3xl font-bold text-gray-900">{cashierCount}</p>
            </div>
            <Store className="w-12 h-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Bugun faol</p>
              <p className="text-3xl font-bold text-gray-900">-</p>
            </div>
            <TrendingUp className="w-12 h-12 text-accent" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Buyurtmali</p>
              <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.totalOrders > 0).length}</p>
            </div>
            <ShoppingBag className="w-12 h-12 text-orange-500" />
          </div>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-gray-500">@{user.username || 'Foydalanuvchi nomi yo\'q'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Bonus ballari</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setBonusEditUser(bonusEditUser === user.id ? null : user.id);
                            setBonusAmount('');
                          }}
                          className="text-xl font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
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
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            autoFocus
                          />
                          <button
                            onClick={() => handleBonusUpdate(user.id, 'add')}
                            disabled={updatingBonus}
                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                            title="Qo'shish"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBonusUpdate(user.id, 'deduct')}
                            disabled={updatingBonus}
                            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                            title="Ayirish"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Buyurtmalar</p>
                      <p className="text-xl font-bold text-gray-900">{user.totalOrders || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Telefon</p>
                    <p className="text-sm text-gray-900">{user.phone || 'Kiritilmagan'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                    <p className="text-sm text-gray-900">{user.email || 'Kiritilmagan'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {expandedUser === user.id ? 'Tafsilotlarni yashirish' : 'Tafsilotlarni ko\'rsatish'}
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedUser === user.id ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Role Management */}
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-gray-400" />
                    <select
                      value={user.role || 'customer'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingRole === user.id}
                      className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary bg-white ${
                        updatingRole === user.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="customer">Mijoz</option>
                      <option value="cashier">Kassir</option>
                    </select>
                  </div>
                </div>

                {expandedUser === user.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Telegram ID</p>
                        <p className="text-sm text-gray-900 font-mono">{user.telegramId || user.telegram_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Taklif kodi</p>
                        <p className="text-sm text-gray-900 font-mono">{user.referralCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Kim taklif qilgan</p>
                        <p className="text-sm text-gray-900">{user.referredBy || 'Yo\'q'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Takliflar soni</p>
                        <p className="text-sm text-gray-900">{user.referrals || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Qo'shilgan sana</p>
                        <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Oxirgi yangilanish</p>
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
            {searchQuery ? 'Foydalanuvchi topilmadi' : 'Hozircha foydalanuvchilar yo\'q'}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? 'Boshqa qidiruv so\'rovini kiriting' : 'Foydalanuvchilar ro\'yxatdan o\'tganda shu yerda ko\'rinadi'}
          </p>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
