import { Router, type IRouter } from "express";
import crypto from "crypto";
import { SendWhatsappMessageResponse, ListWhatsappMessagesResponseItem, ListWhatsappOutboundMessagesResponseItem } from "@workspace/api-zod";
import { WARN, DONE, AGREED, RULE } from "../lib/copy-tokens";
import { sendWhatsappMessage, getOutboundMessages, WhatsappSendError } from "../lib/whatsapp-client";
import { eq, and } from "drizzle-orm";
import { captureException } from "../lib/sentry";


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

if (process.env.NODE_ENV !== "production") {
  router.post("/test/clear-dedup-cache", (req, res) => {
    processedMessageIdSet.clear();
    processedMessageIds.length = 0;
    res.json({ status: "success", message: "Dedup cache cleared" });
  });
}

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
  // Webhook signature verification.
  // The bypass is honoured ONLY outside production: in production a missing or
  // invalid signature must always reject, so that setting the flag (e.g. to
  // silence 500s from an unset WHATSAPP_APP_SECRET) can never silently open the
  // webhook to forged payloads. Tests sign their payloads and do not use it.
  const bypassRequested =
    process.env.SKIP_WEBHOOK_SIGNATURE_VERIFICATION === "true" || process.env.NODE_ENV === "test";
  const isTestOrBypass = bypassRequested && process.env.NODE_ENV !== "production";
  if (bypassRequested && process.env.NODE_ENV === "production") {
    req.log.error(
      "Signature-verification bypass requested in production; ignoring and enforcing verification",
    );
  }
  if (!isTestOrBypass) {
    const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
    if (!APP_SECRET) {
      req.log.error("WHATSAPP_APP_SECRET environment variable is missing; rejecting webhook request");
      res.status(500).json({ error: "Webhook verification not configured" });
      return;
    }

    const signature = req.headers["x-hub-signature-256"];
    if (!signature || typeof signature !== "string") {
      req.log.warn("Missing X-Hub-Signature-256 header");
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    const parts = signature.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") {
      req.log.warn({ signature }, "Malformed X-Hub-Signature-256 header");
      res.status(401).json({ error: "Malformed signature" });
      return;
    }

    const signatureHash = parts[1];
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      req.log.error("Raw body is missing; cannot verify signature");
      res.status(400).json({ error: "Missing raw body" });
      return;
    }

    const expectedHash = crypto
      .createHmac("sha256", APP_SECRET)
      .update(rawBody)
      .digest("hex");

    const actualBuffer = Buffer.from(signatureHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      req.log.warn({ signature, expectedHash }, "Signature mismatch");
      res.status(401).json({ error: "Signature mismatch" });
      return;
    }
  }


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
          req.log.debug({ messageId: msg.id }, "duplicate webhook delivery (in-memory), skipping");
          continue;
        }

        try {
          const { db: dbDedup, processedWebhooksTable } = await import("@workspace/db");
          const inserted = await dbDedup
            .insert(processedWebhooksTable)
            .values({ messageId: msg.id })
            .onConflictDoNothing()
            .returning();

          if (inserted.length === 0) {
            req.log.info({ messageId: msg.id }, "duplicate webhook delivery (db), skipping");
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
        } catch (dbErr) {
          req.log.warn({ err: dbErr, messageId: msg.id }, "Database dedup insert failed; falling back to in-memory only");
          processedMessageIdSet.add(msg.id);
          processedMessageIds.push(msg.id);
          if (processedMessageIds.length > MAX_DEDUP_MESSAGES) {
            const oldest = processedMessageIds.shift();
            if (oldest !== undefined) {
              processedMessageIdSet.delete(oldest);
            }
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
          const { db, purohitsTable, onboardingStateTable } = await import("@workspace/db");
          const purohits = await db
            .select()
            .from(purohitsTable)
            .where(eq(purohitsTable.phoneNumber, msg.from))
            .limit(1);

          let replies: string[] = [];

          if (purohits.length > 0) {
            const purohit = purohits[0];
            const normalizedText = (msg.text?.body ?? "").trim().toLowerCase();

            // Check if they are in the middle of onboarding post-confirm questions
            const draft = await db
              .select()
              .from(onboardingStateTable)
              .where(eq(onboardingStateTable.phoneNumber, msg.from))
              .limit(1);

            if (draft.length > 0 && draft[0].currentStep !== "awaiting_first_family") {
              const { handlePostConfirmOnboarding } = await import("../lib/onboarding");
              const postConfirmReplies = await handlePostConfirmOnboarding(msg.from, msg.text?.body ?? "");
              if (postConfirmReplies && postConfirmReplies.length > 0) {
                replies = postConfirmReplies;
                if (draft[0].currentStep === "city") { // Means they just answered city and state is deleted
                  // M4 text is handled entirely inside handlePostConfirmOnboarding now
                }
              } else {
                 replies = ["Koi error aayi hai, kripya thodi der baad try karein."];
              }
            } else {
              if (normalizedText === "pranaam" || normalizedText === "namaste" || normalizedText === "hari om") {
                const { buildPurohitMainMenu } = await import("../lib/menu-card");
                await sendWhatsappMessage(msg.from, buildPurohitMainMenu());
                continue;
              }
              // Existing fully-onboarded routing
              if (normalizedText === "my week" || normalizedText === "इस हफ्ते") {
                let responseText = "";
                try {
                  const { db: dbInner, eventsTable, yajmansTable } = await import("@workspace/db");
                  const { and, eq, gte, lte, asc } = await import("drizzle-orm");
                  const { windowFromTime } = await import("../lib/muhurat");

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endOfWeek = new Date(today);
                  endOfWeek.setDate(today.getDate() + 7);
                  endOfWeek.setHours(23, 59, 59, 999);
                  const currentYear = today.getFullYear();

                  let weeklyEvents = await dbInner
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

                  if (weeklyEvents.length === 0) {
                    const { resolveUpcomingEventsForWeek } = await import("../lib/brain");
                    const liveEvents = await resolveUpcomingEventsForWeek(today);
                    
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
                    if (window === "morning") return "सुबह";
                    if (window === "afternoon") return "दोपहर";
                    if (window === "evening") return "शाम";
                    return "रात";
                  };

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

                  responseText = `*आपका साप्ताहिक कार्यक्रम*\n${RULE}\n`;
                  if (Object.keys(groups).length === 0) {
                    responseText += "\nइस हफ्ते कोई अनुष्ठान निर्धारित नहीं है।";
                  } else {
                    for (const [dateHeader, windows] of Object.entries(groups)) {
                      responseText += `\n*${dateHeader}*\n`;
                      const windowOrder = ["morning", "afternoon", "evening", "night"];
                      for (const w of windowOrder) {
                        const events = windows[w];
                        if (events && events.length > 0) {
                          responseText += `  _${getWindowDisplayName(w)}_\n`;
                          for (const e of events) {
                            responseText += `  • ${e.time} — ${e.label} (${e.familyName})\n`;
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
                replies = [responseText];
              } else if (normalizedText === "referral" || normalizedText === "आमंत्रण") {
                const { buildReferralCard } = await import("../lib/confirm-card");
                const { getOrCreateInviteLink } = await import("../lib/short-link");
                try {
                  const botNumber = process.env.WHATSAPP_BOT_NUMBER || "12345";
                  const inviteUrl = await getOrCreateInviteLink(purohit.id, botNumber);
                  await sendWhatsappMessage(msg.from, buildReferralCard(inviteUrl, purohit.name));
                } catch (sendErr) {
                  req.log.error({ sendErr, purohitId: purohit.id }, "Failed to send referral card");
                }
                continue; // Referral card sent natively, no text replies needed
              } else {
                // Dakshina Amount check
                const { findAwaitingAmountEntry, recordDakshinaAmount } = await import("../lib/ledger");
                const awaiting = await findAwaitingAmountEntry(purohit.id);
                if (awaiting) {
                  const rawDigits = (msg.text?.body ?? "").replace(/[^0-9.]/g, "");
                  const amount = parseFloat(rawDigits);
                  const { isValidUpiId } = await import("../lib/upi");
                  const isUpiFormat = isValidUpiId(msg.text?.body?.trim() ?? "");

                  if (isUpiFormat && !purohit.upiId) {
                    // They just provided their JIT UPI ID! Save it and tell them to enter amount again, or if amount was also somehow there... wait, they are awaiting an AMOUNT.
                    // If they send UPI ID, we save it and ask for the amount again.
                    const { db: dbInner, purohitsTable } = await import("@workspace/db");
                    await dbInner.update(purohitsTable)
                      .set({ upiId: msg.text!.body!.trim() })
                      .where(eq(purohitsTable.phoneNumber, purohit.phoneNumber));
                    purohit.upiId = msg.text!.body!.trim();
                    replies = ["धन्यवाद। अब दक्षिणा की राशि भेजें (जैसे 501):"];
                    continue;
                  }

                  if (Number.isNaN(amount) || amount <= 0) {
                    replies = ["कृपया सही दक्षिणा राशि भेजें (केवल संख्या में)।"];
                  } else {
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
                    
                    if (!purohit.upiId || !isValidUpiId(purohit.upiId)) {
                      // JIT UPI ask instead of failing
                      replies = ["दक्षिणा-card में आपका UPI-link जाएगा, ताकि परिवार सीधे आपको भेज सके — बीच में कोई नहीं। आपकी UPI ID? *(जैसे name@bank)*"];
                      
                      // Soft-set state to wait for UPI (a proper implementation would store this in DB, but since dakshina flow already looks up findAwaitingAmountEntry, we can just intercept text when awaiting amount AND no valid UPI exists)
                      // Actually, the next message will fall into this dakshina check again! 
                      // If the next message is a UPI ID, parseFloat will fail. We need to handle this.
                    } else {
                      const upiLink = buildUpiDeepLink(purohit.upiId, purohit.name, amount, eventLabel);
                      const { buildPostRitualPurohitCard, buildPostRitualFamilyCard } = await import("../lib/confirm-card");

                      try {
                        await sendWhatsappMessage(msg.from, buildPostRitualPurohitCard(updatedLedger.id, yajmanRow?.familyName ?? "यजमान", eventLabel, upiLink));
                      } catch (err) {
                        req.log.error({ err, ledgerId: updatedLedger.id }, "Failed to send post-ritual purohit card");
                      }
                      if (yajmanRow?.whatsappNumber) {
                        try {
                          await sendWhatsappMessage(yajmanRow.whatsappNumber, buildPostRitualFamilyCard(updatedLedger.id, purohit.name, eventLabel, upiLink));
                        } catch (err) {
                          req.log.error({ err, ledgerId: updatedLedger.id }, "Failed to send post-ritual family card");
                        }
                      }
                      continue;
                    }
                  }
                } else {
                   // Check for pending correction job
                   const { findPendingCorrectionJob, applyFreeTextCorrection } = await import("../lib/ingest");
                   const pending = await findPendingCorrectionJob(purohit.id);
                   if (pending) {
                     const job = pending.job;
                     const fieldPath = pending.fieldPath;
                     (async () => {
                       try {
                         await applyFreeTextCorrection(job.id, fieldPath, msg.text!.body, purohit.id);
                       } catch (err) {
                         req.log.error({ err, jobId: job.id, fieldPath }, "Failed to apply free text correction");
                         captureException(err, { jobId: job.id, fieldPath, context: "applyFreeTextCorrection" });
                       }
                     })();
                     continue;
                   } else if (draft.length > 0 && draft[0].currentStep === "awaiting_first_family") {
                     // Route to extraction pipeline!
                     const { createIngestJob, runIngestPipeline } = await import("../lib/ingest");
                     const job = await createIngestJob(purohit.id, "voice");
                     await sendWhatsappMessage(msg.from, { type: "text", text: { body: "सुन लिया — लिखकर दिखाते हैं, एक क्षण 🙏" } });
                     (async () => {
                       try {
                          await runIngestPipeline(job, purohit as any, undefined, undefined, msg.text?.body);
                       } catch (err) {
                         req.log.error({ err, msg }, "Error running text ingest pipeline");
                       }
                     })();
                     continue;
                   } else {
                     // Catch-all
                     const { buildPurohitMainMenu } = await import("../lib/menu-card");
                     await sendWhatsappMessage(msg.from, buildPurohitMainMenu());
                     continue;
                   }
                }
              }
            }
          } else {
             const { db: dbInner, yajmansTable } = await import("@workspace/db");
             const yajmansList = await dbInner
               .select()
               .from(yajmansTable)
               .where(eq(yajmansTable.whatsappNumber, msg.from))
               .limit(1);

             if (yajmansList.length > 0) {
               const yajman = yajmansList[0];
               const normalizedText = (msg.text?.body ?? "").trim().toLowerCase();
               if (normalizedText === "pranaam" || normalizedText === "namaste" || normalizedText === "hari om") {
                 const { buildYajmanMainMenu } = await import("../lib/menu-card");
                 await sendWhatsappMessage(msg.from, buildYajmanMainMenu());
                 continue;
               }
               if (normalizedText === "mera saal" || normalizedText === "mera mahina" || normalizedText === "मेरा साल" || normalizedText === "मेरा महीना") {
                 const isSaal = normalizedText === "mera saal" || normalizedText === "मेरा साल";
                 const { buildFamilyLaneCard } = await import("../lib/confirm-card");
                 try {
                   const card = await buildFamilyLaneCard(yajman.id, isSaal ? "year" : "month");
                   if (card) {
                     await sendWhatsappMessage(msg.from, card);
                   } else {
                     replies = ["अभी तक कोई अनुष्ठान रिकॉर्ड नहीं मिला है।"];
                   }
                 } catch (err) {
                   req.log.error({ err, from: msg.from }, "Failed to send family lane card");
                   replies = ["रिकॉर्ड खोजने में समस्या हुई। कृपया बाद में प्रयास करें।"];
                 }
               } else if (normalizedText === "mera smaran" || normalizedText === "मेरा स्मरण") {
                 const { buildMeraSmaranCard } = await import("../lib/confirm-card");
                 try {
                   const card = await buildMeraSmaranCard(yajman.id);
                   if (card) {
                     await sendWhatsappMessage(msg.from, card);
                   } else {
                     replies = ["अभी तक कोई स्मरण रिकॉर्ड नहीं मिला है।"];
                   }
                 } catch (err) {
                   req.log.error({ err, from: msg.from }, "Failed to send mera smaran card");
                   replies = ["रिकॉर्ड खोजने में समस्या हुई। कृपया बाद में प्रयास करें।"];
                 }
               } else if (normalizedText === "agle kaam" || normalizedText === "अगले काम") {
                 const { buildAgleKaamCard } = await import("../lib/confirm-card");
                 try {
                   const card = await buildAgleKaamCard(yajman.id);
                   if (card) {
                     await sendWhatsappMessage(msg.from, card);
                   } else {
                     replies = ["निकट भविष्य में कोई अनुष्ठान निर्धारित नहीं है।"];
                   }
                 } catch (err) {
                   req.log.error({ err, from: msg.from }, "Failed to send agle kaam card");
                   replies = ["रिकॉर्ड खोजने में समस्या हुई। कृपया बाद में प्रयास करें।"];
                 }
               } else {
                 const { db: dbSearch, eventsTable } = await import("@workspace/db");
                 const { and, ilike } = await import("drizzle-orm");
                 const possibleEvents = await dbSearch
                   .select()
                   .from(eventsTable)
                   .where(
                     and(
                       eq(eventsTable.yajmanId, yajman.id),
                       ilike(eventsTable.label, `%${normalizedText}%`)
                     )
                   )
                   .limit(1);

                 if (possibleEvents.length > 0) {
                   const { buildBeneficiarySmaranCard } = await import("../lib/confirm-card");
                   try {
                     const card = await buildBeneficiarySmaranCard(yajman.id, possibleEvents[0].label || "");
                     if (card) {
                       await sendWhatsappMessage(msg.from, card);
                     }
                   } catch (err) {
                     req.log.error({ err, from: msg.from }, "Failed to send beneficiary card");
                     replies = ["रिकॉर्ड खोजने में समस्या हुई। कृपया बाद में प्रयास करें।"];
                   }
                 } else {
                   const { buildYajmanMainMenu } = await import("../lib/menu-card");
                   await sendWhatsappMessage(msg.from, buildYajmanMainMenu());
                   continue;
                 }
               }
             } else {
               // New user!
               const { handleFirstContact } = await import("../lib/onboarding");
               const profileName = req.body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name ?? null;
               replies = await handleFirstContact(msg.from, profileName, msg.text?.body ?? "");
             }
          }

          for (const reply of replies) {
            try {
              await sendWhatsappMessage(msg.from, { type: "text", text: { body: reply } });
            } catch (err) {
              req.log.error({ err, from: msg.from }, "Failed to send text reply");
            }
          }
        } catch (err) {
          req.log.error({ err, from: msg.from }, "Failed to process text message");
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
              await runIngestPipeline(job, purohit as any, audioId, msg.audio.duration);
            } catch (err) {
              req.log.error({ err, msg }, "Error running voice ingest pipeline");
              captureException(err, { from: msg.from, audioId, context: "voice-ingest-pipeline" });
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
              await runIngestPipeline(job, purohit as any, imageId);
            } catch (err) {
              req.log.error({ err, msg }, "Error running photo ingest pipeline");
              captureException(err, { from: msg.from, imageId, context: "photo-ingest-pipeline" });
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

        if (action === "calendar") {
          const calendarSystem = idParam;
          const { handlePostConfirmOnboarding } = await import("../lib/onboarding");
          const replies = await handlePostConfirmOnboarding(msg.from, calendarSystem);
          if (replies) {
            for (const reply of replies) {
              try {
                await sendWhatsappMessage(msg.from, { type: "text", text: { body: reply } });
              } catch (sendErr) {
                req.log.error({ sendErr, from: msg.from }, "Failed to send onboarding text reply for calendar action");
              }
            }
          }
          continue;
        }
        
        if (action === "menu_purohit_my_week") {
          msg.type = "text";
          msg.text = { body: "my week" };
          messages.push(msg); // Re-process as text
          continue;
        } else if (action === "menu_purohit_add_yajman") {
          await sendWhatsappMessage(msg.from, { type: "text", text: { body: "कृपया यजमान की जानकारी वॉइस नोट, लिखकर या बही खाते की फोटो के जरिए भेजें।" } });
          continue;
        } else if (action === "menu_purohit_pending_dakshina") {
          const { db, purohitsTable } = await import("@workspace/db");
          const purohits = await db.select().from(purohitsTable).where(eq(purohitsTable.phoneNumber, msg.from)).limit(1);
          if (purohits.length > 0) {
            const { findAwaitingAmountEntry } = await import("../lib/ledger");
            const awaiting = await findAwaitingAmountEntry(purohits[0].id);
            if (awaiting) {
              await sendWhatsappMessage(msg.from, { type: "text", text: { body: "कृपया लंबित अनुष्ठान के लिए दक्षिणा राशि भेजें (जैसे 501):" } });
            } else {
              await sendWhatsappMessage(msg.from, { type: "text", text: { body: "कोई लंबित दक्षिणा नहीं है।" } });
            }
          }
          continue;
        } else if (action === "menu_purohit_referral") {
          msg.type = "text";
          msg.text = { body: "referral" };
          messages.push(msg);
          continue;
        } else if (action === "menu_yajman_mera_saal") {
          msg.type = "text";
          msg.text = { body: "mera saal" };
          messages.push(msg);
          continue;
        } else if (action === "menu_yajman_mera_mahina") {
          msg.type = "text";
          msg.text = { body: "mera mahina" };
          messages.push(msg);
          continue;
        } else if (action === "menu_yajman_mera_smaran") {
          msg.type = "text";
          msg.text = { body: "mera smaran" };
          messages.push(msg);
          continue;
        } else if (action === "menu_yajman_agle_karya") {
          msg.type = "text";
          msg.text = { body: "agle kaam" }; // It's mapped to agle kaam internally
          messages.push(msg);
          continue;
        }

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
                  body: `${DONE} आपकी सदस्यता सक्रिय कर दी गई है। धन्यवाद!`,
                },
              });
            } catch (err) {
              req.log.error({ err, yajmanId, from: msg.from }, "Error in subscribe-confirm callback");
              captureException(err, { yajmanId, from: msg.from, context: "subscribe-confirm" });
            }
          })();
          continue;
        }

        if (action === "notify-purohit") {
          const yajmanId = idParam;
          (async () => {
            try {
              if (!process.env.DATABASE_URL) return;
              const { db, yajmansTable, purohitsTable, eventsTable } = await import("@workspace/db");
              const { and, eq, gte, asc } = await import("drizzle-orm");

              const [yajman] = await db.select().from(yajmansTable).where(eq(yajmansTable.id, yajmanId)).limit(1);
              if (!yajman || yajman.whatsappNumber !== msg.from) {
                req.log.warn({ from: msg.from, yajmanId }, "Unauthorized notify-purohit attempt");
                return;
              }

              const [purohit] = await db.select().from(purohitsTable).where(eq(purohitsTable.id, yajman.purohitId)).limit(1);
              if (!purohit) return;

              const today = new Date();
              today.setHours(0,0,0,0);
              const currentYear = today.getFullYear();
              
              const events = await db
                .select()
                .from(eventsTable)
                .where(
                  and(
                    eq(eventsTable.yajmanId, yajmanId),
                    gte(eventsTable.resolvedDate, today),
                    eq(eventsTable.resolvedCycleYear, currentYear)
                  )
                )
                .orderBy(asc(eventsTable.resolvedDate))
                .limit(5);

              if (events.length === 0) return;

              const formatShortDate = (d: Date) => {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${d.getDate()} ${months[d.getMonth()]}`;
              };

              const purohitNameDisplay = purohit.name.replace(/ जी$/, "");
              let purohitMsg = `🔔 *स्मरण*\n──────────────────\n${purohitNameDisplay} जी, यजमान *${yajman.familyName}* के परिवार ने\nआने वाले अनुष्ठानों के विषय में पूछा है।\n\n`;

              for (const e of events) {
                if (!e.resolvedDate) continue;
                const d = new Date(e.resolvedDate);
                const l = e.label || e.eventType || "अनुष्ठान";
                purohitMsg += `${l} (${formatShortDate(d)})\n`;
              }
              purohitMsg += `──────────────────`;

              await sendWhatsappMessage(purohit.phoneNumber, { type: "text", text: { body: purohitMsg } });
              await sendWhatsappMessage(msg.from, { type: "text", text: { body: "पंडित जी को सूचित कर दिया गया है।" } });
            } catch (err) {
              req.log.error({ err, yajmanId }, "Error in notify-purohit callback");
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
                  text: { body: `${DONE} दक्षिणा प्राप्त हुई, बही खाता अपडेट कर दिया गया है।` },
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
                  text: { body: `${AGREED} पुष्टि के लिए धन्यवाद।` },
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
              captureException(err, { ledgerId, action, from: msg.from, context: "ledger-callback" });
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
              return await fn();
            } catch (err) {
              const { MuhuratCollisionError } = await import("../lib/muhurat");
              if (err instanceof Error && (err.name === "MuhuratCollisionError" || err.constructor.name === "MuhuratCollisionError")) {
                const payload = {
                  type: "interactive" as const,
                  interactive: {
                    type: "button" as const,
                    body: {
                      // ⚠️ is the one intentional per-line emoji: it carries signal,
                      // not decoration. See lib/copy-tokens.ts.
                      text: `${WARN} *चेतावनी*\n${RULE}\nइस समय पर पहले से एक अनुष्ठान बुक है। क्या आप फिर भी इसे सहेजना चाहते हैं?`,
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
              return null;
            }
          };

          const checkAndTriggerM3 = async (res: any) => {
            if (res?.status === "written") {
              if (!purohit.calendarSystem) {
                const { buildCalendarSystemCard } = await import("../lib/confirm-card");
                const { db: dbInner, onboardingStateTable } = await import("@workspace/db");
                await dbInner.update(onboardingStateTable)
                  .set({ currentStep: "calendar_system", updatedAt: new Date() })
                  .where(eq(onboardingStateTable.phoneNumber, purohit.phoneNumber));
                try {
                  await sendWhatsappMessage(msg.from, buildCalendarSystemCard());
                } catch (sendErr) {
                  req.log.error({ sendErr, jobId }, "Failed to send M3 calendar system card");
                }
              } else {
                // They are fully onboarded, check for progressive hints
                try {
                  const { db: dbInner, eventsTable, purohitsTable } = await import("@workspace/db");
                  const { count } = await import("drizzle-orm");
                  const [{ value: totalEvents }] = await dbInner
                    .select({ value: count(eventsTable.id) })
                    .from(eventsTable)
                    .where(eq(eventsTable.purohitId, purohit.id));
                  
                  const hintsShown = purohit.hintsShown || [];
                  let hintMsg = "";
                  
                  if (totalEvents === 3 && !hintsShown.includes("day_sheet")) {
                    hintMsg = "💡 *सुझाव:* WhatsApp पर 'my week' या 'इस हफ्ते' लिखकर आप अपने इस हफ़्ते के सारे अनुष्ठान एक साथ देख सकते हैं।";
                    hintsShown.push("day_sheet");
                  } else if (totalEvents === 5 && !hintsShown.includes("referral_card")) {
                    hintMsg = "💡 *सुझाव:* WhatsApp पर 'आमंत्रण' या 'referral' लिखकर आप अपने साथी पुरोहितों को भी स्मरण से जोड़ सकते हैं।";
                    hintsShown.push("referral_card");
                  }
                  
                  // In the original flow, normal confirm didn't send an ack (relying on the button turning gray in the UI or similar).
                  // But to deliver the hint, we must send a message. We'll send a brief ack + hint.
                  if (hintMsg) {
                    await sendWhatsappMessage(msg.from, { type: "text", text: { body: `${DONE} अनुष्ठान सहेजा गया।\n\n${hintMsg}` } });
                    await dbInner.update(purohitsTable).set({ hintsShown }).where(eq(purohitsTable.id, purohit.id));
                  }
                } catch (err) {
                  req.log.error({ err, purohitId: purohit.id }, "Failed to process progressive hints");
                }
              }
            }
          };

          if (action === "confirm") {
            const res = await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id), "confirm");
            await checkAndTriggerM3(res);
          } else if (action === "reject") {
            try {
              await rejectJob(jobId);
            } catch (err) {
              req.log.error({ err, jobId, action }, "Error in rejectJob");
            }
          } else if (action === "collision-yes") {
            const res = await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id, "reuse"), "collision-yes");
            await checkAndTriggerM3(res);
          } else if (action === "collision-no") {
            const res = await handleConfirmWithCollision(() => confirmJob(jobId, purohit.id, "new"), "collision-no");
            await checkAndTriggerM3(res);
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
                  text: { body: `${DONE} अनुष्ठान बुक कर लिया गया है (ओवरराइड)।` },
                });
                await checkAndTriggerM3(res);
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
                    body: `${DONE} अनुष्ठान बुक कर लिया गया है। कार्यक्रम में जोड़ दिया गया है।`,
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
                captureException(err, { eventId, action, from: msg.from, context: "booking-confirm" });
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
                captureException(err, { eventId, action, from: msg.from, context: "lapse-engage" });
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
                captureException(err, { eventId, action, from: msg.from, context: "ritual-completed" });
              }
            })();
          } else {
            req.log.warn({ action, jobId }, "Unrecognized interactive action prefix");
          }
        } catch (err) {
          req.log.error({ err, msg }, "Failed to process inbound interactive webhook message");
          captureException(err, { msg, context: "inbound-interactive-webhook" });
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to parse WhatsApp webhook payload");
    captureException(err, { context: "parse-whatsapp-webhook-payload" });
  }

  if (!res.headersSent) {
    res.sendStatus(200);
  }
});

export default router;


