import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireAuth, getUserId } from "./multiAuth";

type DbRow = Record<string, any>;

const PROJECTS = [
  ["ktv_lounge", "KTV Lounge", "Private rooms, hosting, bottles, birthdays, singing competitions.", "ktv"],
  ["beauty", "Beauty", "Salon services, glow-up packages, appointment traffic.", "beauty"],
  ["game_house", "Game House", "Family-friendly games, kids traffic, tournaments, redemption play.", "game"],
  ["live_house", "Live House", "Sea-view music, live band, dance floor, premium table nights.", "live"],
  ["pet_cafe", "Pet Cafe", "Doluruu-powered pet cafe, food, drinks, content, community.", "pet"],
];

const DEFAULT_PACKAGES = [
  ["Starter Unit", "500.00", "One allocation unit for one Reborn Wave project."],
  ["Builder Pack", "1000.00", "Two allocation units across your chosen projects."],
  ["Growth Pack", "3000.00", "Six allocation units for flexible project exposure."],
  ["Founder Pack", "5000.00", "Ten allocation units for serious early supporters."],
  ["Anchor Pack", "10000.00", "Twenty allocation units for major project participation."],
];

function rows(result: any): DbRow[] {
  return Array.isArray(result) ? result : result?.rows || [];
}

function money(value: any): number {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rounded(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function query(statement: any) {
  return rows(await db.execute(statement));
}

async function currentUser(req: Request) {
  const userId = getUserId(req as any);
  if (!userId) return null;
  const result = await query(sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`);
  return result[0] || null;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await currentUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

async function createReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await query(sql`SELECT id FROM users WHERE referral_code = ${code} LIMIT 1`);
    if (existing.length === 0) return code;
  }
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureWallet(userId: string) {
  await db.execute(sql`
    INSERT INTO investor_wallets (user_id, qr_code)
    VALUES (${userId}, ${`INVQR-${userId}`})
    ON CONFLICT (user_id) DO NOTHING
  `);
}

async function getPoolStats() {
  const [pool] = await query(sql`
    SELECT COALESCE(SUM(CAST(amount_usdt AS NUMERIC)), 0)::text AS balance
    FROM investor_pool_events
  `);
  const [tokens] = await query(sql`
    SELECT COALESCE(SUM(CAST(active_tokens AS NUMERIC)), 0)::text AS active_tokens
    FROM investor_token_balances
  `);
  const poolBalance = money(pool?.balance);
  const activeTokens = money(tokens?.active_tokens);
  return {
    poolBalance,
    activeTokens,
    tokenPrice: activeTokens > 0 ? poolBalance / activeTokens : 0,
  };
}

async function addWalletBalance(userId: string, cashDelta: number, spendingDelta: number) {
  await ensureWallet(userId);
  await db.execute(sql`
    UPDATE investor_wallets
    SET cash_balance = cash_balance + ${rounded(cashDelta)},
        spending_balance = spending_balance + ${rounded(spendingDelta)},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `);
}

async function ensureInvestorSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS investor_wallets (
      user_id VARCHAR PRIMARY KEY REFERENCES users(id),
      cash_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      spending_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      connected_wallet VARCHAR,
      qr_code VARCHAR UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_settings (
      key VARCHAR PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_packages (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      amount_usdt NUMERIC(14, 2) NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_projects (
      code VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      description TEXT NOT NULL,
      image_key VARCHAR NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS investor_topups (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      wallet_address VARCHAR NOT NULL,
      tx_hash VARCHAR NOT NULL UNIQUE,
      amount_usdt NUMERIC(14, 2) NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'confirmed',
      created_at TIMESTAMP DEFAULT NOW(),
      confirmed_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_purchases (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      package_id INTEGER NOT NULL REFERENCES investor_packages(id),
      amount_usdt NUMERIC(14, 2) NOT NULL,
      units INTEGER NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_allocations (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES investor_purchases(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      project_code VARCHAR NOT NULL REFERENCES investor_projects(code),
      units INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_token_balances (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      project_code VARCHAR NOT NULL REFERENCES investor_projects(code),
      active_tokens NUMERIC(18, 4) NOT NULL DEFAULT 0,
      sold_tokens NUMERIC(18, 4) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, project_code)
    )`,
    `CREATE TABLE IF NOT EXISTS investor_token_ledger (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      project_code VARCHAR NOT NULL REFERENCES investor_projects(code),
      tokens NUMERIC(18, 4) NOT NULL,
      type VARCHAR NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_daily_token_claims (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      claim_date VARCHAR NOT NULL,
      tokens_awarded NUMERIC(18, 4) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, claim_date)
    )`,
    `CREATE TABLE IF NOT EXISTS investor_pool_events (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(id),
      purchase_id INTEGER REFERENCES investor_purchases(id),
      amount_usdt NUMERIC(14, 2) NOT NULL,
      type VARCHAR NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_referral_rewards (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES investor_purchases(id),
      beneficiary_user_id VARCHAR NOT NULL REFERENCES users(id),
      source_user_id VARCHAR NOT NULL REFERENCES users(id),
      level INTEGER NOT NULL,
      wallet_type VARCHAR NOT NULL,
      amount_usdt NUMERIC(14, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS investor_withdrawals (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      amount_usdt NUMERIC(14, 2) NOT NULL,
      wallet_address VARCHAR NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      requested_at TIMESTAMP DEFAULT NOW(),
      processed_at TIMESTAMP,
      processed_by VARCHAR REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS investor_qr_payments (
      id SERIAL PRIMARY KEY,
      investor_user_id VARCHAR NOT NULL REFERENCES users(id),
      merchant_user_id VARCHAR REFERENCES users(id),
      amount_usdt NUMERIC(14, 2) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ];

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }

  await db.execute(sql`
    INSERT INTO investor_settings (key, value)
    VALUES ('bep20_admin_wallet', ${JSON.stringify({ address: process.env.INVESTOR_BEP20_ADMIN_WALLET || "" })}::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);

  for (let index = 0; index < PROJECTS.length; index += 1) {
    const [code, name, description, imageKey] = PROJECTS[index];
    await db.execute(sql`
      INSERT INTO investor_projects (code, name, description, image_key, display_order)
      VALUES (${code}, ${name}, ${description}, ${imageKey}, ${index})
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          image_key = EXCLUDED.image_key,
          display_order = EXCLUDED.display_order
    `);
  }

  const [packageCount] = await query(sql`SELECT COUNT(*)::int AS count FROM investor_packages`);
  if (Number(packageCount?.count || 0) === 0) {
    for (let index = 0; index < DEFAULT_PACKAGES.length; index += 1) {
      const [name, amount, description] = DEFAULT_PACKAGES[index];
      await db.execute(sql`
        INSERT INTO investor_packages (name, amount_usdt, description, display_order)
        VALUES (${name}, ${amount}, ${description}, ${index})
      `);
    }
  }
}

function publicUser(user: DbRow) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    referralCode: user.referral_code,
    referredById: user.referred_by_id,
  };
}

export async function registerInvestorRoutes(app: Express) {
  await ensureInvestorSchema();

  app.post("/api/investor/auth/register", async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, referralCode } = req.body || {};
    if (!email || !password || !firstName) {
      return res.status(400).json({ message: "Email, password, and first name are required" });
    }

    const existing = await query(sql`SELECT id FROM users WHERE lower(email) = lower(${email}) LIMIT 1`);
    if (existing.length > 0) return res.status(400).json({ message: "Investor already exists" });

    const userId = `investor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const hashed = await bcrypt.hash(password, 12);
    const newReferralCode = await createReferralCode();
    const [referrer] = referralCode
      ? await query(sql`SELECT id, referred_by_id FROM users WHERE referral_code = ${referralCode} LIMIT 1`)
      : [];

    const [user] = await query(sql`
      INSERT INTO users (id, email, password, auth_provider, first_name, last_name, role, referral_code, referred_by_id, created_at, updated_at)
      VALUES (${userId}, ${String(email).toLowerCase()}, ${hashed}, 'email', ${firstName}, ${lastName || ""}, 'investor', ${newReferralCode}, ${referrer?.id || null}, NOW(), NOW())
      RETURNING *
    `);

    if (referrer?.id) {
      await db.execute(sql`
        INSERT INTO referrals (referrer_id, referred_id, level, commission_rate)
        VALUES (${referrer.id}, ${userId}, 1, '0.10')
      `);
    }

    await ensureWallet(userId);

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Registration successful but login failed" });
      res.json({ user: publicUser(user) });
    });
  });

  app.post("/api/investor/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    const [user] = await query(sql`SELECT * FROM users WHERE lower(email) = lower(${email || ""}) LIMIT 1`);
    if (!user || !user.password) return res.status(401).json({ message: "Invalid investor login" });
    const valid = await bcrypt.compare(password || "", user.password);
    if (!valid) return res.status(401).json({ message: "Invalid investor login" });
    await ensureWallet(user.id);
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.json({ user: publicUser(user) });
    });
  });

  app.get("/api/investor/public", async (_req, res) => {
    const packages = await query(sql`SELECT * FROM investor_packages WHERE is_active = TRUE ORDER BY display_order, amount_usdt`);
    const projects = await query(sql`SELECT * FROM investor_projects WHERE is_active = TRUE ORDER BY display_order`);
    const [setting] = await query(sql`SELECT value FROM investor_settings WHERE key = 'bep20_admin_wallet'`);
    const pool = await getPoolStats();
    res.json({ packages, projects, adminWallet: setting?.value || { address: "" }, pool });
  });

  app.get("/api/investor/me", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    await ensureWallet(user.id);
    const [wallet] = await query(sql`SELECT * FROM investor_wallets WHERE user_id = ${user.id}`);
    const balances = await query(sql`SELECT * FROM investor_token_balances WHERE user_id = ${user.id} ORDER BY project_code`);
    const purchases = await query(sql`
      SELECT p.*, ip.name AS package_name
      FROM investor_purchases p
      LEFT JOIN investor_packages ip ON ip.id = p.package_id
      WHERE p.user_id = ${user.id}
      ORDER BY p.created_at DESC
    `);
    const allocations = await query(sql`
      SELECT a.*, pr.name AS project_name
      FROM investor_allocations a
      LEFT JOIN investor_projects pr ON pr.code = a.project_code
      WHERE a.user_id = ${user.id}
      ORDER BY a.created_at DESC
    `);
    const topups = await query(sql`SELECT * FROM investor_topups WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 20`);
    const withdrawals = await query(sql`SELECT * FROM investor_withdrawals WHERE user_id = ${user.id} ORDER BY requested_at DESC LIMIT 20`);
    const referralRewards = await query(sql`SELECT * FROM investor_referral_rewards WHERE beneficiary_user_id = ${user.id} ORDER BY created_at DESC LIMIT 50`);
    const qrPayments = await query(sql`SELECT * FROM investor_qr_payments WHERE investor_user_id = ${user.id} ORDER BY created_at DESC LIMIT 30`);
    const pool = await getPoolStats();
    const [daily] = await query(sql`SELECT * FROM investor_daily_token_claims WHERE user_id = ${user.id} AND claim_date = ${todayKey()} LIMIT 1`);
    res.json({
      user: publicUser(user),
      wallet,
      balances,
      purchases,
      allocations,
      topups,
      withdrawals,
      referralRewards,
      qrPayments,
      pool,
      dailyClaimed: Boolean(daily),
    });
  });

  app.post("/api/investor/wallet/connect", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const walletAddress = String(req.body?.walletAddress || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: "Valid BEP20 wallet address is required" });
    }
    await ensureWallet(user.id);
    await db.execute(sql`UPDATE investor_wallets SET connected_wallet = ${walletAddress}, updated_at = NOW() WHERE user_id = ${user.id}`);
    res.json({ message: "Wallet connected", walletAddress });
  });

  app.post("/api/investor/topups/confirm", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const txHash = String(req.body?.txHash || "").trim();
    const walletAddress = String(req.body?.walletAddress || "").trim();
    const amount = money(req.body?.amountUsdt);
    if (!txHash || amount <= 0) return res.status(400).json({ message: "Transaction hash and amount are required" });
    const existing = await query(sql`SELECT id FROM investor_topups WHERE tx_hash = ${txHash} LIMIT 1`);
    if (existing.length > 0) return res.status(409).json({ message: "Transaction already credited" });

    await ensureWallet(user.id);
    const [topup] = await query(sql`
      INSERT INTO investor_topups (user_id, wallet_address, tx_hash, amount_usdt, status, confirmed_at)
      VALUES (${user.id}, ${walletAddress || "connected-wallet"}, ${txHash}, ${rounded(amount)}, 'confirmed', NOW())
      RETURNING *
    `);
    await addWalletBalance(user.id, amount, 0);
    res.json({ message: "USDT top-up credited", topup });
  });

  app.post("/api/investor/purchases", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const packageId = Number(req.body?.packageId);
    const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
    const [pkg] = await query(sql`SELECT * FROM investor_packages WHERE id = ${packageId} AND is_active = TRUE LIMIT 1`);
    if (!pkg) return res.status(404).json({ message: "Active package not found" });

    const amount = money(pkg.amount_usdt);
    const units = Math.floor(amount / 500);
    const totalUnits = allocations.reduce((sum: number, item: any) => sum + Number(item.units || 0), 0);
    if (units <= 0 || totalUnits !== units) {
      return res.status(400).json({ message: `Allocate exactly ${units} unit(s)` });
    }

    const [wallet] = await query(sql`SELECT * FROM investor_wallets WHERE user_id = ${user.id} LIMIT 1`);
    if (!wallet || money(wallet.cash_balance) < amount) return res.status(400).json({ message: "Insufficient cash wallet balance" });

    for (const item of allocations) {
      const [project] = await query(sql`SELECT code FROM investor_projects WHERE code = ${item.projectCode} AND is_active = TRUE LIMIT 1`);
      if (!project || Number(item.units) <= 0) return res.status(400).json({ message: "Invalid project allocation" });
    }

    const [purchase] = await query(sql`
      INSERT INTO investor_purchases (user_id, package_id, amount_usdt, units, status)
      VALUES (${user.id}, ${packageId}, ${rounded(amount)}, ${units}, 'completed')
      RETURNING *
    `);
    await db.execute(sql`UPDATE investor_wallets SET cash_balance = cash_balance - ${rounded(amount)}, updated_at = NOW() WHERE user_id = ${user.id}`);

    for (const item of allocations) {
      await db.execute(sql`
        INSERT INTO investor_allocations (purchase_id, user_id, project_code, units)
        VALUES (${purchase.id}, ${user.id}, ${item.projectCode}, ${Number(item.units)})
      `);
    }

    const directReward = amount * 0.10;
    const level2Reward = amount * 0.05;
    const poolReward = amount * 0.05;
    let extraPool = 0;

    if (user.referred_by_id) {
      await addWalletBalance(user.referred_by_id, directReward / 2, directReward / 2);
      await db.execute(sql`
        INSERT INTO investor_referral_rewards (purchase_id, beneficiary_user_id, source_user_id, level, wallet_type, amount_usdt)
        VALUES
          (${purchase.id}, ${user.referred_by_id}, ${user.id}, 1, 'cash', ${rounded(directReward / 2)}),
          (${purchase.id}, ${user.referred_by_id}, ${user.id}, 1, 'spending', ${rounded(directReward / 2)})
      `);
      const [directUser] = await query(sql`SELECT referred_by_id FROM users WHERE id = ${user.referred_by_id} LIMIT 1`);
      if (directUser?.referred_by_id) {
        await addWalletBalance(directUser.referred_by_id, level2Reward / 2, level2Reward / 2);
        await db.execute(sql`
          INSERT INTO investor_referral_rewards (purchase_id, beneficiary_user_id, source_user_id, level, wallet_type, amount_usdt)
          VALUES
            (${purchase.id}, ${directUser.referred_by_id}, ${user.id}, 2, 'cash', ${rounded(level2Reward / 2)}),
            (${purchase.id}, ${directUser.referred_by_id}, ${user.id}, 2, 'spending', ${rounded(level2Reward / 2)})
        `);
      } else {
        extraPool = level2Reward;
      }
    } else {
      extraPool = directReward + level2Reward;
    }

    await db.execute(sql`
      INSERT INTO investor_pool_events (user_id, purchase_id, amount_usdt, type, description)
      VALUES (${user.id}, ${purchase.id}, ${rounded(poolReward + extraPool)}, 'package_pool', 'Package referral pool allocation')
    `);

    res.json({ message: "Package purchased", purchase });
  });

  app.post("/api/investor/tokens/claim-daily", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const date = todayKey();
    const existing = await query(sql`SELECT id FROM investor_daily_token_claims WHERE user_id = ${user.id} AND claim_date = ${date} LIMIT 1`);
    if (existing.length > 0) return res.status(400).json({ message: "Daily project tokens already claimed" });

    const projectUnits = await query(sql`
      SELECT project_code, COALESCE(SUM(units), 0)::int AS units
      FROM investor_allocations
      WHERE user_id = ${user.id}
      GROUP BY project_code
    `);
    let total = 0;
    for (const item of projectUnits) {
      const tokens = Number(item.units || 0);
      if (tokens <= 0) continue;
      total += tokens;
      await db.execute(sql`
        INSERT INTO investor_token_balances (user_id, project_code, active_tokens)
        VALUES (${user.id}, ${item.project_code}, ${tokens})
        ON CONFLICT (user_id, project_code)
        DO UPDATE SET active_tokens = investor_token_balances.active_tokens + ${tokens}, updated_at = NOW()
      `);
      await db.execute(sql`
        INSERT INTO investor_token_ledger (user_id, project_code, tokens, type, description)
        VALUES (${user.id}, ${item.project_code}, ${tokens}, 'daily_reward', 'Daily project token reward')
      `);
    }
    await db.execute(sql`
      INSERT INTO investor_daily_token_claims (user_id, claim_date, tokens_awarded)
      VALUES (${user.id}, ${date}, ${total})
    `);
    res.json({ message: "Daily tokens claimed", tokensAwarded: total, pool: await getPoolStats() });
  });

  app.post("/api/investor/tokens/sell", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const projectCode = String(req.body?.projectCode || "");
    const tokensToSell = money(req.body?.tokens);
    if (!projectCode || tokensToSell <= 0) return res.status(400).json({ message: "Project and token amount are required" });
    const [balance] = await query(sql`SELECT * FROM investor_token_balances WHERE user_id = ${user.id} AND project_code = ${projectCode} LIMIT 1`);
    if (!balance || money(balance.active_tokens) < tokensToSell) return res.status(400).json({ message: "Insufficient active tokens" });
    const pool = await getPoolStats();
    if (pool.tokenPrice <= 0) return res.status(400).json({ message: "Token pool has no available value yet" });
    const payout = Math.min(tokensToSell * pool.tokenPrice, pool.poolBalance);
    if (payout <= 0) return res.status(400).json({ message: "Pool cannot pay this sale" });

    await db.execute(sql`
      UPDATE investor_token_balances
      SET active_tokens = active_tokens - ${tokensToSell},
          sold_tokens = sold_tokens + ${tokensToSell},
          updated_at = NOW()
      WHERE id = ${balance.id}
    `);
    await db.execute(sql`
      INSERT INTO investor_token_ledger (user_id, project_code, tokens, type, description)
      VALUES (${user.id}, ${projectCode}, ${-tokensToSell}, 'sell', 'Investor sold tokens to cash wallet')
    `);
    await addWalletBalance(user.id, payout, 0);
    await db.execute(sql`
      INSERT INTO investor_pool_events (user_id, amount_usdt, type, description)
      VALUES (${user.id}, ${rounded(-payout)}, 'token_sale', 'Token sale payout to cash wallet')
    `);
    res.json({ message: "Tokens sold", payout: rounded(payout), pool: await getPoolStats() });
  });

  app.post("/api/investor/qr-payments", requireAuth, async (req, res) => {
    const merchant = await currentUser(req);
    if (!merchant) return res.status(401).json({ message: "Unauthorized" });
    const qrCode = String(req.body?.qrCode || "").trim();
    const amount = money(req.body?.amountUsdt);
    const description = String(req.body?.description || "Club spending wallet payment");
    if (!qrCode || amount <= 0) return res.status(400).json({ message: "QR code and amount are required" });
    const [wallet] = await query(sql`SELECT * FROM investor_wallets WHERE qr_code = ${qrCode} LIMIT 1`);
    if (!wallet) return res.status(404).json({ message: "Investor QR wallet not found" });
    if (money(wallet.spending_balance) < amount) return res.status(400).json({ message: "Insufficient spending wallet balance" });
    await db.execute(sql`UPDATE investor_wallets SET spending_balance = spending_balance - ${rounded(amount)}, updated_at = NOW() WHERE user_id = ${wallet.user_id}`);
    const [payment] = await query(sql`
      INSERT INTO investor_qr_payments (investor_user_id, merchant_user_id, amount_usdt, description, status)
      VALUES (${wallet.user_id}, ${merchant.id}, ${rounded(amount)}, ${description}, 'completed')
      RETURNING *
    `);
    res.json({ message: "Spending wallet payment completed", payment });
  });

  app.post("/api/investor/withdrawals", requireAuth, async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const amount = money(req.body?.amountUsdt);
    const walletAddress = String(req.body?.walletAddress || "").trim();
    if (amount <= 0 || !walletAddress) return res.status(400).json({ message: "Amount and payout wallet are required" });
    const [wallet] = await query(sql`SELECT * FROM investor_wallets WHERE user_id = ${user.id} LIMIT 1`);
    if (!wallet || money(wallet.cash_balance) < amount) return res.status(400).json({ message: "Insufficient cash wallet balance" });
    await db.execute(sql`UPDATE investor_wallets SET cash_balance = cash_balance - ${rounded(amount)}, updated_at = NOW() WHERE user_id = ${user.id}`);
    const [withdrawal] = await query(sql`
      INSERT INTO investor_withdrawals (user_id, amount_usdt, wallet_address, status)
      VALUES (${user.id}, ${rounded(amount)}, ${walletAddress}, 'pending')
      RETURNING *
    `);
    res.json({ message: "Withdrawal requested", withdrawal });
  });

  app.get("/api/investor/admin/overview", requireAuth, requireAdmin, async (_req, res) => {
    const packages = await query(sql`SELECT * FROM investor_packages ORDER BY display_order, amount_usdt`);
    const projects = await query(sql`SELECT * FROM investor_projects ORDER BY display_order`);
    const topups = await query(sql`SELECT * FROM investor_topups ORDER BY created_at DESC LIMIT 100`);
    const withdrawals = await query(sql`SELECT * FROM investor_withdrawals ORDER BY requested_at DESC LIMIT 100`);
    const qrPayments = await query(sql`SELECT * FROM investor_qr_payments ORDER BY created_at DESC LIMIT 100`);
    const poolEvents = await query(sql`SELECT * FROM investor_pool_events ORDER BY created_at DESC LIMIT 100`);
    const [setting] = await query(sql`SELECT value FROM investor_settings WHERE key = 'bep20_admin_wallet'`);
    res.json({ packages, projects, topups, withdrawals, qrPayments, poolEvents, pool: await getPoolStats(), adminWallet: setting?.value || { address: "" } });
  });

  app.post("/api/investor/admin/packages", requireAuth, requireAdmin, async (req, res) => {
    const { name, amountUsdt, description, isActive = true } = req.body || {};
    if (!name || money(amountUsdt) < 500) return res.status(400).json({ message: "Package name and amount >= 500 are required" });
    const [pkg] = await query(sql`
      INSERT INTO investor_packages (name, amount_usdt, description, is_active)
      VALUES (${name}, ${rounded(money(amountUsdt))}, ${description || ""}, ${Boolean(isActive)})
      RETURNING *
    `);
    res.json({ package: pkg });
  });

  app.patch("/api/investor/admin/packages/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { name, amountUsdt, description, isActive } = req.body || {};
    const [pkg] = await query(sql`
      UPDATE investor_packages
      SET name = COALESCE(${name || null}, name),
          amount_usdt = COALESCE(${amountUsdt ? rounded(money(amountUsdt)) : null}, amount_usdt),
          description = COALESCE(${description ?? null}, description),
          is_active = COALESCE(${typeof isActive === "boolean" ? isActive : null}, is_active),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    res.json({ package: pkg });
  });

  app.patch("/api/investor/admin/settings/wallet", requireAuth, requireAdmin, async (req, res) => {
    const address = String(req.body?.address || "").trim();
    await db.execute(sql`
      INSERT INTO investor_settings (key, value, updated_at)
      VALUES ('bep20_admin_wallet', ${JSON.stringify({ address })}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `);
    res.json({ address });
  });

  app.patch("/api/investor/admin/withdrawals/:id", requireAuth, requireAdmin, async (req, res) => {
    const admin = await currentUser(req);
    const status = String(req.body?.status || "");
    if (!["approved", "rejected", "paid"].includes(status)) return res.status(400).json({ message: "Invalid withdrawal status" });
    const [withdrawal] = await query(sql`SELECT * FROM investor_withdrawals WHERE id = ${Number(req.params.id)} LIMIT 1`);
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    if (status === "rejected" && withdrawal.status === "pending") {
      await addWalletBalance(withdrawal.user_id, money(withdrawal.amount_usdt), 0);
    }
    const [updated] = await query(sql`
      UPDATE investor_withdrawals
      SET status = ${status}, admin_notes = ${req.body?.adminNotes || null}, processed_at = NOW(), processed_by = ${admin?.id || null}
      WHERE id = ${withdrawal.id}
      RETURNING *
    `);
    res.json({ withdrawal: updated });
  });
}
