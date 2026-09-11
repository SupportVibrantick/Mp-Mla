# 🔐 Security Audit Report — MP-MLA Constituency Management Platform

| | |
|---|---|---|
| **Document** | Complete Security Audit & Backend Scoring |
| **Version Audited** | `main` @ `cab3315` (9 Sep 2026) |
| **Scope** | `backend/` (Express + Prisma + TypeScript), `frontend/`, `master-dashboard/` (React + Vite) |
| **Method** | Manual line-by-line review of security-critical code paths (auth, middleware, tenant isolation, uploads, payments, public endpoints) + repo-wide pattern scans + live `npm audit` dependency scans |
| **Overall Security Score** | **56 / 100 — 🔴 HIGH RISK (Not production-ready)** |
| **Controls verified** | ~100 security-critical source files + 3 dependency trees (61 advisories) |

---

## 1. Executive Summary

The platform has an **unusually strong security skeleton** for a first-version build:

- **Tenant isolation is structural** — a tenant-scoped Prisma client is injected by middleware and auto-injects `tenantId` into every query (`tenantPrisma.ts`); `findUnique` even post-validates the owning tenant.
- **RBAC is database-driven and re-checked server-side** on every route (`permission.ts`), deny-by-default.

- **Refresh-token rotation with reuse detection** revokes the entire token family on replay (`refresh.ts:32-43`).
- **Per-account brute-force lockout**, configurable password policy/expiry, IP allow-lists, and full audit trails are already built.


However, this skeleton sits behind **several disabled or misconfigured controls** that make the current build unsafe for real citizen data:

1. **Every uploaded citizen document (KYC proofs, voter photos) is served from a hard-coded `/uploads` route with zero authentication** — any guessed URL fetches Aadhaar-linked identity documents, bypassing the entire tenant model. An attacker can also upload a file with an arbitrary extension + client-supplied MIME label, stored under a permissive CSP (`unsafe-inline` `unsafe-eval` `*`) → **stored XSS / malware hosting**.

2. **The public voter-verification API** lets **any unauthenticated person** — with only a semi-public EPIC number — **search a voter's phone/address/photo and then UPDATE that record** (`PUT /api/public/verify/update/:voterId`) without any proof of identity. This is PII exfiltration + data-integrity tampering with no credential whatsoever.

3. **Refresh tokens are stored plaintext in the DB** and in **`localStorage`** in both web apps — one DB dump or one XSS defeats session security platform-wide.
4. **`npm audit` reports 9 high severity backend +15 high per web app** including `nodemailer` SMTP injection, `axios` SSRF/response-tampering, `xlsx` prototype pollution/ReDoS, `ws` memory exhaustion, `vite` arbitrary file read(dev).
5. **Aadhaar numbers and SMTP passwords sit in plaintext** in PostgreSQL, with no field-level encryption at rest.
6. **Seed script bakes in well-known demo passwords** (`Platform@123456`, `Admin@123456`, `Mla@123456`, `Staff@123456`) with **no production guard** — running `db:seed` against a production DB hands out super-admin credentials.



> ⚠️ **Delta vs the previous `AUDIT.md`:** The wildcard CORS (`origin: "*"` with credentials) previously reported as CRIT-02 has already been fixed — current `app.ts:29-35` allow-lists `FRONTEND_URL`. Every other critical/high item in this report was re-verified as *still present* at the audited commit.

---

