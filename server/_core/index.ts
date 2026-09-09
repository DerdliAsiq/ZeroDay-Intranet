import "dotenv/config";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { hashPassword } from "./auth";
import { createContext } from "./context";
import { ENV } from "./env";
import { loginLimiter } from "./rateLimit";
import { serveStatic, setupVite } from "./vite";
import { ensureAdmin, getDb } from "../db";

async function seedAdmin() {
  if (!ENV.adminEmail || !ENV.adminPassword) return;
  try {
    await getDb();
    await ensureAdmin(ENV.adminEmail, await hashPassword(ENV.adminPassword));
    console.log(`[Seed] admin ready: ${ENV.adminEmail}`);
  } catch (e) {
    console.error("[Seed] admin failed", e);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) throw new Error("no db");
      await db.execute(sql`select 1`);
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use("/api/trpc", loginLimiter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  await seedAdmin();

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
