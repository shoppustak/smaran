import { eq, and } from "drizzle-orm";
import { downloadWhatsappMedia } from "./media";
import * as asrModule from "./asr";
import { extractFields, ExtractionResult } from "./extraction";
import { getExtractionModelCaller } from "./extraction-models";
import { extractFieldsFromImage } from "./vision";
import {
  matchField,
  MAAS_MAX_EDITS,
  TITHI_MAX_EDITS,
  PAKSHA_MAX_EDITS,
  GOTRA_MAX_EDITS,
} from "./fuzzy-match";
import { sendWhatsappMessage } from "./whatsapp-client";
import {
  buildConfirmCard,
  sendConfirmCard,
  buildMultiFamilyFollowup,
} from "./confirm-card";
import { maasVocab } from "./vocab/maas";
import { tithiVocab } from "./vocab/tithi";
import { pakshaVocab } from "./vocab/paksha";
import { gotraVocab } from "./vocab/gotra";
import { logger } from "./logger";
import {
  hasMuhuratCollision,
  getMuhuratCollision,
  parseGregorianHint,
  MuhuratCollisionError,
  windowFromTime,
} from "./muhurat";

type IngestJob = import("@workspace/db").IngestJob;

export type IngestJobStatus =
  | "received"
  | "transcribed"
  | "extracted"
  | "awaiting_confirm"
  | "confirmed"
  | "rejected"
  | "failed";

export class IngestDbUnavailableError extends Error {
  constructor(message = "Database is not configured (DATABASE_URL is missing)") {
    super(message);
    this.name = "IngestDbUnavailableError";
  }
}

export const VOICE_APOLOGY_MESSAGE =
  "माफ़ कीजिएगा, आपकी आवाज़ साफ़ सुनाई नहीं दी या जानकारी अधूरी थी। कृपया दोबारा स्पष्ट आवाज़ में रिकॉर्ड करके भेजें।";

export const PHOTO_APOLOGY_MESSAGE =
  "माफ़ कीजिएगा, आपके बही खाता की फ़ोटो स्पष्ट नहीं थी या कोई परिवार नहीं मिल पाया। कृपया दोबारा साफ़ फ़ोटो खींच कर भेजें।";

