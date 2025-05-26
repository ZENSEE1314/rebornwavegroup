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
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // 'user' | 'admin'
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0.00").notNull(),
  loyaltyPoints: integer("loyalty_points").default(0).notNull(),
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
  description: text("description"),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(60).notNull(), // minutes
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("scheduled").notNull(), // 'scheduled' | 'completed' | 'cancelled'
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
  rarity: varchar("rarity").notNull(), // 'common' | 'rare' | 'ultra_rare'
  qrCode: varchar("qr_code").unique().notNull(),
  imageUrl: varchar("image_url"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  ownerId: varchar("owner_id"),
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

export type Appointment = typeof appointments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Toy = typeof toys.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type PointRedemption = typeof pointRedemptions.$inferSelect;