## 2. Methodology & Scope
`1
### 2.1 What was reviewed

| Area | Files |
|---|---|
| App bootstrap / middleware stack | `src/app.ts`, `middleware/{auth,tenantContext,permission,platformAuth,requireModule,auditLog,errorHandler,validate}.ts` |
| Auth flows (admin + platform) | `routes/admin/auth/*`, `routes/platform/auth/index.ts`, `lib/{jwt,env,authUtils}.ts` |
| Tenant isolation core | `lib/tenantPrisma.ts`, `middleware/tenantContext.ts` |
| Uploads & static content | `lib/upload.ts`, `routes/public/index.ts`, static `/uploads` mount in `app.ts` |
| Voter / Aadhaar handling | `controllers/public/voterVerification.controller.ts`, `services/voterVerification/*`, `prisma/schema.prisma` (Voter, VoterIdentityVerification, Incharge, InstitutionRequest) |
| Payments | `services/{razorpay,payment}.service.ts`, `controllers/{admin,platform}/paymentGateway.controller.ts`, `routes/platform/payments/index.ts` |
| RBAC / permissions | `lib/permissions.ts`, `lib/platformPermissions.ts`, `prisma/schema.prisma` (Permission, RoleDefaultPermission, UserPermission) |
| Configuration / secrets | `.env.example`, `.gitignore` (root/backend/frontend), `lib/env.ts`, git history scan (`git ls-files` for env/key/secret/log/sqlite) |
| Frontend token handling & XSS surface | `frontend/src/lib/auth.ts`, `master-dashboard/src/lib/auth.ts`, `*/src/contexts/AuthContext.tsx`, `ReactMarkdown`/`dangerouslySetInnerHTML` usage |
| Dependencies | live `npm audit` for `backend/`, `frontend/`, `master-dashboard/` |

### 2.2 Automated checks run

- `git ls-files` filtered for `env|secret|key|log|sqlite|db` → **no committed secrets or DB files found** ✅
- Pattern scans: raw SQL (`$queryRaw/$executeRaw`) → only parameterized tagged templates in ops scripts ✅; `localStorage/sessionStorage` → 53 hits (tokens in localStorage ❌); `dangerouslySetInnerHTML/innerHTML`; `exec/child_process/eval` → none ✅; hardcoded `sk_live/API_KEY/JWT_SECRET=` assignments → none in source ✅
- `npm audit --json` on all three packages (details in §7).

---

## 3. Security Scorecard (Backend-weighted)

Scores are evidence-based, reverse-weighted toward the controls most likely to be exploited on a citizen-data SaaS platform. Each domain score = (earned/possible) × 100.

*Scope note:* Rate limiting / anti-abuse (OWASP V1.1, V11) is excluded from this audit per project decision - assumed to be enforced at the perimeter (reverse proxy / WAF / CDN). Remaining domain weights were renormalized over the in-scope 92%.*

| # | Control Domain (OWASP-ASVS mapping) | Weight | Score /100 | Verdict |
|---|---|---|---|---|
| 1 | Authentication & Session Management (V2,V3) | **16.3%** | **52** | 🟠 Weak - solid lockout/rotation,but no MFA, tokens in localStorage, 365-day access tokens possible, plaintext refresh at rest |
| 2 | Authorization & Tenant Isolation (V4) | **16.3%** | **72** | 🟢 Strong - structural scoping + DB RBAC; mass-assignmentand unscoped-`prisma` discipline risks remain |
| 3 | Input Validation & Injection (V5) | **10.9%** | **74** | 🟢 Good - Zod coverage broad; no injectable raw SQL in app code; query-param validation inconsistent |
| 4 | Cryptographic Practices & Data-at-Rest (V6,V9) | **10.9%** | **40** | 🔴 Weak - Aadhaar/SMTP/refresh tokens plaintext at rest; no field-level encryptionor KMS |
| 5 | File Upload & Static Content (V12) | **8.7%** | **30** | 🔴 Critical - unauthenticated `/uploads` with citizen docs; MIME-label-only validation, no magic bytes, no AV, permissive upload CSP |
| 6 | Transport & Security Headers (V9.1) | **7.6%** | **60** | 🟡 Partial - Helmet ✅; no strict CSP for SPA apps, `trust proxy` unset,TLS only at proxy |
| 7 | Logging, Monitoring & Audit (V7,V8) | **8.7%** | **58** | 🟡 Partial - rich audit log ✅; but per-tenant disable, no alerting/SIEM, no anomaly detection |
| 8 | Dependency & Supply-Chain (V14) | **9.8%** | **45** | 🟠 Weak - 61 advisories (39 high), several in runtime code paths; no `npm audit` in CI,and no lockfile policy, no SBOM |
| 9 | Configuration & Secrets Management (V1.8,V9) | **10.9%** | **58** | 🟡 Partial - no committed secrets ✅, fail-fast env for JWT ✅;but seed passwords, incomplete `.env.example`, empty-string fallbacksfor Razorpay, no secret manager, no root `.gitignore` |

### Overall Score

| Metric | Value |
|---|---|
| Weighted total | **55.5 ≈ 56 / 100** |
| Grade | **D+ / Red** |
| Risk posture | 🔴 **HIGH - do not deploy with citizen data until P0 items (§4.1) are closed** |
| Top-3 fastest wins | Gate `/uploads` behind tenant-aware auth + magic-byte validation (1 day); remove unauthenticated voter verify endpoint from public router(2 h); production guard on seed script(30 min) |

## 4. Vulnerability Register

### 4.1 🔴 Critical (P0) — fix before any production deployment

---

#### CRIT-01 · Unauthenticated voter search + UPDATE on a public route

**Severity:** Critical · **CWE-306 / CWE-639**
**File:** `backend/src/routes/public/index.ts:272-276`

The public router exposes voter identity records with **no authentication and no proof of identity**:

```ts
router.post("/verify/search", searchVoter);                      // search by EPIC number
router.post("/verify/aadhaar/start", startAadhaarVerification);
router.post("/verify/aadhaar/confirm", confirmAadhaarVerification);
router.put("/verify/update/:voterId", voterUploader.single("photo"), updateVoterDetails); // WRITE
```

`searchVoter` (`controllers/public/voterVerification.controller.ts:11-40`) returns name, relative name, **phone, full address, and photo** given only an EPIC number. EPIC numbers are semi-public (printed on documents, shared in photos). `updateVoterDetails` (`:73-116`) then lets that same anonymous caller **overwrite name/relativeName/age/gender/phone/address/photo** for any Voter ID. There is no OTP, no ownership proof, no lockout.

**Impact:** Complete voter-list PII disclosure and data-integrity tampering — phone/address harvesting at scale, fraudulent voter-record edits that affect live constituency operations.

**Fix:** Remove `/verify/update` from the public router (route through authenticated `voter-list` module) and add proof-of-ownership (OTP to registered phone, verified before any read of full PII). Add a dedicated public limiter. Mask phone/address in search responses unless verified.

---

#### CRIT-02 · Uploaded citizen documents served from unauthenticated static route

**Severity:** Critical · **CWE-552**
**Files:** `backend/src/app.ts:49-60` (static mount), `backend/src/lib/upload.ts:13`, `backend/src/routes/public/index.ts:84-270`

```ts
app.use("/uploads", ... , express.static(path.join(__dirname, "..", "public", "uploads")));
```

All uploaded files — institution KYC documents (`headAdharNumber`, address/identity proofs), voter photos, grievance/project attachments — are served **without authentication or tenant check**. File names are guessable (`fieldname-<timestamp>-<random>.ext`). Anyone who discovers or guesses a URL can download citizen identity documents across **all tenants**. The route also sets a dangerously permissive CSP:

```ts
res.setHeader("Content-Security-Policy",
  "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; ...");
