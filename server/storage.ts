import {
  users,
  appointments,
  transactions,
  toys,
  listings,
  messages,
  referrals,
  pointRedemptions,
  cashOutTransactions,
  pendingPurchases,
  creditHistory,
  pointsHistory,
  type User,
  type UpsertUser,
  type InsertAppointment,
  type InsertTransaction,
  type InsertToy,
  type InsertListing,
  type InsertMessage,
  type InsertCashOutTransaction,
  type InsertPendingPurchase,
  type InsertCreditHistory,
  type InsertPointsHistory,
  type Appointment,
  type Transaction,
  type Toy,
  type Listing,
  type Message,
  type Referral,
  type PointRedemption,
  type CashOutTransaction,
  type PendingPurchase,
  type CreditHistory,
  type PointsHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Referral operations
  createReferralCode(): Promise<string>;
  getReferralsByUserId(userId: string): Promise<Referral[]>;
  createReferralRelationship(referrerId: string, referredId: string): Promise<void>;
  calculateReferralEarnings(userId: string): Promise<number>;
  
  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByUserId(userId: string): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>;
  updateAppointmentStatus(id: number, status: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  
  // Toy operations
  createToy(toy: InsertToy): Promise<Toy>;
  getToysByOwnerId(ownerId: string): Promise<Toy[]>;
  getAllToys(): Promise<Toy[]>;
  getToyByQrCode(qrCode: string): Promise<Toy | undefined>;
  updateToyOwner(toyId: number, newOwnerId: string): Promise<void>;
  
  // Marketplace operations
  createListing(listing: InsertListing): Promise<Listing>;
  getAllListings(): Promise<Listing[]>;
  getListingsByUserId(userId: string): Promise<Listing[]>;
  updateListingStatus(id: number, status: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByListingId(listingId: number): Promise<Message[]>;
  
  // Credit operations
  updateUserCredits(userId: string, amount: string): Promise<void>;
  updateUserPoints(userId: string, points: number): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  
  // Cash-out operations
  createCashOutRequest(cashOut: InsertCashOutTransaction): Promise<CashOutTransaction>;
  getCashOutsByUserId(userId: string): Promise<CashOutTransaction[]>;
  getAllCashOuts(): Promise<CashOutTransaction[]>;
  updateCashOutStatus(id: number, status: string, adminNotes?: string): Promise<void>;
  updateUserBankDetails(userId: string, bankName: string, accountNumber: string, accountHolderName: string): Promise<void>;
  
  // Purchase confirmation operations
  createPendingPurchase(purchase: InsertPendingPurchase): Promise<PendingPurchase>;
  getPendingPurchasesByUserId(userId: string): Promise<PendingPurchase[]>;
  confirmPendingPurchase(purchaseId: number): Promise<void>;
  
  // Credit and points history operations
  createCreditHistory(credit: InsertCreditHistory): Promise<CreditHistory>;
  getCreditHistoryByUserId(userId: string): Promise<CreditHistory[]>;
  createPointsHistory(points: InsertPointsHistory): Promise<PointsHistory>;
  getPointsHistoryByUserId(userId: string): Promise<PointsHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate referral code if not exists
    const referralCode = userData.referralCode || await this.createReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        referralCode,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createReferralCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      code = `RWG-${nanoid(8)}`;
      attempts++;
      
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, code))
        .limit(1);
        
      if (existing.length === 0) {
        return code;
      }
    } while (attempts < maxAttempts);
    
    throw new Error("Failed to generate unique referral code");
  }

  async getReferralsByUserId(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async createReferralRelationship(referrerId: string, referredId: string): Promise<void> {
    // Create direct referral (level 1)
    await db.insert(referrals).values({
      referrerId,
      referredId,
      level: 1,
      commissionRate: "10.00",
    });

    // Find level 2 referrer
    const level1Referrer = await db
      .select()
      .from(users)
      .where(eq(users.id, referrerId))
      .limit(1);

    if (level1Referrer[0]?.referredById) {
      await db.insert(referrals).values({
        referrerId: level1Referrer[0].referredById,
        referredId,
        level: 2,
        commissionRate: "3.00",
      });

      // Find level 3 referrer
      const level2Referrer = await db
        .select()
        .from(users)
        .where(eq(users.id, level1Referrer[0].referredById))
        .limit(1);

      if (level2Referrer[0]?.referredById) {
        await db.insert(referrals).values({
          referrerId: level2Referrer[0].referredById,
          referredId,
          level: 3,
          commissionRate: "2.00",
        });
      }
    }
  }

  async calculateReferralEarnings(userId: string): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`sum(${referrals.totalEarnings})`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    return Number(result[0]?.total || 0);
  }

  // Appointment operations
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return created;
  }

  async getAppointmentsByUserId(userId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, userId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.appointmentDate));
  }

  async updateAppointmentStatus(id: number, status: string): Promise<void> {
    await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return created;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Toy operations
  async createToy(toy: InsertToy): Promise<Toy> {
    const [created] = await db
      .insert(toys)
      .values(toy)
      .returning();
    return created;
  }

  async getToysByOwnerId(ownerId: string): Promise<Toy[]> {
    return await db
      .select()
      .from(toys)
      .where(eq(toys.ownerId, ownerId))
      .orderBy(desc(toys.createdAt));
  }

  async getAllToys(): Promise<Toy[]> {
    return await db
      .select()
      .from(toys)
      .orderBy(desc(toys.createdAt));
  }

  async getToyByQrCode(qrCode: string): Promise<Toy | undefined> {
    const [toy] = await db
      .select()
      .from(toys)
      .where(eq(toys.qrCode, qrCode))
      .limit(1);
    return toy;
  }

  async updateToyOwner(toyId: number, newOwnerId: string): Promise<void> {
    await db
      .update(toys)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(toys.id, toyId));
  }

  // Marketplace operations
  async createListing(listing: InsertListing): Promise<Listing> {
    const [created] = await db
      .insert(listings)
      .values(listing)
      .returning();
    return created;
  }

  async getAllListings(): Promise<any[]> {
    return await db
      .select({
        id: listings.id,
        toyId: listings.toyId,
        sellerId: listings.sellerId,
        price: listings.price,
        description: listings.description,
        status: listings.status,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        toy: {
          id: toys.id,
          name: toys.name,
          series: toys.series,
          rarity: toys.rarity,
          imageUrl: toys.imageUrl,
        },
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(listings)
      .leftJoin(toys, eq(listings.toyId, toys.id))
      .leftJoin(users, eq(listings.sellerId, users.id))
      .where(eq(listings.status, "active"))
      .orderBy(desc(listings.createdAt));
  }

  async getListingsByUserId(userId: string): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .where(eq(listings.sellerId, userId))
      .orderBy(desc(listings.createdAt));
  }

  async updateListingStatus(id: number, status: string): Promise<void> {
    await db
      .update(listings)
      .set({ status, updatedAt: new Date() })
      .where(eq(listings.id, id));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db
      .insert(messages)
      .values(message)
      .returning();
    return created;
  }

  async getMessagesByListingId(listingId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.listingId, listingId))
      .orderBy(desc(messages.createdAt));
  }

  // Credit operations
  async updateUserCredits(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Cash-out operations
  async createCashOutRequest(cashOut: InsertCashOutTransaction): Promise<CashOutTransaction> {
    const [result] = await db
      .insert(cashOutTransactions)
      .values(cashOut)
      .returning();
    return result;
  }

  async getCashOutsByUserId(userId: string): Promise<CashOutTransaction[]> {
    return await db
      .select()
      .from(cashOutTransactions)
      .where(eq(cashOutTransactions.userId, userId))
      .orderBy(desc(cashOutTransactions.requestedAt));
  }

  async getAllCashOuts(): Promise<CashOutTransaction[]> {
    return await db
      .select()
      .from(cashOutTransactions)
      .orderBy(desc(cashOutTransactions.requestedAt));
  }

  async updateCashOutStatus(id: number, status: string, adminNotes?: string): Promise<void> {
    const updateData: any = { 
      status, 
      processedAt: new Date() 
    };
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }
    
    await db
      .update(cashOutTransactions)
      .set(updateData)
      .where(eq(cashOutTransactions.id, id));
  }

  async updateUserBankDetails(userId: string, bankName: string, accountNumber: string, accountHolderName: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        bankName, 
        bankAccountNumber: accountNumber, 
        accountHolderName,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Purchase confirmation operations
  async createPendingPurchase(purchaseData: InsertPendingPurchase): Promise<PendingPurchase> {
    // Calculate admin fee (10% of the total amount)
    const originalAmount = parseFloat(purchaseData.amount);
    const adminFee = originalAmount * 0.1;
    const sellerAmount = originalAmount - adminFee;
    
    const [purchase] = await db
      .insert(pendingPurchases)
      .values({
        ...purchaseData,
        adminFee: adminFee.toFixed(2),
        sellerAmount: sellerAmount.toFixed(2)
      })
      .returning();
    return purchase;
  }

  async getPendingPurchasesByUserId(userId: string): Promise<any[]> {
    console.log("*** STORAGE DEBUG: Getting purchases for userId:", userId);
    const result = await db
      .select({
        id: pendingPurchases.id,
        listingId: pendingPurchases.listingId,
        buyerId: pendingPurchases.buyerId,
        sellerId: pendingPurchases.sellerId,
        toyId: pendingPurchases.toyId,
        amount: pendingPurchases.amount,
        pointsEarned: pendingPurchases.pointsEarned,
        status: pendingPurchases.status,
        createdAt: pendingPurchases.createdAt,
        toy: {
          id: toys.id,
          name: toys.name,
          series: toys.series,
          rarity: toys.rarity,
          imageUrl: toys.imageUrl,
          qrCode: toys.qrCode,
        }
      })
      .from(pendingPurchases)
      .leftJoin(toys, eq(pendingPurchases.toyId, toys.id))
      .where(or(eq(pendingPurchases.sellerId, userId), eq(pendingPurchases.buyerId, userId)))
      .orderBy(pendingPurchases.createdAt);
    
    console.log("*** STORAGE DEBUG: Found results:", result.length, result);
    return result;
  }

  async confirmPendingPurchase(purchaseId: number): Promise<void> {
    // Get purchase details
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');

    // Transfer toy ownership
    await db
      .update(toys)
      .set({ ownerId: purchase.buyerId })
      .where(eq(toys.id, purchase.toyId));

    // Add credit to seller
    const [seller] = await db.select().from(users).where(eq(users.id, purchase.sellerId));
    const currentCredits = parseFloat(seller.credits || '0');
    const newCredits = currentCredits + parseFloat(purchase.amount);
    
    await db
      .update(users)
      .set({ credits: newCredits.toString() })
      .where(eq(users.id, purchase.sellerId));

    // Update listing status to sold
    await db
      .update(listings)
      .set({ status: 'sold' })
      .where(eq(listings.id, purchase.listingId));

    // Mark purchase as completed
    await db
      .update(pendingPurchases)
      .set({ 
        status: 'completed',
        confirmedAt: new Date()
      })
      .where(eq(pendingPurchases.id, purchaseId));

    // Add credit history for seller
    await db
      .insert(creditHistory)
      .values({
        userId: purchase.sellerId,
        amount: purchase.amount,
        type: 'sale',
        description: `Sale confirmed - Toy ID ${purchase.toyId}`,
        relatedId: purchase.listingId,
      });
  }

  // Credit and points history operations
  async createCreditHistory(creditData: InsertCreditHistory): Promise<CreditHistory> {
    const [credit] = await db
      .insert(creditHistory)
      .values(creditData)
      .returning();
    return credit;
  }

  async getCreditHistoryByUserId(userId: string): Promise<CreditHistory[]> {
    return await db
      .select()
      .from(creditHistory)
      .where(eq(creditHistory.userId, userId))
      .orderBy(desc(creditHistory.createdAt));
  }

  async createPointsHistory(pointsData: InsertPointsHistory): Promise<PointsHistory> {
    const [points] = await db
      .insert(pointsHistory)
      .values(pointsData)
      .returning();
    return points;
  }

  async getPointsHistoryByUserId(userId: string): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
      .where(eq(pointsHistory.userId, userId))
      .orderBy(desc(pointsHistory.createdAt));
  }
}

export const storage = new DatabaseStorage();
