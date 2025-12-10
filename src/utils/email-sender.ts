// src/utils/email-sender.ts
// Envia email de verificação DIRETAMENTE para o usuário usando Resend
// Não encaminha para admin - sempre para o email original do usuário

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationLink: string,
  htmlTemplate: string
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY não configurado - usando fallback');
      return false;
    }

    const result = await resend.emails.send({
      from: 'noreply@masteria.app',
      to: userEmail, // ✅ SEMPRE para o email do usuário
      subject: 'Verifique seu e-mail no Master IA',
      html: htmlTemplate,
      text: `Olá ${userName}, clique no link para verificar seu email: ${verificationLink}`,
    });

    if (result.error) {
      console.error('❌ Erro ao enviar email via Resend:', result.error);
      return false;
    }

    console.log(`✅ Email de verificação enviado com sucesso para ${userEmail}`);
    console.log(`📧 Message ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetLink: string,
  htmlTemplate: string
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY não configurado - usando fallback');
      return false;
    }

    const result = await resend.emails.send({
      from: 'noreply@masteria.app',
      to: userEmail, // ✅ SEMPRE para o email do usuário
      subject: 'Recupere sua senha do Master IA',
      html: htmlTemplate,
      text: `Olá ${userName}, clique no link para redefinir sua senha: ${resetLink}`,
    });

    if (result.error) {
      console.error('❌ Erro ao enviar email via Resend:', result.error);
      return false;
    }

    console.log(`✅ Email de recuperação enviado com sucesso para ${userEmail}`);
    console.log(`📧 Message ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    return false;
  }
}

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  htmlTemplate: string
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY não configurado - usando fallback');
      return false;
    }

    const result = await resend.emails.send({
      from: 'noreply@masteria.app',
      to: userEmail, // ✅ SEMPRE para o email do usuário
      subject: `Bem-vindo(a) ao Master IA, ${userName}!`,
      html: htmlTemplate,
      text: `Bem-vindo ao Master IA, ${userName}! Sua conta foi criada com sucesso.`,
    });

    if (result.error) {
      console.error('❌ Erro ao enviar email via Resend:', result.error);
      return false;
    }

    console.log(`✅ Email de boas-vindas enviado com sucesso para ${userEmail}`);
    console.log(`📧 Message ID: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    return false;
  }
}
