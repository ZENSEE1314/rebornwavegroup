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

// Pet care system tables - Digimon inspired
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  toyId: integer("toy_id").notNull(),
  name: varchar("name").notNull(),
  species: varchar("species").default("Doluruu"),
  birthDate: timestamp("birth_date").defaultNow(),
  currentAge: integer("current_age").default(0), // days since birth
  growthStage: varchar("growth_stage").default("baby"), // baby, child, teen, adult, elder
  
  // Core stats
  weight: integer("weight").default(20), // in Gigabytes (G)
  hunger: integer("hunger").default(4), // 0-4 hearts
  health: integer("health").default(100), // 0-100 overall health
  strength: integer("strength").default(0), // 0-999
  effort: integer("effort").default(0), // 0-999
  dpEnergy: integer("dp_energy").default(50), // 0-100 energy for battles
  
  // Battle system
  totalBattles: integer("total_battles").default(0),
  battlesWon: integer("battles_won").default(0),
  winRatio: decimal("win_ratio", { precision: 5, scale: 2 }).default("0.00"), // percentage
  
  // Care system
  careMistakes: integer("care_mistakes").default(0),
  injuries: integer("injuries").default(0),
  dailyInjuries: integer("daily_injuries").default(0), // resets daily
  lastInjuryDate: varchar("last_injury_date"), // YYYY-MM-DD
  
  // Status tracking
  happiness: integer("happiness").default(50), // 0-100
  cleanliness: integer("cleanliness").default(50), // 0-100
  isActive: boolean("is_active").default(true),
  isDead: boolean("is_dead").default(false),
  isUpset: boolean("is_upset").default(false),
  needsAttention: boolean("needs_attention").default(false),
  attentionType: varchar("attention_type"), // 'hungry', 'sleep', 'strength', 'sick'
  lastAttentionCall: timestamp("last_attention_call"),
  
  // Care timing
  lastCareDate: timestamp("last_care_date"),
  lastFedAt: timestamp("last_fed_at"),
  lastTrainedAt: timestamp("last_trained_at"),
  lastBattleAt: timestamp("last_battle_at"),
  
  // Lifecycle system  
  maxLifespanDays: integer("max_lifespan_days").default(100),
  lastTokenClaimDate: timestamp("last_token_claim_date"),
  lastEvolutionCheck: timestamp("last_evolution_check"),
  nextEvolutionAge: integer("next_evolution_age").default(20), // days
  
  // Token system
  totalTokensEarned: integer("total_tokens_earned").default(0),
  dailyTokensAvailable: integer("daily_tokens_available").default(1),
  canEarnTokens: boolean("can_earn_tokens").default(true), // false when dead or health = 0
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced pet care activities for Digimon system
export const petCareActivities = pgTable("pet_care_activities", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  userId: varchar("user_id").notNull(),
  activityType: varchar("activity_type").notNull(), // 'feed', 'protein', 'train', 'battle', 'sleep', 'clean'
  foodType: varchar("food_type"), // 'meat', 'fish', 'protein' for feeding
  weightChange: integer("weight_change").default(0), // +1 for food, +2 for protein, -2 for training, -4 for battles
  statsChanged: text("stats_changed"), // JSON of stat changes
  battleResult: varchar("battle_result"), // 'won', 'lost', 'fled' for battles
  injuryOccurred: boolean("injury_occurred").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
  pointsEarned: integer("points_earned").default(0),
  tokensEarned: integer("tokens_earned").default(0),
});

// Battle system table
export const petBattles = pgTable("pet_battles", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  userId: varchar("user_id").notNull(),
  opponentType: varchar("opponent_type").default("wild"), // 'wild', 'boss', 'tournament'
  opponentName: varchar("opponent_name"),
  opponentStrength: integer("opponent_strength"),
  result: varchar("result").notNull(), // 'won', 'lost', 'fled'
  damageDealt: integer("damage_dealt").default(0),
  damageTaken: integer("damage_taken").default(0),
  dpUsed: integer("dp_used").default(0),
  strengthGained: integer("strength_gained").default(0),
  effortGained: integer("effort_gained").default(0),
  injuryOccurred: boolean("injury_occurred").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Care mistake tracking
export const careMistakes = pgTable("care_mistakes", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  userId: varchar("user_id").notNull(),
  mistakeType: varchar("mistake_type").notNull(), // 'ignored_hunger', 'ignored_sleep', 'ignored_strength', 'ignored_sick'
  callTime: timestamp("call_time").notNull(),
  responseTime: timestamp("response_time"),
  responseDelayMinutes: integer("response_delay_minutes"),
  consequenceSeverity: varchar("consequence_severity").default("minor"), // 'minor', 'major', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
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

// Enhanced pet care system types
export type PetBattle = typeof petBattles.$inferSelect;
export type InsertPetBattle = typeof petBattles.$inferInsert;
export type CareMistake = typeof careMistakes.$inferSelect;
export type InsertCareMistake = typeof careMistakes.$inferInsert;

export const insertPetBattleSchema = createInsertSchema(petBattles).omit({
  id: true,
  completedAt: true,
});

export const insertCareMistakeSchema = createInsertSchema(careMistakes).omit({
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

// Remove duplicated pet care types - they're already defined above

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
