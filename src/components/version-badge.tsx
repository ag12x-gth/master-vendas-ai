
'use client';

import { Badge } from '@/components/ui/badge';
import { GitCommit } from 'lucide-react';
import packageJson from '../../package.json';
import { useEffect, useState } from 'react';

export default function VersionBadge({ prefix = 'v' }: { prefix?: string }): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA
  const versionText = sha && sha.length === 7 ? sha : packageJson.version;

  return (
    <Badge variant="secondary" className="gap-1.5 items-center">
      <GitCommit size={14} />
      <span>{prefix}{versionText}</span>
    </Badge>
  )
}