export async function createIngestJob(
  purohitId: string,
  kind: "voice" | "photo"
): Promise<IngestJob> {
  if (!process.env.DATABASE_URL) {
    logger.error("createIngestJob failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }

  const { db, ingestJobsTable } = await import("@workspace/db");

  try {
    const [inserted] = await db
      .insert(ingestJobsTable)
      .values({
        purohitId,
        kind,
        status: "received",
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to insert ingest job row");
    }

    return inserted;
  } catch (err) {
    logger.error({ err, purohitId, kind }, "Error inserting ingest job");
    throw err;
  }
}

export async function transitionJob(
  jobId: string,
  next: IngestJobStatus,
  patch?: Partial<IngestJob>
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error(`transitionJob failed for ${jobId}: DATABASE_URL is not set`);
    throw new IngestDbUnavailableError();
  }

  const { db, ingestJobsTable } = await import("@workspace/db");

  // Read current row to assert transition
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    throw new Error(`Ingest job ${jobId} not found`);
  }

  const currentJob = jobs[0];
  const currentStatus = currentJob.status as IngestJobStatus;

  const STATUS_ORDER: Record<IngestJobStatus, number> = {
    received: 0,
    transcribed: 1,
    extracted: 2,
    awaiting_confirm: 3,
    confirmed: 4,
    rejected: 4,
    failed: 4,
  };

  if (
    currentStatus === "confirmed" ||
    currentStatus === "rejected" ||
    currentStatus === "failed"
  ) {
    if (next !== currentStatus) {
      throw new Error(
        `Cannot transition job ${jobId} from terminal status ${currentStatus} to ${next}`
      );
    }
  } else if (STATUS_ORDER[next] < STATUS_ORDER[currentStatus]) {
    throw new Error(
      `Cannot regress job ${jobId} status from ${currentStatus} to ${next}`
    );
  }

  try {
    const updateValues: Partial<IngestJob> = {
      status: next,
      updatedAt: new Date(),
      ...patch,
    };

    await db
      .update(ingestJobsTable)
      .set(updateValues)
      .where(eq(ingestJobsTable.id, jobId));
  } catch (err) {
    logger.error({ err, jobId, next, patch }, "Failed to update ingest job status");
    throw err;
  }
}

async function finalizeFamilyExtraction(
  familyJob: IngestJob,
  purohit: { id: string; calendarSystem: string; localityKey: string; phoneNumber: string },
  extraction: ExtractionResult
): Promise<void> {
  // e) transition to extracted with raw extraction
  await transitionJob(familyJob.id, "extracted", { extraction });

  // f) fuzzy match fields except family_name, build canonicalExtraction and fieldScores
  let gotraScore = 1.0;
  let canonicalGotra = extraction.gotra;
  if (extraction.gotra) {
    const match = matchField(extraction.gotra, gotraVocab, GOTRA_MAX_EDITS);
    gotraScore = match.matchScore;
    canonicalGotra = match.canonical !== null ? match.canonical : extraction.gotra;
  }

  let minMaasScore = 1.0;
  let minPakshaScore = 1.0;
  let minTithiScore = 1.0;

  const canonicalEvents = extraction.events.map((event) => {
    let canonicalMaas = event.maas;
    if (event.maas) {
      const match = matchField(event.maas, maasVocab, MAAS_MAX_EDITS);
      if (match.matchScore < minMaasScore) {
        minMaasScore = match.matchScore;
      }
      if (match.canonical !== null) {
        canonicalMaas = match.canonical;
      }
    }

    let canonicalPaksha = event.paksha;
    if (event.paksha) {
      const match = matchField(event.paksha, pakshaVocab, PAKSHA_MAX_EDITS);
      if (match.matchScore < minPakshaScore) {
        minPakshaScore = match.matchScore;
      }
      if (match.canonical !== null) {
        canonicalPaksha = match.canonical as "Shukla" | "Krishna" | null;
      }
    }

    let canonicalTithi = event.tithi_name;
    if (event.tithi_name) {
      const match = matchField(event.tithi_name, tithiVocab, TITHI_MAX_EDITS);
      if (match.matchScore < minTithiScore) {
        minTithiScore = match.matchScore;
      }
      if (match.canonical !== null) {
        canonicalTithi = match.canonical;
      }
    }

    return {
      ...event,
      maas: canonicalMaas,
      paksha: canonicalPaksha,
      tithi_name: canonicalTithi,
    };
  });

  const fieldScores: Record<string, number> = {
    gotra: gotraScore,
    maas: minMaasScore,
    paksha: minPakshaScore,
    tithi_name: minTithiScore,
  };

  const canonicalExtraction: ExtractionResult = {
    ...extraction,
    gotra: canonicalGotra,
    events: canonicalEvents,
  };

  // g) transition to awaiting_confirm with fieldScores
  await transitionJob(familyJob.id, "awaiting_confirm", { fieldScores });

  // h) build and send confirm card
  const thresholds = {
    maas: MAAS_MAX_EDITS,
    tithi_name: TITHI_MAX_EDITS,
    paksha: PAKSHA_MAX_EDITS,
    gotra: GOTRA_MAX_EDITS,
  };

  const card = buildConfirmCard(familyJob.id, canonicalExtraction, fieldScores, thresholds);
  await sendConfirmCard(purohit.phoneNumber, card);
}

export async function runIngestPipeline(
  job: IngestJob,
  purohit: { id: string; calendarSystem: string; localityKey: string; phoneNumber: string },
  mediaId: string,
  audioDurationSeconds?: number
): Promise<void> {
  // a) Guard rail: audio duration check
  if (job.kind === "voice" && audioDurationSeconds !== undefined && audioDurationSeconds > 300) {
    await transitionJob(job.id, "failed", { error: "audio_too_long" });
    await sendWhatsappMessage(purohit.phoneNumber, {
      type: "text",
      text: { body: "छोटे-छोटे notes भेजें — एक परिवार एक बार में" },
    });
    return;
  }

  // b) Send immediate ack
  await sendWhatsappMessage(purohit.phoneNumber, {
    type: "text",
    text: { body: "सुन लिया, एक क्षण…" },
  });

  // c) Download media
  let mediaBytes: Buffer;
  try {
    const download = await downloadWhatsappMedia(mediaId);
    mediaBytes = download.bytes;
  } catch (err: any) {
    logger.error({ err, jobId: job.id }, "Media download failed in pipeline");
    await transitionJob(job.id, "failed", { error: String(err) });
    const apology = job.kind === "voice" ? VOICE_APOLOGY_MESSAGE : PHOTO_APOLOGY_MESSAGE;
    await sendWhatsappMessage(purohit.phoneNumber, {
      type: "text",
      text: { body: apology },
    });
    return;
  }

  if (job.kind === "voice") {
    // VOICE path
    let transcript = "";
    try {
      const asr = asrModule.getAsrProvider();
      const asrResult = await asr.transcribe(mediaBytes, { languageHint: "hi-IN" });
      transcript = asrResult.transcript;
      await transitionJob(job.id, "transcribed", { transcript });
    } catch (err: any) {
      logger.error({ err, jobId: job.id }, "ASR transcription failed");
      await transitionJob(job.id, "failed", { error: String(err) });
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: VOICE_APOLOGY_MESSAGE },
      });
      return;
    }

    let extraction: ExtractionResult;
    try {
      extraction = await extractFields(transcript, getExtractionModelCaller());
    } catch (err: any) {
      logger.error({ err, jobId: job.id }, "Field extraction failed");
      await transitionJob(job.id, "failed", { error: String(err) });
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: VOICE_APOLOGY_MESSAGE },
      });
      return;
    }

    try {
      await finalizeFamilyExtraction(job, purohit, extraction);
      
      if (extraction.confidence_notes === "multi-family") {
        await sendWhatsappMessage(purohit.phoneNumber, buildMultiFamilyFollowup());
      }
    } catch (err: any) {
      logger.error({ err, jobId: job.id }, "Voice finalization failed");
      await transitionJob(job.id, "failed", { error: String(err) });
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: VOICE_APOLOGY_MESSAGE },
      });
    }
  } else if (job.kind === "photo") {
    // PHOTO path
    let extractionResult: { families: ExtractionResult[]; truncated: boolean };
    try {
      extractionResult = await extractFieldsFromImage(mediaBytes, getExtractionModelCaller());
    } catch (err: any) {
      logger.error({ err, jobId: job.id }, "Vision extraction failed");
      await transitionJob(job.id, "failed", { error: String(err) });
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: PHOTO_APOLOGY_MESSAGE },
      });
      return;
    }

    const { families, truncated } = extractionResult;

    if (families.length === 0) {
      logger.warn({ jobId: job.id }, "No families detected in photo");
      await transitionJob(job.id, "failed", { error: "no_families_detected" });
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: PHOTO_APOLOGY_MESSAGE },
      });
      return;
    }

    for (let i = 0; i < families.length; i++) {
      let familyJob = job;
      let siblingCreated = false;
      try {
        if (i >= 1) {
          familyJob = await createIngestJob(purohit.id, "photo");
          siblingCreated = true;
        }
        await finalizeFamilyExtraction(familyJob, purohit, families[i]);
      } catch (err: any) {
        logger.error({ err, index: i, jobId: job.id }, "Failed to process family in photo burst");
        const targetJobId = siblingCreated ? familyJob.id : job.id;
        try {
          await transitionJob(targetJobId, "failed", { error: String(err) });
        } catch (transErr) {
          logger.error({ transErr, targetJobId }, "Failed to transition family job to failed status");
        }
        await sendWhatsappMessage(purohit.phoneNumber, {
          type: "text",
          text: { body: PHOTO_APOLOGY_MESSAGE },
        });
      }
    }

    if (truncated) {
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: "अगला पन्ना भेजें" },
      });
    }
  }
}

