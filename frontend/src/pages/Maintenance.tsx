import { useEffect, useState } from 'react';
import api from '../utils/api';
import { MaintenanceRequest, MaintenanceStats, Property, Lease } from '../types';
import { Plus, X, Wrench } from 'lucide-react';
import { formatDate, statusColor, priorityColor } from '../utils/utils';
import toast from 'react-hot-toast';

export default function Maintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ property_id: '', unit_number: '', tenant_id: '', title: '', description: '', priority: 'medium', category: 'other' });

  const fetchData = () => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([
      api.get('/maintenance', { params }),
      api.get('/maintenance/stats'),
    ]).then(([rr, sr]) => {
      setRequests(rr.data);
      setStats(sr.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/properties').then((r) => setProperties(r.data));
    api.get('/leases', { params: { status: 'active' } }).then((r) => setLeases(r.data));
  }, []);

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/maintenance', form);
      toast.success('Request created');
      setShowCreate(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.put(`/maintenance/${id}/status`, { status });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ property_id: '', unit_number: '', tenant_id: '', title: '', description: '', priority: 'medium', category: 'other' }); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-gray-500">Total</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-orange-500">{stats.open}</div><div className="text-xs text-gray-500">Open</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-blue-500">{stats.in_progress}</div><div className="text-xs text-gray-500">In Progress</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-green-500">{stats.resolved}</div><div className="text-xs text-gray-500">Resolved</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-red-500">{stats.urgent}</div><div className="text-xs text-gray-500">Urgent</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-amber-500">{stats.high_priority}</div><div className="text-xs text-gray-500">High Priority</div></div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'in_progress', 'resolved'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            {s ? s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id} className="card flex items-start gap-4">
              <div className={`p-2 rounded-lg ${r.priority === 'urgent' ? 'bg-red-100' : r.priority === 'high' ? 'bg-amber-100' : r.priority === 'medium' ? 'bg-blue-100' : 'bg-green-100'}`}>
                <Wrench className={`w-5 h-5 ${r.priority === 'urgent' ? 'text-red-600' : r.priority === 'high' ? 'text-amber-600' : r.priority === 'medium' ? 'text-blue-600' : 'text-green-600'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{r.title}</h3>
                    <p className="text-sm text-gray-500">{r.property_name} - Unit {r.unit_number} {r.tenant_name ? `(${r.tenant_name})` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`badge ${priorityColor(r.priority)}`}>{r.priority}</span>
                    <span className={`badge ${statusColor(r.status)}`}>{r.status.replace('_', ' ')}</span>
                  </div>
                </div>
                {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-400">Category: {r.category}</span>
                  <span className="text-xs text-gray-400">Created: {formatDate(r.created_at)}</span>
                  {r.status !== 'resolved' && (
                    <div className="flex gap-2 ml-auto">
                      {r.status === 'open' && <button className="text-xs text-blue-600 hover:underline" onClick={() => handleStatusUpdate(r._id, 'in_progress')}>Start</button>}
                      {r.status === 'in_progress' && <button className="text-xs text-green-600 hover:underline" onClick={() => handleStatusUpdate(r._id, 'resolved')}>Resolve</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && <div className="text-center text-gray-400 py-10">No maintenance requests</div>}
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">New Maintenance Request</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="label">Lease (Property/Unit/Tenant)</label>
                <select className="input" onChange={(e) => {
                  const lease = leases.find((l) => l._id === e.target.value);
                  if (lease) setForm({ ...form, property_id: lease.property_id, unit_number: lease.unit_number, tenant_id: lease.tenant_id });
                }} required>
                  <option value="">Select</option>
                  {leases.map((l) => <option key={l._id} value={l._id}>{l.property_name} - {l.unit_number} ({l.tenant_name})</option>)}
                </select>
              </div>
              <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="carpentry">Carpentry</option><option value="painting">Painting</option><option value="other">Other</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
