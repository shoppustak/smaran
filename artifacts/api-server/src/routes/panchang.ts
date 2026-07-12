import { Router, type IRouter } from "express";
import { GetPanchangResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Vedika API (https://vedika.io) provides Hindu Panchang / astrology data.
// We call the free sandbox for now (no API key, mock data, same response shape
// as production). To go live, set VEDIKA_API_KEY and VEDIKA_API_BASE_URL
// (e.g. https://api.vedika.io) and this route will automatically switch over.
const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
const VEDIKA_BASE_URL = VEDIKA_API_KEY
  ? (process.env.VEDIKA_API_BASE_URL ?? "https://api.vedika.io")
  : "https://api.vedika.io/sandbox";

// Default to Varanasi, the archetypal purohit practice location for Smaran.
const DEFAULT_LATITUDE = 25.3176;
const DEFAULT_LONGITUDE = 82.9739;
const DEFAULT_TIMEZONE = "+05:30";

router.get("/panchang", async (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const latitude = req.query.latitude ? Number(req.query.latitude) : DEFAULT_LATITUDE;
  const longitude = req.query.longitude ? Number(req.query.longitude) : DEFAULT_LONGITUDE;
  const datetime = date ? `${date}T06:00:00${DEFAULT_TIMEZONE}` : `${new Date().toISOString().slice(0, 10)}T06:00:00${DEFAULT_TIMEZONE}`;

  try {
    const upstream = await fetch(`${VEDIKA_BASE_URL}/astrology/panchang`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(VEDIKA_API_KEY ? { Authorization: `Bearer ${VEDIKA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        datetime,
        latitude,
        longitude,
        timezone: DEFAULT_TIMEZONE,
      }),
    });

    if (!upstream.ok) {
      req.log.error({ status: upstream.status }, "Vedika Panchang API returned an error");
      res.status(502).json({ error: "Failed to fetch Panchang data from Vedika API" });
      return;
    }

    const body = (await upstream.json()) as Record<string, any>;
    const d = body.data ?? {};

    const data = GetPanchangResponse.parse({
      source: VEDIKA_API_KEY ? "production" : "sandbox",
      date: d.datetime ?? datetime,
      tithi: {
        name: d.tithi?.name ?? "Unknown",
        paksha: d.tithi?.paksha?.name ?? "Unknown",
        number: d.tithi?.number ?? 0,
      },
      nakshatra: {
        name: d.nakshatra?.name ?? "Unknown",
        lord: d.nakshatra?.lord ?? "Unknown",
      },
      masa: {
        name: d.masa?.name ?? "Unknown",
        englishEquivalent: d.masa?.englishEquivalent ?? "",
      },
      overallAuspiciousness: d.guidance?.overallAuspiciousness ?? "Unknown",
      summary: d.guidance?.summary ?? "",
      bestActivities: d.guidance?.bestActivities ?? [],
      activitiesToAvoid: d.guidance?.activitiesToAvoid ?? [],
      dishaShool: {
        direction: d.disha_shool?.direction ?? "Unknown",
        description: d.disha_shool?.description ?? "",
      },
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to reach Vedika Panchang API");
    res.status(502).json({ error: "Failed to reach Vedika API" });
  }
});

export default router;
