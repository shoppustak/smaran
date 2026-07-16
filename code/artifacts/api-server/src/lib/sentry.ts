import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry DSN not found, error sink is disabled (no-op).");
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  Sentry.init({
    dsn,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: isProduction ? 0.1 : 1.0,
    beforeSend(event) {
      if (!isProduction) {
        return null;
      }
      event.tags = {
        ...event.tags,
        app: "smaran-api",
      };
      return event;
    },
  });
  logger.info("Sentry initialized successfully.");
}

export function captureException(err: any, context?: Record<string, any>) {
  logger.error({ err, ...context }, "Capturing exception");
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { extra: context });
  }
}
