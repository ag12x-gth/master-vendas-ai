// Email service usando Nodemailer (fallback para Replit Mail)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'diegomaninhu@gmail.com', // Usando credenciais do proprietário
    pass: process.env.GMAIL_APP_PASSWORD || 'MasterIA2025!', // App password ou senha
  },
});

export async function sendEmailViaNodemailer(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  try {
    const result = await transporter.sendMail({
      from: 'noreply@masteria.app <diegomaninhu@gmail.com>',
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email enviado via Nodemailer para ${to} (ID: ${result.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar email via Nodemailer para ${to}:`, error);
    return false;
  }
}
