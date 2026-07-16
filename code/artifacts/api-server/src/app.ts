import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { captureException } from "./lib/sentry";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(helmet());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = !isProduction || [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4300",
      ].includes(origin);
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting in production
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !isProduction,
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => !isProduction,
});

app.use("/api/whatsapp/webhook", webhookLimiter);
app.use("/api", apiLimiter, router);

// Terminal error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  captureException(err, {
    url: req.url,
    method: req.method,
    headers: req.headers,
  });

  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "internal" });
});

export default app;
