import type { Event, Purohit, Yajman } from "@workspace/db";
import { matchField, MAAS_MAX_EDITS, PAKSHA_MAX_EDITS, TITHI_MAX_EDITS } from "./fuzzy-match";
import { maasVocab } from "./vocab/maas";
import { pakshaVocab } from "./vocab/paksha";
import { tithiVocab } from "./vocab/tithi";
import { sendWhatsappMessage } from "./whatsapp-client";
import { logger } from "./logger";
import { buildUpcomingPreRitualCard } from "./confirm-card";

export interface ResolvedBrainEvent {
  event: Event;
  yajman: Yajman;
  purohit: Purohit;
  gregorianDate: string;
  hinduDate: {
    maas: string;
    paksha: "Shukla" | "Krishna";
    tithi: number;
  };
}

const HINDI_EVENT_TYPES: Record<string, string> = {
  shraddh: "श्राद्ध / पुण्यतिथि",
  katha: "सत्यनारायण कथा",
  birthday: "जन्मदिन पूजा",
  griha_pravesh: "गृह प्रवेश",
  anniversary: "वर्षगांठ पूजा",
  other: "अन्य पूजा",
};

const HINDI_MONTHS: Record<string, string> = {
  Chaitra: "चैत्र",
  Vaishakha: "वैशाख",
  Jyeshtha: "ज्येष्ठ",
  Ashadha: "आषाढ़",
  Shravana: "श्रावण",
  Bhadrapada: "भाद्रपद",
  Ashwina: "आश्विन",
  Kartika: "कार्तिक",
  Margashirsha: "मार्गशीर्ष",
  Pausha: "पौष",
  Magha: "माघ",
  Phalguna: "फाल्गुन",
};

const HINDI_PAKSHAS: Record<string, string> = {
  Shukla: "शुक्ल",
  Krishna: "कृष्ण",
};

const HINDI_TITHIS: Record<number, string> = {
  1: "प्रतिपदा",
  2: "द्वितीया",
  3: "तृतीया",
  4: "चतुर्थी",
  5: "पंचमी",
  6: "षष्ठी",
  7: "सप्तमी",
  8: "अष्टमी",
  9: "नवमी",
  10: "दशमी",
  11: "एकादशी",
  12: "द्वादशी",
  13: "त्रयोदशी",
  14: "चतुर्दशी",
};

function getHindiTithiName(tithiNum: number, paksha: "Shukla" | "Krishna"): string {
  if (tithiNum === 15) {
    return paksha === "Shukla" ? "पूर्णिमा" : "अमावस्या";
  }
  return HINDI_TITHIS[tithiNum] ?? `तिथि ${tithiNum}`;
}

export function formatDateStr(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function resolvePurnimantaMaas(amantaMaas: string, paksha: "Shukla" | "Krishna"): string {
  if (paksha === "Shukla") {
    return amantaMaas;
  }
  
  // Array of months in sequence
  const months = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
  ];
  
  const idx = months.indexOf(amantaMaas);
  if (idx === -1) return amantaMaas;
  
  // Krishna Paksha in Purnimanta belongs to the next month's name
  const nextIdx = (idx + 1) % 12;
  return months[nextIdx];
}

