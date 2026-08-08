import Report from "../models/report.js";

export const findReports = (filter = {}, { limit = 200, sort = { createdAt: -1 } } = {}) =>
  Report.find(filter).sort(sort).limit(limit).lean();

export const findReportById = (id) => Report.findById(id);

export const createReport = (payload) => Report.create(payload);

export const updateReport = (filter, update) =>
  Report.findOneAndUpdate(filter, update, { new: true });

export const findReportsPopulated = (filter = {}, { limit = 200, sort = { createdAt: -1 } } = {}) =>
  Report.find(filter)
    .populate("reporterId", "firstName lastName emailId")
    .populate("reportedUserId", "firstName lastName emailId")
    .sort(sort)
    .limit(limit)
    .lean();

export const findReportsByReporter = (reporterId) =>
  Report.find({ reporterId }).select("reportedUserId").lean();
