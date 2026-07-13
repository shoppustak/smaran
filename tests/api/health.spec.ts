import { test, expect } from "@playwright/test";

test("GET /healthz returns ok status", async ({ request }) => {
  const res = await request.get("/api/healthz");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
