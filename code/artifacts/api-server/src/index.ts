import { initSentry, captureException } from "./lib/sentry";
initSentry();

import app from "./app";
import { logger } from "./lib/logger";

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection");
  captureException(reason, { type: "unhandledRejection" });
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception - shutting down");
  captureException(err, { type: "uncaughtException" });
  
  setTimeout(() => {
    process.exit(1);
  }, 2000);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
