import crypto from "crypto";
import { storage } from "../storage";
import { emailService } from "./email";
import type { InsertOtpCode, InsertUserSession } from "@shared/schema";

export class AuthService {
  // Generate a 6-digit OTP code
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate a secure session token
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Send OTP code to email
  async sendOtpCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: "Invalid email format" };
      }

      // Generate OTP code
      const code = this.generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpCode({
        email,
        code,
        expiresAt,
        used: false,
      });

      // Send email with OTP
      const emailSent = await emailService.sendOtpEmail(email, code);
      
      if (!emailSent) {
        return { success: false, message: "Failed to send OTP email" };
      }

      return { success: true, message: "OTP sent to your email" };
    } catch (error) {
      console.error("Error sending OTP:", error);
      return { success: false, message: "Failed to send OTP" };
    }
  }

  // Verify OTP code and create session
  async verifyOtpAndCreateSession(email: string, code: string): Promise<{ 
    success: boolean; 
    message: string; 
    sessionToken?: string; 
  }> {
    try {
      // Find valid OTP code
      const otpRecord = await storage.getValidOtpCode(email, code);
      
      if (!otpRecord) {
        return { success: false, message: "Invalid or expired OTP code" };
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(otpRecord.id);

      // Create session
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createUserSession({
        email,
        sessionToken,
        expiresAt,
      });

      return { 
        success: true, 
        message: "Authentication successful", 
        sessionToken 
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { success: false, message: "Verification failed" };
    }
  }

  // Verify session token
  async verifySession(sessionToken: string): Promise<{ 
    valid: boolean; 
    email?: string; 
  }> {
    try {
      const session = await storage.getValidUserSession(sessionToken);
      
      if (!session) {
        return { valid: false };
      }

      return { valid: true, email: session.email };
    } catch (error) {
      console.error("Error verifying session:", error);
      return { valid: false };
    }
  }

  // Logout (invalidate session)
  async logout(sessionToken: string): Promise<{ success: boolean }> {
    try {
      await storage.deleteUserSession(sessionToken);
      return { success: true };
    } catch (error) {
      console.error("Error logging out:", error);
      return { success: false };
    }
  }

  // Cleanup expired OTP codes and sessions
  async cleanupExpired(): Promise<void> {
    try {
      await storage.cleanupExpiredOtpCodes();
      await storage.cleanupExpiredSessions();
    } catch (error) {
      console.error("Error cleaning up expired data:", error);
    }
  }
}

export const authService = new AuthService();

// Run cleanup every hour
setInterval(() => {
  authService.cleanupExpired();
}, 60 * 60 * 1000);