'use client';

import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { CampaignTable } from './campaign-table';

export function BaileysCampaignTable() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Campanhas WhatsApp Normal:</strong> Apenas mensagens de texto simples. Para enviar mídia ou usar templates estruturados, use Campanhas Whatsapp Business.
        </AlertDescription>
      </Alert>
      
      <CampaignTable channel="WHATSAPP" baileysOnly={true} />
    </div>
  );
}
