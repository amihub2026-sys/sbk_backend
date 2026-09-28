import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncRoute } from "../utils/http.js";
import { saveScore,state } from "../controllers/judge.controller.js";
import { scoreSchema } from "../validators/judge.validators.js";
export const judgeRouter=Router();judgeRouter.use(requireRole("judge"));
judgeRouter.get("/state",asyncRoute(state));
judgeRouter.put("/scores/:id",validate(scoreSchema),asyncRoute(saveScore));
