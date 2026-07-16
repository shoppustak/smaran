import { Router, type IRouter } from "express";
import { resolveUpcomingEventsForWeek, persistResolvedSchedule, dispatchPreRitualAlerts, runLapseDetectionScan } from "../lib/brain";
import { logger } from "../lib/logger";
import { captureException } from "../lib/sentry";

const router: IRouter = Router();

router.post("/cron/daily-brain", async (req, res) => {
  // Check DB configuration first
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  // 1. Check CRON_SECRET header
  const cronSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    logger.warn({ headerPresent: !!cronSecret }, "Unauthorized access attempt to daily-brain cron");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    logger.info("Starting daily-brain cron job date resolution");
    // 2. Invoke resolveUpcomingEventsForWeek(new Date())
    const upcomingEvents = await resolveUpcomingEventsForWeek(new Date());
    logger.info({ matchedCount: upcomingEvents.length }, "Completed date resolution for upcoming events");

    // 2b. Persist the resolved-schedule cache so the day-sheet reads a warm cache
    await persistResolvedSchedule(upcomingEvents);

    // 3. Iterate matched events and trigger notification dispatch
    await dispatchPreRitualAlerts(upcomingEvents);

    // 3b. Run lapse detection scan and dispatch recovery nudges
    await runLapseDetectionScan();
    logger.info("Successfully dispatched all daily-brain cron notifications and lapse recovery nudges");

    // 4. Respond 200 with JSON detailing matched items
    res.json({
      status: "success",
      matchedCount: upcomingEvents.length,
      events: upcomingEvents.map((e) => ({
        eventId: e.event.id,
        gregorianDate: e.gregorianDate,
        yajmanName: e.yajman.familyName,
        purohitName: e.purohit.name,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Daily brain cron execution failed");
    captureException(err, { cron: "daily-brain" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cron/subscription-sweep", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  const cronSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    logger.warn({ headerPresent: !!cronSecret }, "Unauthorized access attempt to subscription-sweep cron");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { runSubscriptionStateCheck } = await import("../lib/subscription");
    await runSubscriptionStateCheck();

    // Nightly cleanup of processed webhooks older than 48h
    const { db, processedWebhooksTable } = await import("@workspace/db");
    const { lt } = await import("drizzle-orm");
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const deleted = await db
      .delete(processedWebhooksTable)
      .where(lt(processedWebhooksTable.receivedAt, cutoff))
      .returning();
    logger.info({ deletedCount: deleted.length }, "Cleaned up old processed webhook ids in subscription-sweep");

    res.json({ status: "success", cleanedWebhooks: deleted.length });
  } catch (err) {
    logger.error({ err }, "Subscription sweep cron execution failed");
    captureException(err, { cron: "subscription-sweep" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cron/observed-k", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  const cronSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    logger.warn({ headerPresent: !!cronSecret }, "Unauthorized access attempt to observed-k cron");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

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

    logger.info({ cohorts: formatted }, "Observed-k weekly metrics snapshot calculated successfully");
    res.json({ status: "success", cohorts: formatted });
  } catch (err) {
    logger.error({ err }, "Observed-k cron execution failed");
    captureException(err, { cron: "observed-k" });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
