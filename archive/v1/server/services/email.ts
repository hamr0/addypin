// Simple contact form logging service (no external dependencies)
interface ContactEmailParams {
  fromEmail: string;
  subject: string;
  message: string;
}

export async function sendContactEmail(params: ContactEmailParams): Promise<boolean> {
  try {
    // Log the contact form submission to console and potential file
    const timestamp = new Date().toISOString();
    const contactMessage = {
      timestamp,
      from: params.fromEmail,
      subject: params.subject,
      message: params.message,
    };

    console.log('📧 CONTACT FORM SUBMISSION:');
    console.log(`From: ${params.fromEmail}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Message: ${params.message}`);
    console.log(`Time: ${timestamp}`);
    console.log('---');

    // In a production environment, you could save to database or file
    // For now, we'll just log and return success
    return true;
  } catch (error) {
    console.error('Contact form error:', error);
    return false;
  }
}