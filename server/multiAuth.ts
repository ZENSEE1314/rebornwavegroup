import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { db } from './db';
import { currentTenant } from './tenantContext';
import { sql } from 'drizzle-orm';
import type { Express, Request, Response } from 'express';
import { tr, pick, reqLang } from './i18n';

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
    createTableIfMissing: true,
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

// A phone number in one form for matching: digits only, Indonesian 08… / 8… → 628….
export function phoneKey(v: unknown): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8") && d.length >= 9 && d.length <= 13) d = "62" + d;
  return d;
}
// Accounts whose saved phone number is this number (any format).
export async function usersByPhone(phone: unknown): Promise<any[]> {
  const key = phoneKey(phone);
  if (key.length < 8) return [];
  const result: any = await db.execute(sql`SELECT id, email, password, phone_number FROM users WHERE phone_number LIKE ${"%" + key.slice(-8)} OR regexp_replace(phone_number, '\D', '', 'g') LIKE ${"%" + key.slice(-8)} ORDER BY updated_at DESC NULLS LAST LIMIT 20`);
  return ((result.rows || result) as any[]).filter((u) => phoneKey(u.phone_number) === key);
}
// Login names: an email, or a phone number for accounts made without email.
const looksLikePhone = (v: string) => !v.includes("@") && v.replace(/\D/g, "").length >= 8 && /^[\d\s()+.-]+$/.test(v.trim());

