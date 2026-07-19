import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listPlans,
  listActivePlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../services/plan.service.js";

export const listPlansController = asyncHandler(async (req, res) => {
  const plans = await listPlans();
  return successResponse(res, { data: { plans } });
});

export const listActivePlansController = asyncHandler(async (req, res) => {
  const plans = await listActivePlans();
  return successResponse(res, { data: { plans } });
});

export const createPlanController = asyncHandler(async (req, res) => {
  const plan = await createPlan(req.body);
  return successResponse(res, { message: "Plan created", data: { plan } });
});

export const updatePlanController = asyncHandler(async (req, res) => {
  const plan = await updatePlan(req.params.id, req.body);
  return successResponse(res, { message: "Plan updated", data: { plan } });
});

export const deletePlanController = asyncHandler(async (req, res) => {
  await deletePlan(req.params.id);
  return successResponse(res, { message: "Plan deleted" });
});
