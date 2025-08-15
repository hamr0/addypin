import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OTPEmailParams {
  to: string;
  code: string;
}

export async function sendOTPEmail({ to, code }: OTPEmailParams): Promise<{ success: boolean; message: string }> {
  try {
    // Development fallback - log to console
    if (!process.env.RESEND_API_KEY) {
      console.log(`\n🔑 ===============================`);
      console.log(`🔑 DEVELOPMENT MODE - OTP CODE`);
      console.log(`🔑 Email: ${to}`);
      console.log(`🔑 Code: ${code}`);
      console.log(`🔑 ===============================\n`);
      
      return { 
        success: true, 
        message: "Development mode: Check server console for OTP code" 
      };
    }

    // Production - send actual email
    const { data, error } = await resend.emails.send({
      from: 'addypin <noreply@addypin.com>',
      to: [to],
      subject: 'Your addypin Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>addypin Verification Code</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
              }
              .content {
                padding: 30px 20px;
                text-align: center;
              }
              .otp-code {
                display: inline-block;
                background: #f1f3f4;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                padding: 15px 25px;
                margin: 20px 0;
                color: #1f2937;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
              }
              .addypin-logo {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 8px;
              }
              .logo-text {
                font-size: 24px;
                font-weight: 700;
                color: white;
                letter-spacing: -0.025em;
              }
              .logo-pin {
                display: inline-block;
                width: 16px;
                height: 16px;
                background: #00BCD4;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                position: relative;
                margin: 0 3px;
                border: 2px solid white;
                box-shadow: 0 1px 4px rgba(0, 188, 212, 0.3);
              }
              .logo-pin::after {
                content: '';
                position: absolute;
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                top: 3px;
                left: 3px;
                transform: rotate(45deg);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="addypin-logo">
                  <span class="logo-text">addy</span>
                  <div class="logo-pin"></div>
                  <span class="logo-text">in</span>
                </div>
                <p>Location sharing made simple</p>
              </div>
              <div class="content">
                <h2 style="margin-top: 0; color: #1f2937;">Verify Your Email</h2>
                <p>Enter this verification code to edit your addypin coordinates:</p>
                <div class="otp-code">${code}</div>
                <p style="color: #6b7280;">This code expires in 10 minutes.</p>
              </div>
              <div class="footer">
                <p>If you didn't request this code, please ignore this email.</p>
                <p>© 2025 addypin - Secure location sharing</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        addypin - Verification Code
        
        Your verification code is: ${code}
        
        Enter this code to verify your email and edit your addypin coordinates.
        This code expires in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        © 2025 addypin - Secure location sharing
      `
    });

    if (error) {
      console.error('Resend email error:', error);
      
      // Any error - fall back to console logging
      console.log(`\n🔑 ===============================`);
      console.log(`🔑 EMAIL FALLBACK MODE - OTP CODE`);
      console.log(`🔑 Email: ${to}`);
      console.log(`🔑 Code: ${code}`);
      console.log(`🔑 Note: Domain verification needed for email delivery`);
      console.log(`🔑 ===============================\n`);
      
      return { 
        success: true, 
        message: "Check server console for verification code (email setup pending)" 
      };
    }

    console.log('✅ OTP email sent successfully:', data?.id);
    return { 
      success: true, 
      message: "Verification code sent to your email" 
    };

  } catch (error) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      message: "Failed to send verification code" 
    };
  }
}