import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
      if (error) { console.error('Resend error:', error); return false; }
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
