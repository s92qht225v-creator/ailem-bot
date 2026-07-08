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
    if (action.includes('create')) return 'a-pill-ok';
    if (action.includes('delete')) return 'a-pill-danger';
    if (action.includes('update') || action.includes('toggle')) return 'a-pill-info';
    if (action.includes('approve') || action.includes('deliver')) return 'a-pill-ok';
    if (action.includes('reject')) return 'a-pill-danger';
    if (action.includes('ship')) return 'a-pill-info';
    return 'a-pill-info';
  };

  const entityTypes = [...new Set(Object.values(AUDIT_ACTIONS).map(a => a.split('.')[0]))];

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="a-card" style={{ padding: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg" style={{ fontWeight: 600, color: 'var(--text)' }}>Audit tarixi</h3>
            <p className="text-sm a-muted">Barcha admin amallari va o'zgarishlarni kuzatish</p>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="a-btn"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs mb-1 a-muted" style={{ fontWeight: 500 }}>Amal turi</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              className="a-input"
            >
              <option value="">Barcha amallar</option>
              {Object.values(AUDIT_ACTIONS).map(action => (
                <option key={action} value={action}>{formatAuditAction(action)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 a-muted" style={{ fontWeight: 500 }}>Obyekt turi</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
              className="a-input"
            >
              <option value="">Barcha obyektlar</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 a-muted" style={{ fontWeight: 500 }}>Admin email</label>
            <input
              type="text"
              value={adminFilter}
              onChange={(e) => { setAdminFilter(e.target.value); setPage(0); }}
              placeholder="Adminni qidirish..."
              className="a-input"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 a-muted" style={{ fontWeight: 500 }}>Sanadan</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="a-input"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 a-muted" style={{ fontWeight: 500 }}>Sanagacha</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="a-input"
            />
          </div>
        </div>

        {(actionFilter || entityFilter || adminFilter || dateFrom || dateTo) && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm a-muted">
              {totalCount} tadan {logs.length} ta ko'rsatilmoqda
            </span>
            <button
              onClick={clearFilters}
              className="text-sm"
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Barcha filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="a-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RotateCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 a-faint">
            <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p>Audit yozuvlari topilmadi</p>
            <p className="text-sm mt-1">audit_logs jadvali yaratilgach admin amallari shu yerda ko'rinadi</p>
          </div>
        ) : (
          <>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Amal</th>
                  <th>Obyekt</th>
                  <th>Admin</th>
                  <th>Tafsilotlar</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <>
                    <tr key={log.id}>
                      <td className="text-sm a-muted">
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <span className={`a-pill ${getActionColor(log.action)}`}>
                          {formatAuditAction(log.action)}
                        </span>
                      </td>
                      <td className="text-sm">
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{log.entity_type}</span>
                        <span className="a-faint ml-1">#{log.entity_id?.slice(0, 8)}</span>
                      </td>
                      <td className="text-sm a-muted">
                        {log.admin_email}
                      </td>
                      <td>
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="flex items-center gap-1 text-sm"
                          style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {expandedLog === log.id ? 'Yashirish' : 'Ko\'rish'}
                          {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr key={`${log.id}-details`}>
                        <td colSpan="5" style={{ background: 'var(--surface-2)' }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.old_data && (
                              <div>
                                <h4 className="text-xs mb-2" style={{ fontWeight: 600, color: 'var(--text-2)' }}>Oldingi holat</h4>
                                <pre className="text-xs overflow-auto max-h-48" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)', padding: 12, color: 'var(--text)' }}>
                                  {JSON.stringify(JSON.parse(log.old_data), null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_data && (
                              <div>
                                <h4 className="text-xs mb-2" style={{ fontWeight: 600, color: 'var(--text-2)' }}>Yangi holat</h4>
                                <pre className="text-xs overflow-auto max-h-48" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)', padding: 12, color: 'var(--text)' }}>
                                  {JSON.stringify(JSON.parse(log.new_data), null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.metadata && log.metadata !== '{}' && (
                              <div className={log.old_data || log.new_data ? 'md:col-span-2' : ''}>
                                <h4 className="text-xs mb-2" style={{ fontWeight: 600, color: 'var(--text-2)' }}>Metadata</h4>
                                <pre className="text-xs overflow-auto max-h-48" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--a-r-sm)', padding: 12, color: 'var(--text)' }}>
                                  {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="md:col-span-2 text-xs a-faint">
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
              <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <span className="text-sm a-muted">
                  {totalPages} sahifadan {page + 1}-sahifa
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="a-btn"
                  >
                    Oldingi
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="a-btn"
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
