import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/ready", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ server: "ok", database: "not_configured" });
    return;
  }

  try {
    const { pool } = await import("@workspace/db");
    await pool.query("SELECT 1");
    res.status(200).json({ server: "ok", database: "ok" });
  } catch (err) {
    req.log.error({ err }, "Readiness check failed - database down");
    res.status(503).json({ server: "ok", database: "down" });
  }
});

export default router;
