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
import { ValidationError } from "../errors/index.js";
import { findUserById } from "../repositories/user.repository.js";
import { findProjectById, saveProject } from "../repositories/project.repository.js";

export const collaborationActivityController = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body ?? {};
  if (!targetUserId) {
    throw new ValidationError("targetUserId is required");
  }

  const targetUser = await findUserById(targetUserId).select("firstName skills role").lean();
  if (!targetUser) {
    throw new ValidationError("Target user not found");
  }

  const result = await suggestCollaborationActivity({ userA: req.user, userB: targetUser });
  return successResponse(res, { message: "Collaboration suggestions ready", data: result });
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
  return successResponse(res, { message: "Bio generated", data: bio });
});

export const suggestSkillsController = asyncHandler(async (req, res) => {
  const { currentSkills, role, about } = req.body ?? {};
  const payload = {
    currentSkills: currentSkills ?? req.user.skills,
    role: role ?? req.user.role,
    about: about ?? req.user.about,
  };

  const suggestions = await suggestSkills(payload);
  return successResponse(res, { message: "Skill suggestions ready", data: suggestions });
});

export const generateIcebreakerController = asyncHandler(async (req, res) => {
  const { receiverId } = req.body ?? {};
  if (!receiverId) {
    throw new ValidationError("receiverId is required");
  }

  const receiver = await findUserById(receiverId)
    .select("firstName skills role experienceYears")
    .lean();

  if (!receiver) {
    throw new ValidationError("Receiver not found");
  }

  const message = await generateIcebreaker({ sender: req.user, receiver });
  return successResponse(res, { message: "Icebreaker generated", data: message });
});

export const explainMatchController = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body ?? {};
  if (!targetUserId) {
    throw new ValidationError("targetUserId is required");
  }

  const targetUser = await findUserById(targetUserId)
    .select("firstName skills role experienceYears")
    .lean();

  if (!targetUser) {
    throw new ValidationError("Target user not found");
  }

  const points = await explainMatch({ userA: req.user, userB: targetUser });
  return successResponse(res, { message: "Match explanation ready", data: points });
});

export const projectDescriptionController = asyncHandler(async (req, res) => {
  const { title, techStack } = req.body ?? {};
  if (!title) {
    throw new ValidationError("title is required to generate a description.");
  }
  const description = await generateProjectDescription({ title, techStack });
  return successResponse(res, { message: "Project description generated", data: description });
});

export const projectTechStackController = asyncHandler(async (req, res) => {
  const { title, description } = req.body ?? {};
  if (!title && !description) {
    throw new ValidationError("Provide either title or description to suggest a tech stack.");
  }
  const suggestions = await suggestProjectTechStack({ title, description });
  return successResponse(res, { message: "Tech stack suggestions ready", data: suggestions });
});

export const projectRoadmapController = asyncHandler(async (req, res) => {
  const { title, description, techStack, projectId, forceRefresh } = req.body ?? {};
  if (!title) {
    throw new ValidationError("Title is required");
  }

  if (projectId && !forceRefresh) {
    const project = await findProjectById(projectId).select("roadmap");
    if (project?.roadmap?.length) {
      return successResponse(res, {
        message: "Roadmap loaded from cache",
        data: { roadmap: project.roadmap, source: "cache" },
      });
    }
  }

  const roadmap = await generateProjectRoadmap({ title, description, techStack });

  if (projectId) {
    const project = await findProjectById(projectId);
    if (project) {
      project.roadmap = roadmap;
      await saveProject(project);
    }
  }

  return successResponse(res, { message: "Roadmap generated", data: { roadmap, source: "ai" } });
});

export const githubSyncController = asyncHandler(async (req, res) => {
  let { githubUsername, githubToken } = req.body ?? {};
  const user = req.user;

  const username = githubUsername || user.githubProfile?.username;
  const token = githubToken || user.githubProfile?.token;

  if (!username) {
    throw new ValidationError("GitHub username is required (or connect it in profile)");
  }

  if (githubToken && githubToken !== user.githubProfile?.token) {
    user.githubProfile = {
      ...user.githubProfile,
      username,
      token: githubToken,
    };
    await user.save();
  }

  const result = await syncGitHubData(username, token);

  if (result.bio) user.about = result.bio;
  if (result.skills?.length) {
    user.skills = result.skills;
  }

  user.githubProfile.lastSyncedAt = new Date();
  await user.save();

  return successResponse(res, {
    message: "Profile synced with GitHub successfully",
    data: result,
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

  return successResponse(res, { message: "Project suggestions ready", data: { description, techStack } });
});
