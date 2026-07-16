import { Router, type IRouter } from "express";
import { resolveUpcomingEventsForWeek, dispatchPreRitualAlerts, runLapseDetectionScan } from "../lib/brain";
import { logger } from "../lib/logger";

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
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
