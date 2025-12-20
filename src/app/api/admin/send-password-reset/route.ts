import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getBaseUrl } from '@/utils/get-base-url';

const generateResetToken = () => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

async function sendResetEmailViaReplit(
  email: string,
  name: string,
  resetLink: string
): Promise<boolean> {
  try {
    // Usar a integração de email do Replit
    const response = await fetch(process.env.REPLIT_MAIL_SERVICE_URL || 'http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: '🔐 Reset de Senha - Master IA Oficial',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
                .header { text-align: center; color: #333; margin-bottom: 30px; }
                .content { color: #666; line-height: 1.6; margin-bottom: 30px; }
                .button { text-align: center; margin: 30px 0; }
                .button a { background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; }
                .footer { border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 11px; text-align: center; }
                code { background-color: #f0f0f0; padding: 5px 10px; border-radius: 3px; word-break: break-all; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>Reset de Senha</h2>
                </div>
                
                <div class="content">
                  <p>Olá <strong>${name}</strong>,</p>
                  
                  <p>Recebemos uma solicitação para resetar sua senha no <strong>Master IA Oficial</strong>.</p>
                  
                  <p>Para redefinir sua senha, clique no botão abaixo:</p>
                </div>
                
                <div class="button">
                  <a href="${resetLink}">Redefinir Senha</a>
                </div>
                
                <div class="content">
                  <p style="font-size: 12px; color: #999;">
                    Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                    <code>${resetLink}</code>
                  </p>
                  
                  <p style="font-size: 12px; color: #999;">
                    ⏰ <strong>Este link expira em 24 horas.</strong>
                  </p>
                  
                  <p style="font-size: 12px; color: #999;">
                    Se você não solicitou este reset, ignore este email.
                  </p>
                </div>
                
                <div class="footer">
                  <p>Equipe Master IA Oficial<br>Sistema de Suporte ao Usuário</p>
                </div>
              </div>
            </body>
          </html>
        `,
        from: 'noreply@masteriaoficial.com',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error(`Erro ao enviar para ${email}:`, error);
    return false;
  }
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma requisição autorizada (apenas para admin)
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_RESET_TOKEN;

    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log('🔄 Iniciando reset em massa de senhas...\n');

    const allUsers = await db.select().from(users);
    console.log(`📊 Total de usuários: ${allUsers.length}\n`);

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const user of allUsers) {
      try {
        const { token, tokenHash } = generateResetToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Inserir token no banco
        await db.insert(passwordResetTokens).values({
          id: uuidv4(),
          userId: user.id,
          tokenHash,
          expiresAt,
          createdAt: new Date(),
        });

        const baseUrl = getBaseUrl();
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        // Enviar email
        const emailSent = await sendResetEmailViaReplit(
          user.email,
          user.name,
          resetLink
        );

        if (emailSent) {
          console.log(`✅ ${user.name} (${user.email})`);
          successCount++;
          results.push({
            name: user.name,
            email: user.email,
            status: 'enviado',
          });
        } else {
          console.log(`⚠️  ${user.name} (${user.email}) - Falha no envio`);
          errorCount++;
          results.push({
            name: user.name,
            email: user.email,
            status: 'erro',
          });
        }
      } catch (error) {
        console.error(`❌ Erro processando ${user.email}:`, error);
        errorCount++;
        results.push({
          name: user.name,
          email: user.email,
          status: 'erro',
        });
      }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTADO FINAL:`);
    console.log(`✅ Enviados com sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📧 Total de usuários: ${allUsers.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      message: `Reset de senha enviado para ${successCount} usuários`,
      stats: {
        total: allUsers.length,
        sent: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    return NextResponse.json(
      { error: 'Erro ao processar reset de senhas em massa' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  // Endpoint para listar todos os usuários
  try {
    const allUsers = await db.select().from(users);
    
    return NextResponse.json({
      total: allUsers.length,
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    );
  }
}
