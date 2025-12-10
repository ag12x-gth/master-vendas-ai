'use client';

import { useEffect, useState } from 'react';

interface EmailEvent {
  id: string;
  recipient: string;
  subject?: string;
  eventType: string;
  createdAt: string;
}

export default function EmailTrackingPage() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/v1/admin/email-events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch email events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Email Tracking</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4 text-left">Recipient</th>
              <th className="p-4 text-left">Subject</th>
              <th className="p-4 text-left">Event Type</th>
              <th className="p-4 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{event.recipient}</td>
                <td className="p-4">{event.subject || '-'}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{event.eventType}</span>
                </td>
                <td className="p-4 text-gray-500">{new Date(event.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
