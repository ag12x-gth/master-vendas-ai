
// src/lib/email.ts
'use server';

import { sendEmail as sendReplitEmail } from '@/utils/replitmail';
import { getBaseUrl } from '@/utils/get-base-url';

const getWelcomeEmailTemplate = (name: string): string => {
    const baseUrl = getBaseUrl();
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

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
    try {
        const subject = `Bem-vindo(a) ao Master IA, ${name}!`;
        const html = getWelcomeEmailTemplate(name);
        
        await sendReplitEmail({
            to,
            subject,
            html,
            text: `Bem-vindo ao Master IA, ${name}! Sua conta foi criada com sucesso.`,
        });
        
        console.log(`✅ Email de boas-vindas enviado para ${to}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar email de boas-vindas para ${to}:`, error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (to: string, name: string, resetLink: string): Promise<void> => {
    try {
        const subject = 'Recupere sua senha do Master IA';
        const html = getPasswordResetTemplate(name, resetLink);
        
        await sendReplitEmail({
            to,
            subject,
            html,
            text: `Olá ${name}, clique no link para redefinir sua senha: ${resetLink}`,
        });
        
        console.log(`✅ Email de recuperação de senha enviado para ${to}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar email de recuperação de senha para ${to}:`, error);
        throw error;
    }
};

export const sendEmailVerificationLink = async (to: string, name: string, verificationLink: string): Promise<void> => {
    try {
        const subject = 'Verifique seu e-mail no Master IA';
        const html = getEmailVerificationTemplate(name, verificationLink);
        
        await sendReplitEmail({
            to,
            subject,
            html,
            text: `Olá ${name}, clique no link para verificar seu email: ${verificationLink}`,
        });
        
        console.log(`✅ Email de verificação enviado para ${to}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar email de verificação para ${to}:`, error);
        throw error;
    }
};