async function fetchPanchangForDate(dateStr: string) {
  const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
  const VEDIKA_BASE_URL = VEDIKA_API_KEY
    ? (process.env.VEDIKA_API_BASE_URL ?? "https://api.vedika.io")
    : "https://api.vedika.io/sandbox";

  const DEFAULT_LATITUDE = 25.3176;
  const DEFAULT_LONGITUDE = 82.9739;
  const DEFAULT_TIMEZONE = "+05:30";

  const datetime = `${dateStr}T06:00:00${DEFAULT_TIMEZONE}`;
  const response = await fetch(`${VEDIKA_BASE_URL}/astrology/panchang`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(VEDIKA_API_KEY ? { Authorization: `Bearer ${VEDIKA_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      datetime,
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      timezone: DEFAULT_TIMEZONE,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Panchang data from Vedika API: ${response.statusText}`);
  }

  const body = (await response.json()) as Record<string, any>;
  const d = body.data ?? {};

  // Normalize month name
  const rawMasaName = d.masa?.name ?? "Unknown";
  const matchedMasa = matchField(rawMasaName, maasVocab, MAAS_MAX_EDITS);
  const maas = matchedMasa.canonical ?? rawMasaName;

  // Normalize paksha
  const rawPaksha = d.tithi?.paksha?.name ?? "Unknown";
  const matchedPaksha = matchField(rawPaksha, pakshaVocab, PAKSHA_MAX_EDITS);
  const paksha = (matchedPaksha.canonical as "Shukla" | "Krishna") ?? "Shukla";

  // Resolve tithi number
  let tithi = d.tithi?.number;
  if (tithi === undefined || tithi === null || tithi === 0) {
    const rawTithiName = d.tithi?.name;
    if (rawTithiName) {
      const match = matchField(rawTithiName, tithiVocab, TITHI_MAX_EDITS);
      if (match.canonical !== null) {
        tithi = tithiVocab.find((v) => v.canonical === match.canonical)?.tithiNumber;
      }
    }
  }

  return {
    maas,
    paksha,
    tithi: tithi ?? 0,
  };
}

export async function resolveUpcomingEventsForWeek(targetDate: Date): Promise<ResolvedBrainEvent[]> {
  const resolvedEvents: ResolvedBrainEvent[] = [];

  // All database access is dynamically gated
  if (!process.env.DATABASE_URL) {
    logger.error("resolveUpcomingEventsForWeek failed: DATABASE_URL is not set");
    return [];
  }
  const { db, eventsTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  // Query all active purohits
  const purohits = await db.select().from(purohitsTable);
  if (purohits.length === 0) {
    return [];
  }

  // Generate 7 days starting from targetDate
  const days: { dateStr: string; dateObj: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() + i);
    days.push({ dateStr: formatDateStr(d), dateObj: d });
  }

  // Fetch panchang data for the 7 days
  const panchangData: Array<{
    dateStr: string;
    maas: string;
    paksha: "Shukla" | "Krishna";
    tithi: number;
  }> = [];

  await Promise.all(
    days.map(async (day) => {
      try {
        const panchang = await fetchPanchangForDate(day.dateStr);
        panchangData.push({
          dateStr: day.dateStr,
          maas: panchang.maas,
          paksha: panchang.paksha,
          tithi: panchang.tithi,
        });
      } catch (err) {
        logger.error({ err, date: day.dateStr }, "Failed to fetch panchang for date");
      }
    })
  );

  // Match events for each purohit and day
  for (const purohit of purohits) {
    for (const dayPanchang of panchangData) {
      const { dateStr, maas, paksha, tithi } = dayPanchang;
      if (tithi === 0) continue;

      // Translate month name if purohit is purnimanta
      const targetMaas = purohit.calendarSystem === "purnimanta"
        ? resolvePurnimantaMaas(maas, paksha)
        : maas;

      try {
        const matches = await db
          .select({
            event: eventsTable,
            yajman: yajmansTable,
          })
          .from(eventsTable)
          .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
          .where(
            and(
              eq(yajmansTable.purohitId, purohit.id),
              eq(eventsTable.maas, targetMaas),
              eq(eventsTable.paksha, paksha),
              eq(eventsTable.tithi, tithi)
            )
          );

        for (const match of matches) {
          resolvedEvents.push({
            event: match.event,
            yajman: match.yajman,
            purohit,
            gregorianDate: dateStr,
            hinduDate: {
              maas,
              paksha,
              tithi,
            },
          });
        }
      } catch (err) {
        logger.error(
          { err, purohitId: purohit.id, targetMaas, paksha, tithi },
          "Failed to query events for purohit"
        );
      }
    }
  }

  return resolvedEvents;
}

export async function sendPreRitualAlert(resolved: ResolvedBrainEvent): Promise<void> {
  const { event, yajman, purohit, gregorianDate, hinduDate } = resolved;

  const isSolemn = event.eventType === "shraddh";
  const hindiMaas = HINDI_MONTHS[hinduDate.maas] ?? hinduDate.maas;
  const hindiPaksha = HINDI_PAKSHAS[hinduDate.paksha] ?? hinduDate.paksha;
  const hindiTithi = getHindiTithiName(hinduDate.tithi, hinduDate.paksha);

  let samagriList = "";
  if (event.eventType === "shraddh") {
    samagriList = "- काले तिल (Black Sesame)\n- जौ (Barley)\n- कुशा घास (Kusha Grass)\n- गंगाजल (Ganga Water)\n- सफेद फूल (White Flowers)\n- कपूर, धूप (Camphor, Incense)";
  } else if (event.eventType === "katha") {
    samagriList = "- पंजीरी, पंचामृत (Panjiri, Panchamrit)\n- केले के पत्ते (Banana Leaves)\n- कलश (Kalash/Pot)\n- नारियल, सुपारी (Coconut, Betel Nut)\n- रोली, अक्षत (Roli, Rice)\n- फूल, फल, मिठाई (Flowers, Fruits, Sweets)";
  } else if (event.eventType === "griha_pravesh") {
    samagriList = "- कलश, नारियल (Kalash, Coconut)\n- आम के पत्ते (Mango Leaves)\n- दूध, दही, शहद (Milk, Curd, Honey)\n- रोली, अक्षत, धूप (Roli, Rice, Incense)\n- हवन सामग्री (Havan Materials)";
  } else if (event.eventType === "birthday" || event.eventType === "anniversary") {
    samagriList = "- दीपक, आरती थाली (Lamp, Aarti Plate)\n- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- फूल, मिठाई (Flowers, Sweets)";
  } else {
    samagriList = "- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- धूप, दीप, कपूर (Incense, Lamp, Camphor)\n- फूल, फल, प्रसाद (Flowers, Fruits, Prasad)";
  }

  const eventName = HINDI_EVENT_TYPES[event.eventType] ?? event.eventType;
  const yajmanName = yajman.familyName;

  let bodyText = "";
  if (isSolemn) {
    bodyText = `आदरणीय ${purohit.name} जी, प्रणाम।\n\nआगामी तिथि को निम्नलिखित श्राद्ध अनुष्ठान निर्धारित है:\n\n📅 तिथि: ${gregorianDate} (${hindiMaas} ${hindiPaksha} पक्ष, ${hindiTithi})\n👤 यजमान: ${yajmanName} परिवार\n📿 अनुष्ठान: श्राद्ध/पुण्यतिथि ${event.label ? `(${event.label})` : ""}\n\nआवश्यक सामग्री सूची:\n${samagriList}\n\nकृपया पूजा की पुष्टि करें।`;
  } else {
    bodyText = `जय श्री राम ${purohit.name} जी!\n\nआगामी तिथि को निम्नलिखित मांगलिक कार्य निर्धारित है:\n\n📅 तिथि: ${gregorianDate} (${hindiMaas} ${hindiPaksha} पक्ष, ${hindiTithi})\n👤 यजमान: ${yajmanName} परिवार\n🎉 अनुष्ठान: ${eventName} ${event.label ? `(${event.label})` : ""}\n\nआवश्यक सामग्री सूची:\n${samagriList}\n\nकृपया पूजा की पुष्टि करें।`;
  }

  const payload = {
    type: "interactive" as const,
    interactive: {
      type: "button" as const,
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply" as const,
            reply: {
              id: `confirm-ritual:${event.id}:${gregorianDate}`,
              title: "✓ पूजा की पुष्टि",
            },
          },
        ],
      },
    },
  };

  await sendWhatsappMessage(purohit.phoneNumber, payload);
}

