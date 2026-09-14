<p align="center">
  <h1 align="center">DevConnect - Developer Networking Platform</h1>
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

DevConnect is a developer-first social networking platform built with Express, MongoDB, React, Redux, Socket.io, and Tailwind CSS. It combines swipe-style profile discovery with connection requests, secure messaging, project collaboration, AI profile/project helpers, paid membership limits, and moderation tooling.

The `DevConnect` folder contains the backend application under `BackEnd/`. The frontend lives separately in `../DevConnect-FrontEnd`.

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

DevConnect includes a project workspace for finding collaborators:

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
DevConnect-main/
├── README.md
└── BackEnd/
    ├── package.json                            # Scripts and dependencies
    ├── package-lock.json
    ├── .gitignore
    └── src/
        ├── app.js                              # Express app configuration, security middleware, route mounting & error handling
        ├── server.js                           # Server bootstrap, MongoDB connection, plan seeding & Socket.io initialization
        ├── config/
        │   ├── database.js                     # MongoDB connection via Mongoose
        │   ├── env.js                          # Environment variable validation and defaults
        │   ├── features.js                     # Feature toggles and flags
        │   └── multer.js                       # Cloudinary Multer storage configuration
        ├── constants/
        │   └── user.constants.js               # Enums, roles, status constants
        ├── controllers/                        # Domain controllers
        │   ├── admin.controller.js             # User moderation, reports, and ban handling
        │   ├── ai.controller.js                # Mistral AI bio, icebreakers & project helpers
        │   ├── auth.controller.js              # Login, register, OTP verification, password reset
        │   ├── bookmark.controller.js          # Profile bookmarking CRUD
        │   ├── call.controller.js              # WebRTC call session initiation and STUN/TURN tokens
        │   ├── chat.controller.js              # Direct messaging and conversation history
        │   ├── chat-enhancement.controller.js  # Reactions, GIFs, audio voice notes, search
        │   ├── github.controller.js            # GitHub profile and repository synchronization
        │   ├── invite.controller.js            # Email invitation sending and referral tracking
        │   ├── notification.controller.js      # User notifications and unread counters
        │   ├── payment.controller.js           # Razorpay order generation and webhook verification
        │   ├── plan.controller.js              # Membership plans and tier limits
        │   ├── profile.controller.js           # Developer profile view, edit, and strength metrics
        │   ├── project.controller.js           # Collaboration projects, join requests, and threads
        │   ├── request.controller.js           # Connection requests (interested, ignored, accept, reject)
        │   ├── safety.controller.js            # User blocking, reporting, and moderation flags
        │   └── user.controller.js              # Feed discovery and search by skills/location
        ├── errors/                             # Standardized error hierarchy
        │   ├── AppError.js                     # Base application error class
        │   ├── index.js                        # Central error re-exports
        │   ├── NotFoundError.js                # 404 HTTP exception
        │   └── ValidationError.js             # 400 Bad request / schema validation exception
        ├── middlewares/                        # Express middleware pipeline
        │   ├── auth.js                         # JWT authentication and user session verification
        │   ├── error.middleware.js             # Global centralized error handler
        │   ├── inviteDailyLimit.js             # Daily email referral rate limiter
        │   ├── planLimits.js                   # Plan-gated feature quotas (AI, views, connections)
        │   ├── rateLimiter.js                  # Global and route-specific DDoS/brute-force rate limiting
        │   ├── requirePlan.js                  # Tier-based route access guard (Silver/Gold)
        │   ├── signupauth.js                   # Pre-registration verification guard
        │   └── validate.js                     # Zod request validation wrapper
        ├── models/                             # Mongoose schemas and indexes
        │   ├── bookmark.js                     # Saved profile records
        │   ├── callSession.js                  # WebRTC call logs and session durations
        │   ├── chat.js                         # Conversation metadata and participant links
        │   ├── connectionRequest.js            # Connection status (interested, ignored, accepted, rejected)
        │   ├── cronState.js                    # Cron job state persistence
        │   ├── invite.js                       # Referral tracking records
        │   ├── message.js                      # Chat messages, reactions, voice notes, read status
        │   ├── notification.js                 # Push/in-app alert records
        │   ├── otp.model.js                    # Cryptographic OTP storage with TTL expiry
        │   ├── payment.js                      # Razorpay order and transaction history
        │   ├── plan.js                         # Membership tier specifications and limits
        │   ├── profileView.js                  # Profile visitor logs
        │   ├── project.js                      # Collaboration projects, member roles, and join requests
        │   ├── report.js                       # User and message safety reports
        │   ├── session.js                      # Multi-device session tracking and token records
        │   ├── twoFactor.js                    # TOTP secrets and 2FA recovery state
        │   └── user.model.js                   # User profile, skills, GeoJSON location, password hash
        ├── repositories/                       # Database abstraction and data access layer
        │   ├── bookmark.repository.js
        │   ├── call.repository.js
        │   ├── chat.repository.js
        │   ├── connectionRequest.repository.js
        │   ├── invite.repository.js
        │   ├── notification.repository.js
        │   ├── otp.repository.js
        │   ├── payment.repository.js
        │   ├── plan.repository.js
        │   ├── profileView.repository.js
        │   ├── project.repository.js
        │   ├── report.repository.js
        │   └── user.repository.js
        ├── routes/                             # API route declarations
        │   ├── index.js                        # Aggregated router mounting all sub-routes
        │   ├── admin.routes.js                 # /admin/* endpoints
        │   ├── ai.routes.js                    # /ai/* endpoints
        │   ├── auth.routes.js                  # /auth/* endpoints
        │   ├── bookmark.routes.js              # /bookmark/* endpoints
        │   ├── call.routes.js                  # /call/* endpoints
        │   ├── chat.routes.js                  # /chat/* endpoints
        │   ├── chat-enhancement.routes.js      # /chat-enhancement/* endpoints
        │   ├── cron.routes.js                  # Scheduled task maintenance endpoints
        │   ├── github.routes.js                # /github/* endpoints
        │   ├── invite.routes.js                # /invite/* endpoints
        │   ├── notification.routes.js          # /notification/* endpoints
        │   ├── payment.routes.js               # /payment/* endpoints
        │   ├── plan.routes.js                  # /plan/* endpoints
        │   ├── profile.routes.js               # /profile/* endpoints
        │   ├── project.routes.js               # /project/* endpoints
        │   ├── request.routes.js               # /request/* endpoints
        │   ├── safety.routes.js                # /safety/* endpoints
        │   └── user.routes.js                  # /user/* endpoints
        ├── security/                           # Trust, safety & cryptographic services
        │   ├── moderation.service.js           # Automated content filtering and abuse detection
        │   ├── security.config.js              # Security headers, cookies, and CORS configuration
        │   ├── session.service.js              # Device session revocation and token cycling
        │   ├── totp.js                         # RFC 6238 TOTP generation and verification
        │   └── twoFactor.service.js            # Two-factor authentication lifecycle management
        ├── services/                           # Core business logic layer
        │   ├── admin.service.js
        │   ├── aiService.js
        │   ├── auth.service.js
        │   ├── bookmark.service.js
        │   ├── call.service.js
        │   ├── callManager.js
        │   ├── chat.service.js
        │   ├── chat-enhancement.service.js
        │   ├── github.service.js
        │   ├── invite.service.js
        │   ├── notification.service.js
        │   ├── otpService.js
        │   ├── payment.service.js
        │   ├── plan.service.js
        │   ├── profile.service.js
        │   ├── project.service.js
        │   ├── request.service.js
        │   ├── safety.service.js
        │   └── user.service.js
        ├── sockets/                            # WebSocket event handlers
        │   ├── call.socket.js                  # WebRTC peer signaling (offer, answer, ICE candidates)
        │   └── chat-enhancement.socket.js      # Typing indicators, live reactions, message delivery
        ├── utils/                              # Shared utilities and helpers
        │   ├── api-errors.js
        │   ├── async-handler.js
        │   ├── cloudinary.js
        │   ├── cronJob.js
        │   ├── emailTemplates/
        │   ├── generateOtp.js
        │   ├── location.js
        │   ├── logger.js
        │   ├── notify.js
        │   ├── planConfig.js
        │   ├── razorpay.js
        │   ├── response.js
        │   ├── sendEmail.js
        │   ├── sendOtp.js
        │   ├── socket.js
        │   ├── usage.js
        │   └── validation.js
        └── validations/                        # Zod schema definitions
            ├── admin.validation.js
            ├── auth.validation.js
            ├── bookmark.validation.js
            ├── call.validation.js
            ├── chat.validation.js
            ├── github.validation.js
            ├── invite.validation.js
            ├── notification.validation.js
            ├── payment.validation.js
            ├── plan.validation.js
            ├── profile.validation.js
            ├── project.validation.js
            ├── request.validation.js
            ├── safety.validation.js
            └── user.validation.js
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
cd DevConnect/BackEnd
npm install
```

### Configure Environment

Create a `.env` file in `DevConnect/BackEnd`.

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

From `DevConnect/BackEnd`:

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
