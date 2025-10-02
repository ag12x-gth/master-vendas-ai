'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Phone } from 'lucide-react';

export default function TestVapiPage() {
  const [phoneNumber, setPhoneNumber] = useState('+55');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/vapi/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-6 w-6" />
            Teste Vapi Voice AI Integration
          </CardTitle>
          <CardDescription>
            Teste a integração completa: Chamada → Webhook → HMAC Validation → WhatsApp Summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Número de Telefone (formato E.164)
            </label>
            <Input
              type="tel"
              placeholder="+5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Formato: +55 + DDD + Número (ex: +5511999999999)
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleTestCall}
            disabled={loading || !phoneNumber || phoneNumber.length < 10}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando chamada...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Iniciar Chamada de Teste
              </>
            )}
          </Button>

          {/* Success Result */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-900">
                    ✅ Chamada iniciada com sucesso!
                  </p>
                  <div className="text-sm space-y-1 text-green-800">
                    <p>
                      <strong>Call ID:</strong>{' '}
                      <code className="bg-green-100 px-1 rounded">{result.callId}</code>
                    </p>
                    <p>
                      <strong>Status:</strong> {result.status}
                    </p>
                    <p className="mt-3 text-xs text-green-700">
                      {result.message}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Result */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">❌ Erro ao iniciar chamada</p>
                  <p className="text-sm">{error}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📋 Checklist de Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm space-y-2 text-blue-900">
                <li>1️⃣ <strong>Console/Logs:</strong> Abra a aba de Console para monitorar webhooks</li>
                <li>2️⃣ <strong>Chamada:</strong> Insira um número válido e clique em &quot;Iniciar Chamada&quot;</li>
                <li>3️⃣ <strong>Webhooks:</strong> Verifique nos logs se recebeu <code>x-signature</code> e <code>x-timestamp</code></li>
                <li>4️⃣ <strong>HMAC:</strong> Confirme se a validação SHA256 passou</li>
                <li>5️⃣ <strong>WhatsApp:</strong> Após encerrar, verifique se o resumo foi enviado</li>
              </ol>
            </CardContent>
          </Card>

          {/* Debug Info */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🔧 Informações de Debug</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-700">
              <p><strong>Webhook URL:</strong> <code>https://iasvendas.ai/api/vapi/webhook</code></p>
              <p><strong>Expected Headers:</strong> <code>x-signature</code>, <code>x-timestamp</code></p>
              <p><strong>HMAC Algorithm:</strong> SHA256</p>
              <p><strong>Credential ID:</strong> <code>99b293c6-62ef-4b69-a2e2-3a3332532621</code></p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
