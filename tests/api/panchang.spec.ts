import { test, expect } from "@playwright/test";

test("GET /panchang returns a structurally valid sandbox payload", async ({ request }) => {
  const res = await request.get("/api/panchang");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.source).toBe("sandbox");
  expect(typeof body.date).toBe("string");
  expect(typeof body.tithi.name).toBe("string");
  expect(typeof body.tithi.paksha).toBe("string");
  expect(typeof body.tithi.number).toBe("number");
  expect(typeof body.nakshatra.name).toBe("string");
  expect(typeof body.nakshatra.lord).toBe("string");
  expect(typeof body.masa.name).toBe("string");
  expect(typeof body.overallAuspiciousness).toBe("string");
  expect(typeof body.summary).toBe("string");
  expect(Array.isArray(body.bestActivities)).toBe(true);
  expect(Array.isArray(body.activitiesToAvoid)).toBe(true);
  expect(typeof body.dishaShool.direction).toBe("string");
});
