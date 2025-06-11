import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import type { Request, Response } from "express";

export async function registerUser(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, referralCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique user ID
    const userId = nanoid();

    // Create user with email authentication
    const newUser = await storage.createEmailUser({
      id: userId,
      email,
      password: hashedPassword,
      authProvider: "email",
      firstName: firstName || "",
      lastName: lastName || "",
      referralCode: await storage.createReferralCode(),
    });

    // Handle referral if provided
    if (referralCode) {
      await storage.handleReferral(userId, referralCode);
    }

    // Set session
    req.session.userId = userId;
    req.session.authProvider = "email";

    res.json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      authProvider: newUser.authProvider,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user || user.authProvider !== "email") {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password || "");
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.authProvider = "email";

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      authProvider: user.authProvider,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

export async function logoutUser(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
}

// Middleware to check if user is authenticated (works for both auth types)
export function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.session.userId) {
    return next();
  }
  
  // Also check for Replit Auth
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ message: "Unauthorized" });
}