import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate, statusColor } from '../utils/utils';
import { DashboardStats } from '../types';
import { Building2, DoorOpen, CreditCard, AlertTriangle, Wrench, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!stats) return <div className="text-center text-gray-500 mt-10">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Total Properties', value: stats.total_properties, icon: Building2, color: 'bg-blue-500' },
    { label: 'Occupied Units', value: `${stats.occupied_units}/${stats.total_units}`, icon: DoorOpen, color: 'bg-green-500' },
    { label: 'Monthly Revenue', value: formatCurrency(stats.monthly_revenue), icon: CreditCard, color: 'bg-accent-500' },
    { label: 'Overdue Payments', value: stats.overdue_count, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Open Maintenance', value: stats.open_maintenance, icon: Wrench, color: 'bg-orange-500' },
    { label: 'Active Tenants', value: stats.total_tenants, icon: Users, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`${s.color} p-3 rounded-xl text-white`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by Property */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate by Property</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.occupancy_by_property}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Bar dataKey="pct" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-500 font-medium">Tenant</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Month</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_payments.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50">
                    <td className="py-2">{p.tenant_name || '-'}</td>
                    <td className="py-2 font-medium">{formatCurrency(p.amount)}</td>
                    <td className="py-2">{p.month_year}</td>
                    <td className="py-2 text-gray-500">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {stats.urgent_maintenance > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-800">{stats.urgent_maintenance} urgent maintenance request(s)</span>
              </div>
            )}
            {stats.overdue_count > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-800">{stats.overdue_count} overdue payment(s) this month</span>
              </div>
            )}
            {stats.expiring_leases > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-blue-800">{stats.expiring_leases} lease(s) expiring within 30 days</span>
              </div>
            )}
            {stats.open_maintenance > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Wrench className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-orange-800">{stats.open_maintenance} open maintenance request(s)</span>
              </div>
            )}
            {stats.urgent_maintenance === 0 && stats.overdue_count === 0 && stats.expiring_leases === 0 && stats.open_maintenance === 0 && (
              <div className="text-center text-gray-400 py-6">No alerts at this time</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
