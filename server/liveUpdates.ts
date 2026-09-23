import type { Express, Request, Response } from "express";
import { getUserId } from "./multiAuth";

type LivePayload = {
  resource?: string;
  action?: string;
  at?: number;
};

const clients = new Set<Response>();

export function emitLiveUpdate(resource = "all", payload: LivePayload = {}) {
  const message = `event: change\ndata: ${JSON.stringify({ resource, at: Date.now(), ...payload })}\n\n`;
  for (const client of Array.from(clients)) {
    try {
      client.write(message);
      (client as any).flush?.();
    } catch {
      clients.delete(client);
    }
  }
}

// Install this before API routes so every successful mutation wakes connected apps.
export function installLiveMutationBroadcast(app: Express) {
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      res.on("finish", () => {
        if (res.statusCode < 400) emitLiveUpdate(req.path, { action: req.method });
      });
    }
    next();
  });
}

// Register after session/passport middleware so only signed-in app users connect.
export function registerLiveUpdateRoute(app: Express) {
  app.get("/api/live", (req: Request, res: Response) => {
    if (!getUserId(req)) return res.status(401).json({ message: "Sign in required" });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    (res as any).flush?.();

    clients.add(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(": keepalive\n\n");
        (res as any).flush?.();
      } catch {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 20_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
  });
}
