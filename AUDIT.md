# 🔍 Project Audit Report — MP-MLA Constituency Management System

| | |
|---|---|
| **Document** | Full Technical & Production-Readiness Audit |
| **Version Audited** | v1.0 baseline (`main` branch) |
| **Scope** | `backend/`, `frontend/`, `master-dashboard/` |
| **Method** | Manual line-by-line review of security-critical paths + pattern scans across all 700+ source files |
| **Overall Risk Rating** | 🔴 **HIGH — Not production-ready until Critical items are fixed** |

---

## Executive Summary

The application is architecturally sound — tenant isolation is structurally enforced via middleware-injected tenant-scoped Prisma clients, RBAC is database-driven and re-checked server-side on every route, refresh-token rotation includes reuse detection, and account lockout protects credentials. This puts the project ahead of most first-version builds.

However, several **critical security misconfigurations** currently undermine these strengths: the global and auth rate limiters are **commented out**, CORS allows any origin with credentials, JWT tokens live in **localStorage** (XSS-stealable), uploaded citizen identity documents are served from an **unauthenticated static route**, and refresh tokens are stored **in plaintext in the database**. Combined with zero test coverage, no CI pipeline, and a settings page that silently fakes saving data, the project should not touch real constituents' data until the P0 list is cleared.

### Severity Dashboard

| Severity | Count | Summary |
|---|---|---|
| 🔴 Critical | 6 | Must fix before any production deployment |
| 🟠 High | 9 | Fix within the first production sprint |
| 🟡 Medium | 12 | Schedule within 1–2 sprints |
| ⚪ Low / Hardening | 10+ | Backlog improvements |
| ✅ Strengths | 12 | Things done right — keep them |

---

## Table of Contents

