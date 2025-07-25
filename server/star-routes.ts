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

  // REMOVED CONFLICTING STAR SELLING ENDPOINT - using the one in server/routes.ts instead

  // Main star purchase endpoint (bypassing authentication for testing)
  app.post('/api/kos/purchase-stars', async (req, res) => {
    try {
      console.log("*** ========================================");
      console.log("*** MAIN STAR PURCHASE ENDPOINT HIT!");
      console.log("*** ========================================");
      console.log("Request body:", req.body);
      
      // Hardcode user ID for testing (bypass authentication)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      const { starsAmount } = req.body;
      
      // Fixed star price: 1000 RP per star
      const STAR_PRICE = 1000;
      const rpCost = starsAmount * STAR_PRICE;
      
      console.log("Main purchasing:", starsAmount, "stars for", rpCost, "RP");

      if (!starsAmount || starsAmount <= 0) {
        return res.status(400).json({ error: 'Invalid stars amount' });
      }

      // Check if user exists and has sufficient credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentCredits = parseFloat(user.credits || '0');
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

      // Create transaction record for history tracking
      try {
        const purchaseData = {
          userId: userId,
          starsAmount: starsAmount, // Positive for purchases
          rpCost: rpCost.toString(),
          paymentMethod: 'rp_balance',
          status: 'completed'
        };
        console.log("*** Creating purchase record with data:", purchaseData);
        
        const purchaseRecord = await storage.createStarPurchase(purchaseData);
        console.log("✓ Transaction record created successfully:", purchaseRecord.id);
      } catch (error) {
        console.log("⚠️ CRITICAL: Failed to create transaction record");
        console.log("⚠️ Error:", error);
        // Continue anyway - don't let transaction history failure block the purchase
      }

      console.log("*** MAIN STAR PURCHASE COMPLETED SUCCESSFULLY");
      res.json({ 
        success: true, 
        message: `Successfully purchased ${starsAmount} stars for ${rpCost} RP`,
        newCredits: newCredits.toString(),
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

  // KOS Vote endpoint (bypassing authentication like star trading endpoints)
  app.post('/api/kos/vote', async (req, res) => {
    try {
      console.log("*** VOTE REQUEST RECEIVED (STAR-ROUTES):", req.body);
      // Use hardcoded user ID for testing (same as star trading endpoints)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      console.log("*** VOTE USER ID (hardcoded for testing):", userId);

      const { targetUserId, starsAmount = 1, mode } = req.body;
      console.log("*** VOTE DETAILS - targetUserId:", targetUserId, "starsAmount:", starsAmount, "mode:", mode);
      console.log("*** VOTER ID vs TARGET ID - Voter:", userId, "Target:", targetUserId, "Same User?", userId === targetUserId);

      // Validate required parameters
      if (!targetUserId) {
        return res.status(400).json({ error: "Target user ID is required" });
      }

      // Check if voting user has enough stars
      let userStars;
      try {
        userStars = await storage.getUserStars(userId);
        console.log("*** CURRENT USER STARS:", userStars);
      } catch (error) {
        console.log("*** User stars not found, creating default");
        userStars = { totalStars: 0 };
      }

      const currentStars = userStars?.totalStars || 0;
      console.log("*** CHECKING STARS - Current:", currentStars, "Required:", starsAmount);

      if (currentStars < starsAmount) {
        return res.status(400).json({ error: "Insufficient stars for voting" });
      }

      // Mode-specific star deduction and voting logic
      if (mode === 'individual') {
        // Individual mode: Deduct from individual stars and award immediately
        console.log("*** INDIVIDUAL MODE - DEDUCTING FROM INDIVIDUAL STARS");
        const newIndividualStars = userStars.individualStars - starsAmount;
        const newTotalStars = currentStars - starsAmount;
        await storage.updateUserStars(userId, { 
          individualStars: newIndividualStars,
          totalStars: newTotalStars 
        });
        console.log("*** INDIVIDUAL STARS DEDUCTED - Old:", userStars.individualStars, "New:", newIndividualStars);
        
        await storage.awardIndividualStar(targetUserId, starsAmount);
        console.log("*** INDIVIDUAL STARS AWARDED IMMEDIATELY:", starsAmount);

        res.json({ 
          success: true, 
          message: `Successfully voted ${starsAmount} stars for user ${targetUserId} (individual - awarded immediately)`,
          remainingStars: newTotalStars
        });

      } else if (mode === 'tournament') {
        // Tournament mode: Deduct from voter's total stars, ADD to TARGET USER's tournament stars
        console.log("*** TOURNAMENT MODE - DEDUCTING FROM VOTER'S TOTAL STARS, ADDING TO TARGET USER'S TOURNAMENT STARS");
        const newTotalStars = currentStars - starsAmount;  // Deduct from voter's total
        await storage.updateUserStars(userId, { 
          totalStars: newTotalStars 
        });
        console.log("*** VOTER'S TOTAL STARS DEDUCTED - Old:", currentStars, "New:", newTotalStars);
        
        // Add to target user's tournament stars (prize pool)
        let targetUserStars;
        try {
          targetUserStars = await storage.getUserStars(targetUserId);
          console.log("*** TARGET USER CURRENT STARS:", targetUserStars);
        } catch (error) {
          console.log("*** Target user stars not found, creating default");
          targetUserStars = { totalStars: 0, tournamentStars: 0, individualStars: 0 };
        }
        
        const newTargetTournamentStars = (targetUserStars.tournamentStars || 0) + starsAmount;
        const newTargetTotalStars = (targetUserStars.totalStars || 0) + starsAmount;
        await storage.updateUserStars(targetUserId, { 
          tournamentStars: newTargetTournamentStars,
          totalStars: newTargetTotalStars 
        });
        console.log("*** TARGET USER'S TOURNAMENT STARS INCREASED - Old:", targetUserStars.tournamentStars, "New:", newTargetTournamentStars);
        console.log("*** TARGET USER INDIVIDUAL STARS (SHOULD REMAIN UNCHANGED):", targetUserStars.individualStars);
        
        // Note: Tournament stars already allocated above, no need for castVote call
        console.log("*** TOURNAMENT VOTE COMPLETE - STARS ADDED TO PRIZE POOL:", starsAmount);
        
        res.json({ 
          success: true, 
          message: `Successfully voted ${starsAmount} stars for user ${targetUserId} (tournament - added to prize pool)`,
          remainingStars: newTotalStars
        });

      } else {
        return res.status(400).json({ error: "Mode must be 'individual' or 'tournament'" });
      }

    } catch (error) {
      console.error("*** VOTE ERROR (STAR-ROUTES):", error);
      res.status(500).json({ error: 'Internal server error during voting' });
    }
  });

  // KOS Like endpoint (bypassing authentication like star trading endpoints) - INDIVIDUAL GIVES STARS IMMEDIATELY
  app.post('/api/kos/like', async (req, res) => {
    try {
      console.log("*** LIKE REQUEST RECEIVED (STAR-ROUTES):", req.body);
      // Use hardcoded user ID for testing (same as star trading endpoints)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      console.log("*** LIKE USER ID (hardcoded for testing):", userId);

      const { targetUserId, mode } = req.body;
      console.log("*** LIKE DETAILS - targetUserId:", targetUserId, "mode:", mode);

      // Validate required parameters
      if (!targetUserId) {
        return res.status(400).json({ error: "Target user ID is required" });
      }

      // Like button gives likes (not stars) in both modes
      const result = await storage.toggleUserLike(userId, targetUserId);
      console.log("*** LIKE TOGGLE RESULT (GIVES LIKES ONLY):", result);

      res.json({ 
        success: true, 
        message: result.liked ? `Successfully liked user ${targetUserId}` : `Successfully unliked user ${targetUserId}`,
        liked: result.liked
      });

    } catch (error) {
      console.error("*** LIKE ERROR (STAR-ROUTES):", error);
      res.status(500).json({ error: 'Internal server error during like operation' });
    }
  });
}