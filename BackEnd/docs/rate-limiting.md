# Rate Limiting — Options, Pros & Cons

> Context: this backend is a Node/Express app deployed on Render (single web instance, `WEB_CONCURRENCY=1`), behind Render's reverse proxy. Current limiter: `express-rate-limit` (fixed window, in-memory, keyed by IP) on every request.

## 1. Algorithm (how the window/counter works)

### Fixed Window
Counter resets every N seconds.
- Pros: dead simple, O(1) memory, exact limits, cheap.
- Cons: burst at window boundary (100 req at 23:59:59 + 100 at 00:00:00), allows 2x the intended rate in a tiny span.

### Sliding Window (log or counter)
Requests count against a rolling window (e.g. last 60s), typically with per-second buckets.
- Pros: no boundary burst, accurate and smooth; the industry default for APIs.
- Cons: slightly more storage (per-second buckets), a bit more code.

### Token Bucket
Tokens refill at a fixed rate; each request consumes one.
- Pros: allows natural bursts up to bucket size while enforcing long-run average; extremely popular (Stripe, GitHub).
- Cons: must choose bucket size + refill rate; more config surface.

### Leaky Bucket
Requests enter a queue drained at fixed rate; excess drops.
- Pros: perfectly smooth output, great for downstream services.
- Cons: adds latency (queueing), bursts are never served fast — usually wrong for an API in front of an app.

## 2. Storage (where counters live)

### In-Memory (e.g. `express-rate-limit` default, `memorystore`, `rate-limiter-flexible` Memory)
- Pros: zero infra, sub-ms, perfect for one instance.
- Cons:
  - Lost on process restart (deploy = limits reset — usually fine).
  - **Not shared across instances** — 2 instances = 2x effective limit (or 1/2 each with a shared budget).
  - Leaks on high-cardinality keys if not cleaned (older libs).
- Verdict: **fine while you run one instance** — which is exactly what Render gives you today (`WEB_CONCURRENCY=1`).

### Redis (`rate-limiter-flexible` Redis, `express-rate-limit` + `rate-limit-redis`, Upstash)
- Pros: distributed, atomic, survives restarts, millisecond latency, supports sliding window/token bucket properly across instances; single source of truth.
- Cons: extra infra/cost (Redis Cloud/Upstash ~$0–30/mo), extra env/dependency, cache outage = must fail-open or fail-closed.
- Verdict: **the "right" answer the day you scale to 2+ instances or want persisted counters.**

### MongoDB (`Message`-style `updateOne({$inc})` or `mongoose-rate-limit`)
- Pros: no new infra (you already have Mongo).
- Cons: a DB write per request (latency + load), hard to clean up TTL docs, not atomic-by-design across shards, Mongo is your source of truth — you don't want request counters competing with app data. Generally the **worst of both worlds** vs Redis.

### Edge / Gateway (Cloudflare, AWS WAF, Render has none built-in)
- Pros: stops attacks before your origin; IP-based DDoS protection; free tier with Cloudflare.
- Cons: extra DNS/gateway setup; per-IP only (no user/plan awareness); can't do app-level limits like "free users: 10 AI calls/day".

## 3. Keying (who gets counted)

### By IP (`X-Forwarded-For` after `trust proxy`)
- Pros: works before auth, simple.
- Cons: NAT/corporate WiFi/mobile carriers group thousands behind one IP → innocent users get blocked; attackers rotate IPs for free. Without `trust proxy` it also breaks behind Render (your current bug).

### By user id (after JWT auth)
- Pros: exactly matches business rules (plan limits, free vs premium), no NAT false-positives.
- Cons: only protects authenticated endpoints; needs the auth middleware in the chain (order matters).

### Hybrid (standard practice)
- IP limiter globally (abuse/DDoS protection) **+** per-user limiter on expensive/plan-gated routes (AI, invites, chat). This is what most production Node APIs do.

## 4. Recommendation for this project

**Short term (now):** keep `express-rate-limit`, but fix it properly:
- `app.set("trust proxy", 1)` in production (already done) so IPs are real.
- Use `skip: () => config.isTest` and make the global limiter stricter on abuse (`max` tuned).
- **Add a per-user limiter** (keyed on `req.user._id` after JWT) for the expensive routes: `/ai/*`, `/invite/*`, `/chat/upload`, calls. Free/premium tiers map naturally here via `requireMinimumPlan`.
- Optionally switch the store from the default (MemoryStore) to `memorystore` or `rate-limiter-flexible`'s Memory store — they handle cleanup better. Still single-instance.

**Short term alternative (better, low effort):** switch to `rate-limiter-flexible` — token bucket per user (burst-friendly, smooth), drop-in for both global and per-route, and its Redis backend is the same API, so **zero code change when you scale**.

**When you scale (2+ web instances or persistent counters):** move to Redis (Upstash free tier) with `rate-limiter-flexible` Redis — atomic, shared across instances, survives restarts, sliding-window/token-bucket support.

**Do not:** add a MongoDB-based limiter (latency + load on your source of truth), and don't add Cloudflare unless you also want DDoS protection — it can't do per-user/plan limits anyway.

### Summary table

| Option | Cost to add | Accuracy | Survives restart | Multi-instance | Best for |
|---|---|---|---|---|---|
| express-rate-limit (in-memory, current) | none | fixed window, boundary burst | no | no | single instance, quick start |
| rate-limiter-flexible (Memory) | none | token bucket / sliding | no | no | single instance, burst-friendly |
| Redis (flexible / rate-limit-redis) | small ($0 tier) | sliding window / token bucket | yes | **yes** | scaling, production-grade |
| MongoDB counters | none (Mongo exists) | any | yes | weak | not recommended |
| Edge (Cloudflare) | DNS change | per-IP only | n/a | n/a | DDoS defense, not app limits |
