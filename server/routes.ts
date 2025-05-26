import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertAppointmentSchema,
  insertTransactionSchema,
  insertToySchema,
  insertListingSchema,
  insertMessageSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User routes
  app.get('/api/users/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getReferralsByUserId(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/users/referral-earnings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const earnings = await storage.calculateReferralEarnings(userId);
      res.json({ earnings });
    } catch (error) {
      console.error("Error calculating referral earnings:", error);
      res.status(500).json({ message: "Failed to calculate referral earnings" });
    }
  });

  app.post('/api/users/apply-referral', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referralCode } = req.body;
      
      // Find referrer by code
      const allUsers = await storage.getAllUsers();
      const referrer = allUsers.find(u => u.referralCode === referralCode);
      
      if (!referrer) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      if (referrer.id === userId) {
        return res.status(400).json({ message: "Cannot refer yourself" });
      }
      
      // Check if user already has a referrer
      const user = await storage.getUser(userId);
      if (user?.referredById) {
        return res.status(400).json({ message: "You already have a referrer" });
      }
      
      // Create referral relationship
      await storage.createReferralRelationship(referrer.id, userId);
      
      res.json({ message: "Referral code applied successfully" });
    } catch (error) {
      console.error("Error applying referral code:", error);
      res.status(500).json({ message: "Failed to apply referral code" });
    }
  });

  // Appointment routes
  app.post('/api/appointments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        userId,
      });
      
      const appointment = await storage.createAppointment(validatedData);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: "appointment_payment",
        amount: validatedData.cost,
        description: `Appointment: ${validatedData.title}`,
        referenceId: appointment.id.toString(),
        pointsEarned: Math.floor(Number(validatedData.cost) * 0.1), // 10% points
      });
      
      // Update user credits and points
      await storage.updateUserCredits(userId, `-${validatedData.cost}`);
      await storage.updateUserPoints(userId, Math.floor(Number(validatedData.cost) * 0.1));
      
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.get('/api/appointments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactionsByUserId(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions/top-up', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;
      
      // Validate amount
      const validAmount = z.string().regex(/^\d+\.?\d{0,2}$/).parse(amount);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: "credit_purchase",
        amount: validAmount,
        description: "Credit top-up",
        pointsEarned: Math.floor(Number(validAmount) * 0.05), // 5% points
      });
      
      // Update user credits and points
      await storage.updateUserCredits(userId, validAmount);
      await storage.updateUserPoints(userId, Math.floor(Number(validAmount) * 0.05));
      
      res.json({ message: "Credits added successfully" });
    } catch (error) {
      console.error("Error processing top-up:", error);
      res.status(500).json({ message: "Failed to process top-up" });
    }
  });

  // Toy routes
  app.get('/api/toys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const toys = await storage.getToysByOwnerId(userId);
      res.json(toys);
    } catch (error) {
      console.error("Error fetching toys:", error);
      res.status(500).json({ message: "Failed to fetch toys" });
    }
  });

  app.post('/api/toys/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { qrCode } = req.body;
      
      const toy = await storage.getToyByQrCode(qrCode);
      if (!toy) {
        return res.status(404).json({ message: "Invalid QR code" });
      }
      
      if (toy.ownerId) {
        return res.status(400).json({ message: "Toy already claimed" });
      }
      
      // Assign toy to user
      await storage.updateToyOwner(toy.id, userId);
      
      res.json({ message: "Toy added to your collection!", toy });
    } catch (error) {
      console.error("Error scanning QR code:", error);
      res.status(500).json({ message: "Failed to scan QR code" });
    }
  });

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
      const userId = req.user.claims.sub;
      const validatedData = insertListingSchema.parse({
        ...req.body,
        sellerId: userId,
      });
      
      const listing = await storage.createListing(validatedData);
      res.json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.get('/api/marketplace/my-listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listings = await storage.getListingsByUserId(userId);
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
      const userId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/toys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.patch('/api/admin/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const user = await storage.getUser(adminUserId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { userId } = req.params;
      const { role } = req.body;
      
      await storage.updateUserRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
