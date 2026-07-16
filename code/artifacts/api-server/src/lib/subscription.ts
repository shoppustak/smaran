import { eq, and, lte } from "drizzle-orm";

/**
 * Builds a dynamic UPI Autopay deep link with the required subscription parameters.
 *
 * @param yajmanId The ID of the yajman tracking the subscription
 * @param merchantVpa The VPA (UPI ID) of the merchant (purohit)
 * @param payeeName The name of the payee (purohit)
 * @returns The constructed UPI mandate URL string
 */
export function buildAutopayDeepLink(
  yajmanId: string,
  merchantVpa: string,
  payeeName: string
): string {
  return `upi://mandate?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(payeeName)}&am=29.00&cu=INR&mc=8999&tr=${yajmanId}&recur=MONTHLY`;
}

export async function activateSubscriptionForYajman(
  yajmanId: string,
  purohitId: string
): Promise<any> {
  const { db, yajmansTable } = await import("@workspace/db");

  const [yajman] = await db
    .select()
    .from(yajmansTable)
    .where(eq(yajmansTable.id, yajmanId))
    .limit(1);

  if (!yajman) {
    throw new Error("Yajman not found");
  }

  if (yajman.purohitId !== purohitId) {
    throw new Error("Ownership mismatch: yajman not owned by this purohit");
  }

  const renewsAt = new Date();
  renewsAt.setDate(renewsAt.getDate() + 30);

  const [updated] = await db
    .update(yajmansTable)
    .set({
      familySubStatus: "active",
      familySubRenewsAt: renewsAt,
    })
    .where(eq(yajmansTable.id, yajmanId))
    .returning();

  return updated;
}

/**
 * Scans yajman subscription records and updates active expired subscriptions to lapsed.
 */
export async function runSubscriptionStateCheck(): Promise<void> {
  const { db, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, lte } = await import("drizzle-orm");
  const { sendWhatsappTemplate } = await import("./whatsapp-client");

  const now = new Date();

  // Find all active expired subscriptions
  const expired = await db
    .select({
      yajman: yajmansTable,
      purohit: purohitsTable,
    })
    .from(yajmansTable)
    .innerJoin(purohitsTable, eq(yajmansTable.purohitId, purohitsTable.id))
    .where(
      and(
        eq(yajmansTable.familySubStatus, "active"),
        lte(yajmansTable.familySubRenewsAt, now)
      )
    );

  for (const row of expired) {
    try {
      // Transition status to lapsed
      await db
        .update(yajmansTable)
        .set({ familySubStatus: "lapsed" })
        .where(eq(yajmansTable.id, row.yajman.id));

      if (row.yajman.whatsappNumber) {
        const inviteLink = `upi://mandate?pa=${encodeURIComponent(row.purohit.upiId)}&pn=${encodeURIComponent(row.purohit.name)}&am=29.00&cu=INR&mc=8999&tr=${row.yajman.id}&recur=MONTHLY`;

        const templateName = "smaran_renewal_nudge";
        const components = [
          {
            type: "body",
            parameters: [
              { type: "text", text: row.purohit.name },
              { type: "text", text: inviteLink },
            ],
          },
        ];

        await sendWhatsappTemplate(row.yajman.whatsappNumber, templateName, components);
      }
    } catch (err) {
      console.warn(`Failed to process subscription lapse for yajman ${row.yajman.id}:`, err);
    }
  }
}
