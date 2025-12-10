'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalUsers: number;
  totalCompanies: number;
  totalEmails: number;
  emailEventsByType: Array<{ eventType: string; count: number }>;
  mostUsedFeatures: Array<{ featureName: string; count: number }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/v1/admin/analytics');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!stats) return <div className="p-8">Failed to load analytics</div>;

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Companies</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCompanies}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Emails</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEmails}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Email Events by Type</h2>
          <ul className="space-y-2">
            {stats.emailEventsByType.map((evt) => (
              <li key={evt.eventType} className="flex justify-between">
                <span className="text-gray-600">{evt.eventType}</span>
                <span className="font-bold">{evt.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Most Used Features</h2>
          <ul className="space-y-2">
            {stats.mostUsedFeatures.slice(0, 5).map((feat) => (
              <li key={feat.featureName} className="flex justify-between">
                <span className="text-gray-600">{feat.featureName}</span>
                <span className="font-bold">{feat.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
