const express = require("express");
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");

const githubRouter = express.Router();

const fetchGithubProfile = async (accessToken) => {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "DevTinder-App",
  };

  const [profileRes, reposRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/repos?per_page=100&sort=updated", { headers }),
  ]);

  if (!profileRes.ok) {
    throw new Error("Failed to fetch GitHub profile");
  }
  if (!reposRes.ok) {
    throw new Error("Failed to fetch GitHub repositories");
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

githubRouter.get("/github/profile", userAuth, async (req, res) => {
  const user = req.user;
  return res.status(200).json({ githubProfile: user.githubProfile ?? null });
});

githubRouter.post("/github/sync", userAuth, async (req, res) => {
  const { accessToken } = req.body ?? {};
  if (!accessToken) {
    return res.status(400).json({ message: "accessToken is required" });
  }

  try {
    const { profile, repos, stats } = await fetchGithubProfile(accessToken);

    const sanitizedRepos = repos.map((repo) => ({
      name: repo.name,
      htmlUrl: repo.html_url,
      description: repo.description,
      stargazersCount: repo.stargazers_count,
      language: repo.language,
      updatedAt: repo.updated_at,
    }));

    const user = await User.findById(req.user._id);
    user.githubProfile = {
      username: profile.login,
      avatarUrl: profile.avatar_url,
      repos: sanitizedRepos.slice(0, 20),
      stats,
      lastSyncedAt: new Date(),
    };

    const providerIndex = user.oauthProviders.findIndex(
      (provider) => provider.provider === "github"
    );
    if (providerIndex === -1) {
      user.oauthProviders.push({ provider: "github", providerId: profile.id });
    } else {
      user.oauthProviders[providerIndex].providerId = profile.id;
    }

    user.calculateProfileStrength();
    await user.save();

    res.status(200).json({ githubProfile: user.githubProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message ?? "Failed to sync GitHub profile" });
  }
});

module.exports = githubRouter;
