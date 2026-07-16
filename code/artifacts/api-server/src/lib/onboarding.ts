import { eq } from "drizzle-orm";
import { geocodeCity } from "./geocoding";
import { isValidUpiId } from "./upi";
import { logger } from "./logger";

const ONBOARDING_STEPS = ["name", "city", "ward", "upi", "calendar_system"] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const EXAMPLE_FAMILY_NAME = "Sharma Family (उदाहरण / example)";
const EXAMPLE_EVENT_TYPE = "Satyanarayan Katha";

async function completeOnboarding(
  phoneNumber: string,
  draft: {
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    localityKey: string;
    upiId: string;
    calendarSystem: string;
    referredByPurohitId?: string | null;
  }
): Promise<string[]> {
  const { db, purohitsTable, onboardingStateTable } = await import("@workspace/db");

  await db.insert(purohitsTable).values({
    phoneNumber,
    name: draft.name,
    city: draft.city,
    latitude: draft.latitude,
    longitude: draft.longitude,
    localityKey: draft.localityKey,
    upiId: draft.upiId,
    calendarSystem: draft.calendarSystem,
    referredByPurohitId: draft.referredByPurohitId || null,
  });

  await db.delete(onboardingStateTable).where(eq(onboardingStateTable.phoneNumber, phoneNumber));

  const confirmationText = `Namaste ${draft.name} Ji! Aapka account ban gaya hai (${draft.city}, ${draft.calendarSystem} calendar).`;
  let wowCardText = "";

  try {
    const port = process.env.PORT ?? "3000";
    const upstream = await fetch(`http://localhost:${port}/api/panchang`);
    
    if (upstream.ok) {
      const body = await upstream.json() as any;
      wowCardText = `Yeh ek example hai:\n\nParivar: ${EXAMPLE_FAMILY_NAME}\nKarya: ${EXAMPLE_EVENT_TYPE}\nTithi: ${body.tithi?.name} ${body.tithi?.paksha}\nTarikh: ${body.date}\n\nAise hi aap apne yajmano ka record rakh sakte hain!`;
    } else {
      logger.warn({ status: upstream.status }, "Internal panchang API failed during wow-card generation");
      wowCardText = `Yeh ek example hai:\n\nParivar: ${EXAMPLE_FAMILY_NAME}\nKarya: ${EXAMPLE_EVENT_TYPE}\n(Date calculation abhi thodi der ke liye unavailable hai)\n\nAise hi aap apne yajmano ka record rakh sakte hain!`;
    }
  } catch (err) {
    logger.warn({ err }, "Internal panchang API failed during wow-card generation");
    wowCardText = `Yeh ek example hai:\n\nParivar: ${EXAMPLE_FAMILY_NAME}\nKarya: ${EXAMPLE_EVENT_TYPE}\n(Date calculation abhi thodi der ke liye unavailable hai)\n\nAise hi aap apne yajmano ka record rakh sakte hain!`;
  }

  return [confirmationText, wowCardText];
}

export async function handleOnboardingMessage(phoneNumber: string, text: string): Promise<string[]> {
  if (!process.env.DATABASE_URL) {
    return ["Smaran abhi setup ho raha hai, thodi der mein wapas try karein."];
  }

  const { db, purohitsTable, onboardingStateTable } = await import("@workspace/db");

  const existing = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.phoneNumber, phoneNumber))
    .limit(1);

  if (existing.length > 0) {
    return [`Namaste ${existing[0].name} Ji! Aapka account already active hai.`];
  }

  const draft = await db
    .select()
    .from(onboardingStateTable)
    .where(eq(onboardingStateTable.phoneNumber, phoneNumber))
    .limit(1);

  if (draft.length === 0) {
    const inviteMatch = text.trim().match(/^invite:([0-9a-fA-F-]{36})$/i);
    let referredByPurohitId: string | null = null;
    if (inviteMatch) {
      const referrerId = inviteMatch[1];
      const referrerRows = await db
        .select()
        .from(purohitsTable)
        .where(eq(purohitsTable.id, referrerId))
        .limit(1);
      if (referrerRows.length > 0) {
        referredByPurohitId = referrerId;
      }
    }

    await db.insert(onboardingStateTable).values({
      phoneNumber,
      currentStep: "name",
      referredByPurohitId,
    });
    return ["Namaste! Smaran mein aapka swagat hai. Kripya apna poora naam batayein:"];
  }

  const state = draft[0];
  const trimmedText = text.trim();

  switch (state.currentStep) {
    case "name": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Kripya apna sahi naam darj karein (1-200 characters):"];
      }
      await db.update(onboardingStateTable)
        .set({ name: trimmedText, currentStep: "city", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return ["Dhanyawad! Ab kripya apne shahar (city) ka naam batayein:"];
    }
    case "city": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Kripya apne shahar ka sahi naam darj karein (1-200 characters):"];
      }
      await db.update(onboardingStateTable)
        .set({ city: trimmedText, currentStep: "ward", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return ["Dhanyawad! Ab kripya apna area ya mohalla batayein (jaise 'Andheri West' ya 'Sadar Bazaar'):"];
    }
    case "ward": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Kripya apne area ka sahi naam darj karein (1-200 characters):"];
      }
      const geo = await geocodeCity(state.city ?? "", trimmedText);
      if (geo === null) {
        return ["Hum aapke area ko dhoondh nahi paaye. Kripya apne area/mohalla ka naam wapas type karein:"];
      }
      await db.update(onboardingStateTable)
        .set({ 
          latitude: geo.latitude, 
          longitude: geo.longitude, 
          localityKey: geo.localityKey, 
          currentStep: "upi", 
          updatedAt: new Date() 
        })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return ["Dhanyawad! Kripya apna UPI ID batayein, jismein aap dakshina prapt karna chahte hain (jaise name@bank):"];
    }
    case "upi": {
      if (trimmedText.length === 0 || trimmedText.length > 256 || !isValidUpiId(trimmedText)) {
        return ["Kripya ek valid UPI ID darj karein (jaise name@bank):"];
      }
      await db.update(onboardingStateTable)
        .set({ upiId: trimmedText, currentStep: "calendar_system", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return ["Dhanyawad! Aap kaunsa calendar system follow karte hain? 'purnimanta' ya 'amanta' type karein:"];
    }
    case "calendar_system": {
      const normalized = trimmedText.toLowerCase();
      if (normalized !== "purnimanta" && normalized !== "amanta") {
        return ["Kripya sirf 'purnimanta' ya 'amanta' likhein:"];
      }
      
      return completeOnboarding(phoneNumber, {
        name: state.name ?? "",
        city: state.city ?? "",
        latitude: state.latitude ?? 0,
        longitude: state.longitude ?? 0,
        localityKey: state.localityKey ?? "",
        upiId: state.upiId ?? "",
        calendarSystem: normalized,
        referredByPurohitId: state.referredByPurohitId,
      });
    }
    default:
      return ["Koi error aayi hai, kripya thodi der baad try karein."];
  }
}
