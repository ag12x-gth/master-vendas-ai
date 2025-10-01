import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste Vapi Voice AI Integration</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6 space-y-6">
        <!-- Header -->
        <div class="border-b pb-4">
            <h1 class="text-2xl font-bold flex items-center gap-2">
                📞 Teste Vapi Voice AI Integration
            </h1>
            <p class="text-gray-600 mt-2">
                Teste completo: Chamada → Webhook → HMAC Validation → WhatsApp Summary
            </p>
        </div>

        <!-- Input Section -->
        <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
                Número de Telefone (formato E.164)
            </label>
            <input
                type="tel"
                id="phoneNumber"
                placeholder="+5511999999999"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p class="text-xs text-gray-500">
                Formato: +55 + DDD + Número (ex: +5511999999999)
            </p>
        </div>

        <!-- Action Button -->
        <button
            id="testButton"
            onclick="initiateCall()"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            📞 Iniciar Chamada de Teste
        </button>

        <!-- Result Container -->
        <div id="result" class="hidden"></div>

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 class="font-semibold text-blue-900 mb-2">📋 Checklist de Testes</h3>
            <ol class="text-sm space-y-2 text-blue-800">
                <li>1️⃣ <strong>Console/Logs:</strong> Abra a aba de Console do Replit para monitorar webhooks</li>
                <li>2️⃣ <strong>Chamada:</strong> Insira um número válido e clique em "Iniciar Chamada"</li>
                <li>3️⃣ <strong>Webhooks:</strong> Verifique nos logs se recebeu <code class="bg-blue-100 px-1">x-signature</code> e <code class="bg-blue-100 px-1">x-timestamp</code></li>
                <li>4️⃣ <strong>HMAC:</strong> Confirme se a validação SHA256 passou</li>
                <li>5️⃣ <strong>WhatsApp:</strong> Após encerrar, verifique se o resumo foi enviado</li>
            </ol>
        </div>

        <!-- Debug Info -->
        <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 class="font-semibold text-gray-700 mb-2">🔧 Informações de Debug</h3>
            <div class="text-xs text-gray-600 space-y-1">
                <p><strong>Webhook URL:</strong> <code class="bg-gray-200 px-1">https://iasvendas.ai/api/vapi/webhook</code></p>
                <p><strong>Expected Headers:</strong> <code class="bg-gray-200 px-1">x-signature</code>, <code class="bg-gray-200 px-1">x-timestamp</code></p>
                <p><strong>HMAC Algorithm:</strong> SHA256</p>
                <p><strong>Credential ID:</strong> <code class="bg-gray-200 px-1">99b293c6-62ef-4b69-a2e2-3a3332532621</code></p>
            </div>
        </div>
    </div>

    <script>
        async function initiateCall() {
            const phoneNumber = document.getElementById('phoneNumber').value;
            const button = document.getElementById('testButton');
            const resultDiv = document.getElementById('result');

            if (!phoneNumber || phoneNumber.length < 10) {
                showError('Por favor, insira um número de telefone válido');
                return;
            }

            button.disabled = true;
            button.innerHTML = '⏳ Iniciando chamada...';
            resultDiv.innerHTML = '';
            resultDiv.classList.add('hidden');

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

                showSuccess(data);
            } catch (error) {
                showError(error.message);
            } finally {
                button.disabled = false;
                button.innerHTML = '📞 Iniciar Chamada de Teste';
            }
        }

        function showSuccess(data) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'bg-green-50 border border-green-200 rounded-md p-4';
            resultDiv.innerHTML = \`
                <div class="flex items-start gap-2">
                    <span class="text-green-600 text-xl">✅</span>
                    <div class="flex-1">
                        <p class="font-semibold text-green-900 mb-2">Chamada iniciada com sucesso!</p>
                        <div class="text-sm text-green-800 space-y-1">
                            <p><strong>Call ID:</strong> <code class="bg-green-100 px-1 rounded">\${data.callId}</code></p>
                            <p><strong>Status:</strong> \${data.status}</p>
                            <p class="mt-2 text-xs">\${data.message}</p>
                        </div>
                    </div>
                </div>
            \`;
            resultDiv.classList.remove('hidden');
        }

        function showError(message) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'bg-red-50 border border-red-200 rounded-md p-4';
            resultDiv.innerHTML = \`
                <div class="flex items-start gap-2">
                    <span class="text-red-600 text-xl">❌</span>
                    <div class="flex-1">
                        <p class="font-semibold text-red-900 mb-2">Erro ao iniciar chamada</p>
                        <p class="text-sm text-red-800">\${message}</p>
                    </div>
                </div>
            \`;
            resultDiv.classList.remove('hidden');
        }

        // Enter key support
        document.getElementById('phoneNumber').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                initiateCall();
            }
        });
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
