'use client';

import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, CheckCircle2, XCircle } from 'lucide-react';

interface CallStatusBadgeProps {
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed';
  showIcon?: boolean;
}

const statusConfig = {
  initiated: {
    label: 'Iniciada',
    variant: 'secondary' as const,
    icon: Phone,
  },
  ringing: {
    label: 'Tocando',
    variant: 'default' as const,
    icon: PhoneCall,
  },
  in_progress: {
    label: 'Em Andamento',
    variant: 'default' as const,
    icon: PhoneCall,
  },
  completed: {
    label: 'Concluída',
    variant: 'default' as const,
    icon: CheckCircle2,
  },
  failed: {
    label: 'Falhou',
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export function CallStatusBadge({ status, showIcon = true }: CallStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.initiated;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
