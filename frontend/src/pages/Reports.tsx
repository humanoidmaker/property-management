import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/maintenance/stats'),
      api.get('/payments'),
    ]).then(([sr, mr, pr]) => {
      setStats(sr.data);
      setMaintenanceStats(mr.data);
      setPayments(pr.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!stats) return null;

  // Property-wise collection
  const propertyCollection: Record<string, number> = {};
  payments.forEach((p: any) => {
    const name = p.property_name || 'Unknown';
    propertyCollection[name] = (propertyCollection[name] || 0) + p.amount;
  });
  const propertyData = Object.entries(propertyCollection).map(([name, amount]) => ({ name, amount }));

  // Maintenance category breakdown
  const maintCatData = maintenanceStats?.by_category
    ? Object.entries(maintenanceStats.by_category).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Line type="monotone" dataKey="amount" stroke="#1e3a5f" strokeWidth={2} dot={{ fill: '#1e3a5f' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy by Property */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Rate</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.occupancy_by_property}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Bar dataKey="pct" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Property-wise Collection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection by Property</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={propertyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Bar dataKey="amount" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Maintenance Category Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance by Category</h2>
          {maintCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={maintCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {maintCatData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-10">No maintenance data</div>
          )}
        </div>
      </div>
    </div>
  );
}