1. [Critical Findings (P0)](#1-critical-findings-p0)
2. [High Findings (P1)](#2-high-findings-p1)
3. [Security Audit — Detailed](#3-security-audit--detailed)
4. [Bugs & Functional Defects](#4-bugs--functional-defects)
5. [Performance Audit](#5-performance-audit)
6. [User Experience Audit](#6-user-experience-audit)
7. [Code Quality & Maintainability](#7-code-quality--maintainability)
8. [Data Privacy & Compliance](#8-data-privacy--compliance)
9. [Infrastructure, DevOps & Release Readiness](#9-infrastructure-devops--release-readiness)
10. [What Is Done Well ✅](#10-what-is-done-well)
11. [Prioritized Remediation Roadmap](#11-prioritized-remediation-roadmap)
12. [Go-Live Checklist](#12-go-live-checklist)

---

## 1. Critical Findings (P0)

> Each finding cites file and line evidence. Fix order = listed order.

### CRIT-01 · Rate limiting is disabled in the production code path
**File:** `backend/src/app.ts` lines 36–37, 73–74

```ts
// app.use(globalLimiter);                  ← commented out
// app.use("/api/admin/auth", authLimiter);  ← commented out
```

Both limiters are fully implemented in `middleware/rateLimiter.ts` (15-min window; 100 req global, 10 req auth) but never mounted. Consequences:

- Unthrottled credential stuffing against `/api/admin/auth/login`. The per-account lockout in `login.ts` only triggers after N failures *per account* — an attacker can rotate across thousands of emails at line speed.
- Unthrottled scraping of every list endpoint by any valid session.
- The public institution-registration endpoint (`routes/public/index.ts`) accepts unlimited multipart uploads — free disk-fill DoS.

**Fix:** Uncomment both lines. Add a dedicated limiter to `/api/public/*`.

### CRIT-02 · CORS wildcard with credentials
**File:** `backend/src/app.ts` lines 29–35

```ts
app.use(cors({
  // origin: process.env.FRONTEND_URL || "http://localhost:5173",
  origin: "*",          // ← any website can call the API
  credentials: true,
}));
```

Any malicious web page may issue credentialed requests against your API from a victim's browser. The restrictive config exists directly above it — commented out.

**Fix:** Restore the env-driven origin allow-list. Never ship `origin: "*"` with `credentials: true`.

### CRIT-03 · Citizen KYC documents served without authentication
**Files:** `backend/src/app.ts` lines 49–60; `backend/src/lib/upload.ts`; `backend/src/routes/public/index.ts`

All uploads land under `public/uploads/**` and are exposed via `express.static` **before any auth middleware**. This directory holds institution-request files: **identity proofs, address proofs**, alongside stored Aadhaar numbers (`headAdharNumber`). Anyone with a URL can download citizens' KYC documents — no permission check, no tenant check, no audit entry.

**Fix:** Serve uploads through an authenticated controller verifying requester's tenant ownership + read permission. Keep static serving only for public branding assets (logos).

### CRIT-04 · Refresh tokens stored in plaintext in the database
**Files:** `backend/src/routes/admin/auth/login.ts` lines 176–197; `refresh.ts` lines 27–28

The full signed refresh-token JWT is written verbatim into `RefreshToken.token` and looked up via `findUnique({ where: { token } })`. One DB dump / backup leak = mass session hijack of every active user across all tenants.

**Fix:** Store only a SHA-256 hash of the token; look up by hash. Existing rotation + reuse-detection logic remains unchanged.

### CRIT-05 · Access & refresh tokens persisted in localStorage
**Files:** `frontend/src/lib/auth.ts` (lines 21, 46, 63); mirrored in `master-dashboard/src/lib/auth.ts` (`platform_refreshToken`)

```ts
localStorage.setItem("refreshToken", token);
```

localStorage is readable by any injected script (compromised npm dependency, CDN asset, browser extension). Combined with `dangerouslySetInnerHTML` usages found in both apps (`components/ui/chart.tsx`, `contexts/LanguageContext.tsx`), XSS → token theft is a realistic chain. Tokens also survive browser closure indefinitely.

**Fix (minimum):** Hold access token in memory only; move refresh token to an HttpOnly, Secure, SameSite=Strict cookie scoped to the refresh endpoint.

### CRIT-06 · Zero automated tests, zero CI pipeline
**Repo-wide:** no `*.test.*`/`*.spec.*` files exist anywhere; backend `package.json` has no test script; `.github/workflows` absent.

Every release is a manual gamble. With voter data and Aadhaar numbers in scope, regressions in permission checks or tenant scoping must never be discovered in production.

**Fix — minimum viable safety net before go-live:**
1. Integration tests for the middleware chain asserting cross-tenant access is impossible.
2. Auth smoke tests: login, lockout thresholds, refresh-token reuse revocation.
3. GitHub Actions running lint + build + tests on every PR.

---

## 2. High Findings (P1)

### HIGH-01 · Settings page silently fakes saving (both apps)
**Files:** `frontend/src/pages/settings/SettingsPage.tsx` lines 465–468; `master-dashboard/src/pages/settings/SettingsPage.tsx` lines 409–412

```ts
setSaving(true);
await new Promise((r) => setTimeout(r, 600));   // ← artificial delay
localStorage.setItem("user_location", JSON.stringify(location));
setSaving(false);
setSaved(true);
```

The location settings form shows "Saved ✔" but writes only to localStorage — **the backend is never called and the value is lost for every other user/device**. This is a data-loss bug disguised as a success state.

**Fix:** Wire the form to `PUT /admin/settings`; remove the fake delay; show real API errors on failure.

### HIGH-02 · Module gating keys are inconsistent → plan-gating leaks
**File:** `backend/src/routes/admin/index.ts` lines 58–80

```ts
router.use("/tasks",   requireModule("dashboard"), taskRoutes);
router.use("/schemes", requireModule("dashboard"), schemeRoutes);
router.use("/crm",     requireModule("dashboard"), crmRoutes);
router.use("/events",  requireModule("meeting", "events", "dashboard"), eventRoutes);
router.use("/janata-darbar", requireModule("meeting", "dashboard"), janataDarbarRoutes);
```

Tasks, Schemes, and CRM are gated on the **"dashboard" module key** instead of their own modules (`tasks`, `schemes`, `crm`). Consequences:
- A plan without Tasks/Schemes still grants full access whenever Dashboard is enabled.
- You can never sell these as separate paid modules.
- Events/Appointments/Janata Darbar pass if *any* of three keys match — fuzzy entitlement.

**Fix:** One canonical module key per router; update the seed's module list to match.

### HIGH-03 · Unbounded JSON body limit
**File:** `backend/src/app.ts` line 46 — `express.json({ limit: "50mb" })`

50 MB parsed-JSON bodies on every route is a memory-exhaustion DoS vector (a few concurrent large posts can OOM the Node process). Legitimate JSON payloads here are < 100 KB; files go through multipart.

**Fix:** Reduce to `1mb` globally; raise per-route only where genuinely needed.

### HIGH-04 · Upload validation checks MIME label, not file content
**File:** `backend/src/lib/upload.ts` lines 38–49 (`ALLOWED_MIME_TYPES.has(file.mimetype)`)

`file.mimetype` is attacker-controlled (it's just a header from the multipart body). An executable/script renamed with an image MIME passes the filter. Files are then served back by static route (CRIT-03) with that content type.

**Fix:** Sniff magic bytes (e.g., `file-type` package) in addition to MIME; force `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` when serving user uploads.

### HIGH-05 · Session timeout setting allows 365-day access tokens
**File:** `backend/src/routes/admin/auth/login.ts` lines 157–174

```ts
const expiresIn = sessionTimeout === 0 ? "365d" : `${sessionTimeout}m`;
```

A tenant setting of `0` ("unlimited") mints an access token valid for **one year** — unrevocable without rotating `JWT_SECRET` (which logs out every tenant simultaneously). There is no token revocation list.

**Fix:** Cap access-token lifetime at e.g. 24 h regardless of setting; treat "unlimited" as long refresh lifetime only. Consider a `tokenVersion` claim per user for instant revocation.

### HIGH-06 · Duplicate tenant/subscription DB queries on every request
**Files:** `middleware/auth.ts` `requireActiveUser` (lines 80–99) vs `middleware/tenantContext.ts` `injectTenantContext` (lines 66–76)

Both middlewares fetch the same tenant + subscription rows on every single authenticated request, and `requirePermission` adds up to 3 more queries (user role → permission → override/role-default). That is **5–7 DB round-trips of pure authorization overhead per request**, multiplied across every widget call the dashboard makes.

**Fix:** Fetch once in `requireActiveUser` and stash results on `req`; cache permission lookups per (userId, version) in memory with short TTL or LRU.

### HIGH-07 · Build artifacts & dev logs committed to git
**Evidence:** `frontend/dist/`, `frontend/dist/assets/`, `master-dashboard/dist/`, `vite-dev.out.log`, `vite-dev.err.log` are tracked; root has **no `.gitignore`** (only nested ones if any).

Risks: stale bundles deployed accidentally, repo bloat, and dist contents bypassing source review. `.env` is currently not committed (✅ verified via `git ls-files`) but nothing prevents an accidental future commit.

**Fix:** Add root `.gitignore` (`dist/`, `*.log`, `.env*` except examples), `git rm -r --cached` the artifacts.

### HIGH-08 · `.env.example` is incomplete versus actual required config
**Verified:** backend `.env.example` covers DB/JWT/server/rate-limit/upload keys but **omits** variables the code reads: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, DeepSeek/Gemini keys, WhatsApp provider config, `MAX_FAILED_LOGINS`-related tenant defaults, mail SMTP keys.

New deployments silently run with empty-string fallbacks (`razorpay.service.ts` line 15–16 falls back to `""`) and fail at runtime in payment/AI flows.

**Fix:** Regenerate `.env.example` from `grep process.env` across the codebase; fail fast at boot when production-required vars are missing.

### HIGH-09 · Public endpoints have no anti-abuse controls
**File:** `backend/src/routes/public/index.ts` (entire file)

The citizen registration endpoint accepts arbitrary multipart uploads + DB writes with zero rate limiting, zero captcha, zero email verification, and no duplicate suppression. Attack surface: spam requests polluting staff review queues, storage exhaustion, email bombing of the org inbox (fire-and-forget notification per submission).

**Fix:** Rate-limit by IP, add honeypot/captcha, cap submissions per IP/day, dedupe by phone+institution name.

---

## 3. Security Audit — Detailed

### 3.1 Authentication & Session Management

| Check | Result | Notes |
|---|---|---|
| Password hashing | ✅ Good | bcryptjs, salt rounds default 12 (`lib/env.ts`), env-configurable |
| Brute force (per account) | ✅ Good | `failedLoginCount` + `lockedUntil` lockout in `login.ts`; settings-driven thresholds |
| Brute force (per IP) | 🔴 Broken | `authLimiter` never mounted — see CRIT-01 |
| Refresh rotation | ✅ Good | New token per refresh; reuse of a revoked token revokes the whole family (`refresh.ts` lines 32–43) |
| Refresh storage at rest | 🔴 Critical | Plaintext JWT in DB — CRIT-04 |
| Token client storage | 🔴 Critical | localStorage — CRIT-05 |
| Logout server-side | ✅ Good | Revokes refresh record |
| Account enumeration | 🟡 Partial | Login errors are generic ✅; but "Account locked until HH:MM" and the multi-tenant "tenant ID required for this email" message both leak account existence |
| Password policy | 🟡 Missing | No minimum complexity enforced anywhere (seed passwords are fine, but user creation accepts anything) |
| Password expiry | ✅ Present | `isPasswordExpired` + `forcePasswordChange` flow |

### 3.2 Authorization

| Check | Result | Notes |
|---|---|---|
| Server-side permission checks | ✅ Excellent | `requirePermission(module, action)` on every admin route; deny-by-default (`permissions.ts` returns false when unsure) |
| Role hierarchy | ✅ Good | SYSTEM_ADMIN bypass documented; overrides beat role defaults beat nothing |
| Tenant isolation | ✅ Structural | `injectTenantContext` creates tenant-scoped Prisma; handlers use `req.tenantPrisma`; cross-tenant mismatch explicitly rejected (`permission.ts` lines 31–33) |
| Module entitlements | ⚠️ Leaky | Wrong/fuzzy module keys on tasks/schemes/crm/events routers — HIGH-02 |
| IDOR within tenant | ✅ Low risk | Detail routes use `findFirst({ id, tenantId })` pattern (verified in grievance read/update paths) |
| Platform realm separation | ✅ Good | Separate `PlatformUser`, separate middleware, `accountType` claim validated in `authenticate()` |

### 3.3 Input Validation & Injection

| Check | Result | Notes |
|---|---|---|
| Body validation | ✅ Good | Zod schemas via `validate()` middleware on mutating routes; errors formatted safely |
| SQL injection | ✅ Safe | All 9 raw queries are Prisma **tagged templates** (parameterized), confined to ops scripts |
| Query-string filters | 🟡 Soft | List filters cast via `req.query as Record<string,string>` without schema validation — harmless with ORM but enables odd filter probing; validate with Zod for consistency |
| XSS | 🟡 Medium | React escapes by default; 4 `dangerouslySetInnerHTML`/`innerHTML` sites found — all currently inject static strings (chart themes CSS, translate-hide CSS) → not exploitable today, but establish a lint rule banning new uses without review. The real XSS vector is stored content rendered elsewhere plus CRIT-05 token storage |
| File upload | 🔴 Weak | MIME-label only; no magic bytes; see HIGH-04 |
| Mass assignment | 🟡 Partial | Zod schemas cover create/update bodies; several update paths spread unvalidated `req.body` fields — audit each `updateX` handler for field allow-listing |

### 3.4 Transport & Headers

| Check | Result | Notes |
|---|---|---|
| Helmet | ✅ Enabled | With `crossOriginResourcePolicy: cross-origin` (needed for uploads cross-app) |
| CSP | 🔴 Weak | The only custom CSP (uploads route, `app.ts` line 55) allows `unsafe-inline unsafe-eval *`; no app-wide CSP configured. Add strict CSP to the HTML apps via Vite plugin or reverse proxy |
| HSTS / HTTPS redirect | ❌ Absent | Nothing enforces TLS; must be handled at proxy AND `trust proxy` + HSTS set for correct rate-limit IPs behind load balancers |
| Trust proxy | ❌ Not set | Behind nginx/ALB, `express-rate-limit` and login IP capture will read proxy IPs unless `app.set("trust proxy", 1)` is configured — this also breaks the IP-allow-list login feature |
| Cookie flags | N/A→planned | Once tokens move to cookies (CRIT-05 fix) |

### 3.5 Logging & Monitoring

| Check | Result | Notes |
|---|---|---|
| Structured logging | ✅ Good | Winston + morgan combined logs |
| Error sanitization | ✅ Good | 500s hide internals outside development (`errorHandler.ts`) |
| Audit trail | ✅ Strong | Login/logout/status changes recorded with IP+UA (`getRequestMeta`); DB mutations audited by middleware |
| Security alerting | ❌ Absent | No alerting on lockout spikes, repeated 403s, or refresh-reuse events (which indicate active token theft!) — wire these to email/Slack |
| PII in logs | 🟡 Risk | Morgan combined logs full URLs — verify no ticket search terms/complaint names end up in query strings that get logged |

---

## 4. Bugs & Functional Defects

| # | Severity | Where | Defect |
|---|---|---|---|
| BUG-01 | 🟠 High | `frontend + master-dashboard SettingsPage.tsx` (lines 465/409) | Location settings never persist to backend — fake 600 ms delay then "Saved". See HIGH-01. Users on other devices see stale data. |
| BUG-02 | 🟠 High | `backend/src/routes/admin/grievance/read.ts` line 76 | `orderBy: [{ priority: "asc" }]` sorts **alphabetically**, not by severity: HIGH < LOW < MEDIUM < URGENT. The "most urgent first" list actually shows HIGH → LOW → MEDIUM → URGENT. Fix with an explicit enum order via `orderBy` on a mapped sort field or raw case expression. Verify same pattern in tasks list. |
| BUG-03 | 🟡 Medium | `frontend/src/lib/queryClient.ts` lines 10–42 | Two parallel HTTP stacks exist: axios instance (`lib/api.ts`, token-aware) and legacy fetch helpers (`apiRequest`/`getQueryFn`) that send **no Authorization header** (only `credentials: "include"`, which the API's Bearer auth ignores). Any query still using this default queryFn silently hits 401 against protected routes. Delete or migrate to the axios client. |
| BUG-04 | 🟡 Medium | `backend/src/routes/admin/index.ts` lines 66–80 | Tasks/Schemes/CRM gated to wrong module key (`dashboard`) — plan-based disabling impossible; also `/schemes` mounted twice historically (line 68 commented, line 79 active). Consolidate. |
| BUG-05 | 🟡 Medium | `backend/src/lib/upload.ts` `deleteFile()` | Path reconstruction joins `UPLOAD_DIR + ".." + sanitized path`; relies on callers passing canonical `/uploads/...` strings. A stored URL with `..%2f`-style tricks persisted earlier could escape — currently mitigated because stored names are server-generated, but add `path.resolve` containment check for defense-in-depth. |
| BUG-06 | 🟡 Medium | `login.ts` line 152 | On successful login `forcePasswordChange: user.forcePasswordChange \|\| hasExpired` is *written back* but login still returns tokens — if password expired the user enters the app before being forced to change it. Ensure frontend enforces redirect AND consider blocking data endpoints until changed. |
| BUG-07 | ⚪ Low | `frontend/src/App.tsx` line ~656 | `/change-password` route sits outside `ProtectedRoute` — reachable while logged out; page presumably errors or no-ops. Wrap it. |
| BUG-08 | ⚪ Low | `bin/www.ts` lines 11–30 | Monkey-patches `Node.prototype.removeChild` globally as a Google Translate workaround — fragile, masks real DOM bugs, applies to all tenants. Replace with translate="no" attributes / MutationObserver scoped fix. |
| BUG-09 | ⚪ Low | Seed data | Demo passwords (`Admin@123456` etc.) documented in USER_MANUAL — ensure seed refuses to run when `NODE_ENV=production`. Currently unguarded. |
| BUG-10 | ⚪ Low | `errorHandler.ts` | Returns `err.message` verbatim for ApiError including internal validation phrasing (e.g., Prisma P2002 meta could reveal field names) — acceptable, but standardize user-facing copy. |

---

## 5. Performance Audit

### 5.1 Database & API

| Finding | Impact | Evidence / Fix |
|---|---|---|
| **Authorization costs 5–7 queries/request** (HIGH-06) | Every widget call pays it; dashboard fires dozens of calls on load | Cache permission resolution per-user with short TTL; single fetch of tenant+subscription reused across middlewares |
| **`contains: insensitive` search on 5 fields** (grievance list) | Full table scan per keystroke-driven search once grievances reach lakhs | Add Postgres trigram GIN index (`pg_trgm`) on searched columns, or debounce + dedicated search endpoint |
| No response compression | JSON lists are highly compressible; mobile staff users suffer | Add `compression` middleware at app level |
| Pagination defaults | ✅ Present (`parsePagination`) — good; verify max `limit` clamp exists server-side (cap at e.g. 100) to prevent `limit=100000` exports through list endpoints | |
| `_count` subqueries per row (timeline+attachments) | Acceptable at current scale; revisit if list pages slow | Consider denormalized counts for hot paths |
| Background jobs run in-process (`meetingScheduler`, `subscriptionSweep`) | Fine now; becomes a correctness risk with >1 API replica (double reminders) | Move to BullMQ/pg-boss or guard with advisory lock when scaling horizontally |
| Excel export builds full workbook in memory | Large voter exports can OOM | Stream rows via ExcelJS streaming writer for >50k rows |
| No DB index audit performed | Schema has ~90 models; verify composite indexes on `(tenantId, status)`, `(tenantId, createdAt)` for hottest tables | Run `EXPLAIN` on top-10 queries under production-like data volume |

### 5.2 Frontend

| Finding | Impact | Fix |
|---|---|---|
| `exceljs` bundled into the web apps (`frontend/package.json`) | Heavy dependency likely only used for parsing imports — inflates bundle | Keep import-parsing lazy-loaded (`dynamic import()`), or move parsing to a Web Worker |
| Leftover unused deps | `drizzle-orm`, `drizzle-zod`, `express`, `express-session`, `connect-pg-simple`, `memorystore` in **frontend** package.json — dead weight & audit noise | Remove from frontend/master-dashboard manifests |
| TanStack Query config | ✅ Sensible: 5-min staleTime, no refetch-on-focus, retries off | Add `refetchInterval` selectively for dashboard widgets instead of manual refresh buttons |
| Route-level code splitting | All pages imported statically in `App.tsx` → one large initial bundle | Convert page imports to `React.lazy()` + Suspense; expect major LCP improvement |
| Google Translate integration | Loads third-party script + DOM hacks (see BUG-08); layout shift + perf cost | Evaluate self-hosted i18n dictionaries (LanguageContext already exists) and drop Google Translate entirely |

---

## 6. User Experience Audit

| # | Area | Finding | Recommendation |
|---|---|---|---|
| UX-01 | Session expiry | On refresh failure the app does `window.location.href = "/login"` — full reload, lost filters/draft forms | Show a session-expired modal with inline re-login; preserve route state |
| UX-02 | Error surfaces | Legacy fetch path throws raw `"401: Unauthorized"` style strings to users (`queryClient.ts`) | Route all errors through a human-readable mapper; log technical detail to console only |
| UX-03 | Settings honesty | "Saved" shown without persistence (HIGH-01/BUG-01) destroys trust in the whole settings area | Fix persistence; add optimistic-update rollback on API failure |
| UX-04 | Grievance list ordering | Urgent tickets buried below HIGH due to alphabetical sort (BUG-02) — staff may miss critical complaints | Severity-aware sort + colored urgency indicators at top of list |
| UX-05 | Language switching | Google Translate-based translation causes flicker, broken nested translations, and required a global DOM monkey-patch to stop crashes (`bin/www.ts`) | Replace with real i18n dictionary (LanguageContext infrastructure already exists); keep translate="no" on data tables |
| UX-06 | Bulk import feedback | Import job pattern is good (per-row errors); ensure error report is downloadable for 10k-row files | Add "Download error report" XLSX button |
| UX-07 | Empty/loading states | Skeleton & empty-state components exist ✅ — verify all ~50 list pages use them consistently | Consistency audit pass |
| UX-08 | Public registration form | No reference number or review-time expectation shown after submission | Return & display request reference ID + expected review time |
| UX-09 | Mobile use | Staff work from phones on site visits; verify sidebar layout at 360 px; big tables and date pickers are common pain points | Responsive audit with real device matrix; bottom-sheet patterns for mobile forms |
| UX-10 | Accessibility basics | Radix primitives give keyboard support ✅; check color-only status badges, focus rings, Hindi label coverage | axe-core automated scan in CI |

---

## 7. Code Quality & Maintainability

### Strengths observed
- Consistent route-per-concern structure (create/read/update/delete files per module).
- TypeScript everywhere including shared types via `@shared` alias.
- Zod validation centralized; `ApiError` class gives uniform error shape.
- Prisma schema well-normalized with enum-driven workflows.
- Comments explain *why* (AC-references show acceptance-criteria traceability).

### Issues

| # | Issue | Evidence | Recommendation |
|---|---|---|---|
| CQ-01 | Pervasive `any` typing | `req.query as Record<string,string>`; nearly every frontend API payload typed `data: any` in `lib/api.ts` | Generate DTO types from Prisma/shared package; enable strict ESLint `no-explicit-any` progressively |
| CQ-02 | Dead code & commented security controls shipped | Commented CORS/rate-limiters (app.ts), commented queryClient block, old schemes router | Delete; git preserves history. Dead security code erodes trust — CRIT-01/02 exist because config was commented instead of changed |
| CQ-03 | Duplicated code between `frontend` and `master-dashboard` | `components/ui`, `LanguageContext.tsx`, `lib/auth.ts`, `lib/api.ts` duplicated verbatim; already diverging via platform_ key prefixes | Extract shared workspace package (npm/Vite workspace) for UI kit + auth/api utilities |
| CQ-04 | Mixed HTTP clients in one app | axios + fetch stacks coexist (BUG-03) | Standardize on axios instance; delete fetch helpers |
| CQ-05 | Business logic embedded in controllers | Login flow = IP rules + lockout + tokens + audit in one 230-line function | Extract service layer — prerequisite for CRIT-06 tests |
| CQ-06 | Magic strings for statuses client-side | StatusBadge maps and filter options hardcoded per page | Export enum lists from shared package as single source of truth |
| CQ-07 | No root lint/format configuration | Style drift likely between modules | Add ESLint + Prettier to CI |

---

## 8. Data Privacy & Compliance

This system stores **voter rolls, Aadhaar numbers, complainant identities, and KYC documents** — among the most sensitive data classes in the Indian context (DPDP Act 2023 applies).

| Requirement | Current State | Gap Action |
|---|---|---|
| Access control on personal data | RBAC + voter module gating ✅ | Unauthenticated upload serving (CRIT-03) breaks it end-to-end |
| Data minimization | Aadhaar number collected for institution heads without masking or evident necessity | Mask display (XXXX-XXXX-1234); justify collection or drop field |
| Retention & deletion | Soft-delete + Recycle Bin ✅ | No purge schedule for recycle-bin entries or expired tenants; define 30-day purge + tenant-offboarding export/delete procedure |
| Consent & notice (public form) | Public form collects submitter/head personal data with **no privacy notice or consent checkbox** | Add consent text + privacy notice; retain consent metadata |
| Breach detection & response | Refresh-reuse detection exists ✅ | Add alerting (§3.5), incident runbook, breach-notification workflow |
| Hosting / residency | Not documented | Document data residency; India hosting advisable for government-adjacent data |
| Data subject requests | No tool to find/export/delete one citizen's data across grievances+applications+uploads | Build admin "subject search" tool — also useful for real office work |
| Encryption at rest | Depends on Postgres/volume config | Enable disk/RDS encryption; encrypt uploads volume; document backup encryption |

---

## 9. Infrastructure, DevOps & Release Readiness

| Area | Finding | Action |
|---|---|---|
| Containerization | No Dockerfile / docker-compose for API, DB, or frontends | Add compose (api + postgres) for reproducibility; multi-stage prod images |
| CI/CD | None (CRIT-06) | GitHub Actions: install → lint → typecheck → build → test, on PR + main |
| Environments | Single `.env` pattern; no staging config or deploy docs | Document dev/staging/prod matrix; secrets in a manager (Vault/SSM/GitHub Secrets) |
| Migrations | Prisma migrations present ✅ | Release runbook: backup → migrate → deploy → smoke test; never `db push` in prod |
| Health & observability | `/api/health` exists ✅ but shallow | DB-check health variant; uptime monitor + Sentry for API and both apps |
| Backups | `Backup` model exists in schema; no operational automation found | Nightly `pg_dump` off-site + uploads sync; documented restore drills |
| Scaling story | In-process schedulers (`meetingScheduler`, `subscriptionSweep`) break under >1 replica | Single replica until queue layer added, or lock-guarded jobs |
| TLS termination | Not configured in repo | Reverse proxy (nginx/Caddy): HSTS, HTTP→HTTPS redirect, gzip/brotli |
| Seed safety | Creates known-credential users unconditionally | Refuse to run when `NODE_ENV=production` (BUG-09) |

---

## 10. What Is Done Well ✅

Worth preserving — these are above-average decisions:

1. **Structural tenant isolation** — tenant-scoped Prisma injected by middleware, not left to developer discipline.
2. **Deny-by-default permissions** — unknown module/action ⇒ denied (`permissions.ts`); fail-closed.
3. **Refresh-token reuse detection** — replaying a rotated token revokes the whole family (`refresh.ts`).
4. **Per-account brute-force lockout** with settings-driven thresholds; every failure & lock audit-logged.
5. **Immutable audit trail** with actor, IP, user-agent on auth events; before/after on mutations.
6. **Soft deletes + Recycle Bin** with restore across business modules.
7. **Centralized Zod validation** with clean field-level error formatting.
8. **Parameterized raw SQL only** (tagged templates) — zero concatenated queries found repo-wide.
9. **Quota-aware uploads** — pre-flight + post-write enforcement with automatic cleanup of over-quota files.
10. **Subscription gating enforced server-side** (`requireModule`) — UI hiding is not the security boundary.
11. **Consistent pagination helper** across list endpoints.
12. **Fire-and-forget side effects** (email/AI) never block or roll back core transactions.

---

## 11. Prioritized Remediation Roadmap

### Sprint 0 — Security stopgap (immediately, ~2–3 days)
| # | Item | Effort | Refs |
|---|---|---|---|
| 1 | Re-enable global + auth rate limiters; add public-endpoint limiter | 1 h | CRIT-01, HIGH-09 |
| 2 | Restore CORS allow-list from env | 30 min | CRIT-02 |
| 3 | Reduce JSON body limit to 1 mb | 15 min | HIGH-03 |
| 4 | `app.set("trust proxy", ...)` + proxy TLS/HSTS documentation | 2 h | §3.4 |
| 5 | Root `.gitignore`; untrack dist/ and dev logs | 1 h | HIGH-07 |
| 6 | Regenerate complete `.env.example`; fail-fast boot validation of required vars | 2 h | HIGH-08 |
| 7 | Production guard on seed script | 30 min | BUG-09 |

### Sprint 1 — Core hardening (~1–2 weeks)
| # | Item | Effort | Refs |
|---|---|---|---|
| 8 | Authenticated upload-serving controller (tenant check, nosniff, attachment headers); magic-byte upload validation | 3–4 d | CRIT-03, HIGH-04 |
| 9 | Hash refresh tokens at rest (migration + login/refresh/logout updates) | 2 d | CRIT-04 |
| 10 | Refresh token → HttpOnly cookie; access token in memory; update both apps' interceptors | 4–5 d | CRIT-05 |
| 11 | Fix settings persistence bug in both dashboards | 1 d | HIGH-01, BUG-01 |
| 12 | Fix severity sort ordering in grievance/task lists | 4 h | BUG-02 |
| 13 | Canonical module keys for tasks/schemes/crm/events routers (+ seed modules) | 1 d | HIGH-02, BUG-04 |
| 14 | Cap access-token lifetime; add per-user `tokenVersion` revocation | 1 d | HIGH-05 |

### Sprint 2 — Quality foundation (~2–3 weeks, parallel track)
| # | Item | Effort | Refs |
|---|---|---|---|
| 15 | Test suite: middleware-chain integration tests + auth smoke tests (Vitest/Jest + Supertest) | 1 wk | CRIT-06 |
| 16 | GitHub Actions CI; ESLint + Prettier configs | 2–3 d | CQ-07 |
| 17 | Docker compose; Sentry for API + both apps | 2–3 d | §9 |
| 18 | Authorization query consolidation + permission caching | 3 d | HIGH-06 |
| 19 | Delete legacy fetch client; single HTTP stack | 2 d | BUG-03, CQ-04 |
| 20 | React.lazy route splitting; remove dead frontend deps | 2 d | §5.2 |

### Sprint 3 — Compliance & polish
Aadhaar masking · public-form consent notice · retention/purge jobs · data-subject search tool · security alerting · mobile-responsive pass · i18n dictionary replacing Google Translate.

---

## 12. Go-Live Checklist

**Do not deploy to production until every box is ticked:**

- [ ] All 🔴 Critical items (CRIT-01 … CRIT-06) fixed and verified by tests
- [ ] Rate limiting active & load-tested; CORS restricted to real frontend origins
- [ ] Uploads served only through authenticated endpoint; magic-byte validation on
- [ ] Refresh tokens hashed at rest; tokens out of localStorage (cookie-based)
- [ ] HTTPS + HSTS enforced at proxy; `trust proxy` configured; cookies Secure/SameSite
- [ ] Automated tests prove cross-tenant access fails on the middleware chain
- [ ] CI green on main: lint, typecheck, build, tests
- [ ] Seed/demo accounts impossible in production (guarded seed + rotated credentials)
- [ ] `.env.example` complete; secrets in a secret manager; no secrets in repo history
- [ ] Nightly encrypted DB + uploads backups; one restore drill completed
- [ ] Error tracking (Sentry) + uptime monitor + alerting on lockouts/refresh-reuse wired
- [ ] Privacy notice + consent on public registration form; Aadhaar display masked
- [ ] Retention policy implemented for Recycle Bin & expired tenants
- [ ] Rollback plan documented (previous image + DB migration rollback path)

---

*Audit performed via manual review of security-critical code paths (auth, middleware, uploads, routing, client state handling) supplemented by repository-wide pattern scans (raw SQL, hardcoded secrets, localStorage usage, dangerouslySetInnerHTML, env variables). Line numbers refer to the audited commit on `main`. Re-run this audit after Sprint 0–1 remediation to re-rate overall risk.*







