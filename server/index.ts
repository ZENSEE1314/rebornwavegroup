import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerStarRoutes } from "./star-routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Force HTTPS redirect for custom domain
app.use((req, res, next) => {
  if (req.hostname === 'rebornwavegroup.com' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Global request logging for debugging star purchase issue
app.use((req, res, next) => {
  if (req.url.includes('purchase-stars') || req.url.includes('/api/kos')) {
    console.log(`*** GLOBAL REQUEST: ${req.method} ${req.url}`);
    console.log('*** REQUEST BODY:', req.body);
    console.log('*** USER SESSION:', req.user);
    console.log('*** SESSION:', req.session);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register working star routes FIRST (bypass route conflicts)
  registerStarRoutes(app);
  
  const server = await registerRoutes(app);

  // Background pet decay system - runs every 3 minutes
  const startBackgroundDecay = () => {
    setInterval(async () => {
      try {
        const { db } = await import('./db.js');
        const { pets } = await import('../shared/schema.js');
        const { eq } = await import('drizzle-orm');
        
        // Get all active pets
        const allPets = await db.select().from(pets).where(eq(pets.isActive, true));
        console.log(`🔄 Background decay check: Found ${allPets.length} active pets`);
        
        for (const pet of allPets) {
          const now = new Date();
          const lastDecayTime = pet.lastDecayTime ? new Date(pet.lastDecayTime) : new Date(pet.createdAt || now);
          const minutesSinceLastDecay = Math.floor((now.getTime() - lastDecayTime.getTime()) / (1000 * 60));
          
          // Calculate decay intervals (every 3 minutes)
          const decayIntervals = Math.floor(minutesSinceLastDecay / 3);
          
          console.log(`Pet ${pet.name} (ID: ${pet.id}): ${minutesSinceLastDecay} mins since decay, ${decayIntervals} intervals`);
          
          if (decayIntervals > 0) {
            // Apply gradual decay rates
            // Hunger and cleanliness: 1% per 3-minute interval (slow decay)
            // After 5 hours (100 intervals), pets will need care
            const currentHunger = pet.hunger ?? 0;
            const currentCleanliness = pet.cleanliness ?? 0;
            const currentHappiness = pet.happiness ?? 0;
            
            const decayAmount = decayIntervals * 1; // 1% per interval
            const newHunger = Math.max(0, currentHunger - decayAmount);
            const newCleanliness = Math.max(0, currentCleanliness - decayAmount);
            
            // Happiness drops slightly faster when other stats are low
            const hungerDrop = currentHunger - newHunger;
            const cleanlinessDrop = currentCleanliness - newCleanliness;
            const totalStatDrop = hungerDrop + cleanlinessDrop;
            // Happiness drops at 1.2x the rate of other stats
            const happinessDecay = Math.floor(totalStatDrop * 1.2);
            const newHappiness = Math.max(0, currentHappiness - happinessDecay);

            await db.update(pets).set({
              hunger: newHunger,
              cleanliness: newCleanliness,
              happiness: newHappiness,
              lastDecayTime: now,
              updatedAt: now
            }).where(eq(pets.id, pet.id));
            
            console.log(`Background decay applied to pet ${pet.name} (ID: ${pet.id}): ${decayIntervals} intervals (${decayAmount}% total decay)`);
          }
        }
      } catch (error) {
        console.error('Background decay error:', error);
      }
    }, 180000); // Run every 3 minutes (180,000ms)
  };

  // Start background decay system
  startBackgroundDecay();
  console.log('Background pet decay system started - runs every 3 minutes');

  // Background daily token distribution system - runs every 10 minutes
  const startDailyTokenDistribution = () => {
    setInterval(async () => {
      try {
        const { db } = await import('./db.js');
        const { pets, users, tokenTransactions } = await import('../shared/schema.js');
        const { eq, and, sql } = await import('drizzle-orm');
        
        // Find pets that qualify for daily tokens (24+ hours old, healthy stats, no recent claim)
        const qualifyingPets = await db
          .select({
            id: pets.id,
            name: pets.name,
            userId: pets.userId,
            happiness: pets.happiness,
            hunger: pets.hunger,
            cleanliness: pets.cleanliness,
            energy: pets.energy,
            createdAt: pets.createdAt,
            lastTokenClaim: pets.lastTokenClaim
          })
          .from(pets)
          .where(eq(pets.isActive, true));

        const now = new Date();
        let tokensAwarded = 0;

        for (const pet of qualifyingPets) {
          // Check if pet is 24+ hours old
          const petAge = now.getTime() - new Date(pet.createdAt).getTime();
          const hoursOld = petAge / (1000 * 60 * 60);
          
          if (hoursOld < 24) continue;

          // Check if all stats are above 1%
          const allStatsHealthy = (pet.happiness || 0) > 1 && 
                                 (pet.hunger || 0) > 1 && 
                                 (pet.cleanliness || 0) > 1 && 
                                 (pet.energy || 0) > 1;
          
          if (!allStatsHealthy) continue;

          // Check if 24 hours have passed since last token claim
          const lastClaim = pet.lastTokenClaim ? new Date(pet.lastTokenClaim) : new Date(pet.createdAt);
          const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastClaim < 24) continue;

          // Award daily token
          try {
            // Increment user tokens
            await db.update(users)
              .set({ 
                tokens: sql`${users.tokens} + 1`,
                updatedAt: now 
              })
              .where(eq(users.id, pet.userId));

            // Update pet's last token claim
            await db.update(pets)
              .set({ 
                lastTokenClaim: now,
                updatedAt: now 
              })
              .where(eq(pets.id, pet.id));

            // Create transaction record
            await db.insert(tokenTransactions).values({
              userId: pet.userId,
              tokens: 1,
              type: 'earned',
              description: `Daily token from pet "${pet.name}" (24h care reward)`,
              relatedId: pet.id,
              status: 'completed',
              createdAt: now
            });

            tokensAwarded++;
            console.log(`🪙 Daily token awarded: Pet "${pet.name}" (ID: ${pet.id}) -> User ${pet.userId}`);
          } catch (error) {
            console.error(`Failed to award token for pet ${pet.id}:`, error);
          }
        }

        if (tokensAwarded > 0) {
          console.log(`🎁 Daily token distribution complete: ${tokensAwarded} tokens awarded`);
        }
      } catch (error) {
        console.error('Daily token distribution error:', error);
      }
    }, 600000); // Run every 10 minutes (600,000ms)
  };

  // Start daily token distribution system
  startDailyTokenDistribution();
  console.log('Background daily token distribution started - runs every 10 minutes');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