```

**Impact:** Mass PII exposure (Aadhaar-linked docs), cross-tenant data leak that bypasses the entire tenant-isolation design, and the ability to host arbitrary attacker-controlled HTML/JS at a trusted origin path.

**Fix:** Serve uploads through an authenticated, tenant-scoped controller (assert ownership in DB, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`) or move to a signed-URL private object store. Remove or strictly tighten the upload CSP.
---

#### CRIT-03 · File validation trusts client MIME type only — no magic bytes, arbitrary extensions

**Severity:** Critical · **CWE-434**
**File:** `backend/src/lib/upload.ts:38-77, 87-98`

`ALLOWED_MIME_TYPES.has(file.mimetype)` relies on the **client-supplied** `Content-Type`. The saved file keeps an extension derived from the original name (`path.extname(file.originalname)` — `upload.ts:29-33`). There is **no magic-byte verification** (PDF `%PDF`, JPEG `FF D8`, PNG signature…). An attacker uploads `shell.html` (or `x.PHP`) labelled `image/jpeg` → stored under `/uploads/attachments/shell-<ts>.html`. If the frontend ever renders an upload URL (avatar/img/attachment preview) or a proxy serves it as HTML, it's **stored XSS**. Even without XSS, the platform becomes a **ghost file host for malware/phishing**.

**Impact:** Stored XSS from a trusted origin (compounds CRIT-02 + CRIT-05 token theft), malware hosting, quota-bypass via renamed files.

**Fix:** Re-validate file content by magic bytes per allowed type; store files with a **server-generated extension** derived from the detected type (never the client originalname); drop dangerous types; reject HTML/SVG/JS outright; scan with ClamAV; serve with `nosniff`.

---

#### CRIT-04 · Refresh tokens stored in plaintext at rest

