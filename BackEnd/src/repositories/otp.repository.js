import Otp from "../models/otp.model.js";

export const findOtp = (filter) => Otp.findOne(filter);

export const createOtp = (payload) => Otp.create(payload);

export const deleteOtps = (filter) => Otp.deleteMany(filter);

export const updateOtp = (filter, update) => Otp.findOneAndUpdate(filter, update);
