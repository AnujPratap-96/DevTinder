import ConnectionRequest from "../models/connectionRequest.js";

export const findConnectionRequests = (filter, projection, options = {}) => {
  return ConnectionRequest.find(filter, projection, options);
};

export const findConnectionRequest = (filter) => {
  return ConnectionRequest.findOne(filter);
};

export const populateConnectionRequests = (query, fields) => {
  return query
    .populate("fromUserId", fields)
    .populate("toUserId", fields);
};

export const createConnectionRequest = (payload) => {
  const request = new ConnectionRequest(payload);
  return request.save();
};

export const updateConnectionRequest = (filter, update, options = {}) => {
  return ConnectionRequest.findOneAndUpdate(filter, update, {
    new: true,
    ...options,
  });
};
