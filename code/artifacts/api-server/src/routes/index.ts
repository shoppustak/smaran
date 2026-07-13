import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keepaliveRouter from "./keepalive";
import panchangRouter from "./panchang";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keepaliveRouter);
router.use(panchangRouter);
router.use(whatsappRouter);

export default router;
