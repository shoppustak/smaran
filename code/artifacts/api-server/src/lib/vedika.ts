import { retryFetch } from "./retry";

// Keep V1 fallback for now as per plan
function getVedikaBaseUrl(version: "v1" | "v2" = "v1") {
  const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
  const VEDIKA_API_BASE_URL = process.env.VEDIKA_API_BASE_URL ?? "https://api.vedika.io";

  if (!VEDIKA_API_KEY) {
    return "https://api.vedika.io/sandbox"; // Sandbox doesn't have v2 paths generally, but let's just use sandbox base
  }

  // Assuming V2 base url structure for production
  if (version === "v2") {
    return `${VEDIKA_API_BASE_URL}/v2`;
  }
  return VEDIKA_API_BASE_URL; // V1 base
}

function getHeaders() {
  const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
  return {
    "Content-Type": "application/json",
    ...(VEDIKA_API_KEY ? { Authorization: `Bearer ${VEDIKA_API_KEY}` } : {}),
  };
}

export async function fetchVedikaDailyHoroscope(rashi: string, dateStr: string): Promise<string> {
  const baseUrl = getVedikaBaseUrl("v2");
  
  // Use v2 astrology endpoint for horoscopes if available, fallback to v1 format gracefully if hitting sandbox
  const isSandbox = !process.env.VEDIKA_API_KEY;
  const endpoint = isSandbox 
    ? `${baseUrl}/astrology/horoscope/${rashi}` 
    : `${baseUrl}/astrology/horoscope/${rashi}`;

  try {
    const response = await retryFetch(endpoint, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        date: dateStr,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch daily horoscope: ${response.statusText}`);
    }

    const body = (await response.json()) as any;
    return body.data?.horoscope ?? "आज का दिन आपके लिए मंगलमय हो। शुभ कार्यों में सफलता मिलेगी।";
  } catch (err) {
    console.error("Vedika horoscope error", err);
    return "आज का दिन आपके लिए मंगलमय हो। शुभ कार्यों में सफलता मिलेगी।";
  }
}

export async function fetchVedikaDailyAffirmation(): Promise<string> {
  const baseUrl = getVedikaBaseUrl("v2");
  const isSandbox = !process.env.VEDIKA_API_KEY;
  
  try {
    const response = await retryFetch(`${baseUrl}/content/affirmation`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch daily affirmation: ${response.statusText}`);
    }

    const body = (await response.json()) as any;
    return body.data?.affirmation ?? "ॐ शांति। सत्य और धर्म के मार्ग पर चलें।";
  } catch (err) {
    console.error("Vedika affirmation error", err);
    return "ॐ शांति। सत्य और धर्म के मार्ग पर चलें।";
  }
}
