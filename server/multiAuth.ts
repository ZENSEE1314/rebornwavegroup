import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';

// Helper function to extract user ID from different auth formats
export function getUserId(req: any): string | null {
  return req.user?.claims?.sub || req.user?.id || null;
}
import session from 'express-session';
import connectPg from 'connect-pg-simple';

// Setup session middleware
export function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Detect production/live environment more reliably
  const isLiveServer = process.env.NODE_ENV === 'production' || 
                       process.env.REPL_DEPLOYMENT === '1' || 
                       process.env.REPLIT_DEPLOYMENT === '1' ||
                       process.env.REPLIT_DB_URL || // Replit database indicator
                       process.env.REPL_OWNER; // Replit environment indicator



  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on each request to prevent auto logout
    name: 'reborn.sid', // Custom session name to avoid conflicts
    cookie: {
      httpOnly: true,
      secure: false, // Force false for all Replit environments (HTTP/HTTPS both work)
      maxAge: sessionTtl,
      sameSite: 'lax', // Allows cross-site requests needed for Replit
      domain: undefined, // Let browser handle domain automatically
      path: '/', // Ensure cookies work across all paths
    },
  }));
}

// Setup Passport strategies for authentication
export function setupLocalAuth() {
  // Local Strategy for email/password
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase());
        if (!user || !user.password) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));





  passport.serializeUser((user: any, done) => {

    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {

      const user = await storage.getUser(id);
      if (!user) {

        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      console.error('*** DESERIALIZE DEBUG: Deserialization error:', error);
      done(null, false);
    }
  });
}

// Setup authentication routes
export function setupAuthRoutes(app: Express) {
  // Email/Password Registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phoneNumber, dateOfBirth, gender, referralCode } = req.body;

      if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !gender) {
        return res.status(400).json({ message: 'All fields are required (email, password, firstName, lastName, phoneNumber, dateOfBirth, gender)' });
      }

      // Validate gender field
      if (gender !== 'male' && gender !== 'female') {
        return res.status(400).json({ message: 'Gender must be either male or female' });
      }

      // Check if user already exists (case-insensitive)
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create user with plain password (storage will handle hashing)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUser = await storage.createEmailUser({
        id: userId,
        email: email.toLowerCase(),
        password, // Pass plain password, let storage handle hashing
        authProvider: 'email',
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        dateOfBirth: new Date(dateOfBirth),
        gender: gender || '',
        referralCode: await storage.createReferralCode(),
      });

      // Handle referral if provided
      if (referralCode) {
        await storage.handleReferral(userId, referralCode);
      }

      // Log in the user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phoneNumber: newUser.phoneNumber,
          dateOfBirth: newUser.dateOfBirth,
          gender: newUser.gender,
          authProvider: newUser.authProvider
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Email/Password Login
  app.post('/api/auth/login', (req: Request, res: Response, next) => {


    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {

        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {

        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }


      req.login(user, (err) => {
        if (err) {

          return res.status(500).json({ message: 'Login failed' });
        }
        

        
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          authProvider: user.authProvider
        });
      });
    })(req, res, next);
  });

  // Forgot Password
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, return success even if user doesn't exist
        return res.json({ message: 'If an account with that email exists, you will receive a password reset email.' });
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      // Send reset email (import emailService)
      const { sendEmail } = await import('./emailService');
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      console.log(`Attempting to send password reset email to: ${email}`);
      console.log(`Reset token generated: ${resetToken}`);
      
      const emailSent = await sendEmail({
        to: email,
        from: 'admin@rebornwave.group',
        subject: 'Password Reset Request - Reborn Wave Pet Care',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested a password reset for your Reborn Wave Pet Care account.</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Your reset token is:</strong></p>
              <h3 style="color: #007bff; font-family: monospace; letter-spacing: 2px;">${resetToken}</h3>
            </div>
            <p>Copy and paste this token into the password reset form on our website.</p>
            <p><strong>This token will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Reborn Wave Pet Care - Digital Pet Adventure</p>
          </div>
        `,
        text: `
Password Reset Request

You requested a password reset for your Reborn Wave Pet Care account.

Your reset token is: ${resetToken}

Copy and paste this token into the password reset form on our website.

This token will expire in 1 hour.

If you didn't request this password reset, please ignore this email.
        `
      });

      if (!emailSent) {
        console.error(`Failed to send password reset email to: ${email}`);
        return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
      }

      console.log(`Password reset email sent successfully to: ${email}`);
      res.json({ message: 'Password reset email sent successfully' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to send reset email' });
    }
  });

  // Reset Password
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      // Verify reset token
      const userId = await storage.verifyPasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await storage.updateUserPassword(userId, hashedPassword);
      await storage.clearPasswordResetToken(userId);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Apply referral code for authenticated users
  app.post('/api/auth/apply-referral', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const { referralCode } = req.body;
      if (!referralCode) {
        return res.status(400).json({ message: 'Referral code is required' });
      }
      
      const userId = (req.user as any).id;
      
      // Check if user already has a referral applied
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.referredById) {
        return res.status(400).json({ message: 'Referral code already applied to this account' });
      }
      
      // Apply the referral code
      await storage.handleReferral(userId, referralCode);
      
      res.json({ message: 'Referral code applied successfully' });
    } catch (error) {
      console.error('Error applying referral code:', error);
      res.status(500).json({ message: 'Failed to apply referral code' });
    }
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        authProvider: user.authProvider,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        credits: user.credits,
        loyaltyPoints: user.loyaltyPoints,
        lifetimePoints: user.lifetimePoints,
        referralEarnings: user.referralEarnings,
        tokens: user.tokens
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Logout (POST version for API calls)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Session destruction failed' });
        }
        res.clearCookie('reborn.sid'); // Use custom session name
        res.json({ message: 'Logged out successfully' });
      });
    });
  });

  // Logout (GET version for direct navigation)
  app.get('/api/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.redirect('/');
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.redirect('/');
        }
        res.clearCookie('reborn.sid'); // Use custom session name
        res.redirect('/');
      });
    });
  });






}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: Function) {

  
  if (!req.isAuthenticated() || !req.user) {

    return res.status(401).json({ message: 'Unauthorized', redirect: '/login' });
  }
  

  next();
}

// Initialize multi-provider authentication
export function setupMultiAuth(app: Express) {
  setupSession(app);
  app.use(passport.initialize());
  app.use(passport.session());
  setupLocalAuth();
  setupAuthRoutes(app);
}