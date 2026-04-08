import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Payment, Lease, PaymentStats } from '../types';
import { Plus, X, Receipt, Printer, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/utils';
import toast from 'react-hot-toast';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [showReceipt, setShowReceipt] = useState<string | null>(null);
  const [receiptHtml, setReceiptHtml] = useState('');
  const [tab, setTab] = useState<'history' | 'pending'>('history');
  const [form, setForm] = useState({ lease_id: '', amount: 0, month_year: '', payment_method: 'cash', transaction_ref: '' });

  const fetchData = () => {
    Promise.all([
      api.get('/payments'),
      api.get('/payments/pending'),
      api.get('/payments/stats'),
      api.get('/leases', { params: { status: 'active' } }),
    ]).then(([pr, pend, st, lr]) => {
      setPayments(pr.data);
      setPending(pend.data);
      setStats(st.data);
      setLeases(lr.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', { ...form, amount: Number(form.amount) });
      toast.success('Payment recorded');
      setShowRecord(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const viewReceipt = async (id: string) => {
    const r = await api.get(`/payments/receipt/${id}`);
    setReceiptHtml(r.data.html);
    setShowReceipt(id);
  };

  const printReceipt = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.print();
    }
  };

  const handleLeaseSelect = (leaseId: string) => {
    const lease = leases.find((l) => l._id === leaseId);
    setForm({ ...form, lease_id: leaseId, amount: lease?.rent_amount || 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setForm({ lease_id: '', amount: 0, month_year: new Date().toISOString().slice(0, 7), payment_method: 'cash', transaction_ref: '' }); setShowRecord(true); }}>
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card"><div className="text-sm text-gray-500">Collected (This Month)</div><div className="text-xl font-bold text-green-600">{formatCurrency(stats.total_collected)}</div></div>
          <div className="card"><div className="text-sm text-gray-500">Expected (This Month)</div><div className="text-xl font-bold text-gray-900">{formatCurrency(stats.total_expected)}</div></div>
          <div className="card"><div className="text-sm text-gray-500">Pending</div><div className="text-xl font-bold text-amber-600">{formatCurrency(stats.pending_amount)}</div></div>
          <div className="card"><div className="text-sm text-gray-500">All Time Collection</div><div className="text-xl font-bold text-primary-500">{formatCurrency(stats.total_all_time)}</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'history' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border'}`}>Payment History</button>
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pending' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border'}`}>Pending/Overdue ({pending.length})</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : tab === 'history' ? (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Receipt</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Tenant</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Property</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Unit</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Amount</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Month</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Method</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
              <th className="text-right py-3 px-2 text-gray-500 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-mono text-xs">{p.receipt_number}</td>
                  <td className="py-3 px-2">{p.tenant_name || '-'}</td>
                  <td className="py-3 px-2">{p.property_name || '-'}</td>
                  <td className="py-3 px-2">{p.unit_number || '-'}</td>
                  <td className="py-3 px-2 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="py-3 px-2">{p.month_year}</td>
                  <td className="py-3 px-2"><span className="badge bg-gray-100 text-gray-700">{p.payment_method}</span></td>
                  <td className="py-3 px-2 text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="py-3 px-2 text-right"><button className="p-1 hover:bg-gray-100 rounded" onClick={() => viewReceipt(p._id)}><Receipt className="w-4 h-4 text-primary-500" /></button></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-10">No payments found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Tenant</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Property</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Unit</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Rent Due</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Month</th>
            </tr></thead>
            <tbody>
              {pending.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{p.tenant_name || '-'}</td>
                  <td className="py-3 px-2">{p.property_name || '-'}</td>
                  <td className="py-3 px-2">{p.unit_number}</td>
                  <td className="py-3 px-2 text-red-600 font-medium">{formatCurrency(p.rent_amount)}</td>
                  <td className="py-3 px-2">{p.month_year}</td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={5} className="text-center text-green-500 py-10">All payments are up to date!</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Dialog */}
      {showRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setShowRecord(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRecord} className="p-4 space-y-4">
              <div><label className="label">Lease</label><select className="input" value={form.lease_id} onChange={(e) => handleLeaseSelect(e.target.value)} required><option value="">Select Lease</option>{leases.map((l) => <option key={l._id} value={l._id}>{l.tenant_name} - {l.property_name} ({l.unit_number})</option>)}</select></div>
              <div><label className="label">Month</label><input type="month" className="input" value={form.month_year} onChange={(e) => setForm({ ...form, month_year: e.target.value })} required /></div>
              <div><label className="label">Amount</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} required /></div>
              <div><label className="label">Payment Method</label><select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option></select></div>
              <div><label className="label">Transaction Ref</label><input className="input" value={form.transaction_ref} onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-outline" onClick={() => setShowRecord(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Payment Receipt</h2>
              <div className="flex gap-2">
                <button className="btn-outline flex items-center gap-1 py-1 px-3 text-sm" onClick={printReceipt}><Printer className="w-4 h-4" /> Print</button>
                <button onClick={() => setShowReceipt(null)}><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: receiptHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}
