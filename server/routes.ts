import type { Express } from "express";
import express from "express";
import path from "path";
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

// Pet lifecycle helper functions
function getEvolutionStage(ageInDays: number): string {
  if (ageInDays < 20) return "Baby Turtle Dragon";
  if (ageInDays < 40) return "Young Turtle Dragon";
  if (ageInDays < 60) return "Adult Turtle Dragon";
  if (ageInDays < 80) return "Elder Turtle Dragon";
  return "Grand Turtle Dragon";
}

function formatPetTimer(ageInDays: number, birthDate: Date): string {
  const now = new Date();
  const birth = new Date(birthDate);
  const diffMs = now.getTime() - birth.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function updatePetLifecycle(pet: any) {
  const now = new Date();
  const birth = new Date(pet.birthDate);
  const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if pet should die (100+ days)
  if (ageInDays >= pet.maxLifespanDays && !pet.isDead) {
    await storage.updatePetDeath(pet.id, true);
    pet.isDead = true;
    pet.canEarnTokens = false;
  }
  
  // Update age and evolution stage
  if (ageInDays !== pet.currentAge) {
    const newStage = getEvolutionStage(ageInDays);
    await storage.updatePetAge(pet.id, ageInDays, newStage);
    pet.currentAge = ageInDays;
    pet.growthStage = newStage;
  }
  
  // Apply automatic hunger and cleanliness decay (100% to 1% over 6 hours)
  await updatePetDecay(pet, now);
}

async function updatePetDecay(pet: any, now: Date) {
  let needsUpdate = false;
  let updates: any = {};
  
  // Calculate hunger decay
  const lastFed = pet.lastFed ? new Date(pet.lastFed) : new Date(pet.birthDate);
  const hoursSinceLastFed = (now.getTime() - lastFed.getTime()) / (1000 * 60 * 60);
  
  // Decay from 100% to 1% over 6 hours (16.5% per hour)
  const hungerDecay = Math.min(hoursSinceLastFed * 16.5, 99);
  const newHunger = Math.max(1, 100 - hungerDecay);
  
  if (Math.abs(newHunger - pet.hunger) > 0.5) {
    updates.hunger = Math.round(newHunger);
    needsUpdate = true;
  }
  
  // Calculate cleanliness decay
  const lastCleaned = pet.lastCleaned ? new Date(pet.lastCleaned) : new Date(pet.birthDate);
  const hoursSinceLastCleaned = (now.getTime() - lastCleaned.getTime()) / (1000 * 60 * 60);
  
  // Decay from 100% to 1% over 6 hours (16.5% per hour)
  const cleanlinessDecay = Math.min(hoursSinceLastCleaned * 16.5, 99);
  const newCleanliness = Math.max(1, 100 - cleanlinessDecay);
  
  if (Math.abs(newCleanliness - pet.cleanliness) > 0.5) {
    updates.cleanliness = Math.round(newCleanliness);
    needsUpdate = true;
  }
  
  // Update pet stats if needed
  if (needsUpdate) {
    await storage.updatePetStats(pet.id, updates);
    pet.hunger = updates.hunger || pet.hunger;
    pet.cleanliness = updates.cleanliness || pet.cleanliness;
  }
  
  // Check for daily token reward (every 24 hours)
  const lastClaim = pet.lastTokenClaimDate ? new Date(pet.lastTokenClaimDate) : null;
  const canClaimToken = !lastClaim || (now.getTime() - lastClaim.getTime()) >= (24 * 60 * 60 * 1000);
  
  if (canClaimToken && pet.health > 0 && !pet.isDead && pet.canEarnTokens) {
    await storage.awardDailyToken(pet.userId, pet.id);
    pet.lastTokenClaimDate = now;
    pet.totalTokensEarned += 1;
  }
  
  // Stop token earning if health is 0
  if (pet.health <= 0 && pet.canEarnTokens) {
    await storage.updatePetTokenEarning(pet.id, false);
    pet.canEarnTokens = false;
  }
  
  // Add formatted timer
  pet.formattedAge = formatPetTimer(ageInDays, birth);
  
  return pet;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve attached assets as static files
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

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

  app.post('/api/admin/users/:userId/change-password', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const currentUser = await storage.getUser(req.user.claims.sub);
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
      const userId = req.user.claims.sub;
      const { firstName, lastName, phoneNumber, gender, dateOfBirth } = req.body;
      
      await storage.updateUserProfile(userId, {
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

  // Pet Care activation endpoint
  app.post('/api/toys/activate', isAuthenticated, async (req: any, res) => {
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

  // Get user's pets
  app.get('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pets = await storage.getPetsByUserId(userId);
      res.json(pets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      res.status(500).json({ message: "Failed to fetch pets" });
    }
  });

  // Enhanced Digimon pet care routes
  app.get('/api/pets/digimon', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pets = await storage.getPetsByUserId(userId);
      
      // Update pet stats based on time passed (hunger and cleanliness decay)
      const updatedPets = await Promise.all(pets.map(async (pet: any) => {
        const now = new Date();
        const lastFed = pet.lastFed ? new Date(pet.lastFed) : pet.createdAt ? new Date(pet.createdAt) : now;
        const lastCleaned = pet.lastCleaned ? new Date(pet.lastCleaned) : pet.createdAt ? new Date(pet.createdAt) : now;
        
        // Calculate hunger decay: 100% to 1% over 12 hours (720 minutes)
        const minutesSinceLastFed = Math.floor((now.getTime() - lastFed.getTime()) / (1000 * 60));
        const hungerDecayPerMinute = 99 / (12 * 60); // 99% decay over 720 minutes
        const newHunger = Math.max(pet.hunger - (minutesSinceLastFed * hungerDecayPerMinute), 1);
        
        // Calculate cleanliness decay: 100% to 0% over 8 hours (480 minutes)
        const minutesSinceLastCleaned = Math.floor((now.getTime() - lastCleaned.getTime()) / (1000 * 60));
        const cleanlinessDecayPerMinute = 100 / (8 * 60); // 100% decay over 480 minutes
        const newCleanliness = Math.max(pet.cleanliness - (minutesSinceLastCleaned * cleanlinessDecayPerMinute), 0);
        
        // Update pet stats if values changed significantly
        if (Math.abs(pet.hunger - newHunger) > 1 || Math.abs(pet.cleanliness - newCleanliness) > 1) {
          await storage.updatePetStats(pet.id, {
            hunger: Math.round(newHunger),
            cleanliness: Math.round(newCleanliness)
          });
          
          return {
            ...pet,
            hunger: Math.round(newHunger),
            cleanliness: Math.round(newCleanliness)
          };
        }
        
        return pet;
      }));
      
      res.json(updatedPets);
    } catch (error) {
      console.error("Error fetching Digimon pets:", error);
      res.status(500).json({ message: "Failed to fetch Digimon pets" });
    }
  });

  // Cleaning system - restores cleanliness to 100%
  app.post('/api/pets/:petId/clean', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot clean a dead pet" });
      }

      if (pet.cleanliness >= 100) {
        return res.status(400).json({ message: "Pet is already clean" });
      }

      // Update cleanliness to 100% and set last cleaned time
      await storage.updatePetStats(petId, {
        cleanliness: 100,
        lastCleaned: new Date()
      });

      res.json({ 
        message: "Pet cleaned successfully", 
        newCleanliness: 100
      });
    } catch (error) {
      console.error("Error cleaning pet:", error);
      res.status(500).json({ message: "Failed to clean pet" });
    }
  });

  // Feeding system - Food +1G, Protein +2G
  app.post('/api/pets/:petId/feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { foodType } = req.body;

      if (!['meat', 'fish', 'protein'].includes(foodType)) {
        return res.status(400).json({ message: "Invalid food type" });
      }

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot feed a dead pet" });
      }

      if (pet.hunger >= 100) {
        return res.status(400).json({ message: "Pet is already full" });
      }

      const weightGain = foodType === 'protein' ? 2 : 1;
      const newWeight = pet.weight + weightGain;
      const newHunger = Math.min(pet.hunger + 25, 100); // Increase hunger by 25%
      
      // Update last fed time for hunger decay calculation
      await storage.updatePetStats(petId, {
        weight: newWeight,
        hunger: newHunger,
        lastFed: new Date()
      });

      // Record feeding activity
      await storage.createPetCareActivity({
        petId,
        userId,
        activityType: 'feed',
        foodType,
        weightChange: weightGain,
        statsChanged: JSON.stringify({ weight: weightGain, hunger: 1 })
      });

      res.json({ 
        message: "Pet fed successfully", 
        weightGain,
        newWeight,
        newHunger
      });
    } catch (error) {
      console.error("Error feeding pet:", error);
      res.status(500).json({ message: "Failed to feed pet" });
    }
  });

  // Training system - reduces weight by 2G, increases stats
  app.post('/api/pets/:petId/train', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { trainingType } = req.body;

      if (!['strength', 'effort'].includes(trainingType)) {
        return res.status(400).json({ message: "Invalid training type" });
      }

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot train a dead pet" });
      }

      if (pet.weight <= 5) {
        return res.status(400).json({ message: "Pet is too light to train safely" });
      }

      const newWeight = Math.max(pet.weight - 2, 5);
      const statIncrease = Math.floor(Math.random() * 10) + 5; // 5-14 increase
      
      const updateStats: any = { weight: newWeight };
      if (trainingType === 'strength') {
        updateStats.strength = Math.min(pet.strength + statIncrease, 999);
      } else {
        updateStats.effort = Math.min(pet.effort + statIncrease, 999);
      }

      await storage.updatePetStats(petId, updateStats);

      // Record training activity
      await storage.createPetCareActivity({
        petId,
        userId,
        activityType: 'train',
        weightChange: -2,
        statsChanged: JSON.stringify({ [trainingType]: statIncrease, weight: -2 })
      });

      res.json({ 
        message: "Training completed successfully", 
        weightLoss: 2,
        statIncrease,
        trainingType,
        newWeight
      });
    } catch (error) {
      console.error("Error training pet:", error);
      res.status(500).json({ message: "Failed to train pet" });
    }
  });

  // Battle system - reduces weight by 4G, can cause injuries
  app.post('/api/pets/:petId/battle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { opponentType } = req.body;

      if (!['wild', 'boss', 'tournament'].includes(opponentType)) {
        return res.status(400).json({ message: "Invalid opponent type" });
      }

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot battle with a dead pet" });
      }

      const dpRequired = opponentType === 'wild' ? 5 : opponentType === 'boss' ? 10 : 15;
      if (pet.dp < dpRequired) {
        return res.status(400).json({ message: "Not enough DP for this battle" });
      }

      // Battle calculation
      const opponentStrength = opponentType === 'wild' ? 50 + Math.random() * 100 
                              : opponentType === 'boss' ? 200 + Math.random() * 200 
                              : 400 + Math.random() * 300;

      const petPower = pet.strength + (pet.effort * 0.5) + Math.random() * 100;
      const battleResult = petPower > opponentStrength ? 'won' : Math.random() > 0.3 ? 'lost' : 'fled';
      
      const newWeight = Math.max(pet.weight - 4, 5);
      const newDp = Math.max(pet.dp - dpRequired, 0);
      const newTotalBattles = pet.totalBattles + 1;
      const newBattlesWon = battleResult === 'won' ? pet.battlesWon + 1 : pet.battlesWon;
      const newWinRatio = ((newBattlesWon / newTotalBattles) * 100).toFixed(2);

      // Injury chance if pet loses while upset
      let injuryOccurred = false;
      let newInjuries = pet.injuries;
      let newDailyInjuries = pet.dailyInjuries;
      
      if (battleResult === 'lost' && pet.isUpset) {
        injuryOccurred = Math.random() < 0.3; // 30% chance
        if (injuryOccurred) {
          newInjuries += 1;
          newDailyInjuries += 1;
        }
      }

      // Check if pet dies from injuries
      const isDead = newDailyInjuries >= 4;

      const updateStats: any = {
        weight: newWeight,
        dp: newDp,
        totalBattles: newTotalBattles,
        battlesWon: newBattlesWon,
        winRatio: newWinRatio,
        injuries: newInjuries,
        dailyInjuries: newDailyInjuries,
        isDead
      };

      // Stat gains for winning
      if (battleResult === 'won') {
        const strengthGain = Math.floor(Math.random() * 5) + 1;
        const effortGain = Math.floor(Math.random() * 3) + 1;
        updateStats.strength = Math.min(pet.strength + strengthGain, 999);
        updateStats.effort = Math.min(pet.effort + effortGain, 999);
      }

      await storage.updatePetStats(petId, updateStats);

      // Record battle
      await storage.createPetCareActivity({
        petId,
        userId,
        activityType: 'battle',
        weightChange: -4,
        battleResult,
        injuryOccurred,
        statsChanged: JSON.stringify({ 
          weight: -4, 
          dp: -dpRequired,
          result: battleResult,
          injury: injuryOccurred
        })
      });

      res.json({ 
        result: battleResult,
        weightLoss: 4,
        dpUsed: dpRequired,
        injuryOccurred,
        isDead,
        newWinRatio
      });
    } catch (error) {
      console.error("Error in battle:", error);
      res.status(500).json({ message: "Failed to complete battle" });
    }
  });

  // Respond to pet attention calls
  app.post('/api/pets/:petId/respond', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (!pet.needsAttention) {
        return res.status(400).json({ message: "Pet doesn't need attention" });
      }

      // Calculate response time
      const responseDelayMinutes = pet.lastAttentionCall 
        ? Math.floor((Date.now() - new Date(pet.lastAttentionCall).getTime()) / (1000 * 60))
        : 0;

      // Determine if this was a care mistake (>30 minutes delay)
      const isCareMistake = responseDelayMinutes > 30;

      if (isCareMistake) {
        await storage.updatePetStats(petId, {
          careMistakes: pet.careMistakes + 1,
          needsAttention: false,
          attentionType: null
        });
      } else {
        await storage.updatePetStats(petId, {
          needsAttention: false,
          attentionType: null,
          isUpset: false
        });
      }

      res.json({ 
        message: "Responded to pet call",
        wasCareMistake: isCareMistake,
        responseDelayMinutes
      });
    } catch (error) {
      console.error("Error responding to pet call:", error);
      res.status(500).json({ message: "Failed to respond to pet call" });
    }
  });

  // Heal pet injuries
  app.post('/api/pets/:petId/heal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.injuries === 0) {
        return res.status(400).json({ message: "Pet has no injuries to heal" });
      }

      await storage.updatePetStats(petId, {
        injuries: 0,
        dailyInjuries: 0,
        isDead: false
      });

      res.json({ 
        message: "Pet injuries healed successfully",
        injuriesHealed: pet.injuries
      });
    } catch (error) {
      console.error("Error healing pet:", error);
      res.status(500).json({ message: "Failed to heal pet" });
    }
  });

  // Clean pet - increases cleanliness
  app.post('/api/pets/:petId/clean', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot clean a dead pet" });
      }

      const newCleanliness = Math.min(pet.cleanliness + 25, 100);

      await storage.updatePetStats(petId, {
        cleanliness: newCleanliness,
        lastCleaned: new Date()
      });

      res.json({ 
        message: "Pet cleaned successfully",
        newCleanliness
      });
    } catch (error) {
      console.error("Error cleaning pet:", error);
      res.status(500).json({ message: "Failed to clean pet" });
    }
  });

  // Play with pet - increases happiness
  app.post('/api/pets/:petId/play', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);

      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.isDead) {
        return res.status(400).json({ message: "Cannot play with a dead pet" });
      }

      const newHappiness = Math.min(pet.happiness + 20, 100);
      const newEnergy = Math.max(pet.energy - 10, 0);

      await storage.updatePetStats(petId, {
        happiness: newHappiness,
        energy: newEnergy
      });

      res.json({ 
        message: "Pet enjoyed playing",
        newHappiness,
        newEnergy
      });
    } catch (error) {
      console.error("Error playing with pet:", error);
      res.status(500).json({ message: "Failed to play with pet" });
    }
  });

  // Pet care activity
  app.post('/api/pets/:petId/care', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { careType } = req.body;

      // Get the pet to verify ownership
      const pet = await storage.getPetById(petId);
      if (!pet || pet.userId !== userId) {
        return res.status(403).json({ message: "Pet not found or not owned by user" });
      }

      // Update care status based on type
      if (careType === 'feed') {
        // Update last fed time to current time (this resets hunger to 100%)
        await storage.updatePetLastFed(petId);
        
        // Create activity record
        await storage.createCareActivity({
          petId,
          userId,
          activityType: 'feed',
          completedAt: new Date(),
          pointsEarned: 0
        });
      } else if (careType === 'bathe') {
        await storage.createCareActivity({
          petId,
          userId,
          activityType: 'bathe',
          completedAt: new Date(),
          pointsEarned: 3
        });
        await storage.updateUserPoints(userId, 3);
      } else if (careType === 'sleep') {
        await storage.createCareActivity({
          petId,
          userId,
          activityType: 'sleep',
          completedAt: new Date(),
          pointsEarned: 3
        });
        await storage.updateUserPoints(userId, 3);
      } else if (careType === 'clean') {
        await storage.createCareActivity({
          petId,
          userId,
          activityType: 'clean',
          completedAt: new Date(),
          pointsEarned: 3
        });
        await storage.updateUserPoints(userId, 3);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error performing pet care:", error);
      res.status(500).json({ message: "Failed to perform pet care" });
    }
  });

  // Pet care activities
  app.post('/api/pets/:petId/care', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const petId = parseInt(req.params.petId);
      const { careType } = req.body;
      
      await storage.updateCareStatus(petId, userId, careType, true);
      
      // Check if all care is completed to award token
      const allCareCompleted = await storage.checkAllCareCompleted(petId);
      if (allCareCompleted) {
        await storage.awardDailyToken(userId, petId);
      }
      
      res.json({ message: "Care activity completed" });
    } catch (error) {
      console.error("Error updating care:", error);
      res.status(500).json({ message: "Failed to update care" });
    }
  });

  // Get daily care status
  app.get('/api/pets/:petId/care-status', isAuthenticated, async (req: any, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const careStatus = await storage.getTodaysCareStatus(petId);
      res.json(careStatus || {});
    } catch (error) {
      console.error("Error fetching care status:", error);
      res.status(500).json({ message: "Failed to fetch care status" });
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

  // Pet care routes
  app.post('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const petData = {
        ...req.body,
        userId
      };
      
      const pet = await storage.createPet(petData);
      res.json(pet);
    } catch (error) {
      console.error("Error creating pet:", error);
      res.status(500).json({ message: "Failed to create pet" });
    }
  });

  app.get('/api/pets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const pets = await storage.getPetsByUserId(userId);
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

  app.post('/api/pets/:petId/care/:careType', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { petId, careType } = req.params;
      
      if (!['fed', 'bathed', 'slept', 'cleaned'].includes(careType)) {
        return res.status(400).json({ message: "Invalid care type" });
      }
      
      await storage.updateCareStatus(parseInt(petId), userId, careType as any, true);
      
      // Check if all care is completed and award token
      const allCompleted = await storage.checkAllCareCompleted(parseInt(petId));
      if (allCompleted) {
        await storage.awardDailyToken(userId, parseInt(petId));
      }
      
      res.json({ success: true, allCompleted });
    } catch (error) {
      console.error("Error updating care status:", error);
      res.status(500).json({ message: "Failed to update care status" });
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
      
      // Get appointment details before updating for email notification
      const allAppointments = await storage.getAllAppointments();
      const appointment = allAppointments.find(apt => apt.id === parseInt(id));
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Update appointment status
      await storage.updateAppointmentStatus(parseInt(id), status);
      
      // Send email notification based on status change
      const user = await storage.getUser(appointment.userId);
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

  // Update toy owner (admin only)
  app.patch('/api/admin/toys/:toyId/owner', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
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

  // Delete toy (admin only)
  app.delete('/api/admin/toys/:toyId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const toyId = parseInt(req.params.toyId);
      await storage.deleteToy(toyId);
      res.json({ message: "Toy deleted successfully" });
    } catch (error) {
      console.error("Error deleting toy:", error);
      res.status(500).json({ message: "Failed to delete toy" });
    }
  });

  // Admin endpoint - Update user profile (PUT)
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

  // Admin endpoint - Update user profile (PATCH)
  app.patch('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { firstName, lastName, email, phoneNumber, gender, dateOfBirth, role } = req.body;
      
      await storage.updateUserProfile(userId, {
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

  app.post('/api/redeem-reward', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
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

      res.json({ 
        message: 'Reward redeemed successfully',
        creditAdded: reward.type === 'credit' ? reward.creditAmount : null
      });
    } catch (error) {
      console.error("Error redeeming reward:", error);
      res.status(500).json({ message: "Failed to redeem reward" });
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
        tokens: user.tokens || 0,
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

  // Game scores routes
  app.post('/api/game-scores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { petId, score } = req.body;
      
      // Create the game score record (no tokens awarded)
      const gameScore = await storage.createGameScore({
        userId,
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
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getTopGameScores(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/game-scores/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userScores = await storage.getUserGameScores(userId);
      res.json(userScores);
    } catch (error: any) {
      console.error("Error fetching user scores:", error);
      res.status(500).json({ message: "Failed to fetch user scores" });
    }
  });

  // Admin route to reset leaderboard
  app.delete('/api/admin/game-scores/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const activatedPets = await storage.getAllActivatedPetsWithDetails();
      res.json(activatedPets);
    } catch (error: any) {
      console.error("Error fetching activated pets:", error);
      res.status(500).json({ message: "Failed to fetch activated pets" });
    }
  });

  // Admin pet editing
  app.put('/api/admin/pets/:petId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { tokensRequested } = req.body;
      
      if (!tokensRequested || tokensRequested <= 0) {
        return res.status(400).json({ message: "Valid token amount required" });
      }
      
      // Check if user has enough tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokensRequested) {
        return res.status(400).json({ message: "Insufficient tokens" });
      }

      // Deduct tokens from user account
      await storage.deductUserTokens(userId, tokensRequested);

      // Create token claim request (no shipping address - redeem at approved locations)
      const claim = await storage.createTokenClaim({
        userId,
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
      const adminUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUser(adminUserId);
      
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const claims = await storage.getTokenClaims();
      res.json(claims);
    } catch (error) {
      console.error("Error fetching token claims:", error);
      res.status(500).json({ message: "Failed to fetch token claims" });
    }
  });

  // User route to get their own token claim history
  app.get('/api/token-claims/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const claims = await storage.getTokenClaimsByUserId(userId);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching user token claims:", error);
      res.status(500).json({ message: "Failed to fetch token claims history" });
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
      res.json({ message: "Token claim updated successfully" });
    } catch (error) {
      console.error("Error updating token claim:", error);
      res.status(500).json({ message: "Failed to update token claim" });
    }
  });

  // Admin route to update user tokens directly
  app.patch('/api/admin/users/:userId/tokens', isAuthenticated, async (req: any, res) => {
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
      
      await storage.updateUserTokens(userId, tokens);
      res.json({ message: "User tokens updated successfully" });
    } catch (error) {
      console.error("Error updating user tokens:", error);
      res.status(500).json({ message: "Failed to update user tokens" });
    }
  });

  // Admin add tokens to user
  app.post('/api/admin/users/:userId/add-tokens', isAuthenticated, async (req: any, res) => {
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
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Add tokens to pet's claimable pool (not directly to wallet)
      await storage.updatePetTokens(userId, amount);
      
      // Create a transaction record for admin token addition
      await storage.createTransaction({
        userId,
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

  return httpServer;
}
