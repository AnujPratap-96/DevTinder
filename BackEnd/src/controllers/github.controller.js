import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getGithubProfile, syncGithubProfile } from "../services/github.service.js";

export const githubProfileController = asyncHandler(async (req, res) => {
  const profile = getGithubProfile(req.user);
  return successResponse(res, { data: { githubProfile: profile } });
});

export const githubSyncController = asyncHandler(async (req, res) => {
  const githubProfile = await syncGithubProfile({
    userId: req.user._id,
    accessToken: req.body?.accessToken,
  });
  return successResponse(res, { data: { githubProfile } });
});
