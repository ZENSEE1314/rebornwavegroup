import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (supports both Replit Auth and email/password)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  username: varchar("username").unique(), // Username for display in KOS system
  password: varchar("password"), // For email/password authentication
  authProvider: varchar("auth_provider").default("replit").notNull(), // 'replit' | 'email' | 'google' | 'apple'
  googleId: varchar("google_id").unique(),
  appleId: varchar("apple_id").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phoneNumber: varchar("phone_number"),
  profileImageUrl: varchar("profile_image_url"),
  gender: varchar("gender"),
  dateOfBirth: timestamp("date_of_birth"),
  role: varchar("role").default("user").notNull(), // 'user' | 'admin'
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0.00").notNull(),
  loyaltyPoints: integer("loyalty_points").default(0).notNull(),
  lifetimePoints: integer("lifetime_points").default(0).notNull(),
  tokens: integer("tokens").default(0).notNull(), // Physical tokens that can be claimed
  level: integer("level").default(1).notNull(),
  referralCode: varchar("referral_code").unique().notNull(),
  referredById: varchar("referred_by_id"),
  introducerId: varchar("introducer_id"), // User who introduced this person
  referralEarnings: decimal("referral_earnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  bankAccountNumber: varchar("bank_account_number"),
  bankName: varchar("bank_name"),
  accountHolderName: varchar("account_holder_name"),
  membershipCardNumber: varchar("membership_card_number"),
  mpoint: integer("mpoint").default(0).notNull(),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Referrals tracking table
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull(),
  referredId: varchar("referred_id").notNull(),
  level: integer("level").notNull(), // 1, 2, or 3
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  service: varchar("service").notNull(),
  description: text("description"),
  notes: text("notes"),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(60).notNull(), // minutes
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // 'credit_purchase' | 'appointment_payment' | 'referral_bonus' | 'toy_sale' | 'toy_purchase' | 'cashout'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // appointment_id, toy_id, etc.
  pointsEarned: integer("points_earned").default(0),
  status: varchar("status").default("completed").notNull(), // 'completed' | 'pending' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Seasonal collections table
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'Spring', 'Summer', 'Autumn', 'Winter', 'Holiday', 'Limited Edition'
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  backgroundColor: varchar("background_color").default("#3B82F6"), // Hex color for season theme
  price: decimal("price", { precision: 10, scale: 2 }).default("1000000.00"), // Price in IDR for random toy from season
  showInMarketplace: boolean("show_in_marketplace").default(true), // Toggle to show/hide season in marketplace
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collection series for organizing toys within seasons
export const collectionSeries = pgTable("collection_series", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull(),
  name: varchar("name").notNull(), // 'Rare Finds', 'Daily Discoveries', 'Event Exclusives'
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  iconSymbol: varchar("icon_symbol"), // Emoji or symbol
  backgroundColor: varchar("background_color").default("#F3F4F6"),
  unlockCondition: varchar("unlock_condition"), // 'level_5', 'toys_10', 'points_500'
  isUnlocked: boolean("is_unlocked").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Toy templates table - design blueprints for creating actual toys
export const toyTemplates = pgTable("toy_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  seasonId: integer("season_id"), // Link to seasonal collection
  rarity: varchar("rarity").notNull(), // 'common' | 'rare' | 'epic' | 'legendary' | 'secret'
  color: varchar("color"), // Design color
  gender: varchar("gender").default("male").notNull(), // 'male' | 'female'
  imageUrl: varchar("image_url"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).default("0.00"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actual toys table - collectible items created from templates
export const toys = pgTable("toys", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  series: varchar("series"), // Made nullable since series functionality was removed
  seasonId: integer("season_id"), // Link to seasonal collection
  seriesId: integer("series_id"), // Link to collection series - kept for backward compatibility
  rarity: varchar("rarity").notNull(), // 'common' | 'rare' | 'ultra_rare' | 'secret'
  color: varchar("color"), // 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink'
  gender: varchar("gender").default("male").notNull(), // 'male' | 'female'
  qrCode: varchar("qr_code").unique().notNull(),
  imageUrl: varchar("image_url"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  ownerId: varchar("owner_id"), // null = available for discovery, set = owned by user
  isActivated: boolean("is_activated").default(false),
  purchasedBy: varchar("purchased_by"),
  isForSale: boolean("is_for_sale").default(false),
  templateId: integer("template_id"), // References the template this toy was created from
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  collectionProgress: integer("collection_progress").default(0), // Progress towards collection completion
  isSeasonalExclusive: boolean("is_seasonal_exclusive").default(false),
  releaseDate: timestamp("release_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User collection progress tracking
export const userCollectionProgress = pgTable("user_collection_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  seasonId: integer("season_id").notNull(),
  sectorId: integer("sector_id"),
  totalItems: integer("total_items").default(0), // Total items in this collection
  collectedItems: integer("collected_items").default(0), // Items user has collected
  completionPercentage: integer("completion_percentage").default(0), // 0-100
  lastUpdated: timestamp("last_updated").defaultNow(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_user_season_progress").on(table.userId, table.seasonId)
]);

// Marketplace listings table
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  toyId: integer("toy_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status").default("active").notNull(), // 'active' | 'sold' | 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages for marketplace chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point redemptions table
export const pointRedemptions = pgTable("point_redemptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  pointsUsed: integer("points_used").notNull(),
  rewardType: varchar("reward_type").notNull(), // 'discount' | 'product' | 'service'
  rewardDescription: text("reward_description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cash-out transactions table
export const cashOutTransactions = pgTable("cash_out_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  bankName: varchar("bank_name").notNull(),
  accountNumber: varchar("account_number").notNull(),
  accountHolderName: varchar("account_holder_name").notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  transactionId: varchar("transaction_id"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Marketplace earnings tracking table - for admin revenue insights
export const marketplaceEarnings = pgTable("marketplace_earnings", {
  id: serial("id").primaryKey(),
  transactionType: varchar("transaction_type").notNull(), // 'sale_commission' | 'listing_fee' | 'premium_feature'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  relatedListingId: integer("related_listing_id"),
  relatedToyId: integer("related_toy_id"),
  relatedUserId: varchar("related_user_id"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"), // Default 10% commission
  status: varchar("status").default("confirmed").notNull(), // 'pending' | 'confirmed' | 'refunded'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pending purchases table - for purchase confirmation flow
export const pendingPurchases = pgTable("pending_purchases", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  toyId: integer("toy_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  adminFee: decimal("admin_fee", { precision: 10, scale: 2 }).default("0.00"),
  sellerAmount: decimal("seller_amount", { precision: 10, scale: 2 }).notNull(),
  pointsEarned: integer("points_earned").default(0),
  status: varchar("status").default("pending_seller_confirmation").notNull(), // 'pending_seller_confirmation' | 'pending_buyer_confirmation' | 'completed' | 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  sellerConfirmedAt: timestamp("seller_confirmed_at"),
  confirmedAt: timestamp("confirmed_at"),
});

// Credit history table - track all credit transactions
export const creditHistory = pgTable("credit_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type").notNull(), // 'purchase' | 'sale' | 'refund' | 'topup' | 'cashout' | 'referral_commission'
  description: text("description").notNull(),
  status: varchar("status").default("completed"), // 'pending' | 'completed' | 'failed'
  referenceId: varchar("reference_id"), // Reference to verification, purchase, etc.
  relatedId: integer("related_id"), // Reference to purchase, listing, etc.
  pointsEarned: integer("points_earned"), // Points earned from this transaction
  createdAt: timestamp("created_at").defaultNow(),
});

// Points history table - track all points transactions
export const pointsHistory = pgTable("points_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  points: integer("points").notNull(),
  type: varchar("type").notNull(), // 'earned' | 'redeemed'
  description: text("description").notNull(),
  relatedId: integer("related_id"), // Reference to purchase, redemption, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Token transactions table - separate from RP transactions
export const tokenTransactions = pgTable("token_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tokens: integer("tokens").notNull(), // positive for earning, negative for spending
  type: varchar("type").notNull(), // 'earned' | 'spent' | 'refund' | 'daily_reward'
  description: text("description").notNull(),
  relatedId: integer("related_id"), // Reference to pet, purchase, etc.
  status: varchar("status").default("completed"), // 'pending' | 'completed' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily token rewards table - track 24-hour token distribution
export const dailyTokenRewards = pgTable("daily_token_rewards", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  rewardDate: varchar("reward_date").notNull(), // YYYY-MM-DD format
  tokensAwarded: integer("tokens_awarded").default(1),
  allPetsHealthy: boolean("all_pets_healthy").default(true), // All pets have stats > 0%
  petCount: integer("pet_count").default(0), // Number of pets checked
  createdAt: timestamp("created_at").defaultNow(),
});

// Promotion banners table
export const promotionBanners = pgTable("promotion_banners", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  imageUrl: varchar("image_url"),
  ctaText: varchar("cta_text"),
  ctaUrl: varchar("cta_url"),
  type: varchar("type").notNull().default("banner"), // hero, promotion, announcement, banner
  backgroundColor: varchar("background_color").default("blue"), // blue, green, orange, purple, red, gray
  iconSymbol: varchar("icon_symbol"), // emoji or symbol for the banner
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment events table
export const appointmentEvents = pgTable("appointment_events", {
  id: serial("id").primaryKey(),
  category: varchar("category").notNull(), // 'beauty', 'entertainment', 'restaurant'
  title: varchar("title").notNull(),
  description: text("description"),
  baseCost: varchar("base_cost").notNull(),
  duration: integer("duration").default(60), // in minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment verification table
export const paymentVerifications = pgTable("payment_verifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  paymentMethod: varchar("payment_method").default("cash").notNull(), // 'cash' | 'credit'
  receiptImageUrl: varchar("receipt_image_url"), // Optional for credit payments
  status: varchar("status").default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  adminId: varchar("admin_id"), // ID of admin who processed the verification
  adminNotes: text("admin_notes"), // Admin comments on approval/rejection
  pointsAwarded: integer("points_awarded"), // Points given for verified purchase
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Commission history table - dedicated tracking for referral commissions
export const commissionHistory = pgTable("commission_history", {
  id: serial("id").primaryKey(),
  introducerId: varchar("introducer_id").notNull(), // User who receives the commission
  referredUserId: varchar("referred_user_id").notNull(), // User who made the purchase
  transactionAmount: decimal("transaction_amount", { precision: 10, scale: 2 }).notNull(), // Original purchase amount
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(), // 10% commission in RP
  commissionRate: decimal("commission_rate", { precision: 3, scale: 2 }).default("0.10"), // 10% = 0.10
  description: text("description").notNull(),
  relatedId: integer("related_id"), // Reference to payment verification ID
  relatedType: varchar("related_type").default("payment_verification"), // 'payment_verification' | 'purchase' | 'transaction'
  status: varchar("status").default("completed").notNull(), // 'pending' | 'completed' | 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Reward items table
export const rewardItems = pgTable("reward_items", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  type: varchar("type"), // 'item', 'service', 'discount', 'voucher', 'credit'
  creditAmount: varchar("credit_amount"), // Amount in RP for credit rewards
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  stockQuantity: integer("stock_quantity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pet care system tables
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  toyId: integer("toy_id").notNull(),
  name: varchar("name").notNull(),
  species: varchar("species").default("Doluruu"),
  type: varchar("type").notNull(), // 'virtual' | 'dragon'
  gender: varchar("gender").default("male").notNull(), // 'male' | 'female'
  birthDate: timestamp("birth_date").defaultNow(),
  currentAge: integer("current_age").default(0), // days since birth
  growthStage: varchar("growth_stage").default("baby"), // baby, child, teen, adult, elder
  evolutionPoints: integer("evolution_points").default(0), // Points needed for evolution
  happiness: integer("happiness").default(50), // 0-100
  hunger: integer("hunger").default(50), // 0-100 (100 = full)
  cleanliness: integer("cleanliness").default(50), // 0-100
  energy: integer("energy").default(50), // 0-100
  isActive: boolean("is_active").default(true),
  lastCareDate: timestamp("last_care_date"),
  lastFedAt: timestamp("last_fed_at"),
  isSleeping: boolean("issleeping").default(false),
  sleepStartTime: timestamp("sleepstarttime"),
  sleepDuration: integer("sleepduration").default(360), // 6 hours in minutes
  totalTokensEarned: integer("total_tokens_earned").default(0),
  dailyTokensAvailable: integer("daily_tokens_available").default(1),
  lastTokenAwardTime: timestamp("last_token_award_time"),
  lastTokenClaim: timestamp("last_token_claim"),
  lastDecayTime: timestamp("last_decay_time"),
  lastEnergyUpdate: timestamp("last_energy_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates for admin-created campaigns
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // Template name for admin reference
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  templateType: varchar("template_type").notNull().default("custom"), // 'welcome', 'newsletter', 'custom'
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(), // Admin user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evolution images for different pet stages
export const petEvolutionImages = pgTable("pet_evolution_images", {
  id: serial("id").primaryKey(),
  species: varchar("species").notNull(), // "Doluruu", "Dragon", etc.
  growthStage: varchar("growth_stage").notNull(), // baby, child, teen, adult, elder
  imageUrl: varchar("image_url").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const petCareActivities = pgTable("pet_care_activities", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  userId: varchar("user_id").notNull(),
  activityType: varchar("activity_type").notNull(), // 'feed', 'bathe', 'sleep', 'clean'
  completedAt: timestamp("completed_at").defaultNow(),
  pointsEarned: integer("points_earned").default(0),
});

export const dailyCareStatus = pgTable("daily_care_status", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  userId: varchar("user_id").notNull(),
  careDate: varchar("care_date").notNull(), // YYYY-MM-DD format
  fed: boolean("fed").default(false),
  bathed: boolean("bathed").default(false),
  slept: boolean("slept").default(false),
  cleaned: boolean("cleaned").default(false),
  allCareCompleted: boolean("all_care_completed").default(false),
  tokenEarned: boolean("token_earned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pet_care_date").on(table.petId, table.careDate)
]);

// Admin action logs table
export const adminActionLogs = pgTable("admin_action_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").notNull(),
  targetUserId: varchar("target_user_id"),
  action: varchar("action").notNull(), // 'edit_membership_card', 'edit_mpoint', etc.
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  field: varchar("field"), // 'membershipCardNumber', 'mpoint', etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  referrals: many(referrals, { relationName: "referrer" }),
  referredUsers: many(referrals, { relationName: "referred" }),
  referredBy: one(users, {
    fields: [users.referredById],
    references: [users.id],
  }),
  appointments: many(appointments),
  transactions: many(transactions),
  toys: many(toys),
  listings: many(listings),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  pointRedemptions: many(pointRedemptions),
  cashOutTransactions: many(cashOutTransactions),
  pets: many(pets),
  petCareActivities: many(petCareActivities),
  dailyCareStatus: many(dailyCareStatus),
  collectionProgress: many(userCollectionProgress),
  adminActions: many(adminActionLogs, { relationName: "admin" }),
  targetOfAdminActions: many(adminActionLogs, { relationName: "target" }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referred: one(users, {
    fields: [referrals.referredId],
    references: [users.id],
    relationName: "referred",
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// Seasonal collections relations
export const seasonsRelations = relations(seasons, ({ many }) => ({
  series: many(collectionSeries),
  toys: many(toys),
  userProgress: many(userCollectionProgress),
}));

export const collectionSeriesRelations = relations(collectionSeries, ({ one, many }) => ({
  season: one(seasons, {
    fields: [collectionSeries.seasonId],
    references: [seasons.id],
  }),
  toys: many(toys),
  userProgress: many(userCollectionProgress),
}));

export const userCollectionProgressRelations = relations(userCollectionProgress, ({ one }) => ({
  user: one(users, {
    fields: [userCollectionProgress.userId],
    references: [users.id],
  }),
  season: one(seasons, {
    fields: [userCollectionProgress.seasonId],
    references: [seasons.id],
  }),
  series: one(collectionSeries, {
    fields: [userCollectionProgress.sectorId],
    references: [collectionSeries.id],
  }),
}));

export const toysRelations = relations(toys, ({ one, many }) => ({
  owner: one(users, {
    fields: [toys.ownerId],
    references: [users.id],
  }),
  season: one(seasons, {
    fields: [toys.seasonId],
    references: [seasons.id],
  }),
  series: one(collectionSeries, {
    fields: [toys.seriesId],
    references: [collectionSeries.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  toy: one(toys, {
    fields: [listings.toyId],
    references: [toys.id],
  }),
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  listing: one(listings, {
    fields: [messages.listingId],
    references: [listings.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const pointRedemptionsRelations = relations(pointRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [pointRedemptions.userId],
    references: [users.id],
  }),
}));

export const cashOutTransactionsRelations = relations(cashOutTransactions, ({ one }) => ({
  user: one(users, {
    fields: [cashOutTransactions.userId],
    references: [users.id],
  }),
}));

export const pendingPurchasesRelations = relations(pendingPurchases, ({ one }) => ({
  buyer: one(users, {
    fields: [pendingPurchases.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [pendingPurchases.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  listing: one(listings, {
    fields: [pendingPurchases.listingId],
    references: [listings.id],
  }),
  toy: one(toys, {
    fields: [pendingPurchases.toyId],
    references: [toys.id],
  }),
}));

export const creditHistoryRelations = relations(creditHistory, ({ one }) => ({
  user: one(users, {
    fields: [creditHistory.userId],
    references: [users.id],
  }),
}));

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  user: one(users, {
    fields: [pointsHistory.userId],
    references: [users.id],
  }),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
  user: one(users, {
    fields: [pets.userId],
    references: [users.id],
  }),
  toy: one(toys, {
    fields: [pets.toyId],
    references: [toys.id],
  }),
  careActivities: many(petCareActivities),
  dailyCareStatus: many(dailyCareStatus),
}));

export const petCareActivitiesRelations = relations(petCareActivities, ({ one }) => ({
  pet: one(pets, {
    fields: [petCareActivities.petId],
    references: [pets.id],
  }),
  user: one(users, {
    fields: [petCareActivities.userId],
    references: [users.id],
  }),
}));

export const dailyCareStatusRelations = relations(dailyCareStatus, ({ one }) => ({
  pet: one(pets, {
    fields: [dailyCareStatus.petId],
    references: [pets.id],
  }),
  user: one(users, {
    fields: [dailyCareStatus.userId],
    references: [users.id],
  }),
}));

export const dailyTokenRewardsRelations = relations(dailyTokenRewards, ({ one }) => ({
  user: one(users, {
    fields: [dailyTokenRewards.userId],
    references: [users.id],
  }),
}));

export const tokenTransactionsRelations = relations(tokenTransactions, ({ one }) => ({
  user: one(users, {
    fields: [tokenTransactions.userId],
    references: [users.id],
  }),
}));

export const adminActionLogsRelations = relations(adminActionLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminActionLogs.adminId],
    references: [users.id],
    relationName: "admin",
  }),
  targetUser: one(users, {
    fields: [adminActionLogs.targetUserId],
    references: [users.id],
    relationName: "target",
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  appointmentDate: z.string().transform((str) => new Date(str)),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertToySchema = createInsertSchema(toys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPointRedemptionSchema = createInsertSchema(pointRedemptions).omit({
  id: true,
  createdAt: true,
});

export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertDailyTokenRewardSchema = createInsertSchema(dailyTokenRewards).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
  userId: true,
  status: true,
  adminId: true,
  adminNotes: true,
  pointsAwarded: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertToy = z.infer<typeof insertToySchema>;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPointRedemption = z.infer<typeof insertPointRedemptionSchema>;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type InsertDailyTokenReward = z.infer<typeof insertDailyTokenRewardSchema>;
export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type DailyTokenReward = typeof dailyTokenRewards.$inferSelect;
export type PaymentVerification = typeof paymentVerifications.$inferSelect;

// Cash-out transaction schemas
export const insertCashOutTransactionSchema = createInsertSchema(cashOutTransactions).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
});

export type InsertCashOutTransaction = z.infer<typeof insertCashOutTransactionSchema>;

// Seasonal collection schemas
export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollectionSeriesSchema = createInsertSchema(collectionSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserCollectionProgressSchema = createInsertSchema(userCollectionProgress).omit({
  id: true,
  lastUpdated: true,
  completedAt: true,
});

export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type InsertCollectionSeries = z.infer<typeof insertCollectionSeriesSchema>;
export type InsertUserCollectionProgress = z.infer<typeof insertUserCollectionProgressSchema>;
export type Season = typeof seasons.$inferSelect;
export type CollectionSeries = typeof collectionSeries.$inferSelect;
export type UserCollectionProgress = typeof userCollectionProgress.$inferSelect;

// New table insert schemas
export const insertPendingPurchaseSchema = createInsertSchema(pendingPurchases).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export const insertCreditHistorySchema = createInsertSchema(creditHistory).omit({
  id: true,
  createdAt: true,
});

export const insertPointsHistorySchema = createInsertSchema(pointsHistory).omit({
  id: true,
  createdAt: true,
});

export const insertMarketplaceEarningSchema = createInsertSchema(marketplaceEarnings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPendingPurchase = z.infer<typeof insertPendingPurchaseSchema>;
export type InsertCreditHistory = z.infer<typeof insertCreditHistorySchema>;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type InsertMarketplaceEarning = z.infer<typeof insertMarketplaceEarningSchema>;

// Email template schemas
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export type Appointment = typeof appointments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Toy = typeof toys.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type PointRedemption = typeof pointRedemptions.$inferSelect;
export type CashOutTransaction = typeof cashOutTransactions.$inferSelect;
export type MarketplaceEarning = typeof marketplaceEarnings.$inferSelect;
export type PendingPurchase = typeof pendingPurchases.$inferSelect;
export type CreditHistory = typeof creditHistory.$inferSelect;
export type PointsHistory = typeof pointsHistory.$inferSelect;

// New table types
export type PromotionBanner = typeof promotionBanners.$inferSelect;
export type AppointmentEvent = typeof appointmentEvents.$inferSelect;
export type RewardItem = typeof rewardItems.$inferSelect;

// New table insert schemas
export const insertPromotionBannerSchema = createInsertSchema(promotionBanners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentEventSchema = createInsertSchema(appointmentEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRewardItemSchema = createInsertSchema(rewardItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPromotionBanner = z.infer<typeof insertPromotionBannerSchema>;
export type InsertAppointmentEvent = z.infer<typeof insertAppointmentEventSchema>;
export type InsertRewardItem = z.infer<typeof insertRewardItemSchema>;

// Pet care table types
export type Pet = typeof pets.$inferSelect;
export type PetCareActivity = typeof petCareActivities.$inferSelect;
export type DailyCareStatus = typeof dailyCareStatus.$inferSelect;

// Pet care insert schemas
export const insertPetSchema = createInsertSchema(pets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPetCareActivitySchema = createInsertSchema(petCareActivities).omit({
  id: true,
});

export const insertDailyCareStatusSchema = createInsertSchema(dailyCareStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPet = z.infer<typeof insertPetSchema>;
export type InsertPetCareActivity = z.infer<typeof insertPetCareActivitySchema>;
export type InsertDailyCareStatus = z.infer<typeof insertDailyCareStatusSchema>;

// Admin logs table for tracking all administrative actions
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").references(() => users.id), // User affected by the action
  targetType: varchar("target_type").notNull(), // 'user', 'pet', 'toy', 'season', 'banner', 'reward', etc.
  targetId: varchar("target_id"), // ID of the affected entity
  action: varchar("action").notNull(), // 'create', 'update', 'delete', 'approve', 'reject'
  entityType: varchar("entity_type").notNull(), // 'credits', 'loyalty_points', 'tokens', 'profile', 'payment_verification', etc.
  oldValues: jsonb("old_values"), // Previous values before change
  newValues: jsonb("new_values"), // New values after change
  description: text("description").notNull(), // Human-readable description
  ipAddress: varchar("ip_address"), // Admin's IP address
  userAgent: text("user_agent"), // Admin's browser/client info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin logs relations
export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminLogs.adminUserId],
    references: [users.id],
    relationName: "adminLogsAdmin",
  }),
  targetUser: one(users, {
    fields: [adminLogs.targetUserId],
    references: [users.id],
    relationName: "adminLogsTargetUser",
  }),
}));

// Admin logs insert schema
export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

// Game scores table
export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  petId: integer("pet_id").references(() => pets.id),
  score: integer("score").notNull(),
  tokensEarned: integer("tokens_earned").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GameScore = typeof gameScores.$inferSelect;
export const insertGameScoreSchema = createInsertSchema(gameScores).omit({
  id: true,
  createdAt: true,
});
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;

// Token claims table for physical token redemptions
export const tokenClaims = pgTable("token_claims", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tokensRequested: integer("tokens_requested").notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending', 'approved', 'rejected', 'shipped'
  adminNotes: text("admin_notes"),
  shippingAddress: text("shipping_address"),
  trackingNumber: varchar("tracking_number"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by"), // Admin user ID
});

export type TokenClaim = typeof tokenClaims.$inferSelect;
export const insertTokenClaimSchema = createInsertSchema(tokenClaims).omit({
  id: true,
  requestedAt: true,
});
export type InsertTokenClaim = z.infer<typeof insertTokenClaimSchema>;

// Payment methods and top-up tables
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'bank_transfer', 'cash_deposit', 'paypal', 'stripe'
  details: jsonb("details").notNull(), // Store bank details, paypal email, etc.
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const topUpRequests = pgTable("topup_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method").notNull(), // 'bank_transfer', 'cash_deposit', 'paypal'
  paymentProof: text("payment_proof"), // File path or URL to payment proof
  bankTransferDetails: jsonb("bank_transfer_details"), // Bank name, account number, reference number
  status: varchar("status").default("pending").notNull(), // pending, approved, rejected
  adminId: varchar("admin_id").references(() => users.id),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD").notNull(),
  paymentMethod: varchar("payment_method").notNull(), // 'paypal', 'stripe', 'bank_transfer', 'cash'
  transactionId: varchar("transaction_id"), // PayPal/Stripe transaction ID
  status: varchar("status").default("pending").notNull(), // pending, completed, failed, cancelled
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional payment details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type TopUpRequest = typeof topUpRequests.$inferSelect;
export const insertTopUpRequestSchema = createInsertSchema(topUpRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTopUpRequest = z.infer<typeof insertTopUpRequestSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

// Token history table - track all token transactions
export const tokenHistory = pgTable("token_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  tokens: integer("tokens").notNull(),
  type: varchar("type").notNull(), // 'earned' | 'spent'
  description: text("description").notNull(),
  relatedId: integer("related_id"), // Reference to pet, purchase, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export type TokenHistory = typeof tokenHistory.$inferSelect;
export const insertTokenHistorySchema = createInsertSchema(tokenHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertTokenHistory = z.infer<typeof insertTokenHistorySchema>;

// Pet evolution image types (merged with existing pet types above)
export type PetEvolutionImage = typeof petEvolutionImages.$inferSelect;
export const insertPetEvolutionImageSchema = createInsertSchema(petEvolutionImages).omit({
  id: true,
  createdAt: true,
});
export type InsertPetEvolutionImage = z.infer<typeof insertPetEvolutionImageSchema>;

// Toy template types and schemas
export type ToyTemplate = typeof toyTemplates.$inferSelect;
export const insertToyTemplateSchema = createInsertSchema(toyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertToyTemplate = z.infer<typeof insertToyTemplateSchema>;

// KOS (Kings Of Singers) Star System Tables

// User stars balance table - tracks total stars owned by each user
export const userStars = pgTable("user_stars", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalStars: integer("total_stars").default(0).notNull(),
  tournamentStars: integer("tournament_stars").default(0).notNull(), // Stars earned in tournaments (pending)
  individualStars: integer("individual_stars").default(0).notNull(), // Stars earned in individual mode (claimable)
  totalIndividualStarsReceived: integer("total_individual_stars_received").default(0).notNull(), // Cumulative individual stars received (for ranking)
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00").notNull(), // Total RP earned from stars
  influencerRank: varchar("influencer_rank").default("Newbie Spark").notNull(),
  influencerTier: integer("influencer_tier").default(1).notNull(),
  influencerPoints: integer("influencer_points").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Star purchases table - tracks when users buy stars
export const starPurchases = pgTable("star_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  starsAmount: integer("stars_amount").notNull(),
  rpCost: decimal("rp_cost", { precision: 10, scale: 2 }).notNull(), // 1000 RP per star
  paymentMethod: varchar("payment_method").notNull(), // 'rp_balance'
  status: varchar("status").default("completed").notNull(),
  transactionId: varchar("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Star transactions table - tracks all star movements (send/receive)
export const starTransactions = pgTable("star_transactions", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  starsAmount: integer("stars_amount").notNull(),
  type: varchar("type").notNull(), // 'tournament_vote' | 'individual_vote'
  tournamentId: integer("tournament_id"), // Reference to active tournament
  adminFee: decimal("admin_fee", { precision: 10, scale: 2 }).default("0.00").notNull(), // 30% platform fee
  userEarning: decimal("user_earning", { precision: 10, scale: 2 }).default("0.00").notNull(), // 70% to user
  status: varchar("status").default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournaments table - manages weekly tournaments
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").default("weekly").notNull(), // 'weekly' | 'monthly' | 'special'
  status: varchar("status").default("active").notNull(), // 'active' | 'ended' | 'distributing'
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date").notNull(),
  totalStarPool: integer("total_star_pool").default(0).notNull(),
  isDistributed: boolean("is_distributed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tournament participants table - tracks user rankings in tournaments
export const tournamentParticipants = pgTable("tournament_participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  starsReceived: integer("stars_received").default(0).notNull(),
  rank: integer("rank").default(0).notNull(),
  rewardPercentage: decimal("reward_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  rewardAmount: integer("reward_amount").default(0).notNull(),
  isRewarded: boolean("is_rewarded").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User likes table - tracks free likes between users
export const userLikes = pgTable("user_likes", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  isLiked: boolean("is_liked").default(true).notNull(), // true = liked, false = unliked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Star contributors table - tracks top contributors to each user
export const starContributors = pgTable("star_contributors", {
  id: serial("id").primaryKey(),
  recipientUserId: varchar("recipient_user_id").notNull().references(() => users.id),
  contributorUserId: varchar("contributor_user_id").notNull().references(() => users.id),
  individualStarsGiven: integer("individual_stars_given").default(0).notNull(),
  tournamentStarsGiven: integer("tournament_stars_given").default(0).notNull(),
  totalStarsGiven: integer("total_stars_given").default(0).notNull(), // Keep for backward compatibility
  lastContributionDate: timestamp("last_contribution_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Influencer ranks configuration table
export const influencerRanks = pgTable("influencer_ranks", {
  id: serial("id").primaryKey(),
  rankName: varchar("rank_name").notNull(),
  tier: integer("tier").notNull(),
  minPoints: integer("min_points").notNull(),
  maxPoints: integer("max_points").notNull(),
  minEarnings: decimal("min_earnings", { precision: 12, scale: 2 }).notNull(),
  maxEarnings: decimal("max_earnings", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// KOS Relations
export const userStarsRelations = relations(userStars, ({ one }) => ({
  user: one(users, {
    fields: [userStars.userId],
    references: [users.id],
  }),
}));

export const starPurchasesRelations = relations(starPurchases, ({ one }) => ({
  user: one(users, {
    fields: [starPurchases.userId],
    references: [users.id],
  }),
}));

export const starTransactionsRelations = relations(starTransactions, ({ one }) => ({
  fromUser: one(users, {
    fields: [starTransactions.fromUserId],
    references: [users.id],
    relationName: "starTransactionsFromUser",
  }),
  toUser: one(users, {
    fields: [starTransactions.toUserId],
    references: [users.id],
    relationName: "starTransactionsToUser",
  }),
  tournament: one(tournaments, {
    fields: [starTransactions.tournamentId],
    references: [tournaments.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  participants: many(tournamentParticipants),
  starTransactions: many(starTransactions),
}));

export const tournamentParticipantsRelations = relations(tournamentParticipants, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentParticipants.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentParticipants.userId],
    references: [users.id],
  }),
}));

export const userLikesRelations = relations(userLikes, ({ one }) => ({
  fromUser: one(users, {
    fields: [userLikes.fromUserId],
    references: [users.id],
    relationName: "userLikesFromUser",
  }),
  toUser: one(users, {
    fields: [userLikes.toUserId],
    references: [users.id],
    relationName: "userLikesToUser",
  }),
}));

export const starContributorsRelations = relations(starContributors, ({ one }) => ({
  recipient: one(users, {
    fields: [starContributors.recipientUserId],
    references: [users.id],
    relationName: "starContributorsRecipient",
  }),
  contributor: one(users, {
    fields: [starContributors.contributorUserId],
    references: [users.id],
    relationName: "starContributorsContributor",
  }),
}));

// KOS Types and Schemas
export type UserStars = typeof userStars.$inferSelect;
export type StarPurchase = typeof starPurchases.$inferSelect;
export type StarTransaction = typeof starTransactions.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type UserLike = typeof userLikes.$inferSelect;
export type StarContributor = typeof starContributors.$inferSelect;
export type InfluencerRank = typeof influencerRanks.$inferSelect;

export const insertUserStarsSchema = createInsertSchema(userStars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStarPurchaseSchema = createInsertSchema(starPurchases).omit({
  id: true,
  createdAt: true,
});

export const insertStarTransactionSchema = createInsertSchema(starTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLikeSchema = createInsertSchema(userLikes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStarContributorSchema = createInsertSchema(starContributors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInfluencerRankSchema = createInsertSchema(influencerRanks).omit({
  id: true,
  createdAt: true,
});

export type InsertUserStars = z.infer<typeof insertUserStarsSchema>;
export type InsertStarPurchase = z.infer<typeof insertStarPurchaseSchema>;
export type InsertStarTransaction = z.infer<typeof insertStarTransactionSchema>;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type InsertUserLike = z.infer<typeof insertUserLikeSchema>;
export type InsertStarContributor = z.infer<typeof insertStarContributorSchema>;
export type InsertInfluencerRank = z.infer<typeof insertInfluencerRankSchema>;

// ── SEO Pages ──────────────────────────────────────────────
export const seoPages = pgTable("seo_pages", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 255 }).notNull().unique(), // e.g. "/" or "/marketplace"
  title: text("title").notNull(),
  description: text("description").notNull(),
  keywords: text("keywords"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 100 }), // "telegram-bot" or admin email
});

export const insertSeoPageSchema = createInsertSchema(seoPages).omit({ id: true, updatedAt: true });
export type SeoPage = typeof seoPages.$inferSelect;
export type InsertSeoPage = z.infer<typeof insertSeoPageSchema>;

// ── POS System ────────────────────────────────────────────
export const posOrders = pgTable("pos_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number").notNull().unique(), // e.g. RWG-20260001
  staffId: varchar("staff_id").notNull(), // Staff who created the order
  customerId: varchar("customer_id"), // Optional: linked RWG member
  customerName: varchar("customer_name"), // Walk-in name if no account
  serviceType: varchar("service_type").notNull(), // 'restaurant' | 'ktv' | 'dj' | 'beauty' | 'gamehouse'
  tableOrRoom: varchar("table_or_room"), // Table number / room name
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method"), // 'rwg_credits' | 'cash' | 'card' | 'qr_pending'
  paymentStatus: varchar("payment_status").default("pending").notNull(), // 'pending' | 'paid' | 'cancelled'
  status: varchar("status").default("open").notNull(), // 'open' | 'completed' | 'cancelled'
  pointsAwarded: integer("points_awarded").default(0),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posOrderItems = pgTable("pos_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  itemName: varchar("item_name").notNull(),
  itemCategory: varchar("item_category").notNull(), // 'food' | 'drink' | 'service' | 'room' | 'package'
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPosOrderSchema = createInsertSchema(posOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPosOrderItemSchema = createInsertSchema(posOrderItems).omit({ id: true, createdAt: true });
export type PosOrder = typeof posOrders.$inferSelect;
export type PosOrderItem = typeof posOrderItems.$inferSelect;
export type InsertPosOrder = z.infer<typeof insertPosOrderSchema>;
export type InsertPosOrderItem = z.infer<typeof insertPosOrderItemSchema>;

// ── Friends & Chat ────────────────────────────────────────
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull(),
  addresseeId: varchar("addressee_id").notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending' | 'accepted' | 'blocked'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type Friendship = typeof friendships.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// ── CS Support ────────────────────────────────────────────
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  subject: varchar("subject").notNull(),
  category: varchar("category").notNull(), // 'general' | 'payment' | 'membership' | 'booking' | 'toy' | 'technical'
  status: varchar("status").default("open").notNull(), // 'open' | 'ai_replied' | 'escalated' | 'resolved' | 'closed'
  priority: varchar("priority").default("normal").notNull(), // 'low' | 'normal' | 'high' | 'urgent'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderType: varchar("sender_type").notNull(), // 'user' | 'ai' | 'staff'
  senderId: varchar("sender_id"), // null for AI
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ id: true, createdAt: true });
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
