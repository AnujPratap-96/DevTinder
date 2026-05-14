import Project from "../models/project.js";
import User from "../models/user.model.js";
import {
  generateBio,
  suggestSkills,
  generateIcebreaker,
  explainMatch,
  generateProjectDescription,
  suggestProjectTechStack,
  generateProjectRoadmap,
  syncGitHubData,
  suggestCollaborationActivity,
} from "../services/aiService.js";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ValidationError, NotFoundError } from "../errors/index.js";

export const collaborationActivityController = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body ?? {};
  if (!targetUserId) {
    throw new ValidationError("targetUserId is required");
  }

  const targetUser = await User.findById(targetUserId).select("firstName skills role").lean();
  if (!targetUser) {
    throw new NotFoundError("User");
  }

  const result = await suggestCollaborationActivity({ userA: req.user, userB: targetUser });
  return successResponse(res, { data: result });
});

export const generateBioController = asyncHandler(async (req, res) => {
  const { skills, experienceYears, role, interests } = req.body ?? {};
  const payload = {
    skills: skills ?? req.user.skills,
    experienceYears: experienceYears ?? req.user.experienceYears,
    role: role ?? req.user.role,
    interests,
  };

  if (!payload.skills?.length && !payload.role) {
    throw new ValidationError("Provide at least skills or role to generate a bio.");
  }

  const bio = await generateBio(payload);
  return successResponse(res, { data: { bio } });
});

export const suggestSkillsController = asyncHandler(async (req, res) => {
  const { currentSkills, role, about } = req.body ?? {};
  const payload = {
    currentSkills: currentSkills ?? req.user.skills,
    role: role ?? req.user.role,
    about: about ?? req.user.about,
  };

  const suggestions = await suggestSkills(payload);
  return successResponse(res, { data: { suggestions } });
});

export const generateIcebreakerController = asyncHandler(async (req, res) => {
  const { receiverId } = req.body ?? {};
  if (!receiverId) {
    throw new ValidationError("receiverId is required");
  }

  const receiver = await User.findById(receiverId)
    .select("firstName skills role experienceYears")
    .lean();

  if (!receiver) {
    throw new NotFoundError("Receiver");
  }

  const message = await generateIcebreaker({ sender: req.user, receiver });
  return successResponse(res, { data: { message } });
});

export const explainMatchController = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body ?? {};
  if (!targetUserId) {
    throw new ValidationError("targetUserId is required");
  }

  const targetUser = await User.findById(targetUserId)
    .select("firstName skills role experienceYears")
    .lean();

  if (!targetUser) {
    throw new NotFoundError("User");
  }

  const points = await explainMatch({ userA: req.user, userB: targetUser });
  return successResponse(res, { data: { points } });
});

export const projectDescriptionController = asyncHandler(async (req, res) => {
  const { title, techStack } = req.body ?? {};
  if (!title) {
    throw new ValidationError("title is required to generate a description.");
  }
  const description = await generateProjectDescription({ title, techStack });
  return successResponse(res, { data: { description } });
});

export const projectTechStackController = asyncHandler(async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title && !description) {
    throw new ValidationError("Provide either title or description to suggest a tech stack.");
  }
  const suggestions = await suggestProjectTechStack({ title, description });
  return successResponse(res, { data: { suggestions } });
});

export const projectRoadmapController = asyncHandler(async (req, res) => {
  const { title, description, techStack, projectId, forceRefresh } = req.body ?? {};
  if (!title) {
    throw new ValidationError("Title is required");
  }

  if (projectId && !forceRefresh) {
    const project = await Project.findById(projectId).select("roadmap");
    if (project?.roadmap?.length) {
      return successResponse(res, {
        data: { roadmap: project.roadmap, source: "cache" },
      });
    }
  }

  const roadmap = await generateProjectRoadmap({ title, description, techStack });

  if (projectId) {
    await Project.findByIdAndUpdate(projectId, { $set: { roadmap } });
  }

  return successResponse(res, { data: { roadmap, source: "ai" } });
});

export const githubSyncController = asyncHandler(async (req, res) => {
  let { githubUsername, githubToken } = req.body ?? {};
  const user = req.user;

  const username = githubUsername || user.githubProfile?.username;
  const token = githubToken || user.githubProfile?.token;

  if (!username) {
    throw new ValidationError("GitHub username is required (or connect it in profile)");
  }

  // Persist token if provided
  if (githubToken && githubToken !== user.githubProfile?.token) {
    user.githubProfile = {
      ...user.githubProfile,
      username,
      token: githubToken,
    };
    await user.save();
  }

  // Perform AI Sync
  const result = await syncGitHubData(username, token);

  // Auto-persist the synced data to the profile
  if (result.bio) user.about = result.bio;
  if (result.skills?.length) {
    // Merge or replace? Replacing is usually what's expected from a "Full Sync"
    user.skills = result.skills;
  }
  
  user.githubProfile.lastSyncedAt = new Date();
  await user.save();

  return successResponse(res, { 
    message: "Profile synced with GitHub successfully",
    data: { 
      bio: result.bio, 
      skills: result.skills,
      user 
    } 
  });
});

export const projectSuggestionsController = asyncHandler(async (req, res) => {
  const { title } = req.body ?? {};
  if (!title) {
    throw new ValidationError("Title is required");
  }

  const [description, techStack] = await Promise.all([
    generateProjectDescription({ title }),
    suggestProjectTechStack({ title }),
  ]);

  return successResponse(res, { data: { description, techStack } });
});