**Severity:** Critical · **CWE-311**
**Files:** `backend/prisma/schema.prisma:700-718`, `backend/src/routes/admin/auth/login.ts:176-197`, `refresh.ts:27-28, 107-127`

The full signed refresh-token JWT is written verbatim into `RefreshToken.token` (looked up via `findUnique({ where: { token } })`). A DB dump / backup leak = **live session forgery for every active user on every tenant**.

**Impact:** Mass session hijack from a single administrative failure. Rotation cannot help because the stored value *is* the credential.

**Fix:** Store only `SHA-256(token)`; look up by hash. Rotation and reuse detection (`refresh.ts:32-43`) remain byte-for-byte identical in behavior.

---

#### CRIT-05 · Tokens kept in localStorage in both web apps

**Severity:** Critical · **CWE-922** (→ XSS chain)
**Files:** `frontend/src/lib/auth.ts:15-25`, `master-dashboard/src/lib/auth.ts:16-25`, mirrored in both `AuthContext.tsx`

The access token lives in module memory (✅), but the **long-lived refresh token is persisted in `localStorage`** in both apps, and user object + permissions are also cached there. `localStorage` is readable by any injected script (XSS, compromised npm dependency, browser extension) and **survives browser closure**.

**Impact:** Any XSS on either app (CRIT-03 gives plausible stored-XSS) = permanent session hijack; refresh-token rotation is defeated because the attacker grabs the family root.

**Fix (minimum):** Move refresh token to an `HttpOnly; Secure; SameSite=Strict` cookie sent only to the refresh endpoint; keep access token in memory; drop the `user`/`permissions` localStorage caches (re-fetch `/me` on boot).
---

### 4.2 🟠 High Severity (P1) — fix in the first production sprint

---

#### HIGH-01 · SMTP password and Aadhaar numbers stored in plaintext

**CWE-311 / CWE-256** · `prisma/schema.prisma` (`Incharge.adharNumber`, `InstitutionRequest.headAdharNumber`), `lib/settings.ts` (tenant `smtp_password` setting), `lib/email.ts:8-9`.

Nothing in the schema or settings layer encrypts these values. A DB read (backup, RDS snapshot, compromised admin) reveals **citizen Aadhaar numbers** and **mailbox credentials usable to send/read as the tenant**. Even the public institution-request route (`routes/public/index.ts:229` `headAdharNumber`) writes this PII with no encryption.

**Fix:** Encrypt with a KMS-backed envelope key before write inside Prisma hooks (or a `@prisma/client` extension); decrypt only at point of use. Mask all Aadhaar in APIs (search responses / list views).

---

#### HIGH-02 · Dependency vulnerabilities — `npm audit` results (verified 9 Sep 2026)

**CWE-937 / CWE-829** · live `npm audit --json` per package.

| Package tree | Total | High | Moderate | Notable advisories |
|---|---|---|---|---|
| `backend` | 15 | **9** | 4 | `nodemailer` (SMTP/CRLF command injection, header injection, file-read via `raw` option), `path-to-regexp` (ReDoS in route matching), `prisma`/`@prisma/config` (via `deepmerge-ts` stack exhaustion, `effect` context loss), `defu` prototype pollution, `morgan` log-forging |
| `frontend` | 23 | **15** | 5 | `axios` (17 advisories: SSRF, prototype-pollution response tampering, header injection, cloud-metadata exfiltration), `xlsx` (SheetJS prototype pollution + ReDoS — used for imports), `ws` (memory exhaustion), `vite` (arbitrary file read — dev server), `postcss`, `rollup`, `lodash`, `path-to-regexp`, `nanoid`, `form-data`, `brace-expansion`, `picomatch`, `browserslist`, `tmp` |
| `master-dashboard` | 23 | **15** | 5 | (mirror of frontend tree — same advisories) |
| **Total** | **61** | **39** | 14 | |

Many high items are in **runtime** code paths (`axios`, `xlsx`, `nodemailer`, `ws`, `morgan`), not just build tooling — so they are directly attacker-reachable (bulk import parses attacker XLSX; mailer sends tenant-controlled content; websocket echo for appointments).

**Fix:** Upgrade to patched majors (`axios ≥1.10/1.12`, `xlsx` replaced or pinned to patched `0.18.5+` / use `exceljs`, `nodemailer ≥7`, `ws ≥8.18`); subscribe `npm audit` in CI with `fail-on-high`; add `npm audit` fix gate to the release pipeline.

