'use client';

import useSWR from 'swr';
import { VapiCall } from './useVapiCalls';

export interface HistoryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface VapiHistoryResponse {
  calls: VapiCall[];
  pagination: PaginationInfo;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
};

export function useVapiHistory(
  page = 1,
  limit = 10,
  filters: HistoryFilters = {}
) {
  const clampedPage = Math.max(1, page);
  const clampedLimit = Math.min(Math.max(1, limit), 100);

  const params = new URLSearchParams({
    page: clampedPage.toString(),
    limit: clampedLimit.toString(),
    ...(filters.status && filters.status !== 'all' && { status: filters.status }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.search && { search: filters.search }),
  });

  const { data, error, isLoading, mutate } = useSWR<VapiHistoryResponse>(
    `/api/vapi/history?${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    calls: data?.calls || [],
    pagination: data?.pagination || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  };
}
