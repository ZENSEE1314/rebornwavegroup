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
  pets,
  petCareActivities,
  dailyCareStatus,
  petEvolutionImages,
  gameScores,
  tokenClaims,
  paymentMethods,
  topUpRequests,
  paymentTransactions,
  tokenHistory,
  tokenTransactions,
  dailyTokenRewards,
  seasons,
  collectionSeries,
  marketplaceEarnings,
  adminLogs,
  emailTemplates,
  // KOS tables
  userStars,
  starPurchases,
  starTransactions,
  tournaments,
  tournamentParticipants,
  userLikes,
  starContributors,
  influencerRanks,
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
  type InsertPet,
  type InsertPetCareActivity,
  type InsertDailyCareStatus,
  type GameScore,
  type InsertGameScore,
  type TokenClaim,
  type InsertTokenClaim,
  type PaymentMethod,
  type InsertPaymentMethod,
  type TopUpRequest,
  type InsertTopUpRequest,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type TokenHistory,
  type InsertTokenHistory,
  type TokenTransaction,
  type InsertTokenTransaction,
  type DailyTokenReward,
  type InsertDailyTokenReward,
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
  type Pet,
  type PetCareActivity,
  type DailyCareStatus,
  type AdminLog,
  type InsertAdminLog,
  type EmailTemplate,
  type InsertEmailTemplate,
  // KOS types
  type UserStars,
  type InsertUserStars,
  type StarPurchase,
  type InsertStarPurchase,
  type StarTransaction,
  type InsertStarTransaction,
  type Tournament,
  type InsertTournament,
  type TournamentParticipant,
  type InsertTournamentParticipant,
  type UserLike,
  type InsertUserLike,
  type StarContributor,
  type InsertStarContributor,
  type InfluencerRank,
  type InsertInfluencerRank,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, isNull, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: { loyaltyPoints?: number; authProvider?: string; googleId?: string; appleId?: string; profileImageUrl?: string }): Promise<User>;
  updateUserProfile(id: string, profile: { firstName?: string; lastName?: string; phoneNumber?: string; gender?: string; dateOfBirth?: Date }): Promise<void>;
  
  // Email authentication operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  createEmailUser(userData: any): Promise<User>;
  createGoogleUser(userData: any): Promise<User>;
  createFacebookUser(userData: any): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  handleReferral(userId: string, referralCode: string): Promise<void>;
  
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
  updateToy(toyId: number, toyData: Partial<InsertToy>): Promise<void>;
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
  deductUserTokens(userId: string, tokens: number): Promise<void>;
  updateUserLoyaltyPoints(userId: string, loyaltyPoints: number): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  
  // Cash-out operations
  createCashOutRequest(cashOut: InsertCashOutTransaction): Promise<CashOutTransaction>;
  getCashOutRequest(id: number): Promise<CashOutTransaction | undefined>;
  getCashOutsByUserId(userId: string): Promise<CashOutTransaction[]>;
  getAllCashOuts(): Promise<CashOutTransaction[]>;
  updateCashOutStatus(id: number, status: string, adminNotes?: string): Promise<void>;
  updateUserBankDetails(userId: string, bankName: string, accountNumber: string, accountHolderName: string): Promise<void>;
  
  // Payment and top-up operations
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  getPaymentMethodsByUserId(userId: string): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: number, method: Partial<InsertPaymentMethod>): Promise<void>;
  deletePaymentMethod(id: number): Promise<void>;
  
  createTopUpRequest(request: InsertTopUpRequest): Promise<TopUpRequest>;
  getTopUpRequestsByUserId(userId: string): Promise<TopUpRequest[]>;
  getAllTopUpRequests(): Promise<TopUpRequest[]>;
  updateTopUpRequestStatus(id: number, status: string, adminId: string, adminNotes?: string): Promise<void>;
  
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransactionsByUserId(userId: string): Promise<PaymentTransaction[]>;
  updatePaymentTransactionStatus(id: number, status: string, transactionId?: string): Promise<void>;
  
  // Purchase confirmation operations
  createPendingPurchase(purchase: InsertPendingPurchase): Promise<PendingPurchase>;
  getPendingPurchasesByUserId(userId: string): Promise<PendingPurchase[]>;
  getPendingPurchasesByListingId(listingId: number): Promise<PendingPurchase[]>;
  getAllPendingPurchases(): Promise<any[]>;
  getPurchaseById(purchaseId: number): Promise<any>;
  sellerConfirmPurchase(purchaseId: number): Promise<void>;
  buyerConfirmPurchase(purchaseId: number): Promise<void>;
  forceCompletePurchase(purchaseId: number): Promise<void>;
  cancelPurchase(purchaseId: number): Promise<void>;
  
  // Credit and points history operations
  createCreditHistory(credit: InsertCreditHistory): Promise<CreditHistory>;
  getCreditHistoryByUserId(userId: string): Promise<CreditHistory[]>;
  createPointsHistory(points: InsertPointsHistory): Promise<PointsHistory>;
  getPointsHistoryByUserId(userId: string): Promise<PointsHistory[]>;
  
  // Token history operations
  createTokenHistory(tokenHistory: InsertTokenHistory): Promise<TokenHistory>;
  getTokenHistoryByUserId(userId: string): Promise<TokenHistory[]>;
  
  // Admin-specific operations
  getAllTransactions(): Promise<Transaction[]>;
  getAllToysWithOwners(): Promise<any[]>;
  getTemplateToys(): Promise<any[]>;
  getAllActivatedPetsWithDetails(): Promise<any[]>;
  
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
  
  // Game score operations
  createGameScore(score: InsertGameScore): Promise<GameScore>;
  getTopGameScores(limit?: number): Promise<any[]>;
  getUserGameScores(userId: string): Promise<GameScore[]>;
  resetAllGameScores(): Promise<void>;
  
  // Pet care operations
  createPet(pet: InsertPet): Promise<Pet>;
  getPetsByUserId(userId: string): Promise<Pet[]>;
  getPetById(id: number): Promise<Pet | undefined>;
  updatePetStats(id: number, stats: { happiness?: number; hunger?: number; cleanliness?: number; energy?: number; growthStage?: string; evolutionPoints?: number }): Promise<void>;
  updatePetAge(id: number, age: number): Promise<void>;
  updatePetDetails(id: number, details: { name?: string; currentAge?: number; activatedDate?: Date }): Promise<void>;
  updatePetTokens(userId: string, tokenAmount: number): Promise<void>;
  
  // Pet evolution operations
  getPetEvolutionImage(species: string, growthStage: string): Promise<any>;
  
  // Daily care operations
  getTodaysCareStatus(petId: number): Promise<DailyCareStatus | undefined>;
  updateCareStatus(petId: number, userId: string, careType: 'fed' | 'bathed' | 'slept' | 'cleaned', completed: boolean): Promise<void>;
  
  // Admin logs operations
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(limit?: number, offset?: number): Promise<AdminLog[]>;
  getAdminLogsByAdmin(adminUserId: string): Promise<AdminLog[]>;
  getAdminLogsByTargetUser(targetUserId: string): Promise<AdminLog[]>;
  createCareActivity(activity: InsertPetCareActivity): Promise<PetCareActivity>;
  getCareActivitiesByPetId(petId: number): Promise<PetCareActivity[]>;
  checkAllCareCompleted(petId: number): Promise<boolean>;
  checkTokenEligibility(petId: number): Promise<{ eligible: boolean; reason?: string }>;
  awardDailyToken(userId: string, petId: number): Promise<void>;
  
  // Daily token reward operations
  createDailyTokenReward(reward: InsertDailyTokenReward): Promise<DailyTokenReward>;
  getLastDailyTokenReward(userId: string): Promise<DailyTokenReward | undefined>;
  canClaimDailyTokenReward(userId: string): Promise<{ canClaim: boolean; nextClaimTime?: Date }>;
  claimDailyTokenReward(userId: string): Promise<{ success: boolean; tokensAwarded: number }>;
  
  // Email template operations
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplateById(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByType(templateType: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<void>;
  deleteEmailTemplate(id: number): Promise<void>;
  getActiveEmailTemplates(): Promise<EmailTemplate[]>;

  // KOS (Kings Of Singers) operations
  // User Stars operations
  getUserStars(userId: string): Promise<UserStars | undefined>;
  createUserStars(userStars: InsertUserStars): Promise<UserStars>;
  updateUserStars(userId: string, updates: Partial<UserStars>): Promise<void>;
  getTopInfluencers(limit?: number): Promise<UserStars[]>;
  getUsersByInfluencerTier(tier: number): Promise<UserStars[]>;

  // Star Purchases operations
  createStarPurchase(purchase: InsertStarPurchase): Promise<StarPurchase>;
  getStarPurchasesByUserId(userId: string): Promise<StarPurchase[]>;
  getAllStarPurchases(): Promise<StarPurchase[]>;

  // Star Transactions operations
  createStarTransaction(transaction: InsertStarTransaction): Promise<StarTransaction>;
  getStarTransactionsByUserId(userId: string): Promise<StarTransaction[]>;
  getStarTransactionsByTournament(tournamentId: number): Promise<StarTransaction[]>;
  getAllStarTransactions(): Promise<StarTransaction[]>;

  // Tournament operations
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getAllTournaments(): Promise<Tournament[]>;
  getActiveTournaments(): Promise<Tournament[]>;
  getTournamentById(id: number): Promise<Tournament | undefined>;
  updateTournamentStatus(id: number, status: string): Promise<void>;
  endTournament(id: number): Promise<void>;

  // Tournament Participants operations
  createTournamentParticipant(participant: InsertTournamentParticipant): Promise<TournamentParticipant>;
  getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]>;
  updateParticipantReward(participantId: number, rewardAmount: number): Promise<void>;
  getParticipantRanking(tournamentId: number): Promise<TournamentParticipant[]>;

  // User Likes operations
  createUserLike(like: InsertUserLike): Promise<UserLike>;
  getUserLikes(userId: string): Promise<UserLike[]>;
  getLikesReceived(userId: string): Promise<UserLike[]>;
  updateUserLikeStatus(fromUserId: string, toUserId: string, isLiked: boolean): Promise<void>;

  // Star Contributors operations
  createStarContributor(contributor: InsertStarContributor): Promise<StarContributor>;
  getStarContributors(recipientUserId: string): Promise<StarContributor[]>;
  updateStarContribution(recipientUserId: string, contributorUserId: string, starsGiven: number): Promise<void>;
  getTopContributors(recipientUserId: string, limit?: number): Promise<StarContributor[]>;

  // Influencer Ranks operations
  getAllInfluencerRanks(): Promise<InfluencerRank[]>;
  getInfluencerRankByTier(tier: number): Promise<InfluencerRank[]>;
  getUserInfluencerRank(points: number, earnings: number): Promise<InfluencerRank | undefined>;
  updateUserInfluencerRank(userId: string): Promise<void>;
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

  async updateUser(id: string, updates: { loyaltyPoints?: number; authProvider?: string; googleId?: string; appleId?: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
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

  // Email authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
    
    const userId = nanoid();
    const referralCode = await this.createReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
        password: hashedPassword,
        authProvider: userData.authProvider || "email",
        referralCode,
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    // Handle referral if provided
    if (userData.referralCode) {
      await this.handleReferral(userId, userData.referralCode);
    }
    
    return user;
  }

  async createEmailUser(userData: any): Promise<User> {
    return this.createUser({ ...userData, authProvider: "email" });
  }

  async createGoogleUser(userData: any): Promise<User> {
    const userId = userData.id || nanoid();
    const referralCode = userData.referralCode || await this.createReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: null,
        authProvider: "google",
        googleId: userData.googleId,
        profileImageUrl: userData.profileImageUrl,
        referralCode,
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return user;
  }

  async createFacebookUser(userData: any): Promise<User> {
    const userId = userData.id || nanoid();
    const referralCode = userData.referralCode || await this.createReferralCode();
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: null,
        authProvider: "facebook",
        facebookId: userData.facebookId,
        profileImageUrl: userData.profileImageUrl,
        referralCode,
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }
    
    return user;
  }

  async handleReferral(userId: string, referralCode: string): Promise<void> {
    // Find the referrer by referral code
    const [referrer] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));

    if (referrer) {
      // Create referral relationship
      await this.createReferralRelationship(referrer.id, userId);
      
      // Update the referred user's referredById
      await db
        .update(users)
        .set({ referredById: referrer.id })
        .where(eq(users.id, userId));
    }
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
      totalEarnings: 0,
      levels: []
    };

    // Build tree for each direct referral only
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
        joinDate: level1.createdAt
      };

      genealogyTree.totalEarnings += level1Data.earnings;
      genealogyTree.levels.push(level1Data);
    }

    return genealogyTree;
  }

  async createReferralRelationship(referrerId: string, referredId: string): Promise<void> {
    // Create only direct referral (level 1) with 10% commission
    await db.insert(referrals).values({
      referrerId,
      referredId,
      level: 1,
      commissionRate: "10.00",
    });
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
      .orderBy(desc(appointments.createdAt));

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

  async getCreditTransactionsByUserId(userId: string): Promise<any[]> {
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
    try {
      // Try the basic Drizzle query first without complex field selection
      const result = await db.query.toys.findMany({
        where: eq(toys.ownerId, ownerId),
        orderBy: [desc(toys.createdAt)]
      });
      
      console.log("*** TOYS QUERY SUCCESS: Found", result.length, "toys for user", ownerId);
      return result;
    } catch (error) {
      console.error("*** TOYS QUERY ERROR:", error);
      
      // Return empty array as fallback
      return [];
    }
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

  async getToy(toyId: number): Promise<any> {
    const [toy] = await db
      .select()
      .from(toys)
      .where(eq(toys.id, toyId));
    return toy;
  }

  async updateToy(toyId: number, toyData: Partial<InsertToy>): Promise<void> {
    await db
      .update(toys)
      .set({ ...toyData, updatedAt: new Date() })
      .where(eq(toys.id, toyId));
  }

  async activateToyByQrCode(qrCode: string, userId: string): Promise<Toy | null> {
    // First check if toy exists
    const [toy] = await db
      .select()
      .from(toys)
      .where(eq(toys.qrCode, qrCode));

    if (!toy) {
      throw new Error("Invalid QR code - toy not found");
    }

    // Check if user already owns this toy
    if (toy.ownerId === userId) {
      throw new Error("You already own this toy");
    }

    // Check if toy is owned by someone else
    if (toy.ownerId && toy.ownerId !== userId) {
      throw new Error("This toy is already owned by someone else");
    }

    // Direct ownership assignment - no purchase validation
    try {
      const [updatedToy] = await db
        .update(toys)
        .set({ 
          ownerId: userId,
          purchasedBy: userId,
          isActivated: true,
          updatedAt: new Date() 
        })
        .where(eq(toys.qrCode, qrCode))
        .returning();

      return updatedToy;
    } catch (error) {
      // Force update even if there are constraints
      await db.execute(sql`
        UPDATE toys 
        SET owner_id = ${userId}, 
            purchased_by = ${userId}, 
            is_activated = true, 
            updated_at = NOW() 
        WHERE qr_code = ${qrCode}
      `);
      
      // Return the updated toy
      const [result] = await db
        .select()
        .from(toys)
        .where(eq(toys.qrCode, qrCode));
      
      return result;
    }
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
    // First check if toy has associated pets
    const associatedPets = await db
      .select()
      .from(pets)
      .where(eq(pets.toyId, toyId));
    
    if (associatedPets.length > 0) {
      throw new Error(`Cannot delete toy: ${associatedPets.length} pet(s) are using this toy. Please reassign or remove the pets first.`);
    }
    
    // Delete the toy if no pets are associated
    await db
      .delete(toys)
      .where(eq(toys.id, toyId));
  }

  async deleteHardcodedToys(): Promise<void> {
    // Delete toys that are not owned by users (hardcoded/sample toys)
    await db
      .delete(toys)
      .where(isNull(toys.ownerId));
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

  async getAllListings(seasonFilter?: string): Promise<any[]> {
    // Get both unowned toys (Season Packs) and user listings
    const results = [];
    
    // 1. Get unowned toys (Season Packs) - only 1 random toy
    let unownedQuery = db
      .select({
        id: toys.id,
        name: toys.name,
        series: toys.series,
        rarity: toys.rarity,
        imageUrl: toys.imageUrl,
        gender: toys.gender,
        color: toys.color,
        salePrice: toys.salePrice,
        originalPrice: toys.originalPrice,
        seasonId: toys.seasonId,
        ownerId: toys.ownerId,
        isActivated: toys.isActivated,
        createdAt: toys.createdAt,
        isListing: sql`false`.as('isListing'),
        listingId: sql`null`.as('listingId'),
        listingPrice: sql`null`.as('listingPrice'),
        sellerId: sql`null`.as('sellerId'),
        season: {
          id: seasons.id,
          name: seasons.name,
        }
      })
      .from(toys)
      .leftJoin(seasons, eq(toys.seasonId, seasons.id))
      .where(and(
        isNull(toys.ownerId), // Only unowned toys
        eq(toys.isActivated, false) // Only non-activated toys
      ));

    if (seasonFilter && seasonFilter !== 'all') {
      unownedQuery = unownedQuery.where(eq(seasons.name, seasonFilter));
    }

    const unownedToys = await unownedQuery;
    if (unownedToys.length > 0) {
      const randomIndex = Math.floor(Math.random() * unownedToys.length);
      results.push(unownedToys[randomIndex]);
    }
    
    // 2. Get user listings from the listings table
    let userListingsQuery = db
      .select({
        id: toys.id,
        name: toys.name,
        series: toys.series,
        rarity: toys.rarity,
        imageUrl: toys.imageUrl,
        gender: toys.gender,
        color: toys.color,
        salePrice: toys.salePrice,
        originalPrice: toys.originalPrice,
        seasonId: toys.seasonId,
        ownerId: toys.ownerId,
        isActivated: toys.isActivated,
        createdAt: toys.createdAt,
        isListing: sql`true`.as('isListing'),
        listingId: listings.id,
        listingPrice: listings.price,
        sellerId: listings.sellerId,
        sellerName: sql`concat(${users.firstName}, ' ', ${users.lastName})`.as('sellerName'),
        season: {
          id: seasons.id,
          name: seasons.name,
        }
      })
      .from(listings)
      .innerJoin(toys, eq(listings.toyId, toys.id))
      .innerJoin(users, eq(listings.sellerId, users.id))
      .leftJoin(seasons, eq(toys.seasonId, seasons.id))
      .where(eq(listings.status, 'active'));

    if (seasonFilter && seasonFilter !== 'all') {
      userListingsQuery = userListingsQuery.where(eq(seasons.name, seasonFilter));
    }

    const userListings = await userListingsQuery;
    results.push(...userListings);
    
    return results;
  }

  // Purchase toy method - assigns toy to user and returns new random marketplace toy
  async purchaseToy(toyId: number, userId: string): Promise<any> {
    // First, assign the purchased toy to the user
    const [purchasedToy] = await db
      .update(toys)
      .set({ 
        ownerId: userId,
        updatedAt: new Date()
      })
      .where(eq(toys.id, toyId))
      .returning();

    if (!purchasedToy) {
      throw new Error('Toy not found or already owned');
    }

    // Get a new random toy for the marketplace
    const newMarketplaceToys = await this.getAllListings();
    
    return {
      purchasedToy,
      newMarketplaceToy: newMarketplaceToys[0] || null
    };
  }

  async getSeasonalMarketplaceListings(seasonFilter?: string): Promise<any[]> {
    return this.getAllListings(seasonFilter);
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
    // First get all users with their basic data
    const usersData = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Then get referral counts for each user
    const usersWithReferralData = await Promise.all(
      usersData.map(async (user) => {
        // Get referral count - count of users referred by this user
        const referralCount = await db
          .select({ count: sql`count(*)` })
          .from(referrals)
          .where(eq(referrals.referrerId, user.id));

        return {
          ...user,
          referralCount: Number(referralCount[0]?.count || 0)
        };
      })
    );

    return usersWithReferralData;
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

  async getCashOutRequest(id: number): Promise<CashOutTransaction | undefined> {
    const [result] = await db
      .select()
      .from(cashOutTransactions)
      .where(eq(cashOutTransactions.id, id));
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
    

    return result;
  }

  async getAllPendingPurchases(): Promise<any[]> {
    const sellerUser = alias(users, 'seller_user');
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
        },
        buyer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        seller: {
          id: sellerUser.id,
          firstName: sellerUser.firstName,
          lastName: sellerUser.lastName,
          email: sellerUser.email,
        }
      })
      .from(pendingPurchases)
      .leftJoin(toys, eq(pendingPurchases.toyId, toys.id))
      .leftJoin(users, eq(pendingPurchases.buyerId, users.id))
      .leftJoin(sellerUser, eq(pendingPurchases.sellerId, sellerUser.id))
      .orderBy(desc(pendingPurchases.createdAt));
  }

  async getPurchaseById(purchaseId: number): Promise<any> {
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    return purchase;
  }

  async forceCompletePurchase(purchaseId: number): Promise<void> {
    // Simply mark the purchase as completed without full processing
    await db
      .update(pendingPurchases)
      .set({ 
        status: 'completed',
        confirmedAt: new Date()
      })
      .where(eq(pendingPurchases.id, purchaseId));
  }

  async cancelPurchase(purchaseId: number): Promise<void> {
    // Get purchase details for refund
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');

    // Refund buyer if credits were deducted
    if (purchase.status !== 'cancelled') {
      const refundAmount = parseFloat(purchase.amount);
      await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${refundAmount}`
        })
        .where(eq(users.id, purchase.buyerId));

      // Create credit history for refund
      await db.insert(creditHistory).values({
        userId: purchase.buyerId,
        amount: refundAmount.toString(),
        type: 'credit',
        description: `Refund for cancelled marketplace purchase - Purchase ID: ${purchaseId}`,
        relatedId: purchase.listingId,
      });
    }

    // Mark purchase as cancelled
    await db
      .update(pendingPurchases)
      .set({ 
        status: 'cancelled',
        confirmedAt: new Date()
      })
      .where(eq(pendingPurchases.id, purchaseId));
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

    // Handle referral commission for buyer's purchases
    const [buyer] = await db.select().from(users).where(eq(users.id, purchase.buyerId));
    if (buyer && buyer.referredById) {
      const commissionAmount = Math.floor(totalAmount * 0.1); // 10% commission in RP
      
      // Add commission to referrer's credits
      await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${commissionAmount}`,
          referralEarnings: sql`${users.referralEarnings} + ${commissionAmount}`,
        })
        .where(eq(users.id, buyer.referredById));

      // Record commission in credit history
      await db.insert(creditHistory).values({
        userId: buyer.referredById,
        amount: commissionAmount.toString(),
        type: 'referral_commission',
        description: `Referral commission (10%) from ${buyer.firstName || 'user'}'s marketplace purchase of RP ${totalAmount.toLocaleString()}`,
        relatedId: purchase.id,
      });

      // Record commission in dedicated commission history
      await db.insert(commissionHistory).values({
        introducerId: buyer.referredById,
        referredUserId: purchase.buyerId,
        transactionAmount: totalAmount.toString(),
        commissionAmount: commissionAmount.toString(),
        commissionRate: "0.10",
        description: `10% referral commission from ${buyer.firstName || 'user'}'s marketplace purchase of RP ${totalAmount.toLocaleString()}`,
        relatedId: purchase.id,
        relatedType: 'marketplace_purchase',
        status: 'completed',
      });

      // Update referral relationship total earnings
      await db
        .update(referrals)
        .set({
          totalEarnings: sql`${referrals.totalEarnings} + ${commissionAmount}`,
        })
        .where(
          and(
            eq(referrals.referrerId, buyer.referredById),
            eq(referrals.referredId, purchase.buyerId)
          )
        );

      console.log(`Awarded RP ${commissionAmount} commission to user ${buyer.referredById} for referral of ${purchase.buyerId}'s marketplace purchase`);
    }

    // Record 10% admin fee in transactions table for dashboard tracking
    await db.insert(transactions).values({
      userId: 'ADMIN_FEE',
      amount: adminFee.toFixed(2),
      description: `Admin fee (10%) from marketplace sale - Purchase ID: ${purchaseId}`,
      paymentMethod: 'marketplace_fee',
      status: 'completed',
      currency: 'RP',
      metadata: {
        purchaseId: purchaseId,
        sellerId: purchase.sellerId,
        buyerId: purchase.buyerId,
        originalAmount: totalAmount.toFixed(2),
        feePercentage: '10%'
      }
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

  async getAllPointsHistory(): Promise<PointsHistory[]> {
    return await db
      .select()
      .from(pointsHistory)
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

  async getTemplateToys(): Promise<any[]> {
    return await db.select({
      id: toys.id,
      name: toys.name,
      series: toys.series,
      seasonId: toys.seasonId,
      rarity: toys.rarity,
      color: toys.color,
      gender: toys.gender,
      imageUrl: toys.imageUrl,
      qrCode: toys.qrCode,
      ownerId: toys.ownerId,
      isActivated: toys.isActivated,
      salePrice: toys.salePrice,
      originalPrice: toys.originalPrice,
      isTemplate: toys.isTemplate,
      templateId: toys.templateId,
      createdAt: toys.createdAt,
      updatedAt: toys.updatedAt,
      season: {
        id: seasons.id,
        name: seasons.name,
        displayName: seasons.displayName,
      },
      owner: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(toys)
    .leftJoin(seasons, eq(toys.seasonId, seasons.id))
    .leftJoin(users, eq(toys.ownerId, users.id))
    .where(isNull(toys.ownerId)) // Only template toys (no owner)
    .orderBy(desc(toys.createdAt));
  }

  async getAllActivatedPetsWithDetails(): Promise<any[]> {
    return await db.select({
      id: pets.id,
      name: pets.name,
      species: pets.species,
      currentAge: pets.currentAge,
      growthStage: pets.growthStage,
      happiness: pets.happiness,
      hunger: pets.hunger,
      cleanliness: pets.cleanliness,
      energy: pets.energy,
      totalTokensEarned: pets.totalTokensEarned,
      dailyTokensAvailable: pets.dailyTokensAvailable,
      birthDate: pets.birthDate,
      createdAt: pets.createdAt,
      ownerId: pets.userId,
      ownerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('ownerName'),
      ownerTokens: users.loyaltyPoints,
      // Get toy information
      toyId: pets.toyId,
      series: toys.series,
      rarity: toys.rarity,
      imageUrl: toys.imageUrl,
      tokensGiven: pets.totalTokensEarned
    })
    .from(pets)
    .leftJoin(users, eq(pets.userId, users.id))
    .leftJoin(toys, eq(pets.toyId, toys.id))
    .where(eq(pets.isActive, true))
    .orderBy(desc(pets.createdAt));
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

  async getRewardItemById(id: number): Promise<RewardItem | undefined> {
    const [item] = await db.select().from(rewardItems).where(eq(rewardItems.id, id));
    return item;
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

  // Marketplace earnings tracking
  async recordMarketplaceEarning(earningData: any): Promise<any> {
    const [earning] = await db.insert(marketplaceEarnings).values(earningData).returning();
    return earning;
  }

  async getMarketplaceEarnings(): Promise<any[]> {
    return await db.select().from(marketplaceEarnings).orderBy(desc(marketplaceEarnings.createdAt));
  }

  async getMarketplaceEarningsStats(): Promise<{
    totalEarnings: number;
    totalSales: number;
    averageCommission: number;
    monthlyEarnings: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allEarnings] = await db.select({
      totalEarnings: sql<number>`COALESCE(SUM(CAST(${marketplaceEarnings.amount} AS DECIMAL)), 0)`,
      totalSales: sql<number>`COUNT(*)`,
      averageCommission: sql<number>`COALESCE(AVG(CAST(${marketplaceEarnings.amount} AS DECIMAL)), 0)`
    }).from(marketplaceEarnings).where(eq(marketplaceEarnings.status, 'confirmed'));

    const [monthlyEarnings] = await db.select({
      monthlyEarnings: sql<number>`COALESCE(SUM(CAST(${marketplaceEarnings.amount} AS DECIMAL)), 0)`
    }).from(marketplaceEarnings).where(
      and(
        eq(marketplaceEarnings.status, 'confirmed'),
        gte(marketplaceEarnings.createdAt, startOfMonth)
      )
    );

    return {
      totalEarnings: allEarnings?.totalEarnings || 0,
      totalSales: allEarnings?.totalSales || 0,
      averageCommission: allEarnings?.averageCommission || 0,
      monthlyEarnings: monthlyEarnings?.monthlyEarnings || 0
    };
  }

  // Seasonal sales analytics method
  async getSeasonalSalesAnalytics(): Promise<any[]> {
    const seasonalSales = await db
      .select({
        seasonId: seasons.id,
        seasonName: seasons.name,
        totalSales: sql<number>`COUNT(${marketplaceEarnings.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${marketplaceEarnings.salePrice} AS DECIMAL)), 0)`,
        totalCommission: sql<number>`COALESCE(SUM(CAST(${marketplaceEarnings.amount} AS DECIMAL)), 0)`,
        averageSalePrice: sql<number>`COALESCE(AVG(CAST(${marketplaceEarnings.salePrice} AS DECIMAL)), 0)`,
        commissionRate: sql<number>`COALESCE(AVG(CAST(${marketplaceEarnings.commissionRate} AS DECIMAL)), 10.00)`
      })
      .from(marketplaceEarnings)
      .leftJoin(toys, eq(marketplaceEarnings.relatedToyId, toys.id))
      .leftJoin(seasons, eq(toys.seasonId, seasons.id))
      .where(eq(marketplaceEarnings.status, 'confirmed'))
      .groupBy(seasons.id, seasons.name)
      .orderBy(desc(sql<number>`COALESCE(SUM(CAST(${marketplaceEarnings.amount} AS DECIMAL)), 0)`));

    return seasonalSales;
  }
  async getSeasonalSalesStatistics(): Promise<any> {
    try {
      // Get sales data by season with commission tracking
      const seasonalData = await db
        .select({
          seasonId: seasons.id,
          seasonName: seasons.name,
          totalSales: sql<number>`COUNT(DISTINCT ${listings.id})`,
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${listings.price} AS DECIMAL)), 0)`,
          platformCommission: sql<number>`COALESCE(SUM(CAST(${listings.price} AS DECIMAL) * 0.10), 0)`,
          adminSales: sql<number>`COUNT(CASE WHEN ${users.role} = 'admin' THEN 1 END)`,
          userSales: sql<number>`COUNT(CASE WHEN ${users.role} = 'user' THEN 1 END)`,
        })
        .from(listings)
        .leftJoin(toys, eq(listings.toyId, toys.id))
        .leftJoin(seasons, eq(toys.seasonId, seasons.id))
        .leftJoin(users, eq(listings.sellerId, users.id))
        .where(eq(listings.status, "active"))
        .groupBy(seasons.id, seasons.name)
        .orderBy(desc(sql`COUNT(DISTINCT ${listings.id})`));

      // Get overall statistics
      const overallStats = await db
        .select({
          totalEarnings: sql<number>`COALESCE(SUM(CAST(${listings.price} AS DECIMAL) * 0.10), 0)`,
          totalSales: sql<number>`COUNT(*)`,
          avgCommission: sql<number>`COALESCE(AVG(CAST(${listings.price} AS DECIMAL) * 0.10), 0)`
        })
        .from(listings)
        .where(eq(listings.status, "active"));

      return {
        seasonalBreakdown: seasonalData,
        summary: {
          totalEarnings: overallStats[0]?.totalEarnings || 0,
          totalSales: overallStats[0]?.totalSales || 0,
          avgCommission: overallStats[0]?.avgCommission || 0,
          platformFeePercentage: 10
        }
      };
    } catch (error) {
      console.error('Error getting seasonal sales analytics:', error);
      return {
        seasonalBreakdown: [],
        summary: {
          totalEarnings: 0,
          totalSales: 0,
          avgCommission: 0,
          platformFeePercentage: 10
        }
      };
    }
  }

  // Random marketplace listing generation
  async createRandomMarketplaceListings(count: number = 10): Promise<{ created: number; listings: any[] }> {
    try {
      // Get random unowned toys that are not activated and not already listed
      const unownedToys = await db
        .select()
        .from(toys)
        .where(
          and(
            isNull(toys.ownerId), // No owner
            eq(toys.isActivated, false), // Not activated as pets
            isNull(toys.salePrice) // Not already marked for sale
          )
        )
        .limit(count * 3); // Get more than needed to have options

      if (unownedToys.length === 0) {
        return { created: 0, listings: [] };
      }

      // Randomly select from available toys
      const selectedToys = unownedToys
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(count, unownedToys.length));

      const createdListings = [];

      for (const toy of selectedToys) {
        // Generate random price based on rarity
        let basePrice = 50000; // Base price in IDR
        switch (toy.rarity?.toLowerCase()) {
          case 'legendary':
            basePrice = 500000 + Math.random() * 1000000; // 500k-1.5M IDR
            break;
          case 'epic':
            basePrice = 200000 + Math.random() * 300000; // 200k-500k IDR
            break;
          case 'rare':
            basePrice = 100000 + Math.random() * 100000; // 100k-200k IDR
            break;
          case 'common':
          default:
            basePrice = 25000 + Math.random() * 75000; // 25k-100k IDR
            break;
        }

        // Round to nearest 1000
        const price = (Math.round(basePrice / 1000) * 1000).toString();

        // Create marketplace listing with system as seller
        const listingData = {
          toyId: toy.id,
          sellerId: 'system', // Special system seller ID
          price: price,
          description: `${toy.rarity} ${toy.name} available for purchase. Color: ${toy.color}, Gender: ${toy.gender}`,
          status: 'active' as const
        };

        const [listing] = await db
          .insert(listings)
          .values(listingData)
          .returning();

        // Update toy to mark it's for sale
        await db
          .update(toys)
          .set({ 
            salePrice: price,
            isForSale: true,
            updatedAt: new Date()
          })
          .where(eq(toys.id, toy.id));

        createdListings.push({
          ...listing,
          toy: toy
        });
      }

      console.log(`*** MARKETPLACE: Created ${createdListings.length} random listings`);
      return { created: createdListings.length, listings: createdListings };

    } catch (error) {
      console.error('Error creating random marketplace listings:', error);
      return { created: 0, listings: [] };
    }
  }

  // Game score operations
  async createGameScore(scoreData: InsertGameScore): Promise<GameScore> {
    const [score] = await db
      .insert(gameScores)
      .values(scoreData)
      .returning();
    return score;
  }

  async getTopGameScores(limit: number = 50): Promise<any[]> {
    // Get the highest score for each user using a subquery
    const highestScoresSubquery = db
      .select({
        userId: gameScores.userId,
        maxScore: sql`MAX(${gameScores.score})`.as('max_score'),
      })
      .from(gameScores)
      .groupBy(gameScores.userId)
      .as('highest_scores');

    const scores = await db
      .select({
        id: gameScores.id,
        score: gameScores.score,
        tokensEarned: gameScores.tokensEarned,
        createdAt: gameScores.createdAt,
        userId: gameScores.userId,
        petId: gameScores.petId,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        pet: {
          id: pets.id,
          name: pets.name,
        }
      })
      .from(gameScores)
      .leftJoin(users, eq(gameScores.userId, users.id))
      .leftJoin(pets, eq(gameScores.petId, pets.id))
      .innerJoin(
        highestScoresSubquery,
        and(
          eq(gameScores.userId, highestScoresSubquery.userId),
          eq(gameScores.score, highestScoresSubquery.maxScore)
        )
      )
      .orderBy(desc(gameScores.score))
      .limit(limit);
    
    return scores;
  }

  async getUserGameScores(userId: string): Promise<GameScore[]> {
    return await db
      .select()
      .from(gameScores)
      .where(eq(gameScores.userId, userId))
      .orderBy(desc(gameScores.score));
  }

  async resetAllGameScores(): Promise<void> {
    await db.delete(gameScores);
  }

  // Pet care operations
  async createPet(petData: InsertPet): Promise<Pet> {
    const [pet] = await db.insert(pets).values(petData).returning();
    return pet;
  }

  async getPetsByUserId(userId: string): Promise<Pet[]> {
    return await db.select().from(pets)
      .where(and(eq(pets.userId, userId), eq(pets.isActive, true)))
      .orderBy(pets.createdAt);
  }

  async getPetById(id: number): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet;
  }

  async updatePetStats(id: number, stats: { happiness?: number; hunger?: number; cleanliness?: number; energy?: number; growthStage?: string; evolutionPoints?: number; isSleeping?: boolean; sleepStartTime?: Date | null; lastCareDate?: Date; lastTokenClaim?: Date }): Promise<void> {
    await db.update(pets).set({
      ...stats,
      updatedAt: new Date(),
    }).where(eq(pets.id, id));
  }

  async updatePetAge(id: number, age: number): Promise<void> {
    const growthStage = this.calculateGrowthStage(age);
    await db.update(pets).set({
      currentAge: age,
      growthStage,
      updatedAt: new Date(),
    }).where(eq(pets.id, id));
  }

  async updatePetName(id: number, name: string): Promise<void> {
    await db.update(pets).set({
      name,
      updatedAt: new Date(),
    }).where(eq(pets.id, id));
  }

  private calculateGrowthStage(age: number): string {
    if (age < 10) return "baby";
    if (age < 30) return "child";
    if (age < 60) return "teen";
    if (age < 90) return "adult";
    return "elder";
  }

  // Pet evolution operations
  async getPetEvolutionImage(species: string, growthStage: string): Promise<any> {
    const [evolutionImage] = await db.select().from(petEvolutionImages)
      .where(and(
        eq(petEvolutionImages.species, species),
        eq(petEvolutionImages.growthStage, growthStage)
      ));
    return evolutionImage;
  }

  // Daily care operations
  async getTodaysCareStatus(petId: number): Promise<DailyCareStatus | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [careStatus] = await db.select().from(dailyCareStatus)
      .where(and(eq(dailyCareStatus.petId, petId), eq(dailyCareStatus.careDate, today)));
    return careStatus;
  }

  async updateCareStatus(petId: number, userId: string, careType: 'fed' | 'bathed' | 'slept' | 'cleaned', completed: boolean): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if care status exists for today
    const existingStatus = await this.getTodaysCareStatus(petId);
    
    if (existingStatus) {
      // Update existing status
      await db.update(dailyCareStatus).set({
        [careType]: completed,
        updatedAt: new Date(),
      }).where(eq(dailyCareStatus.id, existingStatus.id));
    } else {
      // Create new status
      await db.insert(dailyCareStatus).values({
        petId,
        userId,
        careDate: today,
        [careType]: completed,
        fed: careType === 'fed' ? completed : false,
        bathed: careType === 'bathed' ? completed : false,
        slept: careType === 'slept' ? completed : false,
        cleaned: careType === 'cleaned' ? completed : false,
      });
    }

    // Check if all care is completed and update accordingly
    const allCompleted = await this.checkAllCareCompleted(petId);
    if (allCompleted) {
      await db.update(dailyCareStatus).set({
        allCareCompleted: true,
        updatedAt: new Date(),
      }).where(and(eq(dailyCareStatus.petId, petId), eq(dailyCareStatus.careDate, today)));
    }
  }

  async createCareActivity(activityData: InsertPetCareActivity): Promise<PetCareActivity> {
    const [activity] = await db.insert(petCareActivities).values(activityData).returning();
    return activity;
  }

  async getCareActivitiesByPetId(petId: number): Promise<PetCareActivity[]> {
    return await db.select().from(petCareActivities)
      .where(eq(petCareActivities.petId, petId))
      .orderBy(petCareActivities.completedAt);
  }

  async checkAllCareCompleted(petId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const careStatus = await this.getTodaysCareStatus(petId);
    
    if (!careStatus) return false;
    
    return careStatus.fed && careStatus.bathed && careStatus.slept && careStatus.cleaned;
  }

  async updatePetLastFed(id: number): Promise<void> {
    await db.update(pets).set({ 
      lastFedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(pets.id, id));
  }

  async checkTokenEligibility(petId: number): Promise<{ eligible: boolean; reason?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get pet stats
    const pet = await this.getPetById(petId);
    if (!pet) {
      return { eligible: false, reason: 'Pet not found' };
    }
    
    // Check if token already awarded today for this pet
    const careStatus = await this.getTodaysCareStatus(petId);
    if (careStatus?.tokenEarned) {
      return { eligible: false, reason: 'Token already claimed today for this pet' };
    }
    
    // Check pet status bars - require minimum 80% in all three stats
    const energy = pet.energy || 0;
    const hunger = pet.hunger || 0;
    const cleanliness = pet.cleanliness || 0;
    
    const minimumLevel = 80;
    
    if (energy < minimumLevel) {
      return { eligible: false, reason: `Energy too low (${energy}%). Need ${minimumLevel}% or higher.` };
    }
    
    if (hunger < minimumLevel) {
      return { eligible: false, reason: `Hunger too low (${hunger}%). Need ${minimumLevel}% or higher.` };
    }
    
    if (cleanliness < minimumLevel) {
      return { eligible: false, reason: `Cleanliness too low (${cleanliness}%). Need ${minimumLevel}% or higher.` };
    }
    
    return { eligible: true, reason: 'Pet meets all requirements for token' };
  }

  async awardDailyToken(userId: string, petId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Double-check eligibility before awarding
    const eligibility = await this.checkTokenEligibility(petId);
    if (!eligibility.eligible) {
      console.log(`Token award blocked: ${eligibility.reason}`);
      return;
    }
    
    // Award 1 token (using loyalty points as tokens for now)
    await db.update(users).set({
      loyaltyPoints: sql`${users.loyaltyPoints} + 1`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Mark token as earned
    const careStatus = await this.getTodaysCareStatus(petId);
    if (careStatus) {
      await db.update(dailyCareStatus).set({
        tokenEarned: true,
        updatedAt: new Date(),
      }).where(eq(dailyCareStatus.id, careStatus.id));
    }

    // Create care activity record
    await this.createCareActivity({
      petId,
      userId,
      activityType: 'daily_complete',
      pointsEarned: 1,
    });
    
    console.log(`Token awarded to user ${userId} for pet ${petId}`);
  }

  async updatePetDetails(id: number, details: { name?: string; currentAge?: number; activatedDate?: Date }): Promise<void> {
    try {
      const updateData: any = {};
      
      if (details.name !== undefined) {
        updateData.name = details.name;
      }
      
      if (details.currentAge !== undefined) {
        updateData.currentAge = details.currentAge;
        // Update growth stage based on age
        updateData.growthStage = this.calculateGrowthStage(details.currentAge);
      }
      
      if (details.activatedDate !== undefined) {
        updateData.birthDate = details.activatedDate;
      }
      
      updateData.updatedAt = new Date();
      
      // Update the pets table, not toys table
      await db.update(pets).set(updateData).where(eq(pets.id, id));
    } catch (error) {
      console.error('Error updating pet details:', error);
      throw error;
    }
  }

  async updatePetTokens(userId: string, tokenAmount: number): Promise<void> {
    try {
      // Find all active pets for this user
      const userPets = await db.select().from(pets)
        .where(and(eq(pets.userId, userId), eq(pets.isActive, true)));
      
      if (userPets.length > 0) {
        // Set the exact number of available tokens for claiming (not add)
        const pet = userPets[0];
        
        await db.update(pets)
          .set({ 
            dailyTokensAvailable: tokenAmount,
            updatedAt: new Date()
          })
          .where(eq(pets.id, pet.id));
      }
    } catch (error) {
      console.error('Error updating pet tokens:', error);
      throw error;
    }
  }

  async updateUserTokens(userId: string, tokens: number): Promise<void> {
    await db.update(users).set({ 
      tokens: tokens,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async updateUserLoyaltyPoints(userId: string, loyaltyPoints: number): Promise<void> {
    await db.update(users).set({ 
      loyaltyPoints: loyaltyPoints,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async deductUserTokens(userId: string, tokens: number): Promise<void> {
    await db.update(users).set({ 
      tokens: sql`${users.tokens} - ${tokens}`,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async addUserTokens(userId: string, tokens: number): Promise<void> {
    await db.update(users).set({ 
      tokens: sql`${users.tokens} + ${tokens}`,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async createTokenClaim(claimData: InsertTokenClaim): Promise<TokenClaim> {
    const [claim] = await db.insert(tokenClaims).values(claimData).returning();
    return claim;
  }

  async getTokenClaims(): Promise<any[]> {
    return await db.select({
      id: tokenClaims.id,
      userId: tokenClaims.userId,
      tokenAmount: tokenClaims.tokensRequested,
      status: tokenClaims.status,
      adminNotes: tokenClaims.adminNotes,
      trackingNumber: tokenClaims.trackingNumber,
      createdAt: tokenClaims.requestedAt,
      requestedAt: tokenClaims.requestedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }
    })
    .from(tokenClaims)
    .leftJoin(users, eq(tokenClaims.userId, users.id))
    .orderBy(desc(tokenClaims.requestedAt));
  }

  async getTokenClaimsByUserId(userId: string): Promise<any[]> {
    return await db.select({
      id: tokenClaims.id,
      userId: tokenClaims.userId,
      tokensRequested: tokenClaims.tokensRequested,
      status: tokenClaims.status,
      adminNotes: tokenClaims.adminNotes,
      trackingNumber: tokenClaims.trackingNumber,
      requestedAt: tokenClaims.requestedAt,
      processedAt: tokenClaims.processedAt,
    })
    .from(tokenClaims)
    .where(eq(tokenClaims.userId, userId))
    .orderBy(desc(tokenClaims.requestedAt));
  }

  async updateTokenClaimStatus(claimId: number, status: string, adminId: string, adminNotes?: string, trackingNumber?: string): Promise<void> {
    try {
      console.log(`*** TOKEN CLAIM UPDATE: Updating claim ${claimId} to status ${status} by admin ${adminId}`);
      
      // Get the token claim details first
      const [claim] = await db.select().from(tokenClaims).where(eq(tokenClaims.id, claimId));
      
      if (!claim) {
        console.log(`*** TOKEN CLAIM ERROR: Claim ${claimId} not found`);
        throw new Error('Token claim not found');
      }

      console.log(`*** TOKEN CLAIM FOUND:`, claim);

      const updateData: any = {
        status,
        processedBy: adminId,
        processedAt: new Date(),
      };
      
      if (adminNotes) updateData.adminNotes = adminNotes;
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      
      console.log(`*** TOKEN CLAIM UPDATE DATA:`, updateData);
      
      await db.update(tokenClaims).set(updateData).where(eq(tokenClaims.id, claimId));
      
      console.log(`*** TOKEN CLAIM UPDATED SUCCESSFULLY`);

      // Update the corresponding token transaction status
      const transactionUpdateResult = await db.update(tokenTransactions).set({
        status: status
      }).where(eq(tokenTransactions.relatedId, claimId));
      
      console.log(`*** TOKEN TRANSACTION STATUS UPDATED for claimId: ${claimId}, updated rows:`, transactionUpdateResult.rowCount);

      // If approved, no action needed - tokens remain unchanged (already deducted when claim was made)
      if (status === 'approved') {
        console.log('Token claim approved - tokens remain deducted');
      }
      
      // If rejected, add tokens back to user's account (refund the deducted tokens)
      if (status === 'rejected') {
        console.log('Adding tokens back:', claim.tokensRequested, 'to user:', claim.userId);
        await db.update(users).set({
          tokens: sql`${users.tokens} + ${claim.tokensRequested}`,
          updatedAt: new Date()
        }).where(eq(users.id, claim.userId));
      }
    } catch (error) {
      console.error('*** TOKEN CLAIM UPDATE ERROR:', error);
      throw error;
    }
  }

  // Payment and top-up operations
  async createPaymentMethod(methodData: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db
      .insert(paymentMethods)
      .values(methodData)
      .returning();
    return method;
  }

  async getPaymentMethodsByUserId(userId: string): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.isActive, true)))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
  }

  async updatePaymentMethod(id: number, methodData: Partial<InsertPaymentMethod>): Promise<void> {
    await db
      .update(paymentMethods)
      .set({
        ...methodData,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id));
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await db
      .update(paymentMethods)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id));
  }

  async createTopUpRequest(requestData: InsertTopUpRequest): Promise<TopUpRequest> {
    const [request] = await db
      .insert(topUpRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getTopUpRequestsByUserId(userId: string): Promise<TopUpRequest[]> {
    return await db
      .select()
      .from(topUpRequests)
      .where(eq(topUpRequests.userId, userId))
      .orderBy(desc(topUpRequests.createdAt));
  }

  async getAllTopUpRequests(): Promise<TopUpRequest[]> {
    return await db
      .select()
      .from(topUpRequests)
      .orderBy(desc(topUpRequests.createdAt));
  }

  async updateTopUpRequestStatus(id: number, status: string, adminId: string, adminNotes?: string): Promise<void> {
    const updateData: any = {
      status,
      adminId,
      processedAt: new Date(),
      updatedAt: new Date(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await db
      .update(topUpRequests)
      .set(updateData)
      .where(eq(topUpRequests.id, id));

    // If approved, add credits to user account
    if (status === 'approved') {
      const [request] = await db
        .select()
        .from(topUpRequests)
        .where(eq(topUpRequests.id, id))
        .limit(1);

      if (request) {
        // Add credits to user account
        await this.updateUserCredits(request.userId, request.amount);
        
        // Create credit history record
        await this.createCreditHistory({
          userId: request.userId,
          amount: request.amount,
          type: 'credit_topup',
          description: `Credit top-up via ${request.paymentMethod} - Request #${id}`,
          status: 'completed',
          referenceId: id.toString(),
        });
      }
    }
  }

  async createPaymentTransaction(transactionData: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [transaction] = await db
      .insert(paymentTransactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getPaymentTransactionsByUserId(userId: string): Promise<PaymentTransaction[]> {
    return await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async updatePaymentTransactionStatus(id: number, status: string, transactionId?: string): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    await db
      .update(paymentTransactions)
      .set(updateData)
      .where(eq(paymentTransactions.id, id));

    // If payment completed, add credits to user account
    if (status === 'completed') {
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, id))
        .limit(1);

      if (transaction) {
        // Add credits to user account
        await this.updateUserCredits(transaction.userId, transaction.amount);
        
        // Create credit history record
        await this.createCreditHistory({
          userId: transaction.userId,
          amount: transaction.amount,
          type: 'payment_credit',
          description: `Credit purchase via ${transaction.paymentMethod} - ${transaction.description}`,
          status: 'completed',
          referenceId: transaction.transactionId || id.toString(),
        });
      }
    }
  }

  // Top-up request management methods
  async getAllTopUpRequests() {
    const results = await db
      .select({
        id: topUpRequests.id,
        userId: topUpRequests.userId,
        amount: topUpRequests.amount,
        paymentMethod: topUpRequests.paymentMethod,
        bankTransferDetails: topUpRequests.bankTransferDetails,
        paymentProof: topUpRequests.paymentProof,
        status: topUpRequests.status,
        adminNotes: topUpRequests.adminNotes,
        createdAt: topUpRequests.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(topUpRequests)
      .leftJoin(users, eq(topUpRequests.userId, users.id))
      .orderBy(desc(topUpRequests.createdAt));
    
    return results;
  }

  async getTopUpRequestById(id: number) {
    const [result] = await db
      .select()
      .from(topUpRequests)
      .where(eq(topUpRequests.id, id))
      .limit(1);
    
    return result;
  }

  async updateTopUpRequestStatus(id: number, status: string, adminNotes?: string) {
    const updateData: any = { 
      status,
      updatedAt: new Date(),
    };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await db
      .update(topUpRequests)
      .set(updateData)
      .where(eq(topUpRequests.id, id));
  }

  async getUserTopUpHistory(userId: string) {
    const results = await db
      .select({
        id: topUpRequests.id,
        amount: topUpRequests.amount,
        paymentMethod: topUpRequests.paymentMethod,
        status: topUpRequests.status,
        createdAt: topUpRequests.createdAt,
        processedAt: topUpRequests.processedAt,
      })
      .from(topUpRequests)
      .where(eq(topUpRequests.userId, userId))
      .orderBy(desc(topUpRequests.createdAt));
    
    return results;
  }

  async createTokenHistory(tokenHistory: InsertTokenHistory): Promise<TokenHistory> {
    const [result] = await db
      .insert(tokenHistory)
      .values(tokenHistory)
      .returning();
    return result;
  }

  async getTokenHistoryByUserId(userId: string): Promise<TokenHistory[]> {
    return await db
      .select()
      .from(tokenHistory)
      .where(eq(tokenHistory.userId, userId))
      .orderBy(desc(tokenHistory.createdAt));
  }

  // Daily token reward operations
  async createDailyTokenReward(reward: InsertDailyTokenReward): Promise<DailyTokenReward> {
    const [result] = await db
      .insert(dailyTokenRewards)
      .values(reward)
      .returning();
    return result;
  }

  async getLastDailyTokenReward(userId: string): Promise<DailyTokenReward | undefined> {
    const [reward] = await db
      .select()
      .from(dailyTokenRewards)
      .where(eq(dailyTokenRewards.userId, userId))
      .orderBy(desc(dailyTokenRewards.createdAt))
      .limit(1);
    return reward;
  }

  async canClaimDailyTokenReward(userId: string): Promise<{ canClaim: boolean; nextClaimTime?: Date }> {
    // Get user's pets to check if any have all stats > 0%
    const userPets = await this.getPetsByUserId(userId);
    
    if (userPets.length === 0) {
      return { canClaim: false };
    }

    // Check if any pet has all stats above 0%
    const hasHealthyPet = userPets.some(pet => 
      (pet.happiness || 0) > 0 && 
      (pet.hunger || 0) > 0 && 
      (pet.cleanliness || 0) > 0 && 
      (pet.energy || 0) > 0
    );

    if (!hasHealthyPet) {
      return { canClaim: false };
    }

    // Check last claim time (24-hour cooldown)
    const lastReward = await this.getLastDailyTokenReward(userId);
    
    if (!lastReward) {
      return { canClaim: true };
    }

    const now = new Date();
    const lastClaimTime = new Date(lastReward.createdAt);
    const timeSinceLastClaim = now.getTime() - lastClaimTime.getTime();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

    if (timeSinceLastClaim >= twentyFourHoursInMs) {
      return { canClaim: true };
    }

    const nextClaimTime = new Date(lastClaimTime.getTime() + twentyFourHoursInMs);
    return { canClaim: false, nextClaimTime };
  }

  async claimDailyTokenReward(userId: string): Promise<{ success: boolean; tokensAwarded: number }> {
    const { canClaim } = await this.canClaimDailyTokenReward(userId);
    
    if (!canClaim) {
      return { success: false, tokensAwarded: 0 };
    }

    const tokensAwarded = 1;

    // Create the daily token reward record
    await this.createDailyTokenReward({
      userId,
      tokensAwarded,
      reason: 'Daily reward for healthy pet care'
    });

    // Add tokens to user account
    await this.updatePetTokens(userId, tokensAwarded);

    // Create token transaction record
    await db.insert(tokenTransactions).values({
      userId,
      tokens: tokensAwarded,
      type: 'earned',
      description: 'Daily token reward for pet care',
      relatedId: null
    });

    return { success: true, tokensAwarded };
  }

  // Force complete a purchase for admin approval (bypass normal status checks)
  async forceCompletePurchase(purchaseId: number): Promise<void> {
    // Get purchase details
    const [purchase] = await db
      .select()
      .from(pendingPurchases)
      .where(eq(pendingPurchases.id, purchaseId));
    
    if (!purchase) throw new Error('Purchase not found');

    // Calculate seller amount (90% after 10% admin fee)
    const totalAmount = parseFloat(purchase.amount);
    const adminFee = totalAmount * 0.1;
    const sellerAmount = totalAmount - adminFee;

    // Transfer toy ownership to buyer
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

    // Handle referral commission for buyer's purchases
    const [buyer] = await db.select().from(users).where(eq(users.id, purchase.buyerId));
    if (buyer && buyer.referredById) {
      const commissionAmount = Math.floor(totalAmount * 0.1); // 10% commission in RP
      
      // Add commission to referrer's credits
      await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${commissionAmount}`,
          referralEarnings: sql`${users.referralEarnings} + ${commissionAmount}`,
        })
        .where(eq(users.id, buyer.referredById));

      // Record commission in credit history
      await db.insert(creditHistory).values({
        userId: buyer.referredById,
        amount: commissionAmount.toString(),
        type: 'referral_commission',
        description: `Referral commission (10%) from ${buyer.firstName || 'user'}'s marketplace purchase of RP ${totalAmount.toLocaleString()}`,
        relatedId: purchase.id,
      });

      // Record commission in dedicated commission history
      await db.insert(commissionHistory).values({
        introducerId: buyer.referredById,
        referredUserId: purchase.buyerId,
        transactionAmount: totalAmount.toString(),
        commissionAmount: commissionAmount.toString(),
        commissionRate: "0.10",
        description: `10% referral commission from ${buyer.firstName || 'user'}'s marketplace purchase of RP ${totalAmount.toLocaleString()}`,
        relatedId: purchase.id,
        relatedType: 'marketplace_purchase',
        status: 'completed',
      });

      // Update referral relationship total earnings
      await db
        .update(referrals)
        .set({
          totalEarnings: sql`${referrals.totalEarnings} + ${commissionAmount}`,
        })
        .where(
          and(
            eq(referrals.referrerId, buyer.referredById),
            eq(referrals.referredId, purchase.buyerId)
          )
        );

      console.log(`Force completion: Awarded RP ${commissionAmount} commission to user ${buyer.referredById} for referral of ${purchase.buyerId}'s marketplace purchase`);
    }

    console.log(`Purchase ${purchaseId} force-completed by admin`);
  }

  // Password reset functionality
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpiry: expiry,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async verifyPasswordResetToken(token: string): Promise<string | null> {
    const [user] = await db.select({
      id: users.id,
      passwordResetExpiry: users.passwordResetExpiry
    }).from(users).where(eq(users.passwordResetToken, token));

    if (!user || !user.passwordResetExpiry) {
      return null;
    }

    // Check if token has expired
    if (new Date() > user.passwordResetExpiry) {
      // Clean up expired token
      await this.clearPasswordResetToken(user.id);
      return null;
    }

    return user.id;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({
      password: hashedPassword,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db.update(users).set({
      passwordResetToken: null,
      passwordResetExpiry: null,
      updatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  // Season management operations
  async getSeasonByName(name: string): Promise<any | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.name, name));
    return season;
  }

  async createSeason(seasonData: any): Promise<any> {
    const [season] = await db.insert(seasons).values({
      name: seasonData.name,
      displayName: seasonData.name,
      description: seasonData.description,
      iconUrl: '/images/default-season.png',
      backgroundColor: '#3B82F6',
      isActive: seasonData.isActive || true,
      displayOrder: 0,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return season;
  }

  // Series management operations
  async getSeriesByName(name: string): Promise<any | undefined> {
    const [series] = await db.select().from(collectionSeries).where(eq(collectionSeries.name, name));
    return series;
  }

  async createSeries(seriesData: any): Promise<any> {
    const [series] = await db.insert(collectionSeries).values({
      seasonId: seriesData.seasonId,
      name: seriesData.name,
      displayName: seriesData.name,
      description: seriesData.description,
      iconSymbol: '🎯',
      backgroundColor: '#F3F4F6',
      unlockCondition: 'none',
      isUnlocked: true,
      displayOrder: seriesData.order || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return series;
  }

  async updateSeason(seasonId: number, updateData: any): Promise<any> {
    const [updatedSeason] = await db
      .update(seasons)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(seasons.id, seasonId))
      .returning();
    return updatedSeason;
  }

  // Admin logs operations
  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    const [adminLog] = await db.insert(adminLogs).values(log).returning();
    return adminLog;
  }

  async getAdminLogs(limit: number = 50, offset: number = 0): Promise<AdminLog[]> {
    const targetUserAlias = alias(users, 'targetUser');
    
    const logs = await db
      .select({
        id: adminLogs.id,
        adminUserId: adminLogs.adminUserId,
        targetUserId: adminLogs.targetUserId,
        targetType: adminLogs.targetType,
        targetId: adminLogs.targetId,
        action: adminLogs.action,
        entityType: adminLogs.entityType,
        oldValues: adminLogs.oldValues,
        newValues: adminLogs.newValues,
        description: adminLogs.description,
        ipAddress: adminLogs.ipAddress,
        userAgent: adminLogs.userAgent,
        createdAt: adminLogs.createdAt,
        admin: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        targetUser: {
          id: targetUserAlias.id,
          firstName: targetUserAlias.firstName,
          lastName: targetUserAlias.lastName,
          email: targetUserAlias.email,
        }
      })
      .from(adminLogs)
      .leftJoin(users, eq(adminLogs.adminUserId, users.id))
      .leftJoin(targetUserAlias, eq(adminLogs.targetUserId, targetUserAlias.id))
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs as any[];
  }

  async getAdminLogsByAdmin(adminUserId: string): Promise<AdminLog[]> {
    return await db
      .select()
      .from(adminLogs)
      .where(eq(adminLogs.adminUserId, adminUserId))
      .orderBy(desc(adminLogs.createdAt));
  }

  async getAdminLogsByTargetUser(targetUserId: string): Promise<AdminLog[]> {
    return await db
      .select()
      .from(adminLogs)
      .where(eq(adminLogs.targetUserId, targetUserId))
      .orderBy(desc(adminLogs.createdAt));
  }

  // Email template operations
  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplateById(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template;
  }

  async getEmailTemplateByType(templateType: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.templateType, templateType), eq(emailTemplates.isActive, true)));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<void> {
    await db
      .update(emailTemplates)
      .set({
        ...template,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id));
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
  }

  async getActiveEmailTemplates(): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.isActive, true))
      .orderBy(desc(emailTemplates.createdAt));
  }

  // KOS (Kings Of Singers) storage methods implementation
  // User Stars operations
  async getUserStars(userId: string): Promise<UserStars | undefined> {
    const [userStars] = await db
      .select()
      .from(userStars)
      .where(eq(userStars.userId, userId));
    return userStars;
  }

  async createUserStars(userStarsData: InsertUserStars): Promise<UserStars> {
    const [newUserStars] = await db
      .insert(userStars)
      .values({
        ...userStarsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUserStars;
  }

  async updateUserStars(userId: string, updates: Partial<UserStars>): Promise<void> {
    await db
      .update(userStars)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userStars.userId, userId));
  }

  async getTopInfluencers(limit: number = 10): Promise<UserStars[]> {
    return await db
      .select()
      .from(userStars)
      .orderBy(desc(userStars.influencerPoints), desc(userStars.totalEarnings))
      .limit(limit);
  }

  async getUsersByInfluencerTier(tier: number): Promise<UserStars[]> {
    return await db
      .select()
      .from(userStars)
      .where(eq(userStars.influencerTier, tier))
      .orderBy(desc(userStars.influencerPoints));
  }

  // Star Purchases operations
  async createStarPurchase(purchase: InsertStarPurchase): Promise<StarPurchase> {
    const [newPurchase] = await db
      .insert(starPurchases)
      .values({
        ...purchase,
        createdAt: new Date(),
      })
      .returning();
    return newPurchase;
  }

  async getStarPurchasesByUserId(userId: string): Promise<StarPurchase[]> {
    return await db
      .select()
      .from(starPurchases)
      .where(eq(starPurchases.userId, userId))
      .orderBy(desc(starPurchases.createdAt));
  }

  async getAllStarPurchases(): Promise<StarPurchase[]> {
    return await db
      .select()
      .from(starPurchases)
      .orderBy(desc(starPurchases.createdAt));
  }

  // Star Transactions operations
  async createStarTransaction(transaction: InsertStarTransaction): Promise<StarTransaction> {
    const [newTransaction] = await db
      .insert(starTransactions)
      .values({
        ...transaction,
        createdAt: new Date(),
      })
      .returning();
    return newTransaction;
  }

  async getStarTransactionsByUserId(userId: string): Promise<StarTransaction[]> {
    return await db
      .select()
      .from(starTransactions)
      .where(or(eq(starTransactions.fromUserId, userId), eq(starTransactions.toUserId, userId)))
      .orderBy(desc(starTransactions.createdAt));
  }

  async getStarTransactionsByTournament(tournamentId: number): Promise<StarTransaction[]> {
    return await db
      .select()
      .from(starTransactions)
      .where(eq(starTransactions.tournamentId, tournamentId))
      .orderBy(desc(starTransactions.createdAt));
  }

  async getAllStarTransactions(): Promise<StarTransaction[]> {
    return await db
      .select()
      .from(starTransactions)
      .orderBy(desc(starTransactions.createdAt));
  }

  // Tournament operations
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [newTournament] = await db
      .insert(tournaments)
      .values({
        ...tournament,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newTournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.status, 'active'))
      .orderBy(desc(tournaments.createdAt));
  }

  async getTournamentById(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament;
  }

  async updateTournamentStatus(id: number, status: string): Promise<void> {
    await db
      .update(tournaments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id));
  }

  async endTournament(id: number): Promise<void> {
    await db
      .update(tournaments)
      .set({
        status: 'completed',
        isDistributed: true,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id));
  }

  // Tournament Participants operations
  async createTournamentParticipant(participant: InsertTournamentParticipant): Promise<TournamentParticipant> {
    const [newParticipant] = await db
      .insert(tournamentParticipants)
      .values({
        ...participant,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newParticipant;
  }

  async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    return await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .orderBy(desc(tournamentParticipants.starsReceived));
  }

  async updateParticipantReward(participantId: number, rewardAmount: number): Promise<void> {
    await db
      .update(tournamentParticipants)
      .set({
        rewardAmount,
        isRewarded: true,
        updatedAt: new Date(),
      })
      .where(eq(tournamentParticipants.id, participantId));
  }

  async getParticipantRanking(tournamentId: number): Promise<TournamentParticipant[]> {
    return await db
      .select()
      .from(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .orderBy(desc(tournamentParticipants.starsReceived), desc(tournamentParticipants.createdAt));
  }

  // User Likes operations
  async createUserLike(like: InsertUserLike): Promise<UserLike> {
    const [newLike] = await db
      .insert(userLikes)
      .values({
        ...like,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newLike;
  }

  async getUserLikes(userId: string): Promise<UserLike[]> {
    return await db
      .select()
      .from(userLikes)
      .where(eq(userLikes.fromUserId, userId))
      .orderBy(desc(userLikes.createdAt));
  }

  async getLikesReceived(userId: string): Promise<UserLike[]> {
    return await db
      .select()
      .from(userLikes)
      .where(eq(userLikes.toUserId, userId))
      .orderBy(desc(userLikes.createdAt));
  }

  async updateUserLikeStatus(fromUserId: string, toUserId: string, isLiked: boolean): Promise<void> {
    await db
      .update(userLikes)
      .set({
        isLiked,
        updatedAt: new Date(),
      })
      .where(and(eq(userLikes.fromUserId, fromUserId), eq(userLikes.toUserId, toUserId)));
  }

  // Star Contributors operations
  async createStarContributor(contributor: InsertStarContributor): Promise<StarContributor> {
    const [newContributor] = await db
      .insert(starContributors)
      .values({
        ...contributor,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newContributor;
  }

  async getStarContributors(recipientUserId: string): Promise<StarContributor[]> {
    return await db
      .select()
      .from(starContributors)
      .where(eq(starContributors.recipientUserId, recipientUserId))
      .orderBy(desc(starContributors.totalStarsGiven));
  }

  async updateStarContribution(recipientUserId: string, contributorUserId: string, starsGiven: number): Promise<void> {
    await db
      .update(starContributors)
      .set({
        totalStarsGiven: starsGiven,
        lastContributionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(starContributors.recipientUserId, recipientUserId),
        eq(starContributors.contributorUserId, contributorUserId)
      ));
  }

  async getTopContributors(recipientUserId: string, limit: number = 10): Promise<StarContributor[]> {
    return await db
      .select()
      .from(starContributors)
      .where(eq(starContributors.recipientUserId, recipientUserId))
      .orderBy(desc(starContributors.totalStarsGiven))
      .limit(limit);
  }

  // Influencer Ranks operations
  async getAllInfluencerRanks(): Promise<InfluencerRank[]> {
    return await db
      .select()
      .from(influencerRanks)
      .orderBy(influencerRanks.tier, influencerRanks.minPoints);
  }

  async getInfluencerRankByTier(tier: number): Promise<InfluencerRank[]> {
    return await db
      .select()
      .from(influencerRanks)
      .where(eq(influencerRanks.tier, tier))
      .orderBy(influencerRanks.minPoints);
  }

  async getUserInfluencerRank(points: number, earnings: number): Promise<InfluencerRank | undefined> {
    const [rank] = await db
      .select()
      .from(influencerRanks)
      .where(and(
        gte(sql`${points}`, influencerRanks.minPoints),
        gte(sql`${points}`, influencerRanks.maxPoints),
        gte(sql`${earnings}`, influencerRanks.minEarnings),
        gte(sql`${earnings}`, influencerRanks.maxEarnings)
      ))
      .orderBy(desc(influencerRanks.tier), desc(influencerRanks.minPoints))
      .limit(1);
    return rank;
  }

  async updateUserInfluencerRank(userId: string): Promise<void> {
    // Get user's current stars data
    const userStarsData = await this.getUserStars(userId);
    if (!userStarsData) return;

    // Find the appropriate rank based on points and earnings
    const newRank = await this.getUserInfluencerRank(
      userStarsData.influencerPoints,
      parseFloat(userStarsData.totalEarnings)
    );

    if (newRank) {
      await this.updateUserStars(userId, {
        influencerRank: newRank.rankName,
        influencerTier: newRank.tier,
      });
    }
  }
}

export const storage = new DatabaseStorage();
