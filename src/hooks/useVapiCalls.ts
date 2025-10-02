'use client';

import { useEffect, useState } from 'react';

export interface VapiCall {
  id: string;
  vapiCallId: string;
  customerName: string;
  customerNumber: string;
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  summary?: string;
  resolved?: boolean;
  nextSteps?: string;
  conversationId?: string;
  contactId?: string;
}

export interface VapiMetrics {
  summary: {
    totalCalls: number;
    completedCalls: number;
    inProgressCalls: number;
    failedCalls: number;
    resolvedCases: number;
    avgDuration: number;
    totalDuration: number;
    successRate: number;
  };
  callsByDay: Record<string, number>;
  recentCalls: VapiCall[];
}

export function useVapiCalls(autoRefresh = false) {
  const [metrics, setMetrics] = useState<VapiMetrics | null>(null);
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vapi/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setCalls(data.recentCalls || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const initiateCall = async (params: {
    phoneNumber: string;
    customerName: string;
    context: string;
    conversationId?: string;
    contactId?: string;
  }) => {
    try {
      const response = await fetch('/api/vapi/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      await fetchMetrics();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initiate call';
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return {
    metrics,
    calls,
    loading,
    error,
    refetch: fetchMetrics,
    initiateCall,
  };
}
