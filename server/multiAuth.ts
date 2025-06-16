import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';

// Helper function to extract user ID from different auth formats
function getUserId(req: any): string | null {
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

  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
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
        const user = await storage.getUserByEmail(email);
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

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },
    async (accessToken: string, refreshToken: string, profile: any, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByEmail(profile.emails[0].value);
        
        if (user) {
          // Update existing user with Google profile info if needed
          if (user.authProvider !== 'google') {
            user = await storage.updateUser(user.id, {
              authProvider: 'google',
              googleId: profile.id,
              profileImageUrl: profile.photos[0]?.value
            });
          }
          return done(null, user);
        } else {
          // Create new user
          const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newUser = await storage.createGoogleUser({
            id: userId,
            email: profile.emails[0].value,
            firstName: profile.name.givenName || '',
            lastName: profile.name.familyName || '',
            authProvider: 'google',
            googleId: profile.id,
            profileImageUrl: profile.photos[0]?.value,
            referralCode: await storage.createReferralCode(),
          });
          
          return done(null, newUser);
        }
      } catch (error) {
        console.error('Google auth error:', error);
        return done(error);
      }
    }));
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ['id', 'emails', 'name', 'picture.type(large)']
    },
    async (accessToken: string, refreshToken: string, profile: any, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByEmail(profile.emails[0].value);
        
        if (user) {
          // Update existing user with Facebook profile info if needed
          if (user.authProvider !== 'facebook') {
            user = await storage.updateUser(user.id, {
              authProvider: 'facebook',
              profileImageUrl: profile.photos[0]?.value
            });
          }
          return done(null, user);
        } else {
          // Create new user
          const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newUser = await storage.createFacebookUser({
            id: userId,
            email: profile.emails[0].value,
            firstName: profile.name.givenName || '',
            lastName: profile.name.familyName || '',
            authProvider: 'facebook',
            facebookId: profile.id,
            profileImageUrl: profile.photos[0]?.value,
            referralCode: await storage.createReferralCode(),
          });
          
          return done(null, newUser);
        }
      } catch (error) {
        console.error('Facebook auth error:', error);
        return done(error);
      }
    }));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user with ID:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization:', id);
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.email);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
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

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create user with plain password (storage will handle hashing)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUser = await storage.createEmailUser({
        id: userId,
        email,
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
        from: 'noreply@rebornwavegroup.com',
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
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      console.log('*** AUTH DEBUG: req.user:', req.user);
      console.log('*** AUTH DEBUG: req.isAuthenticated():', req.isAuthenticated());
      const userId = getUserId(req);
      console.log('*** AUTH DEBUG: getUserId result:', userId);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
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
        res.clearCookie('connect.sid');
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
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', 
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      async (req: Request, res: Response) => {
        // Handle pending referral code for new OAuth users
        if (req.user) {
          res.redirect('/?oauth_success=true');
        } else {
          res.redirect('/login');
        }
      }
    );
  } else {
    app.get('/api/auth/google', (req: Request, res: Response) => {
      res.status(501).json({ 
        message: 'Google OAuth not configured. Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
      });
    });
  }

  // Google OAuth setup instructions endpoint
  app.get('/api/auth/google-setup', (req: Request, res: Response) => {
    const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
    const redirectUri = `https://${currentDomain}/api/auth/google/callback`;
    
    res.json({
      currentDomain,
      redirectUri,
      instructions: [
        '1. Go to Google Cloud Console: https://console.cloud.google.com/',
        '2. Navigate to APIs & Services → Credentials',
        '3. Find your OAuth 2.0 Client ID',
        `4. Add this redirect URI to "Authorized redirect URIs": ${redirectUri}`,
        '5. Save changes and try Google login again'
      ]
    });
  });

  // Facebook OAuth routes
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    app.get('/api/auth/facebook', 
      passport.authenticate('facebook', { scope: ['email'] })
    );

    app.get('/api/auth/facebook/callback',
      passport.authenticate('facebook', { failureRedirect: '/login' }),
      async (req: Request, res: Response) => {
        if (req.user) {
          res.redirect('/?oauth_success=true');
        } else {
          res.redirect('/login');
        }
      }
    );
  } else {
    app.get('/api/auth/facebook', (req: Request, res: Response) => {
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const redirectUri = `https://${currentDomain}/api/auth/facebook/callback`;
      
      res.status(501).json({ 
        message: 'Facebook OAuth setup required',
        currentDomain,
        redirectUri,
        instructions: [
          '1. Go to Facebook Developers: https://developers.facebook.com/',
          '2. Create a new app or select existing app',
          '3. Add Facebook Login product',
          `4. Add this redirect URI to "Valid OAuth Redirect URIs": ${redirectUri}`,
          '5. Get your App ID and App Secret',
          '6. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to environment variables',
          '7. Try Facebook login again'
        ]
      });
    });
    
    // Facebook setup instructions endpoint
    app.get('/api/auth/facebook-setup', (req: Request, res: Response) => {
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const redirectUri = `https://${currentDomain}/api/auth/facebook/callback`;
      
      res.json({
        currentDomain,
        redirectUri,
        instructions: [
          '1. Go to Facebook Developers: https://developers.facebook.com/',
          '2. Create a new app or select existing app',
          '3. Add Facebook Login product',
          `4. Add this redirect URI to "Valid OAuth Redirect URIs": ${redirectUri}`,
          '5. Get your App ID and App Secret',
          '6. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to environment variables'
        ]
      });
    });
  }

  // Instagram OAuth routes
  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    app.get('/api/auth/instagram', (req: Request, res: Response) => {
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const redirectUri = `https://${currentDomain}/api/auth/instagram/callback`;
      const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code`;
      
      res.redirect(instagramAuthUrl);
    });

    app.get('/api/auth/instagram/callback', async (req: Request, res: Response) => {
      const { code } = req.query;
      
      if (!code) {
        return res.redirect('/login?error=instagram_auth_failed');
      }

      try {
        const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
        const redirectUri = `https://${currentDomain}/api/auth/instagram/callback`;
        
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.INSTAGRAM_CLIENT_ID!,
            client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code as string,
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          return res.redirect('/login?error=instagram_token_failed');
        }

        // Get user profile
        const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`);
        const profileData = await profileResponse.json();

        // Create or update user
        const userData = {
          email: `${profileData.username}@instagram.local`,
          firstName: profileData.username,
          lastName: '',
          authProvider: 'instagram',
          providerId: profileData.id,
          profileImageUrl: null
        };

        // Handle referral code from localStorage (similar to other OAuth providers)
        const user = await storage.createUser(userData);
        
        // Set up session
        req.login(user, (err) => {
          if (err) {
            return res.redirect('/login?error=session_failed');
          }
          res.redirect('/?oauth_success=true');
        });

      } catch (error) {
        console.error('Instagram OAuth error:', error);
        res.redirect('/login?error=instagram_auth_failed');
      }
    });
  } else {
    app.get('/api/auth/instagram', (req: Request, res: Response) => {
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const redirectUri = `https://${currentDomain}/api/auth/instagram/callback`;
      
      res.status(501).json({ 
        message: 'Instagram OAuth setup required',
        currentDomain,
        redirectUri,
        instructions: [
          '1. Go to Instagram Basic Display: https://developers.facebook.com/apps/',
          '2. Create a new app or select existing app',
          '3. Add Instagram Basic Display product',
          `4. Add this redirect URI to "Valid OAuth Redirect URIs": ${redirectUri}`,
          '5. Get your Instagram App ID and App Secret',
          '6. Add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET to environment variables',
          '7. Try Instagram login again'
        ]
      });
    });
    
    // Instagram setup instructions endpoint
    app.get('/api/auth/instagram-setup', (req: Request, res: Response) => {
      const currentDomain = process.env.REPLIT_DEV_DOMAIN || req.get('host');
      const redirectUri = `https://${currentDomain}/api/auth/instagram/callback`;
      
      res.json({
        currentDomain,
        redirectUri,
        instructions: [
          '1. Go to Instagram Basic Display: https://developers.facebook.com/apps/',
          '2. Create a new app or select existing app',
          '3. Add Instagram Basic Display product',
          `4. Add this redirect URI to "Valid OAuth Redirect URIs": ${redirectUri}`,
          '5. Get your Instagram App ID and App Secret',
          '6. Add INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET to environment variables'
        ]
      });
    });
  }
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
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