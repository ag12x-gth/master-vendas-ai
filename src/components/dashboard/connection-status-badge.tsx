'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AlertTriangle, CheckCircle, RefreshCw, Wifi } from 'lucide-react';
import Link from 'next/link';

interface HealthSummary {
  total: number;
  healthy: number;
  expired: number;
  error: number;
  inactive: number;
}

interface HealthResponse {
  summary: HealthSummary;
}

export function ConnectionStatusBadge() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/connections/health');
      if (response.ok) {
        const data: HealthResponse = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Erro ao verificar conexões:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !summary) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </Badge>
    );
  }

  const hasProblems = summary.expired > 0 || summary.error > 0;
  const allHealthy = summary.healthy === summary.total && summary.total > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
          {hasProblems ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : allHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Wifi className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">
            {summary.healthy}/{summary.total}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Status das Conexões</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchHealth}
              disabled={loading}
              className="h-6 w-6"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950">
              <span className="text-muted-foreground">Saudáveis</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {summary.healthy}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950">
              <span className="text-muted-foreground">Expiradas</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {summary.expired}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950">
              <span className="text-muted-foreground">Com Erro</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {summary.error}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-900">
              <span className="text-muted-foreground">Inativas</span>
              <span className="font-bold text-gray-600 dark:text-gray-400">
                {summary.inactive}
              </span>
            </div>
          </div>

          {hasProblems && (
            <div className="pt-2 border-t">
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                Algumas conexões precisam de atenção
              </p>
              <Link href="/connections" passHref>
                <Button variant="outline" size="sm" className="w-full">
                  Ver Detalhes
                </Button>
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
