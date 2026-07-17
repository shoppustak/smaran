import { eq } from "drizzle-orm";
import { geocodeCity } from "./geocoding";
import { isValidUpiId } from "./upi";
import { logger } from "./logger";
import { NAMASTE, POINT, RULE } from "./copy-tokens";

const ONBOARDING_STEPS = ["name", "city", "ward", "upi", "calendar_system"] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const EXAMPLE_FAMILY_NAME = "Sharma Family (उदाहरण / example)";
const EXAMPLE_EVENT_TYPE = "Satyanarayan Katha";

/**
 * The purohit's next move, named explicitly.
 *
 * Onboarding used to end on "aise hi aap record rakh sakte hain" — true, but it
 * never said HOW. A purohit who has just answered five questions will assume a
 * sixth is coming and wait. All three ways in are stated, voice first: the
 * product's whole claim is that this is never a typed form.
 */
const NEXT_STEP_TEXT =
  `Ab apna pehla yajman jodiye — jaise suvidha ho:\n` +
  `• *Bol kar* — voice note bhej dijiye\n` +
  `• *Likh kar* — type kar dijiye\n` +
  `• *Bahi khata ki photo* bhej dijiye\n\n` +
  `${POINT} Shuru kijiye — aapka har yajman, har tithi, smaran rahega.`;