/**
 * this is the only function in this phase's file set permitted to write to yajmans/events — do not add a second write path.
 */
export async function confirmJob(
  jobId: string,
  confirmingPurohitId: string,
  options?: "reuse" | "new" | { collisionResolution?: "reuse" | "new"; force?: boolean },
  forceFlag: boolean = false
): Promise<{ status: "written" | "duplicate-tap" | "collision-pending" }> {
  let collisionResolution: "reuse" | "new" | undefined = undefined;
  let force = forceFlag;

  if (typeof options === "string") {
    collisionResolution = options;
  } else if (options && typeof options === "object") {
    collisionResolution = options.collisionResolution;
    if (options.force !== undefined) {
      force = options.force;
    }
  }

  if (!process.env.DATABASE_URL) {
    logger.error("confirmJob failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }

  const { db, ingestJobsTable, yajmansTable, eventsTable, purohitsTable } = await import("@workspace/db");

  // Read job
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    throw new Error(`Ingest job ${jobId} not found`);
  }

  const job = jobs[0];

  // Assert caller ownership immediately (Nit-2)
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn(
      { jobId, jobPurohitId: job.purohitId, confirmingPurohitId },
      "Purohit ownership mismatch on confirmJob"
    );
    return { status: "duplicate-tap" };
  }

  // Idempotency: must be in awaiting_confirm status
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job is not in awaiting_confirm status, skipping write");
    return { status: "duplicate-tap" };
  }

  const extraction = job.extraction as ExtractionResult;
  if (!extraction) {
    throw new Error(`Ingest job ${jobId} has no extraction data`);
  }

  // Resolve purohit to get locality key and phone number
  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);

  if (purohits.length === 0) {
    throw new Error(`Purohit ${job.purohitId} not found`);
  }
  const purohit = purohits[0];

  // Pre-resolve events and check for tithi resolution issues
  const resolvedEvents: Array<{
    eventType: string;
    maas: string;
    paksha: string;
    tithi: number;
    label: string | null;
    date: Date | null;
    time: string | null;
  }> = [];

  const rawEvents = extraction.events || [];
  for (const event of rawEvents) {
    let finalMaas = event.maas || "";
    if (event.maas) {
      const match = matchField(event.maas, maasVocab, MAAS_MAX_EDITS);
      if (match.canonical !== null) {
        finalMaas = match.canonical;
      }
    }

    let finalPaksha = event.paksha || "";
    if (event.paksha) {
      const match = matchField(event.paksha, pakshaVocab, PAKSHA_MAX_EDITS);
      if (match.canonical !== null) {
        finalPaksha = match.canonical;
      }
    }

    let tithiNumber: number | undefined;
    if (event.tithi_name) {
      const match = matchField(event.tithi_name, tithiVocab, TITHI_MAX_EDITS);
      if (match.canonical !== null) {
        tithiNumber = tithiVocab.find((v) => v.canonical === match.canonical)?.tithiNumber;
      }
    }

    if (tithiNumber === undefined) {
      // Transition to failed and send apology message
      await transitionJob(job.id, "failed", { error: "tithi_unresolved" });
      const apology = job.kind === "voice" ? VOICE_APOLOGY_MESSAGE : PHOTO_APOLOGY_MESSAGE;
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "text",
        text: { body: apology },
      });
      return { status: "duplicate-tap" };
    }

    const { date, time } = parseGregorianHint(event.gregorian_hint);

    resolvedEvents.push({
      eventType: event.event_type,
      maas: finalMaas,
      paksha: finalPaksha,
      tithi: tithiNumber,
      label: event.label,
      date,
      time,
    });
  }

  // Muhurat collision check
  for (const resolvedEvent of resolvedEvents) {
    const window = windowFromTime(resolvedEvent.time);
    const hasCollision = await hasMuhuratCollision(
      job.purohitId,
      { maas: resolvedEvent.maas, paksha: resolvedEvent.paksha, tithi: resolvedEvent.tithi },
      window
    );
    if (hasCollision) {
      if (!force) {
        const conflict = await getMuhuratCollision(
          job.purohitId,
          { maas: resolvedEvent.maas, paksha: resolvedEvent.paksha, tithi: resolvedEvent.tithi },
          window
        );
        const conflictTitle = conflict?.label || conflict?.eventType || "Unknown Event";
        const conflictDetails = `Maas: ${resolvedEvent.maas}, Paksha: ${resolvedEvent.paksha}, Tithi: ${resolvedEvent.tithi}, Window: ${window}`;
        throw new MuhuratCollisionError(conflictTitle, conflictDetails);
      } else {
        logger.info(
          { jobId: job.id, maas: resolvedEvent.maas, paksha: resolvedEvent.paksha, tithi: resolvedEvent.tithi, window },
          "Muhurat collision bypassed via force flag (override)"
        );
      }
    }
  }

  // Normalize family name (D-05: never fuzzy matched)
  const rawFamilyName = extraction.family_name || "";
  const normalizedFamilyName = rawFamilyName.trim().replace(/\s+/g, " ").normalize("NFC");

  // Query yajman matching purohit_id + normalized family_name
  const existingYajmans = await db
    .select()
    .from(yajmansTable)
    .where(
      and(
        eq(yajmansTable.purohitId, job.purohitId),
        eq(yajmansTable.familyName, normalizedFamilyName)
      )
    )
    .limit(1);

  const existingYajman = existingYajmans[0];
  let yajmanId: string;

  if (existingYajman) {
    if (collisionResolution === undefined) {
      // Send interactive prompt to purohit
      await sendWhatsappMessage(purohit.phoneNumber, {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: `यह वही ${normalizedFamilyName} है?`,
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: `collision-yes:${jobId}`,
                  title: "हाँ, वही है",
                },
              },
              {
                type: "reply",
                reply: {
                  id: `collision-no:${jobId}`,
                  title: "नहीं, नया परिवार",
                },
              },
            ],
          },
        },
      });
      return { status: "collision-pending" };
    } else if (collisionResolution === "reuse") {
      yajmanId = existingYajman.id;
    } else if (collisionResolution === "new") {
      // Force create a new yajman row
      let finalGotra: string | null = null;
      if (extraction.gotra) {
        const match = matchField(extraction.gotra, gotraVocab, GOTRA_MAX_EDITS);
        finalGotra = match.canonical !== null ? match.canonical : extraction.gotra;
      }

      const [newYajman] = await db
        .insert(yajmansTable)
        .values({
          purohitId: job.purohitId,
          familyName: normalizedFamilyName,
          gotra: finalGotra,
          whatsappNumber: extraction.whatsapp_number,
          localityKey: purohit.localityKey,
          source: job.kind,
        })
        .returning();
      
      if (!newYajman) {
        throw new Error("Failed to insert new yajman");
      }
      yajmanId = newYajman.id;
    } else {
      throw new Error(`Invalid collision resolution: ${collisionResolution}`);
    }
  } else {
    // No match: insert a new yajman row
    let finalGotra: string | null = null;
    if (extraction.gotra) {
      const match = matchField(extraction.gotra, gotraVocab, GOTRA_MAX_EDITS);
      finalGotra = match.canonical !== null ? match.canonical : extraction.gotra;
    }

    const [newYajman] = await db
      .insert(yajmansTable)
      .values({
        purohitId: job.purohitId,
        familyName: normalizedFamilyName,
        gotra: finalGotra,
        whatsappNumber: extraction.whatsapp_number,
        localityKey: purohit.localityKey,
        source: job.kind,
      })
      .returning();

    if (!newYajman) {
      throw new Error("Failed to insert new yajman");
    }
    yajmanId = newYajman.id;
  }

  // Insert events
  const cycleYear = new Date().getFullYear();
  const { resolveEventGregorianForCycle } = await import("./brain");
  for (const resolvedEvent of resolvedEvents) {
    const resolved = await resolveEventGregorianForCycle(
      { maas: resolvedEvent.maas, paksha: resolvedEvent.paksha, tithi: resolvedEvent.tithi, time: resolvedEvent.time },
      purohit,
      new Date()
    );

    const window = windowFromTime(resolvedEvent.time);

    await db.insert(eventsTable).values({
      yajmanId,
      purohitId: job.purohitId,
      date: resolvedEvent.date || null,
      time: resolvedEvent.time,
      eventType: resolvedEvent.eventType,
      maas: resolvedEvent.maas,
      paksha: resolvedEvent.paksha,
      tithi: resolvedEvent.tithi,
      label: resolvedEvent.label,
      source: job.kind,
      ingestJobId: job.id,
      resolvedDate: resolved?.gregorianDate ?? null,
      resolvedWindow: resolved?.window ?? window,
      resolvedCycleYear: resolved ? cycleYear : null,
    });
  }

  // Transition job status to confirmed
  await transitionJob(job.id, "confirmed");

  return { status: "written" };
}

