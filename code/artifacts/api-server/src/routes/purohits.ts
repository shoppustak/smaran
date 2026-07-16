import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { GetPurohitByPhoneResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/purohits/:phoneNumber", async (req, res) => {
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
    // 3. Dynamically import database and query
    const { db, purohitsTable } = await import("@workspace/db");

    const rows = await db
      .select()
      .from(purohitsTable)
      .where(eq(purohitsTable.phoneNumber, req.params.phoneNumber))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Purohit not found" });
      return;
    }

    const row = rows[0];

    // 4. Return parsed response (coercing Date to string)
    const data = GetPurohitByPhoneResponse.parse({
      ...row,
      createdAt: row.createdAt.toISOString(),
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch purohit by phone");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