/** Vedika returns a full ISO timestamp; a purohit should never be shown one. */
function formatWowDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}


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

  const confirmationText = `${NAMASTE} *Pranaam ${draft.name} ji!* Aapka account taiyar hai — *${draft.city}*, *${draft.calendarSystem}* panchang.`;
  let wowCardText = "";

  try {
    const port = process.env.PORT ?? "3000";
    const upstream = await fetch(`http://localhost:${port}/api/panchang`);
    
    if (upstream.ok) {
      const body = await upstream.json() as any;
      wowCardText =
        `Dekhiye — aise dikhega aapka har yajman:\n${RULE}\n` +
        `*Parivar:* ${EXAMPLE_FAMILY_NAME}\n` +
        `*Karya:* ${EXAMPLE_EVENT_TYPE}\n` +
        `*Tithi:* ${body.tithi?.name} ${body.tithi?.paksha}\n` +
        `*Tarikh:* ${formatWowDate(body.date)}\n${RULE}\n\n` +
        NEXT_STEP_TEXT;
    } else {
      logger.warn({ status: upstream.status }, "Internal panchang API failed during wow-card generation");
      wowCardText =
        `Dekhiye — aise dikhega aapka har yajman:\n${RULE}\n` +
        `*Parivar:* ${EXAMPLE_FAMILY_NAME}\n` +
        `*Karya:* ${EXAMPLE_EVENT_TYPE}\n` +
        `_(Tarikh abhi nikal nahi paayi — thodi der mein theek ho jaayegi.)_\n${RULE}\n\n` +
        NEXT_STEP_TEXT;
    }
  } catch (err) {
    logger.warn({ err }, "Internal panchang API failed during wow-card generation");
    wowCardText =
        `Dekhiye — aise dikhega aapka har yajman:\n${RULE}\n` +
        `*Parivar:* ${EXAMPLE_FAMILY_NAME}\n` +
        `*Karya:* ${EXAMPLE_EVENT_TYPE}\n` +
        `_(Tarikh abhi nikal nahi paayi — thodi der mein theek ho jaayegi.)_\n${RULE}\n\n` +
        NEXT_STEP_TEXT;
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
    // A returning purohit must never hit a dead end: tell them what they can do,
    // in the same breath. This is the only reply an already-onboarded purohit gets
    // for un-routed text, so it has to carry the menu.
    return [
      `${NAMASTE} *Pranaam ${existing[0].name} ji!* Aapka account chalu hai.\n\n` +
      `Aap yeh kar sakte hain:\n` +
      `• *Yajman jodna* — voice note, likhkar, ya bahi khata ki photo\n` +
      `• *my week* likhiye — is hafte ke anushthan dekhiye\n` +
      `• *referral* likhiye — kisi purohit-bhai ko jodiye\n\n` +
      `${POINT} Boliye, main sun raha hoon.`,
    ];
  }

  const draft = await db
    .select()
    .from(onboardingStateTable)
    .where(eq(onboardingStateTable.phoneNumber, phoneNumber))
    .limit(1);

  if (draft.length === 0) {
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

    await db.insert(onboardingStateTable).values({
      phoneNumber,
      currentStep: "name",
      referredByPurohitId,
    });
    // A purohit who arrived on a brother-purohit's invite already has a reason to
    // trust this; say whose. Growth here is purohit-to-purohit by design, so the
    // referrer's name is the strongest thing in the first message.
    // "smaran karna" = to remember / to call to mind. The brand IS the verb, so the
    // referral line reads as "Sharma ji remembered you" AND "Sharma ji referred you
    // to Smaran" at once. Bold carries the nouns a purohit scans for.
    const opening = referrerName
      ? `${NAMASTE} *Pranaam!* *${referrerName} ji* ne aapko _Smaran_ kiya hai.`
      : `${NAMASTE} *Pranaam!* Main _Smaran_ hoon.`;

    return [
      `${opening}\n\n` +
      `Aapke yajmano ki *tithiyan* main yaad rakhunga — koi anushthan chhoote na. ` +
      `*Dakshina* seedhi aapke *UPI* par aayegi — beech mein na koi platform, na commission.\n\n` +
      `Bas *5 baatein* poochh loon — ek hi baar. Uske baad aap sirf bolte jaaiyega, ` +
      `baaki main sambhal lunga.\n\n` +
      `*1/5* — Aapka *shubh naam*?`,
    ];
  }

  const state = draft[0];
  const trimmedText = text.trim();

  switch (state.currentStep) {
    case "name": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Naam thoda chhota ya lamba lag raha hai. Kripya dobara likhiye:"];
      }
      await db.update(onboardingStateTable)
        .set({ name: trimmedText, currentStep: "city", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return [
        `Dhanyawad ${trimmedText} ji.\n\n` +
        `*2/5* — Aapka *shahar* (city)?\n` +
        `_Panchang aapke sthaan ke sooryoday se banta hai — isliye tithi bilkul sahi nikalti hai._`,
      ];
    }
    case "city": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Shahar ka naam samajh nahi aaya. Kripya dobara likhiye:"];
      }
      await db.update(onboardingStateTable)
        .set({ city: trimmedText, currentStep: "ward", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return [
        `*3/5* — Aapka *mohalla* ya area? (jaise 'Sadar Bazaar')\n` +
        `_Isse aapke aas-paas ke yajman aur sthaaniya panchang theek se judte hain._`,
      ];
    }
    case "ward": {
      if (trimmedText.length === 0 || trimmedText.length > 200) {
        return ["Area ka naam samajh nahi aaya. Kripya dobara likhiye:"];
      }
      const geo = await geocodeCity(state.city ?? "", trimmedText);
      if (geo === null) {
        return ["Yeh area map par nahi mil paaya. Koi paas ka bada mohalla ya landmark likhiye:"];
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
      return [
        `*4/5* — Aapki *UPI ID*? (jaise name@bank)\n` +
        `_Dakshina seedhi isi par aayegi. Smaran na beech mein aata hai, na koi commission leta hai._`,
      ];
    }
    case "upi": {
      if (trimmedText.length === 0 || trimmedText.length > 256 || !isValidUpiId(trimmedText)) {
        return ["Yeh UPI ID theek nahi lag rahi. Aise likhiye — name@bank:"];
      }
      await db.update(onboardingStateTable)
        .set({ upiId: trimmedText, currentStep: "calendar_system", updatedAt: new Date() })
        .where(eq(onboardingStateTable.phoneNumber, phoneNumber));
      return [
        `*5/5* — Aap *purnimanta* panchang maante hain ya *amanta*?\n` +
        `_Isse har tithi aapki parampara ke anusaar gini jaayegi._`,
      ];
    }
    case "calendar_system": {
      const normalized = trimmedText.toLowerCase();
      if (normalized !== "purnimanta" && normalized !== "amanta") {
        return ["Sirf itna likhiye — purnimanta ya amanta:"];
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
