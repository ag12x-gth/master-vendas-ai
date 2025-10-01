
// src/lib/email.ts
'use server';

import { SESv2Client, SendEmailCommand, type SendEmailCommandOutput } from '@aws-sdk/client-sesv2';

// Validação das variáveis de ambiente
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    if (process.env.NODE_ENV !== 'production') console.debug('As credenciais da AWS (região, chave de acesso, segredo) não estão totalmente configuradas no ambiente. O envio de e-mails será desativado.');
}
if (!process.env.EMAIL_FROM_ADDRESS) {
    if (process.env.NODE_ENV !== 'production') console.debug('A variável de ambiente EMAIL_FROM_ADDRESS não está configurada. O envio de e-mails será desativado.');
}

const sesClient = new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

interface SendEmailParams {
    to: string;
    subject: string;
    body: string;
}

const sendEmail = async ({ to, subject, body }: SendEmailParams): Promise<SendEmailCommandOutput | void> => {
    const fromAddress = process.env.EMAIL_FROM_ADDRESS;
    // Não tenta enviar o e-mail se as configurações essenciais estiverem em falta.
    if (!process.env.AWS_REGION || !fromAddress) {
        if (process.env.NODE_ENV !== 'production') console.debug(`[Email Service SKIPPED] Email para ${to} não enviado por falta de configuração.`);
        if (process.env.NODE_ENV !== 'production') console.debug(`Assunto: ${subject}`);
        return;
    }

    const command = new SendEmailCommand({
        FromEmailAddress: fromAddress,
        Destination: {
            ToAddresses: [to],
        },
        Content: {
            Simple: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: body, Charset: 'UTF-8' },
                },
            },
        },
    });

    try {
        const result = await sesClient.send(command);
        if (process.env.NODE_ENV !== 'production') console.debug(`E-mail enviado com sucesso para ${to}. MessageId: ${result.MessageId}`);
        return result;
    } catch (error) {
        console.error(`Falha ao enviar e-mail para ${to}:`, error);
        throw new Error('Não foi possível enviar o e-mail.');
    }
};

const getWelcomeEmailTemplate = (name: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff; }
              .header { font-size: 24px; font-weight: bold; color: #10B981; text-align: center; }
              .content { margin-top: 20px; }
              .step-section { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
              .step { margin-bottom: 20px; }
              .step h3 { margin: 0 0 5px 0; color: #333; }
              .step p { margin: 0 0 10px 0; font-size: 14px; color: #666;}
              .button { display: inline-block; padding: 10px 20px; background-color: #10B981; color: #fff; text-decoration: none; border-radius: 5px; }
              .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">Bem-vindo(a) ao Master IA!</div>
              <div class="content">
                  <p>Olá ${name},</p>
                  <p>Estamos muito felizes por ter você connosco! A sua conta foi criada com sucesso e você está pronto para transformar a sua comunicação no WhatsApp.</p>
              </div>
              <div class="step-section">
                  <h2 style="text-align: center; color: #333;">Comece a Usar em 3 Passos:</h2>
                  <div class="step">
                      <h3>1. Conecte seu WhatsApp</h3>
                      <p>O primeiro passo é adicionar a sua conexão com a API da Meta para poder enviar e receber mensagens.</p>
                      <a href="${baseUrl}/connections" class="button">Configurar Conexão</a>
                  </div>
                   <div class="step">
                      <h3>2. Importe Seus Contatos</h3>
                      <p>Suba a sua lista de contatos para começar a criar as suas campanhas de marketing ou atendimento.</p>
                      <a href="${baseUrl}/contacts" class="button">Gerenciar Contatos</a>
                  </div>
                   <div class="step">
                      <h3>3. Crie sua Primeira Campanha</h3>
                      <p>Com tudo configurado, crie e agende a sua primeira campanha para engajar os seus clientes.</p>
                      <a href="${baseUrl}/campaigns" class="button">Ir para Campanhas</a>
                  </div>
              </div>
              <div class="footer">
                  <p>Equipe Master IA &copy; ${new Date().getFullYear()}</p>
              </div>
          </div>
      </body>
      </html>
    `;
};

const getPasswordResetTemplate = (name: string, resetLink: string): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .header { font-size: 24px; font-weight: bold; color: #10B981; }
            .content { margin-top: 20px; }
            .button { display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #10B981; color: #fff; text-decoration: none; border-radius: 5px; }
            .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">Redefinição de Senha</div>
            <div class="content">
                <p>Olá ${name},</p>
                <p>Recebemos uma solicitação para redefinir a sua senha na plataforma Master IA. Se você não fez esta solicitação, por favor, ignore este e-mail.</p>
                <p>Para criar uma nova senha, clique no botão abaixo. Este link é válido por 15 minutos.</p>
                <a href="${resetLink}" class="button">Redefinir Senha</a>
                <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
            </div>
            <div class="footer">
                <p>Master IA &copy; ${new Date().getFullYear()}</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const getEmailVerificationTemplate = (name: string, verificationLink: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
              .header { font-size: 24px; font-weight: bold; color: #10B981; }
              .content { margin-top: 20px; }
              .button { display: inline-block; padding: 10px 20px; margin-top: 20px; background-color: #10B981; color: #fff; text-decoration: none; border-radius: 5px; }
              .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">Confirme seu endereço de e-mail</div>
              <div class="content">
                  <p>Olá ${name},</p>
                  <p>Obrigado por se registar no Master IA! Por favor, clique no botão abaixo para verificar seu endereço de e-mail e ativar sua conta.</p>
                  <a href="${verificationLink}" class="button">Verificar E-mail</a>
                  <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
                  <p><a href="${verificationLink}">${verificationLink}</a></p>
              </div>
              <div class="footer">
                  <p>Master IA &copy; ${new Date().getFullYear()}</p>
              </div>
          </div>
      </body>
      </html>
    `;
};

export const sendWelcomeEmail = async (to: string, name: string): Promise<void | SendEmailCommandOutput> => {
    const subject = `Bem-vindo(a) ao Master IA, ${name}!`;
    const body = getWelcomeEmailTemplate(name);
    return sendEmail({ to, subject, body });
};

export const sendPasswordResetEmail = async (to: string, name: string, token: string): Promise<void | SendEmailCommandOutput> => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        console.error("A variável de ambiente NEXT_PUBLIC_BASE_URL não está definida. O link de recuperação de senha pode estar incorreto.");
        throw new Error("A URL base da aplicação não está configurada.");
    }

    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const subject = 'Recupere sua senha do Master IA';
    const body = getPasswordResetTemplate(name, resetLink);
    return sendEmail({ to, subject, body });
};

export const sendEmailVerificationLink = async (to: string, name: string, token: string): Promise<void | SendEmailCommandOutput> => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
        console.error("A variável de ambiente NEXT_PUBLIC_BASE_URL não está definida. O link de verificação de e-mail pode estar incorreto.");
        throw new Error("A URL base da aplicação não está configurada.");
    }

    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const subject = 'Verifique seu e-mail no Master IA';
    const body = getEmailVerificationTemplate(name, verificationLink);
    return sendEmail({ to, subject, body });
};
