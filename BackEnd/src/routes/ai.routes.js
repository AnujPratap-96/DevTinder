import { Router } from "express";

import {
  collaborationActivityController,
  generateBioController,
  suggestSkillsController,
  generateIcebreakerController,
  explainMatchController,
  projectDescriptionController,
  projectTechStackController,
  projectRoadmapController,
  githubSyncController,
  projectSuggestionsController,
} from "../controllers/ai.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import { aiDailyLimit } from "../middlewares/planLimits.js";

const router = Router();
const guard = [userAuth, requireMinimumPlan("silver"), aiDailyLimit];

router.post("/ai/collaboration-activity", ...guard, collaborationActivityController);
router.post("/ai/bio", ...guard, generateBioController);
router.post("/ai/skills", ...guard, suggestSkillsController);
router.post("/ai/icebreaker", ...guard, generateIcebreakerController);
router.post("/ai/match-explanation", ...guard, explainMatchController);
router.post("/ai/project-description", ...guard, projectDescriptionController);
router.post("/ai/project-tech-stack", ...guard, projectTechStackController);
router.post("/ai/project-roadmap", ...guard, projectRoadmapController);
router.post("/ai/github-sync", ...guard, githubSyncController);
router.post("/ai/project-suggestions", ...guard, projectSuggestionsController);

export default router;
