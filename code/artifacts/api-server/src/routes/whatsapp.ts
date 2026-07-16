import { Router, type IRouter } from "express";
import { SendWhatsappMessageResponse, ListWhatsappMessagesResponseItem, ListWhatsappOutboundMessagesResponseItem } from "@workspace/api-zod";
import { handleOnboardingMessage } from "../lib/onboarding";
import { sendWhatsappMessage, getOutboundMessages, WhatsappSendError } from "../lib/whatsapp-client";
import { eq, and } from "drizzle-orm";


const router: IRouter = Router();

// Meta WhatsApp Cloud API test layer.
// Requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID from the Meta App
// Dashboard (WhatsApp > API Setup) and WHATSAPP_VERIFY_TOKEN (any string you
// choose, must match what you enter in the Meta webhook config).
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// In-memory ring buffer of recently received messages, for demo purposes only.
// Not persisted -- restarting the server clears it.
const MAX_MESSAGES = 50;
const inboundMessages: Array<{ from: string; text: string; receivedAt: string }> = [];

const MAX_DEDUP_MESSAGES = 500;
const processedMessageIds: string[] = [];
const processedMessageIdSet = new Set<string>();

router.post("/whatsapp/send", async (req, res) => {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    res.status(502).json({
      error: "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    });
    return;
  }

  const { to, message } = req.body ?? {};
  if (typeof to !== "string" || typeof message !== "string") {
    res.status(400).json({ error: "Body must include 'to' and 'message' strings" });
    return;
  }

  try {
    const result = await sendWhatsappMessage(to, { type: "text", text: { body: message } });
    const data = SendWhatsappMessageResponse.parse({
      status: "sent",
      messageId: result.messageId,
    });
    res.json(data);
  } catch (err) {
    if (err instanceof WhatsappSendError && err.status && err.body) {
      req.log.error({ status: err.status, body: err.body }, "Meta WhatsApp API returned an error");
      res.status(502).json({
        error: err.body?.error?.message ?? "Failed to send WhatsApp message via Meta API",
      });
    } else {
      req.log.error({ err }, "Failed to reach Meta WhatsApp API");
      res.status(502).json({ error: "Failed to reach Meta WhatsApp API" });
    }
  }
});

router.get("/whatsapp/messages", (_req, res) => {
  const data = inboundMessages
    .slice()
    .reverse()
    .map((m) => ListWhatsappMessagesResponseItem.parse(m));
  res.json(data);
});

router.get("/whatsapp/outbound", (_req, res) => {
  const data = getOutboundMessages()
    .slice()
    .reverse()
    .map((m) => ListWhatsappOutboundMessagesResponseItem.parse(m));
  res.json(data);
});

// Meta calls this once with a GET to verify the webhook URL you register.
router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

// Meta calls this for every inbound message / status update.
router.post("/whatsapp/webhook", async (req, res) => {


  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    if (!Array.isArray(messages)) {
      if (!res.headersSent) res.sendStatus(200);
      return;
    }

    for (const msg of messages) {
      if (msg.id) {
        if (processedMessageIdSet.has(msg.id)) {
          req.log.debug({ messageId: msg.id }, "duplicate webhook delivery, skipping");
          continue;
        }
        processedMessageIdSet.add(msg.id);
        processedMessageIds.push(msg.id);
        if (processedMessageIds.length > MAX_DEDUP_MESSAGES) {
          const oldest = processedMessageIds.shift();
          if (oldest !== undefined) {
            processedMessageIdSet.delete(oldest);
          }
        }
      }

      // RELATIONSHIP ISOLATION CHECK (FAM-03)
      const { db: dbIso, yajmansTable } = await import("@workspace/db");
      const yajmans = await dbIso
        .select()
        .from(yajmansTable)
        .where(eq(yajmansTable.whatsappNumber, msg.from))
        .limit(1);

      if (yajmans.length > 0) {
        const yajman = yajmans[0];
        let resourceId: string | null = null;
        if (msg.type === "interactive") {
          const interactiveId = msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id;
          if (interactiveId) {
            const parts = interactiveId.split(":");
            if (parts.length >= 2) {
              resourceId = parts[1];
            }
          }
        } else if (msg.type === "text") {
          const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
          const match = (msg.text?.body ?? "").match(uuidRegex);
          if (match) {
            resourceId = match[0];
          }
        }

        if (resourceId) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(resourceId)) {
            const { ledgerTable, eventsTable } = await import("@workspace/db");
            const [ledger] = await dbIso
              .select()
              .from(ledgerTable)
              .where(eq(ledgerTable.id, resourceId))
              .limit(1);

            if (ledger && ledger.purohitId !== yajman.purohitId) {
              req.log.error(
                { from: msg.from, yajmanPurohitId: yajman.purohitId, ledgerPurohitId: ledger.purohitId },
                "Tenant isolation violation: cross-purohit ledger access blocked"
              );
              res.status(403).json({ error: "Forbidden" });
              return;
            }

            const [event] = await dbIso
              .select()
              .from(eventsTable)
              .where(eq(eventsTable.id, resourceId))
              .limit(1);

            if (event && event.purohitId !== yajman.purohitId) {
              req.log.error(
                { from: msg.from, yajmanPurohitId: yajman.purohitId, eventPurohitId: event.purohitId },
                "Tenant isolation violation: cross-purohit event access blocked"
              );
              res.status(403).json({ error: "Forbidden" });
              return;
            }
          }
        }
      }

      if (msg.type === "text") {
        inboundMessages.push({
          from: msg.from,
          text: msg.text?.body ?? "",
          receivedAt: new Date().toISOString(),
        });
        if (inboundMessages.length > MAX_MESSAGES) inboundMessages.shift();
        req.log.info({ from: msg.from }, "Received WhatsApp message");

        try {
          const { db, purohitsTable } = await import("@workspace/db");
          const purohits = await db
            .select()
            .from(purohitsTable)
            .where(eq(purohitsTable.phoneNumber, msg.from))
            .limit(1);

          if (purohits.length > 0) {
            const purohit = purohits[0];

            const normalizedText = (msg.text?.body ?? "").trim().toLowerCase();
            if (normalizedText === "my week" || normalizedText === "इस हफ्ते") {
              let responseText = "";
              try {
                const { db, eventsTable, yajmansTable } = await import("@workspace/db");
                const { and, eq, gte, lte, asc } = await import("drizzle-orm");
                const { windowFromTime } = await import("../lib/muhurat");

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(today);
                endOfWeek.setDate(today.getDate() + 7);
                endOfWeek.setHours(23, 59, 59, 999);
                const currentYear = today.getFullYear();

                let weeklyEvents = await db
                  .select({
                    event: eventsTable,
                    yajman: yajmansTable,
                  })
                  .from(eventsTable)
                  .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
                  .where(
                    and(
                      eq(eventsTable.purohitId, purohit.id),
                      eq(eventsTable.resolvedCycleYear, currentYear),
                      gte(eventsTable.resolvedDate, today),
                      lte(eventsTable.resolvedDate, endOfWeek)
                    )
                  )
                  .orderBy(asc(eventsTable.resolvedDate), asc(eventsTable.time));

                // Fallback to live resolution if cache is empty / cold
                if (weeklyEvents.length === 0) {
                  const { resolveUpcomingEventsForWeek } = await import("../lib/brain");
                  const liveEvents = await resolveUpcomingEventsForWeek(today);
                  
                  // Filter to this purohit. Carry the live-resolved gregorianDate
                  // onto the row: cold-cache events have a null resolvedDate (that's
                  // why the fallback ran), and the grouping loop below skips any row
                  // whose resolvedDate is null.
                  const filtered = liveEvents.filter(e => e.purohit.id === purohit.id);
                  weeklyEvents = filtered.map(e => ({
                    event: {
                      ...e.event,
                      resolvedDate: new Date(`${e.gregorianDate}T00:00:00`),
                      resolvedWindow: e.event.resolvedWindow ?? windowFromTime(e.event.time),
                    },
                    yajman: e.yajman,
                  }));
                }

                const formatDaySheetHeader = (d: Date) => {
                  const dd = String(d.getDate()).padStart(2, "0");
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const yyyy = d.getFullYear();
                  const hindiDays = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
                  const dayName = hindiDays[d.getDay()];
                  return `${dd}-${mm}-${yyyy} (${dayName})`;
                };

                const getWindowDisplayName = (window: string) => {
                  if (window === "morning") return "🌅 सुबह";
                  if (window === "afternoon") return "☀️ दोपहर";
                  if (window === "evening") return "🌇 शाम";
                  return "🌙 रात";
                };

                // Groups will map: dateKey -> window -> Array of events
                const groups: { [dateKey: string]: { [window: string]: Array<{ time: string; label: string; familyName: string }> } } = {};

                for (const row of weeklyEvents) {
                  const resolvedDate = row.event.resolvedDate;
                  if (!resolvedDate || !row.event.time) continue;
                  const dateObj = new Date(resolvedDate);
                  const dateKey = formatDaySheetHeader(dateObj);
                  
                  const window = row.event.resolvedWindow ?? windowFromTime(row.event.time);
                  
                  if (!groups[dateKey]) {
                    groups[dateKey] = {};
                  }
                  if (!groups[dateKey][window]) {
                    groups[dateKey][window] = [];
                  }
                  groups[dateKey][window].push({
                    time: row.event.time,
                    label: row.event.label || row.event.eventType,
                    familyName: row.yajman.familyName,
                  });
                }

                responseText = "📅 आपका साप्ताहिक कार्यक्रम:\n";
                if (Object.keys(groups).length === 0) {
                  responseText += "\nइस हफ्ते कोई अनुष्ठान निर्धारित नहीं है।";
                } else {
                  for (const [dateHeader, windows] of Object.entries(groups)) {
                    responseText += `\n*${dateHeader}*\n`;
                    const windowOrder = ["morning", "afternoon", "evening", "night"];
                    for (const w of windowOrder) {
                      const events = windows[w];
                      if (events && events.length > 0) {
                        responseText += `  ${getWindowDisplayName(w)}:\n`;
                        for (const e of events) {
                          responseText += `    • ${e.time} - ${e.label} (यजमान: ${e.familyName})\n`;
                        }
                      }
                    }
                  }
                }
              } catch (err) {
                console.error("DAY-SHEET ERROR:", err);
                req.log.error({ err, from: msg.from }, "Failed to generate day-sheet report");
                responseText = "साप्ताहिक कार्यक्रम प्राप्त करने में त्रुटि हुई।";
              }

              try {
                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: { body: responseText },
                });
              } catch (sendErr) {
                req.log.error({ err: sendErr, to: msg.from }, "Failed to send day-sheet report message");
              }
              continue;
            }

            if (normalizedText === "referral" || normalizedText === "आमंत्रण") {
              const { buildReferralCard } = await import("../lib/confirm-card");
              try {
                await sendWhatsappMessage(msg.from, buildReferralCard(purohit.id, purohit.name));
              } catch (sendErr) {
                req.log.error({ sendErr, purohitId: purohit.id }, "Failed to send referral card");
              }
              continue;
            }

            try {
              const { findAwaitingAmountEntry, recordDakshinaAmount } = await import("../lib/ledger");
              const awaiting = await findAwaitingAmountEntry(purohit.id);
              if (awaiting) {
                const rawDigits = (msg.text?.body ?? "").replace(/[^0-9.]/g, "");
                const amount = parseFloat(rawDigits);

                if (Number.isNaN(amount) || amount <= 0) {
                  await sendWhatsappMessage(msg.from, {
                    type: "text",
                    text: { body: "कृपया सही दक्षिणा राशि भेजें (केवल संख्या में)।" },
                  });
                  continue;
                }

                const updatedLedger = await recordDakshinaAmount(awaiting.id, purohit.id, amount);

                const { db: dbInner, yajmansTable, eventsTable } = await import("@workspace/db");
                const [yajmanRow] = await dbInner
                  .select()
                  .from(yajmansTable)
                  .where(eq(yajmansTable.id, updatedLedger.yajmanId))
                  .limit(1);

                let eventLabel = "अनुष्ठान";
                if (updatedLedger.eventId) {
                  const [eventRow] = await dbInner
                    .select()
                    .from(eventsTable)
                    .where(eq(eventsTable.id, updatedLedger.eventId))
                    .limit(1);
                  eventLabel = eventRow?.label || eventRow?.eventType || "अनुष्ठान";
                }

                const { isValidUpiId, buildUpiDeepLink } = await import("../lib/upi");

                if (!isValidUpiId(purohit.upiId)) {
                  req.log.error({ purohitId: purohit.id }, "Purohit UPI ID failed validation; dakshina card dispatch aborted");
                  await sendWhatsappMessage(msg.from, {
                    type: "text",
                    text: { body: "आपकी UPI ID मान्य नहीं है। कृपया सहायता से संपर्क करें — दक्षिणा लिंक नहीं भेजा जा सका।" },
                  });
                  continue;
                }

                const upiLink = buildUpiDeepLink(purohit.upiId, purohit.name, amount, eventLabel);
                const { buildPostRitualPurohitCard, buildPostRitualFamilyCard } = await import("../lib/confirm-card");

                // Each dispatch is caught individually so a Meta API failure on one
                // side (e.g. missing WHATSAPP_ACCESS_TOKEN in this environment) does
                // not prevent the other party's card from being dispatched -- both
                // sends still record to the outbound ring buffer before any throw.
                try {
                  await sendWhatsappMessage(
                    msg.from,
                    buildPostRitualPurohitCard(updatedLedger.id, yajmanRow?.familyName ?? "यजमान", eventLabel, upiLink)
                  );
                } catch (err) {
                  req.log.error({ err, ledgerId: updatedLedger.id }, "Failed to send post-ritual purohit card");
                }

                if (yajmanRow?.whatsappNumber) {
                  try {
                    await sendWhatsappMessage(
                      yajmanRow.whatsappNumber,
                      buildPostRitualFamilyCard(updatedLedger.id, purohit.name, eventLabel, upiLink)
                    );
                  } catch (err) {
                    req.log.error({ err, ledgerId: updatedLedger.id }, "Failed to send post-ritual family card");
                  }
                } else {
                  req.log.warn({ ledgerId: updatedLedger.id }, "No family WhatsApp number on file; post-ritual family card not sent");
                }

                continue;
              }
            } catch (err) {
              req.log.error({ err, from: msg.from }, "Failed to process dakshina amount-capture reply");
            }

            const { findPendingCorrectionJob, applyFreeTextCorrection } = await import("../lib/ingest");
            const pending = await findPendingCorrectionJob(purohit.id);
            if (pending) {
              const job = pending.job;
              const fieldPath = pending.fieldPath;
              // It's a correction reply! Run it as fire-and-forget
              (async () => {
                try {
                  await applyFreeTextCorrection(job.id, fieldPath, msg.text.body, purohit.id);
                } catch (err) {
                  req.log.error({ err, jobId: job.id, fieldPath }, "Failed to apply free text correction");
                }
              })();
              continue;
            }
          }
        } catch (err) {
          req.log.error({ err, from: msg.from }, "Failed to check or apply pending correction for text message");
        }

        const replies = await handleOnboardingMessage(msg.from, msg.text?.body ?? "");
        for (const reply of replies) {
          try {
            await sendWhatsappMessage(msg.from, { type: "text", text: { body: reply } });
          } catch (err) {
            req.log.error({ err, from: msg.from }, "Failed to send onboarding reply");
          }
        }
      } else if (msg.type === "audio") {
        const audioId = msg.audio?.id;
        if (!audioId) continue;

        try {
          const { db, purohitsTable, ingestJobsTable } = await import("@workspace/db");
          const purohits = await db
            .select()
            .from(purohitsTable)
            .where(eq(purohitsTable.phoneNumber, msg.from))
            .limit(1);

          if (purohits.length === 0) {
            req.log.warn({ from: msg.from }, "Received audio message from unregistered number");
            continue;
          }
          const purohit = purohits[0];

          // Reject all pending awaiting_confirm jobs for this purohit
          const pendingJobs = await db
            .select()
            .from(ingestJobsTable)
            .where(
              and(
                eq(ingestJobsTable.purohitId, purohit.id),
                eq(ingestJobsTable.status, "awaiting_confirm")
              )
            );

          const { rejectJob } = await import("../lib/ingest");
          for (const job of pendingJobs) {
            try {
              await rejectJob(job.id);
            } catch (err) {
              req.log.error({ err, jobId: job.id }, "Failed to reject pending job on supersession");
            }
          }

          // Run voice pipeline in background
          (async () => {
            try {
              const { createIngestJob, runIngestPipeline } = await import("../lib/ingest");
              const job = await createIngestJob(purohit.id, "voice");
              await runIngestPipeline(job, purohit, audioId, msg.audio.duration);
            } catch (err) {
              req.log.error({ err, msg }, "Error running voice ingest pipeline");
            }
          })();
        } catch (err) {
          req.log.error({ err, msg }, "Failed to process inbound audio webhook message");
        }
      } else if (msg.type === "image") {
        const imageId = msg.image?.id;
        if (!imageId) continue;

        try {
          const { db, purohitsTable, ingestJobsTable } = await import("@workspace/db");
          const purohits = await db
            .select()
            .from(purohitsTable)
            .where(eq(purohitsTable.phoneNumber, msg.from))
            .limit(1);

          if (purohits.length === 0) {
            req.log.warn({ from: msg.from }, "Received image message from unregistered number");
            continue;
          }
          const purohit = purohits[0];

          // Reject all pending awaiting_confirm jobs for this purohit
          const pendingJobs = await db
            .select()
            .from(ingestJobsTable)
            .where(
              and(
                eq(ingestJobsTable.purohitId, purohit.id),
                eq(ingestJobsTable.status, "awaiting_confirm")
              )
            );

          const { rejectJob } = await import("../lib/ingest");
          for (const job of pendingJobs) {
            try {
              await rejectJob(job.id);
            } catch (err) {
              req.log.error({ err, jobId: job.id }, "Failed to reject pending job on supersession");
            }
          }

          // Run photo pipeline in background
          (async () => {
            try {
              const { createIngestJob, runIngestPipeline } = await import("../lib/ingest");
              const job = await createIngestJob(purohit.id, "photo");
              await runIngestPipeline(job, purohit, imageId);
            } catch (err) {
              req.log.error({ err, msg }, "Error running photo ingest pipeline");
            }
          })();
        } catch (err) {
          req.log.error({ err, msg }, "Failed to process inbound image webhook message");
        }
      } else if (msg.type === "interactive") {
        const interactiveId = msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id;
        if (!interactiveId) continue;

        const parts = interactiveId.split(":");
        if (parts.length < 2) {
          req.log.warn({ interactiveId }, "Unrecognized interactive ID format");
          continue;
        }

        const action = parts[0];
        const idParam = parts[1];

        if (action === "subscribe-confirm") {
          const yajmanId = idParam;
          (async () => {
            try {
              if (!process.env.DATABASE_URL) {
                req.log.warn("Database URL not set; skipping subscribe-confirm operation");
                return;
              }
              const { db, yajmansTable } = await import("@workspace/db");
              const { activateSubscriptionForYajman } = await import("../lib/subscription");

              // Resolve the sender's yajman
              const [senderYajman] = await db
                .select()
                .from(yajmansTable)
                .where(eq(yajmansTable.whatsappNumber, msg.from))
                .limit(1);

              if (!senderYajman) {
                req.log.warn({ from: msg.from }, "Unregistered yajman number for subscribe-confirm");
                return;
              }

              // Activate subscription (ownership check is inside the helper)
              await activateSubscriptionForYajman(yajmanId, senderYajman.purohitId);

              await sendWhatsappMessage(msg.from, {
                type: "text",
                text: {
                  body: "आपकी सदस्यता सक्रिय कर दी गई है। धन्यवाद!",
                },
              });
            } catch (err) {
              req.log.error({ err, yajmanId, from: msg.from }, "Error in subscribe-confirm callback");
            }
          })();
          continue;
        }

        if (action === "ledger-claim" || action === "ledger-confirm") {
          const ledgerId = idParam;
          (async () => {
            try {
              if (!process.env.DATABASE_URL) {
                req.log.warn("Database URL not set; skipping ledger database operation");
                return;
              }

              const { db, purohitsTable, yajmansTable, ledgerTable } = await import("@workspace/db");
              const { claimLedgerEntry, confirmLedgerEntry } = await import("../lib/ledger");

              const [ledger] = await db
                .select()
                .from(ledgerTable)
                .where(eq(ledgerTable.id, ledgerId))
                .limit(1);

              if (!ledger) {
                req.log.warn({ ledgerId }, "Ledger entry not found for callback");
                return;
              }

              if (action === "ledger-claim") {
                const [purohit] = await db
                  .select()
                  .from(purohitsTable)
                  .where(eq(purohitsTable.phoneNumber, msg.from))
                  .limit(1);

                if (!purohit || ledger.purohitId !== purohit.id) {
                  req.log.warn({ from: msg.from, ledgerPurohitId: ledger.purohitId }, "Unauthorized claim attempt");
                  return;
                }

                if (ledger.paymentStatus === "claimed" || ledger.paymentStatus === "corroborated") {
                  req.log.info({ ledgerId }, "Ledger already claimed/corroborated. No-op for double-tap.");
                  return;
                }

                await claimLedgerEntry(ledgerId, purohit.id);
                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: { body: "दक्षिणा प्राप्त हुई, बही खाता अपडेट कर दिया गया है।" },
                });
              } else {
                const [yajman] = await db
                  .select()
                  .from(yajmansTable)
                  .where(eq(yajmansTable.whatsappNumber, msg.from))
                  .limit(1);

                if (!yajman || ledger.yajmanId !== yajman.id) {
                  req.log.warn({ from: msg.from, ledgerYajmanId: ledger.yajmanId }, "Unauthorized confirm attempt");
                  return;
                }

                if (ledger.paymentStatus === "corroborated") {
                  req.log.info({ ledgerId }, "Ledger already corroborated. No-op for double-tap.");
                  return;
                }

                if (ledger.paymentStatus !== "claimed") {
                  req.log.warn({ ledgerId, status: ledger.paymentStatus }, "Cannot confirm ledger before claim");
                  return;
                }

                await confirmLedgerEntry(ledgerId, yajman.id);
                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: { body: "पुष्टि के लिए धन्यवाद।" },
                });

                if (yajman.familySubStatus === "none" || !yajman.familySubStatus) {
                  const [purohit] = await db
                    .select()
                    .from(purohitsTable)
                    .where(eq(purohitsTable.id, yajman.purohitId))
                    .limit(1);

                  if (purohit && purohit.upiId) {
                    const { buildFamilyCalendarOfferCard } = await import("../lib/confirm-card");
                    const offerCard = buildFamilyCalendarOfferCard(yajman.id, purohit.name, purohit.upiId);
                    await sendWhatsappMessage(msg.from, offerCard);
                  }
                }
              }
            } catch (err) {
              req.log.error({ err, ledgerId, action }, "Error processing ledger interactive callback");
            }
          })();
          continue;
        }

        const jobId = idParam;

        try {
          const { db, purohitsTable } = await import("@workspace/db");
          const purohits = await db
            .select()
            .from(purohitsTable)
            .where(eq(purohitsTable.phoneNumber, msg.from))
            .limit(1);

          if (purohits.length === 0) {
            req.log.warn({ from: msg.from }, "Received interactive message from unregistered number");
            continue;
          }
          const purohit = purohits[0];

          const {
            confirmJob,
            rejectJob,
            startCorrection,
            selectCorrectionField,
            applyCorrectionCandidate,
            beginFreeTextCorrection,
          } = await import("../lib/ingest");

          const handleConfirmWithCollision = async (
            fn: () => Promise<any>,
            errContext: string
          ) => {
            try {
              await fn();
            } catch (err) {
              const { MuhuratCollisionError } = await import("../lib/muhurat");
              if (err instanceof Error && (err.name === "MuhuratCollisionError" || err.constructor.name === "MuhuratCollisionError")) {
                const payload = {
                  type: "interactive" as const,
                  interactive: {
                    type: "button" as const,
                    body: {
                      text: "⚠️ चेतावनी: इस समय पर पहले से एक अनुष्ठान बुक है। क्या आप फिर भी इसे सहेजना चाहते हैं?",
                    },
                    action: {
                      buttons: [
                        {
                          type: "reply" as const,
                          reply: {
                            id: `booking-force:${jobId}`,
                            title: "हाँ, सहेजें",
                          },
                        },
                        {
                          type: "reply" as const,
                          reply: {
                            id: `booking-cancel:${jobId}`,
                            title: "रद्द करें",
                          },
                        },
                      ],
                    },
                  },
                };
                try {
                  await sendWhatsappMessage(msg.from, payload);
                } catch (sendErr) {
                  req.log.error({ sendErr, jobId }, "Failed to send collision warning card");
                }
              } else {
                req.log.error({ err, jobId, action }, `Error in confirmJob ${errContext}`);
              }
            }
          };

          if (action === "confirm") {
            await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id), "confirm");
          } else if (action === "reject") {
            try {
              await rejectJob(jobId);
            } catch (err) {
              req.log.error({ err, jobId, action }, "Error in rejectJob");
            }
          } else if (action === "collision-yes") {
            await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id, "reuse"), "collision-yes");
          } else if (action === "collision-no") {
            await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id, "new"), "collision-no");
          } else if (action === "booking-force") {
            try {
              const { db: dbInner, ingestJobsTable } = await import("@workspace/db");
              const [jobRow] = await dbInner
                .select()
                .from(ingestJobsTable)
                .where(eq(ingestJobsTable.id, jobId))
                .limit(1);

              if (!jobRow || jobRow.purohitId !== purohit.id) {
                req.log.warn({ jobId, purohitId: purohit.id, jobPurohitId: jobRow?.purohitId }, "Unauthorized booking-force attempt");
                return;
              }

              const res = await confirmJob(jobId, purohit.id, { force: true });
              if (res.status === "written") {
                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: { body: "अनुष्ठान बुक कर लिया गया है (ओवरराइड)।" },
                });
              }
            } catch (err) {
              req.log.error({ err, jobId, action }, "Error in booking-force confirmJob");
            }
          } else if (action === "booking-cancel") {
            try {
              const { db: dbInner, ingestJobsTable } = await import("@workspace/db");
              const [jobRow] = await dbInner
                .select()
                .from(ingestJobsTable)
                .where(eq(ingestJobsTable.id, jobId))
                .limit(1);

              if (!jobRow || jobRow.purohitId !== purohit.id) {
                req.log.warn({ jobId, purohitId: purohit.id, jobPurohitId: jobRow?.purohitId }, "Unauthorized booking-cancel attempt");
                return;
              }

              await rejectJob(jobId);
              await sendWhatsappMessage(msg.from, {
                type: "text",
                text: { body: "अनुष्ठान रद्द कर दिया गया है।" },
              });
            } catch (err) {
              req.log.error({ err, jobId, action }, "Error in booking-cancel rejectJob");
            }
          } else if (action === "edit") {
            try {
              await startCorrection(jobId, purohit.id);
            } catch (err) {
              req.log.error({ err, jobId, action }, "Error in startCorrection");
            }
          } else if (action === "field") {
            const fieldPath = parts.slice(2).join(":");
            try {
              await selectCorrectionField(jobId, fieldPath, purohit.id);
            } catch (err) {
              req.log.error({ err, jobId, fieldPath, action }, "Error in selectCorrectionField");
            }
          } else if (action === "candidate") {
            const index = parts[parts.length - 1];
            const fieldPath = parts.slice(2, parts.length - 1).join(":");
            try {
              await applyCorrectionCandidate(jobId, fieldPath, Number(index), purohit.id);
            } catch (err) {
              req.log.error({ err, jobId, fieldPath, index, action }, "Error in applyCorrectionCandidate");
            }
          } else if (action === "freetext") {
            const fieldPath = parts.slice(2).join(":");
            try {
              await beginFreeTextCorrection(jobId, fieldPath, purohit.id);
            } catch (err) {
              req.log.error({ err, jobId, fieldPath, action }, "Error in beginFreeTextCorrection");
            }
          } else if (action === "booking-confirm") {
            const eventId = idParam;
            (async () => {
              try {
                if (!process.env.DATABASE_URL) {
                  req.log.warn("Database URL not set; skipping booking-confirm operation");
                  return;
                }
                const { db, eventsTable, yajmansTable } = await import("@workspace/db");

                // Fetch event and associated yajman to verify and get localityKey
                const results = await db
                  .select({
                    event: eventsTable,
                    yajman: yajmansTable,
                  })
                  .from(eventsTable)
                  .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
                  .where(eq(eventsTable.id, eventId))
                  .limit(1);

                if (results.length === 0) {
                  req.log.warn({ eventId }, "Event or yajman not found for booking-confirm");
                  return;
                }

                const { event, yajman } = results[0];

                // Verify caller ownership
                if (event.purohitId !== purohit.id) {
                  req.log.warn(
                    { from: msg.from, eventPurohitId: event.purohitId, purohitId: purohit.id },
                    "Unauthorized booking-confirm attempt"
                  );
                  return;
                }

                // Respond with confirmation text. A ledger row is intentionally NOT
                // created here -- it is only created once the purohit actually taps
                // "ritual completed" (see the ritual-completed handler below), matching
                // the pending -> claimed -> corroborated lifecycle.
                try {
                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: {
                    body: "अनुष्ठान बुक कर लिया गया है। कार्यक्रम में जोड़ दिया गया है।",
                  },
                });
                } catch (err) {
                  req.log.error({ err, eventId }, "Failed to send booking-confirm acknowledgement text");
                }

                const { buildRitualCompletedCard } = await import("../lib/confirm-card");
                try {
                  await sendWhatsappMessage(
                    msg.from,
                    buildRitualCompletedCard(event.id, yajman.familyName, event.label || event.eventType)
                  );
                } catch (err) {
                  req.log.error({ err, eventId }, "Failed to send ritual-completed prompt card");
                }
              } catch (err) {
                req.log.error({ err, eventId, action }, "Error in booking-confirm callback");
              }
            })();
          } else if (action === "lapse-engage") {
            const eventId = idParam;
            (async () => {
              try {
                if (!process.env.DATABASE_URL) {
                  req.log.warn("Database URL not set; skipping lapse-engage operation");
                  return;
                }
                const { db, eventsTable, yajmansTable, lapseRecoveriesTable } = await import("@workspace/db");
                const { eq, and } = await import("drizzle-orm");

                // Fetch event and associated yajman
                const results = await db
                  .select({
                    event: eventsTable,
                    yajman: yajmansTable,
                  })
                  .from(eventsTable)
                  .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
                  .where(eq(eventsTable.id, eventId))
                  .limit(1);

                if (results.length === 0) {
                  req.log.warn({ eventId }, "Event or yajman not found for lapse-engage");
                  return;
                }

                const { event, yajman } = results[0];

                // Verify caller ownership
                if (event.purohitId !== purohit.id) {
                  req.log.warn(
                    { from: msg.from, eventPurohitId: event.purohitId, purohitId: purohit.id },
                    "Unauthorized lapse-engage attempt"
                  );
                  return;
                }

                const currentYear = new Date().getFullYear();

                // Update recovered_at = now()
                await db
                  .update(lapseRecoveriesTable)
                  .set({ recoveredAt: new Date() })
                  .where(
                    and(
                      eq(lapseRecoveriesTable.eventId, eventId),
                      eq(lapseRecoveriesTable.cycleYear, currentYear)
                    )
                  );

                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: {
                    body: "सम्पर्क करने के लिए धन्यवाद। इस परिवार का अनुष्ठान शीघ्र ही नियत किया जाएगा।",
                  },
                });
              } catch (err) {
                req.log.error({ err, eventId, action }, "Error in lapse-engage callback");
              }
            })();
          } else if (action === "ritual-completed") {
            const eventId = idParam;
            (async () => {
              try {
                if (!process.env.DATABASE_URL) {
                  req.log.warn("Database URL not set; skipping ritual-completed operation");
                  return;
                }
                const { db, eventsTable, yajmansTable, ledgerTable } = await import("@workspace/db");
                const { createLedgerEntry } = await import("../lib/ledger");

                const results = await db
                  .select({
                    event: eventsTable,
                    yajman: yajmansTable,
                  })
                  .from(eventsTable)
                  .innerJoin(yajmansTable, eq(eventsTable.yajmanId, yajmansTable.id))
                  .where(eq(eventsTable.id, eventId))
                  .limit(1);

                if (results.length === 0) {
                  req.log.warn({ eventId }, "Event or yajman not found for ritual-completed");
                  return;
                }

                const { event, yajman } = results[0];

                if (event.purohitId !== purohit.id) {
                  req.log.warn(
                    { from: msg.from, eventPurohitId: event.purohitId, purohitId: purohit.id },
                    "Unauthorized ritual-completed attempt"
                  );
                  return;
                }

                const [existing] = await db
                  .select()
                  .from(ledgerTable)
                  .where(and(eq(ledgerTable.eventId, event.id), eq(ledgerTable.purohitId, purohit.id)))
                  .limit(1);

                const amountPromptBody = "कृपया दक्षिणा राशि (₹ में) भेजें — केवल संख्या में, जैसे 1100";

                if (existing) {
                  if (existing.amountCollected === null && existing.paymentStatus === "pending") {
                    // Idempotent nudge on repeat taps: resend the amount-request prompt.
                    await sendWhatsappMessage(msg.from, {
                      type: "text",
                      text: { body: amountPromptBody },
                    });
                  } else {
                    req.log.info({ eventId, ledgerId: existing.id }, "Ritual already marked completed");
                  }
                  return;
                }

                await createLedgerEntry(purohit.id, yajman.id, event.id, null, yajman.localityKey || "unknown");

                await sendWhatsappMessage(msg.from, {
                  type: "text",
                  text: { body: amountPromptBody },
                });
              } catch (err) {
                req.log.error({ err, eventId, action }, "Error in ritual-completed callback");
              }
            })();
          } else {
            req.log.warn({ action, jobId }, "Unrecognized interactive action prefix");
          }
        } catch (err) {
          req.log.error({ err, msg }, "Failed to process inbound interactive webhook message");
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to parse WhatsApp webhook payload");
  }

  if (!res.headersSent) {
    res.sendStatus(200);
  }
});

export default router;


