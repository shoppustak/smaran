import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { GetObservedKResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /metrics/observed-k
// Gated by X-Internal-Key matching INTERNAL_API_KEY.
router.get("/metrics/observed-k", async (req, res) => {
  const internalApiKey = process.env.INTERNAL_API_KEY;
  const requestKey = req.header("X-Internal-Key");

  // 1. Check authorization first
  if (!internalApiKey || requestKey !== internalApiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 2. Check DB configuration second
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    const { db } = await import("@workspace/db");

    const query = sql`
      WITH cohort_members AS (
        SELECT
          id,
          date_trunc('week', created_at) AS cohort_week
        FROM purohits
      ),
      referred_activations AS (
        SELECT
          r.referred_by_purohit_id AS referrer_id,
          COUNT(*)::int AS count
        FROM purohits r
        WHERE r.referred_by_purohit_id IS NOT NULL AND r.referred_by_purohit_id != r.id
        GROUP BY r.referred_by_purohit_id
      ),
      cohort_referred AS (
        SELECT
          m.cohort_week,
          COALESCE(SUM(ra.count), 0)::int AS referred_activations
        FROM cohort_members m
        LEFT JOIN referred_activations ra ON m.id = ra.referrer_id
        GROUP BY m.cohort_week
      ),
      cohort_sizes AS (
        SELECT
          cohort_week,
          COUNT(*)::int AS cohort_size
        FROM cohort_members
        GROUP BY cohort_week
      )
      SELECT
        cs.cohort_week::text AS week,
        cs.cohort_size AS "cohortSize",
        cr.referred_activations AS "referredActivations"
      FROM cohort_sizes cs
      JOIN cohort_referred cr ON cs.cohort_week = cr.cohort_week
      ORDER BY cs.cohort_week ASC
    `;

    const result = await db.execute(query);
    const rows = result.rows as Array<{
      week: string;
      cohortSize: number;
      referredActivations: number;
    }>;

    const formatted = rows.map((row) => {
      // Postgres returns week as "2026-07-13 00:00:00+00" or similar.
      // Let's format it as YYYY-MM-DD or standard ISO date string
      const dateVal = new Date(row.week);
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, "0");
      const day = String(dateVal.getDate()).padStart(2, "0");
      const weekStr = `${year}-${month}-${day}`;

      const cohortSize = Number(row.cohortSize);
      const referredActivations = Number(row.referredActivations);
      const observedK = cohortSize > 0 ? referredActivations / cohortSize : 0;

      return {
        week: weekStr,
        cohortSize,
        referredActivations,
        observedK,
      };
    });

    const parsed = GetObservedKResponse.parse(formatted);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch cohort metrics");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
