/**
 * aiService.js
 * Centralised Mistral AI integration.  All prompt-engineering and API calls
 * live here so routes / controllers stay clean and testable.
 */

import axios from "axios";
import config from "../config/env.js";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-small-latest";

// ─────────────────────────────────────────────────────────────
// Helper: call Mistral with a timeout
// ─────────────────────────────────────────────────────────────
const callMistral = async (messages, { temperature = 0.7, maxTokens = 400 } = {}) => {
  const apiKey = config.ai.mistralApiKey;

  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured in ENV");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15 s timeout

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mistral API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("Empty response from AI");
    return content;
  } finally {
    clearTimeout(timeout);
  }
};

// ─────────────────────────────────────────────────────────────
// Helper: sanitise string inputs
// ─────────────────────────────────────────────────────────────
const sanitise = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[<>]/g, "") // strip potential HTML
    .slice(0, 500);

const sanitiseArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((s) => sanitise(s))
    .filter(Boolean)
    .slice(0, 30);

// ─────────────────────────────────────────────────────────────
// 1. AI Profile Bio Generator
// ─────────────────────────────────────────────────────────────
const generateBio = async ({ skills, experienceYears, role, interests }) => {
  const skillsText = sanitiseArray(skills).join(", ") || "various technologies";
  const exp = sanitise(String(experienceYears ?? 0));
  const roleText = sanitise(role) || "software developer";
  const interestsText = sanitise(interests) || "";

  const messages = [
    {
      role: "system",
      content:
        "You are a senior tech recruiter with 15 years of experience writing compelling, human-sounding developer bios for portfolios and professional platforms. " +
        "Write concise bios (3–5 lines), avoid buzzwords like 'passionate' or 'ninja', " +
        "never use bullet points, and always write in the first person.",
    },
    {
      role: "user",
      content:
        `Generate a professional and impressive developer bio for someone with the following profile:\n` +
        `- Role: ${roleText}\n` +
        `- Years of experience: ${exp}\n` +
        `- Primary skills: ${skillsText}\n` +
        (interestsText ? `- Interests: ${interestsText}\n` : "") +
        `\nReturn ONLY the bio text, no labels, no quotes, no extra formatting.`,
    },
  ];

  const bio = await callMistral(messages, { temperature: 0.8, maxTokens: 200 });
  return bio;
};

// ─────────────────────────────────────────────────────────────
// 2. AI Skill Suggestions
// ─────────────────────────────────────────────────────────────
const suggestSkills = async ({ currentSkills, role, about }) => {
  const skillsText = sanitiseArray(currentSkills).join(", ") || "general programming";
  const roleText = sanitise(role) || "software developer";
  const bioText = sanitise(about) || "";

  const messages = [
    {
      role: "system",
      content:
        "You are an expert technical career strategist. Your specialty is reading between the lines of a developer's bio to identify hidden strengths and suggest high-value skills they should officially add to their repertoire. " +
        "You always return a raw JSON array of strings and nothing else.",
    },
    {
      role: "user",
      content:
        `I need you to perform a deep analysis of this developer profile and provide 8 targeted skill suggestions.\n\n` +
        `BACKGROUND DATA:\n` +
        `- Current Role: ${roleText}\n` +
        `- Listed Skills: ${skillsText}\n` +
        `- User's Bio/Description: "${bioText}"\n\n` +
        `TASK:\n` +
        `1. ANALYZE the Bio/Description. Look for projects mentioned, tools hinted at, or industries they work in (e.g., Fintech, AI, E-commerce).\n` +
        `2. IDENTIFY skills that are mentioned or heavily implied in the bio but are MISSING from the 'Listed Skills' above.\n` +
        `3. SUGGEST supplementary skills that would make this specific developer more competitive based ON THEIR BIO CONTENT.\n\n` +
        `CRITICAL RULES:\n` +
        `- Do NOT suggest anything already in 'Listed Skills'.\n` +
        `- Focus heavily on the content of the Bio.\n` +
        `- Return ONLY a JSON array of strings, e.g. ["TypeScript","Docker",...]\n` +
        `- No markdown, no conversational filler.`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.5, maxTokens: 200 });

  // Robustly extract JSON array from the response
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("AI returned malformed skill list");

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("AI skill list is not an array");

  // Deduplicate against existing skills (case-insensitive)
  const existing = new Set(sanitiseArray(currentSkills).map((s) => s.toLowerCase()));
  const suggestions = parsed
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0 && !existing.has(s.toLowerCase()))
    .slice(0, 10);

  return suggestions;
};

