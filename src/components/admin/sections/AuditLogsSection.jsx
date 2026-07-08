import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Activity, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { auditLogsAPI, formatAuditAction, AUDIT_ACTIONS } from '../../../services/auditLog';
import { formatDate } from '../../../utils/helpers';

const AuditLogsSection = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedLog, setExpandedLog] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pageSize = 25;

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter, adminFilter, dateFrom, dateTo]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = auditLogsAPI.getAll({
        limit: pageSize,
        offset: page * pageSize,
        action: actionFilter || null,
        entityType: entityFilter || null,
        adminEmail: adminFilter || null,
        startDate: dateFrom || null,
        endDate: dateTo ? dateTo + 'T23:59:59' : null
      });

      const { data, count } = await Promise.race([fetchPromise, timeoutPromise]);
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setAdminFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('update') || action.includes('toggle')) return 'bg-blue-100 text-blue-800';
    if (action.includes('approve') || action.includes('deliver')) return 'bg-purple-100 text-purple-800';
    if (action.includes('reject')) return 'bg-orange-100 text-orange-800';
    if (action.includes('ship')) return 'bg-cyan-100 text-cyan-800';
    return 'bg-gray-100 text-gray-800';
  };

  const entityTypes = [...new Set(Object.values(AUDIT_ACTIONS).map(a => a.split('.')[0]))];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Audit tarixi</h3>
            <p className="text-sm text-gray-600">Barcha admin amallari va o'zgarishlarni kuzatish</p>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amal turi</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">Barcha amallar</option>
              {Object.values(AUDIT_ACTIONS).map(action => (
                <option key={action} value={action}>{formatAuditAction(action)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Obyekt turi</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">Barcha obyektlar</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Admin email</label>
            <input
              type="text"
              value={adminFilter}
              onChange={(e) => { setAdminFilter(e.target.value); setPage(0); }}
              placeholder="Adminni qidirish..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sanadan</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sanagacha</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>
        </div>

        {(actionFilter || entityFilter || adminFilter || dateFrom || dateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {totalCount} tadan {logs.length} ta ko'rsatilmoqda
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-accent hover:text-red-800"
            >
              Barcha filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RotateCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Audit yozuvlari topilmadi</p>
            <p className="text-sm mt-1">audit_logs jadvali yaratilgach admin amallari shu yerda ko'rinadi</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vaqt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obyekt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tafsilotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {formatAuditAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-gray-900">{log.entity_type}</span>
                        <span className="text-gray-500 ml-1">#{log.entity_id?.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.admin_email}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-accent hover:text-red-800 flex items-center gap-1 text-sm"
                        >
                          {expandedLog === log.id ? 'Yashirish' : 'Ko\'rish'}
                          {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr key={`${log.id}-details`}>
                        <td colSpan="5" className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.old_data && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Oldingi holat</h4>
                                <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-48">
                                  {JSON.stringify(JSON.parse(log.old_data), null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Yangi holat</h4>
                                <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-48">
                                  {JSON.stringify(JSON.parse(log.new_data), null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.metadata && log.metadata !== '{}' && (
                              <div className={log.old_data || log.new_data ? 'md:col-span-2' : ''}>
                                <h4 className="text-xs font-semibold text-gray-700 mb-2">Metadata</h4>
                                <pre className="bg-white border rounded p-3 text-xs overflow-auto max-h-48">
                                  {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="md:col-span-2 text-xs text-gray-500">
                              <span>Foydalanuvchi agenti: {log.user_agent || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {totalPages} sahifadan {page + 1}-sahifa
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Oldingi
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Keyingi
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogsSection;
