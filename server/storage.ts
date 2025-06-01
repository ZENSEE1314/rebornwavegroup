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
  promotionBanners,
  appointmentEvents,
  rewardItems,
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
  type InsertPromotionBanner,
  type InsertAppointmentEvent,
  type InsertRewardItem,
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
  type PromotionBanner,
  type AppointmentEvent,
  type RewardItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profile: { firstName?: string; lastName?: string; phoneNumber?: string; gender?: string; dateOfBirth?: Date }): Promise<void>;
  
  // Referral operations
  createReferralCode(): Promise<string>;
  getReferralsByUserId(userId: string): Promise<Referral[]>;
  createReferralRelationship(referrerId: string, referredId: string): Promise<void>;
  calculateReferralEarnings(userId: string): Promise<number>;
  buildReferralGenealogyTree(userId: string): Promise<any>;
  
  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByUserId(userId: string): Promise<Appointment[]>;
  getAllAppointments(): Promise<Appointment[]>;
  updateAppointmentStatus(id: number, status: string): Promise<void>;
  updateAppointmentDate(id: number, appointmentDate: Date): Promise<Appointment>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  
  // Toy operations
  createToy(toy: InsertToy): Promise<Toy>;
  getToysByOwnerId(ownerId: string): Promise<Toy[]>;
  getAllToys(): Promise<Toy[]>;
  getToyByQrCode(qrCode: string): Promise<Toy | undefined>;
  updateToyOwner(toyId: number, newOwnerId: string | null): Promise<void>;
  activateToyByQrCode(qrCode: string, userId: string): Promise<Toy | null>;
  getAvailableToysForPurchase(): Promise<Toy[]>;
  purchaseToy(toyId: number, userId: string): Promise<void>;
  deleteToy(toyId: number): Promise<void>;
  
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
  getPendingPurchasesByListingId(listingId: number): Promise<PendingPurchase[]>;
  sellerConfirmPurchase(purchaseId: number): Promise<void>;
  buyerConfirmPurchase(purchaseId: number): Promise<void>;
  
  // Credit and points history operations
  createCreditHistory(credit: InsertCreditHistory): Promise<CreditHistory>;
  getCreditHistoryByUserId(userId: string): Promise<CreditHistory[]>;
  createPointsHistory(points: InsertPointsHistory): Promise<PointsHistory>;
  getPointsHistoryByUserId(userId: string): Promise<PointsHistory[]>;
  
  // Admin-specific operations
  getAllTransactions(): Promise<Transaction[]>;
  getAllToysWithOwners(): Promise<any[]>;
  
  // Promotion banner operations
  getAllPromotionBanners(): Promise<PromotionBanner[]>;
  createPromotionBanner(banner: InsertPromotionBanner): Promise<PromotionBanner>;
  updatePromotionBanner(id: number, banner: Partial<InsertPromotionBanner>): Promise<void>;
  deletePromotionBanner(id: number): Promise<void>;
  
  // Appointment event operations
  getAllAppointmentEvents(): Promise<AppointmentEvent[]>;
  getAppointmentEventsByCategory(category: string): Promise<AppointmentEvent[]>;
  createAppointmentEvent(event: InsertAppointmentEvent): Promise<AppointmentEvent>;
  updateAppointmentEvent(id: number, event: Partial<InsertAppointmentEvent>): Promise<void>;
  deleteAppointmentEvent(id: number): Promise<void>;
  
  // Reward item operations
  getAllRewardItems(): Promise<RewardItem[]>;
  getActiveRewardItems(): Promise<RewardItem[]>;
  getRewardItemById(id: number): Promise<RewardItem | undefined>;
  createRewardItem(item: InsertRewardItem): Promise<RewardItem>;
  updateRewardItem(id: number, item: Partial<InsertRewardItem>): Promise<void>;
  deleteRewardItem(id: number): Promise<void>;
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

  async updateUserProfile(id: string, profile: { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; role?: string; gender?: string; dateOfBirth?: Date }): Promise<void> {
    await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
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

  // Generate secure random QR code for toys
  private generateSecureQRCode(): string {
    return `QR-${nanoid(12)}-${nanoid(8)}-${nanoid(6)}`;
  }

  // Update all toys with secure random QR codes
  async updateAllToysWithSecureQRCodes(): Promise<void> {
    const allToys = await db.select().from(toys);
    
    for (const toy of allToys) {
      const newQRCode = this.generateSecureQRCode();
      await db
        .update(toys)
        .set({ qrCode: newQRCode })
        .where(eq(toys.id, toy.id));
    }
  }

  async getReferralsByUserId(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async buildReferralGenealogyTree(userId: string): Promise<any> {
    // Get all direct referrals (level 1) for this user
    const level1Referrals = await db
      .select({
        id: referrals.id,
        referredId: referrals.referredId,
        totalEarnings: referrals.totalEarnings,
        createdAt: referrals.createdAt,
        referredUser: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredId, users.id))
      .where(and(eq(referrals.referrerId, userId), eq(referrals.level, 1)))
      .orderBy(referrals.createdAt);

    const genealogyTree = {
      totalDirectReferrals: level1Referrals.length,
      totalLevel2Referrals: 0,
      totalLevel3Referrals: 0,
      totalEarnings: 0,
      levels: []
    };

    // Build tree for each level 1 referral
    for (const level1 of level1Referrals) {
      const level1Data = {
        id: level1.id,
        userId: level1.referredId,
        name: level1.referredUser?.firstName ? 
          `${level1.referredUser.firstName} ${level1.referredUser.lastName || ''}`.trim() : 
          level1.referredUser?.email?.split('@')[0] || 'User',
        email: level1.referredUser?.email,
        level: 1,
        earnings: parseFloat(level1.totalEarnings || '0'),
        joinDate: level1.createdAt,
        children: []
      };

      genealogyTree.totalEarnings += level1Data.earnings;

      // Get level 2 referrals (people referred by this level 1 user)
      const level2Referrals = await db
        .select({
          id: referrals.id,
          referredId: referrals.referredId,
          totalEarnings: referrals.totalEarnings,
          createdAt: referrals.createdAt,
          referredUser: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.referredId, users.id))
        .where(and(eq(referrals.referrerId, level1.referredId), eq(referrals.level, 1)));

      genealogyTree.totalLevel2Referrals += level2Referrals.length;

      for (const level2 of level2Referrals) {
        const level2Data = {
          id: level2.id,
          userId: level2.referredId,
          name: level2.referredUser?.firstName ? 
            `${level2.referredUser.firstName} ${level2.referredUser.lastName || ''}`.trim() : 
            level2.referredUser?.email?.split('@')[0] || 'User',
          email: level2.referredUser?.email,
          level: 2,
          earnings: parseFloat(level2.totalEarnings || '0'),
          joinDate: level2.createdAt,
          children: []
        };

        genealogyTree.totalEarnings += level2Data.earnings;

        // Get level 3 referrals (people referred by this level 2 user)
        const level3Referrals = await db
          .select({
            id: referrals.id,
            referredId: referrals.referredId,
            totalEarnings: referrals.totalEarnings,
            createdAt: referrals.createdAt,
            referredUser: {
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email
            }
          })
          .from(referrals)
          .leftJoin(users, eq(referrals.referredId, users.id))
          .where(and(eq(referrals.referrerId, level2.referredId), eq(referrals.level, 1)));

        genealogyTree.totalLevel3Referrals += level3Referrals.length;

        for (const level3 of level3Referrals) {
          const level3Data = {
            id: level3.id,
            userId: level3.referredId,
            name: level3.referredUser?.firstName ? 
              `${level3.referredUser.firstName} ${level3.referredUser.lastName || ''}`.trim() : 
              level3.referredUser?.email?.split('@')[0] || 'User',
            email: level3.referredUser?.email,
            level: 3,
            earnings: parseFloat(level3.totalEarnings || '0'),
            joinDate: level3.createdAt
          };

          genealogyTree.totalEarnings += level3Data.earnings;
          level2Data.children.push(level3Data);
        }

        level1Data.children.push(level2Data);
      }

      genealogyTree.levels.push(level1Data);
    }

    return genealogyTree;
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
        total: sql<string>`COALESCE(SUM(CAST(${referrals.totalEarnings} AS DECIMAL)), 0)`,
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

  async getAllAppointments(): Promise<any[]> {
    const appointmentsList = await db
      .select({
        id: appointments.id,
        userId: appointments.userId,
        title: appointments.title,
        description: appointments.description,
        appointmentDate: appointments.appointmentDate,
        duration: appointments.duration,
        cost: appointments.cost,
        status: appointments.status,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt
      })
      .from(appointments)
      .orderBy(desc(appointments.appointmentDate));

    const appointmentsWithUsers = [];
    for (const appointment of appointmentsList) {
      const user = await this.getUser(appointment.userId);
      appointmentsWithUsers.push({
        ...appointment,
        service: appointment.title, // Use title as service for now
        notes: appointment.description, // Use description as notes
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        } : null
      });
    }
    
    return appointmentsWithUsers;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<void> {
    await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  async updateAppointmentDate(id: number, appointmentDate: Date): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({ appointmentDate, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
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

  async updateToyOwner(toyId: number, newOwnerId: string | null): Promise<void> {
    await db
      .update(toys)
      .set({ ownerId: newOwnerId, updatedAt: new Date() })
      .where(eq(toys.id, toyId));
  }

  async activateToyByQrCode(qrCode: string, userId: string): Promise<Toy | null> {
    const [toy] = await db
      .select()
      .from(toys)
      .where(eq(toys.qrCode, qrCode));

    if (!toy) {
      throw new Error("Invalid QR code");
    }

    if (toy.isActivated) {
      throw new Error("This toy has already been activated");
    }

    if (!toy.purchasedBy) {
      throw new Error("This toy has not been purchased yet");
    }

    if (toy.purchasedBy !== userId) {
      throw new Error("You can only activate toys you have purchased");
    }

    const [updatedToy] = await db
      .update(toys)
      .set({ 
        isActivated: true, 
        ownerId: userId,
        updatedAt: new Date() 
      })
      .where(eq(toys.qrCode, qrCode))
      .returning();

    return updatedToy;
  }

  async getAvailableToysForPurchase(): Promise<Toy[]> {
    return await db
      .select()
      .from(toys)
      .where(and(
        sql`${toys.purchasedBy} IS NULL`,
        eq(toys.isActivated, false)
      ));
  }

  async purchaseToy(toyId: number, userId: string): Promise<void> {
    await db
      .update(toys)
      .set({ 
        purchasedBy: userId,
        updatedAt: new Date() 
      })
      .where(eq(toys.id, toyId));
  }

  async deleteToy(toyId: number): Promise<void> {
    await db
      .delete(toys)
      .where(eq(toys.id, toyId));
  }

  // Marketplace operations
  async createListing(listing: InsertListing): Promise<Listing> {
    // Check if this toy is already listed and active, or has pending transactions
    const existingListing = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.toyId, listing.toyId),
          or(
            eq(listings.status, 'active'),
            eq(listings.status, 'pending')
          )
        )
      );

    if (existingListing.length > 0) {
      throw new Error('This toy is already listed for sale or in a pending transaction');
    }

    // Also check if there are any pending purchases for this toy
    const existingPendingPurchases = await db
      .select()
      .from(pendingPurchases)
      .where(
        and(
          eq(pendingPurchases.toyId, listing.toyId),
          or(
            eq(pendingPurchases.status, 'pending_seller_confirmation'),
            eq(pendingPurchases.status, 'pending_buyer_confirmation')
          )
        )
      );

    if (existingPendingPurchases.length > 0) {
      throw new Error('This toy has pending transactions and cannot be listed again');
    }

    // Verify the user owns this toy
    const [toy] = await db
      .select()
      .from(toys)
      .where(eq(toys.id, listing.toyId));

    if (!toy || toy.ownerId !== listing.sellerId) {
      throw new Error('You do not own this toy');
    }

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
        credits: amount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    // Only update lifetime points when earning points (positive values)
    if (points > 0) {
      await db
        .update(users)
        .set({ 
          loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`,
          lifetimePoints: sql`${users.lifetimePoints} + ${points}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // When spending points, only decrease available points, not lifetime points
      await db
        .update(users)
        .set({ 
          loyaltyPoints: sql`${users.loyaltyPoints} + ${points}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
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

  // Seller confirms the purchase (step 1)
  async sellerConfirmPurchase(purchaseId: number): Promise<void> {
    // Get purchase details
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status !== 'pending_seller_confirmation') {
      throw new Error('Purchase is not pending seller confirmation');
    }

    // Update purchase status to pending buyer confirmation
    // DON'T transfer toy ownership yet - wait for buyer confirmation
    await db
      .update(pendingPurchases)
      .set({ 
        status: 'pending_buyer_confirmation',
        sellerConfirmedAt: new Date()
      })
      .where(eq(pendingPurchases.id, purchaseId));

    // Update listing status to sold (remove from marketplace)
    await db
      .update(listings)
      .set({ status: 'sold' })
      .where(eq(listings.id, purchase.listingId));
  }

  // Buyer confirms receipt (step 2 - completes the deal)
  async buyerConfirmPurchase(purchaseId: number): Promise<void> {
    // Get purchase details
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status !== 'pending_buyer_confirmation') {
      throw new Error('Purchase is not pending buyer confirmation');
    }

    // Calculate seller amount (90% after 10% admin fee)
    const totalAmount = parseFloat(purchase.amount);
    const adminFee = totalAmount * 0.1;
    const sellerAmount = totalAmount - adminFee;

    // Transfer toy ownership to buyer (this is when the buyer actually receives the toy)
    await db
      .update(toys)
      .set({ ownerId: purchase.buyerId })
      .where(eq(toys.id, purchase.toyId));

    // Add credit to seller (90% after admin fee)
    const [seller] = await db.select().from(users).where(eq(users.id, purchase.sellerId));
    const currentCredits = parseFloat(seller.credits || '0');
    const newCredits = currentCredits + sellerAmount;
    
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
        amount: sellerAmount.toFixed(2),
        type: 'sale',
        description: `Sale completed - Admin fee: RP ${adminFee.toFixed(2)}`,
        relatedId: purchase.listingId,
      });

    // Add points to buyer's account
    if (purchase.pointsEarned && purchase.pointsEarned > 0) {
      const [buyer] = await db.select().from(users).where(eq(users.id, purchase.buyerId));
      const currentPoints = parseInt(buyer.loyaltyPoints || '0');
      const currentLifetimePoints = parseInt(buyer.lifetimePoints || '0');
      
      const newPoints = currentPoints + purchase.pointsEarned;
      const newLifetimePoints = currentLifetimePoints + purchase.pointsEarned;
      
      await db
        .update(users)
        .set({ 
          loyaltyPoints: newPoints,
          lifetimePoints: newLifetimePoints
        })
        .where(eq(users.id, purchase.buyerId));

      // Add points history for buyer
      await db
        .insert(pointsHistory)
        .values({
          userId: purchase.buyerId,
          points: purchase.pointsEarned,
          type: 'earned',
          description: `Purchase completed - Earned ${purchase.pointsEarned} points`,
          relatedId: purchase.listingId,
        });
    }
  }

  // Credit and points history operations
  async createCreditHistory(creditData: InsertCreditHistory): Promise<CreditHistory> {
    const [credit] = await db
      .insert(creditHistory)
      .values(creditData)
      .returning();
    return credit;
  }

  async getPendingPurchasesByListingId(listingId: number): Promise<any[]> {
    return await db
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
      .where(eq(pendingPurchases.listingId, listingId))
      .orderBy(desc(pendingPurchases.createdAt));
  }

  async cancelPendingPurchase(purchaseId: number): Promise<void> {
    // Get purchase details
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');

    // Refund credits to buyer
    const [buyer] = await db.select().from(users).where(eq(users.id, purchase.buyerId));
    const currentCredits = parseFloat(buyer.credits || '0');
    const refundCredits = currentCredits + parseFloat(purchase.amount);
    
    await db
      .update(users)
      .set({ credits: refundCredits.toString() })
      .where(eq(users.id, purchase.buyerId));

    // Return toy ownership back to seller
    await db
      .update(toys)
      .set({ ownerId: purchase.sellerId })
      .where(eq(toys.id, purchase.toyId));

    // Update listing back to active
    await db
      .update(listings)
      .set({ status: 'active' })
      .where(eq(listings.id, purchase.listingId));

    // Mark purchase as cancelled
    await db
      .update(pendingPurchases)
      .set({ 
        status: 'cancelled',
        confirmedAt: new Date()
      })
      .where(eq(pendingPurchases.id, purchaseId));

    // Add credit history for buyer refund
    await db
      .insert(creditHistory)
      .values({
        userId: purchase.buyerId,
        amount: purchase.amount,
        type: 'refund',
        description: `Sale cancelled - Refund for purchase ID ${purchaseId}`,
        relatedId: purchase.listingId,
      });
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

  // Admin-specific operations
  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      status: transactions.status,
      createdAt: transactions.createdAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(transactions)
    .leftJoin(users, eq(transactions.userId, users.id))
    .orderBy(desc(transactions.createdAt));
  }

  async getAllToysWithOwners(): Promise<any[]> {
    return await db.select({
      id: toys.id,
      name: toys.name,
      series: toys.series,
      rarity: toys.rarity,
      imageUrl: toys.imageUrl,
      qrCode: toys.qrCode,
      ownerId: toys.ownerId,
      createdAt: toys.createdAt,
      owner: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(toys)
    .leftJoin(users, eq(toys.ownerId, users.id))
    .orderBy(desc(toys.createdAt));
  }

  // Promotion banner operations
  async getAllPromotionBanners(): Promise<PromotionBanner[]> {
    return await db.select().from(promotionBanners).orderBy(promotionBanners.displayOrder);
  }

  async createPromotionBanner(bannerData: InsertPromotionBanner): Promise<PromotionBanner> {
    const [banner] = await db.insert(promotionBanners).values(bannerData).returning();
    return banner;
  }

  async updatePromotionBanner(id: number, bannerData: Partial<InsertPromotionBanner>): Promise<void> {
    await db.update(promotionBanners).set({
      ...bannerData,
      updatedAt: new Date(),
    }).where(eq(promotionBanners.id, id));
  }

  async deletePromotionBanner(id: number): Promise<void> {
    await db.delete(promotionBanners).where(eq(promotionBanners.id, id));
  }

  // Appointment event operations
  async getAllAppointmentEvents(): Promise<AppointmentEvent[]> {
    return await db.select().from(appointmentEvents).orderBy(appointmentEvents.category, appointmentEvents.title);
  }

  async getAppointmentEventsByCategory(category: string): Promise<AppointmentEvent[]> {
    return await db.select().from(appointmentEvents)
      .where(eq(appointmentEvents.category, category))
      .orderBy(appointmentEvents.title);
  }

  async createAppointmentEvent(eventData: InsertAppointmentEvent): Promise<AppointmentEvent> {
    const [event] = await db.insert(appointmentEvents).values(eventData).returning();
    return event;
  }

  async updateAppointmentEvent(id: number, eventData: Partial<InsertAppointmentEvent>): Promise<void> {
    await db.update(appointmentEvents).set({
      ...eventData,
      updatedAt: new Date(),
    }).where(eq(appointmentEvents.id, id));
  }

  async deleteAppointmentEvent(id: number): Promise<void> {
    await db.delete(appointmentEvents).where(eq(appointmentEvents.id, id));
  }

  // Reward item operations
  async getAllRewardItems(): Promise<RewardItem[]> {
    return await db.select().from(rewardItems).orderBy(rewardItems.pointsCost);
  }

  async getActiveRewardItems(): Promise<RewardItem[]> {
    return await db.select().from(rewardItems)
      .where(eq(rewardItems.isActive, true))
      .orderBy(rewardItems.pointsCost);
  }

  async createRewardItem(itemData: InsertRewardItem): Promise<RewardItem> {
    const [item] = await db.insert(rewardItems).values(itemData).returning();
    return item;
  }

  async updateRewardItem(id: number, itemData: Partial<InsertRewardItem>): Promise<void> {
    await db.update(rewardItems).set({
      ...itemData,
      updatedAt: new Date(),
    }).where(eq(rewardItems.id, id));
  }

  async deleteRewardItem(id: number): Promise<void> {
    await db.delete(rewardItems).where(eq(rewardItems.id, id));
  }
}

export const storage = new DatabaseStorage();
