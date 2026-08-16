import { eq } from "drizzle-orm";
import { geocodeCity } from "./geocoding";
import { NAMASTE, POINT, RULE } from "./copy-tokens";
import { logger } from "./logger";

export async function handleFirstContact(
  phoneNumber: string,
  profileName: string | null,
  text: string
): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return ["Smaran abhi setup ho raha hai, thodi der mein wapas try karein."];
  }

  const { db, purohitsTable, onboardingStateTable } = await import("@workspace/db");

  // Check if they already exist (just in case)
  const existing = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.phoneNumber, phoneNumber))
    .limit(1);

  if (existing.length > 0) {
    return [
      `${NAMASTE} *Pranaam ${existing[0].name} ji!* Aapka account chalu hai.\n\n` +
      `Aap yeh kar sakte hain:\n` +
      `• *Yajman jodna* — voice note, likhkar, ya bahi khata ki photo\n` +
      `• *my week* likhiye — is hafte ke anushthan dekhiye\n` +
      `• *referral* likhiye — kisi purohit-bhai ko jodiye\n\n` +
      `${POINT} Boliye, main sun raha hoon.`,
    ];
  }

  const inviteMatch = text.trim().match(/^invite:([0-9a-fA-F-]{36})$/i);
  let referredByPurohitId: string | null = null;
  let referrerName: string | null = null;
  if (inviteMatch) {
    const referrerId = inviteMatch[1];
    const referrerRows = await db
      .select()
      .from(purohitsTable)
      .where(eq(purohitsTable.id, referrerId))
      .limit(1);
    if (referrerRows.length > 0) {
      referredByPurohitId = referrerId;
      referrerName = referrerRows[0].name;
    }
  }

  // Trial ends in 90 days
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 90);

  // M1: Create the purohit row immediately so voice/image handlers will accept messages
  await db.insert(purohitsTable).values({
    phoneNumber,
    name: profileName && profileName.trim().length > 0 ? profileName.trim() : phoneNumber,
    plan: "trial",
    trialEndsAt,
    referredByPurohitId,
    // city, latitude, longitude, localityKey, upiId, calendarSystem remain null
  });

  await db.insert(onboardingStateTable).values({
    phoneNumber,
    currentStep: "awaiting_first_family",
    referredByPurohitId,
  });

  const opening = referrerName
    ? `${NAMASTE} *Pranaam!* *${referrerName} ji* ne aapko _Smaran_ kiya hai.`
    : `${NAMASTE} *Pranaam!* Main _Smaran_ hoon.`;

  return [
    `${opening}\n\n` +
    `Smaran aapki bahi khata ko yaad rakhne ki seva hai — aapke yajmano ki tithiyan, samay se pehle, aapke WhatsApp par.\n\n` +
    `Shuru karne ke liye kisi ek parivar ki ek tithi bolkar bhejiye — jaise: *"Sharma parivar, pitaji ka shraddh, bhadrapad krishna dwadashi"*\n` +
    `Bhejte hi uski is varsh ki sahi tithi aur shubh muhurt nikalkar dikha denge.`,
  ];
}

