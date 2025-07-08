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
    console.log(`*** SENDGRID: Attempting to send email to: ${params.to}`);
    console.log(`*** SENDGRID: From: ${params.from}`);
    console.log(`*** SENDGRID: Subject: ${params.subject}`);
    console.log(`*** SENDGRID: API Key configured: ${!!process.env.SENDGRID_API_KEY}`);
    
    const result = await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    console.log(`*** SENDGRID: Email sent successfully to: ${params.to}`, result);
    return true;
  } catch (error: any) {
    console.error('*** SENDGRID ERROR: Full error details:', error);
    console.error('*** SENDGRID ERROR: Error message:', error?.message);
    console.error('*** SENDGRID ERROR: Error code:', error?.code);
    
    if (error?.response?.body) {
      console.error('*** SENDGRID ERROR: Response body:', error.response.body);
      if (error.response.body.errors) {
        error.response.body.errors.forEach((err: any, index: number) => {
          console.error(`*** SENDGRID ERROR ${index + 1}:`, err);
        });
      }
    }
    
    return false;
  }
}

// Helper function for welcome emails
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    from: 'noreply@rebornwavegroup.com', // Replace with your verified sender
    subject: 'Welcome to Reborn Wave Group!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Reborn Wave Group!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining our digital pet care community! Your journey with virtual pets begins now.</p>
        <p>Get started by:</p>
        <ul>
          <li>Exploring the marketplace for collectible toys</li>
          <li>Caring for your digital pets</li>
          <li>Earning loyalty points and tokens</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The Reborn Wave Group Team</p>
      </div>
    `,
  });
}

// Helper function for pet evolution notifications
export async function sendPetEvolutionEmail(email: string, petName: string, newStage: string): Promise<boolean> {
  return sendEmail({
    to: email,
    from: 'noreply@rebornwavegroup.com',
    subject: `🎉 ${petName} has evolved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Pet Evolution Alert!</h1>
        <p>Congratulations! Your pet <strong>${petName}</strong> has evolved to the <strong>${newStage}</strong> stage!</p>
        <p>Continue caring for your pet to unlock more evolutionary stages and rewards.</p>
        <p>Visit your dashboard to see your pet's new appearance and abilities.</p>
        <p>Best regards,<br>The Reborn Wave Group Team</p>
      </div>
    `,
  });
}