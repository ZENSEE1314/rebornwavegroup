import type { Express } from "express";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "../shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupMultiAuth, requireAuth } from "./multiAuth";
import { sendEmail, sendWelcomeEmail, sendPetEvolutionEmail } from "./sendgrid";

// Helper function to extract user ID from different auth formats
function getUserId(req: any): string | null {
  // For session-based authentication (passport)
  if (req.user?.id) {
    return req.user.id;
  }
  // For JWT-based authentication (Replit Auth)
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
}
import { sendAppointmentConfirmationEmail, sendAppointmentCancellationEmail, sendAppointmentRescheduleEmail } from "./emailService";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import multer from "multer";
import { promises as fs } from "fs";
import { 
  insertAppointmentSchema,
  insertTransactionSchema,
  insertToySchema,
  insertListingSchema,
  insertMessageSchema,
  insertPaymentVerificationSchema,
  users,
  pets,
  transactions,
  tokenTransactions,
  paymentVerifications,
  pointsHistory,
  commissionHistory,
  referrals,
} from "@shared/schema";
import { eq, and, or, like, desc, sql, isNotNull } from "drizzle-orm";
import { z } from "zod";

// Enhanced pet evolution utility functions
function getNextEvolutionThreshold(currentStage: string): number {
  switch (currentStage) {
    case 'baby': return 150;     // Increased from 100
    case 'child': return 300;    // Increased from 200
    case 'teen': return 500;     // Increased from 300
    case 'adult': return 800;    // Increased from 500
    case 'elder': return 1200;   // New death threshold
    case 'death': return Infinity; // Can't evolve further
    default: return 150;
  }
}

function getNextGrowthStage(currentStage: string): string {
  switch (currentStage) {
    case 'baby': return 'child';
    case 'child': return 'teen';
    case 'teen': return 'adult';
    case 'adult': return 'elder';
    case 'elder': return 'death';  // Evolution to death
    case 'death': return 'death';  // Already dead
    default: return 'child';
  }
}

