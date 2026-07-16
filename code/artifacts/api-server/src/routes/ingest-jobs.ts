import { Router, type IRouter } from "express";
import { eq, and, lt, inArray, sql } from "drizzle-orm";
import { GetIngestJobResponse, PurgeIngestJobsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /ingest-jobs/:id
// Ops-inspection endpoint to check an ingest job's status.
// Scoped/gated by X-Internal-Key matching INTERNAL_API_KEY.
// Deliberately excludes raw transcript/extraction JSON to avoid PII re-exposure.
router.get("/ingest-jobs/:id", async (req, res) => {
  const internalApiKey = process.env.INTERNAL_API_KEY;
  const requestKey = req.header("X-Internal-Key");

  // 1. Check authorization first (F-5)
  if (!internalApiKey || requestKey !== internalApiKey) {
    res.status(404).json({ error: "Unauthorized" }); // Wait, the specs say: "401 response reusing ApiErrorMessage alongside the existing 404"
    // Wait, let's use 401 for unauthorized, as specified in the openapi.yaml:
    // "401 response reusing ApiErrorMessage"
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // UUID format check to avoid PG syntax error on query
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    res.status(404).json({ error: "Ingest job not found" });
    return;
  }

  // 2. Check DB configuration second
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    const { db, ingestJobsTable } = await import("@workspace/db");

    const rows = await db
      .select()
      .from(ingestJobsTable)
      .where(eq(ingestJobsTable.id, req.params.id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Ingest job not found" });
      return;
    }

    const row = rows[0];

    // Exclude transcript and extraction fields per DPDP-alignment (T-02-17)
    const data = GetIngestJobResponse.parse({
      id: row.id,
      purohitId: row.purohitId,
      kind: row.kind,
      status: row.status,
      fieldScores: row.fieldScores,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err, jobId: req.params.id }, "Failed to fetch ingest job by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /ingest-jobs/purge
// Retention purge: Unauthenticated endpoint hit daily by external pinger.
// Restores §8's DPDP promise: purges raw transcripts/extractions from terminal jobs older than 30 days,
// and expires stale awaiting_confirm jobs older than 30 days to rejected/expired (F-6).
router.post("/ingest-jobs/purge", async (req, res) => {
  // 1. Check DB configuration
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    const { db, ingestJobsTable } = await import("@workspace/db");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Design Choice: To accurately count how many transcripts/extractions are purged,
    // we select the matching rows first before performing the batch update.
    // This is safe against race conditions since these rows are historical (>30 days old).

    // Statement 1: Find terminal jobs ('confirmed', 'rejected', 'failed') older than 30 days with content to purge
    const terminalJobsToPurge = await db
      .select({
        id: ingestJobsTable.id,
        transcript: ingestJobsTable.transcript,
        extraction: ingestJobsTable.extraction,
      })
      .from(ingestJobsTable)
      .where(
        and(
          inArray(ingestJobsTable.status, ["confirmed", "rejected", "failed"]),
          lt(ingestJobsTable.updatedAt, thirtyDaysAgo),
          sql`(${ingestJobsTable.transcript} IS NOT NULL OR ${ingestJobsTable.extraction} IS NOT NULL)`
        )
      );

    // Statement 2: Find stale 'awaiting_confirm' jobs older than 30 days to expire (F-6 / D-03)
    const staleConfirmRows = await db
      .select({
        id: ingestJobsTable.id,
        transcript: ingestJobsTable.transcript,
        extraction: ingestJobsTable.extraction,
      })
      .from(ingestJobsTable)
      .where(
        and(
          eq(ingestJobsTable.status, "awaiting_confirm"),
          lt(ingestJobsTable.updatedAt, thirtyDaysAgo)
        )
      );

    let purgedTranscripts = 0;
    let purgedExtractions = 0;
    const expiredAwaitingConfirm = staleConfirmRows.length;

    // Count non-null items in terminal jobs
    for (const row of terminalJobsToPurge) {
      if (row.transcript !== null) purgedTranscripts++;
      if (row.extraction !== null) purgedExtractions++;
    }

    // Count non-null items in stale awaiting_confirm jobs
    for (const row of staleConfirmRows) {
      if (row.transcript !== null) purgedTranscripts++;
      if (row.extraction !== null) purgedExtractions++;
    }

    // Execute Statement 1 update
    if (terminalJobsToPurge.length > 0) {
      const terminalIds = terminalJobsToPurge.map((r) => r.id);
      await db
        .update(ingestJobsTable)
        .set({
          transcript: null,
          extraction: null,
          updatedAt: new Date(),
        })
        .where(inArray(ingestJobsTable.id, terminalIds));
    }

    // Execute Statement 2 update (F-6 / D-03)
    if (staleConfirmRows.length > 0) {
      const staleIds = staleConfirmRows.map((r) => r.id);
      await db
        .update(ingestJobsTable)
        .set({
          status: "rejected",
          error: "expired",
          transcript: null,
          extraction: null,
          updatedAt: new Date(),
        })
        .where(inArray(ingestJobsTable.id, staleIds));
    }

    const data = PurgeIngestJobsResponse.parse({
      purgedTranscripts,
      purgedExtractions,
      expiredAwaitingConfirm,
      deletedRows: 0, // Ingest job rows are retained for metadata/debugging, only sensitive contents are nulled
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Purge ingest jobs execution failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
