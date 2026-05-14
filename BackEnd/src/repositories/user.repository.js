import mongoose from "mongoose";
import User from "../models/user.model.js";

export const findUserById = (id, options = {}) => {
  return User.findById(id, null, options);
};

export const findUserByEmail = (email) => {
  return User.findOne({ emailId: email });
};

export const findUsers = (filter = {}, projection, options = {}) => {
  return User.find(filter, projection, options);
};

export const aggregateUsers = (pipeline) => {
  return User.aggregate(pipeline);
};

export const updateUserById = (id, update, options = {}) => {
  return User.findByIdAndUpdate(id, update, { new: true, ...options });
};

export const saveUser = (user) => user.save();

export const createObjectId = (id) => new mongoose.Types.ObjectId(id);