// Calculate evolution progress for current stage
function getEvolutionProgress(currentStage: string, totalCareCount: number): number {
  const currentThreshold = getEvolutionThreshold(currentStage);
  const nextThreshold = getNextEvolutionThreshold(currentStage);
  
  if (currentStage === 'death') return 100;
  
  const progress = ((totalCareCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.max(0, Math.min(100, progress));
}

function getEvolutionThreshold(stage: string): number {
  switch (stage) {
    case 'baby': return 0;
    case 'child': return 150;
    case 'teen': return 300;
    case 'adult': return 500;
    case 'elder': return 800;
    case 'death': return 1200;
    default: return 0;
  }
}

// Configure multer for image uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploaded-images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Global request logger for debugging pet care endpoints
  app.use((req, res, next) => {
    if (req.path.includes('/api/pets') && req.path.includes('/care/')) {
      console.log('🔍 PET CARE REQUEST INTERCEPTED:');
      console.log('Method:', req.method);
      console.log('Path:', req.path);
      console.log('URL:', req.url);
      console.log('Original URL:', req.originalUrl);
    }
    
    // Log ALL POST requests to find the mysterious endpoint
    if (req.method === 'POST' && req.path.includes('/api/pets')) {
      console.log('🚨 ALL PET POST REQUEST:', req.method, req.path);
    }
    next();
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Serve uploaded images statically
  app.use('/uploaded-images', express.static('uploaded-images'));
  
  // Add cache control middleware for API routes
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  });
  
  // Setup multi-provider authentication
  setupMultiAuth(app);
  
  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set up session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ user });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, phoneNumber, dateOfBirth, gender, referralCode } = req.body;
      
      if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !gender) {
        return res.status(400).json({ message: 'All fields are required (email, password, firstName, lastName, phoneNumber, dateOfBirth, gender)' });
      }

      // Validate gender field
      if (gender !== 'male' && gender !== 'female') {
        return res.status(400).json({ message: 'Gender must be either male or female' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Create new user with enhanced fields
      const user = await storage.createEmailUser({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        authProvider: 'email',
        referralCode: referralCode || null,
      });
      
      // Set up session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration failed' });
        }
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          authProvider: user.authProvider
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // Remove duplicate auth/user route - handled by multiAuth.ts

  // PET CARE ENDPOINT - HIGH PRIORITY PLACEMENT
  app.post('/api/pets/:petId/care/:careType', requireAuth, async (req: any, res) => {
    console.log('🎯 TOP PRIORITY PET CARE ENDPOINT REACHED!');
    console.log('Care Type:', req.params.careType);
    console.log('Pet ID:', req.params.petId);

    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { petId, careType } = req.params;
      console.log('Processing care action:', { petId, careType, adminUserId });
      
      if (!['fed', 'bathed', 'slept', 'cleaned', 'play'].includes(careType)) {
        console.log('ERROR: Invalid care type:', careType);
        return res.status(400).json({ message: "Invalid care type" });
      }

      // Get the pet to verify ownership and get current stats
      const pet = await storage.getPetById(parseInt(petId));
      if (!pet || pet.userId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      console.log('Before stats update - Pet current stats:', {
        hunger: pet.hunger,
        cleanliness: pet.cleanliness,
        happiness: pet.happiness,
        energy: pet.energy
      });

      // CRITICAL FIX: Initialize stats with 0 if null to prevent auto-increase bug
      const currentHunger = pet.hunger ?? 0;
      const currentCleanliness = pet.cleanliness ?? 0;
      const currentHappiness = pet.happiness ?? 0;
      const currentEnergy = pet.energy ?? 50;
      
      // Update pet stats based on care type - ONLY when user performs action
      let statsUpdate = {};
      
      if (careType === 'fed') {
        // Feed: Increase hunger by 25% and decrease energy by 5%
        if (currentEnergy <= 0) {
          return res.status(400).json({ error: "Pet is too tired! Use sleep to restore energy first." });
        }
        
        const newHunger = Math.min(100, currentHunger + 25);
        const newEnergy = Math.max(0, currentEnergy - 5);
        console.log(`FEEDING: hunger ${currentHunger} -> ${newHunger}, energy ${currentEnergy} -> ${newEnergy}`);
        
        statsUpdate = { 
          hunger: newHunger,
          energy: newEnergy
        };
        
      } else if (careType === 'bathed') {
        // Bath: Increase cleanliness by 25% and decrease energy by 5%
        if (currentEnergy <= 0) {
          return res.status(400).json({ error: "Pet is too tired! Use sleep to restore energy first." });
        }
        
        const newCleanliness = Math.min(100, currentCleanliness + 25);
        const newEnergy = Math.max(0, currentEnergy - 5);
        console.log(`BATHING: cleanliness ${currentCleanliness} -> ${newCleanliness}, energy ${currentEnergy} -> ${newEnergy}`);
        
        statsUpdate = { 
          cleanliness: newCleanliness,
          energy: newEnergy
        };
        
      } else if (careType === 'play' || careType === 'cleaned') {
        // Play: Increase happiness by 25% and decrease energy by 5%
        if (currentEnergy <= 0) {
          return res.status(400).json({ error: "Pet is too tired! Use sleep to restore energy first." });
        }
        
        const newHappiness = Math.min(100, currentHappiness + 25);
        const newEnergy = Math.max(0, currentEnergy - 5);
        console.log(`PLAY ACTION: happiness ${currentHappiness} -> ${newHappiness}, energy ${currentEnergy} -> ${newEnergy}`);
        
        statsUpdate = { 
          happiness: newHappiness,
          energy: newEnergy
        };
        
      } else if (careType === 'slept') {
        // Sleep restores energy fully
        const newEnergy = 100;
        console.log(`Pet sleeping: energy restored to ${newEnergy}`);
        
        statsUpdate = { 
          energy: newEnergy,
          isSleeping: false,
          sleepStartTime: null
        };
      }

      // Only update if we have stats to update
      if (Object.keys(statsUpdate).length > 0) {
        await storage.updatePetStats(parseInt(petId), statsUpdate);
        console.log('Pet stats updated with:', statsUpdate);
      }

      // Verify the update was successful by fetching the pet again
      const updatedPet = await storage.getPetById(parseInt(petId));
      console.log('After stats update - Pet new stats:', {
        hunger: updatedPet?.hunger,
        cleanliness: updatedPet?.cleanliness,
        happiness: updatedPet?.happiness,
        energy: updatedPet?.energy
      });

      // Send real-time update via WebSocket to synchronize frontend
      if (global.wss) {
        const updateMessage = {
          type: 'petStatsUpdate',
          petId: parseInt(petId),
          stats: {
            hunger: updatedPet?.hunger,
            happiness: updatedPet?.happiness,
            cleanliness: updatedPet?.cleanliness,
            energy: updatedPet?.energy,
            isSleeping: updatedPet?.isSleeping,
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('Broadcasting pet stats update via WebSocket:', updateMessage);
        global.wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(updateMessage));
          }
        });
      }
      
      // Track care activity for evolution progression
      await storage.createCareActivity({
        petId: parseInt(petId),
        userId: adminUserId,
        activityType: careType,
        completedAt: new Date(),
        pointsEarned: 5 // Each care activity earns 5 evolution points
      });

      // Check for evolution progression
      const careActivities = await storage.getCareActivitiesByPetId(parseInt(petId));
      const totalCareCount = careActivities.length;
      const currentStage = pet.growthStage || 'baby';
      const nextThreshold = getNextEvolutionThreshold(currentStage);
      
      let evolutionMessage = '';
      let evolved = false;
      
      // Check if pet should evolve
      if (totalCareCount >= nextThreshold && currentStage !== 'death') {
        const nextStage = getNextGrowthStage(currentStage);
        await storage.updatePetStats(parseInt(petId), { growthStage: nextStage });
        evolved = true;
        
        if (nextStage === 'death') {
          evolutionMessage = `Your beloved ${pet.name} has lived a full life and peacefully passed away. They will be remembered forever.`;
        } else {
          evolutionMessage = `Congratulations! ${pet.name} has evolved from ${currentStage} to ${nextStage}!`;
        }
      }

      await storage.updateCareStatus(parseInt(petId), adminUserId, careType as any, true);
      console.log('Care status updated successfully');
      
      const response: any = { 
        success: true, 
        message: `Pet ${careType} successfully!`,
        totalCareCount,
        currentStage: evolved ? getNextGrowthStage(currentStage) : currentStage,
        evolutionProgress: getEvolutionProgress(currentStage, totalCareCount)
      };
      
      if (evolved) {
        response.evolved = true;
        response.evolutionMessage = evolutionMessage;
        response.newStage = getNextGrowthStage(currentStage);
      }
      
      res.json(response);
    } catch (error) {
      console.error('PET CARE ERROR:', error);
      res.status(500).json({ message: "Failed to perform pet care action" });
    }
  });

  // Image upload endpoint
  app.post('/api/upload-image', isAuthenticated, upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const imageUrl = `/uploaded-images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
  


  // Serve attached assets as static files
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));
  
  // Serve uploaded images as static files
  app.use('/uploaded-images', express.static(path.join(process.cwd(), 'uploaded-images')));

  // PayPal payment routes
  app.get("/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Payment verification routes
  app.post("/api/payment-verifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      console.log("Payment verification request body:", req.body);
      console.log("User ID:", userId);
      
      const validation = insertPaymentVerificationSchema.safeParse(req.body);
      
      if (!validation.success) {
        console.log("Validation failed:", validation.error.errors);
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }

      const [verification] = await db
        .insert(paymentVerifications)
        .values({
          ...validation.data,
          userId,
        })
        .returning();

      // Payment verification submitted successfully

      res.status(201).json(verification);
    } catch (error) {
      console.error("Error creating payment verification:", error);
      res.status(500).json({ message: "Failed to create payment verification" });
    }
  });

  app.get("/api/payment-verifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const verifications = await db
        .select()
        .from(paymentVerifications)
        .where(eq(paymentVerifications.userId, userId))
        .orderBy(desc(paymentVerifications.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(paymentVerifications)
        .where(eq(paymentVerifications.userId, userId));
      
      const total = Number(totalCount[0].count);

      res.json({
        data: verifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching payment verifications:", error);
      res.status(500).json({ message: "Failed to fetch payment verifications" });
    }
  });

  // Admin commission stats endpoint
  app.get("/api/admin/commission-stats", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await db.select().from(users).where(eq(users.id, adminUserId)).limit(1);
      if (!currentUser[0] || currentUser[0].role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get total pending verifications
      const pendingCount = await db
        .select({ count: sql`count(*)` })
        .from(paymentVerifications)
        .where(eq(paymentVerifications.status, 'pending'));

      // Get total commissions paid
      const totalCommissions = await db
        .select({ total: sql`COALESCE(sum(cast(amount as numeric)), 0)` })
        .from(transactions)
        .where(eq(transactions.type, 'referral_commission'));

      res.json({
        pendingVerifications: Number(pendingCount[0].count),
        totalCommissionsPaid: Number(totalCommissions[0].total),
      });
    } catch (error) {
      console.error("Error fetching commission stats:", error);
      res.status(500).json({ message: "Failed to fetch commission stats" });
    }
  });

  // Admin payment verification routes
  app.get("/api/admin/payment-verifications", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await db.select().from(users).where(eq(users.id, adminUserId)).limit(1);
      if (!currentUser[0] || currentUser[0].role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const verifications = await db
        .select({
          id: paymentVerifications.id,
          userId: paymentVerifications.userId,
          amount: paymentVerifications.amount,
          description: paymentVerifications.description,
          receiptImageUrl: paymentVerifications.receiptImageUrl,
          status: paymentVerifications.status,
          adminId: paymentVerifications.adminId,
          adminNotes: paymentVerifications.adminNotes,
          pointsAwarded: paymentVerifications.pointsAwarded,
          processedAt: paymentVerifications.processedAt,
          createdAt: paymentVerifications.createdAt,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(paymentVerifications)
        .leftJoin(users, eq(paymentVerifications.userId, users.id))
        .orderBy(desc(paymentVerifications.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db.select({ count: sql`count(*)` }).from(paymentVerifications);
      const total = Number(totalCount[0].count);

      res.json({
        data: verifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin payment verifications:", error);
      res.status(500).json({ message: "Failed to fetch payment verifications" });
    }
  });

  app.patch("/api/admin/payment-verifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      console.log(`*** APPROVAL DEBUG: Starting approval for verification ${req.params.id}`);
      console.log(`*** APPROVAL DEBUG: Request body:`, req.body);
      
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await db.select().from(users).where(eq(users.id, adminUserId)).limit(1);
      if (!currentUser[0] || currentUser[0].role !== 'admin') {
        console.log(`*** APPROVAL DEBUG: Admin access denied for user ${adminUserId}`);
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes, pointsAwarded } = req.body;
      const adminId = adminUserId;

      // Get the verification to calculate automatic points
      const [existingVerification] = await db.select().from(paymentVerifications).where(eq(paymentVerifications.id, parseInt(id))).limit(1);
      if (!existingVerification) {
        return res.status(404).json({ message: "Payment verification not found" });
      }

      // Auto-calculate points based on amount (1 point per 1000 IDR) when approving
      let calculatedPoints = pointsAwarded;
      if (status === 'approved') {
        const amount = parseFloat(existingVerification.amount);
        calculatedPoints = Math.floor(amount / 1000); // 1 point per 1000 IDR
        console.log(`*** APPROVAL DEBUG: Auto-calculated ${calculatedPoints} points from amount ${amount} IDR`);
      }

      console.log(`*** APPROVAL DEBUG: Updating verification ${id} to status ${status} with ${calculatedPoints} points`);

      const [updatedVerification] = await db
        .update(paymentVerifications)
        .set({
          status,
          adminId,
          adminNotes,
          pointsAwarded: calculatedPoints || 0,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentVerifications.id, parseInt(id)))
        .returning();

      if (!updatedVerification) {
        console.log(`*** APPROVAL DEBUG: No verification found with id ${id}`);
        return res.status(404).json({ message: "Payment verification not found" });
      }

      console.log(`*** APPROVAL DEBUG: Updated verification:`, updatedVerification);

      // If approved, award points to user and handle referral commission
      if (status === 'approved' && calculatedPoints > 0) {
        console.log(`*** APPROVAL DEBUG: Processing approval with ${calculatedPoints} points`);
        
        // Get user information to find introducer
        const userInfo = await db.select().from(users).where(eq(users.id, updatedVerification.userId)).limit(1);
        console.log(`*** APPROVAL DEBUG: User info found:`, userInfo[0]);
        
        // Award points to user
        console.log(`*** APPROVAL DEBUG: Awarding ${calculatedPoints} points to user ${updatedVerification.userId}`);
        await db
          .update(users)
          .set({
            loyaltyPoints: sql`${users.loyaltyPoints} + ${calculatedPoints}`,
            lifetimePoints: sql`${users.lifetimePoints} + ${calculatedPoints}`,
          })
          .where(eq(users.id, updatedVerification.userId));

        // Record points history
        console.log(`*** APPROVAL DEBUG: Recording points history`);
        await db.insert(pointsHistory).values({
          userId: updatedVerification.userId,
          points: calculatedPoints,
          type: 'earned',
          description: `Purchase verification approved - ${updatedVerification.description || 'Purchase'} (${calculatedPoints} points from ${parseFloat(existingVerification.amount).toLocaleString()} IDR)`,
          relatedId: updatedVerification.id,
        });

        // Handle 10% referral commission for introducer
        if (userInfo[0]?.referredById) {
          console.log(`*** APPROVAL DEBUG: Processing referral commission for introducer ${userInfo[0].referredById}`);
          const transactionAmount = parseFloat(updatedVerification.amount);
          const commissionAmount = Math.floor(transactionAmount * 0.1); // 10% commission in RP
          
          console.log(`*** APPROVAL DEBUG: Commission calculation - amount: ${transactionAmount}, commission: ${commissionAmount}`);
          
          // Add commission to introducer's credits (actual RP credits)
          await db
            .update(users)
            .set({
              credits: sql`${users.credits} + ${commissionAmount}`,
              referralEarnings: sql`${users.referralEarnings} + ${commissionAmount}`,
            })
            .where(eq(users.id, userInfo[0].referredById));

          // Record commission in credit history
          console.log(`*** APPROVAL DEBUG: Creating credit history record`);
          await storage.createCreditHistory({
            adminUserId: userInfo[0].referredById,
            amount: commissionAmount.toString(),
            type: 'referral_commission',
            description: `Referral commission (10%) from ${userInfo[0].firstName || 'user'}'s verified purchase of RP ${transactionAmount.toLocaleString()}`,
            referenceId: updatedVerification.id.toString(),
          });

          // Record commission in dedicated commission history
          console.log(`*** APPROVAL DEBUG: Creating commission history record`);
          await db.insert(commissionHistory).values({
            introducerId: userInfo[0].referredById,
            referredUserId: updatedVerification.adminUserId,
            transactionAmount: transactionAmount.toString(),
            commissionAmount: commissionAmount.toString(),
            commissionRate: "0.10",
            description: `10% referral commission from ${userInfo[0].firstName || 'user'}'s verified purchase of RP ${transactionAmount.toLocaleString()}`,
            relatedId: updatedVerification.id,
            relatedType: 'payment_verification',
            status: 'completed',
          });

          // Update referral relationship total earnings
          console.log(`*** APPROVAL DEBUG: Updating referral relationship earnings`);
          await db
            .update(referrals)
            .set({
              totalEarnings: sql`${referrals.totalEarnings} + ${commissionAmount}`,
            })
            .where(
              and(
                eq(referrals.referrerId, userInfo[0].referredById),
                eq(referrals.referredId, updatedVerification.adminUserId)
              )
            );

          console.log(`*** APPROVAL DEBUG: Commission processing completed - awarded RP ${commissionAmount} to user ${userInfo[0].referredById}`);
        } else {
          console.log(`*** APPROVAL DEBUG: No referrer found for user ${updatedVerification.adminUserId}`);
        }
      } else {
        console.log(`*** APPROVAL DEBUG: Skipping point award - status: ${status}, points: ${pointsAwarded}`);
      }

      // Payment verification update completed
      console.log(`Payment verification ${updatedVerification.id} updated to ${updatedVerification.status}`);

      // Broadcast real-time updates via WebSocket
      if ((global as any).wss) {
        const wsData = {
          type: 'PAYMENT_VERIFICATION_UPDATE',
          data: {
            id: updatedVerification.id,
            userId: updatedVerification.userId,
            status: updatedVerification.status,
            pointsAwarded: calculatedPoints || 0,
            adminNotes: adminNotes,
            timestamp: new Date().toISOString()
          }
        };

        // Broadcast to all connected clients
        (global as any).wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(wsData));
          }
        });
        
        console.log(`*** REALTIME: Broadcasted payment approval update for verification ${updatedVerification.id}`);
      }

      res.json(updatedVerification);
    } catch (error) {
      console.error("*** APPROVAL DEBUG: Error updating payment verification:", error);
      console.error("*** APPROVAL DEBUG: Error stack:", error.stack);
      res.status(500).json({ message: "Failed to update payment verification", error: error.message });
    }
  });

  // Cash-out routes
  app.post('/api/cash-out', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount, bankName, accountNumber, accountHolderName } = req.body;
      
      // Get current user to check credits
      const user = await storage.getUser(adminUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userCredits = parseFloat(user.credits);
      const cashOutAmount = parseFloat(amount);
      
      if (cashOutAmount > userCredits) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Deduct credits immediately when cash-out is created
      const newCredits = (userCredits - cashOutAmount).toString();
      await storage.updateUserCredits(adminUserId, newCredits);
      
      const cashOutRequest = await storage.createCashOutRequest({
        adminUserId,
        amount,
        bankName,
        accountNumber,
        accountHolderName,
        status: 'pending'
      });
      
      res.json({ success: true, cashOutId: cashOutRequest.id });
    } catch (error) {
      console.error("Error creating cash-out request:", error);
      res.status(500).json({ message: "Failed to create cash-out request" });
    }
  });

  // Credit top-up routes
  // PayPal routes required by PayPalButton component
  app.get("/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  app.post('/api/topup/paypal', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount, currency = 'IDR' } = req.body;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 10000) {
        return res.status(400).json({ error: "Invalid amount (minimum IDR 10,000)" });
      }

      // Create payment transaction record
      const transaction = await storage.createPaymentTransaction({
        adminUserId,
        amount: amount.toString(),
        currency,
        paymentMethod: 'paypal',
        status: 'pending',
        description: `Credit top-up via PayPal - $${amount}`,
        metadata: { topUpAmount: amount },
      });

      res.json({ 
        success: true, 
        transactionId: transaction.id,
        message: "PayPal payment initiated. Credits will be added upon successful payment completion."
      });
    } catch (error) {
      console.error("Error creating PayPal top-up:", error);
      res.status(500).json({ error: "Failed to initiate PayPal top-up" });
    }
  });

  app.post('/api/topup/bank-transfer', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount, bankTransferDetails, paymentProof } = req.body;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 10000) {
        return res.status(400).json({ error: "Invalid amount (minimum IDR 10,000)" });
      }

      if (!paymentProof || paymentProof.trim().length < 10) {
        return res.status(400).json({ error: "Photo proof of bank transfer receipt is required" });
      }

      if (!bankTransferDetails || !bankTransferDetails.bankName || !bankTransferDetails.accountNumber || !bankTransferDetails.referenceNumber) {
        return res.status(400).json({ error: "Complete bank transfer details are required" });
      }

      const request = await storage.createTopUpRequest({
        adminUserId,
        amount: amount.toString(),
        paymentMethod: 'bank_transfer',
        bankTransferDetails: JSON.stringify(bankTransferDetails),
        paymentProof,
        status: 'pending',
      });

      res.json({ 
        success: true, 
        requestId: request.id,
        message: "Bank transfer request submitted. Admin will verify payment proof and approve within 24 hours."
      });
    } catch (error) {
      console.error("Error creating bank transfer request:", error);
      res.status(500).json({ error: "Failed to submit bank transfer request" });
    }
  });

  app.post('/api/topup/cash-deposit', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount, paymentProof } = req.body;

      console.log('Cash deposit request:', { adminUserId, amount, paymentProofLength: paymentProof?.length });

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 10000) {
        return res.status(400).json({ error: "Invalid amount (minimum IDR 10,000)" });
      }

      if (!paymentProof || paymentProof.trim().length < 10) {
        return res.status(400).json({ error: "Photo proof of cash deposit receipt is required" });
      }

      const requestData = {
        adminUserId,
        amount: amount.toString(),
        paymentMethod: 'cash_deposit',
        paymentProof,
        status: 'pending',
      };

      console.log('Creating top-up request with data:', requestData);
      const request = await storage.createTopUpRequest(requestData);
      console.log('Top-up request created successfully:', request.id);

      res.json({ 
        success: true, 
        requestId: request.id,
        message: "Cash deposit request submitted. Admin will verify payment proof and approve within 24 hours."
      });
    } catch (error) {
      console.error("Error creating cash deposit request:", error);
      res.status(500).json({ error: "Failed to submit cash deposit request" });
    }
  });

  // Get user's top-up requests
  app.get('/api/topup/requests', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const requests = await storage.getTopUpRequestsByUserId(adminUserId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching top-up requests:", error);
      res.status(500).json({ error: "Failed to fetch top-up requests" });
    }
  });

  // Get user's payment transactions
  app.get('/api/payment/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const transactions = await storage.getPaymentTransactionsByUserId(adminUserId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching payment transactions:", error);
      res.status(500).json({ error: "Failed to fetch payment transactions" });
    }
  });

  // Admin routes for managing top-up requests
  app.get('/api/admin/topup-requests', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(adminUserId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const requests = await storage.getAllTopUpRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching all top-up requests:", error);
      res.status(500).json({ error: "Failed to fetch top-up requests" });
    }
  });

  app.put('/api/admin/topup-requests/:requestId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(adminUserId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { requestId } = req.params;
      const { status, adminNotes } = req.body;

      await storage.updateTopUpRequestStatus(
        parseInt(requestId),
        status,
        adminUserId,
        adminNotes
      );

      res.json({ success: true, message: "Top-up request updated successfully" });
    } catch (error) {
      console.error("Error updating top-up request:", error);
      res.status(500).json({ error: "Failed to update top-up request" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const user = await storage.getUser(adminUserId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Temporary test route to bypass auth issues
  app.get('/api/test-login/:adminUserId', async (req, res) => {
    try {
      const adminUserId = req.params.adminUserId;
      const user = await storage.getUser(adminUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error in test login:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Note: In a real implementation, you would verify the current password against the stored hash
      // For this demo, we'll simulate password change success
      // In production, you would:
      // 1. Hash and compare currentPassword with stored password hash
      // 2. Hash the newPassword and store it
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.put('/api/auth/notification-settings', isAuthenticated, async (req: any, res) => {
    try {
      const { emailNotifications, smsNotifications } = req.body;
      
      // In a real implementation, you would save these preferences to the database
      // For this demo, we'll simulate successful save
      res.json({ message: "Notification settings saved successfully" });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      res.status(500).json({ message: "Failed to save notification settings" });
    }
  });

  app.post('/api/admin/users/:adminUserId/change-password', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Note: In a real implementation, you would hash the password and store it
      // For this demo, we'll simulate successful password change
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing user password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Promotion banner management routes
  app.get('/api/admin/banners', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const banners = await storage.getAllPromotionBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  app.post('/api/admin/banners', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const banner = await storage.createPromotionBanner(req.body);
      res.json(banner);
    } catch (error) {
      console.error("Error creating banner:", error);
      res.status(500).json({ message: "Failed to create banner" });
    }
  });

  app.put('/api/admin/banners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updatePromotionBanner(parseInt(req.params.id), req.body);
      res.json({ message: "Banner updated successfully" });
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  app.delete('/api/admin/banners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deletePromotionBanner(parseInt(req.params.id));
      res.json({ message: "Banner deleted successfully" });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  // Appointment events management routes
  // Public endpoint for active appointment events (for booking system)
  app.get('/api/appointment-events', async (req, res) => {
    try {
      const events = await storage.getAllAppointmentEvents();
      // Only return active events for public booking
      const activeEvents = events.filter(event => event.isActive);
      res.json(activeEvents);
    } catch (error) {
      console.error("Error fetching appointment events:", error);
      res.status(500).json({ message: "Failed to fetch appointment events" });
    }
  });

  app.get('/api/admin/appointment-events', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const events = await storage.getAllAppointmentEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching appointment events:", error);
      res.status(500).json({ message: "Failed to fetch appointment events" });
    }
  });

  app.post('/api/admin/appointment-events', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const event = await storage.createAppointmentEvent(req.body);
      res.json(event);
    } catch (error) {
      console.error("Error creating appointment event:", error);
      res.status(500).json({ message: "Failed to create appointment event" });
    }
  });

  app.put('/api/admin/appointment-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updateAppointmentEvent(parseInt(req.params.id), req.body);
      res.json({ message: "Appointment event updated successfully" });
    } catch (error) {
      console.error("Error updating appointment event:", error);
      res.status(500).json({ message: "Failed to update appointment event" });
    }
  });

  app.delete('/api/admin/appointment-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteAppointmentEvent(parseInt(req.params.id));
      res.json({ message: "Appointment event deleted successfully" });
    } catch (error) {
      console.error("Error deleting appointment event:", error);
      res.status(500).json({ message: "Failed to delete appointment event" });
    }
  });

  // Reward items management routes
  app.get('/api/admin/reward-items', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const items = await storage.getAllRewardItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching reward items:", error);
      res.status(500).json({ message: "Failed to fetch reward items" });
    }
  });

  app.post('/api/admin/reward-items', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const item = await storage.createRewardItem(req.body);
      res.json(item);
    } catch (error) {
      console.error("Error creating reward item:", error);
      res.status(500).json({ message: "Failed to create reward item" });
    }
  });

  app.put('/api/admin/reward-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.updateRewardItem(parseInt(req.params.id), req.body);
      res.json({ message: "Reward item updated successfully" });
    } catch (error) {
      console.error("Error updating reward item:", error);
      res.status(500).json({ message: "Failed to update reward item" });
    }
  });

  app.delete('/api/admin/reward-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteRewardItem(parseInt(req.params.id));
      res.json({ message: "Reward item deleted successfully" });
    } catch (error) {
      console.error("Error deleting reward item:", error);
      res.status(500).json({ message: "Failed to delete reward item" });
    }
  });

  app.put('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { firstName, lastName, phoneNumber, gender, dateOfBirth } = req.body;
      
      await storage.updateUserProfile(adminUserId, {
        firstName,
        lastName,
        phoneNumber,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      });
      
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // User routes
  app.get('/api/users/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const referrals = await storage.getReferralsByUserId(adminUserId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/users/referral-earnings', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const earnings = await storage.calculateReferralEarnings(adminUserId);
      res.json({ earnings });
    } catch (error) {
      console.error("Error calculating referral earnings:", error);
      res.status(500).json({ message: "Failed to calculate referral earnings" });
    }
  });

  app.get('/api/users/genealogy-tree', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub || req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      console.log(`*** GENEALOGY DEBUG: Building tree for user ${adminUserId}`);
      const genealogyTree = await storage.buildReferralGenealogyTree(adminUserId);
      console.log(`*** GENEALOGY DEBUG: Result for ${adminUserId}:`, JSON.stringify(genealogyTree, null, 2));
      res.json(genealogyTree);
    } catch (error) {
      console.error("Error building genealogy tree:", error);
      res.status(500).json({ message: "Failed to build genealogy tree" });
    }
  });

  app.post('/api/users/apply-referral', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { referralCode } = req.body;
      
      // Find referrer by code
      const allUsers = await storage.getAllUsers();
      const referrer = allUsers.find(u => u.referralCode === referralCode);
      
      if (!referrer) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      if (referrer.id === adminUserId) {
        return res.status(400).json({ message: "Cannot refer yourself" });
      }
      
      // Check if user already has a referrer
      const user = await storage.getUser(adminUserId);
      if (user?.referredById) {
        return res.status(400).json({ message: "You already have a referrer" });
      }
      
      // Create referral relationship
      await storage.createReferralRelationship(referrer.id, adminUserId);
      
      res.json({ message: "Referral code applied successfully" });
    } catch (error) {
      console.error("Error applying referral code:", error);
      res.status(500).json({ message: "Failed to apply referral code" });
    }
  });

  // Appointment routes
  app.post('/api/appointments', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const validatedData = {
        ...req.body,
        userId,
        appointmentDate: new Date(req.body.appointmentDate),
        status: 'pending' // New appointments require admin confirmation
      };
      
      const appointment = await storage.createAppointment(validatedData);
      
      // Broadcast appointment creation to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'appointment_created',
            data: appointment
          }));
        }
      });
      
      // Get user details for email
      const user = await storage.getUser(userId);
      if (user && user.email) {
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Customer';
        
        // Send confirmation email
        try {
          await sendAppointmentConfirmationEmail(
            user.email,
            userName,
            appointment.title,
            appointment.appointmentDate,
            appointment.duration
          );
          console.log(`Confirmation email sent to ${user.email} for appointment: ${appointment.title}`);
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the appointment creation if email fails
        }
      }
      
      // Appointment created successfully
      
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.get('/api/appointments', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      
      let appointments;
      if (user?.role === 'admin') {
        appointments = await storage.getAllAppointments();
      } else {
        appointments = await storage.getAppointmentsByUserId(userId);
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Check appointment availability for a specific date and service
  app.get('/api/appointments/availability', async (req, res) => {
    try {
      const { date, service } = req.query;
      
      if (!date || !service) {
        return res.status(400).json({ message: "Date and service are required" });
      }

      // Get all appointments for the specified date
      const allAppointments = await storage.getAllAppointments();
      
      // Filter appointments for the same date and service that are not cancelled
      const conflictingAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        const requestDate = new Date(date as string).toISOString().split('T')[0];
        
        return aptDate === requestDate && 
               apt.title === service && 
               apt.status !== 'cancelled';
      });

      // Extract the booked time slots
      const bookedTimes = conflictingAppointments.map(apt => {
        const aptTime = new Date(apt.appointmentDate);
        return aptTime.getHours().toString().padStart(2, '0') + ':' + 
               aptTime.getMinutes().toString().padStart(2, '0');
      });

      res.json({ bookedTimes });
    } catch (error) {
      console.error("Error checking appointment availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Update appointment (reschedule)
  app.put('/api/appointments/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const appointmentId = parseInt(req.params.id);
      const { appointmentDate } = req.body;
      
      // Get appointment details before updating
      const appointments = await storage.getAppointmentsByUserId(userId);
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      const oldDate = appointment.appointmentDate;
      const newDate = new Date(appointmentDate);
      
      const updatedAppointment = await storage.updateAppointmentDate(appointmentId, newDate);
      
      // Set status to pending for admin reconfirmation
      await storage.updateAppointmentStatus(appointmentId, 'pending');
      
      // Broadcast appointment update to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'appointment_updated',
            data: { ...updatedAppointment, status: 'pending' }
          }));
        }
      });
      
      // Send reschedule email
      const user = await storage.getUser(userId);
      if (user && user.email) {
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Customer';
        
        try {
          await sendAppointmentRescheduleEmail(
            user.email,
            userName,
            appointment.title,
            oldDate,
            newDate,
            appointment.duration
          );
          console.log(`Reschedule email sent to ${user.email} for appointment: ${appointment.title}`);
        } catch (emailError) {
          console.error('Failed to send reschedule email:', emailError);
          // Don't fail the reschedule if email fails
        }
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Cancel/delete appointment
  app.put('/api/appointments/:id/status', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const appointmentId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Get appointment details before updating
      const appointments = await storage.getAppointmentsByUserId(userId);
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      await storage.updateAppointmentStatus(appointmentId, status);
      
      // Broadcast appointment status change to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'appointment_status_changed',
            data: { ...appointment, status }
          }));
        }
      });
      
      // Send cancellation email if status is cancelled
      if (status === 'cancelled') {
        const user = await storage.getUser(userId);
        if (user && user.email) {
          const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Customer';
          
          try {
            await sendAppointmentCancellationEmail(
              user.email,
              userName,
              appointment.title,
              appointment.appointmentDate
            );
            console.log(`Cancellation email sent to ${user.email} for appointment: ${appointment.title}`);
          } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const transactions = await storage.getTransactionsByUserId(adminUserId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions/top-up', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount } = req.body;
      
      // Validate amount
      const validAmount = z.string().regex(/^\d+\.?\d{0,2}$/).parse(amount);
      
      // Create transaction record
      await storage.createTransaction({
        adminUserId,
        type: "credit_purchase",
        amount: validAmount,
        description: "Credit top-up",
        pointsEarned: Math.floor(Number(validAmount) * 0.05), // 5% points
      });
      
      // Update user credits and points
      await storage.updateUserCredits(adminUserId, validAmount);
      await storage.updateUserPoints(adminUserId, Math.floor(Number(validAmount) * 0.05));
      
      // Broadcast credit update to all connected clients
      // Credits updated successfully
      
      res.json({ message: "Credits added successfully" });
    } catch (error) {
      console.error("Error processing top-up:", error);
      res.status(500).json({ message: "Failed to process top-up" });
    }
  });

  // Toy routes
  app.get('/api/toys', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const toys = await storage.getToysByOwnerId(userId);
      console.log("*** TOYS DEBUG: User", userId, "has toys:", toys.length);
      if (toys.length > 0) {
        console.log("*** FIRST TOY:", JSON.stringify(toys[0], null, 2));
      }
      res.json(toys);
    } catch (error) {
      console.error("Error fetching toys:", error);
      res.status(500).json({ message: "Failed to fetch toys" });
    }
  });

  app.get('/api/toys/all', isAuthenticated, async (req: any, res) => {
    try {
      // Return all toys from all users for marketplace visibility
      const allToys = await storage.getAllToys();
      res.json(allToys);
    } catch (error) {
      console.error("Error fetching all toys:", error);
      res.status(500).json({ message: "Failed to fetch all toys" });
    }
  });

  app.post('/api/toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const validatedData = insertToySchema.parse({
        ...req.body,
        ownerId: adminUserId,
      });
      
      const toy = await storage.createToy(validatedData);
      res.json(toy);
    } catch (error: any) {
      console.error("Error creating toy:", error);
      
      // Handle specific database constraint errors
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return res.status(400).json({ 
          message: "QR code already exists. Please use a different QR code." 
        });
      }
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid toy data provided.",
          details: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create toy" });
    }
  });

  app.get('/api/toys/qr/:qrCode', isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode } = req.params;
      const toy = await storage.getToyByQrCode(qrCode);
      
      if (!toy) {
        return res.status(404).json({ message: "Toy not found" });
      }
      
      res.json(toy);
    } catch (error) {
      console.error("Error fetching toy by QR code:", error);
      res.status(500).json({ message: "Failed to fetch toy" });
    }
  });

  app.put('/api/toys/:toyId/owner', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { toyId } = req.params;
      
      await storage.updateToyOwner(parseInt(toyId), adminUserId);
      res.json({ message: "Toy ownership updated successfully" });
    } catch (error) {
      console.error("Error updating toy owner:", error);
      res.status(500).json({ message: "Failed to update toy owner" });
    }
  });

  // Marketplace listing routes
  app.get('/api/listings', async (req: any, res) => {
    try {
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.post('/api/listings', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const validatedData = insertListingSchema.parse({
        ...req.body,
        sellerId: adminUserId,
      });
      
      // Check for existing ACTIVE listing of the same toy by the same seller
      const existingListings = await storage.getAllListings();
      const duplicateListing = existingListings.find((listing: any) => 
        listing.toyId === validatedData.toyId && 
        listing.sellerId === adminUserId &&
        listing.status === 'active'
      );

      if (duplicateListing) {
        return res.status(400).json({ message: "This toy is already listed in the marketplace" });
      }
      
      const listing = await storage.createListing(validatedData);
      res.json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.put('/api/listings/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updateListingStatus(parseInt(id), status);
      res.json({ message: "Listing status updated successfully" });
    } catch (error) {
      console.error("Error updating listing status:", error);
      res.status(500).json({ message: "Failed to update listing status" });
    }
  });

  app.put('/api/listings/:listingId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { listingId } = req.params;
      const { status } = req.body;
      
      await storage.updateListingStatus(parseInt(listingId), status);
      res.json({ message: "Listing status updated successfully" });
    } catch (error) {
      console.error("Error updating listing status:", error);
      res.status(500).json({ message: "Failed to update listing status" });
    }
  });

  // Delete listing route for cancel sale functionality
  app.delete('/api/listings/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const listingId = parseInt(id);
      
      // First, check if there are any pending purchases for this listing
      const pendingPurchases = await storage.getPendingPurchasesByListingId(listingId);
      
      // Cancel any pending purchases and refund credits
      for (const purchase of pendingPurchases) {
        if (purchase.status === 'pending_seller_confirmation') {
          // Refund credits to buyer
          const currentUser = await storage.getUser(purchase.buyerId);
          if (currentUser) {
            const currentCredits = parseFloat(currentUser.credits || '0');
            const refundAmount = parseFloat(purchase.amount);
            const newCredits = (currentCredits + refundAmount).toFixed(2);
            await storage.updateUserCredits(purchase.buyerId, newCredits);
            
            // Create credit history for refund
            await storage.createCreditHistory({
              adminUserId: purchase.buyerId,
              amount: refundAmount.toFixed(2),
              type: 'refund',
              description: `Refund for cancelled listing: ${purchase.toy?.name || 'Toy'}`
            });
          }
          
          // Cancel the pending purchase
          await storage.cancelPendingPurchase(purchase.id);
        }
      }
      
      // Cancel the listing
      await storage.updateListingStatus(listingId, 'cancelled');
      res.json({ message: "Listing cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling listing:", error);
      res.status(500).json({ message: "Failed to cancel listing" });
    }
  });

  // Get available toys for purchase (not yet purchased)
  app.get("/api/toys/available", async (req, res) => {
    try {
      const toys = await storage.getAvailableToysForPurchase();
      res.json(toys);
    } catch (error) {
      console.error("Error fetching available toys:", error);
      res.status(500).json({ message: "Failed to fetch available toys" });
    }
  });

  // Purchase a toy
  app.post("/api/toys/:toyId/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const toyId = parseInt(req.params.toyId);
      const adminUserId = req.user.claims.sub;
      
      await storage.purchaseToy(toyId, adminUserId);
      res.json({ message: "Toy purchased successfully" });
    } catch (error) {
      console.error("Error purchasing toy:", error);
      res.status(500).json({ message: "Failed to purchase toy" });
    }
  });

  // Activate toy with QR code (replaces the old scan functionality)
  app.post('/api/toys/scan', requireAuth, async (req: any, res) => {
    console.log("=== QR SCAN REQUEST ===");
    console.log("Body:", req.body);
    console.log("User ID:", getUserId(req));
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { qrCode } = req.body;
      
      if (!qrCode || qrCode.trim() === '') {
        console.log("ERROR: QR code missing");
        return res.status(400).json({ message: "QR code is required" });
      }
      
      console.log("Calling activateToyByQrCode with:", qrCode.trim(), userId);
      const activatedToy = await storage.activateToyByQrCode(qrCode.trim(), userId);
      
      if (!activatedToy) {
        console.log("ERROR: No toy returned");
        return res.status(400).json({ message: "Failed to activate toy" });
      }

      console.log("SUCCESS: Toy activated:", activatedToy);
      res.json({ 
        message: "Toy activated successfully!", 
        toy: activatedToy 
      });
    } catch (error: any) {
      console.log("ERROR in QR scan:", error.message);
      console.log("Full error:", error);
      
      if (error.message.includes("Invalid QR code") || error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("already own") || error.message.includes("owned by someone else")) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(400).json({ message: error.message || "Failed to activate toy" });
    }
  });

  // Pet creation endpoint for activated toys
  app.post('/api/toys/activate', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { qrCode } = req.body;
      
      if (!qrCode || qrCode.trim() === '') {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      // Get the toy by QR code
      const toy = await storage.getToyByQrCode(qrCode.trim());
      if (!toy) {
        return res.status(404).json({ message: "Toy not found" });
      }
      
      // Check if toy is owned by user and activated
      if (toy.ownerId !== adminUserId) {
        return res.status(403).json({ message: "You don't own this toy" });
      }
      
      if (!toy.isActivated) {
        return res.status(400).json({ message: "Toy must be activated first" });
      }
      
      // Check if pet already exists for this toy
      const existingPets = await storage.getPetsByUserId(adminUserId);
      if (existingPets.some(pet => pet.toyId === toy.id)) {
        return res.status(409).json({ message: "Pet already exists for this toy" });
      }
      
      // Create pet from the toy with proper initialization
      const now = new Date();
      const newPet = await storage.createPet({
        adminUserId,
        toyId: toy.id,
        name: toy.name,
        species: 'Doluruu',
        happiness: 100,
        hunger: 100,
        cleanliness: 100,
        energy: 100,
        currentAge: 0,
        growthStage: 'baby',
        birthDate: now,
        lastCareDate: now, // Initialize to prevent stat calculation bugs
        isActive: true
      });

      res.json({ 
        message: "Pet created successfully!", 
        pet: newPet 
      });
    } catch (error: any) {
      console.error("Error creating pet:", error);
      res.status(500).json({ message: error.message || "Failed to create pet" });
    }
  });

  // This route moved to avoid conflicts - see line 1548

  // CONFLICTING ROUTE REMOVED - Pet care activity moved to /api/pets/:petId/care/:careType
  /*
  // REMOVED: Conflicting care endpoint that was causing stat calculation issues
  */

  // Pet sleep management
  app.post('/api/pets/:petId/sleep', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      // Start sleep - only if energy is below 100%
      const currentEnergy = pet.energy ?? 50;
      if (currentEnergy < 100) {
        const now = new Date();
        await storage.updatePetStats(petId, { 
          isSleeping: true, 
          sleepStartTime: now,
          lastEnergyUpdate: now // Initialize energy update tracker to prevent immediate energy gain
        });
        
        await storage.createCareActivity({
          petId,
          userId: adminUserId,
          activityType: 'sleep',
          completedAt: new Date(),
          pointsEarned: 0
        });

        res.json({ message: "Pet is now sleeping", isSleeping: true });
      } else {
        res.status(400).json({ message: "Pet is already fully energized" });
      }
    } catch (error) {
      console.error("Error starting pet sleep:", error);
      res.status(500).json({ message: "Failed to start pet sleep" });
    }
  });

  // Daily token check - award token if all stats stayed above 1% for 24 hours
  app.post('/api/pets/:petId/check-daily-token', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      // Check if 24 hours have passed since last token claim or pet creation
      const now = new Date();
      const lastTokenClaim = pet.lastTokenClaim || pet.createdAt;
      const timeSinceLastClaim = now.getTime() - new Date(lastTokenClaim).getTime();
      const hoursElapsed = timeSinceLastClaim / (1000 * 60 * 60);

      if (hoursElapsed < 24) {
        return res.json({ 
          eligible: false, 
          message: `Need to wait ${Math.ceil(24 - hoursElapsed)} more hours`,
          hoursRemaining: Math.ceil(24 - hoursElapsed)
        });
      }

      // Check if all stats have stayed above 1% during the 24-hour period
      const currentStats = {
        happiness: pet.happiness || 0,
        hunger: pet.hunger || 0,
        cleanliness: pet.cleanliness || 0,
        energy: pet.energy || 0
      };

      const allStatsAboveThreshold = Object.values(currentStats).every(stat => stat > 1);

      if (allStatsAboveThreshold) {
        // TEMPORARILY DISABLED: Award token to prevent race conditions with pet name edits
        console.log(`Daily token award disabled temporarily for Pet ${petId}, User ${adminUserId}`);
        
        res.json({ 
          eligible: true, 
          tokenAwarded: false, 
          message: "Daily token system temporarily disabled to prevent conflicts",
          statsOk: true
        });
      } else {
        // No token awarded - stats dropped too low
        await storage.updatePetStats(petId, { lastTokenClaim: now });
        
        res.json({ 
          eligible: true, 
          tokenAwarded: false, 
          message: "No token awarded - pet stats dropped below 1%",
          failedStats: Object.entries(currentStats)
            .filter(([_, value]) => value <= 1)
            .map(([key, _]) => key)
        });
      }
    } catch (error) {
      console.error("Error checking daily token:", error);
      res.status(500).json({ message: "Failed to check daily token" });
    }
  });

  // Activate toy as pet endpoint
  app.post('/api/toys/:toyId/activate-as-pet', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const toyId = parseInt(req.params.toyId);
      
      // Get the toy
      const toy = await storage.getToy(toyId);
      if (!toy) {
        return res.status(404).json({ message: "Toy not found" });
      }
      
      // Check if toy is owned by user
      if (toy.ownerId !== userId) {
        return res.status(403).json({ message: "You don't own this toy" });
      }
      
      // Check if toy is already activated as a pet
      const existingPets = await storage.getPetsByUserId(userId);
      const existingPet = existingPets.find(pet => pet.toyId === toyId);
      if (existingPet) {
        // Pet already exists, just update toy activation status and return success
        console.log('*** PET ALREADY EXISTS, UPDATING TOY ACTIVATION STATUS:', toyId);
        await storage.updateToy(toyId, { isActivated: true });
        console.log('*** TOY ACTIVATION STATUS UPDATED FOR EXISTING PET');
        return res.json({ 
          message: "Pet already activated for this toy!", 
          pet: existingPet 
        });
      }
      
      // Create pet from the toy
      const newPet = await storage.createPet({
        userId,
        toyId: toyId,
        name: toy.name,
        species: toy.species || 'Doluruu',
        type: 'virtual', // Required field for pet type
        gender: toy.gender || 'male',
        happiness: 100,
        hunger: 100,
        cleanliness: 100,
        energy: 100,
        currentAge: 0,
        growthStage: 'baby',
        evolutionPoints: 0,
        isSleeping: false,
        birthDate: new Date(),
        lastCareDate: new Date(),
        lastFeedTime: new Date(),
        lastCleanTime: new Date(),
        lastPlayTime: new Date(),
        sleepStartTime: null,
        lastEnergyUpdate: new Date()
      });
      
      // Update toy activation status
      console.log('*** UPDATING TOY ACTIVATION STATUS:', toyId);
      await storage.updateToy(toyId, { isActivated: true });
      console.log('*** TOY ACTIVATION STATUS UPDATED');
      
      res.json({ 
        message: "Toy activated as pet successfully!", 
        pet: newPet 
      });
    } catch (error) {
      console.error('Error activating toy as pet:', error);
      res.status(500).json({ message: 'Failed to activate toy as pet' });
    }
  });

  // Pet name change - spend 5 tokens to change pet name
  app.patch('/api/pets/:petId/name', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { name } = req.body;
      
      console.log(`Pet name edit request: adminUserId=${adminUserId}, petId=${petId}, newName=${name}`);
      
      // Validate new name
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Pet name cannot be empty" });
      }
      
      if (name.trim().length > 50) {
        return res.status(400).json({ message: "Pet name cannot be longer than 50 characters" });
      }
      
      // Get user's current token balance
      const user = await storage.getUser(adminUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentTokens = user.tokens || 0;
      console.log(`Current user tokens: ${currentTokens}`);
      
      if (currentTokens < 5) {
        return res.status(400).json({ 
          message: "Not enough tokens! You need 5 tokens to change pet name.",
          insufficientTokens: true
        });
      }
      
      // Get pet to verify ownership
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      console.log(`About to deduct 5 tokens: ${currentTokens} -> ${currentTokens - 5}`);
      
      // Use database transaction to prevent race conditions
      try {
        await db.transaction(async (tx) => {
          // Update pet name first
          await tx.update(pets).set({ name: name.trim() }).where(eq(pets.id, petId));
          
          // Deduct exactly 5 tokens with explicit calculation
          const newTokenCount = currentTokens - 5;
          await tx.update(users).set({ tokens: newTokenCount }).where(eq(users.id, adminUserId));
          
          // Record the token transaction in the dedicated token_transactions table
          await tx.insert(tokenTransactions).values({
            adminUserId,
            tokens: -5,
            type: 'spent',
            description: `Pet name changed to "${name.trim()}" (Cost: 5 tokens)`,
            relatedId: petId,
            status: 'completed'
          });
        });
        
        console.log(`Pet name edit transaction completed - tokens: ${currentTokens} -> ${currentTokens - 5}`);
      } catch (transactionError) {
        console.error("Transaction failed:", transactionError);
        throw new Error("Failed to process pet name change transaction");
      }
      
      res.json({ 
        message: "Pet name updated successfully",
        newName: name.trim(),
        tokensRemaining: currentTokens - 5
      });
    } catch (error) {
      console.error("Error updating pet name:", error);
      res.status(500).json({ message: "Failed to update pet name" });
    }
  });

  // Energy potion - spend 2 tokens to restore energy to 100%
  app.post('/api/pets/:petId/energy-potion', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      // Get user's current token balance
      const user = await storage.getUser(adminUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentTokens = user.tokens || 0;
      if (currentTokens < 2) {
        return res.status(400).json({ 
          message: "Not enough tokens! You need 2 tokens to use an energy potion.",
          insufficientTokens: true
        });
      }
      
      // Get pet to verify ownership
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      // Check if pet already has full energy
      const currentEnergy = pet.energy ?? 50;
      if (currentEnergy >= 100) {
        return res.status(400).json({ 
          message: "Pet already has full energy!",
          alreadyFullEnergy: true
        });
      }
      
      // Deduct 2 tokens and restore energy to 100%
      await storage.deductUserTokens(adminUserId, 2);
      await storage.updatePetStats(petId, { 
        energy: 100,
        isSleeping: false, // Wake up the pet
        sleepStartTime: null 
      });
      
      // Create activity record
      await storage.createCareActivity({
        petId,
        adminUserId,
        activityType: 'energy_potion',
        completedAt: new Date(),
        pointsEarned: 0
      });
      
      res.json({ 
        message: "Energy potion used! Pet energy restored to 100%", 
        newTokenBalance: currentTokens - 2,
        newEnergy: 100
      });
    } catch (error) {
      console.error("Error using energy potion:", error);
      res.status(500).json({ message: "Failed to use energy potion" });
    }
  });

  // Pet evolution routes
  app.get('/api/pets/:petId/evolution-image', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      // Get pet to verify ownership and get current growth stage
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      // Get evolution image for current growth stage
      const evolutionImage = await storage.getPetEvolutionImage(pet.species || 'Doluruu', pet.growthStage || 'baby');
      
      res.json({
        petId: pet.id,
        species: pet.species,
        growthStage: pet.growthStage,
        evolutionPoints: pet.evolutionPoints || 0,
        imageUrl: evolutionImage?.imageUrl || '/attached_assets/Doluruu Baby_1749663725243.png',
        nextEvolutionAt: getNextEvolutionThreshold(pet.growthStage || 'baby')
      });
    } catch (error) {
      console.error("Error fetching pet evolution image:", error);
      res.status(500).json({ message: "Failed to fetch pet evolution image" });
    }
  });

  // Check if pet can evolve
  app.post('/api/pets/:petId/check-evolution', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      const currentStage = pet.growthStage || 'baby';
      const evolutionPoints = pet.evolutionPoints || 0;
      const requiredPoints = getNextEvolutionThreshold(currentStage);
      
      const canEvolve = evolutionPoints >= requiredPoints && currentStage !== 'elder';
      const nextStage = getNextGrowthStage(currentStage);
      
      res.json({
        canEvolve,
        currentStage,
        nextStage,
        evolutionPoints,
        requiredPoints,
        pointsNeeded: Math.max(0, requiredPoints - evolutionPoints)
      });
    } catch (error) {
      console.error("Error checking pet evolution:", error);
      res.status(500).json({ message: "Failed to check pet evolution" });
    }
  });

  // Evolve pet to next stage
  app.post('/api/pets/:petId/evolve', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      const currentStage = pet.growthStage || 'baby';
      const evolutionPoints = pet.evolutionPoints || 0;
      const requiredPoints = getNextEvolutionThreshold(currentStage);
      
      if (evolutionPoints < requiredPoints) {
        return res.status(400).json({ 
          message: `Not enough evolution points! Need ${requiredPoints}, have ${evolutionPoints}`,
          pointsNeeded: requiredPoints - evolutionPoints
        });
      }
      
      if (currentStage === 'elder') {
        return res.status(400).json({ message: "Pet is already at maximum evolution stage" });
      }
      
      const nextStage = getNextGrowthStage(currentStage);
      
      // Update pet to next growth stage
      await storage.updatePetStats(petId, {
        growthStage: nextStage,
        evolutionPoints: 0 // Reset evolution points for next stage
      });
      
      // Award evolution bonus tokens
      await storage.addUserTokens(adminUserId, 5);
      
      // Create evolution activity record
      await storage.createCareActivity({
        petId,
        adminUserId,
        activityType: 'evolution',
        completedAt: new Date(),
        pointsEarned: 0
      });
      
      res.json({
        message: `Pet evolved to ${nextStage} stage!`,
        newStage: nextStage,
        bonusTokens: 5
      });
    } catch (error) {
      console.error("Error evolving pet:", error);
      res.status(500).json({ message: "Failed to evolve pet" });
    }
  });

  // Get sleep progress - calculates energy gained during sleep
  app.get('/api/pets/:petId/sleep-progress', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }
      
      if (!pet.isSleeping || !pet.sleepStartTime) {
        return res.json({
          isSleeping: false,
          energyGained: 0,
          nextEnergyIn: 0,
          totalSleepTime: 0
        });
      }
      
      const now = new Date();
      const sleepStart = new Date(pet.sleepStartTime);
      const totalSleepMinutes = Math.floor((now.getTime() - sleepStart.getTime()) / (1000 * 60));
      
      // Track when energy was last added using lastEnergyUpdate field
      const lastEnergyUpdate = pet.lastEnergyUpdate ? new Date(pet.lastEnergyUpdate) : sleepStart;
      const minutesSinceLastEnergyUpdate = Math.floor((now.getTime() - lastEnergyUpdate.getTime()) / (1000 * 60));
      
      // Only add energy if 1 minute have passed since last energy update (faster energy gain)
      const energyToAdd = Math.floor(minutesSinceLastEnergyUpdate / 1);
      const currentEnergy = pet.energy || 0;
      const newEnergy = Math.min(100, currentEnergy + energyToAdd);
      
      // Calculate time until next energy boost
      const minutesSinceLastInterval = minutesSinceLastEnergyUpdate % 1;
      const nextEnergyIn = energyToAdd > 0 ? 1 : (1 - minutesSinceLastInterval);
      
      // Calculate stat decay - DO NOT restore stats, only apply decay to current values
      const timeSinceLastCare = pet.lastCareDate ? 
        Math.floor((now.getTime() - new Date(pet.lastCareDate).getTime()) / (1000 * 60)) : 0;
      
      const decayAmount = Math.floor(timeSinceLastCare / 3); // 1% every 3 minutes
      const currentHunger = pet.hunger ?? 0;  // Use actual current value, don't default to 100
      const currentCleanliness = pet.cleanliness ?? 0;  // Use actual current value
      const currentHappiness = pet.happiness ?? 0;  // Use actual current value
      
      const newHunger = Math.max(0, currentHunger - decayAmount);
      const newCleanliness = Math.max(0, currentCleanliness - decayAmount);
      
      // Calculate happiness decay (2% every 30 minutes)
      const happinessDecayAmount = Math.floor(timeSinceLastCare / 30) * 2;
      const newHappiness = Math.max(0, currentHappiness - happinessDecayAmount);
      
      // Sleep provides no token rewards - only the 24-hour system awards tokens
      
      // Update energy only if any was actually gained, and track when it was updated
      const updates: any = {};
      if (energyToAdd > 0) {
        updates.energy = newEnergy;
        updates.lastEnergyUpdate = now; // Track when energy was last updated
      }
      if (decayAmount > 0 || happinessDecayAmount > 0) {
        updates.hunger = newHunger;
        updates.cleanliness = newCleanliness;
        updates.happiness = newHappiness;
        updates.lastCareDate = now; // Update last care time when decay is applied
      }
      
      // Auto-wake pet when energy reaches 100%
      const finalEnergy = energyToAdd > 0 ? newEnergy : pet.energy;
      if (finalEnergy >= 100) {
        updates.isSleeping = false;
        updates.sleepStartTime = null;
        console.log(`Pet ${petId} automatically woke up - energy reached 100%`);
      }
      
      if (Object.keys(updates).length > 0) {
        await storage.updatePetStats(petId, updates);
      }
      
      // If pet was auto-woken, return different response
      if (finalEnergy >= 100 && updates.isSleeping === false) {
        res.json({
          isSleeping: false,
          currentEnergy: finalEnergy,
          currentHunger: newHunger,
          currentCleanliness: newCleanliness,
          currentHappiness: newHappiness,
          energyGained: energyToAdd,
          nextEnergyIn: 0,
          totalSleepTime: totalSleepMinutes,
          maxEnergy: true,
          autoWoken: true,
          message: "Pet automatically woke up - energy is full!"
        });
      } else {
        res.json({
          isSleeping: true,
          currentEnergy: finalEnergy,
          currentHunger: newHunger,
          currentCleanliness: newCleanliness,
          currentHappiness: newHappiness,
          energyGained: energyToAdd,
          nextEnergyIn,
          totalSleepTime: totalSleepMinutes,
          maxEnergy: finalEnergy >= 100
        });
      }
    } catch (error) {
      console.error("Error getting sleep progress:", error);
      res.status(500).json({ message: "Failed to get sleep progress" });
    }
  });

  // Auto decay system - reduce hunger and cleanliness by 1% every 3 minutes, happiness drops when other stats drop
  app.post('/api/pets/:petId/auto-decay', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      const now = new Date();
      const lastDecayTime = pet.lastDecayTime ? new Date(pet.lastDecayTime) : new Date(pet.createdAt || now);
      const minutesSinceLastDecay = Math.floor((now.getTime() - lastDecayTime.getTime()) / (1000 * 60));
      
      // Calculate decay intervals (every 3 minutes)
      const decayIntervals = Math.floor(minutesSinceLastDecay / 3);
      
      if (decayIntervals === 0) {
        return res.json({
          success: true,
          message: "No decay needed yet",
          minutesUntilNextDecay: 3 - (minutesSinceLastDecay % 3)
        });
      }

      // Apply decay to hunger and cleanliness (1% per 3-minute interval)
      const currentHunger = pet.hunger || 100;
      const currentCleanliness = pet.cleanliness || 100;
      const currentHappiness = pet.happiness || 100;
      
      const newHunger = Math.max(0, currentHunger - decayIntervals);
      const newCleanliness = Math.max(0, currentCleanliness - decayIntervals);
      
      // Happiness drops when hunger or cleanliness drops
      const hungerDrop = currentHunger - newHunger;
      const cleanlinessDrop = currentCleanliness - newCleanliness;
      const totalStatDrop = hungerDrop + cleanlinessDrop;
      const newHappiness = Math.max(0, currentHappiness - totalStatDrop);

      await storage.updatePetStats(petId, {
        hunger: newHunger,
        cleanliness: newCleanliness,
        happiness: newHappiness,
        lastDecayTime: now
      });

      res.json({
        success: true,
        newHunger,
        newCleanliness,
        newHappiness,
        decayIntervals,
        hungerDrop,
        cleanlinessDrop,
        happinessDrop: currentHappiness - newHappiness,
        minutesUntilNextDecay: 3,
        message: `Stat decay applied: ${decayIntervals} intervals (${decayIntervals * 3} minutes)`
      });
    } catch (error) {
      console.error("Error applying stat decay:", error);
      res.status(500).json({ message: "Failed to apply stat decay" });
    }
  });

  // Wake up pet
  app.post('/api/pets/:petId/wake', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      if (!pet.isSleeping || !pet.sleepStartTime) {
        return res.status(400).json({ message: "Pet is not sleeping" });
      }

      // Calculate energy recovery based on sleep duration
      const sleepDuration = Date.now() - new Date(pet.sleepStartTime).getTime();
      const hoursSlept = sleepDuration / (1000 * 60 * 60); // Convert to hours
      
      // 6 hours = 100% energy recovery, proportional recovery for less time
      const energyRecovered = Math.min(100, Math.floor((hoursSlept / 6) * 100));
      const newEnergy = Math.min(100, (pet.energy || 50) + energyRecovered);

      await storage.updatePetStats(petId, { 
        energy: newEnergy,
        isSleeping: false, 
        sleepStartTime: null 
      });

      res.json({ 
        message: "Pet woke up", 
        isSleeping: false, 
        energyRecovered, 
        newEnergy 
      });
    } catch (error) {
      console.error("Error waking pet:", error);
      res.status(500).json({ message: "Failed to wake pet" });
    }
  });

  // 24-Hour Token System - Check token status
  app.get('/api/pets/:petId/token-status', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      const now = new Date();
      const lastTokenClaim = pet.lastTokenClaim ? new Date(pet.lastTokenClaim) : null;
      
      let canClaim = false;
      let hoursElapsed = 0;

      if (!lastTokenClaim) {
        // First time - can claim if all stats are above 1%
        canClaim = pet.happiness > 1 && pet.hunger > 1 && pet.cleanliness > 1 && pet.energy > 1;
      } else {
        hoursElapsed = (now.getTime() - lastTokenClaim.getTime()) / (1000 * 60 * 60);
        canClaim = hoursElapsed >= 24;
      }

      res.json({
        canClaim,
        lastTokenClaim,
        hoursElapsed,
        currentStats: {
          happiness: pet.happiness,
          hunger: pet.hunger,
          cleanliness: pet.cleanliness,
          energy: pet.energy
        }
      });
    } catch (error) {
      console.error("Error checking token status:", error);
      res.status(500).json({ message: "Failed to check token status" });
    }
  });

  // 24-Hour Token System - Claim daily token
  app.post('/api/pets/:petId/claim-daily-token', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      
      const pet = await storage.getPetById(petId);
      if (!pet || pet.adminUserId !== adminUserId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      const now = new Date();
      const lastTokenClaim = pet.lastTokenClaim ? new Date(pet.lastTokenClaim) : null;

      // Check if all stats are above 1%
      if (pet.happiness <= 1 || pet.hunger <= 1 || pet.cleanliness <= 1 || pet.energy <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: "All pet stats must be above 1% to claim token" 
        });
      }

      // Check if 24 hours have passed since last claim
      if (lastTokenClaim) {
        const hoursElapsed = (now.getTime() - lastTokenClaim.getTime()) / (1000 * 60 * 60);
        if (hoursElapsed < 24) {
          return res.status(400).json({ 
            success: false, 
            message: `Must wait ${(24 - hoursElapsed).toFixed(1)} more hours before claiming next token`
          });
        }
      }

      // Award token
      const user = await storage.getUser(adminUserId);
      const newTokenCount = (user.loyaltyPoints || 0) + 1;
      
      await storage.updateUser(adminUserId, { loyaltyPoints: newTokenCount });
      await storage.updatePetStats(petId, { lastTokenClaim: now });

      // Record token transaction in the dedicated token_transactions table
      await db.insert(tokenTransactions).values({
        adminUserId,
        tokens: 1,
        type: 'earned',
        description: `Daily token earned from pet ${pet.name}`,
        relatedId: petId,
        status: 'completed'
      });

      res.json({
        success: true,
        message: "Daily token claimed successfully!",
        newTokenCount,
        lastTokenClaim: now
      });
    } catch (error) {
      console.error("Error claiming daily token:", error);
      res.status(500).json({ message: "Failed to claim daily token" });
    }
  });

  // CONFLICTING ROUTE COMPLETELY REMOVED

  // DUPLICATE ROUTE REMOVED - kept the one at line 2833

  // Marketplace routes
  app.get('/api/marketplace/listings', async (req, res) => {
    try {
      const listings = await storage.getAllListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.post('/api/marketplace/listings', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const validatedData = insertListingSchema.parse({
        ...req.body,
        sellerId: adminUserId,
      });
      
      const listing = await storage.createListing(validatedData);
      
      // Marketplace listing created successfully
      
      res.json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.get('/api/marketplace/my-listings', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const listings = await storage.getListingsByUserId(adminUserId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch your listings" });
    }
  });

  // Message routes
  app.get('/api/messages/:listingId', isAuthenticated, async (req: any, res) => {
    try {
      const listingId = parseInt(req.params.listingId);
      const messages = await storage.getMessagesByListingId(listingId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: adminUserId,
      });
      
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(adminUserId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allUsers = await storage.getAllUsers();
      const totalCount = allUsers.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedUsers = allUsers.slice(offset, offset + limit);

      res.json({
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin route to get ALL users (not paginated) for WhatsApp blast count
  app.get('/api/admin/all-users', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(adminUserId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch all users" });
    }
  });

  app.post('/api/admin/toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = insertToySchema.parse(req.body);
      const toy = await storage.createToy(validatedData);
      res.json(toy);
    } catch (error) {
      console.error("Error creating toy:", error);
      res.status(500).json({ message: "Failed to create toy" });
    }
  });

  app.patch('/api/admin/users/:adminUserId/role', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { userId } = req.params;
      const { role } = req.body;
      
      await storage.updateUserRole(adminUserId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Cash-out routes
  app.post("/api/cashout/request", isAuthenticated, async (req, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const { amount, bankName, accountNumber, accountHolderName } = req.body;

      // Validate minimum cash-out amount (e.g., 50,000 IDR)
      const minAmount = 50000;
      if (parseFloat(amount) < minAmount) {
        return res.status(400).json({ 
          message: `Minimum cash-out amount is RP ${minAmount.toLocaleString('id-ID')}` 
        });
      }

      // Check if user has sufficient credits
      const user = await storage.getUser(adminUserId);
      if (!user || parseFloat(user.credits) < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create cash-out request
      const cashOut = await storage.createCashOutRequest({
        adminUserId,
        amount,
        bankName,
        accountNumber,
        accountHolderName,
        status: "pending",
      });

      // Deduct credits from user account
      const newCredits = (parseFloat(user.credits) - parseFloat(amount)).toString();
      await storage.updateUserCredits(adminUserId, newCredits);

      // Update user's bank details for future use
      await storage.updateUserBankDetails(adminUserId, bankName, accountNumber, accountHolderName);

      res.json({ 
        message: "Cash-out request submitted successfully",
        transaction: cashOut
      });
    } catch (error) {
      console.error("Error creating cash-out request:", error);
      res.status(500).json({ message: "Failed to process cash-out request" });
    }
  });

  app.get("/api/cashout/history", isAuthenticated, async (req, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const cashOuts = await storage.getCashOutsByUserId(adminUserId);
      res.json(cashOuts);
    } catch (error) {
      console.error("Error fetching cash-out history:", error);
      res.status(500).json({ message: "Failed to fetch cash-out history" });
    }
  });

  // Admin route to update pet details and stats
  app.put('/api/admin/pets/:petId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const petId = parseInt(req.params.petId);
      const { name, currentAge, activatedDate, hunger, happiness, cleanliness, energy } = req.body;
      
      // Update pet details
      const petDetails: any = {};
      if (name !== undefined) petDetails.name = name;
      if (currentAge !== undefined) petDetails.currentAge = currentAge;
      if (activatedDate !== undefined) petDetails.activatedDate = new Date(activatedDate);
      
      if (Object.keys(petDetails).length > 0) {
        await storage.updatePetDetails(petId, petDetails);
      }
      
      // Update pet stats
      const petStats: any = {};
      if (hunger !== undefined) petStats.hunger = hunger;
      if (happiness !== undefined) petStats.happiness = happiness;
      if (cleanliness !== undefined) petStats.cleanliness = cleanliness;
      if (energy !== undefined) petStats.energy = energy;
      
      if (Object.keys(petStats).length > 0) {
        await storage.updatePetStats(petId, petStats);
      }
      
      res.json({ message: 'Pet updated successfully' });
    } catch (error) {
      console.error('Error updating pet:', error);
      res.status(500).json({ message: 'Failed to update pet' });
    }
  });

  // User top-up history route
  app.get("/api/topup/history", isAuthenticated, async (req, res) => {
    try {
      const adminUserId = (req.user as any).claims.sub;
      const history = await storage.getUserTopUpHistory(adminUserId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching top-up history:", error);
      res.status(500).json({ message: "Failed to fetch top-up history" });
    }
  });

  // Admin routes for top-up management
  app.get("/api/admin/topup-requests", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const topUpRequests = await storage.getAllTopUpRequests();
      res.json(topUpRequests);
    } catch (error) {
      console.error("Error fetching all top-up requests:", error);
      res.status(500).json({ message: "Failed to fetch top-up requests" });
    }
  });

  app.put("/api/admin/topup-requests/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (status === 'approved') {
        // Get the top-up request details
        const request = await storage.getTopUpRequestById(parseInt(id));
        if (!request) {
          return res.status(404).json({ error: "Top-up request not found" });
        }

        // Add credits to user account
        const currentUser = await storage.getUser(request.adminUserId);
        if (currentUser) {
          const newCredits = parseFloat(currentUser.credits || '0') + parseFloat(request.amount);
          await storage.updateUserCredits(request.adminUserId, newCredits.toString());

          // Create transaction record
          await storage.createPaymentTransaction({
            adminUserId: request.adminUserId,
            amount: request.amount,
            paymentMethod: 'credit_topup',
            description: `Credit top-up via ${request.paymentMethod} - Admin approved`,
            status: 'completed',
          });

          // Create credit history record
          await storage.createCreditHistory({
            adminUserId: request.adminUserId,
            amount: request.amount,
            type: 'credit_topup',
            description: `Credit top-up via ${request.paymentMethod} - Admin approved`,
            status: 'completed',
            referenceId: request.id.toString(),
          });
        }
      }

      await storage.updateTopUpRequestStatus(parseInt(id), status, adminNotes);
      
      // Top-up request status updated
      console.log(`Top-up request ${id} updated to ${status}`);
      
      res.json({ message: "Top-up request status updated successfully" });
    } catch (error) {
      console.error("Error updating top-up request status:", error);
      res.status(500).json({ message: "Failed to update top-up request status" });
    }
  });

  // Admin routes for cash-out management
  app.get("/api/admin/cashouts", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const cashOuts = await storage.getAllCashOuts();
      res.json(cashOuts);
    } catch (error) {
      console.error("Error fetching all cash-outs:", error);
      res.status(500).json({ message: "Failed to fetch cash-outs" });
    }
  });

  app.put("/api/admin/cashouts/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.claims?.sub);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      // Get the cash-out request details
      const cashOutRequests = await storage.getAllCashOuts();
      const request = cashOutRequests.find(r => r.id === parseInt(id));
      
      if (!request) {
        return res.status(404).json({ message: "Cash-out request not found" });
      }

      // If rejecting, restore credits to user
      if (status === 'rejected') {
        const requestUser = await storage.getUser(request.adminUserId);
        if (requestUser) {
          const currentCredits = parseFloat(requestUser.credits);
          const refundAmount = parseFloat(request.amount);
          const newCredits = (currentCredits + refundAmount).toString();
          await storage.updateUserCredits(request.adminUserId, newCredits);
          
          // Create credit history record for refund
          await storage.createCreditHistory({
            adminUserId: request.adminUserId,
            amount: request.amount,
            type: 'cash_out_refund',
            description: `Cash-out refund - Admin rejected: ${adminNotes || 'No reason provided'}`,
            status: 'completed',
            referenceId: request.id.toString(),
          });
        }
      }

      await storage.updateCashOutStatus(parseInt(id), status, adminNotes);
      
      // Cash-out request status updated
      console.log(`Cash-out request ${id} updated to ${status}`);
      
      res.json({ message: "Cash-out status updated successfully" });
    } catch (error) {
      console.error("Error updating cash-out status:", error);
      res.status(500).json({ message: "Failed to update cash-out status" });
    }
  });

  // Purchase confirmation routes
  app.post('/api/pending-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { amount, buyerId } = req.body;
      
      // Check if buyer has sufficient credits
      const buyer = await storage.getUser(buyerId);
      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }
      
      const buyerCredits = parseFloat(buyer.credits || '0');
      const purchaseAmount = parseFloat(amount);
      
      if (buyerCredits < purchaseAmount) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Deduct credits from buyer immediately
      const newBuyerCredits = buyerCredits - purchaseAmount;
      await storage.updateUserCredits(buyerId, newBuyerCredits.toString());
      
      // Create the pending purchase
      const purchase = await storage.createPendingPurchase(req.body);
      
      // Create credit history for the deduction
      await storage.createCreditHistory({
        adminUserId: buyerId,
        amount: purchaseAmount.toFixed(2),
        type: 'debit',
        description: `Purchase pending seller confirmation - Listing ID: ${req.body.listingId}`,
        relatedId: req.body.listingId,
      });
      
      // Purchase created successfully
      
      res.json(purchase);
    } catch (error) {
      console.error("Error creating pending purchase:", error);
      res.status(500).json({ message: "Failed to create pending purchase" });
    }
  });

  app.get('/api/pending-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      console.log("*** ROUTE DEBUG: API called for user:", adminUserId);
      if (!adminUserId) {
        console.log("*** ROUTE DEBUG: No adminUserId found");
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const purchases = await storage.getPendingPurchasesByUserId(adminUserId);
      console.log("*** ROUTE DEBUG: Returning purchases:", purchases.length);
      res.json(purchases);
    } catch (error) {
      console.error("*** ROUTE ERROR:", error);
      res.status(500).json({ message: "Failed to fetch pending purchases" });
    }
  });

  app.get('/api/pending-purchases/:adminUserId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const purchases = await storage.getPendingPurchasesByUserId(adminUserId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching pending purchases:", error);
      res.status(500).json({ message: "Failed to fetch pending purchases" });
    }
  });

  // Seller confirms purchase (step 1)
  app.post('/api/pending-purchases/:id/seller-confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.sellerConfirmPurchase(parseInt(id));
      
      // Broadcast seller confirmation to all connected clients
      // Seller confirmation recorded successfully
      
      res.json({ message: "Purchase confirmed by seller - awaiting buyer confirmation" });
    } catch (error) {
      console.error("Error confirming purchase (seller):", error);
      res.status(500).json({ message: "Failed to confirm purchase" });
    }
  });

  // Buyer confirms purchase (step 2)
  app.post('/api/pending-purchases/:id/buyer-confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.buyerConfirmPurchase(parseInt(id));
      
      // Broadcast buyer confirmation to all connected clients
      // Buyer confirmation recorded successfully
      
      res.json({ message: "Purchase completed successfully" });
    } catch (error) {
      console.error("Error confirming purchase (buyer):", error);
      res.status(500).json({ message: "Failed to complete purchase" });
    }
  });

  // Add cancel sale endpoint
  app.post('/api/pending-purchases/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.cancelPendingPurchase(parseInt(id));
      
      // Broadcast cancellation to all connected clients
      // Purchase cancellation recorded successfully
      
      res.json({ message: "Sale cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling sale:", error);
      res.status(500).json({ message: "Failed to cancel sale" });
    }
  });

  // Credit and points history routes
  app.post('/api/credit-history', isAuthenticated, async (req: any, res) => {
    try {
      const credit = await storage.createCreditHistory(req.body);
      res.json(credit);
    } catch (error) {
      console.error("Error creating credit history:", error);
      res.status(500).json({ message: "Failed to create credit history" });
    }
  });

  app.get('/api/credit-history/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const history = await storage.getCreditHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  app.post('/api/points-history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = {
        ...req.body,
        adminUserId
      };
      
      const points = await storage.createPointsHistory(validatedData);
      
      // Update user's loyalty points using the points difference
      await storage.updateUserPoints(adminUserId, req.body.points);
      
      res.json(points);
    } catch (error) {
      console.error("Error creating points history:", error);
      res.status(500).json({ message: "Failed to create points history" });
    }
  });

  app.get('/api/points-history/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const history = await storage.getPointsHistoryByUserId(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  // Commission history endpoints
  app.get('/api/commission-history/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000;
      const offset = (page - 1) * limit;

      const commissions = await db
        .select({
          id: commissionHistory.id,
          transactionAmount: commissionHistory.transactionAmount,
          commissionAmount: commissionHistory.commissionAmount,
          commissionRate: commissionHistory.commissionRate,
          description: commissionHistory.description,
          relatedId: commissionHistory.relatedId,
          relatedType: commissionHistory.relatedType,
          status: commissionHistory.status,
          createdAt: commissionHistory.createdAt,
          referredUserFirstName: users.firstName,
          referredUserEmail: users.email,
        })
        .from(commissionHistory)
        .leftJoin(users, eq(commissionHistory.referredUserId, users.id))
        .where(eq(commissionHistory.introducerId, userId))
        .orderBy(desc(commissionHistory.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(commissionHistory)
        .where(eq(commissionHistory.introducerId, userId));

      const total = Number(totalCount[0].count);

      res.json({
        data: commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching commission history:", error);
      res.status(500).json({ message: "Failed to fetch commission history" });
    }
  });

  // Total commission earnings for a user
  app.get('/api/commission-stats/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      const stats = await db
        .select({
          totalCommissions: sql<number>`sum(${commissionHistory.commissionAmount})`,
          totalTransactions: sql<number>`count(*)`,
        })
        .from(commissionHistory)
        .where(eq(commissionHistory.introducerId, userId));

      res.json({
        totalCommissions: stats[0]?.totalCommissions || 0,
        totalTransactions: stats[0]?.totalTransactions || 0,
      });
    } catch (error) {
      console.error("Error fetching commission stats:", error);
      res.status(500).json({ message: "Failed to fetch commission stats" });
    }
  });

  // Migration route to update all toys with secure random QR codes
  app.post('/api/toys/migrate-qr-codes', isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateAllToysWithSecureQRCodes();
      res.json({ message: 'All toys updated with secure random QR codes' });
    } catch (error) {
      console.error("Error migrating QR codes:", error);
      res.status(500).json({ message: "Failed to migrate QR codes" });
    }
  });

  // Pet care routes
  app.post('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const petData = {
        ...req.body,
        adminUserId
      };
      
      const pet = await storage.createPet(petData);
      res.json(pet);
    } catch (error) {
      console.error("Error creating pet:", error);
      res.status(500).json({ message: "Failed to create pet" });
    }
  });

  app.get('/api/pets', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        console.log("*** PETS ENDPOINT: No user ID found");
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      console.log("*** PETS ENDPOINT: Fetching pets for user:", userId);
      const pets = await storage.getPetsByUserId(userId);
      console.log("*** PETS ENDPOINT: Found pets:", pets?.length || 0);
      
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  app.get('/api/pets/:petId/care-status', isAuthenticated, async (req: any, res) => {
    try {
      const { petId } = req.params;
      const careStatus = await storage.getTodaysCareStatus(parseInt(petId));
      res.json(careStatus || {
        petId: parseInt(petId),
        fed: false,
        bathed: false,
        slept: false,
        cleaned: false,
        allCareCompleted: false,
        tokenEarned: false
      });
    } catch (error) {
      console.error("Error fetching care status:", error);
      res.status(500).json({ message: "Failed to fetch care status" });
    }
  });



  app.patch('/api/pets/:petId/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { petId } = req.params;
      const { happiness, hunger, cleanliness, energy } = req.body;
      
      await storage.updatePetStats(parseInt(petId), {
        happiness,
        hunger,
        cleanliness,
        energy
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating pet stats:", error);
      res.status(500).json({ message: "Failed to update pet stats" });
    }
  });

  // Admin routes


  app.get('/api/admin/cash-outs', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allCashOuts = await storage.getAllCashOuts();
      const totalCount = allCashOuts.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedCashOuts = allCashOuts.slice(offset, offset + limit);

      res.json({
        data: paginatedCashOuts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching cash outs:", error);
      res.status(500).json({ message: "Failed to fetch cash outs" });
    }
  });

  app.get('/api/admin/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allTransactions = await storage.getAllTransactions();
      const totalCount = allTransactions.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedTransactions = allTransactions.slice(offset, offset + limit);

      res.json({
        data: paginatedTransactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get toy templates for admin management
  app.get('/api/admin/toy-templates', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const templates = await db.select({
        id: schema.toyTemplates.id,
        name: schema.toyTemplates.name,
        seasonId: schema.toyTemplates.seasonId,
        rarity: schema.toyTemplates.rarity,
        color: schema.toyTemplates.color,
        gender: schema.toyTemplates.gender,
        imageUrl: schema.toyTemplates.imageUrl,
        basePrice: schema.toyTemplates.basePrice,
        description: schema.toyTemplates.description,
        isActive: schema.toyTemplates.isActive,
        createdAt: schema.toyTemplates.createdAt,
        updatedAt: schema.toyTemplates.updatedAt,
        season: {
          id: schema.seasons.id,
          name: schema.seasons.name,
          displayName: schema.seasons.displayName,
        }
      })
      .from(schema.toyTemplates)
      .leftJoin(schema.seasons, eq(schema.toyTemplates.seasonId, schema.seasons.id))
      .where(eq(schema.toyTemplates.isActive, true))
      .orderBy(desc(schema.toyTemplates.createdAt));

      res.json({ data: templates });
    } catch (error) {
      console.error("Error fetching toy templates:", error);
      res.status(500).json({ error: "Failed to fetch toy templates" });
    }
  });

  // Create new toy template
  app.post('/api/admin/toy-templates', requireAuth, async (req: any, res) => {
    try {
      console.log("*** TOY TEMPLATE CREATION: Starting authentication check");
      console.log("*** Session user:", req.user);
      console.log("*** Session:", req.session);
      
      const adminUserId = getUserId(req);
      console.log("*** Admin User ID:", adminUserId);
      
      if (!adminUserId) {
        console.log("*** Authentication failed: No user ID");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      console.log("*** Current user from storage:", currentUser);
      
      if (!currentUser || currentUser.role !== 'admin') {
        console.log("*** Access denied: Not admin user");
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("*** TOY TEMPLATE CREATION: Request body:", JSON.stringify(req.body, null, 2));
      console.log("*** TOY TEMPLATE CREATION: Request body types:", Object.keys(req.body).map(key => `${key}: ${typeof req.body[key]}`));

      const validatedData = schema.insertToyTemplateSchema.parse(req.body);
      
      const newTemplate = await db.insert(schema.toyTemplates).values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      res.json(newTemplate[0]);
    } catch (error) {
      console.error("Error creating toy template:", error);
      res.status(500).json({ error: "Failed to create toy template" });
    }
  });

  // Update toy template
  app.put('/api/admin/toy-templates/:templateId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const templateId = parseInt(req.params.templateId);
      const updateData = req.body;

      console.log(`*** TEMPLATE UPDATE: Updating template ID ${templateId} with data:`, updateData);

      // Transform data to match schema requirements
      const transformedData = {
        name: updateData.name,
        rarity: updateData.rarity || 'common',
        color: updateData.color || 'blue',
        gender: updateData.gender || 'male',
        imageUrl: updateData.imageUrl || null,
        basePrice: updateData.price ? String(updateData.price) : '0.00',
        description: updateData.description || null,
        seasonId: updateData.seasonId && updateData.seasonId !== "" ? parseInt(updateData.seasonId) : null,
        isActive: updateData.isActive !== false,
        updatedAt: new Date()
      };

      const updatedTemplate = await db.update(schema.toyTemplates)
        .set(transformedData)
        .where(eq(schema.toyTemplates.id, templateId))
        .returning();

      if (updatedTemplate.length === 0) {
        return res.status(404).json({ error: "Template not found" });
      }

      console.log(`*** TEMPLATE UPDATE: Successfully updated template ID ${templateId}`);
      res.json(updatedTemplate[0]);
    } catch (error) {
      console.error("Error updating toy template:", error);
      res.status(500).json({ error: "Failed to update toy template" });
    }
  });

  // Bulk generate real toys from template
  app.post('/api/admin/generate-toys-from-template', isAuthenticated, async (req: any, res) => {
    try {
      console.log('*** BULK GENERATION DEBUG: Starting toy generation from template');
      console.log('*** BULK GENERATION DEBUG: Request body:', req.body);
      const adminUserId = getUserId(req);
      console.log('*** BULK GENERATION DEBUG: Admin user ID:', adminUserId);
      const currentUser = await storage.getUser(adminUserId);
      console.log('*** BULK GENERATION DEBUG: Current user:', currentUser?.email);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { templateId, quantity } = req.body;
      console.log('*** BULK GENERATION DEBUG: Request data:', { templateId, quantity });

      if (!templateId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: "Template ID and valid quantity required" });
      }

      // Get the template
      const template = await db.select()
        .from(schema.toyTemplates)
        .where(eq(schema.toyTemplates.id, templateId))
        .limit(1);

      if (template.length === 0) {
        return res.status(404).json({ error: "Template not found" });
      }

      const templateData = template[0];
      console.log('*** BULK GENERATION DEBUG: Found template:', templateData.name);

      // Generate QR codes and create toys
      const toys = [];
      for (let i = 0; i < quantity; i++) {
        const qrCode = `TOY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        toys.push({
          name: templateData.name,
          seasonId: templateData.seasonId,
          rarity: templateData.rarity,
          color: templateData.color,
          gender: templateData.gender,
          imageUrl: templateData.imageUrl,
          originalPrice: templateData.basePrice,
          templateId: templateData.id,
          qrCode: qrCode,
          ownerId: null, // Available for discovery
          isActivated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log('*** BULK GENERATION DEBUG: Creating toys:', toys.length);
      const createdToys = await db.insert(schema.toys).values(toys).returning();
      console.log('*** BULK GENERATION DEBUG: Successfully created toys:', createdToys.length);

      res.json({ 
        message: `Successfully generated ${quantity} toys from template`,
        toys: createdToys,
        success: true
      });
    } catch (error) {
      console.error("Error generating toys from template:", error);
      res.status(500).json({ error: "Failed to generate toys from template" });
    }
  });

  app.get('/api/admin/all-toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      // Get only real toys (not templates) for admin management
      const allToys = await db.select({
        id: schema.toys.id,
        name: schema.toys.name,
        series: schema.toys.series,
        seasonId: schema.toys.seasonId,
        rarity: schema.toys.rarity,
        color: schema.toys.color,
        gender: schema.toys.gender,
        imageUrl: schema.toys.imageUrl,
        qrCode: schema.toys.qrCode,
        ownerId: schema.toys.ownerId,
        owner_id: schema.toys.ownerId, // Add both field names for frontend compatibility
        isActivated: schema.toys.isActivated,
        salePrice: schema.toys.salePrice,
        originalPrice: schema.toys.originalPrice,
        templateId: schema.toys.templateId,
        createdAt: schema.toys.createdAt,
        updatedAt: schema.toys.updatedAt,
        season: {
          id: schema.seasons.id,
          name: schema.seasons.name,
          displayName: schema.seasons.displayName,
        },
        owner: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        }
      })
      .from(schema.toys)
      .leftJoin(schema.seasons, eq(schema.toys.seasonId, schema.seasons.id))
      .leftJoin(schema.users, eq(schema.toys.ownerId, schema.users.id))
      .orderBy(desc(schema.toys.createdAt));

      const totalCount = allToys.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedToys = allToys.slice(offset, offset + limit);

      res.json({
        data: paginatedToys,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching toys:", error);
      res.status(500).json({ message: "Failed to fetch toys" });
    }
  });

  // Get only template toys (separate endpoint)
  app.get('/api/admin/template-toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const templateToys = await storage.getTemplateToys();
      res.json({ data: templateToys });
    } catch (error) {
      console.error("Error fetching template toys:", error);
      res.status(500).json({ message: "Failed to fetch template toys" });
    }
  });

  // Admin endpoint - Get all appointments
  app.get('/api/admin/appointments', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allAppointments = await storage.getAllAppointments();
      const totalCount = allAppointments.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedAppointments = allAppointments.slice(offset, offset + limit);

      res.json({
        data: paginatedAppointments,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Admin endpoint - Approve/Cancel appointment
  app.patch('/api/admin/appointments/:id', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status } = req.body;
      
      // Get appointment details before updating for email notification
      const allAppointments = await storage.getAllAppointments();
      const appointment = allAppointments.find(apt => apt.id === parseInt(id));
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Update appointment status
      await storage.updateAppointmentStatus(parseInt(id), status);
      
      // Get updated appointment data for broadcasting
      const updatedAppointment = { ...appointment, status };
      
      // Broadcast appointment status change to all connected clients for real-time updates
      if ((global as any).wss) {
        const wsData = {
          type: 'appointment_status_changed',
          data: updatedAppointment
        };

        (global as any).wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(wsData));
          }
        });
        
        console.log(`*** REALTIME: Broadcasted appointment status change for appointment ${id} to ${status}`)
      }
      
      // Send email notification based on status change
      const user = await storage.getUser(appointment.userId); // Fixed: use userId instead of adminUserId
      if (user && user.email) {
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Valued Customer';
        
        try {
          if (status === 'scheduled') {
            // Send confirmation email for approved appointment
            await sendAppointmentConfirmationEmail(
              user.email,
              userName,
              appointment.title,
              appointment.appointmentDate,
              appointment.duration
            );
            console.log(`Approval email sent to ${user.email} for appointment: ${appointment.title}`);
          } else if (status === 'cancelled') {
            // Send cancellation email for cancelled appointment
            await sendAppointmentCancellationEmail(
              user.email,
              userName,
              appointment.title,
              appointment.appointmentDate
            );
            console.log(`Cancellation email sent to ${user.email} for appointment: ${appointment.title}`);
          }
        } catch (emailError) {
          console.error(`Failed to send ${status} email:`, emailError);
          // Don't fail the status update if email fails
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: 'Failed to update appointment' });
    }
  });

  // Admin endpoint - Single toy creation
  app.post('/api/admin/create-toy', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyData = req.body;
      // Generate QR code if not provided
      if (!toyData.qrCode) {
        toyData.qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Template/avatar toys should have no owner - they are used for bulk creation
      toyData.ownerId = null;
      
      const newToy = await storage.createToy(toyData);
      res.json(newToy);
    } catch (error: any) {
      console.error("Error creating toy:", error);
      
      // Handle specific database constraint errors
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return res.status(400).json({ 
          message: "QR code already exists. Please use a different QR code." 
        });
      }
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid toy data provided.",
          details: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create toy" });
    }
  });

  // Admin endpoint - Bulk toy upload
  app.post('/api/admin/toys/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { toys } = req.body;
      const createdToys = [];
      const errors = [];
      
      for (let i = 0; i < toys.length; i++) {
        const toyData = toys[i];
        try {
          // Generate QR code if not provided
          if (!toyData.qrCode) {
            toyData.qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          
          const toy = await storage.createToy(toyData);
          createdToys.push(toy);
        } catch (error: any) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            errors.push(`Row ${i + 1}: QR code already exists - ${toyData.qrCode || 'generated'}`);
          } else {
            errors.push(`Row ${i + 1}: ${error.message}`);
          }
        }
      }
      
      res.json({ 
        success: true, 
        toys: createdToys,
        createdCount: createdToys.length,
        errorCount: errors.length,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk creating toys:', error);
      res.status(500).json({ message: 'Failed to create toys' });
    }
  });

  // Admin endpoint - Simplified bulk toy generation (creates active toys for current user)
  app.post('/api/admin/bulk-generate-toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { baseToy, quantity, overrides } = req.body;

      if (!baseToy || !quantity || quantity < 1) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (quantity > 100) {
        return res.status(400).json({ message: "Maximum 100 toys can be generated at once" });
      }

      const createdToys = [];
      const errors = [];
      
      for (let i = 0; i < quantity; i++) {
        try {
          // Generate unique QR code
          const qrCode = `QR-${baseToy.name.replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const toyData = {
            name: `${baseToy.name} #${i + 1}`,
            series: baseToy.series,
            rarity: overrides?.rarity || baseToy.rarity,
            color: overrides?.color || baseToy.color,
            imageUrl: baseToy.imageUrl,
            qrCode: qrCode,
            seasonId: overrides?.seasonId || baseToy.seasonId,
            sectorId: baseToy.sectorId,
            isSeasonalExclusive: baseToy.isSeasonalExclusive,
            ownerId: null, // Template toys have no owner - users can discover them
            isActivated: false,
            releaseDate: new Date()
          };
          
          const toy = await storage.createToy(toyData);
          createdToys.push(toy);
          
        } catch (error: any) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            errors.push(`Toy ${i + 1}: QR code already exists`);
          } else {
            errors.push(`Toy ${i + 1}: ${error.message}`);
          }
        }
      }
      
      res.json({ 
        success: true, 
        toysCreated: createdToys.length,
        errorCount: errors.length,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk generating toys:', error);
      res.status(500).json({ message: 'Failed to generate toys' });
    }
  });

  // Admin endpoint - Advanced bulk toy generation
  app.post('/api/admin/toys/bulk-generate', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { 
        customSeason, 
        customSector, 
        baseToyName, 
        totalCount, 
        rarityDistribution, 
        defaultImageUrl, 
        generateQRImages, 
        autoNumbering 
      } = req.body;

      if (!customSeason || !baseToyName || !totalCount || totalCount < 1) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (totalCount > 1000) {
        return res.status(400).json({ message: "Maximum 1000 toys can be generated at once" });
      }

      // First, create or find season and sector
      let seasonId = null;
      let sectorId = null;

      try {
        // Check if season exists, if not create it
        const existingSeason = await storage.getSeasonByName(customSeason);
        if (existingSeason) {
          seasonId = existingSeason.id;
        } else {
          const newSeason = await storage.createSeason({
            name: customSeason,
            description: `Custom season: ${customSeason}`,
            isActive: true,
            startDate: new Date(),
            endDate: null
          });
          seasonId = newSeason.id;
        }

        // Check if sector exists, if not create it
        if (customSector && customSector !== "General Collection") {
          const existingSector = await storage.getSectorByName(customSector);
          if (existingSector) {
            sectorId = existingSector.id;
          } else {
            const newSector = await storage.createSector({
              name: customSector,
              description: `Custom sector: ${customSector}`,
              seasonId: seasonId,
              requiredCount: totalCount,
              order: 1
            });
            sectorId = newSector.id;
          }
        }
      } catch (error) {
        console.log("Season/Sector creation handled by existing logic");
      }

      // Generate rarity distribution
      const getRarity = (index: number) => {
        if (rarityDistribution === 'mixed') {
          const rarities = ['common', 'rare', 'epic', 'legendary', 'secret'];
          const weights = [50, 30, 15, 4, 1]; // Percentage weights
          const random = Math.random() * 100;
          let cumulative = 0;
          for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) return rarities[i];
          }
          return 'common';
        }
        return rarityDistribution;
      };

      const createdToys = [];
      const errors = [];
      
      for (let i = 0; i < totalCount; i++) {
        try {
          const toyNumber = autoNumbering ? String(i + 1).padStart(3, '0') : '';
          const toyName = autoNumbering ? `${baseToyName} #${toyNumber}` : `${baseToyName} ${i + 1}`;
          
          // Generate unique QR code
          const qrCode = `QR-${customSeason.replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const toyData = {
            name: toyName,
            series: customSeason,
            rarity: getRarity(i),
            color: 'default',
            imageUrl: defaultImageUrl || '/images/default-toy.png',
            qrCode: qrCode,
            seasonId: seasonId,
            sectorId: sectorId,
            isSeasonalExclusive: !!(seasonId && sectorId),
            ownerId: null, // Template toys have no owner
            isActivated: false,
            releaseDate: new Date()
          };
          
          const toy = await storage.createToy(toyData);
          createdToys.push({
            ...toy,
            qrCodeImage: generateQRImages ? `/qr-codes/${qrCode}.png` : null
          });
          
          // TODO: If generateQRImages is true, create actual QR code image file
          // This would require a QR code generation library like 'qrcode'
          
        } catch (error: any) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
            errors.push(`Toy ${i + 1}: QR code already exists`);
          } else {
            errors.push(`Toy ${i + 1}: ${error.message}`);
          }
        }
      }
      
      res.json({ 
        success: true, 
        toysCreated: createdToys.length,
        errorCount: errors.length,
        errors: errors,
        seasonId: seasonId,
        sectorId: sectorId,
        seasonName: customSeason,
        sectorName: customSector
      });
    } catch (error) {
      console.error('Error bulk generating toys:', error);
      res.status(500).json({ message: 'Failed to generate toys' });
    }
  });

  // Update toy owner (admin only)
  app.patch('/api/admin/toys/:toyId/owner', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyId = parseInt(req.params.toyId);
      const { newOwnerId } = req.body;
      
      await storage.updateToyOwner(toyId, newOwnerId);
      res.json({ message: "Toy owner updated successfully" });
    } catch (error) {
      console.error("Error updating toy owner:", error);
      res.status(500).json({ message: "Failed to update toy owner" });
    }
  });

  // Edit toy (admin only)
  app.put('/api/admin/toys/:toyId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyId = parseInt(req.params.toyId);
      const toyData = req.body;
      
      console.log(`*** TOY UPDATE: Updating toy ID ${toyId} with data:`, toyData);
      
      // Get the toy before updating to check if it's a template
      const toyBefore = await storage.getToy(toyId);
      if (!toyBefore) {
        return res.status(404).json({ message: "Toy not found" });
      }
      
      console.log(`*** TOY UPDATE: Found toy "${toyBefore.name}" (ID: ${toyId}, ownerId: ${toyBefore.ownerId}, isTemplate: ${toyBefore.isTemplate})`);
      
      await storage.updateToy(toyId, toyData);
      
      console.log(`*** TOY UPDATE: Successfully updated toy ID ${toyId}`);
      
      res.json({ message: "Toy updated successfully" });
    } catch (error) {
      console.error("Error updating toy:", error);
      res.status(500).json({ message: "Failed to update toy" });
    }
  });

  // Create template toy (admin only)
  app.post('/api/admin/toys/create-template', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, seasonId, rarity, color, gender, imageUrl, quantity } = req.body;
      
      console.log(`*** TEMPLATE TOY: Creating ${quantity} template toys named "${name}"`);
      
      const createdToys = [];
      
      for (let i = 0; i < quantity; i++) {
        const qrCode = `QR-${name.replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toyData = {
          name: quantity > 1 ? `${name} #${i + 1}` : name,
          series: null,
          seasonId: seasonId ? parseInt(seasonId) : null,
          rarity: rarity || 'common',
          color: color || 'blue',
          gender: gender || 'male',
          qrCode: qrCode,
          imageUrl: imageUrl || '/images/default-toy.png',
          ownerId: null, // Template toys have no owner
          isActivated: false,
          isTemplate: true,
          releaseDate: new Date()
        };
        
        const createdToy = await storage.createToy(toyData);
        createdToys.push(createdToy);
      }
      
      console.log(`*** TEMPLATE TOY: Successfully created ${createdToys.length} template toys`);
      
      res.json({ 
        message: `Successfully created ${createdToys.length} template toy(s)`,
        toys: createdToys
      });
    } catch (error) {
      console.error("Error creating template toy:", error);
      res.status(500).json({ message: "Failed to create template toy" });
    }
  });

  // Update pet (admin only)
  app.put('/api/admin/pets/:petId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const petId = parseInt(req.params.petId);
      const petData = req.body;
      
      // Update pet in database
      await db.update(pets)
        .set({
          name: petData.name,
          hunger: petData.hunger,
          energy: petData.energy,
          cleanliness: petData.cleanliness,
          happiness: petData.happiness,
          gender: petData.gender,
          growthStage: petData.growthStage,
          createdAt: petData.createdAt ? new Date(petData.createdAt) : undefined
        })
        .where(eq(pets.id, petId));
      
      res.json({ message: "Pet updated successfully" });
    } catch (error) {
      console.error("Error updating pet:", error);
      res.status(500).json({ message: "Failed to update pet" });
    }
  });

  // Delete toy (admin only)
  app.delete('/api/admin/toys/:toyId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyId = parseInt(req.params.toyId);
      await storage.deleteToy(toyId);
      res.json({ message: "Toy deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting toy:", error);
      
      // Handle specific constraint errors
      if (error.message && error.message.includes("pet(s) are using this toy")) {
        res.status(400).json({ 
          message: error.message,
          type: "constraint_error"
        });
      } else if (error.code === '23503') {
        res.status(400).json({ 
          message: "Cannot delete toy: Active pets are using this toy. Please reassign or remove the pets first.",
          type: "foreign_key_constraint"
        });
      } else {
        res.status(500).json({ message: "Failed to delete toy" });
      }
    }
  });

  // Delete hardcoded toys (admin only)
  app.delete('/api/admin/hardcoded-toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteHardcodedToys();
      res.json({ message: "Hardcoded toys deleted successfully" });
    } catch (error) {
      console.error("Error deleting hardcoded toys:", error);
      res.status(500).json({ message: "Failed to delete hardcoded toys" });
    }
  });

  // Create season (admin only)
  app.post('/api/seasons', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, displayName, description, backgroundColor, iconUrl, isActive } = req.body;
      
      console.log("*** CREATE SEASON BACKEND:", {
        requestBody: req.body,
        parsedData: { name, displayName, description, backgroundColor, iconUrl, isActive }
      });
      
      if (!name || !displayName) {
        return res.status(400).json({ message: "Name and display name are required" });
      }

      const [season] = await db.insert(schema.seasons).values({
        name,
        displayName,
        description: description || '',
        iconUrl: iconUrl || '/images/default-season.png',
        backgroundColor: backgroundColor || '#3B82F6',
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: 0,
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log("*** CREATE SEASON RESULT:", season);
      res.json(season);
    } catch (error) {
      console.error("Error creating season:", error);
      res.status(500).json({ message: "Failed to create season" });
    }
  });

  // Edit season (admin only)
  app.put('/api/seasons/:seasonId', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seasonId = parseInt(req.params.seasonId);
      const { name, displayName, description, backgroundColor, iconUrl } = req.body;
      
      console.log("*** EDIT SEASON DEBUG:", {
        seasonId,
        requestBody: req.body,
        parsedData: { name, displayName, description, backgroundColor, iconUrl }
      });
      
      const result = await db.update(schema.seasons)
        .set({ name, displayName, description, backgroundColor, iconUrl, updatedAt: new Date() })
        .where(eq(schema.seasons.id, seasonId))
        .returning();
        
      console.log("*** EDIT SEASON RESULT:", result);
        
      res.json({ message: "Season updated successfully", season: result[0] });
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ message: "Failed to update season" });
    }
  });

  // Delete season (admin only)
  app.delete('/api/seasons/:seasonId', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seasonId = parseInt(req.params.seasonId);
      
      // First check if there are any toys using this season
      const toysInSeason = await db.select().from(schema.toys).where(eq(schema.toys.seasonId, seasonId));
      
      if (toysInSeason.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete season. ${toysInSeason.length} toys are using this season.` 
        });
      }

      // Check if there are any collection series using this season
      const seriesInSeason = await db.select().from(schema.collectionSeries).where(eq(schema.collectionSeries.seasonId, seasonId));
      
      if (seriesInSeason.length > 0) {
        const seriesNames = seriesInSeason.map(s => s.displayName).join(', ');
        return res.status(400).json({ 
          message: `Cannot delete season. ${seriesInSeason.length} collection series are using this season: ${seriesNames}` 
        });
      }

      // Check if there are any user progress records for this season
      const userProgressInSeason = await db.select().from(schema.userCollectionProgress).where(eq(schema.userCollectionProgress.seasonId, seasonId));
      
      if (userProgressInSeason.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete season. ${userProgressInSeason.length} user progress records exist for this season.` 
        });
      }
      
      // Delete the season
      await db.delete(schema.seasons).where(eq(schema.seasons.id, seasonId));
      
      res.json({ message: "Season deleted successfully" });
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ message: "Failed to delete season" });
    }
  });

  // Edit series (admin only)
  app.put('/api/collection-series/:seriesId', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seriesId = parseInt(req.params.seriesId);
      const { name, description, requiredCount } = req.body;
      
      await db.update(schema.collectionSeries)
        .set({ name, description, requiredCount })
        .where(eq(schema.collectionSeries.id, seriesId));
        
      res.json({ message: "Series updated successfully" });
    } catch (error) {
      console.error("Error updating series:", error);
      res.status(500).json({ message: "Failed to update series" });
    }
  });

  // Delete series (admin only)
  app.delete('/api/collection-series/:seriesId', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seriesId = parseInt(req.params.seriesId);
      
      // Delete the series
      await db.delete(schema.collectionSeries).where(eq(schema.collectionSeries.id, seriesId));
      
      res.json({ message: "Series deleted successfully" });
    } catch (error) {
      console.error("Error deleting series:", error);
      res.status(500).json({ message: "Failed to delete series" });
    }
  });

  // Delete all hardcoded toys (admin only)
  app.delete('/api/admin/hardcoded-toys', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Delete toys that don't have an owner (hardcoded toys)
      const result = await db.delete(schema.toys).where(sql`${schema.toys.ownerId} IS NULL`);
      
      res.json({ 
        message: "All hardcoded toys deleted successfully",
        deletedCount: result.rowCount || 0
      });
    } catch (error) {
      console.error("Error deleting hardcoded toys:", error);
      res.status(500).json({ message: "Failed to delete hardcoded toys" });
    }
  });

  // Admin endpoint - Update user profile (PUT)
  app.put('/api/admin/users/:adminUserId/profile', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { firstName, lastName, email, phoneNumber, role } = req.body;
      
      await storage.updateUserProfile(adminUserId, {
        firstName,
        lastName,
        email,
        phoneNumber,
        role
      });
      
      res.json({ message: "User profile updated successfully" });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Admin endpoint - Update user profile (PATCH)
  app.patch('/api/admin/users/:adminUserId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { adminUserId: targetUserId } = req.params;
      const { firstName, lastName, email, phoneNumber, gender, dateOfBirth, role } = req.body;
      
      await storage.updateUserProfile(targetUserId, {
        firstName,
        lastName,
        email,
        phoneNumber,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        role
      });
      
      res.json({ message: "User profile updated successfully" });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Admin endpoint - Get admin fees report
  app.get('/api/admin/fees-report', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const transactions = await storage.getAllTransactions();
      
      // Calculate admin fees (assuming 5% on marketplace transactions)
      const adminFees = transactions
        .filter((t: any) => t.type === 'marketplace_purchase')
        .reduce((total: number, t: any) => total + (parseFloat(t.amount) * 0.05), 0);
      
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((total: number, t: any) => total + parseFloat(t.amount), 0);
      
      res.json({
        totalAdminFees: adminFees,
        totalTransactions,
        totalVolume,
        averageTransactionValue: totalVolume / totalTransactions || 0
      });
    } catch (error) {
      console.error('Error generating fees report:', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  app.post('/api/admin/update-credits', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId: targetUserId, amount } = req.body;
      await storage.updateUserCredits(adminUserId, amount);
      
      // Create transaction record
      await storage.createTransaction({
        adminUserId,
        type: 'credit',
        amount,
        description: `Admin credit adjustment by ${currentUser.firstName} ${currentUser.lastName}`,
        relatedId: null
      });

      res.json({ message: "Credits updated successfully" });
    } catch (error) {
      console.error("Error updating credits:", error);
      res.status(500).json({ message: "Failed to update credits" });
    }
  });

  app.post('/api/admin/update-points', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId: targetUserId, points } = req.body;
      await storage.updateUserPoints(adminUserId, points);

      res.json({ message: "Points updated successfully" });
    } catch (error) {
      console.error("Error updating points:", error);
      res.status(500).json({ message: "Failed to update points" });
    }
  });

  app.put('/api/admin/cash-out/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      await storage.updateCashOutStatus(parseInt(id), status, adminNotes);
      res.json({ message: "Cash out request updated successfully" });
    } catch (error) {
      console.error("Error updating cash out:", error);
      res.status(500).json({ message: "Failed to update cash out request" });
    }
  });

  app.put('/api/admin/cashouts/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      const cashOut = await storage.getCashOutRequest(parseInt(id));
      if (!cashOut) {
        return res.status(404).json({ message: "Cash out request not found" });
      }

      // If rejecting, refund the credits
      if (status === 'rejected' && cashOut.status === 'pending') {
        const user = await storage.getUser(cashOut.adminUserId);
        if (user) {
          const currentCredits = parseFloat(user.credits || '0');
          const refundAmount = parseFloat(cashOut.amount);
          await storage.updateUserCredits(cashOut.adminUserId, (currentCredits + refundAmount).toString());
          
          // Create transaction record for refund
          await storage.createTransaction({
            adminUserId: cashOut.adminUserId,
            type: 'credit',
            amount: refundAmount.toString(),
            description: `Credit refund - Cash-out request rejected`,
            status: 'completed'
          });
        }
      }
      
      await storage.updateCashOutStatus(parseInt(id), status, adminNotes);
      res.json({ message: "Cash out request updated successfully" });
    } catch (error) {
      console.error("Error updating cash out:", error);
      res.status(500).json({ message: "Failed to update cash out request" });
    }
  });

  app.post('/api/admin/toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyData = req.body;
      // Generate QR code if not provided
      if (!toyData.qrCode) {
        toyData.qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      const newToy = await storage.createToy(toyData);
      res.json(newToy);
    } catch (error) {
      console.error("Error creating toy:", error);
      res.status(500).json({ message: "Failed to create toy" });
    }
  });

  // Create template toys for seasonal collections
  app.post('/api/admin/toys/create-template', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, seasonId, rarity, color, gender, imageUrl, quantity } = req.body;

      if (!name || !seasonId || !rarity || !color || !gender) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!quantity || quantity < 1 || quantity > 100) {
        return res.status(400).json({ message: "Quantity must be between 1 and 100" });
      }

      // Verify season exists
      const season = await db.select().from(schema.seasons).where(eq(schema.seasons.id, parseInt(seasonId))).limit(1);
      if (!season || season.length === 0) {
        return res.status(404).json({ message: "Season not found" });
      }

      const createdToys = [];

      // Create multiple template toys based on quantity
      for (let i = 0; i < quantity; i++) {
        const toyName = quantity > 1 ? `${name} #${i + 1}` : name;
        const qrCode = `TEMPLATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toyData = {
          name: toyName,
          series: `${season[0].name} Collection`,
          rarity,
          color,
          gender,
          imageUrl: imageUrl || 'placeholder-image-url',
          qrCode,
          ownerId: null, // Template toys have no owner
          seasonId: parseInt(seasonId),
          isTemplate: true
        };

        const newToy = await storage.createToy(toyData);
        createdToys.push(newToy);
      }

      res.json({ 
        message: `Successfully created ${quantity} template toy${quantity > 1 ? 's' : ''}`,
        toys: createdToys
      });
    } catch (error) {
      console.error("Error creating template toys:", error);
      res.status(500).json({ message: "Failed to create template toys" });
    }
  });

  // Cancel pending purchase route
  app.post('/api/pending-purchases/:purchaseId/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const purchaseId = parseInt(req.params.purchaseId);
      await storage.cancelPendingPurchase(purchaseId);
      res.json({ message: 'Sale cancelled successfully' });
    } catch (error) {
      console.error("Error cancelling sale:", error);
      res.status(500).json({ message: "Failed to cancel sale" });
    }
  });

  // Admin get all pending purchases
  app.get('/api/admin/all-pending-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchases = await storage.getAllPendingPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching all pending purchases:", error);
      res.status(500).json({ message: "Failed to fetch pending purchases" });
    }
  });

  // Admin approve marketplace purchase (force completion with commission calculation)
  app.post('/api/admin/purchases/:purchaseId/approve', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchaseId = parseInt(req.params.purchaseId);
      
      // Get purchase details
      const purchase = await storage.getPurchaseById(purchaseId);
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      // If already completed, just acknowledge
      if (purchase.status === 'completed') {
        return res.json({ message: 'Purchase is already completed' });
      }

      // Force complete the purchase (this will trigger commission calculation)
      try {
        await storage.buyerConfirmPurchase(purchaseId);
        res.json({ message: 'Purchase approved and completed successfully' });
      } catch (error) {
        // If the purchase can't be confirmed normally, force completion
        console.log("Normal confirmation failed, forcing completion:", error.message);
        
        // Force update status to completed for admin approval
        await storage.forceCompletePurchase(purchaseId);
        res.json({ message: 'Purchase force-completed by admin' });
      }
    } catch (error) {
      console.error("Error approving purchase:", error);
      res.status(500).json({ message: "Failed to approve purchase" });
    }
  });

  // Admin reject marketplace purchase
  app.post('/api/admin/purchases/:purchaseId/reject', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchaseId = parseInt(req.params.purchaseId);
      
      // Get purchase details for refund
      const purchase = await storage.getPurchaseById(purchaseId);
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      // Cancel the purchase and refund buyer
      await storage.cancelPurchase(purchaseId);
      
      res.json({ message: 'Purchase rejected and refunded successfully' });
    } catch (error) {
      console.error("Error rejecting purchase:", error);
      res.status(500).json({ message: "Failed to reject purchase" });
    }
  });

  // Redeem reward endpoint
  // Public endpoint for users to get available rewards
  app.get('/api/rewards', isAuthenticated, async (req, res) => {
    try {
      const rewards = await storage.getActiveRewardItems();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post('/api/redeem-reward', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { rewardId, pointsCost } = req.body;
      
      // Get user and reward data
      const user = await storage.getUser(userId);
      const reward = await storage.getRewardItemById(rewardId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!reward) {
        return res.status(404).json({ message: 'Reward not found' });
      }

      // Check if user has enough points
      if (user.loyaltyPoints < pointsCost) {
        return res.status(400).json({ message: 'Insufficient points' });
      }

      // Check stock availability
      if (reward.stockQuantity && reward.stockQuantity <= 0) {
        return res.status(400).json({ message: 'Reward out of stock' });
      }

      // Deduct points from user
      await storage.updateUserPoints(userId, -pointsCost);
      
      // If it's a credit reward, add credits to user account
      if (reward.type === 'credit' && reward.creditAmount) {
        const currentCredits = parseFloat(user.credits || "0");
        const creditAmount = parseFloat(reward.creditAmount);
        const newCredits = (currentCredits + creditAmount).toString();
        
        await storage.updateUserCredits(userId, newCredits);
        
        // Create credit history record
        await storage.createCreditHistory({
          userId,
          type: 'earned',
          amount: reward.creditAmount,
          description: `Redeemed: ${reward.name}`
        });
      }
      
      // Create points history record for redemption
      await storage.createPointsHistory({
        userId,
        points: -pointsCost,
        type: 'redeemed',
        description: `Redeemed: ${reward.name}`
      });
      
      // Decrease stock if applicable
      if (reward.stockQuantity) {
        await storage.updateRewardItem(rewardId, { 
          stockQuantity: reward.stockQuantity - 1 
        });
      }

      // Reward redemption recorded successfully

      res.json({ 
        message: 'Reward redeemed successfully',
        creditAdded: reward.type === 'credit' ? reward.creditAmount : null
      });
    } catch (error) {
      console.error("Error redeeming reward:", error);
      res.status(500).json({ message: "Failed to redeem reward" });
    }
  });

  // Seasonal Collections API endpoints - PUBLIC ACCESS
  app.get('/api/seasons', async (req: any, res) => {
    try {
      console.log('*** PUBLIC SEASONS API: Fetching all active seasons');
      const seasons = await db.select({
        id: schema.seasons.id,
        name: schema.seasons.name,
        displayName: schema.seasons.displayName,
        description: schema.seasons.description,
        iconUrl: schema.seasons.iconUrl,
        backgroundColor: schema.seasons.backgroundColor,
        isActive: schema.seasons.isActive,
        displayOrder: schema.seasons.displayOrder,
      }).from(schema.seasons)
        .where(eq(schema.seasons.isActive, true))
        .orderBy(schema.seasons.displayOrder);

      console.log(`*** PUBLIC SEASONS API: Found ${seasons.length} active seasons`);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  app.get('/api/seasons/:seasonId/sectors', async (req: any, res) => {
    try {
      const { seasonId } = req.params;
      const sectors = await db.select({
        id: schema.collectionSectors.id,
        seasonId: schema.collectionSectors.seasonId,
        name: schema.collectionSectors.name,
        displayName: schema.collectionSectors.displayName,
        description: schema.collectionSectors.description,
        iconSymbol: schema.collectionSectors.iconSymbol,
        backgroundColor: schema.collectionSectors.backgroundColor,
        unlockCondition: schema.collectionSectors.unlockCondition,
        isUnlocked: schema.collectionSectors.isUnlocked,
        displayOrder: schema.collectionSectors.displayOrder,
      }).from(schema.collectionSectors)
        .where(eq(schema.collectionSectors.seasonId, parseInt(seasonId)))
        .orderBy(schema.collectionSectors.displayOrder);

      res.json(sectors);
    } catch (error) {
      console.error("Error fetching collection sectors:", error);
      res.status(500).json({ message: "Failed to fetch collection sectors" });
    }
  });

  app.get('/api/user/collection-progress', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const progress = await db.select({
        id: schema.userCollectionProgress.id,
        seasonId: schema.userCollectionProgress.seasonId,
        sectorId: schema.userCollectionProgress.sectorId,
        totalItems: schema.userCollectionProgress.totalItems,
        collectedItems: schema.userCollectionProgress.collectedItems,
        completionPercentage: schema.userCollectionProgress.completionPercentage,
        isCompleted: schema.userCollectionProgress.isCompleted,
        lastUpdated: schema.userCollectionProgress.lastUpdated,
        season: {
          id: schema.seasons.id,
          name: schema.seasons.name,
          displayName: schema.seasons.displayName,
          backgroundColor: schema.seasons.backgroundColor,
        },
        sector: {
          id: schema.collectionSectors.id,
          name: schema.collectionSectors.name,
          displayName: schema.collectionSectors.displayName,
          iconSymbol: schema.collectionSectors.iconSymbol,
        }
      }).from(schema.userCollectionProgress)
        .leftJoin(schema.seasons, eq(schema.userCollectionProgress.seasonId, schema.seasons.id))
        .leftJoin(schema.collectionSectors, eq(schema.userCollectionProgress.sectorId, schema.collectionSectors.id))
        .where(eq(schema.userCollectionProgress.userId, userId));

      res.json(progress);
    } catch (error) {
      console.error("Error fetching user collection progress:", error);
      res.status(500).json({ message: "Failed to fetch collection progress" });
    }
  });

  app.get('/api/seasons/:seasonId/toys', async (req: any, res) => {
    try {
      console.log(`*** PUBLIC SEASONAL TOYS API: Starting request for season ${req.params.seasonId}`);
      const { seasonId } = req.params;
      const { sectorId } = req.query;
      const userId = getUserId(req) || null;
      console.log(`*** PUBLIC SEASONAL TOYS API: userId=${userId}, sectorId=${sectorId}`);

      // Get regular toys from the season
      let regularToys: any[] = [];
      try {
        let toysWhere = eq(schema.toys.seasonId, parseInt(seasonId));
        if (sectorId) {
          toysWhere = and(toysWhere, eq(schema.toys.sectorId, parseInt(sectorId as string)));
        }

        regularToys = await db.select().from(schema.toys)
          .where(toysWhere)
          .orderBy(schema.toys.rarity, schema.toys.name);
        
        // Transform regular toys to match expected format
        regularToys = regularToys.map(toy => ({
          ...toy,
          isOwned: userId && toy.ownerId === userId,
          isTemplate: false
        }));
      } catch (error) {
        console.error("Error fetching regular toys:", error);
      }

      // Get toy templates for the season (only if no specific sector is selected)
      let templateToys: any[] = [];
      if (!sectorId) {
        try {
          console.log(`*** SEASONAL TOYS API: Fetching toy templates for season ${seasonId}`);
          templateToys = await db.select().from(schema.toyTemplates)
            .where(eq(schema.toyTemplates.seasonId, parseInt(seasonId)))
            .orderBy(schema.toyTemplates.rarity, schema.toyTemplates.name);
          
          console.log(`*** SEASONAL TOYS API: Found ${templateToys.length} toy templates`);
          console.log("*** SEASONAL TOYS API: Template toys:", JSON.stringify(templateToys, null, 2));
          
          // Transform template toys to match expected format
          templateToys = templateToys.map(template => ({
            id: template.id,
            name: template.name,
            series: null,
            rarity: template.rarity,
            color: template.color,
            imageUrl: template.imageUrl,
            ownerId: null,
            isActivated: false,
            seasonId: template.seasonId,
            sectorId: null,
            collectionProgress: null,
            isSeasonalExclusive: true,
            releaseDate: template.createdAt,
            isOwned: false,
            isTemplate: true,
            basePrice: template.basePrice,
            gender: template.gender
          }));
        } catch (error) {
          console.error("Error fetching toy templates:", error);
        }
      }

      // Combine regular toys and templates
      const allToys = [...regularToys, ...templateToys];

      // Sort by rarity and name
      allToys.sort((a, b) => {
        const rarityOrder = { 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'secret': 5 };
        const aRarity = rarityOrder[a.rarity as keyof typeof rarityOrder] || 0;
        const bRarity = rarityOrder[b.rarity as keyof typeof rarityOrder] || 0;
        
        if (aRarity !== bRarity) {
          return aRarity - bRarity;
        }
        return a.name.localeCompare(b.name);
      });

      console.log(`*** SEASONAL TOYS DEBUG: Season ${seasonId}, Sector ${sectorId || 'all'}, Found ${regularToys.length} toys + ${templateToys.length} templates`);
      console.log(`*** SEASONAL TOYS RESULT:`, JSON.stringify(allToys, null, 2));

      res.json(allToys);
    } catch (error) {
      console.error("Error fetching seasonal toys:", error);
      res.status(500).json({ message: "Failed to fetch seasonal toys" });
    }
  });

  // Get user dashboard stats from database - OPTIMIZED for performance
  app.get('/api/user-stats', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // OPTIMIZATION: Execute all database queries in parallel instead of sequential
      const [
        user,
        referralEarnings,
        referrals,
        appointments,
        pointRedemptions
      ] = await Promise.all([
        storage.getUser(userId),
        storage.calculateReferralEarnings(userId),
        storage.getReferralsByUserId(userId),
        storage.getAppointmentsByUserId(userId),
        storage.getPointsHistoryByUserId ? storage.getPointsHistoryByUserId(userId) : []
      ]);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get loyalty points directly from user database record
      const loyaltyPoints = user.loyaltyPoints || 0;

      const stats = {
        credits: user.credits || '0',
        loyaltyPoints: loyaltyPoints,
        lifetimePoints: user.lifetimePoints || 0,
        tokens: user.tokens || 0,
        referralEarnings: referralEarnings,
        totalAppointments: appointments.length,
        totalRewards: pointRedemptions.length,
        appointments: appointments,
        pointRedemptions: pointRedemptions,
        referrals: referrals
      };

      console.log('*** USER STATS from DB:', stats);
      
      // OPTIMIZATION: Enable caching for better performance (30 seconds)
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.set('ETag', `W/"user-stats-${userId}-${Date.now()}"`) ;
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Failed to fetch user stats' });
    }
  });

  // Credit history route for transaction timestamps
  app.get('/api/credit-history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub || req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get credit transactions from database
      const transactions = await storage.getCreditTransactionsByUserId(adminUserId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  // Points history routes
  app.get('/api/points-history/:adminUserId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.params.adminUserId;
      const pointsHistory = await storage.getPointsHistoryByUserId(adminUserId);
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  app.post('/api/points-history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = {
        ...req.body,
        adminUserId
      };
      
      const pointsHistory = await storage.createPointsHistory(validatedData);
      
      // Update user's loyalty points using the points difference
      await storage.updateUserPoints(adminUserId, req.body.points);
      
      // Broadcast loyalty points update
      // Loyalty points updated successfully
      
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error creating points history:", error);
      res.status(500).json({ message: "Failed to create points history" });
    }
  });

  // Credit history routes
  app.get('/api/credit-history/:adminUserId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.params.adminUserId;
      const creditHistory = await storage.getCreditHistoryByUserId(adminUserId);
      res.json(creditHistory);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  app.post('/api/credit-history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const validatedData = {
        ...req.body,
        adminUserId
      };
      
      const creditHistory = await storage.createCreditHistory(validatedData);
      
      // Credit history created successfully
      
      res.json(creditHistory);
    } catch (error) {
      console.error("Error creating credit history:", error);
      res.status(500).json({ message: "Failed to create credit history" });
    }
  });

  // Real-time updates now handled via polling for stable performance
  
  // Public route for fetching promotion banners (no authentication required)
  app.get('/api/promotion-banners', async (req, res) => {
    try {
      const banners = await storage.getAllPromotionBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching promotion banners:", error);
      res.status(500).json({ message: "Failed to fetch promotion banners" });
    }
  });

  // Broadcast functions removed - using polling for stable updates

  // Game scores routes
  app.post('/api/game-scores', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { petId, score } = req.body;
      
      // Create the game score record (no tokens awarded)
      const gameScore = await storage.createGameScore({
        userId: adminUserId,
        petId,
        score,
        tokensEarned: 0
      });
      
      res.json(gameScore);
    } catch (error: any) {
      console.error("Error creating game score:", error);
      res.status(500).json({ message: "Failed to save game score" });
    }
  });

  app.get('/api/game-scores/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await storage.getTopGameScores(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/game-scores/user', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const userScores = await storage.getUserGameScores(adminUserId);
      res.json(userScores);
    } catch (error: any) {
      console.error("Error fetching user scores:", error);
      res.status(500).json({ message: "Failed to fetch user scores" });
    }
  });

  // Admin route to reset leaderboard
  app.delete('/api/admin/game-scores/reset', requireAuth, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      await storage.resetAllGameScores();
      res.json({ message: 'Game scores reset successfully' });
    } catch (error: any) {
      console.error("Error resetting game scores:", error);
      res.status(500).json({ message: "Failed to reset game scores" });
    }
  });

  // Admin route to get all activated pets
  app.get('/api/admin/activated-pets', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(adminUserId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allActivatedPets = await storage.getAllActivatedPetsWithDetails();
      const totalCount = allActivatedPets.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedPets = allActivatedPets.slice(offset, offset + limit);

      res.json({
        data: paginatedPets,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error: any) {
      console.error("Error fetching activated pets:", error);
      res.status(500).json({ message: "Failed to fetch activated pets" });
    }
  });



  // Admin pet editing
  app.put('/api/admin/pets/:petId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { petId } = req.params;
      const { name, currentAge, activatedDate } = req.body;
      
      // Update pet details in toys table (since pets are activated toys)
      await storage.updatePetDetails(parseInt(petId), {
        name,
        currentAge,
        activatedDate: activatedDate ? new Date(activatedDate) : undefined
      });
      
      res.json({ message: 'Pet updated successfully' });
    } catch (error: any) {
      console.error('Error updating pet:', error);
      res.status(500).json({ message: 'Failed to update pet' });
    }
  });

  // Token claim routes for users to request physical tokens
  app.post('/api/token-claims', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { tokensRequested } = req.body;
      
      if (!tokensRequested || tokensRequested <= 0) {
        return res.status(400).json({ message: "Valid token amount required" });
      }
      
      // Check if user has enough tokens
      const user = await storage.getUser(adminUserId);
      if (!user || (user.tokens || 0) < tokensRequested) {
        return res.status(400).json({ message: "Insufficient tokens" });
      }

      // Deduct tokens from user account
      await storage.deductUserTokens(adminUserId, tokensRequested);

      // Create token claim request (no shipping address - redeem at approved locations)
      const claim = await storage.createTokenClaim({
        adminUserId,
        tokensRequested,
        status: 'pending'
      });

      res.json(claim);
    } catch (error) {
      console.error("Error creating token claim:", error);
      res.status(500).json({ message: "Failed to create token claim" });
    }
  });

  app.get('/api/admin/token-claims', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const currentUser = await storage.getUser(adminUserId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const offset = (page - 1) * limit;

      const allClaims = await storage.getTokenClaims();
      const totalCount = allClaims.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedClaims = allClaims.slice(offset, offset + limit);

      res.json({
        data: paginatedClaims,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching token claims:", error);
      res.status(500).json({ message: "Failed to fetch token claims" });
    }
  });

  // User route to get their own token claim history
  app.get('/api/token-claims/history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const claims = await storage.getTokenClaimsByUserId(adminUserId);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching user token claims:", error);
      res.status(500).json({ message: "Failed to fetch token claims history" });
    }
  });

  // Comprehensive token transaction history for a user
  app.get('/api/tokens/history', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub || req.user?.id;
      if (!adminUserId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get all token transactions from the dedicated token_transactions table
      const userTokenTransactions = await db
        .select({
          id: tokenTransactions.id,
          type: tokenTransactions.type,
          description: tokenTransactions.description,
          tokens: tokenTransactions.tokens,
          status: tokenTransactions.status,
          createdAt: tokenTransactions.createdAt,
          relatedId: tokenTransactions.relatedId
        })
        .from(tokenTransactions)
        .where(eq(tokenTransactions.userId, adminUserId))
        .orderBy(desc(tokenTransactions.createdAt));

      // Get token claims (earning tokens) 
      const tokenClaims = await storage.getTokenClaimsByUserId(adminUserId);
      
      // Format token claims to match transaction format
      const formattedClaims = tokenClaims.map((claim: any) => ({
        id: `claim_${claim.id}`,
        type: 'token_claim',
        description: `Token claim: ${claim.tokensAwarded} tokens`,
        tokens: claim.tokensAwarded,
        status: claim.status,
        createdAt: claim.createdAt,
        relatedId: claim.id,
        notes: claim.notes
      }));

      // Combine and sort all token-related activities
      const allTokenHistory = [...userTokenTransactions, ...formattedClaims]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(allTokenHistory);
    } catch (error) {
      console.error("Error fetching token history:", error);
      res.status(500).json({ message: "Failed to fetch token history" });
    }
  });

  app.patch('/api/admin/token-claims/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status, adminNotes, trackingNumber } = req.body;
      
      await storage.updateTokenClaimStatus(parseInt(id), status, adminUserId, adminNotes, trackingNumber);
      
      // Token claim updated
      console.log(`Token claim ${id} updated to ${status}`);
      
      res.json({ message: "Token claim updated successfully" });
    } catch (error) {
      console.error("Error updating token claim:", error);
      res.status(500).json({ message: "Failed to update token claim" });
    }
  });

  // Admin route to update user tokens directly
  app.patch('/api/admin/users/:adminUserId/tokens', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { tokens } = req.body;
      
      if (typeof tokens !== 'number' || tokens < 0) {
        return res.status(400).json({ message: "Valid token amount required" });
      }
      
      await storage.updateUserTokens(adminUserId, tokens);
      res.json({ message: "User tokens updated successfully" });
    } catch (error) {
      console.error("Error updating user tokens:", error);
      res.status(500).json({ message: "Failed to update user tokens" });
    }
  });

  // Admin add tokens to user
  app.post('/api/admin/users/:adminUserId/add-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      const admin = await storage.getUser(adminUserId);
      
      if (admin?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { userId } = req.params;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid token amount' });
      }
      
      // Get current user to verify existence
      const user = await storage.getUser(adminUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Add tokens to pet's claimable pool (not directly to wallet)
      await storage.updatePetTokens(adminUserId, amount);
      
      // Create a transaction record for admin token addition
      await storage.createTransaction({
        adminUserId,
        type: 'admin_token_grant',
        amount: amount.toString(),
        description: `Admin set claimable tokens to ${amount}`,
        status: 'completed'
      });
      
      res.json({ message: `Claimable tokens set to ${amount} successfully` });
    } catch (error: any) {
      console.error('Error adding tokens:', error);
      res.status(500).json({ message: 'Failed to add tokens' });
    }
  });

  // Admin endpoint to get all token transactions with pagination
  app.get('/api/admin/token-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub || req.user?.id;
      const admin = await storage.getUser(adminUserId);
      
      if (admin?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Get total count first
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tokenTransactions);
      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get paginated token transactions from the dedicated token_transactions table
      const adminTokenTransactions = await db
        .select({
          id: tokenTransactions.id,
          userId: tokenTransactions.userId,
          tokens: tokenTransactions.tokens,
          type: tokenTransactions.type,
          description: tokenTransactions.description,
          relatedId: tokenTransactions.relatedId,
          status: tokenTransactions.status,
          createdAt: tokenTransactions.createdAt
        })
        .from(tokenTransactions)
        .orderBy(desc(tokenTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Get user information for each transaction
      const userIds = Array.from(new Set(adminTokenTransactions.map(t => t.userId)));
      const users = await Promise.all(
        userIds.map(async (adminUserId) => {
          const user = await storage.getUser(adminUserId);
          return { id: adminUserId, email: user?.email, firstName: user?.firstName };
        })
      );

      const usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as any);

      // Add user information to transactions
      const enrichedTransactions = adminTokenTransactions.map(transaction => ({
        ...transaction,
        user: usersMap[transaction.userId]
      }));

      res.json({ 
        data: enrichedTransactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching admin token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  // Daily token reward endpoints
  app.get('/api/daily-token-reward/status', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      console.log("Checking daily token reward status for user:", adminUserId);
      
      // Get user's pets to check health status
      const userPets = await storage.getPetsByUserId(adminUserId);
      const petCount = userPets.length;
      
      // Check if all pets have stats > 25% (healthy threshold)
      const allPetsHealthy = userPets.length > 0 && userPets.every(pet => 
        (pet.happiness || 0) > 25 && 
        (pet.hunger || 0) > 25 && 
        (pet.cleanliness || 0) > 25 && 
        (pet.energy || 0) > 25
      );
      
      // Get last reward claim time
      const lastReward = await storage.getLastDailyTokenReward(adminUserId);
      let canClaim = false;
      let timeUntilNext = 0;
      
      if (!lastReward) {
        // First time - can claim if all pets are healthy
        canClaim = allPetsHealthy;
      } else {
        const now = new Date();
        const lastClaimTime = new Date(lastReward.createdAt);
        const timeSinceLastClaim = now.getTime() - lastClaimTime.getTime();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
        
        if (timeSinceLastClaim >= twentyFourHoursInMs) {
          canClaim = allPetsHealthy;
          timeUntilNext = 0;
        } else {
          canClaim = false;
          timeUntilNext = twentyFourHoursInMs - timeSinceLastClaim;
        }
      }
      
      const response = {
        canClaim,
        allPetsHealthy,
        petCount,
        timeUntilNext: Math.max(0, timeUntilNext),
        lastClaimTime: lastReward?.createdAt || null
      };
      
      console.log("Daily token reward status response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error checking daily token reward status:", error);
      res.status(500).json({ message: "Failed to check reward status" });
    }
  });

  app.post('/api/daily-token-reward/claim', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const result = await storage.claimDailyTokenReward(adminUserId);
      
      if (result.success) {
        res.json({ 
          message: 'Daily token reward claimed successfully!',
          tokensAwarded: result.tokensAwarded
        });
      } else {
        res.status(400).json({ 
          message: 'Cannot claim daily token reward at this time' 
        });
      }
    } catch (error) {
      console.error("Error claiming daily token reward:", error);
      res.status(500).json({ message: "Failed to claim daily token reward" });
    }
  });

  // Admin season management endpoints
  app.get('/api/admin/seasons', requireAuth, async (req: any, res) => {
    try {
      const seasons = await db.select().from(schema.seasons).orderBy(schema.seasons.displayOrder);
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  app.post('/api/admin/seasons', requireAuth, async (req: any, res) => {
    try {
      const { name, displayName, description, backgroundColor, iconUrl } = req.body;
      
      if (!name || !displayName) {
        return res.status(400).json({ message: "Name and display name are required" });
      }

      const [season] = await db.insert(schema.seasons).values({
        name,
        displayName,
        description: description || '',
        iconUrl: iconUrl || '/images/default-season.png',
        backgroundColor: backgroundColor || '#3B82F6',
        isActive: true,
        displayOrder: 0,
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.json(season);
    } catch (error) {
      console.error("Error creating season:", error);
      res.status(500).json({ message: "Failed to create season" });
    }
  });

  app.put('/api/admin/seasons/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, displayName, description, backgroundColor, iconUrl, isActive } = req.body;

      await db.update(schema.seasons).set({
        name,
        displayName,
        description,
        backgroundColor,
        iconUrl,
        isActive,
        updatedAt: new Date()
      }).where(eq(schema.seasons.id, parseInt(id)));

      res.json({ message: "Season updated successfully" });
    } catch (error) {
      console.error("Error updating season:", error);
      res.status(500).json({ message: "Failed to update season" });
    }
  });

  app.delete('/api/admin/seasons/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // First check if there are any toys using this season
      const toysInSeason = await db.select().from(schema.toys).where(eq(schema.toys.seasonId, parseInt(id)));
      
      if (toysInSeason.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete season. ${toysInSeason.length} toys are using this season.` 
        });
      }

      // Delete associated sectors first
      await db.delete(schema.collectionSectors).where(eq(schema.collectionSectors.seasonId, parseInt(id)));
      
      // Then delete the season
      await db.delete(schema.seasons).where(eq(schema.seasons.id, parseInt(id)));

      res.json({ message: "Season deleted successfully" });
    } catch (error) {
      console.error("Error deleting season:", error);
      res.status(500).json({ message: "Failed to delete season" });
    }
  });

  // Admin sector management endpoints
  app.get('/api/admin/sectors', requireAuth, async (req: any, res) => {
    try {
      const sectors = await db.select({
        id: schema.collectionSectors.id,
        seasonId: schema.collectionSectors.seasonId,
        name: schema.collectionSectors.name,
        displayName: schema.collectionSectors.displayName,
        description: schema.collectionSectors.description,
        iconSymbol: schema.collectionSectors.iconSymbol,
        backgroundColor: schema.collectionSectors.backgroundColor,
        unlockCondition: schema.collectionSectors.unlockCondition,
        isUnlocked: schema.collectionSectors.isUnlocked,
        displayOrder: schema.collectionSectors.displayOrder,
        seasonName: schema.seasons.displayName
      })
      .from(schema.collectionSectors)
      .leftJoin(schema.seasons, eq(schema.collectionSectors.seasonId, schema.seasons.id))
      .orderBy(schema.collectionSectors.seasonId, schema.collectionSectors.displayOrder);
      
      res.json(sectors);
    } catch (error) {
      console.error("Error fetching sectors:", error);
      res.status(500).json({ message: "Failed to fetch sectors" });
    }
  });

  app.post('/api/admin/sectors', requireAuth, async (req: any, res) => {
    try {
      const { seasonId, name, displayName, description, backgroundColor, iconSymbol, unlockCondition } = req.body;
      
      if (!seasonId || !name || !displayName) {
        return res.status(400).json({ message: "Season ID, name and display name are required" });
      }

      const [sector] = await db.insert(schema.collectionSectors).values({
        seasonId: parseInt(seasonId),
        name,
        displayName,
        description: description || '',
        iconSymbol: iconSymbol || '🎯',
        backgroundColor: backgroundColor || '#F3F4F6',
        unlockCondition: unlockCondition || 'none',
        isUnlocked: true,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      res.json(sector);
    } catch (error) {
      console.error("Error creating sector:", error);
      res.status(500).json({ message: "Failed to create sector" });
    }
  });

  app.put('/api/admin/sectors/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { seasonId, name, displayName, description, backgroundColor, iconSymbol, unlockCondition, isUnlocked } = req.body;

      await db.update(schema.collectionSectors).set({
        seasonId: parseInt(seasonId),
        name,
        displayName,
        description,
        backgroundColor,
        iconSymbol,
        unlockCondition,
        isUnlocked,
        updatedAt: new Date()
      }).where(eq(schema.collectionSectors.id, parseInt(id)));

      res.json({ message: "Sector updated successfully" });
    } catch (error) {
      console.error("Error updating sector:", error);
      res.status(500).json({ message: "Failed to update sector" });
    }
  });

  app.delete('/api/admin/sectors/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // First check if there are any toys using this sector
      const toysInSector = await db.select().from(schema.toys).where(eq(schema.toys.sectorId, parseInt(id)));
      
      if (toysInSector.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete sector. ${toysInSector.length} toys are using this sector.` 
        });
      }

      await db.delete(schema.collectionSectors).where(eq(schema.collectionSectors.id, parseInt(id)));

      res.json({ message: "Sector deleted successfully" });
    } catch (error) {
      console.error("Error deleting sector:", error);
      res.status(500).json({ message: "Failed to delete sector" });
    }
  });

  // SendGrid Email API endpoints
  app.post('/api/admin/send-email', requireAuth, async (req: any, res) => {
    try {
      console.log('*** EMAIL ENDPOINT: Request received:', req.body);
      console.log('*** EMAIL ENDPOINT: User:', req.user?.email);
      
      const { to, subject, text, html, sendToAll } = req.body;
      
      if (!subject || (!text && !html)) {
        console.log('*** EMAIL ENDPOINT: Missing required fields');
        return res.status(400).json({ message: 'Missing required email fields' });
      }

      // Check if SendGrid API key is configured
      if (!process.env.SENDGRID_API_KEY) {
        console.log('*** EMAIL ENDPOINT: SendGrid API key not configured');
        return res.status(500).json({ message: 'SendGrid API key not configured' });
      }

      if (sendToAll) {
        console.log('*** EMAIL ENDPOINT: Sending to all users');
        // Send to all users
        const users = await db.select({ email: schema.users.email })
          .from(schema.users)
          .where(isNotNull(schema.users.email));
        
        console.log(`*** EMAIL ENDPOINT: Found ${users.length} users with email addresses`);
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const user of users) {
          if (user.email && user.email.trim() !== '') {
            try {
              console.log(`*** EMAIL ENDPOINT: Sending to ${user.email}`);
              const success = await sendEmail({
                to: user.email,
                from: 'noreply@rebornwavegroup.com',
                subject,
                text,
                html
              });
              
              if (success) {
                successCount++;
                console.log(`*** EMAIL ENDPOINT: Success for ${user.email}`);
              } else {
                failureCount++;
                console.log(`*** EMAIL ENDPOINT: Failed for ${user.email}`);
              }
            } catch (error) {
              console.error(`*** EMAIL ENDPOINT: Error for ${user.email}:`, error);
              failureCount++;
            }
          }
        }
        
        console.log(`*** EMAIL ENDPOINT: Completed - Success: ${successCount}, Failed: ${failureCount}`);
        
        res.json({ 
          message: `Email blast completed`,
          successCount,
          failureCount,
          totalUsers: users.filter(u => u.email && u.email.trim() !== '').length
        });
      } else {
        // Send to specific recipient
        if (!to) {
          return res.status(400).json({ message: 'Recipient email is required' });
        }
        
        const success = await sendEmail({
          to,
          from: 'noreply@rebornwavegroup.com',
          subject,
          text,
          html
        });

        if (success) {
          res.json({ message: 'Email sent successfully' });
        } else {
          res.status(500).json({ message: 'Failed to send email' });
        }
      }
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // WhatsApp messaging via Twilio
  app.post('/api/admin/send-whatsapp', requireAuth, async (req: any, res) => {
    try {
      console.log('*** WHATSAPP ENDPOINT: Request received:', req.body);
      console.log('*** WHATSAPP ENDPOINT: User:', req.user?.email);
      
      const { message, sendToAll } = req.body;
      
      if (!message) {
        console.log('*** WHATSAPP ENDPOINT: Message is required');
        return res.status(400).json({ message: 'Message is required' });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      console.log('*** WHATSAPP ENDPOINT: Checking credentials...');
      console.log('*** WHATSAPP ENDPOINT: AccountSid exists:', !!accountSid);
      console.log('*** WHATSAPP ENDPOINT: AuthToken exists:', !!authToken);
      console.log('*** WHATSAPP ENDPOINT: FromNumber exists:', !!fromNumber);

      if (!accountSid || !authToken || !fromNumber) {
        console.log('*** WHATSAPP ENDPOINT: Twilio credentials not configured');
        return res.status(500).json({ message: 'Twilio credentials not configured' });
      }

      const twilio = await import('twilio');
      const client = twilio.default(accountSid, authToken);

      if (sendToAll) {
        console.log('*** WHATSAPP ENDPOINT: Sending to all users with phone numbers');
        // Send to all users with mobile numbers
        const users = await db.select({ phoneNumber: schema.users.phoneNumber })
          .from(schema.users)
          .where(isNotNull(schema.users.phoneNumber));
        
        console.log(`*** WHATSAPP ENDPOINT: Found ${users.length} users with phone numbers`);
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const user of users) {
          if (user.phoneNumber && user.phoneNumber.trim() !== '') {
            try {
              console.log(`*** WHATSAPP ENDPOINT: Sending to ${user.phoneNumber}`);
              await client.messages.create({
                body: message,
                from: `whatsapp:${fromNumber}`,
                to: `whatsapp:${user.phoneNumber}`
              });
              successCount++;
              console.log(`*** WHATSAPP ENDPOINT: Success for ${user.phoneNumber}`);
            } catch (error) {
              console.error(`*** WHATSAPP ENDPOINT: Error for ${user.phoneNumber}:`, error);
              failureCount++;
            }
          }
        }
        
        console.log(`*** WHATSAPP ENDPOINT: Completed - Success: ${successCount}, Failed: ${failureCount}`);
        
        res.json({ 
          message: `WhatsApp blast completed`,
          successCount,
          failureCount,
          totalUsers: users.filter(u => u.phoneNumber && u.phoneNumber.trim() !== '').length
        });
      } else {
        res.status(400).json({ message: 'Individual WhatsApp sending not implemented' });
      }
    } catch (error) {
      console.error("*** WHATSAPP ENDPOINT: Error:", error);
      res.status(500).json({ message: "Failed to send WhatsApp message", error: error.message });
    }
  });

  app.post('/api/send-welcome-email', requireAuth, async (req: any, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ message: 'Email and name are required' });
      }

      const success = await sendWelcomeEmail(email, name);

      if (success) {
        res.json({ message: 'Welcome email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send welcome email' });
      }
    } catch (error) {
      console.error('Send welcome email error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/send-evolution-email', requireAuth, async (req: any, res) => {
    try {
      const { email, petName, newStage } = req.body;
      
      if (!email || !petName || !newStage) {
        return res.status(400).json({ message: 'Email, pet name, and new stage are required' });
      }

      const success = await sendPetEvolutionEmail(email, petName, newStage);

      if (success) {
        res.json({ message: 'Evolution email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send evolution email' });
      }
    } catch (error) {
      console.error('Send evolution email error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all toys (templates + generated toys + live toys) for admin dashboard
  app.get('/api/admin/all-toys', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user?.id;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Get all toys with owner information
      const allToys = await db.select({
        id: toys.id,
        name: toys.name,
        ownerId: toys.ownerId,
        ownerEmail: users.email,
        rarity: toys.rarity,
        color: toys.color,
        gender: toys.gender,
        imageUrl: toys.imageUrl,
        basePrice: toys.basePrice,
        isActivated: toys.isActivated,
        isListed: toys.isListed,
        seasonId: toys.seasonId,
        createdAt: toys.createdAt
      })
      .from(toys)
      .leftJoin(users, eq(toys.ownerId, users.id))
      .orderBy(desc(toys.createdAt));

      // Also get toy templates
      const templates = await db.select().from(toyTemplates);

      // Combine toys and templates with proper categorization
      const combinedResults = [
        ...templates.map(template => ({
          ...template,
          ownerId: null,
          ownerEmail: null,
          isActivated: false,
          isListed: false
        })),
        ...allToys
      ];

      res.json(combinedResults);
    } catch (error) {
      console.error('Error fetching all toys:', error);
      res.status(500).json({ message: 'Failed to fetch toys data' });
    }
  });

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket server globally for real-time updates
  (global as any).wss = wss;
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
