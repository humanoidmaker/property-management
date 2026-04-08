import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Lease, Property, Tenant, Unit } from '../types';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate, statusColor } from '../utils/utils';
import toast from 'react-hot-toast';

export default function Leases() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [expiring, setExpiring] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ property_id: '', unit_number: '', tenant_id: '', start_date: '', end_date: '', rent_amount: 0, deposit_amount: 0, terms: '' });

  const fetchData = () => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([
      api.get('/leases', { params }),
      api.get('/leases/expiring-soon'),
    ]).then(([lr, er]) => {
      setLeases(lr.data);
      setExpiring(er.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/properties').then((r) => setProperties(r.data));
    api.get('/tenants').then((r) => setTenants(r.data));
  }, []);

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handlePropertyChange = async (pid: string) => {
    setForm({ ...form, property_id: pid, unit_number: '' });
    if (pid) {
      const r = await api.get(`/units/property/${pid}`);
      setUnits(r.data.filter((u: Unit) => u.status === 'vacant'));
    } else {
      setUnits([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leases', { ...form, rent_amount: Number(form.rent_amount), deposit_amount: Number(form.deposit_amount) });
      toast.success('Lease created');
      setShowCreate(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm('Terminate this lease?')) return;
    try {
      await api.put(`/leases/${id}/terminate`);
      toast.success('Lease terminated');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ property_id: '', unit_number: '', tenant_id: '', start_date: '', end_date: '', rent_amount: 0, deposit_amount: 0, terms: '' }); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> New Lease
        </button>
      </div>

      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="font-medium text-amber-800">Expiring Soon ({expiring.length})</span></div>
          <div className="space-y-1">
            {expiring.map((l) => (
              <div key={l._id} className="text-sm text-amber-700">{l.tenant_name} - {l.property_name} Unit {l.unit_number} (expires {l.end_date})</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {['', 'active', 'terminated'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Tenant</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Property</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Unit</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Rent</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Start</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">End</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                <th className="text-right py-3 px-2 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{l.tenant_name || '-'}</td>
                  <td className="py-3 px-2">{l.property_name || '-'}</td>
                  <td className="py-3 px-2">{l.unit_number}</td>
                  <td className="py-3 px-2">{formatCurrency(l.rent_amount)}</td>
                  <td className="py-3 px-2">{l.start_date}</td>
                  <td className="py-3 px-2">{l.end_date}</td>
                  <td className="py-3 px-2"><span className={`badge ${statusColor(l.status)}`}>{l.status}</span></td>
                  <td className="py-3 px-2 text-right">
                    {l.status === 'active' && (
                      <button className="text-xs text-red-600 hover:underline" onClick={() => handleTerminate(l._id)}>Terminate</button>
                    )}
                  </td>
                </tr>
              ))}
              {leases.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-10">No leases found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">New Lease</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="label">Property</label><select className="input" value={form.property_id} onChange={(e) => handlePropertyChange(e.target.value)} required><option value="">Select Property</option>{properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
              <div><label className="label">Unit (Vacant Only)</label><select className="input" value={form.unit_number} onChange={(e) => { const u = units.find((x) => x.unit_number === e.target.value); setForm({ ...form, unit_number: e.target.value, rent_amount: u?.rent_amount || 0, deposit_amount: u?.deposit_amount || 0 }); }} required><option value="">Select Unit</option>{units.map((u) => <option key={u._id} value={u.unit_number}>{u.unit_number} ({formatCurrency(u.rent_amount)})</option>)}</select></div>
              <div><label className="label">Tenant</label><select className="input" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required><option value="">Select Tenant</option>{tenants.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.phone})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
                <div><label className="label">End Date</label><input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Rent Amount</label><input type="number" className="input" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: parseInt(e.target.value) || 0 })} required /></div>
                <div><label className="label">Deposit Amount</label><input type="number" className="input" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div><label className="label">Terms</label><textarea className="input" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Lease</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
