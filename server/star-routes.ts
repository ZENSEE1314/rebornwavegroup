// Temporary working star purchase routes
import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";

export function registerStarRoutes(app: Express) {
  console.log("*** STAR ROUTES REGISTERED SUCCESSFULLY");
  
  // Working star purchase endpoint
  app.post('/api/kos/purchase-stars-working', requireAuth, async (req, res) => {
    console.log("*** ========================================");
    console.log("*** WORKING STAR PURCHASE ENDPOINT HIT!");
    console.log("*** ========================================");
    console.log("Request body:", req.body);
    console.log("Session:", req.session);
    console.log("User:", req.user);
    
    try {
      const userId = getUserId(req);
      console.log("Extracted User ID:", userId);
      
      if (!userId) {
        console.log("*** NO USER ID - Authentication failed");
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { starsAmount, rpCost } = req.body;
      console.log("Stars amount:", starsAmount, "RP cost:", rpCost);

      if (!starsAmount || starsAmount <= 0 || !rpCost || rpCost <= 0) {
        console.log("*** INVALID PARAMETERS");
        return res.status(400).json({ error: 'Invalid star amount or RP cost' });
      }

      // Check user's current credits
      const user = await storage.getUser(userId);
      console.log("Current user data:", user);
      
      if (!user) {
        console.log("*** USER NOT FOUND");
        return res.status(404).json({ error: 'User not found' });
      }

      const currentCredits = parseInt(user.credits || '0');
      console.log("Current credits:", currentCredits, "Required RP:", rpCost);
      
      if (currentCredits < rpCost) {
        console.log("*** INSUFFICIENT CREDITS");
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Calculate new credits
      const newCredits = currentCredits - rpCost;
      console.log("*** PROCESSING STAR PURCHASE - New credits will be:", newCredits);

      // Update user credits (using existing working method)
      await storage.updateUserCredits(userId, newCredits.toString());
      console.log("✓ Credits updated successfully");

      // Get current stars (with error handling)
      let currentStars = 0;
      try {
        const userStars = await storage.getUserStars(userId);
        currentStars = userStars?.stars || 0;
      } catch (error) {
        console.log("Warning: Could not get current stars, starting from 0");
        currentStars = 0;
      }

      const newStarsCount = currentStars + starsAmount;
      console.log("Current stars:", currentStars, "Adding:", starsAmount, "New total:", newStarsCount);

      // Update stars (with error handling)
      try {
        await storage.updateUserStars(userId, newStarsCount);
        console.log("✓ Stars updated successfully");
      } catch (error) {
        console.log("Error updating stars:", error);
        // Rollback credits if star update fails
        await storage.updateUserCredits(userId, currentCredits.toString());
        return res.status(500).json({ error: 'Failed to update stars, transaction rolled back' });
      }

      // Create transaction record (with error handling)
      try {
        await storage.createStarTransaction({
          fromUserId: userId,
          toUserId: userId,
          starsAmount: starsAmount,
          transactionType: 'purchase',
          rpCost: rpCost,
          description: `Purchased ${starsAmount} stars for ${rpCost} RP`
        });
        console.log("✓ Star transaction created");
      } catch (error) {
        console.log("Warning: Could not create transaction record:", error);
        // Don't fail the transaction for this
      }

      console.log("*** STAR PURCHASE COMPLETED SUCCESSFULLY");
      res.json({ 
        success: true, 
        message: `Successfully purchased ${starsAmount} stars for ${rpCost} RP`,
        newCredits: newCredits,
        newStarsCount: newStarsCount
      });

    } catch (error) {
      console.error("*** STAR PURCHASE ERROR:", error);
      res.status(500).json({ error: 'Internal server error during star purchase' });
    }
  });

  // Test endpoint
  app.post("/api/test-working", (req, res) => {
    console.log("*** TEST WORKING ENDPOINT HIT!");
    res.json({ message: "Working endpoint responding", body: req.body });
  });
}