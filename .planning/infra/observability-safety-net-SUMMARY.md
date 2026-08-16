# Observability, Safety Net & Resilience Upgrades — Summary

Completed: 2026-07-16

We have completed the production safety net, error capturing, signature security, database readiness check, and retry resilience changes as requested.

## Key Changes Delivered

1. **Sentry Error Aggregator**: Gated node Sentry initialization and Express terminal error middleware configured.
2. **Global process handlers**: Registered backstops for uncaught exceptions and unhandled promise rejections.
3. **Webhook HMAC signature check**: timing-safe verification of the `X-Hub-Signature-256` header on `POST /whatsapp/webhook` via `WHATSAPP_APP_SECRET`.
4. **Durable message deduplication**: `processed_webhooks` Postgres table created, with database-backed checks during webhook entry and automatic daily 48h sweep cleanup.
5. **Readiness Health check**: added database-pinging `/health/ready` check, and updated Render config in `render.yaml`.
6. **API Retry Resilience**: `withRetry`/`retryFetch` helpers implementing exponential backoff and ±25% random jitter, wrapping Vedika Panchang, Nominatim geocoding, ASR, and extraction model APIs.
7. **Security Hardening**: helmet integration, restrictive CORS, and rate limiting added to Express.
8. **Documentation**: added architecture sheet `smaran-error-handling.md` and logbook entry.
9. **Verification**: 26 E2E integration tests passing on Playwright E2E suite.

## Operator Action Items

- Provision `SENTRY_DSN` in production Render environment.
- Provision `WHATSAPP_APP_SECRET` in production Render environment.
- Confirm Render deployment config is updated with the `/api/health/ready` check.
