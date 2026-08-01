import Plan from "../models/plan.js";

export const findPlan = (filter) => Plan.findOne(filter);

export const findPlans = (filter = {}) => Plan.find(filter).sort({ order: 1 }).lean();

export const findPlanById = (id) => Plan.findById(id);

export const createPlan = (payload) => Plan.create(payload);

export const upsertPlan = (filter, update) =>
  Plan.findOneAndUpdate(filter, update, { upsert: true, setDefaultsOnInsert: true });

export const updatePlanById = (id, update) =>
  Plan.findByIdAndUpdate(id, update, { new: true, runValidators: true });

export const updatePlan = (filter, update) =>
  Plan.updateOne(filter, update);

export const deletePlanById = (id) => Plan.findByIdAndDelete(id);
