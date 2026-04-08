import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Settings as SettingsType } from '../types';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>({ company_name: '', late_fee_per_day: 50, payment_due_day: 5, currency: 'INR', currency_symbol: '\u20b9' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => {
      if (r.data) setSettings(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label className="label">Company Name</label>
          <input className="input" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Late Fee Per Day</label>
            <input type="number" className="input" value={settings.late_fee_per_day} onChange={(e) => setSettings({ ...settings, late_fee_per_day: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Payment Due Day</label>
            <input type="number" className="input" value={settings.payment_due_day} onChange={(e) => setSettings({ ...settings, payment_due_day: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Currency</label>
            <input className="input" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
          </div>
          <div>
            <label className="label">Currency Symbol</label>
            <input className="input" value={settings.currency_symbol} onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
