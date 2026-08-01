import Payment from "../models/payment.js";

export const findPayment = (filter) => Payment.findOne(filter);

export const createPayment = (payload) => Payment.create(payload);

export const updatePayment = (filter, update) =>
  Payment.findOneAndUpdate(filter, update, { new: true });

export const findPayments = (filter, { limit = 20, cursor = null } = {}) => {
  const query = { ...filter };
  if (cursor) query._id = { $lt: cursor };
  return Payment.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
};
