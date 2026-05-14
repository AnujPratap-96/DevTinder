import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getReceivedRequests,
  getConnections,
  getFeed,
  getUsersWithFilters,
  searchUsers,
  endorseConnection,
} from "../services/user.service.js";

export const getReceivedRequestsController = asyncHandler(async (req, res) => {
  const requests = await getReceivedRequests(req.user._id);
  return successResponse(res, {
    message: "Requests fetched successfully",
    data: requests,
  });
});

export const getConnectionsController = asyncHandler(async (req, res) => {
  const connections = await getConnections(req.user._id);
  return successResponse(res, {
    message: "Connections fetched successfully",
    data: connections,
  });
});

export const getFeedController = asyncHandler(async (req, res) => {
  const loggedInUser = req.user;
  const result = await getFeed(loggedInUser, req.query || {});
  return successResponse(res, {
    message: "Feed fetched successfully",
    data: result,
  });
});

export const getUsersController = asyncHandler(async (req, res) => {
  const loggedInUser = req.user;
  const users = await getUsersWithFilters(loggedInUser, req.query || {});
  return successResponse(res, {
    message: "Users fetched successfully",
    data: users,
  });
});

export const searchUsersController = asyncHandler(async (req, res) => {
  const loggedInUser = req.user;
  const users = await searchUsers(loggedInUser, req.query || {});
  return successResponse(res, {
    message: "Search completed successfully",
    data: users,
  });
});

export const endorseUserController = asyncHandler(async (req, res) => {
  const { targetUserId, skill } = req.body;
  const { endorsements, targetUser } = await endorseConnection(req.user, targetUserId, skill);
  return successResponse(res, {
    message: `You endorsed ${targetUser?.firstName ?? targetUserId} for ${skill}`,
    data: endorsements,
  });
});