// ─────────────────────────────────────────────────────────────
// 3. AI Chat Icebreaker
// ─────────────────────────────────────────────────────────────
const generateIcebreaker = async ({ sender, receiver }) => {
  const senderSkills = sanitiseArray(sender?.skills).join(", ") || "various tech";
  const receiverSkills = sanitiseArray(receiver?.skills).join(", ") || "various tech";
  const senderRole = sanitise(sender?.role) || "developer";
  const receiverRole = sanitise(receiver?.role) || "developer";
  const receiverName = sanitise(receiver?.firstName) || "there";

  const messages = [
    {
      role: "system",
      content:
        "You are helping developers start meaningful conversations with each other on a professional networking platform. " +
        "Write short, natural, friendly opening messages that feel human — not robotic or cringey. " +
        "Never use generic lines like 'Hey, want to connect?' or 'Hi there!'. Always make it specific and personal.",
    },
    {
      role: "user",
      content:
        `Write a 1–2 sentence opening message from one developer to another.\n` +
        `Sender: ${senderRole} who knows ${senderSkills}.\n` +
        `Receiver (${receiverName}): ${receiverRole} who knows ${receiverSkills}.\n` +
        `\nMake it genuine, specific to their tech overlap, and start the conversation naturally.\n` +
        `Return ONLY the message text, no quotes, no labels.`,
    },
  ];

  const message = await callMistral(messages, { temperature: 0.9, maxTokens: 120 });
  return message;
};

// ─────────────────────────────────────────────────────────────
// 4. AI Match Explanation
// ─────────────────────────────────────────────────────────────
const explainMatch = async ({ userA, userB }) => {
  const skillsA = sanitiseArray(userA?.skills).join(", ") || "various tech";
  const skillsB = sanitiseArray(userB?.skills).join(", ") || "various tech";
  const roleA = sanitise(userA?.role) || "developer";
  const roleB = sanitise(userB?.role) || "developer";
  const expA = sanitise(String(userA?.experienceYears ?? 0));
  const expB = sanitise(String(userB?.experienceYears ?? 0));

  const messages = [
    {
      role: "system",
      content:
        "You are an AI matching system for a developer networking platform. " +
        "Analyse two developer profiles and explain why they are a strong match. " +
        "Be specific, insightful, and concise. Always return a JSON object with a 'points' array of 2–4 strings.",
    },
    {
      role: "user",
      content:
        `Explain why these two developers are a good match:\n\n` +
        `Developer A:\n- Role: ${roleA}\n- Experience: ${expA} years\n- Skills: ${skillsA}\n\n` +
        `Developer B:\n- Role: ${roleB}\n- Experience: ${expB} years\n- Skills: ${skillsB}\n\n` +
        `Rules:\n` +
        `- Highlight shared skills, complementary roles, and compatible experience\n` +
        `- Return ONLY valid JSON: {"points": ["reason1", "reason2", ...]}\n` +
        `- 2–4 bullet points, each under 20 words\n` +
        `- No markdown, no extra text outside JSON`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.6, maxTokens: 250 });

  // Extract JSON robustly
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("AI returned malformed match explanation");

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed?.points)) throw new Error("AI match explanation missing 'points' array");

  return parsed.points.slice(0, 4);
};

// ─────────────────────────────────────────────────────────────
// 5. AI Project Description Generator
// ─────────────────────────────────────────────────────────────
const generateProjectDescription = async ({ title, techStack }) => {
  const titleText = sanitise(title) || "New Tech Project";
  const techText = sanitiseArray(techStack).join(", ") || "various technologies";

  const messages = [
    {
      role: "system",
      content:
        "You are an expert product manager. Your task is to write a compelling, concise project description (2-4 sentences). " +
        "Focus on the value proposition and goals. Avoid generic corporate fluff.",
    },
    {
      role: "user",
      content:
        `Generate a project description for a project titled "${titleText}".\n` +
        `Current Tech Stack: ${techText}\n\n` +
        `Return ONLY the description text, no labels, no quotes.`,
    },
  ];

  
  const description = await callMistral(messages, { temperature: 0.8, maxTokens: 250 });
  return description;
};

// ─────────────────────────────────────────────────────────────
// 6. AI Project Tech Stack Suggestions
// ─────────────────────────────────────────────────────────────
const suggestProjectTechStack = async ({ title, description }) => {
  const titleText = sanitise(title) || "New Tech Project";
  const descText = sanitise(description) || "";

  const messages = [
    {
      role: "system",
      content:
        "You are a technical architect. Based on a project title and description, suggest a modern, cohesive tech stack. " +
        "You always return a raw JSON array of strings and nothing else.",
    },
    {
      role: "user",
      content:
        `Suggest 8 modern technologies/tools for a project with this info:\n` +
        `Title: ${titleText}\n` +
        `Description: ${descText}\n\n` +
        `TASK:\n` +
        `1. Provide 8 relevant technologies (languages, frameworks, databases, etc.)\n` +
        `2. Ensure they work well together (e.g., if you suggest React, suggest Node.js).\n` +
        `3. Return ONLY a JSON array of strings, e.g. ["React","Node.js",...]\n` +
        `- No markdown, no extra text.`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.6, maxTokens: 200 });

  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("AI returned malformed tech stack list");

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("AI tech stack list is not an array");

  return parsed.slice(0, 10);
};

