import Invite from "../models/invite.js";

export const findInvite = (filter) => Invite.findOne(filter);

export const findInvites = (filter, options = {}) =>
  Invite.find(filter)
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50)
    .lean();

export const countInvites = (filter) => Invite.countDocuments(filter);

export const createInvite = (payload) => Invite.create(payload);

export const updateInvite = (filter, update) =>
  Invite.findOneAndUpdate(filter, update, { new: true });

export const updateInvites = (filter, update) =>
  Invite.updateMany(filter, update);

export const aggregateMonthlySent = (senderId, yearMonth) => {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return Invite.countDocuments({
    senderId,
    createdAt: { $gte: start, $lt: end },
    status: { $ne: "cancelled" },
  });
};
