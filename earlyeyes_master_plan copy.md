# ERP Platform — Architecture Blueprint
### Phase 1 Build-Ready | Phase 2 Migration Annotated

> **How to read this document**: Every section covers Phase 1 implementation in full detail. Phase 2 migration notes are marked with `> 🔀 PHASE 2 MIGRATION` blocks — these are deferred actions, not current work.

---

## Table of Contents

1. [Executive Summary](#0-executive-summary)
2. [Architecture Philosophy](#1-architecture-philosophy)
3. [Final Tech Stack](#2-final-tech-stack)
4. [Infrastructure & Cost](#3-infrastructure--cost)
5. [Role System](#4-role-system)
6. [Module 1 — Authentication & RBAC](#5-module-1--authentication--rbac)
7. [Module 2 — Messenger & Channels](#6-module-2--messenger--channels)
8. [Module 3 — Calendar & Booking](#7-module-3--calendar--booking)
9. [Module 4 — Kanban Board](#8-module-4--kanban-board)
10. [Module 5 — Pipeline](#9-module-5--pipeline)
11. [Module 6 — Projects & Tasks](#10-module-6--projects--tasks)
12. [Module 7 — Ticket System](#11-module-7--ticket-system)
13. [Module 8 — Active Time & Attendance](#12-module-8--active-time--attendance)
14. [Module 9 — HR & Team Administration](#13-module-9--hr--team-administration)
15. [Module 10 — AI Assistant](#14-module-10--ai-assistant)
16. [Cross-Module Integration Map](#15-cross-module-integration-map)
17. [Database Schema](#16-database-schema--core-tables)
18. [Scalability Roadmap](#17-scalability-roadmap)
19. [Phase 1 Delivery Plan](#18-phase-1-delivery-plan)

---

## 0. Executive Summary

This document is the single source of truth for building an internal ERP platform that unifies the collaboration depth of Bitrix24 with the workforce management capability of Workday — delivered as one web application, one login, one data model, at minimal infrastructure cost.

Every tool and architectural decision is a **final recommendation, not a choice between options**. Each is selected against cost, proven production use, developer ecosystem maturity, and long-term scalability.

**Phase 1 scope**: 0–100 users, months 1–4. Goal: a fully functional internal platform replacing Slack + Zoom + Trello + basic HRMS.

**Real-world references:**
- **Linear** — Postgres-first, modular frontend, extreme query performance
- **Plane** (open-source Jira) — proven NestJS + Postgres stack for project management at scale
- **ERPNext / Frappe** — open-source Workday alternative proving modular monolith works at SME scale
- **Notion** — single shared data model across all modules, entity-linked everything
- **Chatwoot** — open-source Freshdesk proving NestJS + Postgres ticket architecture in production

---

## 1. Architecture Philosophy

### Single Data Model, Not Siloed Apps

Every module reads from and writes to the same Postgres database. A `Person` record is simultaneously an employee (HR), a user (Auth), a team member (Projects), and optionally a contact (CRM in Phase 2). There are no data sync jobs between modules — one database, one source of truth. This is how ERPNext works and why it scales without architectural rebuilds.

### Modular Monolith — Not Microservices

Microservices add unjustifiable operational complexity (service discovery, distributed tracing, network latency, separate CI/CD) until you have 50+ engineers or 10,000+ concurrent users. The proven approach for 0→1 ERP builds (ERPNext, Plane, Odoo) is a **modular monolith**: a single deployable application internally divided into strict module boundaries. Each module has its own folder, service layer, and API routes — but runs in one process sharing one DB connection pool.

> 🔀 **PHASE 2 MIGRATION**: When team size exceeds 10 engineers or API load exceeds 500 req/sec sustained, individual modules can be extracted into separate services. Because module boundaries are strict from day one, this is a refactor — not a rewrite.

### Code-Split Modules via Next.js Dynamic Imports (NOT Module Federation)

**Correction from v2.0**: Webpack 5 Module Federation was proposed in the previous version. This is removed for Phase 1 and 2. Module Federation adds real operational complexity — separate build pipelines, version alignment between host and remotes, SSR hydration issues with Next.js App Router — with no meaningful benefit until you have separate teams deploying separate modules independently. Next.js `dynamic()` imports achieve 95% of the benefit (lazy loading per module, code splitting per route) with zero added complexity.

Each module is a route group in Next.js (`/app/(hr)/`, `/app/(projects)/`, `/app/(messenger)/`). Next.js automatically splits bundles per route. A user loading the HR module does not download the Kanban module's code.

> 🔀 **PHASE 2 MIGRATION**: When you have 3+ separate frontend teams owning separate modules, evaluate Webpack 5 Module Federation at that point. The route group structure makes it a mechanical migration.

### Event-Driven Cross-Module Communication

When a task is completed, the Tasks module emits a BullMQ event: `task.completed`. The Calendar module, Active Time module, and Notification engine subscribe to that event independently. No module calls another module's internal service directly — all cross-module communication goes through the event bus. This is what makes the system cohesive without hard dependencies between modules.

### RBAC at the Data Layer, Not Just the UI

Permissions are enforced at the API middleware layer **and** at the Postgres RLS layer. Even if a bug bypasses the API permission check, the database refuses to return unauthorized data. This dual enforcement is the same approach used by Supabase, PostgREST, and Hasura in production.

---

## 2. Final Tech Stack

### 2.1 Frontend — Next.js 14 (App Router)

**Why Next.js over plain React + Vite:**

For an ERP with data-heavy dashboards, SSR matters concretely. With a pure React SPA (Vite), the user sees a loading spinner while the JS bundle downloads, then another spinner while API calls complete. With Next.js Server Components, the server fetches data and sends pre-rendered HTML — users see content immediately. On slow connections (mobile, restricted corporate networks) this is the difference between a professional tool and a frustrating one.

Additional Next.js advantages for this project:
- **Authentication route protection at the edge**: Next.js middleware redirects unauthenticated users before any page renders — no flash of protected content
- **API routes**: lightweight edge functions (webhook receivers, Google Calendar OAuth2 callbacks) in the same codebase without a separate service
- **Vercel integration**: zero-config deployment with preview deployments per PR

**When to use Server Components vs Client Components:**
- Server Components: all data-heavy read pages (dashboards, HR records, reports, project list)
- Client Components: anything real-time (Kanban drag-drop, chat, presence status, Socket.io consumers)
- The Socket.io context provider lives at the root layout as a Client Component wrapping the app — all real-time children subscribe to it

**UI: shadcn/ui + Tailwind CSS**

shadcn/ui copies components directly into the codebase — zero bundle bloat from unused components. Built on Radix UI primitives (fully ARIA-compliant — required for enterprise software). Tailwind provides consistent design tokens.

MUI and Ant Design rejected: they impose their own design system heavily, carry large bundle sizes, and enterprise theming is brittle.

**State: Zustand + TanStack Query**

Zustand for minimal global UI state (auth user, notification count, sidebar open/closed). TanStack Query for all server state — automatic caching, background refetching, optimistic updates for Kanban drag-drop. Redux rejected — overkill boilerplate with no benefit at this scale.

**Real-time: Socket.io Client**

Kanban drag-drop sync, chat delivery, presence status, live notifications. Socket.io handles reconnection and fallback to long-polling on restricted networks automatically. The Redis adapter (already in the backend) enables horizontal scaling with no client-side changes.

---

### 2.2 Backend — NestJS (Node.js + TypeScript)

NestJS is the only Node.js framework with modular architecture enforced at the framework level — modules, controllers, services, guards, and interceptors are framework concepts, not team conventions. This prevents module boundary erosion as the codebase grows.

Built-in dependency injection makes each module independently testable. RBAC decorators (`@Roles('admin', 'hr')`) are clean and co-located with route definitions. TypeScript end-to-end: shared Zod schemas between frontend and backend via a `packages/types` monorepo package.

Plane (open-source Jira) runs NestJS in production at scale — a direct proof of concept for this architecture.

**ORM: Prisma**

Prisma generates a fully type-safe client from the schema. Non-existent columns are caught at TypeScript compile time before deployment. Prisma Migrate handles schema versioning with a clean declarative CLI. Prisma Studio provides a GUI for debugging data issues during development.

TypeORM rejected: longstanding complex-relation issues and the active record pattern make unit testing harder. Drizzle ORM rejected: smaller ecosystem and less mature migration tooling at time of writing.

**Queue: BullMQ over Redis**

Persistent Redis-backed job queue. If the server restarts, queued jobs survive. Used for: sending emails, processing AI requests asynchronously, generating payslip PDFs, syncing Google Calendar, running SLA breach checks. Same Redis instance serves caching and queuing.

**WebSocket: NestJS Socket.io Gateway**

Socket.io Gateway is a first-class NestJS adapter sharing auth middleware and dependency injection with the rest of the application. The Socket.io Redis adapter (`io.adapter(createAdapter(redisClient))`) is configured at startup — enables horizontal scaling with no client changes.

**Sticky Sessions Required**: When multiple NestJS instances are behind a load balancer, WebSocket upgrade handshakes must hit the same instance. Configure Cloudflare or Render's load balancer with sticky sessions (IP hash or cookie-based). Without this, WebSocket connections fail on ~50% of requests hitting the wrong instance.

---

### 2.3 Database — Supabase (Postgres 15)

Postgres is the only correct choice for an ERP. The relational model, JOIN support, ACID transactions, and complex aggregations are non-negotiable for finance, HR, and project data. SAP, Workday, Odoo, and ERPNext all run on relational databases — not coincidence.

Supabase wraps Postgres with managed hosting, automatic backups, a REST API, real-time subscriptions via logical replication, Row-Level Security UI, and built-in Auth — all on one platform. Free tier covers Phase 1 entirely (500MB DB, 2GB storage, 50K MAU).

**Why Firebase/Firestore is definitively rejected:**

1. No JOINs. A payroll query joining `employees → time_logs → leave_deductions → salary_components` is one SQL query. In Firestore it is 4+ sequential round trips with manually maintained denormalized data.
2. No server-side aggregations. `SELECT SUM(amount) FROM expenses WHERE department_id = ? AND month = ?` is one line in SQL. In Firestore it requires a Cloud Function, a counter document, and manual consistency management.
3. Unpredictable cost. Firestore bills per document read. 100 users × 10 dashboard loads/day × 20 widgets = 200,000 reads/day ≈ ₹700/day on dashboards alone. Supabase Pro at ₹2,100/month is flat regardless of query count.
4. Total vendor lock-in. Firestore cannot export to standard SQL. Postgres `.sql` dumps are portable to any cloud provider.

**Row-Level Security (RLS)** — every sensitive table has an RLS policy:

```sql
-- Payroll: employee sees own, HR and Admin see all
CREATE POLICY "payroll_access" ON payroll_records
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'hr')
      )
    )
  );
```

Even if an application bug passes the wrong user ID, the database returns nothing for unauthorized requests.

**Cache: Upstash Redis (Serverless)**

Pay-per-command, not per hour. Free tier (10,000 commands/day) covers Phase 1. Used for JWT validation cache, BullMQ queue, Socket.io pub/sub adapter, rate limiting counters, permission matrix cache (5-min TTL), and task timer state.

**Full-Text Search: Postgres `pg_tsvector`**

Native Postgres full-text search is sufficient for tasks, messages, tickets, and contacts up to 500 users. No additional service needed in Phase 1.

> 🔀 **PHASE 2 MIGRATION**: When search latency exceeds 100ms or search query volume is significant, add Meilisearch on a $7/month Render instance. Index `tasks`, `messages`, `tickets` tables. Code change is minimal — swap the search service implementation behind the existing search interface.

**Vector Store for AI RAG: pgvector on Supabase**

Supabase supports `pgvector` natively. Embeddings for the knowledge base, ticket resolutions, and policy documents live in the same Postgres database at zero additional cost.

**Embedding model**: Use `voyage-large-2` (Anthropic's recommended partner) or OpenAI `text-embedding-3-small` (1536 dimensions, $0.02/1M tokens) for generating embeddings. The schema stores `vector(1536)`. Do not assume Anthropic's Claude API generates embeddings — it does not. Embeddings are generated via a separate API call and stored at index time.

---

### 2.4 Authentication — Supabase Auth

Supabase Auth handles: email/password login, JWT issuance, refresh token rotation, TOTP 2FA, Google OAuth2 SSO, and magic links — all out of the box. Because Supabase Auth integrates with Postgres RLS, the `auth.uid()` function in RLS policies directly maps to the authenticated user — no bridging layer needed.

**Token strategy:**
- Access token: JWT RS256, 15-minute expiry (asymmetric — verifiable with public key, no DB roundtrip)
- Refresh token: 7-day rolling, `httpOnly + Secure + SameSite=Strict` cookie — never localStorage (prevents XSS token theft)
- 2FA: TOTP via Supabase Auth MFA (this is a native feature)
- Device trust: **NOT a native Supabase Auth feature** — implemented as a custom `user_trusted_devices` table + NestJS middleware. Supabase verifies the TOTP code; NestJS decides whether to require it based on device fingerprint age.

> 🔀 **PHASE 2 MIGRATION**: If enterprise clients require SAML 2.0 or Active Directory (LDAP) integration, migrate the identity layer to Keycloak. Keycloak requires a dedicated server (minimum 512MB RAM) and significant configuration — not justified until enterprise contracts appear. The migration path: Keycloak as an OIDC provider in front of Supabase Auth. No application business logic changes.

---

### 2.5 File Storage — Cloudflare R2

R2 is S3-compatible (same API, same SDKs) with **zero egress fees**. AWS S3 charges $0.09/GB egress — this compounds for a system serving file attachments, meeting recordings, and payslip PDFs regularly. Supabase Storage is backed by S3 and passes egress costs through.

Free tier: 10GB storage + 1M Class A ops + 10M Class B ops/month. Clients upload directly via presigned PUT URLs (30-second expiry) — files never pass through the NestJS server, eliminating server bandwidth costs.

---

### 2.6 Email — Resend

React Email templates (same language as the frontend). Free tier: 3,000 emails/month covers all Phase 1 transactional email. Handles DKIM/SPF/bounce management automatically — no configuration overhead.

---

### 2.7 Video — LiveKit Cloud → Self-hosted

Open-source SFU-based WebRTC. LiveKit Cloud free tier: 100 concurrent participants — sufficient for Phase 1. When costs exceed ₹2,500/month, self-host on a Hetzner CX41 (₹3,360/month). Application code change: update `LIVEKIT_HOST` environment variable only.

Zoom API and Daily.co rejected: per-minute fees compound significantly at moderate usage.

---

### 2.8 Hosting

**Frontend: Vercel** — push to main, deployed in 90 seconds, global CDN, preview deployments per PR. Free Hobby plan covers Phase 1.

**Backend: Render.com** — NestJS as Docker container, auto-builds from Dockerfile. Starter $7/month for always-on production API. Simpler than AWS for a small team at this scale.

> 🔀 **PHASE 2 MIGRATION**: When API load exceeds a single Render instance (~500 concurrent users), either enable Render auto-scaling (no code changes) or migrate to Hetzner VPS with Docker Compose + Nginx + PM2 cluster mode (uses all CPU cores). At 2,000+ concurrent users, Kubernetes on Hetzner.

---

### 2.9 CDN & Edge — Cloudflare (Free Plan)

Sits in front of both Vercel and Render as DNS and CDN. DDoS protection, WAF, bot detection — all free tier. Cloudflare Workers (100,000 requests/day free) handles login endpoint rate limiting before requests reach NestJS.

---

### 2.10 AI — Anthropic Claude API

**Model routing:**
- Claude Haiku 3.5 (~₹0.02/1K tokens): high-frequency, low-complexity tasks — thread summarization, task description, reply suggestions, ticket KB matching
- Claude Sonnet 4 (~₹0.25/1K tokens): complex tasks on explicit user action only — project analysis, JD generation, meeting notes. Never auto-triggered.

**Prompt caching**: The Anthropic API caches repeated system prompt prefixes at 10% of normal token cost. Since the same ~800-token ERP system prompt is sent with every call, caching achieves 70–80% cost reduction in practice. This is the single most important AI cost control mechanism.

**AI intent → query mapping**: The AI chat sidebar does not generate arbitrary SQL. The NestJS AI service maintains 30–40 pre-defined Prisma query templates. Claude classifies the user's intent into one of these templates; NestJS executes the matching Prisma query. This prevents SQL injection and keeps queries predictable and indexable.

---

### 2.11 PDF Generation — Puppeteer (replacing pdf-lib)

**Correction from v2.0**: `pdf-lib` requires manually positioning every text element — payslip table layout becomes painful to maintain. Puppeteer (headless Chrome) renders an HTML/CSS template to PDF. HTML templates are far easier to maintain and design. Same Node.js stack, no new language context.

---

### 2.12 Monorepo — Turborepo

Build pipeline with output caching — unchanged modules don't rebuild.

```
apps/
  web/          — Next.js frontend
  api/          — NestJS backend
packages/
  types/        — Shared Zod schemas + Prisma generated types
  ui/           — Shared shadcn/ui components
  config/       — Shared ESLint, TypeScript, Tailwind configs
```

---

### Final Stack Summary

| Layer | Tool | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR for dashboards, edge auth, API routes |
| Code splitting | Next.js `dynamic()` imports | Lazy-load per module, zero added complexity |
| UI | shadcn/ui + Tailwind | Zero bloat, ARIA-compliant, white-label ready |
| State | Zustand + TanStack Query | Minimal global state + server state caching |
| Auth | Supabase Auth | RLS-integrated, TOTP, refresh tokens |
| Database | Supabase Postgres 15 | Relational, RLS, managed, free tier |
| Cache + Queue | Upstash Redis + BullMQ | Serverless Redis, persistent job queue |
| Backend | NestJS (TypeScript) | Enforced modular architecture |
| ORM | Prisma | Type-safe, CLI migrations, Prisma Studio |
| File storage | Cloudflare R2 | Zero egress fees |
| Email | Resend + React Email | Developer-first, no config overhead |
| Video | LiveKit Cloud | OSS, cost-controlled, self-hostable |
| CDN + Edge | Cloudflare Free | WAF, DDoS, Workers for rate limiting |
| Hosting | Vercel + Render | Zero DevOps |
| AI | Anthropic Claude API | 200K context, prompt caching, structured output |
| Embeddings | Voyage-large-2 or OpenAI text-embedding-3-small | pgvector RAG |
| PDF | Puppeteer | HTML template → PDF, maintainable |
| Monorepo | Turborepo | Build caching |

---

## 3. Infrastructure & Cost

### Phase 1: 0–100 Users (Months 1–4)

| Service | Plan | Monthly Cost (₹) | Notes |
|---|---|---|---|
| Supabase | Free | ₹0 | 500MB DB, 2GB storage, 50K MAU |
| Vercel | Free (Hobby) | ₹0 | Unlimited projects |
| Render | Starter ($7) | ₹590 | Always-on NestJS API |
| Upstash Redis | Free | ₹0 | 10K commands/day |
| Cloudflare R2 | Free | ₹0 | 10GB, 1M ops/month |
| Resend | Free | ₹0 | 3K emails/month |
| LiveKit Cloud | Free | ₹0 | 100 concurrent participants |
| Cloudflare | Free | ₹0 | CDN + WAF + Workers |
| Domain | Annual ÷ 12 | ₹100 | .in domain |
| Claude API (Haiku, cached) | ~50K tokens/day | ₹840 | Light AI usage |
| **Total** | | **~₹1,530/month** | |

### Phase 2 Cost Preview (for planning)

| Service | Plan | Monthly Cost (₹) |
|---|---|---|
| Supabase Pro | $25 | ₹2,100 |
| Vercel Pro | $20 | ₹1,680 |
| Render Standard (2 services) | $25 | ₹4,200 |
| Upstash Redis | Pay-as-you-go ~$8 | ₹672 |
| Cloudflare R2 | ~$5 | ₹420 |
| Resend Pro | $20 | ₹1,680 |
| LiveKit Cloud | ~$20 | ₹1,680 |
| Claude API (cached, 500 users) | ~$50 | ₹4,200 |
| **Total** | | **~₹16,632/month** |

> At 500 users paying ₹500/user/month: ₹2,50,000 revenue vs ₹16,632 infra = **93% gross margin on infrastructure.**

### Competitor Cost Reference (per 100 users/month)

| Product | Cost |
|---|---|
| Workday HCM | ₹12,60,000–₹33,60,000 |
| Salesforce + Slack | ₹6,30,000 |
| Jira + Confluence | ₹68,460 |
| Bitrix24 Enterprise | ₹16,716 (flat) |
| **This ERP Phase 1** | **₹1,530** |
| **This ERP Phase 2** | **₹16,632 (500 users)** |

---

## 4. Role System

### 4.1 Core Roles (Phase 1)

**Admin (Level 5 — Org-wide)**

The system owner. One Owner Admin per org (the signup account) — cannot be demoted by other admins.
- Full read/write on every module and record in the org
- Create, deactivate, promote, demote any user (except Owner Admin)
- Access to audit logs, session management, active time dashboards, all system settings
- Configure: 2FA policy, password policy, working hours, leave policies, integration keys

**HR Manager (Level 4 — People scope)**
- Full CRUD on employee records, leave management, payroll register
- Read-only on Active Time for attendance and payroll calculation
- Can create Announcement channels and HR-specific private channels
- Cannot access: Kanban card details, pipeline stages (except HR hiring pipeline), Finance GL

**Project Manager (Level 3 — Project scope)**
- Full CRUD on owned projects: tasks, Kanban boards, pipelines, sprints
- Can create and manage channels (private and public)
- Can assign tasks to team members within their project
- Can view team availability calendar and active status
- Can approve/reject timesheets for their team
- Cannot access: other PMs' projects (unless added), HR records, payroll, Finance GL

**Employee (Level 2 — Own scope)**
- Access to own tasks, projects they are members of, personal calendar
- Can join public channels, post in member channels
- Can raise any ticket type
- Can submit time logs, leave requests
- Cannot create projects or channels; cannot view other employees' HR data or salary

**Intern (Level 1 — Minimal scope)**
- Can only see tasks explicitly assigned to them — no project browsing
- Read-only calendar (view invited events only)
- Can use Messenger, join added channels
- Can submit IT Support and General Inquiry tickets only
- Cannot log time manually; timer only, approved by PM

### 4.2 Proposed Additional Roles

**Team Lead (Level 2.5 — Team scope)**

Implemented as: Employee role + `is_team_lead: true` flag + supplementary permission set granted by Admin.
- Can assign tasks to their team members
- Can approve leave requests for their team (routes to HR for final approval)
- Can view team members' time logs
- Can create private channels for their team
- Cannot create projects or manage pipelines/sprints

**Team Administrator (Sub-role of Admin)**
- Can invite users to their assigned team; assign roles up to PM level
- Can view team attendance and time logs
- Can configure team-level working hours and channel defaults
- Cannot access other teams' data, financial data, or org-wide settings

> 🔀 **PHASE 2 MIGRATION**: Add Finance Officer (Level 3.5) for Finance GL module, and Client/External Guest (Level 0, time-bound, stored in separate `external_users` table excluded from internal RLS) for client-facing project portals.

### 4.3 Permission Matrix

| Permission | Admin | HR | PM | Team Lead | Employee | Intern |
|---|---|---|---|---|---|---|
| Create users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all employee records | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own employee record | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Assign tasks | ✅ | ❌ | Team | Team | ❌ | ❌ |
| View own tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create channel | ✅ | HR only | ✅ | Team only | ❌ | ❌ |
| View payroll | ✅ | ✅ | ❌ | ❌ | Own only | ❌ |
| Approve leave | ✅ | ✅ | Team | Team | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage pipeline | ✅ | HR only | ✅ | ❌ | View only | ❌ |
| Submit expense | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Finance GL | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Use AI Assistant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create ticket | ✅ | ✅ | ✅ | ✅ | ✅ | IT + General |
| Active time dashboard | ✅ | ✅ | Team | Team | Own | Own |

---

## 5. Module 1 — Authentication & RBAC

### How It Works

Supabase Auth handles the identity layer. NestJS guards enforce RBAC at the API layer. Postgres RLS enforces it at the data layer. Dual enforcement means no single point of failure for access control.

### Login Flow (Phase 1)

```
1. User submits email + password → POST /auth/login
2. Cloudflare Worker rate-limits: 5 requests/minute per IP (blocked before NestJS)
3. NestJS validates credentials via Supabase Auth client
4. Supabase returns JWT (15 min) + refresh token (7 days, set as httpOnly cookie by NestJS)
5. NestJS checks device trust: user has TOTP enabled AND device fingerprint NOT in
   user_trusted_devices within last 7 days → require 2FA
6. If 2FA required: return { requires_2fa: true } → frontend shows TOTP input
7. User submits TOTP → Supabase Auth MFA verification → JWT confirmed
8. NestJS writes device fingerprint to user_trusted_devices (expires 7 days)
```

**Clarification**: Step 5–8 device trust logic is implemented in NestJS + `user_trusted_devices` table. Supabase Auth natively verifies the TOTP code. The 7-day skip decision is NestJS business logic, not a Supabase Auth built-in feature.

### Encryption Standards

| Layer | Algorithm | Why |
|---|---|---|
| Password storage | bcrypt (cost 12) | ~300ms hash — too slow to brute-force, fast enough for login |
| Session tokens | JWT RS256 | Asymmetric: API servers verify with public key, no DB roundtrip |
| Data in transit | TLS 1.3 | Enforced by Cloudflare; HTTP auto-redirects to HTTPS |
| PII fields (salary, national ID) | AES-256-GCM (application layer) | Encrypted before writing; decrypted only for authorized reads |
| Refresh tokens | SHA-256 hashed in DB | DB compromise cannot replay refresh tokens |
| 2FA TOTP seeds | AES-256 encrypted in DB | Seeds useless without the application encryption key |
| Encryption keys | Environment variables on Render/Vercel | Never in DB; rotated quarterly |

### RBAC Enforcement Pipeline

```
Incoming Request
  → Cloudflare Worker (rate limit + JWT signature pre-check)
  → NestJS JwtAuthGuard (decode JWT, attach user to request context)
  → NestJS RolesGuard (fetch permission set from Redis cache, 5-min TTL)
  → @Roles() decorator check (resource:action:scope match)
  → Prisma query execution
  → Postgres RLS policy (data-layer last line of defense)
  → Response
```

Permission string format: `resource:action:scope`
Examples: `tasks:create:team`, `payroll:read:own`, `users:delete:org`

### Phase 1 Features

- Email + password login, bcrypt cost 12
- TOTP 2FA via Supabase Auth MFA — enforced once per 7 days per trusted device
- Fallback 2FA: email OTP via Resend (10-minute expiry)
- JWT RS256 (15 min) + rotating refresh tokens (7 days, httpOnly cookie)
- Brute-force protection: 5 failed attempts → 15-min lockout → exponential backoff → Resend alert to user
- Session management UI: users see all active sessions with device/IP/time; can revoke any
- IP anomaly detection: new geography login → re-verification email via Resend
- Full audit log: every auth event in `audit_logs` (login, logout, failed attempt, role change) — 12-month retention
- Password policy: 10+ chars, 1 uppercase, 1 number, 1 special character; blocks last 5 passwords

### Proposals for Future Phases
- Magic link login (Supabase Auth native, zero extra code) — Phase 2
- FIDO2/WebAuthn hardware key for Admin accounts — Phase 2
- HaveIBeenPwned API check at password creation/reset — Phase 2
- Permission delegation: employee delegates permissions to colleague during leave with auto-expiry — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Enable Supabase Auth magic links (one config flag). Add `permission_delegations` table `(delegator_id, delegatee_id, permissions JSONB, expires_at)` — checked in RolesGuard after the standard role check.

---

## 6. Module 2 — Messenger & Channels

### How It Works

Messages stored in Postgres, partitioned by `channel_id` for query performance. Real-time delivery via Socket.io rooms. File attachments go directly to Cloudflare R2 via presigned URLs — files never pass through NestJS, eliminating server bandwidth cost. Video calls via LiveKit.

### Direct Messaging — Phase 1 Features

- 1-to-1 and group DMs (up to 50 participants)
- Real-time delivery via Socket.io rooms; message states: Sent → Delivered → Read (tracked per recipient in `message_receipts`)
- Reactions (emoji), threaded replies, @mentions with push notifications
- File and image attachments: client generates presigned R2 PUT URL from NestJS (30-sec expiry), uploads directly, NestJS stores metadata on upload completion webhook — max 25MB
- Message editing with edit history; soft delete (content removed, placeholder shown)
- Offline message queue: BullMQ delayed job re-delivers to Socket.io on reconnect
- Full-text search via Postgres `tsvector` on message content

### Channels — Phase 1 Features

- **Channel creation restricted to Project Manager level and above** — enforced at the NestJS API guard, not just the UI
- Channel types:
  - **Public** — visible and joinable by all org members
  - **Private** — invite-only; content invisible to non-members enforced by RLS policy on `channel_members` join
  - **Announcement** — Manager/Admin posts only; all members read-only
- Channel features: topic, description, pinned messages, incoming webhook receivers
- Manager capabilities: archive, transfer ownership, set posting restrictions, remove members
- Auto-creation: when a project is created, BullMQ `project.created` event → private channel auto-created for the project team

### Video Meetings — Phase 1 Features (LiveKit)

- Instant meeting: one click from any DM or channel; LiveKit room created via API
- Scheduled meeting: created from Calendar module; join link auto-generated and added to calendar event
- Meeting features: screen share, chat sidebar, raise hand, host mute-all, grid/spotlight layout
- Recordings stored to Cloudflare R2; access controlled by `recording:read:team` RBAC permission
- Persistent named rooms: team standup room always available for drop-in
- Waiting room: host must admit participants (required for external client calls)
- External participants: join link works without a system login

### Technical Notes

- Socket.io Redis adapter at startup: `io.adapter(createAdapter(redisClient))` — required for horizontal scaling
- Messages table partitioned by `channel_id` HASH — channel history queries hit one partition
- **Sticky sessions required on load balancer** (see Section 2.2) for WebSocket upgrade reliability

### Proposals for Future Phases
- Scheduled messages: BullMQ delayed job — Phase 2
- Voice messages recorded and stored in R2 — Phase 2
- AI thread summarizer ("Summarize last 50 messages" → Claude Haiku) — Phase 2
- Auto-status from active LiveKit session: "In a meeting until 3pm" — Phase 2
- Message translation via LibreTranslate (self-hostable, open-source) — Phase 3

> 🔀 **PHASE 2 MIGRATION**: Add `scheduled_at` column to `messages` table; BullMQ `message.scheduled` job reads it. Add `voice_r2_key` column for audio clips. AI summary: new `POST /channels/:id/ai/summarize` endpoint calling Claude Haiku with last N messages as context, streamed via SSE.

---

## 7. Module 3 — Calendar & Booking

### How It Works

An internal `events` table in Postgres is the source of truth for all ERP calendar events. Google Calendar sync is bidirectional via the Google Calendar API — polling every 5 minutes via BullMQ recurring job, or webhook push when the user authorizes it. The calendar works fully without Google Calendar connected.

### Calendar — Phase 1 Features

- Views: Day, Week, Month, Agenda
- Event types: Personal, Team, Company-wide, Project Milestone, Leave, External Booking
- Event properties: title, description, video link (LiveKit auto-generated), recurrence (RFC 5545 RRULE), reminders (Resend email + Socket.io push), visibility
- Drag-and-drop rescheduling; resize to extend event duration
- Google Calendar OAuth2 bidirectional sync: one-time connect; events sync both directions
- iCalendar (.ics) export for Outlook and Apple Calendar
- Calendar overlay: own calendar + team members' free/busy + project milestones

**ERP auto-created events:**

| Trigger | Action |
|---|---|
| Task due date set | Calendar event created via `task.created` BullMQ event |
| Project milestone created | All-day calendar event created |
| Leave approved | Calendar block set + OOO status set in Messenger |
| Booking confirmed | Calendar events created for both parties + LiveKit room pre-created |
| Scheduled video meeting | Google Calendar invite sent via Resend |

**Role-based calendar access:**
- Admin: full org calendar with all event details
- HR: leave calendar across all employees
- PM: team task calendar and free/busy availability
- Employee: own calendar + team free/busy (not event details)
- Intern: own calendar only

### Booking System — Phase 1 Features

- User defines availability windows in `booking_availability` table (day of week, start time, end time, buffer minutes)
- Shareable link: `app.company.com/book/username`
- External bookings: no system login required (name + email collected)
- Buffer time between bookings, configurable
- Meeting type templates: 30-min intro, 1-hour review — each with auto-generated LiveKit link
- On confirmation: both calendars updated, Resend confirmation sent, LiveKit room pre-created
- Cancellation and rescheduling: Resend email with one-click action links

### Proposals for Future Phases
- Smart scheduling: AI reads all participants' calendars and suggests 3 optimal slots — Phase 2
- Team availability overlay (Doodle-equivalent built-in) — Phase 2
- Recurring 1:1s auto-scheduled between manager and direct reports from HR module — Phase 2
- Physical meeting room booking with conflict detection — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Add `meeting_rooms` table `(id, name, capacity, location, amenities)`. Add `room_id FK` to `events` table. NestJS booking service checks `events WHERE room_id = ? AND time overlaps` before confirming.

---

## 8. Module 4 — Kanban Board

### How It Works

The Kanban board is a view layer on the Tasks data model. A card IS a task record. The column it appears in is determined by the task's `status` field. Drag-and-drop updates `status` via a Socket.io event broadcast to all viewers of `board:${board_id}` room. Every status change appended to `task_activity`.

### Phase 1 Features

**Board structure:**
- Default columns: `Backlog → To Do → In Progress → In Review → Done` — fully customizable per project
- Custom columns stored in `board_columns` table with order index, name, and optional WIP limit (`max_cards`)
- WIP limits: column header turns red when `max_cards` is exceeded (Toyota Production System best practice)
- Swimlanes: group by assignee, priority, or label (TanStack Query cache filtering — no extra API calls)

**Cards:**
- Title, rich-text description, multi-assignee, due date, priority (Low/Medium/High/Critical)
- Custom labels (colour-coded per project)
- Subtasks as checklist items (`task_items` table — **not JSONB array**, see schema correction note)
- File attachments via R2 presigned upload
- Comments linked to a Messenger thread for that card
- Estimated hours vs logged hours shown side by side
- Full activity log in `task_activity`: every change with actor and timestamp

**Board actions:**
- Real-time drag-and-drop: Socket.io broadcast to `board:${board_id}` room; optimistic update on client via TanStack Query
- Bulk move, assign, label operations
- Filter by assignee, label, due date, priority
- Archive completed cards (`archived: true`; searchable)
- CSV export: NestJS streams CSV from Prisma query

**Role-based access:**
- Admin: full access to all boards org-wide
- PM: full CRUD on owned boards; read-only on others
- Team Lead: full edit on cards for their team members
- Employee: edit and move own assigned cards; cannot create or delete columns
- Intern: update status of assigned cards only

### Proposals for Future Phases
- Burndown chart: daily snapshot in `board_snapshots` (one row per day per board), D3.js chart — Phase 2
- Time-in-column: `column_entered_at` timestamp per card; BullMQ cron flags stale cards past SLA — Phase 2
- Card templates: pre-populated Bug Report, Feature Request, Onboarding Task structures — Phase 2
- Dependency visualization: "blocked by" links with visual indicators — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Add `board_snapshots` table `(board_id, date, column_counts JSONB)`. A daily BullMQ cron at midnight snapshots each active board. D3.js burndown chart reads from this table — no change to the core tasks table.

---

## 9. Module 5 — Pipeline

### How It Works

The Pipeline is distinct from Kanban. Every stage transition is a **governed business event** — not a free drag-and-drop. Each transition captures required fields, the timestamp, the actor, and triggers downstream automation. The same engine powers HR hiring, project approval, support escalation, and (in Phase 2) sales CRM. Build the engine once; configure it for each use case.

### Phase 1 Features

**Pipeline structure:**
- Multiple named pipelines per org
- Each stage defines: owner role, required fields on transition (JSONB schema), SLA hours, allowed next stages (enforced at API level — invalid transitions rejected)
- Pipeline items: owner, creation date, current stage, full history, linked records, optional value, priority

**Stage transitions:**
- Moving an item to a new stage opens a transition modal; NestJS validates required fields before committing
- Every transition appended to `pipeline_stage_history`: `(item_id, from_stage_id, to_stage_id, actor_id, note, transitioned_at)`
- Stuck item detection: BullMQ daily cron flags items exceeding their stage SLA; escalates to pipeline owner via Socket.io + Resend

**Automation engine:**
- Rule format: `WHEN item enters [stage] AND [condition] → DO [action]`
- Actions: notify user via Socket.io, create linked task, send Resend email from template, post to channel, update linked Kanban card status
- Rules stored in `pipeline_automation_rules` (JSONB); evaluated in NestJS on every stage transition

**Views:**
- Column view: visual, drag-and-drop within pipeline
- Table view: server-side sort and filter via TanStack Query
- Funnel view: D3.js showing item counts and drop-off rate per stage

**Phase 1 pipeline configurations:**

| Pipeline | Stages |
|---|---|
| HR Hiring | Applications → Screening → Interview → Offer → Hired / Rejected |
| Project Approval | Draft → Review → Approved → In Progress → Delivered |
| Support Escalation | Open → Assigned → In Progress → Resolved → Closed |
| Client Onboarding | Signed → Kickoff → Setup → Training → Live |

### Proposals for Future Phases
- Multi-pipeline items: one entity tracked in two pipelines simultaneously — Phase 2
- Pipeline templates: pre-built configs selectable on pipeline creation — Phase 2
- Revenue forecasting: `SUM(value × stage_probability)` across open items → Admin dashboard — Phase 2 (CRM)

> 🔀 **PHASE 2 MIGRATION**: CRM Pipeline is this module + two new tables (`contacts`, `deals`) + a new pipeline type. The automation engine, stage history, SLA detection, and funnel analytics are fully inherited — zero re-implementation. Add `value`, `currency`, `probability`, `expected_close_date` to `pipeline_items` as nullable columns (existing rows unaffected).

---

## 10. Module 6 — Projects & Tasks

### How It Works

Projects → Milestones → Sprints → Tasks → Subtasks. Every entity is a Postgres record with foreign key relationships. All views (List, Kanban, Gantt, Calendar, Sprint) are different UI representations of the same `tasks` table — no data duplication between views.

### Data Hierarchy

| Entity | Key Fields |
|---|---|
| Project | name, owner_id, team_id, status, start_date, end_date, budget, health_score |
| Milestone | project_id, name, due_date, status |
| Sprint | project_id, name, goal, start_date, end_date, velocity |
| Task | project_id, sprint_id, milestone_id, title, status, priority, story_points, estimate_hours, due_date, recurrence_rule |
| Task Assignees | task_id, user_id (join table — see schema section) |
| Subtask | task_id, title, completed |
| Time Log | task_id, user_id, hours, date, note, approved |

### Phase 1 Features

**Projects:**
- Template cloning: duplicate project structure (tasks, milestones, sprints) without copying data
- Health score: auto-calculated as `(completed/total × 50) + (days_remaining/total_duration × 30) + (no_blockers × 20)` — updated on every task status change via BullMQ
- Risk log: JSONB field on project for PM notes

**Tasks:**
- Status workflow: `Open → In Progress → In Review → Blocked → Done → Closed` — customizable per project via `project_workflows` table
- Relationships: blocks / is-blocked-by / duplicates / relates-to, stored in `task_links`
- Time tracking: start/stop timer on task card; state stored in Redis (`timer:${user_id}:${task_id}`); flushed to `time_logs` on stop or on next day's first action
- Recurring tasks: `recurrence_rule` (RFC 5545 RRULE) on task; BullMQ cron creates next instance on completion
- Watchers: `task_watchers` join table; watchers receive Socket.io notifications on all changes without being assignees

**Views:**
- List: TanStack Table with virtualized rows, server-side sort and filter
- Kanban: Module 4 (same data, column = task status)
- Gantt: D3.js custom implementation showing bars and dependency arrows — no licensing cost
- Sprint board: Kanban filtered to current sprint
- Backlog: unscheduled tasks by priority; PM drags into sprint (updates `sprint_id`)
- My Tasks: cross-project view of all tasks assigned to current user

**Role-based access:**
- Admin: all projects org-wide
- PM: full CRUD on owned projects; read-only on others (unless added as member)
- Team Lead: edit tasks for their team within member projects
- Employee: projects they are members of; edit own assigned tasks only
- Intern: explicitly assigned tasks only; no project browsing

**Sprint management:**
- Sprint planning: drag tasks from backlog into sprint; see story point totals vs team velocity
- Burndown chart: daily snapshot via BullMQ cron → `board_snapshots` table → D3.js
- Sprint retrospective: text note attached to closed sprint record

### Proposals for Future Phases
- AI task breakdown: paste description → Claude Haiku returns subtask list with estimates — Phase 2
- Workload heatmap: story points per team member per week across all active projects — Phase 2
- GitHub/GitLab integration: PR linked to task; auto-move to In Review on PR open, Done on merge — Phase 2
- Client portal: read-only milestone view via time-limited public link (no login required) — Phase 2

> 🔀 **PHASE 2 MIGRATION**: GitHub integration — add `github_pr_url` and `github_pr_status` columns to `tasks`. Register a GitHub webhook receiver as a Next.js API route. On PR event: BullMQ `github.pr_event` job → updates task status via Prisma. No change to the task data model.

---

## 11. Module 7 — Ticket System

### How It Works

All internal requests flow through the ticket system. Every ticket has a unique ID, SLA clock, assignment queue, threaded comment history (with internal/public separation), and resolution record.

### Ticket Types & Routing

| Type | Raised By | Auto-Routed To | First Response SLA | Resolution SLA |
|---|---|---|---|---|
| Meeting Request | Any | Target person's inbox | 24h | N/A (calendar action) |
| IT Support | Any | Admin queue | 4h | 24h |
| HR Query | Employee, Intern | HR queue | 4h | 48h |
| Leave Request | Employee, Intern | Manager → HR (>3 days) | 24h | 48h |
| Facility Request | Any | Admin queue | 48h | 5 days |
| General Inquiry | Any | Assigned team queue | 48h | 5 days |
| Asset Request | Any | Admin queue | 48h | 5 days |

### Ticket Lifecycle

```
Open         → auto-assigned on creation
In Progress  → assignee accepts
Pending Info → (optional) assignee needs more from requester
Resolved     → assignee adds resolution note
Closed       → requester confirms OR auto-closes after 48h of no response
Reopened     → requester rejects resolution (mandatory reason required)
```

Every state transition appended to `ticket_history`. Internal notes (`is_internal: true`) are invisible to requesters in queries; public replies visible to both.

### SLA Engine

- `sla_clock_starts_at` set at creation (excludes non-working hours from org working hours config)
- BullMQ recurring job every 15 minutes checks SLA breach status
- First breach: Socket.io notification + Resend email to assignee
- Second breach (2× SLA elapsed): escalation posted to admin Announcement channel; Admin notified via DM

### Meeting Request Special Flow

1. Requester specifies target person, agenda, preferred date range
2. NestJS queries `events` + Google Calendar for target person's available slots
3. Target person selects a slot
4. BullMQ fires `meeting.booked`: LiveKit room created, Google Calendar invite sent, ticket auto-resolves on meeting date

### Phase 1 Features

- All ticket types with SLA engine and routing
- Internal notes vs public replies (`is_internal` boolean)
- Ticket history for every state transition
- Meeting request → calendar booking flow
- SLA breach escalation with admin notification

### Proposals for Future Phases
- Knowledge base: `kb_articles` with pgvector embeddings; Claude Haiku surfaces top 3 matches during ticket creation — Phase 2
- Email-to-ticket: Resend inbound webhook → NestJS parses and creates ticket automatically — Phase 2
- CSAT: 24h post-closure, Resend sends 1-question rating email (1–5 stars) stored in `ticket_feedback` — Phase 2
- Ticket analytics dashboard: volume by type, average resolution time, SLA compliance, assignee workload — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Knowledge base requires running an embedding job on existing KB articles (one-time BullMQ batch job: fetch articles → call Voyage/OpenAI embedding API → store in `kb_articles.embedding` vector column). pgvector is already enabled in Phase 1. Similarity search: `ORDER BY embedding <-> query_embedding LIMIT 3`.

---

## 12. Module 8 — Active Time & Attendance

### How It Works

Presence state derived from Socket.io connection. On socket disconnect: BullMQ delayed job scheduled for 60 seconds — if socket reconnects within 60 seconds, job is cancelled and presence stays Online (handles brief network drops). After 60 seconds without reconnect, status set to Offline. Active time stored in Postgres. Admin dashboard reads real-time presence from Redis and historical data from Postgres.

### Phase 1 Features

**Presence and status:**
- System-derived presence: Online (socket connected), Away (connected, no activity >15 min via heartbeat), Offline (disconnected >60 sec)
- User custom status: emoji + message + optional expiry (e.g., "In a meeting until 3pm")
- Auto-status from ERP events:
  - LiveKit session active → "In a Meeting" (via `meeting.started` BullMQ event)
  - Google Calendar OOO event today → "Out of Office" (daily BullMQ job)
  - Approved leave today → "On Leave" (via `leave.approved` BullMQ event)
- Privacy: "Invisible" shows Offline to colleagues but true status to Admin — enforced by two separate Socket.io rooms: `presence:team` and `presence:admin`

**Time tracking:**
- Clock in/out: one-click from top navigation; stores `attendance` record
- Task timer: start/stop on any task card; state in Redis; final duration written to `time_logs` on stop
- Manual time entry: past time with date and note; entries >30 min require PM approval
- Break tracking: break start/end logged; excluded from billable total
- Weekly timesheet: all logged time per day per project; employee submits for PM approval
- Timesheet approval: PM approves/rejects with comment; approved timesheets feed payroll register

**Admin oversight dashboard:**

| Widget | Data | Refresh |
|---|---|---|
| Live presence map | Online / Away / Offline per employee | Real-time Socket.io |
| Team utilization | Logged hours vs expected this week | Every 30 min |
| Absent today | No clock-in + no approved leave | Updated 10am daily |
| Late arrivals | Clock-in >15 min past shift start | Real-time |
| Overtime alerts | Logged >9 hours today | Real-time |
| Project time breakdown | Hours per project this week | Hourly |

### Proposals for Future Phases
- Shift scheduling: Admin creates shift templates; shifts appear on employee calendar — Phase 2
- Geofencing: clock-in only within GPS radius (browser Geolocation API + server-side validation) — Phase 2
- Automated timesheet reminder: BullMQ job at 5:30pm if no time logged — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Shift scheduling — add `shifts` table `(id, user_id, date, start_time, end_time, created_by)`. Admin creates shifts via HR module. BullMQ morning job sends reminder. `attendance.shift_id FK` added for variance tracking (clock-in vs scheduled).

---

## 13. Module 9 — HR & Team Administration

### How It Works

HR and Team Administration share the same underlying tables (`users`, `employees`, `departments`). Team Admin is the user management interface; HR is the employee lifecycle interface. Both read the same records — separated only by RBAC permissions.

### Team Administration — Adding Users (Phase 1)

```
1. Admin/HR fills form: name, email, role, department, manager, employment type, start date
2. NestJS creates Supabase Auth user with temporary password
3. Resend sends welcome email with login link and temporary password
4. BullMQ fires user.created, consumed by:
   - HR module → creates employees record
   - Messenger → adds user to #general channel
   - Calendar → provisions user calendar
   - Tasks → creates onboarding checklist from HR template (assigned to user + manager)
5. User forced to change password on first login (Supabase Auth flag)
```

**Other admin capabilities:**
- Change role (up to requester's own level), department, manager, team assignment
- Deactivate: Supabase session revoked immediately; `is_active: false`; all data preserved; open tasks flagged "Unassigned"
- Org chart: interactive D3.js tree from `manager_id` FK chain on `users` table
- Bulk user import via CSV: NestJS parses, creates accounts in batches, BullMQ handles onboarding events per user

### Employee Records — Phase 1 Features

- Profile: photo (R2), personal info, emergency contact, employment type, start date, employment ID
- Documents: offer letter, NDA, certifications — AES-256 encrypted before storing to R2; accessible by HR and Admin only via RLS
- Skills registry: skill name, proficiency level, certification expiry dates

### Leave Management — Phase 1 Features

- Leave types: Annual, Sick, Maternity/Paternity, Unpaid, Compensatory — each with accrual policy in `leave_policies`
- Leave balance: auto-calculated from `leave_accruals` and approved `leave_requests`
- Approval workflow: Employee → direct Manager → (if >3 days) HR for final approval — BullMQ step-routing
- On approval: `leave.approved` event → calendar blocked, Messenger status updated, payroll deduction flag set if unpaid

### Payroll — Phase 1 (Basic Register)

- Monthly register: base salary + allowances (JSONB) − deductions (JSONB) = net pay
- Leave deductions: auto-applied from approved unpaid leave records
- Overtime: approved timesheet hours exceeding contracted hours × overtime rate
- Payslip PDF: generated on-demand via **Puppeteer** (HTML template → PDF); stored encrypted in R2; accessible to employee and HR only via RLS
- CSV export: payroll register downloadable for Tally, QuickBooks, or any external accounting tool

### Proposals for Future Phases
- Performance review cycles: 360-degree feedback forms on quarterly/annual schedule — Phase 2
- Pulse surveys: anonymous weekly mood surveys; aggregated results visible to HR/Admin only — Phase 2
- Benefits tracker: health insurance, transport allowance, meal credits per employee — Phase 2
- Recruitment pipeline: HR Hiring Pipeline (Module 5) auto-creates employee record when candidate moves to "Hired" — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Performance reviews — add `performance_reviews` table `(id, reviewee_id, reviewer_id, cycle TEXT, responses JSONB, submitted_at)`. Add `performance_review_cycles` table for scheduling. BullMQ cron triggers review form assignments on cycle start date. No change to existing HR tables.

---

## 14. Module 10 — AI Assistant

### How It Works

The AI module is a NestJS service that: receives a user query + current module context, builds a prompt with ERP data filtered by the user's RBAC permissions (the AI never has broader access than the user it serves), calls the Anthropic API, and streams the response via Server-Sent Events (SSE) to the frontend.

### Model Routing

```
Incoming AI request
  → NestJS complexity classifier (keyword + context check)
  → Low complexity (summarize, draft, suggest, KB search):
       → Claude Haiku 3.5 (~₹0.02/1K tokens)
  → High complexity (analyze, structured plans, meeting notes):
       → Claude Sonnet 4 (~₹0.25/1K tokens)
       → Only on explicit user action — never auto-triggered
```

**Prompt caching**: System prompt + ERP context definition (~800 tokens) is identical per user role across all calls. Anthropic caches this prefix at 10% of normal token cost. Effective cost reduction: 70–80% in practice.

**Intent → query mapping**: The AI chat sidebar classifies user intent into one of 30–40 pre-defined Prisma query templates. NestJS executes the matched template. The AI never generates arbitrary SQL — prevents injection and keeps queries predictable and indexable.

### Phase 1 AI Features

| Location | Feature | Model | Trigger |
|---|---|---|---|
| Messenger | Summarize last 50 messages | Haiku | Button click |
| Messenger | Draft reply suggestion | Haiku | Button click |
| Tasks | Generate subtask list from description | Haiku | Button on task create |
| Tasks | Estimate story points | Haiku | Button on task form |
| Calendar | Suggest meeting slots | Haiku | Scheduling modal |
| Ticket | Surface matching KB articles (pgvector) | Haiku | Auto on ticket create |
| HR | Draft job description from role title | Sonnet | HR module button |
| Pipeline | Summarize stalled items | Haiku | Admin dashboard widget |
| Global | Natural language search (intent → Prisma template) | Haiku + pgvector | Global search bar |

### AI Chat Sidebar

Persistent right-side drawer accessible from any page. Example queries:

- "What are my overdue tasks?" → `tasks WHERE assignee = user_id AND due_date < now() AND status != 'done'`
- "Who is on leave this week?" → `leave_requests WHERE status = 'approved' AND date_range overlaps this_week` (filtered by RBAC scope)
- "What tickets are past SLA today?" → `tickets WHERE sla_breach = true` (Admin only)

### Rate Limiting (Cost Protection)

| Role | AI calls/day | Mechanism |
|---|---|---|
| Intern | 20 | Redis counter, 24h TTL key |
| Employee | 50 | Redis counter |
| Team Lead | 100 | Redis counter |
| PM | 150 | Redis counter |
| HR | 100 | Redis counter |
| Admin | 300 | Redis counter |

### Proposals for Future Phases
- Meeting notes: after LiveKit session ends, Whisper API transcribes recording; Claude Haiku generates bullet-point summary with action items; posted to project channel via BullMQ async job — Phase 2
- Anomaly detection: daily BullMQ job passes key metrics snapshot to Claude Haiku (tasks unchanged 5+ days, zero time logs, pipeline items past SLA) → Admin dashboard surface — Phase 2
- Onboarding bot: new employees chat with AI about company policies and first-day tasks — Phase 2

> 🔀 **PHASE 2 MIGRATION**: Meeting notes — register a LiveKit webhook for `room_finished` event. BullMQ `meeting.ended` job: download recording from R2, send audio to OpenAI Whisper API, pass transcript to Claude Haiku for summarization, post to linked project channel. No change to existing AI module architecture — add one new job handler.

---

## 15. Cross-Module Integration Map

All cross-module communication is implemented as BullMQ events. Source module publishes; target modules subscribe and react independently — no direct service-to-service calls.

| Event | Source | Consumers | Automated Actions |
|---|---|---|---|
| `user.created` | HR Admin | Auth, Messenger, Calendar, Tasks | Account provisioned; added to #general; calendar provisioned; onboarding checklist assigned |
| `leave.approved` | HR / Ticket | Calendar, Messenger, Payroll | Calendar blocked; OOO status set; payroll deduction flag if unpaid |
| `task.completed` | Tasks | Projects, Calendar, Active Time | Health score recalculated; calendar event marked done; open timer closed |
| `task.overdue` (cron) | Tasks via BullMQ | Messenger, Ticket | PM notified via DM; optional auto-ticket created |
| `meeting.booked` | Booking / Ticket | Calendar, Messenger | Google Calendar invite sent; LiveKit room pre-created; confirmation email sent |
| `pipeline.stage_changed` | Pipeline | Tasks, Messenger | Automation rules evaluated; auto-tasks created; channel notification posted |
| `time_log.approved` | Active Time | HR Payroll | Approved hours added to monthly payroll register |
| `ticket.sla_breach` (cron) | Ticket via BullMQ | Messenger, Admin Dashboard | Assignee DM'd; escalation posted to admin channel |
| `sprint.completed` | Tasks | AI, Messenger | AI generates sprint summary (Haiku); posted to project channel |
| `user.deactivated` | HR Admin | Auth, Tasks, Calendar, Messenger | Sessions revoked; tasks flagged unassigned; calendar events cancelled; channel history preserved |
| `employee.hired` | HR Pipeline | Auth, HR, Tasks | User account created; employee record created; onboarding checklist spawned |

**Phase 2 additions to this map:**

| Event | Source | Consumers | Automated Actions |
|---|---|---|---|
| `deal.won` | CRM Pipeline | Projects, Messenger | Project auto-created; team notified; AR invoice seeded (Phase 3) |
| `meeting.ended` | LiveKit webhook | AI, Messenger | Whisper transcription + Haiku summary + post to project channel |

---

## 16. Database Schema — Core Tables

**Schema correction from v2.0**: `assignees UUID[]` on the `tasks` table is replaced with a `task_assignees` join table. The array approach creates non-indexable RLS policies (`assignees @> ARRAY[auth.uid()]` causes full table scans at scale). A join table allows indexed lookups and clean RLS.

All timestamps are `TIMESTAMPTZ`. All IDs are `UUID` generated by `gen_random_uuid()`.

```sql
-- =====================
-- IDENTITY & AUTH
-- =====================

CREATE TABLE roles (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  level INT NOT NULL
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  role_id       INT REFERENCES roles(id),
  team_id       UUID, -- FK added after teams table
  department_id UUID, -- FK added after departments table
  manager_id    UUID REFERENCES users(id),
  is_active     BOOLEAN DEFAULT true,
  is_team_lead  BOOLEAN DEFAULT false,
  last_2sv_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE permissions (
  id       SERIAL PRIMARY KEY,
  resource TEXT NOT NULL,
  action   TEXT NOT NULL,
  scope    TEXT NOT NULL,
  UNIQUE(resource, action, scope)
);

CREATE TABLE role_permissions (
  role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_trusted_devices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  ip                 INET,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- ORG STRUCTURE
-- =====================

CREATE TABLE departments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  parent_id UUID REFERENCES departments(id)
);

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  lead_id       UUID REFERENCES users(id)
);

ALTER TABLE users
  ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id),
  ADD CONSTRAINT fk_dept FOREIGN KEY (department_id) REFERENCES departments(id);

-- =====================
-- HR
-- =====================

CREATE TABLE employees (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  employment_id    TEXT UNIQUE,
  employment_type  TEXT NOT NULL, -- full-time, part-time, intern, contract
  start_date       DATE NOT NULL,
  salary_band      TEXT,
  salary_encrypted BYTEA,         -- AES-256-GCM encrypted salary value
  skills           JSONB DEFAULT '[]',
  documents        JSONB DEFAULT '[]' -- [{name, r2_key, uploaded_at}]
);

CREATE TABLE leave_policies (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                         TEXT NOT NULL, -- annual, sick, maternity, unpaid, compensatory
  accrual_days_per_year        INT NOT NULL,
  carry_forward_limit          INT DEFAULT 0,
  requires_approval_above_days INT DEFAULT 3
);

CREATE TABLE leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  type        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payroll_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  month           INT NOT NULL,  -- 1-12
  year            INT NOT NULL,
  base            DECIMAL(12,2) NOT NULL,
  allowances      JSONB DEFAULT '{}',
  deductions      JSONB DEFAULT '{}',
  net             DECIMAL(12,2) NOT NULL,
  payslip_r2_key  TEXT,          -- Cloudflare R2 object key for encrypted PDF
  status          TEXT DEFAULT 'draft', -- draft, finalized
  UNIQUE(user_id, month, year)
);

-- =====================
-- PROJECTS & TASKS
-- =====================

CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  owner_id     UUID REFERENCES users(id),
  team_id      UUID REFERENCES teams(id),
  status       TEXT DEFAULT 'active',
  start_date   DATE,
  end_date     DATE,
  budget       DECIMAL(14,2),
  health_score INT DEFAULT 100, -- 0-100, auto-calculated
  risk_log     JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE milestones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  due_date   DATE,
  status     TEXT DEFAULT 'pending'
);

CREATE TABLE sprints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  goal       TEXT,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  velocity   INT DEFAULT 0
);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id       UUID REFERENCES sprints(id),
  milestone_id    UUID REFERENCES milestones(id),
  reporter_id     UUID REFERENCES users(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  priority        TEXT DEFAULT 'medium', -- low, medium, high, critical
  story_points    INT,
  estimate_hours  DECIMAL(6,2),
  due_date        DATE,
  recurrence_rule TEXT,          -- RFC 5545 RRULE
  archived        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
-- Partition by project_id at Phase 3 when task table exceeds 1M rows

-- CORRECTED: join table replaces assignees UUID[] array
CREATE TABLE task_assignees (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

CREATE TABLE task_links (
  task_id        UUID REFERENCES tasks(id) ON DELETE CASCADE,
  linked_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type           TEXT NOT NULL, -- blocks, duplicates, relates_to
  PRIMARY KEY (task_id, linked_task_id, type)
);

CREATE TABLE task_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  completed BOOLEAN DEFAULT false
);

CREATE TABLE task_watchers (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE time_logs (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id  UUID REFERENCES tasks(id),
  user_id  UUID REFERENCES users(id),
  hours    DECIMAL(6,2) NOT NULL,
  date     DATE NOT NULL,
  note     TEXT,
  approved BOOLEAN DEFAULT false
);

CREATE TABLE task_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  meta       JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE board_columns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  order_idx  INT NOT NULL,
  max_cards  INT -- WIP limit; NULL = no limit
);

CREATE TABLE board_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  column_counts JSONB NOT NULL, -- {column_id: count}
  UNIQUE(project_id, date)
);

-- =====================
-- MESSAGING
-- =====================

CREATE TABLE channels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL, -- public, private, announcement
  created_by UUID REFERENCES users(id),
  topic      TEXT,
  archived   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member', -- member, owner
  PRIMARY KEY (channel_id, user_id)
);

-- Partitioned by channel_id hash for query performance
CREATE TABLE messages (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL,
  sender_id   UUID REFERENCES users(id),
  content     TEXT,
  edited      BOOLEAN DEFAULT false,
  deleted     BOOLEAN DEFAULT false,
  reply_to_id UUID,               -- self-reference within partition
  created_at  TIMESTAMPTZ DEFAULT now()
) PARTITION BY HASH (channel_id);

CREATE TABLE message_reactions (
  message_id UUID, -- not FK due to partitioning
  user_id    UUID REFERENCES users(id),
  emoji      TEXT NOT NULL,
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE message_receipts (
  message_id   UUID,
  user_id      UUID REFERENCES users(id),
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

-- =====================
-- CALENDAR
-- =====================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES users(id),
  title           TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  type            TEXT NOT NULL, -- personal, team, company, milestone, leave, booking
  recurrence_rule TEXT,
  video_link      TEXT,
  visibility      TEXT DEFAULT 'team', -- private, team, public
  google_event_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_attendees (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES users(id),
  status   TEXT DEFAULT 'pending', -- pending, accepted, declined
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE booking_availability (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week    INT NOT NULL, -- 0=Sunday, 6=Saturday
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  buffer_minutes INT DEFAULT 0
);

-- =====================
-- PIPELINE
-- =====================

CREATE TABLE pipelines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL, -- hr_hiring, project_approval, support, onboarding, crm
  owner_role TEXT NOT NULL  -- which role manages this pipeline
);

CREATE TABLE pipeline_stages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id           UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  order_index           INT NOT NULL,
  sla_hours             INT,
  required_fields       JSONB DEFAULT '[]', -- field schema for transition modal
  completion_probability INT DEFAULT 0,     -- for CRM forecasting (Phase 2)
  allowed_next_stages   UUID[] DEFAULT '{}'
);

CREATE TABLE pipeline_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id      UUID REFERENCES pipelines(id),
  current_stage_id UUID REFERENCES pipeline_stages(id),
  owner_id         UUID REFERENCES users(id),
  title            TEXT NOT NULL,
  value            DECIMAL(14,2),   -- optional; used by CRM deals in Phase 2
  priority         TEXT DEFAULT 'medium',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID REFERENCES pipeline_items(id) ON DELETE CASCADE,
  from_stage_id   UUID REFERENCES pipeline_stages(id),
  to_stage_id     UUID REFERENCES pipeline_stages(id),
  actor_id        UUID REFERENCES users(id),
  note            TEXT,
  transitioned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_automation_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id      UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  trigger_stage_id UUID REFERENCES pipeline_stages(id),
  conditions       JSONB DEFAULT '{}',
  actions          JSONB DEFAULT '[]'
);

-- =====================
-- TICKETS
-- =====================

CREATE TABLE tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                TEXT NOT NULL,
  subject             TEXT NOT NULL,
  description         TEXT,
  priority            TEXT DEFAULT 'medium',
  status              TEXT NOT NULL DEFAULT 'open',
  requester_id        UUID REFERENCES users(id),
  assignee_id         UUID REFERENCES users(id),
  sla_clock_starts_at TIMESTAMPTZ,
  first_response_at   TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES users(id),
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id),
  from_status TEXT,
  to_status   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ticket_feedback (
  ticket_id  UUID PRIMARY KEY REFERENCES tickets(id),
  rating     INT CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kb_articles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  embedding  vector(1536),  -- pgvector; populated by embedding job (Phase 2 activation)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
-- Index created in Phase 2: CREATE INDEX ON kb_articles USING ivfflat (embedding vector_cosine_ops);

-- =====================
-- ACTIVE TIME
-- =====================

CREATE TABLE attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  date          DATE NOT NULL,
  clock_in      TIMESTAMPTZ,
  clock_out     TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- =====================
-- CRM — PHASE 2 TABLES
-- (schema defined now so foreign keys are clean; columns nullable/minimal until Phase 2 activation)
-- =====================

CREATE TABLE contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  company           TEXT,
  source            TEXT,
  owner_id          UUID REFERENCES users(id),
  tags              TEXT[] DEFAULT '{}',
  last_contacted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         UUID REFERENCES contacts(id),
  pipeline_item_id   UUID REFERENCES pipeline_items(id),
  value              DECIMAL(14,2),
  currency           TEXT DEFAULT 'INR',
  probability        INT CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE
);
```

---

## 17. Scalability Roadmap

The architecture is designed so every scaling step is an **operational change, not a code rewrite**.

| Bottleneck | Appears When | Solution | Code Changes? |
|---|---|---|---|
| DB read contention | >500 concurrent users | Supabase read replica; analytics queries routed to replica via Prisma datasource | No |
| API CPU | >500 req/sec sustained | Render auto-scaling OR Hetzner VPS + PM2 cluster (all CPU cores) | No |
| Socket.io connections | >1,000 concurrent | Redis adapter already in place; add second NestJS instance behind Cloudflare load balancer (sticky sessions required) | No |
| Video costs | >₹2,500/mo | Self-host LiveKit on Hetzner CX41; update `LIVEKIT_HOST` env var | No |
| File storage | >10GB | R2 charges $0.015/GB above free — pay as you go | No |
| Search latency | >100ms | Add Meilisearch on Render ($7/mo); index tasks, messages, tickets | Minimal |
| AI cost | >₹10,000/mo | Verify prompt caching is active; shift more to Haiku; tighten rate limits | Config only |
| Task table | >1M rows | Add `PARTITION BY HASH (project_id)` — already noted in schema | Migration only |
| Multi-tenancy | Phase 4 | Add `org_id` to every table; Postgres RLS filters by `org_id` | Additive only |

### Phase 3 Infrastructure (500–5,000 users) — ~₹45,000/month
- Self-hosted Postgres primary + read replica on Hetzner CCX23 (4 vCPU, 16GB RAM)
- NestJS on Hetzner with Docker + Nginx + PM2 cluster mode
- Redis on same Hetzner instance
- Self-hosted LiveKit on Hetzner CX41
- Meilisearch on separate Render instance
- Kubernetes only at >2,000 concurrent users — not before

---

## 18. Phase 1 Delivery Plan

**Goal**: Full internal collaboration platform replacing Slack + Zoom + Trello + basic HRMS. Cost: ~₹1,530/month.

### Month 1 — Infrastructure & Auth

- Turborepo monorepo setup: `apps/web`, `apps/api`, `packages/types`, `packages/ui`, `packages/config`
- Supabase project: full schema migrations, RLS policies for all Phase 1 tables
- Auth module: login, TOTP 2FA, JWT strategy, device trust table, session management
- RBAC engine: roles table seeded, permissions table, NestJS guards, Redis permission cache
- Team Administration: add user form, CSV bulk import, role assignment, org chart (D3.js)
- Cloudflare DNS setup, Render Docker deploy, Vercel Next.js deploy

### Month 2 — Communication

- Messenger: DMs, channel types (public/private/announcement), Socket.io delivery, message states
- Cloudflare R2 presigned upload for file attachments
- Unified notification engine: in-app Socket.io + Resend email for all modules
- AI sidebar: Haiku only — task search, basic Q&A over own data
- BullMQ event bus foundation: `user.created` event and consumers

### Month 3 — Work Management

- Projects & Tasks: full hierarchy, list view, Kanban view, Gantt (D3.js), sprint board, backlog
- Active Time: clock in/out, task timer (Redis state), presence status, Admin oversight dashboard
- Calendar: Day/Week/Month/Agenda views, Google Calendar OAuth2 bidirectional sync, ERP auto-events
- Booking system: availability windows, booking link, external bookings, Resend confirmations
- BullMQ events: `task.completed`, `task.overdue`, `leave.approved`, `meeting.booked`

### Month 4 — Operations & Polish

- LiveKit video integration: instant meetings from DMs and Calendar, recordings to R2
- Pipeline module: engine, automation rules, all 4 Phase 1 pipeline configs, funnel view
- Ticket system: all ticket types, SLA engine, meeting request flow, escalation
- HR module: employee records, leave management, payroll register, Puppeteer payslip PDF
- Mobile PWA: Next.js PWA config — no separate native app needed at Phase 1
- Security audit, load testing at 100 concurrent users, bug fixes
- Documentation: API docs (NestJS Swagger), deployment runbook, module ownership guide

---

*ERP Platform Blueprint v3.0 | Phase 1 Build-Ready*
*Corrections applied from v2.0: Module Federation removed → Next.js dynamic imports; `assignees UUID[]` → `task_assignees` join table; `pdf-lib` → Puppeteer; device trust clarified as NestJS custom logic; sticky sessions noted for Socket.io; embedding model specified (Voyage/OpenAI, not Claude); pgvector index deferred to Phase 2 activation.*
*References: Linear, Plane, ERPNext/Frappe, Notion, Chatwoot, Supabase, LiveKit production deployments.*