import { Router, type IRouter } from "express";
import healthRouter from "./health";
import panchangRouter from "./panchang";

const router: IRouter = Router();

router.use(healthRouter);
router.use(panchangRouter);

export default router;
