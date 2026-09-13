<p align="center">
  <h1 align="center">DevTinder - Developer Networking Platform</h1>
  <p align="center">A full-stack MERN application where developers discover each other, match, chat securely, collaborate on projects, upgrade memberships, and manage trust and safety workflows.</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Razorpay-Payments-02042B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Mistral-AI-FF7000?style=for-the-badge" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Feature Set](#feature-set)
  - [Authentication & Sessions](#1-authentication--sessions)
  - [Developer Discovery](#2-developer-discovery)
  - [Connections & Matching](#3-connections--matching)
  - [Real-Time Chat](#4-real-time-chat)
  - [Voice & Video Calls](#5-voice--video-calls)
  - [AI Assistance](#6-ai-assistance)
  - [Projects & Collaboration](#7-projects--collaboration)
  - [Premium Plans & Payments](#8-premium-plans--payments)
  - [Profile, Views & Themes](#9-profile-views--themes)
  - [Invites, Bookmarks & Endorsements](#10-invites-bookmarks--endorsements)
  - [Trust, Safety & Admin](#11-trust-safety--admin)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture Decisions](#architecture-decisions)

---

## Overview

DevTinder is a developer-first social networking platform built with Express, MongoDB, React, Redux, Socket.io, and Tailwind CSS. It combines swipe-style profile discovery with connection requests, secure messaging, project collaboration, AI profile/project helpers, paid membership limits, and moderation tooling.

The `Devtinder` folder contains the backend application under `BackEnd/`. The frontend lives separately in `../DevTinder-FrontEnd`.

---

## Feature Set

### 1. Authentication & Sessions

Multi-step account and session flows:

| Flow | Description |
|---|---|
| Email OTP | Sends and verifies one-time passwords for signup and password reset |
| Signup | Registers developer profiles with validation and hashed passwords |
| Login | Issues JWT and refresh-token based sessions through secure cookies |
| OAuth Hooks | Supports Google/GitHub OAuth login endpoints |
| Refresh Token | Transparently renews authenticated sessions |
| Two-Factor Auth | TOTP setup, enable, disable, and 2FA login verification |
| Session Management | Lists active sessions and supports revoking individual devices |

---

### 2. Developer Discovery

The backend powers a Tinder-like feed of developer profiles:

- Cursor-paginated feed at `/feed` and `/user/feed`
- Search by name and skills through `/search`
- Location-aware discovery using GeoJSON coordinates and distance radius
- Profile fields for role, skills, experience, availability, social links, GitHub stats, and profile strength
- Text indexes over names and skills for faster lookup

---

### 3. Connections & Matching

Connection requests model the core matching workflow:

| Action | Result |
|---|---|
| Interested | Sends a request to another developer |
| Ignored | Removes the profile from the current feed |
| Accepted | Creates a mutual connection and chat relationship |
| Rejected | Declines an incoming request |

When a match is created, the server emits real-time `match:found` events so both users can see the celebration immediately.

---

### 4. Real-Time Chat

Socket.io powers one-to-one messaging between matched developers:

- Chat rooms keyed by match/conversation id
- Client-generated message ids for duplicate protection
- Message delivery and seen receipts
- Typing indicators
- Unread-count updates
- Message deletion
- Pinned messages
- Emoji reactions
- Image, file, audio, and voice-note message types
- Optional client-side end-to-end encryption using stored public keys
- Offline-friendly client support for cached messages and queued outgoing messages

---

### 5. Voice & Video Calls

The call module adds real-time WebRTC signaling:

- Voice and video call invitations over Socket.io
- Call lifecycle events: invite, accept, decline, busy, unavailable, missed, end
- WebRTC offer, answer, and ICE candidate relay
- Call history, missed calls, active-call lookup, and missed-call acknowledgment
- STUN/TURN credential endpoint with configurable fallback TURN servers
- Call session persistence with duration and end reason tracking

---

### 6. AI Assistance

AI endpoints use the Mistral API to help developers improve profiles and collaboration:

- Generate profile bios
- Suggest skills from profile context
- Generate icebreakers for chats
- Explain why two developers are a strong match
- Suggest collaboration activity
- Generate project descriptions, tech stacks, roadmaps, and project ideas
- Sync and summarize GitHub profile data for richer recommendations

AI usage is plan-gated through membership limits.

---

### 7. Projects & Collaboration

DevTinder includes a project workspace for finding collaborators:

- Create, update, delete, and explore projects
- Project tech stack, status, members, owners, and admins
- Join requests with accept/reject flows
- Member removal for owners/admins
- Project-specific message thread
- AI-assisted project details and roadmap generation

---

### 8. Premium Plans & Payments

Memberships are managed through seeded and admin-editable plans:

| Plan | Purpose |
|---|---|
| Free | Browse developers, limited connection requests, invites, bookmarks, endorsements |
| Silver | Chat, AI usage, profile views, project creation, voice calls, blue badge |
| Gold | Higher limits, video calls, premium themes, unlimited profile views and AI usage |

Payment support includes:

- Razorpay order creation
- Razorpay webhook endpoint at `/payment/webhook`
- Premium verification endpoint
- Plan limits for requests, AI calls, invites, project creation, chat, calls, profile views, badges, and themes

---

### 9. Profile, Views & Themes

Profile endpoints support:

- View and update profile details
- Update password, profile photo, social links, location, and theme
- Profile strength calculation with missing-field tracking
- Profile-view recording and listing
- Privacy option to hide visits from other users' profile-view lists
- Premium themes such as glassmorphism, matrix, neon, cyberpunk, minimal, and hacker

---

### 10. Invites, Bookmarks & Endorsements

Growth and relationship features:

- Invite friends by email
- Invite stats and invite history
- Bookmark developer profiles
- Remove saved profiles
- Endorse connected users for specific skills
- Public-key save/fetch endpoints for encrypted chat

---

### 11. Trust, Safety & Admin

The server includes safety and admin operations:

- Block users
- Report users
- Flag and review messages
- Admin-only user management
- Admin report queue
- Banned-user listing
- Ban/unban flows
- Plan creation, update, deletion, and activation controls
- Helmet, CORS, Mongo sanitization, cookie parsing, global rate limiting, and centralized error handling

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js with ES modules |
| API Framework | Express 4 |
| Database | MongoDB + Mongoose 8 |
| Authentication | JWT, refresh tokens, bcrypt, cookies, Google/GitHub OAuth hooks |
| Validation | Zod, validator |
| Real-Time | Socket.io |
| Calls | WebRTC signaling, STUN/TURN config |
| Payments | Razorpay |
| Email | Brevo SDK, Nodemailer, HTML templates |
| Media Storage | Cloudinary, Multer |
| AI | Mistral API |
| Security | Helmet, express-mongo-sanitize, rate-limiter-flexible |
| Scheduling | node-cron |
| Frontend | React 18, Redux Toolkit, Vite, Tailwind CSS, DaisyUI |

---

## Project Structure

```text
Devtinder/
|-- README.md
`-- BackEnd/
    |-- package.json
    `-- src/
        |-- app.js                         # Express app, middleware, health route, error handling
        |-- server.js                      # DB connection, plan seeding, Socket.io startup
        |-- config/                        # env, database, multer, feature flags
        |-- controllers/                   # Request handlers by feature
        |-- routes/                        # Express route modules
        |-- services/                      # Business logic and integrations
        |-- repositories/                  # Mongoose query helpers
        |-- models/                        # User, chat, message, plan, project, payment, reports, calls
        |-- middlewares/                   # Auth, validation, plan limits, rate limits, errors
        |-- sockets/                       # Call and chat-enhancement socket handlers
        |-- security/                      # 2FA, sessions, moderation
        |-- validations/                   # Zod validation schemas
        `-- utils/                         # Email, Cloudinary, Razorpay, socket, logging, responses
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB connection string
- Razorpay account for paid plans
- Cloudinary account for media uploads
- Brevo or SMTP configuration for email OTP/invites
- Mistral API key for AI features

### Install Dependencies

```bash
cd Devtinder/BackEnd
npm install
```

### Configure Environment

Create a `.env` file in `Devtinder/BackEnd`.

```bash
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### Start Backend

```bash
npm run dev
```

The API runs on `http://localhost:3000` by default. Health check: `GET /health`.

---

## Environment Variables

| Variable | Example | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | Express and Socket.io port |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB connection string |
| `CORS_ORIGINS` | `http://localhost:5173,https://example.com` | Additional allowed frontend origins |
| `JWT_SECRET` | `change-me` | Access token signing secret |
| `JWT_EXPIRES_IN` | `8h` | Access token lifetime |
| `JWT_REFRESH_SECRET` | `change-me-too` | Refresh token signing secret |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `SIGNUP_JWT_EXPIRES_IN` | `1h` | Temporary signup token lifetime |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google OAuth client id |
| `GITHUB_CLIENT_ID` | `...` | GitHub OAuth client id |
| `GITHUB_CLIENT_SECRET` | `...` | GitHub OAuth client secret |
| `APP_URL` | `http://localhost:3000` | Backend app URL used by GitHub integration |
| `FRONTEND_URL` | `http://localhost:5173` | URL used in email links |
| `BREVO_API_KEY` | `xkeysib-...` | Transactional email provider key |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay checkout key |
| `RAZORPAY_KEY_SECRET` | `...` | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | `...` | Webhook signature secret |
| `CLOUDINARY_CLOUD_NAME` | `cloud-name` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `...` | Cloudinary API key |
| `CLOUDINARY_API_SECRET_KEY` | `...` | Cloudinary API secret |
| `MISTRAL_API_KEY` | `...` | Mistral AI API key |
| `STUN_URLS` | `stun:stun.l.google.com:19302` | Comma-separated STUN servers |
| `TURN_URLS` | `turn:example.com:3478` | Comma-separated TURN servers |
| `TURN_SECRET` | `...` | TURN credential secret |
| `TURN_TTL_SEC` | `600` | TURN credential lifetime |
| `TURN_FALLBACK` | `true` | Enables built-in fallback TURN list unless set to `false` |
| `CALL_TIMEOUT_MS` | `10000` | Ring timeout |
| `CALL_CONNECT_TIMEOUT_MS` | `10000` | Call connection timeout |
| `CALL_ICE_RESTART_MS` | `5000` | ICE restart timing |
| `REQUEST_JSON_LIMIT` | `1mb` | JSON body limit |

---

## Available Scripts

From `Devtinder/BackEnd`:

| Command | Description |
|---|---|
| `npm run dev` | Start the backend with Nodemon |
| `npm start` | Start the backend with Node |

From the project root:

| Command | Description |
|---|---|
| `npm run dev:backend` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev` | Start backend and frontend together |
| `npm run install:all` | Install backend and frontend dependencies |

---

## Architecture Decisions

**Layered backend** - routes, controllers, services, repositories, models, and validations are split by responsibility so API behavior stays testable and easier to extend.

**Plan-gated capabilities** - chat, AI calls, project creation, calls, profile views, themes, invites, and request volume are controlled through database-backed plans seeded at startup.

**Socket-first realtime UX** - online status, matches, chat messages, receipts, typing, notifications, and calls are delivered through a single Socket.io server attached to the HTTP server.

**Client-side encryption support** - users can publish public keys, while message payloads can stay encrypted before reaching the server.

**Operational safety** - global rate limiting, request validation, Mongo sanitization, Helmet headers, centralized error conversion, and compact JSON 404 responses are applied at the app boundary.
