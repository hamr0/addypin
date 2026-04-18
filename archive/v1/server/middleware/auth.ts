import { Request, Response, NextFunction } from "express";
import { clerkClient, verifyToken } from "@clerk/clerk-sdk-node";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      issuer: `https://clerk.${process.env.CLERK_PUBLISHABLE_KEY?.split('_')[1]}.lcl.dev`,
    });

    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Add user info to request
    req.userId = payload.sub;
    req.userEmail = payload.email as string || undefined;

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};