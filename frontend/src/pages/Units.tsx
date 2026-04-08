import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { Unit, Property, Tenant, Lease } from '../types';
import { Plus, X, DoorOpen } from 'lucide-react';
import { formatCurrency, statusColor } from '../utils/utils';
import toast from 'react-hot-toast';

export default function Units() {
  const [searchParams] = useSearchParams();
  const propertyFilter = searchParams.get('property') || '';
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedProperty, setSelectedProperty] = useState(propertyFilter);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<Unit | null>(null);
  const [form, setForm] = useState({ property_id: '', unit_number: '', floor: 0, bedrooms: 1, bathrooms: 1, area_sqft: 0, rent_amount: 0, deposit_amount: 0 });

  const fetchUnits = () => {
    setLoading(true);
    const url = selectedProperty ? `/units/property/${selectedProperty}` : '/units';
    api.get(url).then((r) => setUnits(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/properties').then((r) => setProperties(r.data));
    api.get('/tenants').then((r) => setTenants(r.data));
  }, []);

  useEffect(() => { fetchUnits(); }, [selectedProperty]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/units', { ...form, floor: Number(form.floor), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms), area_sqft: Number(form.area_sqft), rent_amount: Number(form.rent_amount), deposit_amount: Number(form.deposit_amount) });
      toast.success('Unit created');
      setShowDialog(false);
      fetchUnits();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Units</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ property_id: selectedProperty || '', unit_number: '', floor: 0, bedrooms: 1, bathrooms: 1, area_sqft: 0, rent_amount: 0, deposit_amount: 0 }); setShowDialog(true); }}>
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <div className="flex gap-3">
        <select className="input w-auto" value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}>
          <option value="">All Properties</option>
          {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {units.map((unit) => (
            <div key={unit._id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowDetail(unit)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-primary-500" />
                  <span className="font-semibold text-gray-900">{unit.unit_number}</span>
                </div>
                <span className={`badge ${statusColor(unit.status)}`}>{unit.status}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Floor: {unit.floor} | {unit.bedrooms} BHK | {unit.bathrooms} Bath</div>
                <div>Area: {unit.area_sqft} sqft</div>
                <div className="font-medium text-gray-900">{formatCurrency(unit.rent_amount)}/mo</div>
                {unit.tenant_name && <div className="text-primary-500">Tenant: {unit.tenant_name}</div>}
              </div>
            </div>
          ))}
          {units.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">No units found</div>}
        </div>
      )}

      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Unit {showDetail.unit_number}</h2>
              <button onClick={() => setShowDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`badge ${statusColor(showDetail.status)}`}>{showDetail.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Floor</span><span>{showDetail.floor}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bedrooms</span><span>{showDetail.bedrooms}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bathrooms</span><span>{showDetail.bathrooms}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Area</span><span>{showDetail.area_sqft} sqft</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Rent</span><span className="font-medium">{formatCurrency(showDetail.rent_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deposit</span><span>{formatCurrency(showDetail.deposit_amount)}</span></div>
              {showDetail.tenant_name && (
                <>
                  <hr />
                  <div className="flex justify-between"><span className="text-gray-500">Tenant</span><span>{showDetail.tenant_name}</span></div>
                  {showDetail.tenant_phone && <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{showDetail.tenant_phone}</span></div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Unit</h2>
              <button onClick={() => setShowDialog(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div><label className="label">Property</label><select className="input" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} required><option value="">Select Property</option>{properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Unit Number</label><input className="input" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} required /></div>
                <div><label className="label">Floor</label><input type="number" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Bedrooms</label><input type="number" className="input" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">Bathrooms</label><input type="number" className="input" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">Area (sqft)</label><input type="number" className="input" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Rent Amount</label><input type="number" className="input" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: parseInt(e.target.value) || 0 })} required /></div>
                <div><label className="label">Deposit Amount</label><input type="number" className="input" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setShowDialog(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
