import { Router } from "express";
import { executeProfile, checkConformance } from "../controllers/testController";

const router = Router();

router.post("/execute-profile", executeProfile);
router.get("/check-conformance/:runId", checkConformance);

export default router;