// ─────────────────────────────────────────────────────────────
// 7. AI Project Roadmap Generator
// ─────────────────────────────────────────────────────────────
const generateProjectRoadmap = async ({ title, description, techStack }) => {
  const titleText = sanitise(title) || "New Tech Project";
  const descText = sanitise(description) || "";
  const techText = sanitiseArray(techStack).join(", ") || "various tech";

  const messages = [
    {
      role: "system",
      content:
        "You are an expert technical project manager. Create a detailed 4-phase development roadmap. " +
        "Each phase should have a title and 3-4 specific tasks. " +
        "Return ONLY a JSON object with a 'phases' array. No markdown.",
    },
    {
      role: "user",
      content:
        `Generate a roadmap for:\n` +
        `Title: ${titleText}\n` +
        `Description: ${descText}\n` +
        `Tech Stack: ${techText}\n\n` +
        `Return valid JSON only:\n` +
        `{"phases": [{"title": "Phase 1: ...", "tasks": ["task1", "task2", "task3"]}]}`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.2, maxTokens: 800 });

  let jsonStr = raw;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = raw.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed?.phases)) throw new Error("AI roadmap missing 'phases' array");
    return parsed.phases;
  } catch (err) {
    console.error("AI Roadmap JSON error:", err, "Raw response:", raw);
    throw new Error("AI returned malformed roadmap data. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────
// 8. GitHub Bio Sync
// ─────────────────────────────────────────────────────────────
const syncGitHubData = async (githubUsername, githubToken = null) => {
  if (!githubUsername) throw new Error("GitHub username is required");

  // Fetch repositories from GitHub API (Authenticated if token provided)
  const headers = {};
  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  const reposResponse = await axios.get(
    `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=15`,
    { headers }
  );
  const repos = reposResponse.data.map((r) => ({
    name: r.name,
    lang: r.language,
    desc: r.description,
  }));

  const messages = [
    {
      role: "system",
      content:
        "You are an expert career coach for developers. Analyze GitHub repositories and generate: " +
        "1. A professional developer bio (max 200 chars). " +
        "2. A list of exactly 8 core skills. " +
        "Return ONLY a JSON object: { 'bio': '...', 'skills': ['...', '...'] }. No markdown.",
    },
    {
      role: "user",
      content: `Analyze these repos for ${githubUsername}:\n${JSON.stringify(repos)}`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.5 });
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("AI returned malformed GitHub sync JSON");

  return JSON.parse(match[0]);
};

// ─────────────────────────────────────────────────────────────
// 9. AI Collaboration Suggestion (Coding Date)
// ─────────────────────────────────────────────────────────────
const suggestCollaborationActivity = async ({ userA, userB }) => {
  const skillsA = sanitiseArray(userA?.skills).join(", ") || "various tech";
  const skillsB = sanitiseArray(userB?.skills).join(", ") || "various tech";
  const roleA = sanitise(userA?.role) || "developer";
  const roleB = sanitise(userB?.role) || "developer";

  const messages = [
    {
      role: "system",
      content:
        "You are a specialized matchmaker for developers. Suggest a specific project or learning activity for two developers to work on together. " +
        "Find common ground or complementary skills. " +
        "Return ONLY a JSON object: { 'title': 'Project Name', 'description': '...', 'why': '...' }. No markdown.",
    },
    {
      role: "user",
      content:
        `Developer A: ${roleA} (${skillsA})\n` +
        `Developer B: ${roleB} (${skillsB})\n\n` +
        `Suggest a collaborative activity. Return valid JSON only.`,
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.8, maxTokens: 300 });
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error("AI returned malformed collaboration suggestion");

  return JSON.parse(match[0]);
};

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
export {
  generateBio,
  suggestSkills,
  generateIcebreaker,
  explainMatch,
  generateProjectDescription,
  suggestProjectTechStack,
  generateProjectRoadmap,
  syncGitHubData,
  suggestCollaborationActivity,
};

export default {
  generateBio,
  suggestSkills,
  generateIcebreaker,
  explainMatch,
  generateProjectDescription,
  suggestProjectTechStack,
  generateProjectRoadmap,
  syncGitHubData,
  suggestCollaborationActivity,
};
