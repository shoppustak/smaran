import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { GetLedgerEntryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /ledger/:id
// Scoped/gated by X-Internal-Key matching INTERNAL_API_KEY.
router.get("/ledger/:id", async (req, res) => {
  const internalApiKey = process.env.INTERNAL_API_KEY;
  const requestKey = req.header("X-Internal-Key");

  // 1. Check authorization first
  if (!internalApiKey || requestKey !== internalApiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // UUID format check to avoid PG syntax error on query
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id)) {
    res.status(404).json({ error: "Ledger entry not found" });
    return;
  }

  // 2. Check DB configuration second
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    const { db, ledgerTable } = await import("@workspace/db");

    const rows = await db
      .select()
      .from(ledgerTable)
      .where(eq(ledgerTable.id, req.params.id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Ledger entry not found" });
      return;
    }

    const row = rows[0];

    // Serialize using the generated schema
    const data = GetLedgerEntryResponse.parse({
      id: row.id,
      purohitId: row.purohitId,
      yajmanId: row.yajmanId,
      eventId: row.eventId,
      amountCollected: row.amountCollected,
      paymentStatus: row.paymentStatus,
      purohitClaimedAt: row.purohitClaimedAt,
      familyConfirmedAt: row.familyConfirmedAt,
      localityKey: row.localityKey,
      createdAt: row.createdAt,
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err, ledgerId: req.params.id }, "Failed to fetch ledger by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