export async function handlePostConfirmOnboarding(
  phoneNumber: string,
  text: string
): Promise<string[] | null> {
  const { db, purohitsTable, onboardingStateTable } = await import("@workspace/db");

  const draft = await db
    .select()
    .from(onboardingStateTable)
    .where(eq(onboardingStateTable.phoneNumber, phoneNumber))
    .limit(1);

  if (draft.length === 0) {
    return null; // Not in onboarding
  }

  const state = draft[0];
  const trimmedText = text.trim();

  switch (state.currentStep) {
    case "calendar_system": {
      // This should ideally be handled via interactive button callback, but just in case they type it
      const normalized = trimmedText.toLowerCase();
      if (normalized !== "purnimanta" && normalized !== "amanta" && normalized !== "pūrnimānt" && normalized !== "amānt") {
        return ["Sirf itna likhiye — purnimanta ya amanta:"];
      }
      
      const calendarSystem = (normalized === "purnimanta" || normalized === "pūrnimānt") ? "purnimanta" : "amanta";

      await db.update(purohitsTable)
        .set({ calendarSystem })
        .where(eq(purohitsTable.phoneNumber, phoneNumber));
        
      await db.update(onboardingStateTable)
        .set({ currentStep: "city", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
        
      return [
        `Aur aapka shahar va kshetra? — panchang ki ganana jagah se badalti hai.\n` +
        `_Jaise: Pune, Kasba Peth_ — bas, iske baad shubh muhurt taiyar.`,
      ];
    }
    case "city": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Shahar aur area samajh nahi aaya. Kripya dobara likhiye:"];
      }
      
      // Attempt to split city and ward. If no comma, treat whole thing as city.
      const parts = trimmedText.split(",");
      let cityPart = parts[0];
      let wardPart = parts.length > 1 ? parts.slice(1).join(",") : "";
      
      const geo = await geocodeCity(cityPart, wardPart);
      if (geo === null) {
        return ["Yeh area map par nahi mil paaya. Koi paas ka bada mohalla ya landmark aur shahar likhiye:"];
      }

      const [updatedPurohit] = await db.update(purohitsTable)
        .set({ 
          city: trimmedText, 
          latitude: geo.latitude, 
          longitude: geo.longitude, 
          localityKey: geo.localityKey 
        })
        .where(eq(purohitsTable.phoneNumber, phoneNumber))
        .returning();

      await db.delete(onboardingStateTable)
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));

      // Fetch the newly added event
      const { eventsTable, yajmansTable } = await import("@workspace/db");
      const { desc } = await import("drizzle-orm");
      
      const [latestEvent] = await db
        .select({
          event: eventsTable,
          yajman: yajmansTable
        })
        .from(eventsTable)
        .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
        .where(eq(eventsTable.purohitId, updatedPurohit.id))
        .orderBy(desc(eventsTable.createdAt))
        .limit(1);

      if (latestEvent) {
        // Resolve date now that we have calendarSystem and locality
        const { resolveEventGregorianForCycle } = await import("./brain");
        const resolved = await resolveEventGregorianForCycle(
          { 
            maas: latestEvent.event.maas, 
            paksha: latestEvent.event.paksha, 
            tithi: latestEvent.event.tithi, 
            time: latestEvent.event.time 
          },
          updatedPurohit,
          new Date()
        );

        if (resolved) {
          const currentYear = new Date().getFullYear();
          await db.update(eventsTable)
            .set({ 
              resolvedDate: resolved.gregorianDate,
              resolvedWindow: resolved.window,
              resolvedCycleYear: currentYear
            })
            .where(eq(eventsTable.id, latestEvent.event.id));
        }

        const { tithiVocab } = await import("./vocab/tithi");
        const tithiName = tithiVocab.find(t => t.tithiNumber === latestEvent.event.tithi)?.canonical ?? "";
        
        function formatWowDate(iso: string | Date | undefined): string {
          if (!iso) return "—";
          const d = new Date(iso);
          if (isNaN(d.getTime())) return String(iso);
          const p = (n: number) => String(n).padStart(2, "0");
          return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
        }

        const dateStr = resolved ? formatWowDate(resolved.gregorianDate) : "—";
        const dpdpLine = "आपकी और आपके परिवारों की जानकारी केवल आपके काम आती है — कभी बेची नहीं जाएगी, माँगते ही हटा दी जाएगी।";

        const m4 = `*परिवार:* ${latestEvent.yajman.familyName}\n` +
                   `*कार्य:* ${latestEvent.event.eventType}\n` +
                   `*तिथि:* ${tithiName} ${latestEvent.event.paksha}\n` +
                   `*शुभ मुहूर्त:* ${dateStr}\n${RULE}\n` + 
                   dpdpLine;
                   
        return [m4];
      }
      
      return ["_Tithiyan set ki ja rahi hain..._"]; 
    }
    default:
      return null;
  }
}
