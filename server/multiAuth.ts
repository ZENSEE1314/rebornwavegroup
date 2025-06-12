import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';
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
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
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
      const { email, password, firstName, lastName, referralCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUser = await storage.createEmailUser({
        id: userId,
        email,
        password: hashedPassword,
        authProvider: 'email',
        firstName: firstName || '',
        lastName: lastName || '',
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
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser((req.user as any).id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authProvider: user.authProvider,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Logout
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
      res.status(501).json({ 
        message: 'Facebook OAuth not configured. Please provide FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.' 
      });
    });
  }

  // Instagram OAuth routes (placeholder for future implementation)
  app.get('/api/auth/instagram', (req: Request, res: Response) => {
    res.status(501).json({ 
      message: 'Instagram OAuth not configured. Please provide Instagram OAuth credentials.' 
    });
  });
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
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