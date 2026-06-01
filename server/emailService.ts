import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const hasSendGrid = Boolean(sendgridApiKey);
if (sendgridApiKey) sgMail.setApiKey(sendgridApiKey);
if (!resend) console.warn('RESEND_API_KEY not set — appointment emails disabled');

const FROM = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Reborn Wave Group <onboarding@resend.dev>';
const ADMIN = process.env.ADMIN_EMAIL || 'admin@rebornwave.group';

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

export async function sendEmailDetailed(params: EmailParams): Promise<{ ok: boolean; provider: string; from: string; error?: string }> {
  const from = params.from || FROM;

  if (!resend && !hasSendGrid) {
    console.error('Email not sent: set RESEND_API_KEY or SENDGRID_API_KEY');
    return { ok: false, provider: 'none', from, error: 'Missing RESEND_API_KEY or SENDGRID_API_KEY in Railway variables.' };
  }

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      if (error) {
        const message = typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error);
        console.error('Resend error:', error);
        return { ok: false, provider: 'resend', from, error: message };
      }
      return { ok: true, provider: 'resend', from };
    } catch (error: any) {
      const message = error?.message || String(error);
      console.error('Resend email error:', message);
      return { ok: false, provider: 'resend', from, error: message };
    }
  }

  if (hasSendGrid) {
    try {
      await sgMail.send({
        from: normalizeSendGridFrom(from),
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return { ok: true, provider: 'sendgrid', from };
    } catch (error: any) {
      const message = JSON.stringify(error?.response?.body || error?.message || error);
      console.error('SendGrid email error:', error?.response?.body || error?.message || error);
      return { ok: false, provider: 'sendgrid', from, error: message };
    }
  }

  return { ok: false, provider: 'none', from, error: 'No email provider available.' };
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const result = await sendEmailDetailed(params);
  return result.ok;
}

export async function sendAppointmentConfirmationEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  appointmentDate: Date,
  duration: number
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const subject = `Appointment Confirmed - ${appointmentTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#7c3aed;">Appointment Confirmed</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment has been successfully confirmed!</p>
      <div style="background:#f5f3ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #7c3aed;">
        <h3 style="margin-top:0;">${appointmentTitle}</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
      </div>
      <p>Please arrive 10 minutes early. Thank you for choosing Reborn Wave House!</p>
    </div>
  `;
  try {
    await sendEmail({ to: userEmail, subject, html });
    await sendEmail({ to: ADMIN, subject: `New Booking - ${appointmentTitle}`, html: `<p><strong>${userName}</strong> (${userEmail}) booked <strong>${appointmentTitle}</strong> on ${formattedDate} at ${formattedTime} for ${duration} min.</p>` });
    return true;
  } catch { return false; }
}

export async function sendAppointmentCancellationEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  appointmentDate: Date
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const subject = `Appointment Cancelled - ${appointmentTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#dc2626;">Appointment Cancelled</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment <strong>${appointmentTitle}</strong> on ${formattedDate} at ${formattedTime} has been cancelled.</p>
      <p>Feel free to book a new appointment anytime. Thank you for choosing Reborn Wave House!</p>
    </div>
  `;
  try {
    await sendEmail({ to: userEmail, subject, html });
    await sendEmail({ to: ADMIN, subject: `Cancelled - ${appointmentTitle}`, html: `<p><strong>${userName}</strong> (${userEmail}) cancelled <strong>${appointmentTitle}</strong> on ${formattedDate} at ${formattedTime}.</p>` });
    return true;
  } catch { return false; }
}

export async function sendAppointmentRescheduleEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  oldDate: Date,
  newDate: Date,
  duration: number
): Promise<boolean> {
  const fmt = (d: Date) => `${d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  const subject = `Appointment Rescheduled - ${appointmentTitle}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#f59e0b;">Appointment Rescheduled</h2>
      <p>Dear ${userName},</p>
      <div style="background:#fffbeb;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b;">
        <h3 style="margin-top:0;">${appointmentTitle}</h3>
        <p style="color:#dc2626;"><strong>Previous:</strong> ${fmt(oldDate)}</p>
        <p style="color:#059669;"><strong>New:</strong> ${fmt(newDate)}</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
      </div>
      <p>Please arrive 10 minutes early. Thank you for choosing Reborn Wave House!</p>
    </div>
  `;
  try {
    await sendEmail({ to: userEmail, subject, html });
    await sendEmail({ to: ADMIN, subject: `Rescheduled - ${appointmentTitle}`, html: `<p><strong>${userName}</strong> (${userEmail}) rescheduled <strong>${appointmentTitle}</strong> from ${fmt(oldDate)} to ${fmt(newDate)}.</p>` });
    return true;
  } catch { return false; }
}
