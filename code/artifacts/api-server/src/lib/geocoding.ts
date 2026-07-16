import { logger } from "./logger";
import { retryFetch } from "./retry";

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";

const slugifyPart = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function searchNominatim(query: string): Promise<{ lat: string; lon: string } | null> {
  const url = `${NOMINATIM_BASE_URL}/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const upstream = await retryFetch(url, {
      headers: {
        "User-Agent": "Smaran/1.0 (contact: shop.pustak@gmail.com)",
      }
    });
    const data = await upstream.json() as Array<{ lat: string; lon: string }>;
    if (!data || data.length === 0) {
      return null;
    }
    return data[0];
  } catch (err) {
    logger.warn({ query, err }, "Nominatim search failed");
    return null;
  }
}

export async function geocodeCity(city: string, ward: string): Promise<{ latitude: number; longitude: number; localityKey: string } | null> {
  const trimmedCity = city.trim();
  const trimmedWard = ward.trim();

  try {
    let result = await searchNominatim(`${trimmedWard}, ${trimmedCity}`);
    if (!result) {
      result = await searchNominatim(trimmedCity);
    }
    
    if (!result) {
      logger.warn({ city, ward }, "Nominatim geocode failed");
      return null;
    }

    // Derive localityKey combining city AND ward to ensure sub-city granularity
    // as Nominatim often fails to provide a specific sub-city locality for a generic city search.
    const localityKey = trimmedWard.length > 0 ? `${slugifyPart(trimmedCity)}-${slugifyPart(trimmedWard)}` : slugifyPart(trimmedCity);

    return {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      localityKey
    };
  } catch (err) {
    logger.warn({ city, ward, err }, "Nominatim geocode failed");
    return null;
  }
}