export async function rejectJob(jobId: string): Promise<void> {
  await transitionJob(jobId, "rejected");
}

export async function patchJob(
  jobId: string,
  patch: Partial<{ extraction: unknown; fieldScores: unknown }>
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error(`patchJob failed for ${jobId}: DATABASE_URL is not set`);
    throw new IngestDbUnavailableError();
  }

  const { db, ingestJobsTable } = await import("@workspace/db");

  try {
    const updateValues: Partial<IngestJob> = {
      updatedAt: new Date(),
      ...patch,
    };

    await db
      .update(ingestJobsTable)
      .set(updateValues)
      .where(eq(ingestJobsTable.id, jobId));
  } catch (err) {
    logger.error({ err, jobId, patch }, "Failed to patch ingest job");
    throw err;
  }
}

export function isValidFieldPath(fieldPath: string): boolean {
  if (fieldPath === "family_name" || fieldPath === "gotra") {
    return true;
  }
  const match = /^events\.(\d+)\.(maas|paksha|tithi_name)$/.exec(fieldPath);
  if (match) {
    return true;
  }
  return false;
}

export function getFieldValue(extraction: ExtractionResult, fieldPath: string): string | null {
  if (fieldPath === "family_name") {
    return extraction.family_name || null;
  }
  if (fieldPath === "gotra") {
    return extraction.gotra || null;
  }
  if (fieldPath.startsWith("events.")) {
    const parts = fieldPath.split(".");
    const idx = parseInt(parts[1], 10);
    const key = parts[2] as "maas" | "paksha" | "tithi_name";
    const event = extraction.events?.[idx];
    if (event) {
      return event[key] || null;
    }
  }
  return null;
}

