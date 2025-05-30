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
    console.log(`Attempting to send email to: ${params.to}`);
    console.log(`From: ${params.from}`);
    console.log(`Subject: ${params.subject}`);
    
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    console.log(`Email sent successfully to: ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error details:', error);
    if (error.response && error.response.body) {
      console.error('SendGrid response body:', error.response.body);
    }
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

  try {
    // Send to user
    await sendEmail({
      to: userEmail,
      from: 'candyheng198088@gmail.com',
      subject,
      html,
    });

    // Send notification to admin
    const adminSubject = `New Appointment Booked - ${appointmentTitle}`;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Appointment Notification</h2>
        <p>A new appointment has been booked:</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">${appointmentTitle}</h3>
          <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
        </div>
        
        <p>Please ensure the appointment is properly scheduled in your system.</p>
      </div>
    `;

    await sendEmail({
      to: 'admin@rebornwavegroup.com',
      from: 'candyheng198088@gmail.com',
      subject: adminSubject,
      html: adminHtml,
    });

    return true;
  } catch (error) {
    console.error('Failed to send confirmation emails:', error);
    return false;
  }
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

  try {
    // Send to user
    await sendEmail({
      to: userEmail,
      from: 'candyheng198088@gmail.com',
      subject,
      html,
    });

    // Send notification to admin
    const adminSubject = `Appointment Cancelled - ${appointmentTitle}`;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Appointment Cancellation Notification</h2>
        <p>An appointment has been cancelled:</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">${appointmentTitle}</h3>
          <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p style="color: #dc2626;"><strong>Status:</strong> Cancelled</p>
        </div>
        
        <p>Please update your scheduling system accordingly.</p>
      </div>
    `;

    await sendEmail({
      to: 'admin@rebornwavegroup.com',
      from: 'candyheng198088@gmail.com',
      subject: adminSubject,
      html: adminHtml,
    });

    return true;
  } catch (error) {
    console.error('Failed to send cancellation emails:', error);
    return false;
  }
}

export async function sendAppointmentRescheduleEmail(
  userEmail: string,
  userName: string,
  appointmentTitle: string,
  oldDate: Date,
  newDate: Date,
  duration: number
): Promise<boolean> {
  const oldFormattedDate = oldDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const oldFormattedTime = oldDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const newFormattedDate = newDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const newFormattedTime = newDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subject = `Appointment Rescheduled - ${appointmentTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Appointment Rescheduled</h2>
      <p>Dear ${userName},</p>
      <p>Your appointment has been successfully rescheduled.</p>
      
      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #92400e;">${appointmentTitle}</h3>
        <div style="margin: 15px 0;">
          <p style="color: #dc2626;"><strong>Previous Date:</strong> ${oldFormattedDate} at ${oldFormattedTime}</p>
          <p style="color: #059669;"><strong>New Date:</strong> ${newFormattedDate} at ${newFormattedTime}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
        </div>
      </div>
      
      <p>Please make note of your new appointment time and arrive 10 minutes early.</p>
      <p>Thank you for choosing Reborn Wave House!</p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #64748b; font-size: 14px;">
        Reborn Wave House - Your Oasis of Joy<br>
        If you need to reschedule again or cancel, please contact us as soon as possible.
      </p>
    </div>
  `;

  try {
    // Send to user
    await sendEmail({
      to: userEmail,
      from: 'candyheng198088@gmail.com',
      subject,
      html,
    });

    // Send notification to admin
    const adminSubject = `Appointment Rescheduled - ${appointmentTitle}`;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Appointment Reschedule Notification</h2>
        <p>An appointment has been rescheduled:</p>
        
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">${appointmentTitle}</h3>
          <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
          <div style="margin: 15px 0;">
            <p style="color: #dc2626;"><strong>Previous Date:</strong> ${oldFormattedDate} at ${oldFormattedTime}</p>
            <p style="color: #059669;"><strong>New Date:</strong> ${newFormattedDate} at ${newFormattedTime}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
          </div>
        </div>
        
        <p>Please update your scheduling system with the new appointment time.</p>
      </div>
    `;

    await sendEmail({
      to: 'admin@rebornwavegroup.com',
      from: 'candyheng198088@gmail.com',
      subject: adminSubject,
      html: adminHtml,
    });

    return true;
  } catch (error) {
    console.error('Failed to send reschedule emails:', error);
    return false;
  }
}