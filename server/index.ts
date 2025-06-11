import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
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
            // Apply more realistic decay rates for overnight periods
            // Hunger and cleanliness: 3% per 3-minute interval (faster decay)
            // After 8 hours (160 intervals), pets should be quite needy
            const currentHunger = pet.hunger || 100;
            const currentCleanliness = pet.cleanliness || 100;
            const currentHappiness = pet.happiness || 100;
            
            const newHunger = Math.max(0, currentHunger - (decayIntervals * 3));
            const newCleanliness = Math.max(0, currentCleanliness - (decayIntervals * 3));
            
            // Happiness drops more aggressively based on how low hunger and cleanliness are
            // If hunger or cleanliness is below 50%, happiness drops faster
            let happinessDecay = decayIntervals * 2; // Base decay of 2% per interval
            
            if (newHunger < 50 || newCleanliness < 50) {
              happinessDecay += decayIntervals * 3; // Additional 3% if stats are low
            }
            if (newHunger < 25 || newCleanliness < 25) {
              happinessDecay += decayIntervals * 5; // Additional 5% if stats are very low
            }
            
            const newHappiness = Math.max(0, currentHappiness - happinessDecay);

            await db.update(pets).set({
              hunger: newHunger,
              cleanliness: newCleanliness,
              happiness: newHappiness,
              lastDecayTime: now,
              updatedAt: now
            }).where(eq(pets.id, pet.id));
            
            console.log(`Background decay applied to pet ${pet.name} (ID: ${pet.id}): ${decayIntervals} intervals - H:${currentHunger}→${newHunger}, C:${currentCleanliness}→${newCleanliness}, Hap:${currentHappiness}→${newHappiness}`);
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
