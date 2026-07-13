import { Router, type IRouter } from "express";
import { KeepaliveResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Keep-warm endpoint for external uptime pingers (e.g. cron-job.org) on Render +
// Supabase free tiers: Render spins the service down after ~15 min with no inbound
// traffic; Supabase pauses the free-tier database after ~1 week of no activity.
//
// This ALWAYS returns 200, even when the DB is unreachable or not configured yet.
// /healthz returns a strict check and is NOT safe to point a pinger at: external
// pingers count non-2xx as failure and auto-disable the job after repeated
// failures. Point the pinger at THIS endpoint instead.
//
// @workspace/db throws at import time if DATABASE_URL is unset (see
// lib/db/src/index.ts) — so the import is dynamic and gated behind an env check,
// not static, otherwise requiring this file at all would crash the server before
// Phase 1 wires up a real database.
router.get("/keepalive", async (req, res) => {
  let database: "ok" | "cold" | "not_configured" = "not_configured";

  if (process.env.DATABASE_URL) {
    try {
      const { pool } = await import("@workspace/db");
      await pool.query("SELECT 1");
      database = "ok";
    } catch (err) {
      req.log.warn({ err }, "Keepalive DB warm query failed (still returning 200)");
      database = "cold";
    }
  }

  const data = KeepaliveResponse.parse({
    status: "ok",
    database,
    timestamp: new Date().toISOString(),
  });
  res.status(200).json(data);
});

export default router;
