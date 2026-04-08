import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Property } from '../types';
import { Plus, Search, Building2, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const typeOptions = ['apartment', 'house', 'commercial', 'villa'];
const typeBadge: Record<string, string> = {
  apartment: 'bg-blue-100 text-blue-800',
  house: 'bg-green-100 text-green-800',
  commercial: 'bg-purple-100 text-purple-800',
  villa: 'bg-amber-100 text-amber-800',
};

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState({ name: '', address: '', type: 'apartment', total_units: 0, description: '', amenities: '' as string, is_active: true });
  const navigate = useNavigate();

  const fetchData = () => {
    const params: any = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    api.get('/properties', { params }).then((r) => setProperties(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search, typeFilter]);

  const openDialog = (prop?: Property) => {
    if (prop) {
      setEditing(prop);
      setForm({ name: prop.name, address: prop.address, type: prop.type, total_units: prop.total_units, description: prop.description, amenities: (prop.amenities || []).join(', '), is_active: prop.is_active });
    } else {
      setEditing(null);
      setForm({ name: '', address: '', type: 'apartment', total_units: 0, description: '', amenities: '', is_active: true });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean), total_units: Number(form.total_units) };
    try {
      if (editing) {
        await api.put(`/properties/${editing._id}`, payload);
        toast.success('Property updated');
      } else {
        await api.post('/properties', payload);
        toast.success('Property created');
      }
      setShowDialog(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this property?')) return;
    try {
      await api.delete(`/properties/${id}`);
      toast.success('Property deleted');
      fetchData();
    } catch { toast.error('Error deleting property'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => openDialog()}>
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-10" placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop) => (
            <div key={prop._id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/units?property=${prop._id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{prop.name}</h3>
                  <p className="text-sm text-gray-500">{prop.address}</p>
                </div>
                <span className={`badge ${typeBadge[prop.type] || 'bg-gray-100 text-gray-800'}`}>{prop.type}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span>Units: {prop.occupied_count}/{prop.units_count}</span>
                <span>Occupancy: {prop.occupancy_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${prop.occupancy_pct}%` }} />
              </div>
              {prop.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {prop.amenities.slice(0, 4).map((a) => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a}</span>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => openDialog(prop)}><Edit className="w-4 h-4 text-gray-500" /></button>
                <button className="p-1.5 hover:bg-red-50 rounded" onClick={() => handleDelete(prop._id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          ))}
          {properties.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">No properties found</div>}
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Property' : 'Add Property'}</h2>
              <button onClick={() => setShowDialog(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{typeOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
                <div><label className="label">Total Units</label><input type="number" className="input" value={form.total_units} onChange={(e) => setForm({ ...form, total_units: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="label">Amenities (comma-separated)</label><input className="input" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="parking, gym, pool" /></div>
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
