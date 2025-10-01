
'use client';

import { Badge } from '@/components/ui/badge';
import { GitCommit } from 'lucide-react';
import packageJson from '../../package.json';

export default function VersionBadge({ prefix = 'v' }: { prefix?: string }): JSX.Element {
  // A variável é injetada durante o build.
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA
  const versionText = sha && sha.length === 7 ? sha : packageJson.version;

  return (
    <Badge variant="secondary" className="gap-1.5 items-center">
      <GitCommit size={14} />
      <span>{prefix}{versionText}</span>
    </Badge>
  )
}
