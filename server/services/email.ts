import nodemailer from "nodemailer";
import { storage } from "../storage";
import { nanoid } from "nanoid";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Simple SMTP setup for development (you can configure with real SMTP later)
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "your-email@gmail.com", // Replace with actual email
        pass: "your-app-password", // Replace with actual app password
      },
    });
  }

  async sendOtpCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await storage.createOtpCode({
        email: email.toLowerCase(),
        code,
        expiresAt,
        used: false,
      });

      // For development, log the OTP instead of sending email
      console.log(`\n🔑 ===============================`);
      console.log(`🔑 OTP CODE FOR ${email.toUpperCase()}`);
      console.log(`🔑 CODE: ${code}`);
      console.log(`🔑 ===============================\n`);
      
      // Also send it in the response for frontend debugging
      console.log(`📧 EMAIL SERVICE: OTP ${code} generated for ${email}`);
      
      // In production, send actual email:
      /*
      const mailOptions = {
        from: '"AddyPin" <your-email@gmail.com>',
        to: email,
        subject: "AddyPin - Coordinate Edit Verification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Coordinate Edit Verification</h2>
            <p>Your verification code for editing coordinates on AddyPin:</p>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code expires in 15 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      */

      return {
        success: true,
        message: process.env.NODE_ENV === 'development' 
          ? `Verification code sent! Development code: ${code}` 
          : "Verification code sent to your email"
      };
    } catch (error) {
      console.error("Send OTP error:", error);
      return {
        success: false,
        message: "Failed to send verification code"
      };
    }
  }

  async verifyOtpCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpRecord = await storage.getValidOtpCode(email.toLowerCase(), code);
      
      if (!otpRecord) {
        return {
          success: false,
          message: "Invalid or expired verification code"
        };
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(otpRecord.id);

      return {
        success: true,
        message: "Verification successful"
      };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return {
        success: false,
        message: "Verification failed"
      };
    }
  }
}

export const emailService = new EmailService();