---

#### HIGH-03 · Access token can be minted for 365 days (no token revocation list)

**CWE-613** · `backend/src/routes/admin/auth/login.ts:157-162`, `frontend` `SessionTimeout` setting logic.

```ts
const expiresIn = sessionTimeout === 0 ? "365d" : `${sessionTimeout}m`;
```

A tenant administrator can set session timeout to `0` ("unlimited") → the **access token itself** is valid for one year. There is no `tokenVersion`/revocation-list check in `authenticate()` (`middleware/auth.ts:21-48`), so a leaked access token is valid until natural expiry; revoking the user's refresh tokens does **not** kill it.

**Fix:** Cap access-token lifetime at e.g. 24 h regardless of setting (treat unlimited as "long refresh lifetime"); add per-user `tokenVersion` claim + DB check on each authenticated request for instant revocation.

---

#### HIGH-04 · Seed passwords are hard-coded demo credentials with no production guard

**CWE-798** · `backend/prisma/seed.ts:1027-1029`

```ts
const adminPwd = await bcrypt.hash("Admin@123456", 12);
const mlaPwd   = await bcrypt.hash("Mla@123456", 12);
const staffPwd = await bcrypt.hash("Staff@123456", 12);   // + Platform@123456
```

Anyone who runs `npm run db:seed` **against a production database** instantly creates super-admin, MLA, staff and platform accounts with **publicly known passwords** in this repo. No `NODE_ENV` guard exists.

**Fix:** Hard-fail if `NODE_ENV === "production"` (exit before any write). Read initial passwords from env with strong random defaults for local dev only; force `forcePasswordChange: true` on all seeded users.

---

#### HIGH-05 · `trust proxy` and HSTS not configured; client IP trust gap

**Where:** `backend/src/app.ts` (no `app.set("trust proxy", …)`), `backend/src/utils/helpers.ts:44` (unvalidated `x-forwarded-for`), `middleware/auditLog.ts:66`.

Behind nginx/ALB, login IP capture,andthe loginits, and the login **IP allow-list** will all read the proxy's IP unless `trust proxy` is set. Worse, `helpers.getClientIp` takes `X-Forwarded-For`'s **first** value verbatim — if the app is ever directly reachable, an attacker **spoofs their IP** to bypass the allow-list or poison audit logs. No `Strict-Transport-Security` is emitted by the app (Helmet default HSTS is off unless configured).

**Fix:** Set `app.set("trust proxy", PROXY_COUNT)` in production; make `getClientIp` use Express `req.ip` (which respects trust-proxy) not the raw header; enable Helmet's `strictTransportSecurity` for HTTPS deployments.

---

#### HIGH-06 · JSON body limit is 50 MB and `express.urlencoded({ extended: true })` unthrottled

**Where:** `backend/src/app.ts:46-47`.

`express.json({ limit: "50mb" })` is far above any legitimate payload in this app (largest is bulk import via multipart, not JSON). 50 MB JSON = small-JSON-limit DoS amplification with effectively ~2 req/sec exhausting per-worker memory. `urlencoded` `extended: true` has no explicit limit either.

**Fix:** `express.json({ limit: "1mb" })` and `express.urlencoded({ extended: true, limit: "100kb" })`; keep multipart uploads to the file limit on specific routes.
---

### 4.3 🟡 Medium Severity — schedule within 1–2 sprints

