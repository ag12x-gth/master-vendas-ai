'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  totalUsers: number;
  totalCompanies: number;
  totalEmails: number;
  emailEventsByType: Array<{ eventType: string; count: number }>;
  mostUsedFeatures: Array<{ featureName: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/v1/admin/analytics');
        if (response.ok) {
          const result = await response.json();
          setData(result.stats);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">Failed to load analytics</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-600">
          <p className="text-gray-600 text-sm">Total Users</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{data.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-600">
          <p className="text-gray-600 text-sm">Total Companies</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{data.totalCompanies}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-purple-600">
          <p className="text-gray-600 text-sm">Total Emails Sent</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{data.totalEmails}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Email Event Distribution</h2>
          <div className="space-y-4">
            {data.emailEventsByType.map((evt) => (
              <div key={evt.eventType}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700">{evt.eventType}</span>
                  <span className="text-lg font-bold text-gray-900">{evt.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(evt.count / Math.max(...data.emailEventsByType.map(e => e.count), 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Most Used Features</h2>
          <div className="space-y-3">
            {data.mostUsedFeatures.slice(0, 8).map((feat) => (
              <div key={feat.featureName} className="flex justify-between items-center pb-3 border-b last:border-0">
                <span className="text-gray-700">{feat.featureName}</span>
                <span className="font-bold text-lg text-gray-900">{feat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
