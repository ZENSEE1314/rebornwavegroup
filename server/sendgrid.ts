import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);
if (!resend) console.warn('RESEND_API_KEY not set — email sending disabled');

const FROM = process.env.EMAIL_FROM || 'Reborn Wave Group <admin@rebornwave.group>';

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

function normalizeSendGridFrom(from: string) {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  return match ? { email: match[2], name: match[1].trim() || undefined } : from;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!resend && !hasSendGrid) {
    console.error('Email not sent: set RESEND_API_KEY or SENDGRID_API_KEY');
    return false;
  }

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: params.from || FROM,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      if (error) {
        console.error('Resend error:', error);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Resend email error:', error?.message || error);
    }
  }

  if (hasSendGrid) {
    try {
      await sgMail.send({
        from: normalizeSendGridFrom(params.from || FROM),
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return true;
    } catch (error: any) {
      console.error('SendGrid email error:', error?.response?.body || error?.message || error);
    }
  }

  return false;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to Reborn Wave Group!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Welcome to Reborn Wave Group!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining our community! Your journey begins now.</p>
        <ul>
          <li>Explore the marketplace for collectible toys</li>
          <li>Care for your digital pets</li>
          <li>Earn loyalty points and tokens</li>
        </ul>
        <p>Best regards,<br>The Reborn Wave Group Team</p>
      </div>
    `,
  });
}

export async function sendPetEvolutionEmail(email: string, petName: string, newStage: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `🎉 ${petName} has evolved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">Pet Evolution Alert!</h1>
        <p>Congratulations! Your pet <strong>${petName}</strong> has evolved to the <strong>${newStage}</strong> stage!</p>
        <p>Visit your dashboard to see your pet's new appearance and abilities.</p>
        <p>Best regards,<br>The Reborn Wave Group Team</p>
      </div>
    `,
  });
}
