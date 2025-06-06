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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
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
  bankAccountNumber: varchar("bank_account_number"),
  bankName: varchar("bank_name"),
  accountHolderName: varchar("account_holder_name"),
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

// Soft toys table
export const toys = pgTable("toys", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  series: varchar("series").notNull(),
  rarity: varchar("rarity").notNull(), // 'common' | 'rare' | 'ultra_rare' | 'secret'
  color: varchar("color"), // 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink'
  qrCode: varchar("qr_code").unique().notNull(),
  imageUrl: varchar("image_url"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  ownerId: varchar("owner_id"),
  isActivated: boolean("is_activated").default(false),
  purchasedBy: varchar("purchased_by"),
  isForSale: boolean("is_for_sale").default(false),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  type: varchar("type").notNull(), // 'purchase' | 'sale' | 'refund' | 'topup' | 'cashout'
  description: text("description").notNull(),
  relatedId: integer("related_id"), // Reference to purchase, listing, etc.
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
  birthDate: timestamp("birth_date").defaultNow(),
  currentAge: integer("current_age").default(0), // days since birth
  growthStage: varchar("growth_stage").default("baby"), // baby, child, teen, adult, elder
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

export const toysRelations = relations(toys, ({ one, many }) => ({
  owner: one(users, {
    fields: [toys.ownerId],
    references: [users.id],
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertToy = z.infer<typeof insertToySchema>;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertPointRedemption = z.infer<typeof insertPointRedemptionSchema>;

// Cash-out transaction schemas
export const insertCashOutTransactionSchema = createInsertSchema(cashOutTransactions).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
});

export type InsertCashOutTransaction = z.infer<typeof insertCashOutTransactionSchema>;

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

export type InsertPendingPurchase = z.infer<typeof insertPendingPurchaseSchema>;
export type InsertCreditHistory = z.infer<typeof insertCreditHistorySchema>;
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;

export type Appointment = typeof appointments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Toy = typeof toys.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type PointRedemption = typeof pointRedemptions.$inferSelect;
export type CashOutTransaction = typeof cashOutTransactions.$inferSelect;
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