// Setup Passport strategies for authentication
export function setupLocalAuth() {
  // Local Strategy for email/password
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done) => {
      try {
        // A phone number logs in the account saved with that number (sign-up without email).
        if (looksLikePhone(String(email || ''))) {
          for (const row of await usersByPhone(email)) {
            if (row.password && await bcrypt.compare(password, row.password)) return done(null, row);
          }
          return done(null, false, { message: 'Invalid email or password' });
        }
        // Capital letters and stray spaces in the email never matter.
        const result: any = await db.execute(sql`
          SELECT id, email, password
          FROM users
          WHERE lower(trim(email)) = lower(trim(${String(email || '')}))
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 5
        `);
        // Older accounts may exist twice with different capitals — accept the one whose password matches.
        let user: any = null;
        for (const row of (result.rows || result) as any[]) {
          if (row.password && await bcrypt.compare(password, row.password)) { user = row; break; }
        }
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));





  // A login made inside a company's own data space is tagged with that space.
  passport.serializeUser((user: any, done) => {
    const tenant = currentTenant();
    done(null, tenant ? { id: user.id, space: tenant.schema } : user.id);
  });

  passport.deserializeUser(async (stored: string | { id: string; space: string }, done) => {
    try {
      const id = typeof stored === "string" ? stored : stored.id;
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

      // Email is optional: without one, the member logs in with their phone number.
      if (!password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !gender) {
        return res.status(400).json({ message: tr(req, { en: 'All fields are required (password, first name, last name, phone number, date of birth, gender)', zh: '请填写所有必填项（密码、名字、姓氏、电话号码、出生日期、性别）', id: 'Semua kolom wajib diisi (kata sandi, nama depan, nama belakang, nomor telepon, tanggal lahir, jenis kelamin)' }) });
      }
      if (!String(email || '').trim() && (await usersByPhone(phoneNumber)).length) {
        return res.status(400).json({ message: tr(req, { en: 'This phone number already has an account. Log in with your phone number, or add an email to sign up.', zh: '该手机号已有账户。请用手机号登录，或填写邮箱注册。', id: 'Nomor HP ini sudah punya akun. Login dengan nomor HP, atau isi email untuk daftar.' }) });
      }

      // Validate gender field
      if (gender !== 'male' && gender !== 'female') {
        return res.status(400).json({ message: tr(req, { en: 'Gender must be either male or female', zh: '性别必须是男或女', id: 'Jenis kelamin harus laki-laki atau perempuan' }) });
      }

      // Check if user already exists (case-insensitive)
      const existingUser = String(email || '').trim() ? await storage.getUserByEmail(String(email).trim().toLowerCase()) : null;
      if (existingUser) {
        return res.status(400).json({ message: tr(req, { en: 'User already exists with this email', zh: '该邮箱已被注册', id: 'Email ini sudah terdaftar' }) });
      }

      // Create user with plain password (storage will handle hashing)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUser = await storage.createEmailUser({
        id: userId,
        email: String(email || '').trim().toLowerCase() || null,
        password, // Pass plain password, let storage handle hashing
        authProvider: 'email',
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        dateOfBirth: new Date(dateOfBirth),
        gender: gender || '',
        referralCode: await storage.createReferralCode(),
      });

      // Handle referral if provided; otherwise the signup belongs to the house
      // (admin) account so un-referred signups still generate commission.
      if (referralCode) {
        await storage.handleReferral(userId, referralCode);
      } else {
        try {
          const rows: any = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'houseReferralUserId'`);
          const houseId = (rows.rows || rows)[0]?.value;
          if (houseId) await db.execute(sql`UPDATE users SET referred_by_id = ${houseId} WHERE id = ${newUser.id} AND referred_by_id IS NULL`);
        } catch (e) { console.error('house referral assign', e); }
      }

      // Log in the user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: tr(req, { en: 'Registration successful but login failed', zh: '注册成功，但登录失败', id: 'Pendaftaran berhasil, tetapi gagal masuk' }) });
        }
        if (/RebornWaveGroupApp/i.test(String(req.headers['user-agent'] || ''))) req.session.cookie.maxAge = 10 * 365 * 24 * 60 * 60 * 1000;
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
      res.status(500).json({ message: tr(req, { en: 'Registration failed', zh: '注册失败', id: 'Pendaftaran gagal' }) });
    }
  });

  // Email/Password Login
  app.post('/api/auth/login', (req: Request, res: Response, next) => {


    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {

        return res.status(500).json({ message: tr(req, { en: 'Authentication error', zh: '验证出错', id: 'Terjadi kesalahan autentikasi' }) });
      }
      if (!user) {

        return res.status(401).json({ message: info?.message === 'Missing credentials' ? tr(req, { en: 'Please enter your email or phone number and password', zh: '请输入邮箱或手机号和密码', id: 'Masukkan email atau nomor HP dan kata sandi' }) : tr(req, { en: 'Invalid email / phone number or password', zh: '邮箱/手机号或密码错误', id: 'Email / nomor HP atau kata sandi salah' }) });
      }


      req.login(user, (err) => {
        if (err) {

          return res.status(500).json({ message: tr(req, { en: 'Login failed', zh: '登录失败', id: 'Gagal masuk' }) });
        }

        const rememberMe = req.body?.rememberMe === true;
        const nativeApp = /RebornWaveGroupApp/i.test(String(req.headers['user-agent'] || ''));
        req.session.cookie.maxAge = nativeApp
          ? 10 * 365 * 24 * 60 * 60 * 1000
          : rememberMe
            ? 30 * 24 * 60 * 60 * 1000
            : 8 * 60 * 60 * 1000;

        
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
      const requestedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

      if (!requestedEmail) {
        return res.status(400).json({ message: tr(req, { en: 'Email is required', zh: '请输入邮箱', id: 'Email wajib diisi' }) });
      }

      // Check if user exists
      let user = await storage.getUserByEmail(requestedEmail);
      const recoveryEmails = new Set(
        [process.env.ADMIN_EMAIL, process.env.ZENSEE_RESET_EMAIL, 'zensee1314@gmail.com']
          .filter(Boolean)
          .map((item) => String(item).trim().toLowerCase()),
      );

      if (!user) {
        console.warn(`Password reset requested for non-existing email: ${requestedEmail}`);
        if (recoveryEmails.has(requestedEmail)) {
          const temporaryPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
          user = await storage.createEmailUser({
            email: requestedEmail,
            username: requestedEmail.split('@')[0],
            password: temporaryPassword,
            firstName: 'Reborn',
            lastName: 'Owner',
            phoneNumber: '',
            gender: '',
          });
          console.warn(`Created owner recovery account for ${requestedEmail}; sending password reset email now.`);
        } else {
        // For security, return success even if user doesn't exist
        return res.json({ message: tr(req, { en: 'If an account with that email exists, you will receive a password reset email.', zh: '如果该邮箱已注册账户，你将收到一封重置密码的邮件。', id: 'Jika ada akun dengan email tersebut, kamu akan menerima email untuk mengatur ulang kata sandi.' }) });
        }
      }

      if (recoveryEmails.has(requestedEmail) && user.role !== 'admin') {
        await db.execute(sql`
          UPDATE users
          SET role = 'admin',
              updated_at = NOW()
          WHERE id = ${user.id}
        `);
        user.role = 'admin';
        console.warn(`Promoted owner recovery account to admin: ${requestedEmail}`);
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      const { sendEmailDetailed } = await import('./emailService');
      const appUrl = process.env.PUBLIC_APP_URL || `${req.get('x-forwarded-proto') || req.protocol || 'https'}://${req.get('host')}`;
      const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
      
      console.log(`Attempting to send password reset email to: ${requestedEmail}`);
      console.log(`Reset token generated for ${requestedEmail}: ${resetToken}`);
      
      const lang = reqLang(req);
      const L = {
        subject: pick(lang, { en: 'Password Reset Request - Reborn Wave Pet Care', zh: '重置密码请求 - Reborn Wave Pet Care', id: 'Permintaan Atur Ulang Kata Sandi - Reborn Wave Pet Care' }),
        heading: pick(lang, { en: 'Password Reset Request', zh: '重置密码请求', id: 'Permintaan Atur Ulang Kata Sandi' }),
        intro: pick(lang, { en: 'You requested a password reset for your Reborn Wave Pet Care account.', zh: '你申请了重置 Reborn Wave Pet Care 账户的密码。', id: 'Kamu meminta atur ulang kata sandi untuk akun Reborn Wave Pet Care kamu.' }),
        tokenLabel: pick(lang, { en: 'Your reset token is:', zh: '你的重置码是：', id: 'Token atur ulang kamu:' }),
        button: pick(lang, { en: 'Reset password now', zh: '立即重置密码', id: 'Atur ulang kata sandi sekarang' }),
        buttonHelp: pick(lang, { en: 'If the button does not work, copy and paste this token into the password reset form on our website.', zh: '如果按钮无法使用，请复制此重置码并粘贴到我们网站的重置密码表单中。', id: 'Jika tombol tidak berfungsi, salin dan tempel token ini ke formulir atur ulang kata sandi di situs kami.' }),
        linkHelp: pick(lang, { en: 'If the link does not work, copy and paste this token into the password reset form on our website.', zh: '如果链接无法打开，请复制此重置码并粘贴到我们网站的重置密码表单中。', id: 'Jika tautan tidak berfungsi, salin dan tempel token ini ke formulir atur ulang kata sandi di situs kami.' }),
        linkLabel: pick(lang, { en: 'Reset link:', zh: '重置链接：', id: 'Tautan atur ulang:' }),
        expiry: pick(lang, { en: 'This token will expire in 1 hour.', zh: '此重置码将在 1 小时后失效。', id: 'Token ini akan kedaluwarsa dalam 1 jam.' }),
        ignore: pick(lang, { en: "If you didn't request this password reset, please ignore this email.", zh: '如果你没有申请重置密码，请忽略此邮件。', id: 'Jika kamu tidak meminta atur ulang kata sandi, abaikan email ini.' }),
        footer: pick(lang, { en: 'Reborn Wave Pet Care - Digital Pet Adventure', zh: 'Reborn Wave Pet Care - 数字宠物冒险', id: 'Reborn Wave Pet Care - Petualangan Hewan Digital' }),
      };
      const emailResult = await sendEmailDetailed({
        to: requestedEmail,
        from: process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Reborn Wave Group <onboarding@resend.dev>',
        subject: L.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${L.heading}</h2>
            <p>${L.intro}</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p><strong>${L.tokenLabel}</strong></p>
              <h3 style="color: #007bff; font-family: monospace; letter-spacing: 2px;">${resetToken}</h3>
            </div>
            <p><a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#111827;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">${L.button}</a></p>
            <p>${L.buttonHelp}</p>
            <p><strong>${L.expiry}</strong></p>
            <p>${L.ignore}</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">${L.footer}</p>
          </div>
        `,
        text: `
${L.heading}

${L.intro}

${L.tokenLabel} ${resetToken}

${L.linkLabel} ${resetUrl}

${L.linkHelp}

${L.expiry}

${L.ignore}
        `
      });

      if (!emailResult.ok) {
        console.error(`Failed to send password reset email to: ${requestedEmail}. Provider=${emailResult.provider}, From=${emailResult.from}, Error=${emailResult.error}`);
        if (recoveryEmails.has(requestedEmail)) {
          return res.json({
            message: tr(req, { en: 'Email provider failed. Use the recovery token shown to reset your password.', zh: '邮件服务发送失败。请使用下方显示的恢复码重置密码。', id: 'Layanan email gagal. Gunakan token pemulihan yang ditampilkan untuk mengatur ulang kata sandi.' }),
            recoveryToken: resetToken,
            resetUrl,
            emailStatus: {
              provider: emailResult.provider,
              from: emailResult.from,
              error: emailResult.error,
              hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
              hasSendGridKey: Boolean(process.env.SENDGRID_API_KEY?.trim()),
            },
          });
        }
        return res.status(500).json({ message: tr(req, { en: 'Failed to send reset email. Please try again later.', zh: '重置邮件发送失败，请稍后再试。', id: 'Gagal mengirim email atur ulang. Silakan coba lagi nanti.' }) });
      }

      console.log(`Password reset email sent successfully to: ${requestedEmail} via ${emailResult.provider}`);
      res.json({ message: tr(req, { en: 'Password reset email sent successfully', zh: '重置密码邮件已发送', id: 'Email atur ulang kata sandi berhasil dikirim' }) });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: tr(req, { en: 'Failed to send reset email', zh: '重置邮件发送失败', id: 'Gagal mengirim email atur ulang' }) });
    }
  });

  // Reset Password
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: tr(req, { en: 'Token and new password are required', zh: '请输入重置码和新密码', id: 'Token dan kata sandi baru wajib diisi' }) });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: tr(req, { en: 'Password must be at least 6 characters', zh: '密码至少需要 6 个字符', id: 'Kata sandi minimal 6 karakter' }) });
      }

      // Verify reset token
      const userId = await storage.verifyPasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: tr(req, { en: 'Invalid or expired reset token', zh: '重置码无效或已过期', id: 'Token atur ulang tidak valid atau sudah kedaluwarsa' }) });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await storage.updateUserPassword(userId, hashedPassword);
      await storage.clearPasswordResetToken(userId);

      res.json({ message: tr(req, { en: 'Password reset successfully', zh: '密码已重置', id: 'Kata sandi berhasil diatur ulang' }) });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: tr(req, { en: 'Failed to reset password', zh: '密码重置失败', id: 'Gagal mengatur ulang kata sandi' }) });
    }
  });

  // Apply referral code for authenticated users
  app.post('/api/auth/apply-referral', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: tr(req, { en: 'Not authenticated', zh: '尚未登录', id: 'Belum masuk' }) });
    }
    
    try {
      const { referralCode } = req.body;
      if (!referralCode) {
        return res.status(400).json({ message: tr(req, { en: 'Referral code is required', zh: '请输入推荐码', id: 'Kode referral wajib diisi' }) });
      }
      
      const userId = (req.user as any).id;
      
      // Check if user already has a referral applied
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: tr(req, { en: 'User not found', zh: '找不到该用户', id: 'Pengguna tidak ditemukan' }) });
      }
      
      if (user.referredById) {
        return res.status(400).json({ message: tr(req, { en: 'Referral code already applied to this account', zh: '此账户已使用过推荐码', id: 'Kode referral sudah digunakan di akun ini' }) });
      }
      
      // Apply the referral code
      await storage.handleReferral(userId, referralCode);
      
      res.json({ message: tr(req, { en: 'Referral code applied successfully', zh: '推荐码已成功使用', id: 'Kode referral berhasil diterapkan' }) });
    } catch (error) {
      console.error('Error applying referral code:', error);
      res.status(500).json({ message: tr(req, { en: 'Failed to apply referral code', zh: '推荐码使用失败', id: 'Gagal menerapkan kode referral' }) });
    }
  });

  // Get current user
  app.get('/api/auth/user', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: tr(req, { en: 'Not authenticated', zh: '尚未登录', id: 'Belum masuk' }) });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: tr(req, { en: 'User not found', zh: '找不到该用户', id: 'Pengguna tidak ditemukan' }) });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        address: (user as any).address,
        country: (user as any).country,
        preferredLanguage: (user as any).preferredLanguage,
        membershipCardNumber: (user as any).membershipCardNumber,
        mustChangePassword: (user as any).mustChangePassword,
        authProvider: user.authProvider,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        credits: user.credits,
        loyaltyPoints: user.loyaltyPoints,
        lifetimePoints: user.lifetimePoints,
        kgold: (user as any).kgold,
        referralEarnings: user.referralEarnings,
        referralCode: user.referralCode,
        bankName: user.bankName,
        bankAccountNumber: user.bankAccountNumber,
        accountHolderName: user.accountHolderName,
        tokens: user.tokens
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: tr(req, { en: 'Failed to fetch user', zh: '获取用户信息失败', id: 'Gagal memuat data pengguna' }) });
    }
  });

  // Logout (POST version for API calls)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: tr(req, { en: 'Logout failed', zh: '退出登录失败', id: 'Gagal keluar' }) });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: tr(req, { en: 'Session destruction failed', zh: '会话清除失败', id: 'Gagal mengakhiri sesi' }) });
        }
        res.clearCookie('reborn.sid'); // Use custom session name
        res.json({ message: tr(req, { en: 'Logged out successfully', zh: '已退出登录', id: 'Berhasil keluar' }) });
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
  // Check if user is authenticated via session
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: tr(req, { en: 'Unauthorized', zh: '未授权，请先登录', id: 'Tidak diizinkan, silakan masuk' }), redirect: '/login' });
  }
  
  next();
}

// Initialize multi-provider authentication
// One browser session can be logged in to several companies' data spaces at once (e.g. an
// owner in the BridgeX console and in their own app on the same host). A login remembers
// the space it was made in; only the login of the space this request belongs to is live,
// the others wait in their slots — so a login from one company is never offered to another,
// and visiting one doesn't log out the other.
const PLATFORM_SPACE = "platform";
type StoredLogin = string | { id: string; space: string };
const loginSpace = (stored: StoredLogin | undefined) => (stored && typeof stored === "object" ? stored.space : PLATFORM_SPACE);

function loginSlotPerDataSpace(req: Request, _res: Response, next: Function) {
  const session = req.session as any;
  if (!session) return next();
  const space = currentTenant()?.schema ?? PLATFORM_SPACE;
  const slots: Record<string, unknown> = session.loginSlots ?? {};
  const live = session.passport?.user as StoredLogin | undefined;
  if (live && loginSpace(live) !== space) { slots[loginSpace(live)] = session.passport; delete session.passport; }
  if (!session.passport && slots[space]) { session.passport = slots[space]; delete slots[space]; }
  if (Object.keys(slots).length || session.loginSlots) session.loginSlots = slots;
  next();
}

// Passport starts a fresh session on login; keep the other spaces' login slots across it.
function keepLoginSlotsOnLogin(req: Request, _res: Response, next: Function) {
  const login = req.login.bind(req) as (user: unknown, options: object, done: (error: unknown) => void) => void;
  const keeping = (user: unknown, options: any, done?: any) => {
    const callback = typeof options === "function" ? options : done;
    return login(user, { ...(typeof options === "object" ? options : {}), keepSessionInfo: true }, callback);
  };
  req.login = req.logIn = keeping as typeof req.login;
  next();
}

export function setupMultiAuth(app: Express) {
  setupSession(app);
  app.use(loginSlotPerDataSpace);
  app.use(passport.initialize());
  app.use(keepLoginSlotsOnLogin);
  app.use(passport.session());
  setupLocalAuth();
  setupAuthRoutes(app);
}