export async function dispatchPreRitualAlerts(alerts: ResolvedBrainEvent[]): Promise<void> {
  const CHUNK_SIZE = 20;
  for (let i = 0; i < alerts.length; i += CHUNK_SIZE) {
    const chunk = alerts.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (alert) => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const targetDate = new Date(alert.gregorianDate);
          targetDate.setHours(0, 0, 0, 0);
          const diffTime = targetDate.getTime() - today.getTime();
          const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          await sendPreRitualAlerts(alert, daysRemaining);
        } catch (err) {
          logger.error(err, `Failed to send alert for event ${alert.event.id}`);
        }
      })
    );
    if (i + CHUNK_SIZE < alerts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function sendPreRitualAlerts(event: ResolvedBrainEvent, daysRemaining: number): Promise<void> {
  const card = buildUpcomingPreRitualCard(event, daysRemaining);
  await sendWhatsappMessage(event.purohit.phoneNumber, card);
}

export async function runLapseDetectionScan(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error("runLapseDetectionScan failed: DATABASE_URL is not set");
    return;
  }
  const { db, eventsTable, yajmansTable, purohitsTable, ledgerTable } = await import("@workspace/db");
  const { eq, and, lt, gte, lte } = await import("drizzle-orm");

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  // 1. Query all active events records where last_performed_year is less than current year
  const events = await db
    .select({
      event: eventsTable,
      yajman: yajmansTable,
      purohit: purohitsTable,
    })
    .from(eventsTable)
    .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
    .innerJoin(purohitsTable, eq(eventsTable.purohitId, purohitsTable.id))
    .where(lt(eventsTable.lastPerformedYear, currentYear));

  const itemsToNudge: Array<{
    event: typeof eventsTable.$inferSelect;
    yajman: typeof yajmansTable.$inferSelect;
    purohit: typeof purohitsTable.$inferSelect;
  }> = [];

  // 2. Filter out events where a booking already exists in the current year
  for (const match of events) {
    const bookings = await db
      .select()
      .from(ledgerTable)
      .where(
        and(
          eq(ledgerTable.eventId, match.event.id),
          gte(ledgerTable.createdAt, startOfYear),
          lte(ledgerTable.createdAt, endOfYear)
        )
      );

    if (bookings.length === 0) {
      itemsToNudge.push(match);
    }
  }

  // 3. Batch dispatch nudge notifications using CHUNK_SIZE = 20 to avoid rate limits
  const CHUNK_SIZE = 20;
  for (let i = 0; i < itemsToNudge.length; i += CHUNK_SIZE) {
    const chunk = itemsToNudge.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ event, yajman, purohit }) => {
        try {
          const hindiMaas = HINDI_MONTHS[event.maas] ?? event.maas;
          const hindiPaksha = HINDI_PAKSHAS[event.paksha] ?? event.paksha;
          const hindiTithi = getHindiTithiName(event.tithi, event.paksha as any);

          const eventLabel = event.label || HINDI_EVENT_TYPES[event.eventType] || event.eventType;
          const familyName = yajman.familyName;
          const purohitGreeting = purohit.name.endsWith("जी") ? purohit.name : `${purohit.name} जी`;

          const bodyText = `${purohitGreeting}, यजमान ${familyName} के परिवार का ${eventLabel} (${hindiMaas} ${hindiPaksha} ${hindiTithi}) इस वर्ष अभी बुक नहीं हुआ है। क्या आप उन्हें संपर्क करना चाहते हैं?`;

          const payload = {
            type: "interactive" as const,
            interactive: {
              type: "button" as const,
              body: {
                text: bodyText,
              },
              action: {
                buttons: [
                  {
                    type: "reply" as const,
                    reply: {
                      id: `lapse-engage:${event.id}`,
                      title: "नियत करें",
                    },
                  },
                ],
              },
            },
          };

          await sendWhatsappMessage(purohit.phoneNumber, payload);
          logger.info({ eventId: event.id, purohitId: purohit.id, yajmanId: yajman.id }, "Lapse recovery nudge dispatched");
        } catch (err) {
          logger.error({ err, eventId: event.id }, `Failed to send lapse nudge for event ${event.id}`);
        }
      })
    );

    if (i + CHUNK_SIZE < itemsToNudge.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

