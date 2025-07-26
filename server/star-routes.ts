// Temporary working star purchase routes
import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth, getUserId } from "./multiAuth";

export function registerStarRoutes(app: Express) {
  console.log("*** STAR ROUTES REGISTERED SUCCESSFULLY");
  console.log("*** SETTING UP /api/kos/vote ENDPOINT IN STAR-ROUTES.TS");
  
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
      console.log("*** ========================================");
      console.log("*** VOTE ENDPOINT HIT IN STAR-ROUTES.TS!");
      console.log("*** ========================================");
      console.log("*** VOTE REQUEST RECEIVED (STAR-ROUTES):", req.body);
      console.log("*** CURRENT TIMESTAMP:", new Date().toISOString());
      
      // Use hardcoded user ID for testing (same as star trading endpoints)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      console.log("*** VOTE USER ID (hardcoded for testing):", userId);

      const { targetUserId, starsAmount = 1, mode } = req.body;
      console.log("*** VOTE DETAILS - targetUserId:", targetUserId, "starsAmount:", starsAmount, "mode:", mode);
      console.log("*** MODE TYPE CHECK - typeof mode:", typeof mode, "mode value:", JSON.stringify(mode));
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
        // Individual mode: Deduct from voter's TOTAL stars (payment), award individual stars to target
        console.log("*** INDIVIDUAL MODE - DEDUCTING FROM VOTER'S TOTAL STARS");
        const newTotalStars = currentStars - starsAmount;
        await storage.updateUserStars(userId, { 
          totalStars: newTotalStars 
        });
        console.log("*** VOTER'S TOTAL STARS DEDUCTED - Old:", currentStars, "New:", newTotalStars);
        
        await storage.awardIndividualStar(targetUserId, starsAmount, false);
        console.log("*** INDIVIDUAL STARS AWARDED TO TARGET IMMEDIATELY:", starsAmount);

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
        
        // TOURNAMENT TIMER SYSTEM: Check/Create active tournament and set 7-day timer
        await ensureActiveTournament();
        console.log("*** TOURNAMENT TIMER ACTIVATED - 7-day countdown started for prize pool distribution");
        
        res.json({ 
          success: true, 
          message: `Successfully voted ${starsAmount} stars for user ${targetUserId} (tournament - added to prize pool, 7-day timer activated)`,
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
      console.log("*** ========== LIKE REQUEST START ==========");
      console.log("*** LIKE REQUEST RECEIVED (STAR-ROUTES):", req.body);
      console.log("*** REQUEST HEADERS:", req.headers);
      
      // Use hardcoded user ID for testing (same as star trading endpoints)
      const userId = 'bspsDLxUJTQqbox6vGjH5';
      console.log("*** LIKE USER ID (hardcoded for testing):", userId);

      const { targetUserId, mode } = req.body;
      console.log("*** LIKE DETAILS - targetUserId:", targetUserId, "mode:", mode);

      // Validate required parameters
      if (!targetUserId) {
        console.log("*** LIKE ERROR: Missing targetUserId");
        return res.status(400).json({ error: "Target user ID is required" });
      }

      console.log("*** CALLING STORAGE.TOGGLEUSERLIKE");
      // Like button gives likes AND awards stars based on mode
      const result = await storage.toggleUserLike(userId, targetUserId, mode);
      console.log("*** LIKE TOGGLE RESULT (MODE-SPECIFIC STARS):", result);

      console.log("*** LIKE SUCCESS - SENDING RESPONSE");
      res.json({ 
        success: true, 
        message: result.liked ? `Successfully liked user ${targetUserId}` : `Successfully unliked user ${targetUserId}`,
        liked: result.liked
      });
      
      console.log("*** ========== LIKE REQUEST END ==========");

    } catch (error) {
      console.error("*** LIKE ERROR (STAR-ROUTES):", error);
      console.error("*** LIKE ERROR STACK:", error.stack);
      res.status(500).json({ error: 'Internal server error during like operation' });
    }
  });

  console.log("*** STAR ROUTES REGISTERED SUCCESSFULLY");
}

// Tournament Timer System Functions
let activeTournamentTimer: NodeJS.Timeout | null = null;

