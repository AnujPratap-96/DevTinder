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
        `ROLE: You are an elite Technical Recruiter and Career Coach with 15 years of experience writing compelling, human-sounding developer bios.\n` +
        `TASK: Write a professional, concise 3-5 line bio for a developer based on their role, experience, and skills.\n` +
        `CONSTRAINTS: Never use buzzwords like 'passionate' or 'ninja'. Do not use bullet points. Always write in the first person ("I"). Keep it under 5 lines.\n` +
        `OUTPUT FORMAT: Return ONLY the raw bio text. No labels, quotes, or conversational filler.\n` +
        `ONE SHOT: \n` +
        `Input: Role: Backend Developer, Exp: 3, Skills: Node.js, MongoDB\n` +
        `Output: I am a backend developer with 3 years of experience building scalable applications using Node.js and MongoDB. I focus on delivering clean, efficient code and robust API architectures.\n` +
        `FALLBACK: If the provided data is insufficient, write a generic professional bio for a software developer focusing on continuous learning and problem solving.`
    },
    {
      role: "user",
      content:
        `Role: ${roleText}\n` +
        `Years of experience: ${exp}\n` +
        `Primary skills: ${skillsText}\n` +
        (interestsText ? `Interests: ${interestsText}\n` : "")
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
        `ROLE: You are an expert Technical Career Strategist. Your specialty is reading between the lines of a developer's bio to identify hidden strengths and suggest high-value skills they should officially add to their repertoire.\n` +
        `TASK: Perform a deep analysis of the developer profile and provide 8 targeted skill suggestions missing from their current listed skills.\n` +
        `CONSTRAINTS: Do NOT suggest anything already in 'Listed Skills'. Focus heavily on the content of the Bio (projects mentioned, tools hinted at, industries). Do not provide any conversational filler or explanations.\n` +
        `OUTPUT FORMAT: Return ONLY a valid JSON array of exactly 8 strings.\n` +
        `ONE SHOT:\n` +
        `Input: Current Role: Full Stack, Listed Skills: JavaScript, React, Bio: "I love building modern APIs and deploying them using container orchestration."\n` +
        `Output: ["Node.js", "Express", "Docker", "Kubernetes", "TypeScript", "AWS", "CI/CD", "GraphQL"]\n` +
        `FALLBACK: If the bio is too short to infer skills, suggest common high-demand technologies related to their role.`
    },
    {
      role: "user",
      content:
        `Current Role: ${roleText}\n` +
        `Listed Skills: ${skillsText}\n` +
        `User's Bio/Description: "${bioText}"`
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
        `ROLE: You are an expert networking and community strategist for developers, specializing in fostering meaningful professional relationships.\n` +
        `TASK: Write a 1-2 sentence specific, natural, and friendly opening message from one developer to another based on their tech overlap.\n` +
        `CONSTRAINTS: Never use generic lines like 'Hey, want to connect?'. Keep it human and genuine. Do not sound robotic. Never exceed 2 sentences.\n` +
        `OUTPUT FORMAT: Return ONLY the message text. No quotes, labels, or extra formatting.\n` +
        `ONE SHOT:\n` +
        `Input: Sender: Frontend Dev (React, Tailwind), Receiver (Alex): Backend Dev (Node, AWS)\n` +
        `Output: Hi Alex, I see you're working heavily with Node and AWS; I'd love to connect and learn more about how you handle backend scaling while I focus on the frontend!\n` +
        `FALLBACK: If the overlap is unclear, write a friendly message asking about their recent projects or favorite tools in their stack.`
    },
    {
      role: "user",
      content:
        `Sender: ${senderRole} who knows ${senderSkills}.\n` +
        `Receiver (${receiverName}): ${receiverRole} who knows ${receiverSkills}.`
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
        `ROLE: You are an AI Matchmaker for a developer networking platform, specializing in identifying professional synergies.\n` +
        `TASK: Analyse two developer profiles and explain why they are a strong match.\n` +
        `CONSTRAINTS: Be specific, insightful, and concise. Highlight shared skills, complementary roles, and compatible experience. Do not exceed 20 words per point. No conversational filler.\n` +
        `OUTPUT FORMAT: Return ONLY valid JSON: {"points": ["reason1", "reason2"]}. Exactly 2-4 bullet points.\n` +
        `ONE SHOT:\n` +
        `Input: Developer A: Frontend (React, 3 yrs), Developer B: Backend (Node, 4 yrs)\n` +
        `Output: {"points": ["Your React skills perfectly complement their Node.js backend expertise.", "You both have similar mid-level experience for smooth collaboration."]}\n` +
        `FALLBACK: If profiles lack detail, focus on general engineering collaboration and shared problem-solving goals.`
    },
    {
      role: "user",
      content:
        `Developer A:\nRole: ${roleA}\nExperience: ${expA} years\nSkills: ${skillsA}\n\n` +
        `Developer B:\nRole: ${roleB}\nExperience: ${expB} years\nSkills: ${skillsB}`
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
        `ROLE: You are an expert Product Manager specializing in developer tools and software products.\n` +
        `TASK: Write a compelling, concise project description based on the provided title and tech stack.\n` +
        `CONSTRAINTS: Keep it to exactly 2-4 sentences. Focus on the value proposition, target audience, and primary goals. Avoid generic corporate fluff and buzzwords. Do not include labels.\n` +
        `OUTPUT FORMAT: Return ONLY the description text.\n` +
        `ONE SHOT:\n` +
        `Input: Title: TaskFlow, Stack: React, Node, MongoDB\n` +
        `Output: TaskFlow is a high-performance project management tool designed to streamline team collaboration. Leveraging a robust Node.js backend and a responsive React interface, it enables real-time task tracking and seamless data synchronization.\n` +
        `FALLBACK: If the title is ambiguous, provide a generic description for a modern web application focusing on scalability and user experience.`
    },
    {
      role: "user",
      content:
        `Title: "${titleText}"\n` +
        `Current Tech Stack: ${techText}`
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
        `ROLE: You are a distinguished Technical Architect designing highly scalable, modern application stacks.\n` +
        `TASK: Suggest exactly 8 modern technologies or tools for a project based on its title and description.\n` +
        `CONSTRAINTS: Ensure the technologies are cohesive and work well together (e.g., React with Node.js). Include frontend, backend, database, and DevOps tools if applicable. Do not provide explanations.\n` +
        `OUTPUT FORMAT: Return ONLY a valid JSON array of strings.\n` +
        `ONE SHOT:\n` +
        `Input: Title: Real-time Chat App, Description: A scalable chat application with channels.\n` +
        `Output: ["React", "Node.js", "Socket.io", "Redis", "PostgreSQL", "Docker", "TailwindCSS", "AWS"]\n` +
        `FALLBACK: If the project details are too vague, suggest a standard modern MERN/PERN stack.`
    },
    {
      role: "user",
      content:
        `Title: ${titleText}\n` +
        `Description: ${descText}`
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
        `ROLE: You are an expert Technical Project Manager specializing in software development lifecycles.\n` +
        `TASK: Create a detailed 4-phase development roadmap based on the project title, description, and tech stack.\n` +
        `CONSTRAINTS: Each phase must have exactly 3-4 specific, actionable tasks. Do not include markdown formatting outside the JSON block.\n` +
        `OUTPUT FORMAT: Return ONLY a valid JSON object with a 'phases' array: {"phases": [{"title": "Phase 1: ...", "tasks": ["task1", "task2", "task3"]}]}.\n` +
        `ONE SHOT:\n` +
        `Input: Title: To-Do App, Stack: React, Firebase\n` +
        `Output: {"phases": [{"title": "Phase 1: Project Setup", "tasks": ["Initialize React app", "Set up Firebase project", "Configure Firebase Auth"]}, {"title": "Phase 2: Core Features", "tasks": ["Create task list component", "Implement add task form", "Add delete task functionality"]}, {"title": "Phase 3: Enhancements", "tasks": ["Add user authentication", "Implement task categories", "Add due dates"]}, {"title": "Phase 4: Deployment", "tasks": ["Write unit tests", "Optimize for production", "Deploy to Firebase Hosting"]}]}\n` +
        `FALLBACK: If the project details are too vague, generate a standard web application development roadmap from setup to deployment.`
    },
    {
      role: "user",
      content:
        `Title: ${titleText}\n` +
        `Description: ${descText}\n` +
        `Tech Stack: ${techText}`
    },
  ];

  const raw = await callMistral(messages, { temperature: 0.2, maxTokens: 800 });

  let jsonStr = raw.trim();
  
  // Strip markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    const lines = jsonStr.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].startsWith("```")) lines.pop();
    jsonStr = lines.join("\n").trim();
  }

  // Fallback to substring extraction if it still doesn't look like JSON
  if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");
    
    // Choose the outer wrapper (whichever starts earlier and ends later)
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      jsonStr = raw.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1) {
      jsonStr = raw.substring(firstBracket, lastBracket + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Handle both {"phases": [...]} and [...] formats
    const phasesArray = Array.isArray(parsed) ? parsed : parsed?.phases;
    
    if (!Array.isArray(phasesArray)) {
      throw new Error("AI roadmap missing phases array");
    }
    
    return phasesArray;
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
        `ROLE: You are an expert Career Coach and Technical Profiler for developers.\n` +
        `TASK: Analyze a user's GitHub repositories and generate a professional bio and a list of core skills.\n` +
        `CONSTRAINTS: Bio must be under 200 characters. Skills list must be exactly 8 highly relevant technologies. Do not include conversational filler.\n` +
        `OUTPUT FORMAT: Return ONLY a valid JSON object: {"bio": "...", "skills": ["...", "..."]}\n` +
        `ONE SHOT:\n` +
        `Input: Repos: [{"name": "react-dashboard", "lang": "JavaScript"}, {"name": "api-gateway", "lang": "Go"}]\n` +
        `Output: {"bio": "Full-stack developer building dynamic React interfaces and highly concurrent Go backend services.", "skills": ["JavaScript", "React", "Go", "API Design", "Microservices", "REST", "Git", "Backend Architecture"]}\n` +
        `FALLBACK: If the repo list is empty or lacks clear languages, return a generic bio about being an enthusiastic open-source contributor and an empty skills array.`
    },
    {
      role: "user",
      content: `Analyze these repos for ${githubUsername}:\n${JSON.stringify(repos)}`
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
        `ROLE: You are a specialized Technical Matchmaker designing engaging collaboration activities for developers.\n` +
        `TASK: Suggest a specific project or learning activity for two developers to work on together based on their tech stack and roles.\n` +
        `CONSTRAINTS: Find common ground or complementary skills. The title must be catchy, the description actionable, and the 'why' persuasive. Do not exceed 50 words per field.\n` +
        `OUTPUT FORMAT: Return ONLY a valid JSON object: {"title": "...", "description": "...", "why": "..."}\n` +
        `ONE SHOT:\n` +
        `Input: Developer A: Frontend (React), Developer B: Backend (Node.js)\n` +
        `Output: {"title": "Full-Stack Task Manager", "description": "Build a real-time task manager where Developer A builds the React UI and Developer B creates the Node.js API with WebSockets.", "why": "This perfectly bridges your frontend and backend skills, resulting in a complete, portfolio-ready application."}\n` +
        `FALLBACK: If skills are completely unrelated, suggest building a simple personal portfolio site together to share design and deployment knowledge.`
    },
    {
      role: "user",
      content:
        `Developer A: ${roleA} (${skillsA})\n` +
        `Developer B: ${roleB} (${skillsB})`
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