export function setFieldValue(extraction: ExtractionResult, fieldPath: string, value: string): ExtractionResult {
  const newExtraction = JSON.parse(JSON.stringify(extraction)) as ExtractionResult;
  if (fieldPath === "family_name") {
    newExtraction.family_name = value;
  } else if (fieldPath === "gotra") {
    newExtraction.gotra = value;
  } else if (fieldPath.startsWith("events.")) {
    const parts = fieldPath.split(".");
    const idx = parseInt(parts[1], 10);
    const key = parts[2] as "maas" | "paksha" | "tithi_name";
    if (!newExtraction.events) {
      newExtraction.events = [];
    }
    if (!newExtraction.events[idx]) {
      newExtraction.events[idx] = { event_type: "other", label: null, maas: null, paksha: null, tithi_name: null, gregorian_hint: null };
    }
    newExtraction.events[idx][key] = value as any;
  }
  return newExtraction;
}

export async function startCorrection(jobId: string, confirmingPurohitId: string): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.error("startCorrection failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable, purohitsTable } = await import("@workspace/db");
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    logger.warn({ jobId }, "Job not found in startCorrection");
    return;
  }
  const job = jobs[0];
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job status is not awaiting_confirm, skipping startCorrection");
    return;
  }
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn({ jobId, jobPurohitId: job.purohitId, confirmingPurohitId }, "Purohit ownership mismatch in startCorrection");
    return;
  }

  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);
  if (purohits.length === 0) {
    logger.error(`Purohit ${job.purohitId} not found in startCorrection`);
    return;
  }
  const purohit = purohits[0];

  const { buildFieldSelectionList } = await import("./confirm-card");
  const card = buildFieldSelectionList(job.id, job.extraction as ExtractionResult);
  await sendWhatsappMessage(purohit.phoneNumber, card);
}