| ID | Finding | Where | Notes |
|---|---|---|---|
| MED-01 | Account-existence leakage | `login.ts:61-64, 85-87` | "Tenant ID required for this email" and "Account locked until HH:MM" disclose enrolment & lock state. Use uniform messages; reveal lock state only after a failed attempt. |
| MED-02 | Inconsistent query validation | multiple `req.query as Record<string,string>` casts | `validateQuery` used on some routers only; unvalidated query strings enable filter-probing. Standardize Zod query schemas. |
| MED-03 | Mass assignment / body spread | `routes/admin/{communityGroup,department,competitor,grievance,project}/*`, `platform/users.controller.ts` | Several handlers spread `…req.body` without allow-listing. Audit & add `pick()`/Zod `.strict()` allow-lists. |
| MED-04 | `morgan` log forging | `utils/logger.ts` | Unneutralized control chars can corrupt/forge log lines. Sanitize the stream. |
| MED-05 | No file-download audit trail | `lib/upload.ts` | Storage usage is tracked, downloads are not. Leaked file reads would be invisible. |
| MED-06 | Platform login has no lockout | `routes/platform/auth/index.ts:94-121` | Master-dashboard accounts lack failed-attempt counting — and could exist with seed password. Mirror admin lockout. |
| MED-07 | `MAX_FILE_SIZE` env unused | `backend/.env.example:26` | Upload limit hardcoded `10 * 1024 * 1024` in `upload.ts:36`. Wire to env. |
| MED-08 | Permissive upload CSP affects every served file | `app.ts:52-58` | After CRIT-02 fix, drop the insecure CSP entirely (use `nosniff` + attachment disposition). |
| MED-09 | No security headers on SPA responses | Vite static hosting | Add CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` at edge/proxy. |
| MED-10 | Login timing oracle | `login.ts` | Unknown user returns faster than wrong-password (bcrypt skipped). Compare against a dummy hash. |
| MED-11 | Future cookie flags not enforced | — | When tokens move to cookies, require `Secure`, `SameSite=Strict`, `__Host-` prefix. |

---

### 4.4 ⚪ Low / Hardening — backlog

| ID | Finding |
|---|---|
| LOW-01 | `dotenv.config()` called in multiple modules (`app.ts`, `env.ts`) — single import site only |
| LOW-02 | No `Cache-Control` on API responses — add `no-store` for authenticated data |
| LOW-03 | `morgan "combined"` logs full URLs — fine today (no tokens in URLs), keep a rule against putting secrets in query strings |
| LOW-04 | Enable `app.set("json escape", true)` so any HTML-bearing JSON cannot become reflected XSS |
| LOW-05 | Document install policy (`npm ci --omit=dev`) for the production image; keep dev deps out of runtime |
| LOW-06 | `dotenv` silent-loading: fail fast if `NODE_ENV=production` and `.env` missing |

---

## 5. What Is Done Well ✅

1. **Structural tenant isolation** — tenant-scoped Prisma auto-injects `tenantId` and post-validates `findUnique`; the correct multi-tenant pattern.
2. **Deny-by-default RBAC** — unknown module/action ⇒ deny; `requirePermission` + `requireModule` applied consistently on admin routers.
3. **Refresh-token rotation with family revocation** on replay (`refresh.ts:32-43`).
4. **Per-account brute-force lockout** with settings-driven thresholds; failures audit-logged.
5. **Rich, tamper-evident audit trail** — auth events, PII flows, exports/imports, before/after data.
6. **Broad Zod validation** on create/update/params/query paths.
7. **No raw SQL in app code** — only parameterized tagged templates in ops scripts.
8. **Clean git history** — no committed secrets; `.env` ignored.
9. **Generic login errors**, no verbose credential messages.
10. **Upload quota enforcement (pre-flight + post-write) with cleanup** on failure.
11. **Sanitized production error handler** (no stack leakage outside dev).
12. **Access token in memory, side-channel-limited** on frontend (memory-only access token is correct; refresh storage is the problem, CRIT-05).
---

## 6. OWASP Top-10 (2021) Coverage Summary

| # | OWASP Category | Coverage | Residual risk |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ Partial | Public verify-search/update (CRIT-01); uploads unauthenticated (CRIT-02); tenant scoping otherwise strong |
| A02 | Cryptographic Failures | ⚠️ Weak | PII/Aadhaar/SMTP/refresh tokens plaintext; TLS only at proxy; tokens in localStorage |
| A03 | Injection | ✅ Strong | Zod + ORM; no raw SQL in app; parameterized |
| A04 | Insecure Design | ⚠️ Partial | Strong tenant model, but public PII write-flows violate least privilege |
| A05 | Security Misconfiguration | ⚠️ Weak | 50 MB JSON body limit; permissive upload CSP; `trust proxy` unset |
| A06 | Vulnerable & Outdated Components | ⚠️ Weak | 39 high-severity advisories across the 3 packages |
| A07 | Identification & Auth Failures | ⚠️ Partial | Good lockout/rotation; no MFA, localStorage sessions |
| A08 | Software & Data Integrity | ⚠️ Partial | Backups exist; no signed releases, no integrity verification |
| A09 | Security Logging & Monitoring Failures | ⚠️ Partial | Rich audit logs; no alerting, SIEM, or anomaly detection |
| A10 | Server-Side Request Forgery | ✅ | No SSRF sinks; external calls fixed-host (AI providers, Razorpay) |

---

## 7. Remediation Roadmap

### Sprint 0 — Emergency (1–3 days, MUST precede any production data)
| # | Action | Effort | Ref |
|---|---|---|---|---|
| 1 | **Remove `PUT /verify/update` and the search route from the public router**; move to authenticated module | 2 h | CRIT-01 |
| 2 | **Gate `/uploads` behind tenant-aware auth** (or signed private URLs); drop the permissive CSP header | 1 d | CRIT-02 |
| 3 | **Magic-byte file validation + server-generated extensions**; re-run checks on existing files | 1 d | CRIT-03 |
| 4 | Turn off well-known seed credentials: production guard in `seed.ts` | 30 min | HIGH-04 |
| 5 | **Cap access-token lifetime to ≤ 24 h** regardless of `session_timeout_minutes` | 30 min | HIGH-03 |
| 6 | Shrink body limits: `express.json({ limit: "1mb" })`, urlencoded `100kb` | 15 min | HIGH-06 |

### Sprint 1 — Core hardening (1–2 weeks)

| # | Service | Effort |
|---|---|---|
| 8 | Hash refresh tokens at rest (migration + login/refresh/logout) | 2 d |
| 9 | Refresh token → `HttpOnly Secure SameSite=Strict` cookie; remove `localStorage` session data (both apps) | 4–5 d |
| 10 | Upgrade vulnerable deps (`axios`, `xlsx→exceljs`, `nodemailer≥7`, `ws≥8.18`), add `npm audit` to CI with fail-on-high | 2–3 d |
| 11 | `app.set("trust proxy", …)` + HSTS; make `getClientIp` use `req.ip` | 2 h |
| 12 | Platform-login lockout + strong initial platform credentials via env | 1 d |
| 13 | Field-level encryption for Aadhaar & SMTP password (KMS/envelope) | 2–3 d |

### Phase 2 — Compliance & polish (2–4 weeks)

| # | Item |
|---|---|
| 14 | MFA (TOTP) for SYSTEM_ADMIN + all platform accounts |
| 15 | Per-user `tokenVersion` for instant revocation; session management UI |
| 16 | Strict CSP + security headers on both SPAs; ban `dangerouslySetInnerHTML` via lint |
| 17 | SIEM/alerting on: repeated lockouts, refresh-reuse detection, mass exports, new-IP logins |
| 18 | Privacy: consent notice on public forms; Aadhaar masking everywhere; DPIA + data-retention policy |
| 19 | Secrets manager + `npm ci --omit=dev` dist image; CI gate on secret scanning (gitleaks/truffleHog) |

---

## 8. Go-Live Blockers — Final Checklist

**Do not go live with citizen data until every box is ticked:**

- [ ] Public routes expose no voter PII and have no write endpoints (CRIT-01)
- [ ] `/uploads` private, tenant-scoped, `nosniff` + `attachment`, no unsafe CSP (CRIT-02)
- [ ] Uploads magic-byte validated with server-generated extensions (CRIT-03)
- [ ] Refresh tokens hashed at rest; cookies `HttpOnly Secure SameSite`; localStorage is token-free (CRIT-04, CRIT-05)
- [ ] Access tokens capped at 24 h; revocable (HIGH-03)
- [ ] Seed script cannot run in production; demo/known credentials rotated (HIGH-04)
- [ ] `trust proxy` + HSTS + TLS enforced end-to-end (HIGH-05)
- [ ] Dependencies above the advisory floor; `npm audit` fail-on-high green (HIGH-02)
- [ ] Aadhaar/SMTP credentials encrypted at rest; masked in all APIs (HIGH-01)
- [ ] Audit-log alerting wired (lockout, refresh reuse, upload spikes)
- [ ] Cross-tenant access tests exist and pass in CI (must be automated)

---

*Evidence-level findings verified against `main` @ `cab3315`. Dependency data from live `npm audit --json` runs (9 Sep 2026) on `backend/`, `frontend/`, `master-dashboard/`. **Scope note:** rate limiting / anti-abuse is excluded from this report per project direction — assumed enforced at the perimeter (proxy / WAF / CDN; see §3 Scorecard). Static review only — a dynamic/DAST engagement on a deployed environment is strongly recommended before GA.*
