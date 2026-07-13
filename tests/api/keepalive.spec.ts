import { test, expect } from "@playwright/test";

test("GET /keepalive always returns 200, reporting database as not_configured when DATABASE_URL is unset", async ({ request }) => {
  const res = await request.get("/api/keepalive");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.database).toBe("not_configured");
  expect(typeof body.timestamp).toBe("string");
});
