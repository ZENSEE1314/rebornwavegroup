import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendAppointmentConfirmationEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  appointmentDate: Date,
  duration: number
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Appointment Confirmed - ${appointmentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Appointment Confirmed</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment has been successfully confirmed!</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">${appointmentTitle}</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Duration:</strong> ${duration} minutes</p>
      </div>
      
      <p>Please arrive 10 minutes early for your appointment.</p>
      <p>Thank you for choosing Reborn Wave House!</p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #64748b; font-size: 14px;">
        Reborn Wave House - Your Oasis of Joy<br>
        If you need to reschedule or cancel, please contact us as soon as possible.
      </p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: 'noreply@rebornwavehouse.com',
    subject,
    html,
  });
}

export async function sendAppointmentCancellationEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  appointmentDate: Date
): Promise<boolean> {
  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Appointment Cancelled - ${appointmentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Appointment Cancelled</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment has been cancelled as requested.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin-top: 0; color: #991b1b;">${appointmentTitle}</h3>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p style="color: #dc2626;"><strong>Status:</strong> Cancelled</p>
      </div>
      
      <p>We're sorry to see this appointment cancelled. Feel free to book a new appointment anytime.</p>
      <p>Thank you for choosing Reborn Wave House!</p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #64748b; font-size: 14px;">
        Reborn Wave House - Your Oasis of Joy<br>
        We look forward to serving you in the future.
      </p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    from: 'noreply@rebornwavehouse.com',
    subject,
    html,
  });
}