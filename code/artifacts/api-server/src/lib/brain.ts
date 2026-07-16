import type { Event, Purohit, Yajman } from "@workspace/db";
import { matchField, MAAS_MAX_EDITS, PAKSHA_MAX_EDITS, TITHI_MAX_EDITS } from "./fuzzy-match";
import { maasVocab } from "./vocab/maas";
import { pakshaVocab } from "./vocab/paksha";
import { tithiVocab } from "./vocab/tithi";
import { sendWhatsappMessage, sendWhatsappTemplate } from "./whatsapp-client";
import { logger } from "./logger";
import { retryFetch } from "./retry";
import { buildUpcomingPreRitualCard, toHindi, getTithiHindiName, eventTypeMap } from "./confirm-card";
import { windowFromTime } from "./muhurat";

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
  const response = await retryFetch(`${VEDIKA_BASE_URL}/astrology/panchang`, {
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
  for (let i = 0; i < 8; i++) {
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
          // Update resolved cache columns inline in database
          const cycleYear = new Date(dateStr).getFullYear();
          const window = windowFromTime(match.event.time);

          await db
            .update(eventsTable)
            .set({
              resolvedDate: new Date(dateStr),
              resolvedWindow: window,
              resolvedCycleYear: cycleYear,
            })
            .where(eq(eventsTable.id, match.event.id));

          // Reflect in the matched object
          match.event.resolvedDate = new Date(dateStr);
          match.event.resolvedWindow = window;
          match.event.resolvedCycleYear = cycleYear;

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

/**
 * Persist the current-cycle resolved schedule cache (resolvedDate/window/cycleYear)
 * onto each matched event. Idempotent per event id — re-running overwrites with the
 * freshly resolved values ("store + yearly re-resolve"). Called by the daily-brain
 * cron so the day-sheet reads a warm cache instead of relying on the live fallback.
 */
export async function persistResolvedSchedule(events: ResolvedBrainEvent[]): Promise<void> {
  if (events.length === 0) return;
  const { db, eventsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const cycleYear = new Date().getFullYear();

  await Promise.all(
    events.map(async (e) => {
      try {
        // gregorianDate is "YYYY-MM-DD"; parse as local midnight to match the
        // day-sheet's local [today, +7] BETWEEN filter.
        const resolvedDate = new Date(`${e.gregorianDate}T00:00:00`);
        const resolvedWindow = windowFromTime(e.event.time);
        await db
          .update(eventsTable)
          .set({ resolvedDate, resolvedWindow, resolvedCycleYear: cycleYear })
          .where(eq(eventsTable.id, e.event.id));
      } catch (err) {
        logger.error({ err, eventId: e.event.id }, "Failed to persist resolved schedule cache");
      }
    })
  );
}

export async function dispatchPreRitualAlerts(alerts: ResolvedBrainEvent[]): Promise<void> {
  const CHUNK_SIZE = 20;
  const PRE_RITUAL_ALERT_DAYS = [7, 2];
  for (let i = 0; i < alerts.length; i += CHUNK_SIZE) {
    const chunk = alerts.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (alert) => {
        try {
          const today = new Date();
          const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
          const parts = alert.gregorianDate.split("-");
          const targetUTC = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
          const diffTime = targetUTC.getTime() - todayUTC.getTime();
          const daysRemaining = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          
          if (PRE_RITUAL_ALERT_DAYS.includes(daysRemaining)) {
            await sendPreRitualAlerts(alert, daysRemaining);
          }
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
  const isSolemn = event.event.eventType === "shraddh";
  const templateName = isSolemn ? "smaran_pre_ritual_solemn" : "smaran_pre_ritual_celebratory";

  const purohitName = event.purohit.name.endsWith("जी") ? event.purohit.name : `${event.purohit.name} जी`;
  const maas = toHindi("maas", event.hinduDate.maas);
  const paksha = toHindi("paksha", event.hinduDate.paksha);
  const tithi = getTithiHindiName(event.hinduDate.tithi, event.hinduDate.paksha);
  const eventName = eventTypeMap[event.event.eventType] || event.event.eventType;

  let samagriList = "";
  if (event.event.eventType === "shraddh") {
    samagriList = "- काले तिल (Black Sesame)\n- जौ (Barley)\n- कुशा घास (Kusha Grass)\n- गंगाजल (Ganga Water)\n- सफेद फूल (White Flowers)\n- कपूर, धूप (Camphor, Incense)";
  } else if (event.event.eventType === "katha") {
    samagriList = "- पंजीरी, पंचामृत (Panjiri, Panchamrit)\n- केले के पत्ते (Banana Leaves)\n- कलश (Kalash/Pot)\n- नारियल, सुपारी (Coconut, Betel Nut)\n- रोली, अक्षत (Roli, Rice)\n- फूल, फल, मिठाई (Flowers, Fruits, Sweets)";
  } else if (event.event.eventType === "griha_pravesh") {
    samagriList = "- कलश, नारियल (Kalash, Coconut)\n- आम के पत्ते (Mango Leaves)\n- दूध, दही, शहद (Milk, Curd, Honey)\n- रोली, अक्षत, धूप (Roli, Rice, Incense)\n- हवन सामग्री (Havan Materials)";
  } else if (event.event.eventType === "birthday" || event.event.eventType === "anniversary") {
    samagriList = "- दीपक, आरती थाली (Lamp, Aarti Plate)\n- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- फूल, मिठाई (Flowers, Sweets)";
  } else {
    samagriList = "- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- धूप, दीप, कपूर (Incense, Lamp, Camphor)\n- फूल, फल, प्रसाद (Flowers, Fruits, Prasad)";
  }

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: purohitName },
        { type: "text", text: event.gregorianDate },
        { type: "text", text: `${maas} ${paksha} पक्ष, ${tithi} (शेष दिन: ${daysRemaining})` },
        { type: "text", text: `${event.yajman.familyName} परिवार` },
        { type: "text", text: isSolemn ? `श्राद्ध/पुण्यतिथि ${event.event.label ? `(${event.event.label})` : ""}` : `${eventName} ${event.event.label ? `(${event.event.label})` : ""}` },
        { type: "text", text: samagriList }
      ]
    },
    {
      type: "button",
      sub_type: "quick_reply",
      index: "0",
      parameters: [
        { type: "payload", payload: `booking-confirm:${event.event.id}` }
      ]
    }
  ];

  try {
    await sendWhatsappTemplate(event.purohit.phoneNumber, templateName, components);
  } catch (err) {
    logger.warn({ err, eventId: event.event.id }, "Template send failed, falling back to free-form interactive");
    const card = buildUpcomingPreRitualCard(event, daysRemaining);
    await sendWhatsappMessage(event.purohit.phoneNumber, card);
  }
}

export async function runLapseDetectionScan(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error("runLapseDetectionScan failed: DATABASE_URL is not set");
    return;
  }
  const { db, eventsTable, yajmansTable, purohitsTable, ledgerTable, lapseRecoveriesTable } = await import("@workspace/db");
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
          const hindiMaas = toHindi("maas", event.maas);
          const hindiPaksha = toHindi("paksha", event.paksha);
          const hindiTithi = getTithiHindiName(event.tithi, event.paksha as any);

          const eventLabel = event.label || eventTypeMap[event.eventType] || event.eventType;
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

          // Try template send first
          const templateName = "smaran_lapse_recovery_nudge";
          const components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: purohitGreeting },
                { type: "text", text: familyName },
                { type: "text", text: eventLabel },
                { type: "text", text: `${hindiMaas} ${hindiPaksha} ${hindiTithi}` }
              ]
            },
            {
              type: "button",
              sub_type: "quick_reply",
              index: "0",
              parameters: [
                { type: "payload", payload: `lapse-engage:${event.id}` }
              ]
            }
          ];

          try {
            await sendWhatsappTemplate(purohit.phoneNumber, templateName, components);
          } catch (err) {
            logger.warn({ err, eventId: event.id }, "Template send failed for lapse nudge, falling back to free-form interactive");
            await sendWhatsappMessage(purohit.phoneNumber, payload);
          }

          // Durably record the nudge in lapse_recoveries table
          await db
            .insert(lapseRecoveriesTable)
            .values({
              eventId: event.id,
              purohitId: purohit.id,
              yajmanId: yajman.id,
              cycleYear: currentYear,
              nudgedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [lapseRecoveriesTable.eventId, lapseRecoveriesTable.cycleYear],
              set: { nudgedAt: new Date() },
            });

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

export async function resolveEventGregorianForCycle(
  event: { maas: string; paksha: string; tithi: number; time: string | null },
  purohit: Purohit,
  targetDate: Date
): Promise<{ gregorianDate: Date; window: "morning" | "afternoon" | "evening" | "night" } | null> {
  const window = windowFromTime(event.time);

  // Check the 7 days starting from targetDate
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() + i);
    const dateStr = formatDateStr(d);
    try {
      const panchang = await fetchPanchangForDate(dateStr);
      const targetMaas = purohit.calendarSystem === "purnimanta"
        ? resolvePurnimantaMaas(panchang.maas, panchang.paksha)
        : panchang.maas;

      if (
        event.maas === targetMaas &&
        event.paksha === panchang.paksha &&
        event.tithi === panchang.tithi
      ) {
        return {
          gregorianDate: d,
          window,
        };
      }
    } catch (err) {
      logger.error({ err, date: dateStr }, "Failed to fetch panchang in resolveEventGregorianForCycle");
    }
  }
  return null;
}

