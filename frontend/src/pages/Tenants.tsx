import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Tenant } from '../types';
import { Plus, Search, X, Edit, Trash2, User } from 'lucide-react';
import { formatDate } from '../utils/utils';
import toast from 'react-hot-toast';

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<Tenant | null>(null);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', id_proof_type: 'Aadhaar', id_proof_number: '', emergency_contact: '', occupation: '', move_in_date: '' });

  const fetchData = () => {
    const params: any = {};
    if (search) params.search = search;
    api.get('/tenants', { params }).then((r) => setTenants(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search]);

  const openDialog = (tenant?: Tenant) => {
    if (tenant) {
      setEditing(tenant);
      setForm({ name: tenant.name, phone: tenant.phone, email: tenant.email, id_proof_type: tenant.id_proof_type, id_proof_number: tenant.id_proof_number, emergency_contact: tenant.emergency_contact, occupation: tenant.occupation, move_in_date: tenant.move_in_date || '' });
    } else {
      setEditing(null);
      setForm({ name: '', phone: '', email: '', id_proof_type: 'Aadhaar', id_proof_number: '', emergency_contact: '', occupation: '', move_in_date: '' });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/tenants/${editing._id}`, form);
        toast.success('Tenant updated');
      } else {
        await api.post('/tenants', form);
        toast.success('Tenant created');
      }
      setShowDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tenant?')) return;
    try { await api.delete(`/tenants/${id}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Error'); }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get(`/tenants/${id}`);
    setShowDetail(r.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => openDialog()}><Plus className="w-4 h-4" /> Add Tenant</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-10" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Name</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Phone</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Email</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Occupation</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Current Unit</th>
                <th className="text-left py-3 px-2 text-gray-500 font-medium">Move-in</th>
                <th className="text-right py-3 px-2 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => viewDetail(t._id)}>
                  <td className="py-3 px-2 font-medium">{t.name}</td>
                  <td className="py-3 px-2">{t.phone}</td>
                  <td className="py-3 px-2">{t.email}</td>
                  <td className="py-3 px-2">{t.occupation}</td>
                  <td className="py-3 px-2">{t.current_unit || '-'}</td>
                  <td className="py-3 px-2">{formatDate(t.move_in_date)}</td>
                  <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 hover:bg-gray-100 rounded" onClick={() => openDialog(t)}><Edit className="w-4 h-4 text-gray-500" /></button>
                    <button className="p-1 hover:bg-red-50 rounded ml-1" onClick={() => handleDelete(t._id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">No tenants found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{showDetail.name}</h2>
              <button onClick={() => setShowDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Phone:</span> {showDetail.phone}</div>
                <div><span className="text-gray-500">Email:</span> {showDetail.email}</div>
                <div><span className="text-gray-500">ID Proof:</span> {showDetail.id_proof_type} - {showDetail.id_proof_number}</div>
                <div><span className="text-gray-500">Occupation:</span> {showDetail.occupation}</div>
                <div><span className="text-gray-500">Emergency:</span> {showDetail.emergency_contact}</div>
                <div><span className="text-gray-500">Move-in:</span> {formatDate(showDetail.move_in_date)}</div>
              </div>
              {showDetail.active_lease && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Active Lease</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>Unit: {showDetail.active_lease.unit_number}</div>
                    <div>Period: {showDetail.active_lease.start_date} to {showDetail.active_lease.end_date}</div>
                    <div>Rent: {showDetail.active_lease.rent_amount}</div>
                  </div>
                </div>
              )}
              {showDetail.maintenance_requests && showDetail.maintenance_requests.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-800 mb-2">Maintenance Requests</h3>
                  {showDetail.maintenance_requests.map((m) => (
                    <div key={m._id} className="text-sm p-2 border rounded mb-1">
                      <span className="font-medium">{m.title}</span> - <span className={`badge ${m.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Tenant' : 'Add Tenant'}</h2>
              <button onClick={() => setShowDialog(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">ID Proof Type</label><select className="input" value={form.id_proof_type} onChange={(e) => setForm({ ...form, id_proof_type: e.target.value })}><option>Aadhaar</option><option>PAN</option><option>Passport</option><option>Driving License</option></select></div>
                <div><label className="label">ID Proof Number</label><input className="input" value={form.id_proof_number} onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
                <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
              </div>
              <div><label className="label">Move-in Date</label><input type="date" className="input" value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setShowDialog(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
