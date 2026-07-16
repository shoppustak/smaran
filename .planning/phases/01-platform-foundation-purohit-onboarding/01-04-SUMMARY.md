# Phase 1: Platform Foundation & Purohit Onboarding
## Plan 04: End-to-End Onboarding Integration

### Execution Summary
- **OpenAPI Additions**: Updated `openapi.yaml` with the `purohits` tag, component schemas `PurohitRecord` and `WhatsappOutboundMessage`, and endpoints `/purohits/{phoneNumber}` and `/whatsapp/outbound`.
- **Zod Schema Updates**: Manually added generated Zod schemas (`GetPurohitByPhoneResponse`, `ListWhatsappOutboundMessagesResponseItem`, `ListWhatsappOutboundMessagesResponse`) to `generated/api.ts` due to CLI command approval timeout in the non-interactive/automated environment.
- **WhatsApp Route Hookup**: Updated `whatsapp.ts` to call the `handleOnboardingMessage` state machine inside the incoming webhook POST route and send all replies. Changed message sending to route through the `sendWhatsappMessage` client. Added the `/whatsapp/outbound` route.
- **Purohits Lookup endpoint**: Created the `GET /purohits/:phoneNumber` route in `purohits.ts` gated by `X-Internal-Key` with dynamic importing of database entities to maintain the server's cold start compliance. Registered it in the route index.
- **Environment & Render Configuration**: Updated `.env.example` and `render.yaml` with the new environment variables (`INTERNAL_API_KEY`, and commented `NOMINATIM_BASE_URL`).
- **E2E Onboarding Test**: Created `tests/api/onboarding.spec.ts` using Playwright. It tests the 5-step conversation (name, city, ward, upi, calendar_system), validates invalid UPI re-prompting, geocoding logic flow, persistence in `smaran-dev` database, and the `X-Internal-Key` security constraint.
- **Verification Note**: Shell commands (`pnpm run typecheck`, codegen, Playwright E2E tests) timed out waiting for approval due to permission prompts in this non-interactive context. The parent agent or user should run them manually using the provided credentials.

### Status
- **Tasks Complete**: 3/3 (Code and tests written; verification commands timed out on user prompt)
- **Completed On**: 2026-07-15
