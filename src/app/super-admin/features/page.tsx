'use client';

import { useEffect, useState } from 'react';

interface Feature {
  id: string;
  name: string;
  key: string;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch('/api/v1/admin/features');
        if (response.ok) {
          const data = await response.json();
          setFeatures(data.features);
        }
      } catch (error) {
        console.error('Failed to fetch features:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Features Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map(feature => (
          <div key={feature.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <h3 className="text-xl font-bold text-gray-900">{feature.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Key: {feature.key}</p>
            <div className="mt-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="ml-2 text-gray-700">Active</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