// Ensure there's an active tournament, create one if needed
async function ensureActiveTournament() {
  try {
    // Check for existing active tournament
    const activeTournaments = await storage.getActiveTournaments();
    console.log("*** CHECKING ACTIVE TOURNAMENTS:", activeTournaments.length);
    
    if (activeTournaments.length === 0) {
      // Create new 7-day tournament
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
      
      const newTournament = await storage.createTournament({
        name: `Weekly Tournament ${startDate.toLocaleDateString()}`,
        type: 'weekly',
        status: 'active',
        startDate,
        endDate,
        totalStarPool: 0,
        isDistributed: false
      });
      
      console.log("*** NEW TOURNAMENT CREATED:", newTournament.id, "End Date:", endDate);
      
      // Set timer for tournament end (7 days)
      const timeUntilEnd = endDate.getTime() - Date.now();
      if (activeTournamentTimer) {
        clearTimeout(activeTournamentTimer);
      }
      
      activeTournamentTimer = setTimeout(async () => {
        await distributeTournamentPrizes(newTournament.id);
      }, timeUntilEnd);
      
      console.log("*** TOURNAMENT TIMER SET - Will distribute prizes in", Math.round(timeUntilEnd / (1000 * 60 * 60 * 24)), "days");
      
    } else {
      const tournament = activeTournaments[0];
      console.log("*** ACTIVE TOURNAMENT EXISTS:", tournament.id, "End Date:", tournament.endDate);
      
      // Check if timer needs to be set (in case of server restart)
      const timeUntilEnd = new Date(tournament.endDate).getTime() - Date.now();
      if (timeUntilEnd > 0 && !activeTournamentTimer) {
        activeTournamentTimer = setTimeout(async () => {
          await distributeTournamentPrizes(tournament.id);
        }, timeUntilEnd);
        
        console.log("*** TOURNAMENT TIMER RESTORED - Will distribute prizes in", Math.round(timeUntilEnd / (1000 * 60 * 60 * 24)), "days");
      }
    }
  } catch (error) {
    console.error("*** ERROR ENSURING ACTIVE TOURNAMENT:", error);
  }
}

// Distribute tournament prizes to top 10 users
async function distributeTournamentPrizes(tournamentId: number) {
  try {
    console.log("*** DISTRIBUTING TOURNAMENT PRIZES FOR TOURNAMENT:", tournamentId);
    
    // Get all KOS users with their tournament stars (sorted by tournament stars desc)
    const users = await storage.getKOSUsersWithRankings('tournament');
    console.log("*** TOURNAMENT PARTICIPANTS:", users.length);
    
    // Get top 10 users based on tournament stars
    const topUsers = users.slice(0, 10);
    console.log("*** TOP 10 USERS FOR PRIZE DISTRIBUTION:", topUsers.map(u => ({ name: u.name, tournamentStars: u.tournamentStars })));
    
    // Calculate total prize pool from all tournament stars
    const totalPrizePool = users.reduce((sum, user) => sum + (user.tournamentStars || 0), 0);
    console.log("*** TOTAL PRIZE POOL:", totalPrizePool, "stars");
    
    if (totalPrizePool > 0 && topUsers.length > 0) {
      // Prize distribution percentages for top 10
      const prizePercentages = [30, 20, 15, 10, 8, 6, 4, 3, 2, 2]; // Total: 100%
      
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const percentage = prizePercentages[i] || 0;
        const prizeAmount = Math.floor((totalPrizePool * percentage) / 100);
        
        if (prizeAmount > 0) {
          // Award prize as individual stars (immediately usable)
          const currentStars = await storage.getUserStars(user.id);
          const newIndividualStars = (currentStars?.individualStars || 0) + prizeAmount;
          const newTotalStars = (currentStars?.totalStars || 0) + prizeAmount;
          
          await storage.updateUserStars(user.id, {
            individualStars: newIndividualStars,
            totalStars: newTotalStars,
            tournamentStars: 0 // Reset tournament stars for next competition
          });
          
          console.log(`*** PRIZE AWARDED - ${user.name}: ${prizeAmount} stars (${percentage}% of ${totalPrizePool})`);
        }
      }
      
      // Reset all users' tournament stars to 0 for next competition
      for (const user of users) {
        if (user.tournamentStars > 0) {
          const currentStars = await storage.getUserStars(user.id);
          await storage.updateUserStars(user.id, {
            tournamentStars: 0
          });
        }
      }
    }
    
    // Mark tournament as completed
    await storage.updateTournamentStatus(tournamentId, 'completed');
    console.log("*** TOURNAMENT", tournamentId, "COMPLETED AND PRIZES DISTRIBUTED");
    
    // Clear the timer
    if (activeTournamentTimer) {
      clearTimeout(activeTournamentTimer);
      activeTournamentTimer = null;
    }
    
  } catch (error) {
    console.error("*** ERROR DISTRIBUTING TOURNAMENT PRIZES:", error);
  }
}

// Initialize tournament system on server start
ensureActiveTournament();