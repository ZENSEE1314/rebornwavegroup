import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendAppointmentConfirmationEmail, sendAppointmentCancellationEmail, sendAppointmentRescheduleEmail } from "./emailService";
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

  app.put('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, phoneNumber } = req.body;
      
      await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        phoneNumber
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

  app.get('/api/users/genealogy-tree', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`*** GENEALOGY DEBUG: Building tree for user ${userId}`);
      const genealogyTree = await storage.buildReferralGenealogyTree(userId);
      console.log(`*** GENEALOGY DEBUG: Result for ${userId}:`, JSON.stringify(genealogyTree, null, 2));
      res.json(genealogyTree);
    } catch (error) {
      console.error("Error building genealogy tree:", error);
      res.status(500).json({ message: "Failed to build genealogy tree" });
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
      const validatedData = {
        ...req.body,
        userId,
        appointmentDate: new Date(req.body.appointmentDate),
        status: 'pending' // New appointments require admin confirmation
      };
      
      const appointment = await storage.createAppointment(validatedData);
      
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
      
      // Broadcast appointment creation to all connected clients
      (app as any).broadcastMarketplaceUpdate('appointment_created', { userId });
      
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

  // Update appointment (reschedule)
  app.put('/api/appointments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { appointmentDate } = req.body;
      const userId = req.user.claims.sub;
      
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
  app.put('/api/appointments/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user.claims.sub;
      
      // Get appointment details before updating
      const appointments = await storage.getAppointmentsByUserId(userId);
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      await storage.updateAppointmentStatus(appointmentId, status);
      
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
      
      // Broadcast credit update to all connected clients
      (app as any).broadcastMarketplaceUpdate('credits_updated', { userId });
      
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
      const userId = req.user.claims.sub;
      const validatedData = insertToySchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const toy = await storage.createToy(validatedData);
      res.json(toy);
    } catch (error) {
      console.error("Error creating toy:", error);
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
      const userId = req.user.claims.sub;
      const { toyId } = req.params;
      
      await storage.updateToyOwner(parseInt(toyId), userId);
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

  app.post('/api/listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertListingSchema.parse({
        ...req.body,
        sellerId: userId,
      });
      
      // Check for existing ACTIVE listing of the same toy by the same seller
      const existingListings = await storage.getAllListings();
      const duplicateListing = existingListings.find((listing: any) => 
        listing.toyId === validatedData.toyId && 
        listing.sellerId === userId &&
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
  app.delete('/api/listings/:id', isAuthenticated, async (req: any, res) => {
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
              userId: purchase.buyerId,
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
      const userId = req.user.claims.sub;
      
      await storage.purchaseToy(toyId, userId);
      res.json({ message: "Toy purchased successfully" });
    } catch (error) {
      console.error("Error purchasing toy:", error);
      res.status(500).json({ message: "Failed to purchase toy" });
    }
  });

  // Activate toy with QR code (replaces the old scan functionality)
  app.post('/api/toys/scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { qrCode } = req.body;
      
      const activatedToy = await storage.activateToyByQrCode(qrCode, userId);
      
      if (!activatedToy) {
        return res.status(400).json({ message: "Failed to activate toy" });
      }

      res.json({ 
        message: "Toy activated successfully!", 
        toy: activatedToy 
      });
    } catch (error: any) {
      console.error("Error activating toy:", error);
      res.status(400).json({ message: error.message || "Failed to activate toy" });
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
      
      // Broadcast new listing to all connected clients
      (app as any).broadcastMarketplaceUpdate('listing_created', listing);
      
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

  // Cash-out routes
  app.post("/api/cashout/request", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { amount, bankName, accountNumber, accountHolderName } = req.body;

      // Validate minimum cash-out amount (e.g., 50,000 IDR)
      const minAmount = 50000;
      if (parseFloat(amount) < minAmount) {
        return res.status(400).json({ 
          message: `Minimum cash-out amount is RP ${minAmount.toLocaleString('id-ID')}` 
        });
      }

      // Check if user has sufficient credits
      const user = await storage.getUser(userId);
      if (!user || parseFloat(user.credits) < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create cash-out request
      const cashOut = await storage.createCashOutRequest({
        userId,
        amount,
        bankName,
        accountNumber,
        accountHolderName,
        status: "pending",
      });

      // Deduct credits from user account
      const newCredits = (parseFloat(user.credits) - parseFloat(amount)).toString();
      await storage.updateUserCredits(userId, newCredits);

      // Update user's bank details for future use
      await storage.updateUserBankDetails(userId, bankName, accountNumber, accountHolderName);

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
      const userId = req.user?.claims?.sub;
      const cashOuts = await storage.getCashOutsByUserId(userId);
      res.json(cashOuts);
    } catch (error) {
      console.error("Error fetching cash-out history:", error);
      res.status(500).json({ message: "Failed to fetch cash-out history" });
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

      await storage.updateCashOutStatus(parseInt(id), status, adminNotes);
      res.json({ message: "Cash-out status updated successfully" });
    } catch (error) {
      console.error("Error updating cash-out status:", error);
      res.status(500).json({ message: "Failed to update cash-out status" });
    }
  });

  // Purchase confirmation routes
  app.post('/api/pending-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        userId: buyerId,
        amount: purchaseAmount.toFixed(2),
        type: 'debit',
        description: `Purchase pending seller confirmation - Listing ID: ${req.body.listingId}`,
        relatedId: req.body.listingId,
      });
      
      // Broadcast purchase creation to all connected clients
      (app as any).broadcastMarketplaceUpdate('purchase_created', purchase);
      
      res.json(purchase);
    } catch (error) {
      console.error("Error creating pending purchase:", error);
      res.status(500).json({ message: "Failed to create pending purchase" });
    }
  });

  app.get('/api/pending-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      console.log("*** ROUTE DEBUG: API called for user:", userId);
      if (!userId) {
        console.log("*** ROUTE DEBUG: No userId found");
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const purchases = await storage.getPendingPurchasesByUserId(userId);
      console.log("*** ROUTE DEBUG: Returning purchases:", purchases.length);
      res.json(purchases);
    } catch (error) {
      console.error("*** ROUTE ERROR:", error);
      res.status(500).json({ message: "Failed to fetch pending purchases" });
    }
  });

  app.get('/api/pending-purchases/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const purchases = await storage.getPendingPurchasesByUserId(userId);
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
      (app as any).broadcastMarketplaceUpdate('seller_confirmed', { id: parseInt(id) });
      
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
      (app as any).broadcastMarketplaceUpdate('buyer_confirmed', { id: parseInt(id) });
      
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
      (app as any).broadcastMarketplaceUpdate('purchase_cancelled', { id: parseInt(id) });
      
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = {
        ...req.body,
        userId
      };
      
      const points = await storage.createPointsHistory(validatedData);
      
      // Update user's loyalty points using the points difference
      await storage.updateUserPoints(userId, req.body.points);
      
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

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/cash-outs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const cashOuts = await storage.getAllCashOuts();
      res.json(cashOuts);
    } catch (error) {
      console.error("Error fetching cash outs:", error);
      res.status(500).json({ message: "Failed to fetch cash outs" });
    }
  });

  app.get('/api/admin/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/admin/all-toys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toys = await storage.getAllToysWithOwners();
      res.json(toys);
    } catch (error) {
      console.error("Error fetching toys:", error);
      res.status(500).json({ message: "Failed to fetch toys" });
    }
  });

  // Admin endpoint - Get all appointments
  app.get('/api/admin/appointments', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Admin endpoint - Approve/Cancel appointment
  app.patch('/api/admin/appointments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { status } = req.body;
      await storage.updateAppointmentStatus(parseInt(id), status);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ message: 'Failed to update appointment' });
    }
  });

  // Admin endpoint - Bulk toy upload
  app.post('/api/admin/toys/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { toys } = req.body;
      const createdToys = [];
      
      for (const toyData of toys) {
        const toy = await storage.createToy(toyData);
        createdToys.push(toy);
      }
      
      res.json({ success: true, toys: createdToys });
    } catch (error) {
      console.error('Error bulk creating toys:', error);
      res.status(500).json({ message: 'Failed to create toys' });
    }
  });

  // Admin endpoint - Update user profile
  app.put('/api/admin/users/:userId/profile', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { firstName, lastName, email, phoneNumber, role } = req.body;
      
      await storage.updateUserProfile(userId, {
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

  // Admin endpoint - Get admin fees report
  app.get('/api/admin/fees-report', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
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

      const { userId, amount } = req.body;
      await storage.updateUserCredits(userId, amount);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
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

      const { userId, points } = req.body;
      await storage.updateUserPoints(userId, points);

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

  // Get user dashboard stats from database
  app.get('/api/user-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get actual user data from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get loyalty points directly from user database record
      const loyaltyPoints = user.loyaltyPoints || 0;

      // Calculate referral earnings and get referral data
      const referralEarnings = await storage.calculateReferralEarnings(userId);
      const referrals = await storage.getReferralsByUserId(userId);

      // Get total appointments from database
      const appointments = await storage.getAppointmentsByUserId(userId);

      // Get point redemptions (rewards) from database
      const pointRedemptions = await storage.getPointsHistoryByUserId ? 
        await storage.getPointsHistoryByUserId(userId) : [];

      const stats = {
        credits: user.credits || '0',
        loyaltyPoints: loyaltyPoints,
        lifetimePoints: user.lifetimePoints || 0,
        referralEarnings: referralEarnings,
        totalAppointments: appointments.length,
        totalRewards: pointRedemptions.length,
        appointments: appointments,
        pointRedemptions: pointRedemptions,
        referrals: referrals
      };

      console.log('*** USER STATS from DB:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Failed to fetch user stats' });
    }
  });

  // Points history routes
  app.get('/api/points-history/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const pointsHistory = await storage.getPointsHistoryByUserId(userId);
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ message: "Failed to fetch points history" });
    }
  });

  app.post('/api/points-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = {
        ...req.body,
        userId
      };
      
      const pointsHistory = await storage.createPointsHistory(validatedData);
      
      // Update user's loyalty points using the points difference
      await storage.updateUserPoints(userId, req.body.points);
      
      res.json(pointsHistory);
    } catch (error) {
      console.error("Error creating points history:", error);
      res.status(500).json({ message: "Failed to create points history" });
    }
  });

  // Credit history routes
  app.get('/api/credit-history/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const creditHistory = await storage.getCreditHistoryByUserId(userId);
      res.json(creditHistory);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  app.post('/api/credit-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = {
        ...req.body,
        userId
      };
      
      const creditHistory = await storage.createCreditHistory(validatedData);
      res.json(creditHistory);
    } catch (error) {
      console.error("Error creating credit history:", error);
      res.status(500).json({ message: "Failed to create credit history" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time marketplace updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store all connected clients
  const wsClients = new Set();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });
  
  // Function to broadcast marketplace updates to all clients
  function broadcastMarketplaceUpdate(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    wsClients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Export broadcast function for use in routes
  (app as any).broadcastMarketplaceUpdate = broadcastMarketplaceUpdate;

  return httpServer;
}