export async function selectCorrectionField(jobId: string, fieldPath: string, confirmingPurohitId: string): Promise<void> {
  if (!isValidFieldPath(fieldPath)) {
    logger.warn({ jobId, fieldPath }, "Invalid fieldPath in selectCorrectionField, skipping");
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.error("selectCorrectionField failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable, purohitsTable } = await import("@workspace/db");
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    logger.warn({ jobId }, "Job not found in selectCorrectionField");
    return;
  }
  const job = jobs[0];
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job status is not awaiting_confirm, skipping selectCorrectionField");
    return;
  }
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn({ jobId, jobPurohitId: job.purohitId, confirmingPurohitId }, "Purohit ownership mismatch in selectCorrectionField");
    return;
  }

  if (fieldPath === "family_name") {
    await beginFreeTextCorrection(jobId, fieldPath, confirmingPurohitId);
    return;
  }

  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);
  if (purohits.length === 0) {
    logger.error(`Purohit ${job.purohitId} not found in selectCorrectionField`);
    return;
  }
  const purohit = purohits[0];

  const heard = getFieldValue(job.extraction as ExtractionResult, fieldPath) || "";
  const { buildFieldCandidateList } = await import("./confirm-card");
  const card = buildFieldCandidateList(job.id, fieldPath, heard);
  if (card) {
    await sendWhatsappMessage(purohit.phoneNumber, card);
  }
}

