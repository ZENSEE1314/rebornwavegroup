import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as AppleStrategy, Profile as AppleProfile } from 'passport-apple';
import { storage } from './storage';
import { nanoid } from 'nanoid';
import type { Express } from 'express';

// Configure Google OAuth Strategy
export function setupGoogleAuth() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not found. Google login will be disabled.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
  },
  async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: Function) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), undefined);
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // User exists, update with Google info if needed
        if (user.authProvider !== 'google') {
          await storage.updateUser(user.id, {
            authProvider: 'google',
            googleId: profile.id,
            profileImageUrl: profile.photos?.[0]?.value
          });
        }
      } else {
        // Create new user
        const userId = nanoid();
        user = await storage.createEmailUser({
          id: userId,
          email,
          authProvider: 'google',
          googleId: profile.id,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          profileImageUrl: profile.photos?.[0]?.value,
          referralCode: await storage.createReferralCode(),
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, undefined);
    }
  }));
}

// Configure Apple Sign-In Strategy
export function setupAppleAuth() {
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    console.warn('Apple Sign-In credentials not found. Apple login will be disabled.');
    return;
  }

  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyString: process.env.APPLE_PRIVATE_KEY,
    callbackURL: "/api/auth/apple/callback"
  },
  async (accessToken: string, refreshToken: string, idToken: any, profile: AppleProfile, done: Function) => {
    try {
      const email = profile.email;
      if (!email) {
        return done(new Error('No email found in Apple profile'), undefined);
      }

      // Check if user exists with this email
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        // User exists, update with Apple info if needed
        if (user.authProvider !== 'apple') {
          await storage.updateUser(user.id, {
            authProvider: 'apple',
            appleId: profile.id
          });
        }
      } else {
        // Create new user
        const userId = nanoid();
        user = await storage.createEmailUser({
          id: userId,
          email,
          authProvider: 'apple',
          appleId: profile.id,
          firstName: profile.name?.firstName || '',
          lastName: profile.name?.lastName || '',
          referralCode: await storage.createReferralCode(),
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('Apple OAuth error:', error);
      return done(error, undefined);
    }
  }));
}

// Setup OAuth routes
export function setupOAuthRoutes(app: Express) {
  // Google OAuth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    (req, res) => {
      // Successful authentication
      res.redirect('/');
    }
  );

  // Apple Sign-In routes
  app.get('/api/auth/apple',
    passport.authenticate('apple')
  );

  app.post('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/login?error=apple_auth_failed' }),
    (req, res) => {
      // Successful authentication
      res.redirect('/');
    }
  );

  // Generic logout route for all auth providers
  app.post('/api/auth/logout', (req, res) => {
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
}

// Passport serialization
export function setupPassportSerialization() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}