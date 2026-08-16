import { db, yajmansTable, familyContentLogTable, purohitsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendWhatsappMessage } from "../lib/whatsapp-client";
import { fetchVedikaDailyAffirmation } from "../lib/vedika";

export async function runFamilyContentDispatch(): Promise<void> {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const contentType = "daily_affirmation";

    // 1. Query active families that haven't received this content today
    const activeFamilies = await db
      .select({
        yajman: yajmansTable,
        purohit: purohitsTable,
      })
      .from(yajmansTable)
      .innerJoin(purohitsTable, eq(yajmansTable.purohitId, purohitsTable.id))
      .where(eq(yajmansTable.familySubStatus, "active"));

    if (activeFamilies.length === 0) {
      return;
    }

    // 2. Fetch Vedika Daily Affirmation (V2)
    const affirmation = await fetchVedikaDailyAffirmation();
    
    // 3. Dispatch to families
    const CHUNK_SIZE = 20;
    for (let i = 0; i < activeFamilies.length; i += CHUNK_SIZE) {
      const chunk = activeFamilies.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(
        chunk.map(async (row) => {
          const { yajman, purohit } = row;
          if (!yajman.whatsappNumber) return;

          try {
            // Check if already sent today
            const alreadySent = await db
              .select({ id: familyContentLogTable.id })
              .from(familyContentLogTable)
              .where(
                and(
                  eq(familyContentLogTable.yajmanId, yajman.id),
                  eq(familyContentLogTable.contentDate, dateStr),
                  eq(familyContentLogTable.contentType, contentType)
                )
              )
              .limit(1);

            if (alreadySent.length > 0) {
              return; // Already received
            }

            // Build content payload
            const greeting = `जय श्री राम ${yajman.familyName} परिवार।`;
            const purohitName = purohit.name.endsWith("जी") ? purohit.name : `${purohit.name} जी`;
            const body = `🌸 ${greeting}\n\n${affirmation}\n\n🙏 ${purohitName} के सौजन्य से`;

            const { messageId } = await sendWhatsappMessage(yajman.whatsappNumber, {
              type: "text",
              text: { body },
            });

            // Log the send
            await db.insert(familyContentLogTable).values({
              yajmanId: yajman.id,
              contentDate: dateStr,
              contentType,
              messageId,
            });

            logger.info({ yajmanId: yajman.id }, "Dispatched daily content to family");
          } catch (err) {
            logger.error({ err, yajmanId: yajman.id }, "Failed to dispatch daily content to family");
          }
        })
      );

      if (i + CHUNK_SIZE < activeFamilies.length) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // sleep 100ms
      }
    }
  } catch (err) {
    logger.error({ err }, "Error running family content dispatch");
  }
}
