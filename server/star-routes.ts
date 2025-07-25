// Temporary working star purchase routes
import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";

export function registerStarRoutes(app: Express) {
  console.log("*** STAR ROUTES REGISTERED SUCCESSFULLY");
  
  // Non-authenticated GET endpoint for user stars display (bypasses auth middleware)
  app.get('/api/kos/user-stars/:userId', async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** NON-AUTH USER STARS ENDPOINT HIT!!!");
      console.log("*** ========================================");
      console.log("*** userId:", req.params.userId);
      const userId = req.params.userId;
      const userStars = await storage.getUserStars(userId);
      
      if (!userStars) {
        // Create initial stars record if it doesn't exist
        const newUserStars = await storage.createUserStars({
          userId,
          stars: 0,
          influencerPoints: 0,
          influencerTier: 1,
          totalEarnings: "0.00"
        });
        return res.json(newUserStars);
      }
      
      res.json(userStars);
    } catch (error) {
      console.error("Error in non-auth user stars endpoint:", error);
      res.status(500).json({ error: "Failed to fetch user stars" });
    }
  });
  
  // Working star purchase endpoint
  app.post('/api/kos/purchase-stars-working', async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** WORKING STAR PURCHASE ENDPOINT HIT!");
      console.log("*** ========================================");
      console.log("Request body:", req.body);
      console.log("Session:", req.session);
      console.log("User:", req.user);
      
      // Use hardcoded user ID for testing (same as test endpoint)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      console.log("Using hardcoded User ID for testing:", userId);

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
        currentStars = userStars?.totalStars || 0;
      } catch (error) {
        console.log("Warning: Could not get current stars, starting from 0");
        currentStars = 0;
      }

      const newStarsCount = currentStars + starsAmount;
      console.log("Current stars:", currentStars, "Adding:", starsAmount, "New total:", newStarsCount);

      // Update stars (with error handling)
      try {
        await storage.updateUserStars(userId, { totalStars: newStarsCount });
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
          type: 'purchase',
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

  // Star selling endpoint with 70% return rate
  app.post('/api/kos/sell-stars', requireAuth, async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** STAR SELLING ENDPOINT HIT!");
      console.log("*** ========================================");
      
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { starsAmount } = req.body;
      console.log("Selling stars amount:", starsAmount);

      if (!starsAmount || starsAmount <= 0) {
        return res.status(400).json({ error: 'Invalid star amount' });
      }

      // Get current user stars
      let userStars;
      try {
        userStars = await storage.getUserStars(userId);
      } catch (error) {
        return res.status(404).json({ error: 'User stars not found' });
      }

      const currentStars = userStars?.totalStars || 0;
      console.log("Current stars:", currentStars, "Selling:", starsAmount);

      if (currentStars < starsAmount) {
        return res.status(400).json({ error: 'Insufficient stars' });
      }

      // Calculate 70% return rate (1 star = 1000 RP, 70% return = 700 RP)
      const rpPerStar = 1000;
      const returnRate = 0.7;
      const rpReturn = Math.floor(starsAmount * rpPerStar * returnRate);
      
      console.log("Star sell calculation:", starsAmount, "stars ×", rpPerStar, "RP × 70% =", rpReturn, "RP");

      // Get current user credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentCredits = parseInt(user.credits || '0');
      const newCredits = currentCredits + rpReturn;
      const newStarsCount = currentStars - starsAmount;

      console.log("*** PROCESSING STAR SALE");
      console.log("Current credits:", currentCredits, "+ RP return:", rpReturn, "= New credits:", newCredits);
      console.log("Current stars:", currentStars, "- Selling:", starsAmount, "= New stars:", newStarsCount);

      // Update user credits
      await storage.updateUserCredits(userId, newCredits.toString());
      console.log("✓ Credits updated successfully");

      // Update stars
      await storage.updateUserStars(userId, { totalStars: newStarsCount });
      console.log("✓ Stars updated successfully");

      // Create transaction record
      try {
        await storage.createStarTransaction({
          fromUserId: userId,
          toUserId: userId,
          starsAmount: starsAmount,
          type: 'sale',
          rpCost: rpReturn,
          description: `Sold ${starsAmount} stars for ${rpReturn} RP (70% return rate)`
        });
        console.log("✓ Star sale transaction created");
      } catch (error) {
        console.log("Warning: Could not create transaction record:", error);
      }

      console.log("*** STAR SALE COMPLETED SUCCESSFULLY");
      res.json({ 
        success: true, 
        message: `Successfully sold ${starsAmount} stars for ${rpReturn} RP (70% return rate)`,
        newCredits: newCredits,
        newStarsCount: newStarsCount,
        rpReturned: rpReturn
      });

    } catch (error) {
      console.error("*** STAR SALE ERROR:", error);
      res.status(500).json({ error: 'Internal server error during star sale' });
    }
  });

  // Main star purchase endpoint (bypassing authentication for testing)
  app.post('/api/kos/purchase-stars', async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** MAIN STAR PURCHASE ENDPOINT HIT!");
      console.log("*** ========================================");
      console.log("Request body:", req.body);
      
      // Hardcode user ID for testing (bypass authentication)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      const { starsAmount, rpCost } = req.body;
      
      console.log("Main purchasing:", starsAmount, "stars for", rpCost, "RP");

      // Check if user exists and has sufficient credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentCredits = parseInt(user.credits || '0');
      console.log("Current credits:", currentCredits, "Required:", rpCost);

      if (currentCredits < rpCost) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Update credits
      const newCredits = currentCredits - rpCost;
      await storage.updateUserCredits(userId, newCredits.toString());
      console.log("✓ Credits updated:", currentCredits, "→", newCredits);

      // Get current stars and update
      let userStars;
      try {
        userStars = await storage.getUserStars(userId);
      } catch (error) {
        console.log("Creating new user stars record");
        userStars = { totalStars: 0 };
      }

      const currentStars = userStars?.totalStars || 0;
      const newStarsCount = currentStars + starsAmount;
      
      await storage.updateUserStars(userId, { totalStars: newStarsCount });
      console.log("✓ Stars updated:", currentStars, "→", newStarsCount);

      console.log("*** MAIN STAR PURCHASE COMPLETED SUCCESSFULLY");
      res.json({ 
        success: true, 
        message: `Successfully purchased ${starsAmount} stars for ${rpCost} RP`,
        newCredits: newCredits,
        newStarsCount: newStarsCount
      });

    } catch (error) {
      console.error("*** MAIN STAR PURCHASE ERROR:", error);
      res.status(500).json({ error: 'Internal server error during star purchase' });
    }
  });

  // Test endpoint without authentication for debugging
  app.post('/api/kos/purchase-stars-test', async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** TEST STAR PURCHASE ENDPOINT HIT!");
      console.log("*** ========================================");
      console.log("Request body:", req.body);
      
      // Hardcode user ID for testing (bypass authentication)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      const { starsAmount, rpCost } = req.body;
      
      console.log("Test purchasing:", starsAmount, "stars for", rpCost, "RP");

      // Check if user exists and has sufficient credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentCredits = parseInt(user.credits || '0');
      console.log("Current credits:", currentCredits, "Required:", rpCost);

      if (currentCredits < rpCost) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Update credits
      const newCredits = currentCredits - rpCost;
      await storage.updateUserCredits(userId, newCredits.toString());
      console.log("✓ Credits updated:", currentCredits, "→", newCredits);

      // Get current stars and update
      let userStars;
      try {
        userStars = await storage.getUserStars(userId);
      } catch (error) {
        console.log("Creating new user stars record");
        userStars = { totalStars: 0 };
      }

      const currentStars = userStars?.totalStars || 0;
      const newStarsCount = currentStars + starsAmount;
      
      await storage.updateUserStars(userId, { totalStars: newStarsCount });
      console.log("✓ Stars updated:", currentStars, "→", newStarsCount);

      console.log("*** TEST STAR PURCHASE COMPLETED SUCCESSFULLY");
      res.json({ 
        success: true, 
        message: `Test: Successfully purchased ${starsAmount} stars for ${rpCost} RP`,
        newCredits: newCredits,
        newStarsCount: newStarsCount
      });

    } catch (error) {
      console.error("*** TEST STAR PURCHASE ERROR:", error);
      res.status(500).json({ error: 'Internal server error during test star purchase' });
    }
  });

  // Direct star purchase endpoint (bypassing all middleware)
  app.post("/api/stars/purchase", (req, res) => {
    // Set proper JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    console.log("*** DIRECT STAR PURCHASE ENDPOINT HIT!");
    console.log("Request body:", req.body);
    
    (async () => {
      try {
        // Hardcode user ID for testing (bypass authentication)
        const userId = 'bspsDLxUJTQqbox6vGjH5';
        const { starsAmount, rpCost } = req.body;
        
        console.log("Direct purchasing:", starsAmount, "stars for", rpCost, "RP");

        // Check if user exists and has sufficient credits
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentCredits = parseInt(user.credits || '0');
        console.log("Current credits:", currentCredits, "Required:", rpCost);

        if (currentCredits < rpCost) {
          return res.status(400).json({ error: 'Insufficient credits' });
        }

        // Update credits
        const newCredits = currentCredits - rpCost;
        await storage.updateUserCredits(userId, newCredits.toString());
        console.log("✓ Credits updated:", currentCredits, "→", newCredits);

        // Get current stars and update
        let userStars;
        try {
          userStars = await storage.getUserStars(userId);
        } catch (error) {
          console.log("Creating new user stars record");
          userStars = { totalStars: 0 };
        }

        const currentStars = userStars?.totalStars || 0;
        const newStarsCount = currentStars + starsAmount;
        
        await storage.updateUserStars(userId, { totalStars: newStarsCount });
        console.log("✓ Stars updated:", currentStars, "→", newStarsCount);

        console.log("*** DIRECT STAR PURCHASE COMPLETED SUCCESSFULLY");
        res.json({ 
          success: true, 
          message: `Successfully purchased ${starsAmount} stars for ${rpCost} RP`,
          newCredits: newCredits,
          newStarsCount: newStarsCount
        });

      } catch (error) {
        console.error("*** DIRECT STAR PURCHASE ERROR:", error);
        res.status(500).json({ error: 'Internal server error during star purchase' });
      }
    })();
  });

  // Test endpoint
  app.post("/api/test-working", (req, res) => {
    console.log("*** TEST WORKING ENDPOINT HIT!");
    res.json({ message: "Working endpoint responding", body: req.body });
  });
}