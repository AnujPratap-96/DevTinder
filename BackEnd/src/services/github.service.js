import User from "../models/user.model.js";
import { ValidationError, AppError } from "../errors/index.js";

const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_REPO_URL = "https://api.github.com/user/repos?per_page=100&sort=updated";

const fetchGithubProfile = async (accessToken) => {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "DevTinder-App",
  };

  const [profileRes, reposRes] = await Promise.all([
    fetch(GITHUB_USER_URL, { headers }),
    fetch(GITHUB_REPO_URL, { headers }),
  ]);

  if (!profileRes.ok) {
    throw new AppError({ message: "Failed to fetch GitHub profile", statusCode: profileRes.status });
  }
  if (!reposRes.ok) {
    throw new AppError({ message: "Failed to fetch GitHub repositories", statusCode: reposRes.status });
  }

  const profile = await profileRes.json();
  const repos = await reposRes.json();

  const languageStats = new Map();
  let totalStars = 0;

  repos.forEach((repo) => {
    if (repo.language) {
      languageStats.set(repo.language, (languageStats.get(repo.language) ?? 0) + 1);
    }
    totalStars += repo.stargazers_count ?? 0;
  });

  const topLanguages = [...languageStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language]) => language);

  return {
    profile,
    repos,
    stats: {
      totalStars,
      topLanguages,
      followers: profile.followers,
    },
  };
};

export const getGithubProfile = (user) => user.githubProfile ?? null;

export const syncGithubProfile = async ({ userId, accessToken }) => {
  if (!accessToken) {
    throw new ValidationError("accessToken is required");
  }

  const { profile, repos, stats } = await fetchGithubProfile(accessToken);

  const sanitizedRepos = repos.map((repo) => ({
    name: repo.name,
    htmlUrl: repo.html_url,
    description: repo.description,
    stargazersCount: repo.stargazers_count,
    language: repo.language,
    updatedAt: repo.updated_at,
  }));

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }

  user.githubProfile = {
    username: profile.login,
    avatarUrl: profile.avatar_url,
    repos: sanitizedRepos.slice(0, 20),
    stats,
    lastSyncedAt: new Date(),
  };

  const providerIndex = user.oauthProviders.findIndex((provider) => provider.provider === "github");
  if (providerIndex === -1) {
    user.oauthProviders.push({ provider: "github", providerId: profile.id });
  } else {
    user.oauthProviders[providerIndex].providerId = profile.id;
  }

  user.calculateProfileStrength();
  await user.save();

  return user.githubProfile;
};

export default {
  getGithubProfile,
  syncGithubProfile,
};