export async function applyCorrectionCandidate(
  jobId: string,
  fieldPath: string,
  candidateIndex: number,
  confirmingPurohitId: string
): Promise<void> {
  if (!isValidFieldPath(fieldPath)) {
    logger.warn({ jobId, fieldPath }, "Invalid fieldPath in applyCorrectionCandidate, skipping");
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.error("applyCorrectionCandidate failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable, purohitsTable } = await import("@workspace/db");
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    logger.warn({ jobId }, "Job not found in applyCorrectionCandidate");
    return;
  }
  const job = jobs[0];
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job status is not awaiting_confirm, skipping applyCorrectionCandidate");
    return;
  }
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn({ jobId, jobPurohitId: job.purohitId, confirmingPurohitId }, "Purohit ownership mismatch in applyCorrectionCandidate");
    return;
  }

  const segments = fieldPath.split(".");
  const baseKey = segments[segments.length - 1];
  const { CORRECTABLE_VOCAB_FIELDS, topCandidates, buildConfirmCard, sendConfirmCard } = await import("./confirm-card");
  const config = CORRECTABLE_VOCAB_FIELDS[baseKey];
  if (!config) {
    logger.warn({ jobId, baseKey }, "No vocab config found for baseKey in applyCorrectionCandidate");
    return;
  }

  const heard = getFieldValue(job.extraction as ExtractionResult, fieldPath) || "";
  const candidates = topCandidates(heard, config.vocab, 3);
  const chosenCandidate = candidates[candidateIndex];
  if (!chosenCandidate) {
    logger.warn({ jobId, candidateIndex }, "Invalid candidate index selected");
    return;
  }

  const updatedExtraction = setFieldValue(job.extraction as ExtractionResult, fieldPath, chosenCandidate);
  
  const currentScores = (job.fieldScores as Record<string, any>) || {};
  const updatedScores = {
    ...currentScores,
    [fieldPath]: 1.0,
  };
  delete updatedScores._pendingCorrectionField;

  await patchJob(job.id, {
    extraction: updatedExtraction,
    fieldScores: updatedScores,
  });

  const thresholds = {
    maas: MAAS_MAX_EDITS,
    tithi_name: TITHI_MAX_EDITS,
    paksha: PAKSHA_MAX_EDITS,
    gotra: GOTRA_MAX_EDITS,
  };

  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);
  if (purohits.length === 0) {
    logger.error(`Purohit ${job.purohitId} not found in applyCorrectionCandidate`);
    return;
  }
  const purohit = purohits[0];

  const card = buildConfirmCard(job.id, updatedExtraction, updatedScores, thresholds);
  await sendConfirmCard(purohit.phoneNumber, card);
}

