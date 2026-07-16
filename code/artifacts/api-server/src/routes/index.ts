import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keepaliveRouter from "./keepalive";
import panchangRouter from "./panchang";
import whatsappRouter from "./whatsapp";
import purohitsRouter from "./purohits";
import ingestJobsRouter from "./ingest-jobs";
import cronRouter from "./cron";
import ledgerRouter from "./ledger";
import metricsRouter from "./metrics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keepaliveRouter);
router.use(panchangRouter);
router.use(whatsappRouter);
router.use(purohitsRouter);
router.use(ingestJobsRouter);
router.use(cronRouter);
router.use(ledgerRouter);
router.use(metricsRouter);

export default router;
