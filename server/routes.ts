import { Express, Request, Response } from "express";
import { Server } from "http";
import * as schema from "../shared/schema";
import { DatabaseStorage } from "./storage";
import { eq, desc, and, gte, lte, or, sql, count, sum, avg } from "drizzle-orm";
import { db } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = new DatabaseStorage();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploaded-images/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to check authentication
function isAuthenticated(req: any, res: any, next: any) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "User not authenticated" });
}

// Helper function to get user ID
function getUserId(req: any): string | null {
  return req.user?.claims?.sub || req.user?.id || null;
}

// Evolution system helper functions
function getNextEvolutionThreshold(currentStage: string): number {
  const thresholds = {
    'baby': 50,
    'teenager': 100,
    'adult': 150,
    'grandpa': 200,
    'death': 250,
    'elder': 9999
  };
  return thresholds[currentStage as keyof typeof thresholds] || 9999;
}

function getNextGrowthStage(currentStage: string): string {
  const stages = {
    'baby': 'teenager',
    'teenager': 'adult',
    'adult': 'grandpa',
    'grandpa': 'death',
    'death': 'baby',
    'elder': 'elder'
  };
  return stages[currentStage as keyof typeof stages] || 'baby';
}

function getEvolutionProgress(currentStage: string, totalCareCount: number): number {
  const currentThreshold = getEvolutionThreshold(currentStage);
  const nextThreshold = getNextEvolutionThreshold(currentStage);
  
  if (totalCareCount <= currentThreshold) return 0;
  if (totalCareCount >= nextThreshold) return 100;
  
  const progress = ((totalCareCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.round(progress);
}

function getEvolutionThreshold(stage: string): number {
  const thresholds = {
    'baby': 0,
    'teenager': 50,
    'adult': 100,
    'grandpa': 150,
    'death': 200,
    'elder': 250
  };
  return thresholds[stage as keyof typeof thresholds] || 0;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // User authentication routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User stats route
  app.get("/api/user-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const userStats = await storage.getUserStats(userId);
      console.log("*** USER STATS from DB:", userStats);
      res.json(userStats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin dashboard routes
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const users = await storage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching admin transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/admin/cash-outs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const cashOuts = await storage.getAllCashOuts();
      res.json(cashOuts);
    } catch (error) {
      console.error("Error fetching admin cash-outs:", error);
      res.status(500).json({ message: "Failed to fetch cash-outs" });
    }
  });

  app.get("/api/admin/all-toys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const toys = await storage.getAllToysForAdmin();
      res.json(toys);
    } catch (error) {
      console.error("Error fetching admin toys:", error);
      res.status(500).json({ message: "Failed to fetch toys" });
    }
  });

  app.get("/api/admin/activated-pets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const pets = await storage.getAllActivatedPetsForAdmin();
      res.json(pets);
    } catch (error) {
      console.error("Error fetching admin activated pets:", error);
      res.status(500).json({ message: "Failed to fetch activated pets" });
    }
  });

  app.get("/api/admin/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const appointments = await storage.getAllAppointmentsForAdmin();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching admin appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/admin/token-transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tokenTransactions = await storage.getAllTokenTransactionsForAdmin();
      res.json(tokenTransactions);
    } catch (error) {
      console.error("Error fetching admin token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.get("/api/admin/token-claims", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tokenClaims = await storage.getAllTokenClaimsForAdmin();
      res.json(tokenClaims);
    } catch (error) {
      console.error("Error fetching admin token claims:", error);
      res.status(500).json({ message: "Failed to fetch token claims" });
    }
  });

  app.get("/api/admin/payment-verifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const verifications = await storage.getAllPaymentVerificationsForAdmin();
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching admin payment verifications:", error);
      res.status(500).json({ message: "Failed to fetch payment verifications" });
    }
  });

  app.get("/api/admin/commission-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const commissionStats = await storage.getCommissionStatsForAdmin();
      res.json(commissionStats);
    } catch (error) {
      console.error("Error fetching admin commission stats:", error);
      res.status(500).json({ message: "Failed to fetch commission stats" });
    }
  });

  app.get("/api/admin/fees-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const feesReport = await storage.getFeesReportForAdmin();
      res.json(feesReport);
    } catch (error) {
      console.error("Error fetching admin fees report:", error);
      res.status(500).json({ message: "Failed to fetch fees report" });
    }
  });

  app.get("/api/admin/topup-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const topUpRequests = await storage.getAllTopUpRequests();
      res.json(topUpRequests);
    } catch (error) {
      console.error("Error fetching admin topup requests:", error);
      res.status(500).json({ message: "Failed to fetch topup requests" });
    }
  });

  app.get("/api/admin/all-pending-purchases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const pendingPurchases = await storage.getAllPendingPurchasesForAdmin();
      res.json(pendingPurchases);
    } catch (error) {
      console.error("Error fetching admin pending purchases:", error);
      res.status(500).json({ message: "Failed to fetch pending purchases" });
    }
  });

  app.get("/api/admin/banners", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const banners = await storage.getAllPromotionBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching admin banners:", error);
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  app.get("/api/admin/appointment-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const appointmentEvents = await storage.getAllAppointmentEvents();
      res.json(appointmentEvents);
    } catch (error) {
      console.error("Error fetching admin appointment events:", error);
      res.status(500).json({ message: "Failed to fetch appointment events" });
    }
  });

  app.get("/api/admin/reward-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const rewardItems = await storage.getRewardItems();
      res.json(rewardItems);
    } catch (error) {
      console.error("Error fetching admin reward items:", error);
      res.status(500).json({ message: "Failed to fetch reward items" });
    }
  });

  // Start the server
  const server = app.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
  });

  return server;
}