export async function beginFreeTextCorrection(
  jobId: string,
  fieldPath: string,
  confirmingPurohitId: string
): Promise<void> {
  if (!isValidFieldPath(fieldPath)) {
    logger.warn({ jobId, fieldPath }, "Invalid fieldPath in beginFreeTextCorrection, skipping");
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.error("beginFreeTextCorrection failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable, purohitsTable } = await import("@workspace/db");
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    logger.warn({ jobId }, "Job not found in beginFreeTextCorrection");
    return;
  }
  const job = jobs[0];
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job status is not awaiting_confirm, skipping beginFreeTextCorrection");
    return;
  }
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn({ jobId, jobPurohitId: job.purohitId, confirmingPurohitId }, "Purohit ownership mismatch in beginFreeTextCorrection");
    return;
  }

  const currentScores = (job.fieldScores as Record<string, any>) || {};
  const updatedScores = {
    ...currentScores,
    _pendingCorrectionField: fieldPath,
  };

  await patchJob(job.id, {
    fieldScores: updatedScores,
  });

  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);
  if (purohits.length === 0) {
    logger.error(`Purohit ${job.purohitId} not found in beginFreeTextCorrection`);
    return;
  }
  const purohit = purohits[0];

  await sendWhatsappMessage(purohit.phoneNumber, {
    type: "text",
    text: {
      body: "ठीक है, सही जानकारी टाइप करके भेजें",
    },
  });
}

export async function applyFreeTextCorrection(
  jobId: string,
  fieldPath: string,
  text: string,
  confirmingPurohitId: string
): Promise<void> {
  if (!isValidFieldPath(fieldPath)) {
    logger.warn({ jobId, fieldPath }, "Invalid fieldPath in applyFreeTextCorrection, skipping");
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.error("applyFreeTextCorrection failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable, purohitsTable } = await import("@workspace/db");
  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);

  if (jobs.length === 0) {
    logger.warn({ jobId }, "Job not found in applyFreeTextCorrection");
    return;
  }
  const job = jobs[0];
  if (job.status !== "awaiting_confirm") {
    logger.warn({ jobId, status: job.status }, "Job status is not awaiting_confirm, skipping applyFreeTextCorrection");
    return;
  }
  if (job.purohitId !== confirmingPurohitId) {
    logger.warn({ jobId, jobPurohitId: job.purohitId, confirmingPurohitId }, "Purohit ownership mismatch in applyFreeTextCorrection");
    return;
  }

  const trimmedText = (text || "").trim();
  const updatedExtraction = setFieldValue(job.extraction as ExtractionResult, fieldPath, trimmedText);

  const currentScores = (job.fieldScores as Record<string, any>) || {};
  const updatedScores = {
    ...currentScores,
    [fieldPath]: 1.0,
  };
  delete updatedScores._pendingCorrectionField;

  await patchJob(job.id, {
    extraction: updatedExtraction,
    fieldScores: updatedScores,
  });

  const thresholds = {
    maas: MAAS_MAX_EDITS,
    tithi_name: TITHI_MAX_EDITS,
    paksha: PAKSHA_MAX_EDITS,
    gotra: GOTRA_MAX_EDITS,
  };

  const purohits = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, job.purohitId))
    .limit(1);
  if (purohits.length === 0) {
    logger.error(`Purohit ${job.purohitId} not found in applyFreeTextCorrection`);
    return;
  }
  const purohit = purohits[0];

  const { buildConfirmCard, sendConfirmCard } = await import("./confirm-card");
  const card = buildConfirmCard(job.id, updatedExtraction, updatedScores, thresholds);
  await sendConfirmCard(purohit.phoneNumber, card);
}

export async function findPendingCorrectionJob(
  purohitId: string
): Promise<{ job: IngestJob; fieldPath: string } | null> {
  if (!process.env.DATABASE_URL) {
    logger.error("findPendingCorrectionJob failed: DATABASE_URL is not set");
    throw new IngestDbUnavailableError();
  }
  const { db, ingestJobsTable } = await import("@workspace/db");
  const { desc } = await import("drizzle-orm");

  const jobs = await db
    .select()
    .from(ingestJobsTable)
    .where(
      and(
        eq(ingestJobsTable.purohitId, purohitId),
        eq(ingestJobsTable.status, "awaiting_confirm")
      )
    )
    .orderBy(desc(ingestJobsTable.updatedAt));

  for (const job of jobs) {
    const scores = (job.fieldScores as Record<string, any>) || {};
    if (scores._pendingCorrectionField) {
      return {
        job: job as IngestJob,
        fieldPath: scores._pendingCorrectionField,
      };
    }
  }

  return null;
}


