# Product Requirements Document (PRD)
## Constituency Management System (MP-MLA Platform)

| | |
|---|---|
| **Product Name** | MP-MLA Constituency Management System (CMS) |
| **Document Version** | 1.0 |
| **Status** | Approved for Development Baseline |
| **Owner** | Product Team, Vibrantick Infotech Solutions |
| **Last Updated** | August 2026 |
| **Related Documents** | README.md, USER_MANUAL.md |

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | Aug 2026 | Product Team | Initial baseline PRD derived from implemented system |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Objectives](#3-goals--objectives)
4. [Target Users & Personas](#4-target-users--personas)
5. [Scope](#5-scope)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Functional Requirements](#7-functional-requirements)
8. [Multi-Tenancy & Subscription Requirements](#8-multi-tenancy--subscription-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Data Model Highlights](#10-data-model-highlights)
11. [Integrations](#11-integrations)
12. [Success Metrics](#12-success-metrics)
13. [Release Plan & Phasing](#13-release-plan--phasing)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Out of Scope / Future Enhancements](#15-out-of-scope--future-enhancements)
16. [Glossary](#16-glossary)

---

## 1. Executive Summary

The **MP-MLA Constituency Management System** is a multi-tenant SaaS platform that digitizes the complete administrative operations of an Indian Member of Parliament (MP) or Member of Legislative Assembly (MLA) office. It provides one integrated workspace for constituency intelligence (wards, booths, voters, demographics), citizen services (grievances, Janata Darbar tokens, scheme applications), development monitoring (projects, funds, departments), political engagement (events, meetings, community groups, leaders, birthdays/greetings), competitive intelligence (AI-assisted competitor benchmarking), and back-office operations (documents, tasks, CRM, audit trails).

The product is sold as a subscription to individual constituency offices ("tenants") and operated centrally by a platform operator through a dedicated Master Dashboard that manages tenants, plans, modules, payments (Razorpay), invoices, and renewals.

**Current state:** The core platform described in this document is implemented and feature-complete for version 1.0 across three deployables:

1. **Backend API** — Node.js/Express/TypeScript + PostgreSQL (Prisma ORM)
2. **Constituency Web App** — React 19 + Vite (office staff, admin, MLA/MP users)
3. **Master Dashboard** — React 19 + Vite (platform operator users)

Each functional requirement below is tagged with implementation status: ✅ Implemented · 🟡 Partial (API done, UI limited) · 🔵 Planned.

---

## 2. Problem Statement

An Indian MP/MLA office today manages thousands of citizens, dozens of wards, crores of rupees of development funds, and constant public engagement — almost entirely through manual processes:

1. **Grievances are untrackable.** Complaints arrive via phone, walk-ins, letters, and Janata Darbars. There is no ticket number, no owner, no deadline, no history — issues get lost and citizens follow up blindly.
2. **Constituency data is scattered.** Ward demographics, voter lists, booth maps, institution directories, and councillor contacts live in paper registers and personal spreadsheets that die with staff turnover.
3. **Fund and project oversight is reactive.** MPLAD/MLALAD utilization, project milestones, and contractor status are reconstructed manually before every review meeting, with no live completion picture.
4. **Public engagement is unmanaged.** Meeting schedules, event logistics, appointment diaries, birthday greetings, and community outreach depend on one assistant's memory.
5. **No institutional memory or accountability.** When a complaint escalates or an election approaches, nobody can answer "what did we do, when, and who decided?"
6. **Generic tools don't fit.** Off-the-shelf CRMs/ticketing systems have no concept of constituencies, wards, booths, MPLAD funds, Janata Darbars, or political leader hierarchies — and no multi-office SaaS model for operators.

There is no purpose-built, subscription-based platform addressing governance workflows specific to Indian parliamentary constituencies.

---

## 3. Goals & Objectives

### 3.1 Product Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Digitize 100% of citizen grievance handling with a full accountability trail | Every grievance has ticket #, assignee, timeline |
| G2 | Single source of truth for constituency geography & people data | Wards → booths → voters fully modeled per tenant |
| G3 | Live financial visibility of funds & projects | Sanctioned vs. utilized visible on the dashboard at all times |
| G4 | Reduce repetitive office coordination effort | Central events/appointments/tasks/darbar scheduling |
| G5 | Enable data-driven political strategy | Demographics analytics + AI competitor benchmarking |
| G6 | Operate as sellable SaaS with isolated tenants and gated modules | Onboard a new office in < 1 day without code changes |

### 3.2 Business Objectives

- Sell subscriptions per constituency office with tiered plans gating optional modules (e.g., Competitor Analysis).
- Minimize per-tenant onboarding cost via bulk Excel imports and self-serve setup.
- Retain tenants through automated renewal reminders, invoices, and plan upgrade flows.

### 3.3 Non-Goals (Explicitly Out of Scope for v1)

- A full public-facing citizen portal / mobile app (only one public facility-registration page ships in v1).
- Election campaign management machinery.
- Statutory accounting/ERP-grade financials (funds tracking is operational, not accounting).
- Biometric/Aadhaar authentication of voters.
- Native mobile applications.

---

## 4. Target Users & Personas

### P1 — The Representative (MLA / MP)
- **Profile:** Elected member; consumer of information, not a data-entry user.
- **Needs:** Live dashboard of grievances/projects/funds; monthly performance reports for party leadership; competitive positioning insights.
- **Success:** Opens the app weekly and gets answers without asking staff.

### P2 — Office Administrator (System Admin / PA)
- **Profile:** Runs the office day-to-day; configures the system.
- **Needs:** Create users/permissions, set up wards/departments, manage settings & branding, monitor audit logs, generate PDF reports.
- **Success:** Full control with guardrails; can recover any accidental deletion.

### P3 — Office Staff / Data Entry Operator
- **Profile:** Handles citizen interaction, records tickets, updates tasks/events.
- **Needs:** Fast grievance capture, Janata Darbar token issuing, bulk imports, Excel exports.
- **Success:** High-volume data entry with validation feedback and no permission confusion.

### P4 — Citizen (indirect)
- **Profile:** Submits facility registration via public page; visits Janata Darbar.
- **Needs:** Simple form, document upload, email acknowledgment, review outcome.

### P5 — Platform Operator (SaaS owner)
- **Profile:** Sells and operates the platform across many constituency offices.
- **Needs:** Tenant onboarding/suspension, plan & module catalog, Razorpay payment reconciliation, invoice generation, renewal tracking, upgrade approvals.
- **Success:** Manages N tenants from one Master Dashboard without touching code.

---

## 5. Scope

### 5.1 In Scope

| Area | Items |
|---|---|
| Tenant web application | All modules listed in §7 |
| Platform operations | Master Dashboard: tenants, plans, modules, subscriptions, payments, invoices, upgrade requests, renewals, platform users/settings |
| Public surface | Single no-login page for citizen institution registration with document upload |
| Communication | Email notifications (SMTP), WhatsApp message dispatch capability, in-system notification records |
| AI services | Competitor analysis generation & chat via DeepSeek/Gemini |
| Payments | Razorpay subscription payments and invoice PDFs |
| Data tooling | Excel bulk import jobs with per-row validation reports; Excel/PDF exports |
| Safety nets | Immutable audit log; soft-delete Recycle Bin with restore |

### 5.2 Out of Scope

See §3.3 Non-Goals plus: SMS gateway (v1 uses email/WhatsApp), data-warehouse BI export, third-party election-commission data feeds.

---

## 6. System Architecture Overview

```
┌──────────────────────────┐   ┌────────────────────────────┐
│  Constituency Web App    │   │  Master Dashboard           │
│  React 19 + Vite :5173   │   │  React 19 + Vite :5174      │
└───────────┬──────────────┘   └─────────────┬───────────────┘
            │ REST + JWT (tenant users)      │ REST + JWT (platform users)
┌───────────▼────────────────────────────────▼───────────────┐
│        Backend API — Express + TypeScript (:5000)          │
│   /api/public (no auth) · /api/admin · /api/platform       │
│   Middleware: auth → tenantContext → requireModule →       │
│   permission → validate(Zod) → rateLimit → auditLog        │
└───────┬───────────┬───────────┬──────────────┬─────────────┘
        │Prisma     │Multer     │Nodemailer/   │Razorpay,
   ┌────▼───┐  uploads     WhatsApp lib  DeepSeek/Gemini
   │Postgres│  (local FS)
   └────────┘
Background schedulers: meeting reminders, subscription sweep/renewals
```

**Key architectural rules**

1. **Multi-tenancy by row isolation.** Every business table carries `tenantId`; middleware injects tenant context from the JWT on every admin request.
2. **Dual authentication realms.** `User` (tenant) vs `PlatformUser` (operator) are separate models with separate JWT realms (`auth` vs `platformAuth` middleware).
3. **Permission enforcement is server-side.** UI hiding is cosmetic only; every route re-checks `module:action` permissions against DB (user override → role default → deny).
4. **Soft deletes everywhere.** Business deletes write a `RecycleBinEntry`; restores return the record to its module.
5. **Settings cascade.** Tenant settings fall back to platform defaults when unset (typed key-value stores).

---

## 7. Functional Requirements

Requirement IDs are stable references for test cases and traceability. Priority: **P0** = launch blocker, **P1** = high value, **P2** = enhancement.

### 7.1 Authentication & Account Management

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AUTH-01 | Users log in with email + password; passwords stored bcrypt-hashed with configurable salt rounds | P0 | ✅ |
| FR-AUTH-02 | JWT access token + refresh token rotation; logout invalidates the refresh server-side (`RefreshToken` table) | P0 | ✅ |
| FR-AUTH-03 | Suspended/inactive users are refused login (`UserStatus`) | P0 | ✅ |
| FR-AUTH-04 | Change own password from profile; edit own name/phone | P0 | ✅ |
| FR-AUTH-05 | Rate limiting on auth endpoints (separate auth window/max from general API) to stop brute force | P0 | ✅ |
| FR-AUTH-06 | Platform operators authenticate against a separate realm (`PlatformUser`, SUPER_ADMIN role) for Master Dashboard | P0 | ✅ |

### 7.2 Roles & Permissions (RBAC)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-RBAC-01 | Three tenant roles seeded: SYSTEM_ADMIN, MLA_MP, OFFICE_STAFF | P0 | ✅ |
| FR-RBAC-02 | Permission catalog of `module:action` pairs stored in DB (`Permission` table), grouped by module in UI editor | P0 | ✅ |
| FR-RBAC-03 | Role default permissions assignable per role (`RoleDefaultPermission`) | P0 | ✅ |
| FR-RBAC-04 | Per-user overrides win over role defaults (`UserPermission`); SYSTEM_ADMIN bypasses all checks | P0 | ✅ |
| FR-RBAC-05 | Server-side enforcement middleware on every admin route; frontend additionally hides unauthorized nav items/routes (`ProtectedRoute`, `PermissionGate`) | P0 | ✅ |
| FR-RBAC-06 | Effective-permission set delivered to frontend after login for UI rendering | P1 | ✅ |

### 7.3 Dashboard & Analytics

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DSH-01 | Landing dashboard aggregates KPI cards: grievances by status, projects, fund utilization, wards, institutions, upcoming events — scoped to tenant & permissions | P0 | ✅ |
| FR-DSH-02 | Grievance trend charts over time (received vs resolved) via Recharts | P1 | ✅ |
| FR-DSH-03 | Birthday widget listing upcoming leader/incharge birthdays | P1 | ✅ |
| FR-DSH-04 | All widgets deep-link into their modules | P2 | ✅ |

### 7.4 Geography Management

Constituency hierarchy: **Constituency → District → Block → Town/Village → Ward → Polling Location → Booth**.

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-GEO-01 | CRUD for each hierarchy level with detail pages and status flags | P0 | ✅ |
| FR-GEO-02 | Multiple constituencies per tenant (MP seat covering several MLA seats) | P1 | ✅ |
| FR-GEO-03 | Wards support sub-areas (colonies) and multiple ward councillors | P0 | ✅ |
| FR-GEO-04 | Towns/villages typed (Nagar Palika / Nagar Panchayat / Gram Panchayat / Village) with population | P1 | ✅ |
| FR-GEO-05 | Representative Profile: editable public profile of sitting MP/MLA (photo, party, bio) | P1 | ✅ |
| FR-GEO-06 | Excel bulk-import jobs for geography entities with per-row success/error reporting (`GeographyImportJob`) | P1 | ✅ |
| FR-GEO-07 | Excel export of geography lists | P2 | ✅ |

### 7.5 Demographics & Voter Lists

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DEM-01 | Per-ward demographics: age bands, gender split, religion, social category (SC/ST/OBC/General); charted on `/demographics` | P1 | ✅ |
| FR-DEM-02 | Demographics editable in place with `demographics:update` permission | P1 | ✅ |
| FR-VOT-01 | Voter registry with search/filter (name, voter ID, ward, booth, gender, age) | P1 | ✅ |
| FR-VOT-02 | Manual voter create/edit/delete (soft) | P1 | ✅ |
| FR-VOT-03 | Excel bulk upload of voters as validated background job (`BulkUploadJob`) | P1 | ✅ |
| FR-VOT-04 | Recompute/sync ward demographic aggregates from voter data | P2 | ✅ |
| FR-VOT-05 | Voter list Excel export | P2 | ✅ |

---

### 7.6 Grievance Redressal (Public Requests)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-GRI-01 | Create grievance tickets with complainant info, category, ward, description, priority (LOW/MEDIUM/HIGH/URGENT), attachments | P0 | ✅ |
| FR-GRI-02 | Status lifecycle: OPEN → IN_PROGRESS → RESOLVED → CLOSED; REJECTED/ESCALATED exits allowed (`GrievanceStatus`) | P0 | ✅ |
| FR-GRI-03 | Assign ticket to department and/or staff member at triage | P0 | ✅ |
| FR-GRI-04 | Immutable grievance timeline: every status change recorded with actor + notes (`GrievanceTimeline`) | P0 | ✅ |
| FR-GRI-05 | List page filters by status/priority/ward/category/date; attachments classified (`GrievanceAttachmentClassification`) | P0 | ✅ |
| FR-GRI-06 | Bulk status change / bulk assignment on selected tickets (permission-gated) | P1 | ✅ |
| FR-GRI-07 | Excel export of filtered grievances for reporting | P1 | ✅ |

### 7.7 Institutions & Public Facilities

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-INS-01 | Directory CRUD of institutions (school/hospital/religious site/govt office/NGO…) with category/subcategory, capacity, ward link | P0 | ✅ |
| FR-INS-02 | Incharge sub-records per institution: name, designation, contacts, DOB, appointment/Aadhaar details | P1 | ✅ |
| FR-INS-03 | Bulk upload + Excel export of institutions | P2 | ✅ |
| FR-PUB-01 | **Public** no-login registration form: constituency + ward dropdowns, institution & head details, three proof-document uploads | P0 | ✅ |
| FR-PUB-02 | Public submissions stored as `InstitutionRequest` (PENDING) with uploaded docs; auto email to organization inbox | P0 | ✅ |
| FR-PUB-03 | Staff review queue: approve (converts into directory Institution) or reject with reason (`InstitutionRequestStatus`) | P0 | ✅ |
| FR-PUB-04 | Public endpoints resolve tenant via header/query or auto-select when only one active tenant exists | P1 | ✅ |

### 7.8 Departments & SLA

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DEP-01 | Department CRUD (PWD, Water, Electricity…) with head/contact person | P0 | ✅ |
| FR-DEP-02 | SLA rules per department defining expected resolution time by grievance category (`DepartmentSLA`); overdue tickets flaggable | P1 | ✅ |
| FR-DEP-03 | Department detail view: assigned grievance load & performance; bulk import/export | P2 | ✅ |

### 7.9 Development Projects

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-PRJ-01 | Project CRUD: name, category, agency/contractor, fund linkage, location, sanctioned/utilized amounts, schedule dates | P0 | ✅ |
| FR-PRJ-02 | Status workflow PLANNED → TENDERED → IN_PROGRESS → COMPLETED (+ON_HOLD/CANCELLED) | P0 | ✅ |
| FR-PRJ-03 | Milestones with due dates & completion tracking feeding progress % | P1 | ✅ |
| FR-PRJ-04 | Progress updates journal + chronological project timeline (`ProjectUpdate`, `ProjectTimeline`) | P1 | ✅ |
| FR-PRJ-05 | Attachments (photos, DPRs, bills) with classification | P1 | ✅ |
| FR-PRJ-06 | List filters by status/ward/fund; bulk ops; Excel export | P2 | ✅ |

### 7.10 Funds

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-FND-01 | Fund sources CRUD typed MPLAD / MLALAD / STATE / CENTRAL / OTHER with total sanctioned amount (`FundType`) | P0 | ✅ |
| FR-FND-02 | Fund transactions ledger with running computed balance (`FundTransaction`) | P0 | ✅ |
| FR-FND-03 | Funds overview: sanctioned vs utilized bars + remaining balance across all funds | P0 | ✅ |
| FR-FND-04 | Fund detail: transaction history + linked projects consuming the fund; Excel export | P1 | ✅ |

---

### 7.11 Government Schemes & Applications

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SCH-01 | Scheme catalog CRUD: name, level (CENTRAL/STATE/DISTRICT), department, eligibility, benefits, process, link, status (`SchemeLevel`, `SchemeStatus`) | P1 | ✅ |
| FR-SCH-02 | Citizen scheme applications with documents and status flow SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED/DISBURSED (`SchemeApplicationStatus`) | P1 | ✅ |
| FR-SCH-03 | Application detail keeps document set + full status history for staff handover | P1 | ✅ |

### 7.12 Internal Tasks

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-TSK-01 | Task CRUD: title, description, assignee, due date, priority (`TaskPriority`), status PENDING/IN_PROGRESS/COMPLETED/CANCELLED | P0 | ✅ |
| FR-TSK-02 | Task timeline records each transition for accountability (`TaskTimeline`) | P1 | ✅ |
| FR-TSK-03 | Bulk create/update + Excel export; personal queue for staff, full workload view for admins | P1 | ✅ |

### 7.13 Community Groups

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-COM-01 | Group directory typed RWA / TRADE_UNION / YOUTH / WOMEN / NGO etc. (`CommunityGroupType`) with ward linkage & office bearers | P1 | ✅ |
| FR-COM-02 | Detail pages with interactions/events context; bulk import/export | P2 | ✅ |

### 7.14 Leaders, Birthdays & Greetings

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-LDR-01 | Leader directory categorized by hierarchy level (`LeaderCategory`): booth/mandal/district-level functionaries with contacts & ward/booth links | P1 | ✅ |
| FR-LDR-02 | Bulk import/export of leaders | P2 | ✅ |
| FR-BDY-01 | Birthdays page aggregating upcoming birthdays across leaders & institution incharges | P1 | ✅ |
| FR-GRD-01 | Greetings log per leader recording channel & date (`LeaderGreeting`) | P2 | ✅ |

### 7.15 Public Engagement Cluster (module: `meeting`)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MTG-01 | Meetings CRUD with agenda, venue, attendees, outcomes; background scheduler sends reminders & auto-transitions status (`MeetingStatus`, `startMeetingScheduler`) | P1 | ✅ |
| FR-EVT-01 | Events with full workspace tabs: Agenda, Guests/RSVP, Team roles, Attendance marking, Media gallery, Post-event Report, Timeline (`Event*` model family) | P1 | ✅ |
| FR-EVT-02 | Event export to Excel | P2 | ✅ |
| FR-JDB-01 | Janata Darbar sessions (regular/special) with venue/schedule (`JanataSessionType`) | P0 | ✅ |
| FR-JDB-02 | Token issuing per citizen at session desk: name, contact, issue summary (`JanataDarbarToken`, `JanataTokenStatus`) | P0 | ✅ |
| FR-JDB-03 | Token serving workflow: call/mark SERVED or SKIPPED during session | P0 | ✅ |
| FR-JDB-04 | Convert a darbar token into a formal grievance ticket | P1 | ✅ |
| FR-APT-01 | Appointment diary: visitor, purpose, type (walk-in/scheduled/VIP), slot, approval workflow PENDING → APPROVED → COMPLETED/REJECTED (`AppointmentType`, `AppointmentStatus`) | P1 | ✅ |

---

### 7.16 Competitor Analysis (AI)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-CMP-01 | Register competitor representatives with constituency/profile (`Competitor`, `CompetitorAnalysisStatus`) | P2 | ✅ |
| FR-CMP-02 | Periodic metric entries for competitors and own office (`CompetitorMetricEntry`, `OwnMetricEntry`; own-metrics collector utility) | P2 | ✅ |
| FR-CMP-03 | Comparison dashboard with trend charts of own vs competitor metrics | P2 | ✅ |
| FR-CMP-04 | AI-generated analysis (SWOT-style) and chat Q&A grounded on logged metrics via DeepSeek/Gemini (`CompetitorChat`, prompt library in `competitorPrompts.ts`) | P2 | ✅ |

### 7.17 CRM Contacts

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-CRM-01 | Contact directory with categories (`ContactCategory`), org, contact fields, notes | P1 | ✅ |
| FR-CRM-02 | Interaction log per contact with channel (CALL/MEETING/EMAIL/WHATSAPP…) and outcome notes (`CRMInteraction`, `InteractionChannel`) | P1 | ✅ |
| FR-CRM-03 | Follow-ups per contact with status tracking incl. OVERDUE (`CRMFollowUp`, `FollowUpStatus`) | P1 | ✅ |

### 7.18 Documents & Correspondence

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DOC-01 | Document upload into categories (`DocumentCategory`) with metadata & search/filter | P1 | ✅ |
| FR-DOC-02 | Version history: re-uploads preserved as retrievable versions (`DocumentVersion`) | P1 | ✅ |
| FR-DOC-03 | Cross-module linking of documents to grievances/projects/etc. (`DocumentLink`); document stats endpoint | P1 | ✅ |
| FR-COR-01 | Correspondence tracking: letters/references typed by `CorrespondenceType` with status flow, assignment to staff, timeline, stats (`Correspondence*` models) | P1 | 🟡 API complete; dedicated UI pending |
| FR-COR-02 | Link correspondence to documents & tasks (`CorrespondenceDocument`, task endpoints) | P1 | 🟡 API complete; UI pending |

### 7.19 Reporting

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-RPT-01 | Interactive analytics reports: grievance resolution rates, department performance, project completion, fund utilization — filterable by period/ward | P1 | ✅ |
| FR-RPT-02 | Print-ready PDF generation server-side (PDFKit): grievance registers, project status books, fund statements, monthly summaries | P1 | ✅ |
| FR-XLS-01 | Consistent Excel export buttons across list modules (ExcelJS) | P2 | ✅ |

### 7.20 Notifications & Communication

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-NTF-01 | In-system notification records per user (`Notification`, channel + delivery status enums) | P1 | ✅ |
| FR-NTF-02 | Transactional email via tenant-configured SMTP/Nodemailer (e.g., institution-request alerts); HTML templates in email lib | P1 | ✅ |
| FR-NTF-03 | WhatsApp dispatch capability through configured provider (`whatsapp.ts`) | P2 | ✅ |
| FR-NTF-04 | Notification templates manageable as data (`NotificationTemplate`) | P2 | 🟡 Model present; UI pending |

### 7.21 Settings & Branding

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SET-01 | Tenant settings as typed key-value store (org info, branding/logo/color, mail, WhatsApp, notifications, language) with defaults fallback | P0 | ✅ |
| FR-SET-02 | Settings grouped & editable from `/settings` with `settings:read/update` gating; applied app-wide live | P0 | ✅ |
| FR-SET-03 | Data activity tracking of dataset-level changes (`DataActivity` module + page) | P2 | ✅ |

### 7.22 Audit Log & Recycle Bin

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AUD-01 | Middleware writes audit entries for create/update/delete/status actions capturing actor, action (`AuditAction`), entity, before/after values | P0 | ✅ |
| FR-AUD-02 | Audit browser at `/audit-logs` filtered by user/action/module/entity/date | P0 | ✅ |
| FR-RBN-01 | All business deletes are soft-deletes surfaced in `/recycle-bin` with restore; permanent purge admin-only | P0 | ✅ |

---

## 8. Multi-Tenancy & Subscription Requirements

### 8.1 Tenant Lifecycle (Master Dashboard)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-PLT-01 | Operator CRUD for tenants: name, constituency, state/district, status ACTIVE/SUSPENDED (`Tenant`, `TenantStatus`) | P0 | ✅ |
| FR-PLT-02 | Subscription plans defined with price, billing cycle, and included modules (`SubscriptionPlan`, `BillingCycle`, `PlanModule`) | P0 | ✅ |
| FR-PLT-03 | Assign subscription to tenant; trial period default 14 days configurable via platform setting (`TenantSubscription`, `SubscriptionStatus`: TRIAL/ACTIVE/PAST_DUE/EXPIRED…) | P0 | ✅ |
| FR-PLT-04 | Module-level entitlement enforcement: a module absent from the tenant's plan is blocked server-side (`requireModule`) and hidden in UI, regardless of role permissions | P0 | ✅ |
| FR-PLT-05 | Scheduled subscription sweep job expires/past-dues subscriptions and queues renewal reminders N days ahead (`subscriptionSweep`, `renewal_reminder_days`) | P0 | ✅ |
| FR-PLT-06 | Razorpay payment capture & reconciliation; invoice PDF generation (`invoicePdf.ts`, `Payment`, `PaymentMethod/Gateway/Status`) | P0 | ✅ |
| FR-PLT-07 | Tenants submit plan-upgrade requests; operator approves/rejects (`PlanUpgradeRequestStatus`) | P1 | ✅ |
| FR-PLT-08 | Platform user management + platform settings keys (platform_name, support_email, default_trial_days, allow_tenant_creation) | P0 | ✅ |
| FR-PLT-09 | Platform-side audit log and recycle bin mirroring tenant-side safety nets | P1 | ✅ |
| FR-PLT-10 | Tenant billing page (`/billing`) shows plan, cycle, status, renewal date, invoices; entry point for upgrade requests | P1 | ✅ |

### 8.2 Data Isolation Rules

1. Every Prisma query in tenant context filters by `tenantId` derived from the authenticated JWT — never from client-supplied IDs alone.
2. Public endpoints accept tenant hints but only resolve to tenants with status ACTIVE.
3. Cross-tenant access is impossible through either app; platform operators reach data only via `/api/platform` routes with explicit purpose.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | API p95 < 500 ms for list endpoints under normal load; dashboard aggregation queries cached at request level via TanStack Query on frontend. Bulk import of 10k rows completes as background job without blocking UI. |
| **Scalability** | Stateless API (horizontal scaling ready); PostgreSQL shared DB with row-level tenant isolation; uploads on local FS with configurable dir (object-storage migration path documented). |
| **Security** | Helmet headers, CORS restricted to FRONTEND_URL, bcrypt(≥10 rounds), JWT secrets env-managed, rate limiting (global + stricter auth window), Zod validation on all inputs, server-side permission re-checks, immutable audit trail, upload type/size restrictions (Multer + MAX_FILE_SIZE). |
| **Availability** | Target 99.5% monthly uptime in production; graceful degradation — email/AI failures are fire-and-forget and never block core transactions (e.g., institution submission succeeds even if mail fails). |
| **Usability** | Responsive layout; sidebar adapts to permissions; consistent list/detail/form patterns per module; toast feedback on all mutations; loading skeletons. English/Hindi language support (`LanguageContext`). |
| **Accessibility** | Radix-based primitives provide keyboard navigation and ARIA semantics on dialogs/menus/forms. |
| **Internationalization** | Language switcher infrastructure present; all new user-facing strings should route through it. |
| **Auditability & Compliance** | Every mutation audit-logged with actor; voter/citizen personal data access-controlled and export-logged; soft-delete retention before purge. |
| **Maintainability** | TypeScript strict typing end-to-end; Prisma migrations versioned; settings-driven configuration (no hard-coded tenant values); modular route-per-concern structure. |
| **Backup/Recovery** | Backup model tracked in-app (`Backup`); operational backups scheduled outside app scope (documented runbook). |

---

## 10. Data Model Highlights

~90 Prisma models. Grouped view of the domain:

| Domain | Core Models |
|---|---|
| Platform / SaaS | Tenant, PlatformUser, SubscriptionPlan, PlanModule, TenantSubscription, Module, TenantModuleAccess, Payment, PlanUpgradeRequest |
| Identity & access | User, RefreshToken, Permission, RoleDefaultPermission, UserPermission |
| Geography & people | Constituency, District, Block, TownVillage, Ward, WardArea, WardCouncillor, PollingLocation, Booth, Voter, Demographics, RepresentativeProfile, GeographyImportJob |
| Citizen services | Grievance (+Timeline/Attachment), Institution, Incharge, InstitutionRequest, Department, DepartmentSLA, Scheme, SchemeApplication(+Document) |
| Development | Project (+Milestone/Update/Attachment/Timeline), Fund, FundTransaction |
| Engagement | Meeting, Event (+Agenda/Guest/Team/Attendance/Media/Report/Timeline), Appointment, JanataDarbarSession, JanataDarbarToken |
| Political ops | Leader, LeaderGreeting, CommunityGroup, Competitor(+Metric/Analysis/Chat), OwnMetricEntry, Contact, CRMInteraction, CRMFollowUp |
| Back office | Task(+Timeline), Document(+Version/Link), Correspondence(+Document/Timeline), Notification(+Template), AuditLog, Settings (System/Tenant/Platform), Backup, DataActivity, RecycleBinEntry, BulkUploadJob |

**Cross-cutting conventions:** `tenantId` on all tenant data; `createdAt/updatedAt` timestamps; soft-delete flags plus RecycleBinEntry; enum-driven statuses for every workflow.

---

## 11. Integrations

| Integration | Purpose | Configuration |
|---|---|---|
| **Razorpay** | Subscription payments from tenants; reconciliation in Master Dashboard | API keys (platform side) |
| **DeepSeek / Gemini** | Competitor analysis generation & chat | API keys via env/settings; prompt library versioned in code |
| **SMTP (Nodemailer)** | Transactional email: institution-request alerts, renewal reminders | Per-tenant mail settings with fallback |
| **WhatsApp provider** | Outbound message dispatch capability | Per-tenant credentials in settings |

All integrations fail gracefully: delivery errors are logged and never roll back business transactions.

---

## 12. Success Metrics

### Adoption (per tenant)
- Weekly active staff users ≥ 70% of provisioned accounts.
- ≥ 90% of grievances created in-system (vs. paper) by month 3.

### Operational outcomes
- Median grievance first-response time < 24 h; SLA-breach rate trending down quarter-over-quarter.
- 100% of projects have milestones & current status updated within last 30 days.
- Funds utilization visible with ≤ ₹1 ledger discrepancy vs. manual audit.

### Business (operator)
- Trial → paid conversion ≥ 40%.
- Monthly churn < 3% of active subscriptions.
- New tenant onboarding time < 1 working day.

### Quality
- Zero critical security findings in quarterly review (permission bypass, cross-tenant leak).
- Bulk import row-success rate > 95% on template-compliant files.

---

## 13. Release Plan & Phasing

| Phase | Scope | Status |
|---|---|---|
| **v1.0 (Current baseline)** | All ✅ requirements in §7–§8: core modules, RBAC, multi-tenancy, billing, public registration page, bulk imports, exports, PDF reports, audit/recycle bin | Shipped |
| **v1.1** | Correspondence UI (FR-COR-01/02), notification-template management UI (FR-NTF-04), WhatsApp templates activation | Planned |
| **v1.2** | Public grievance submission form for citizens (mirror of facility page), SMS gateway option, advanced report builder | Planned |
| **v2.0** | Mobile app (staff field capture), citizen portal with ticket tracking, object-storage uploads, regional language packs | Future |

---

## 14. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Sensitive voter/citizen data breach | Severe | Row-level tenancy enforced server-side; permission gating; audit trail; export logging; env-managed secrets; rate limiting |
| R2 | Shared PostgreSQL instance becomes bottleneck at many tenants | High | Stateless API scales out; per-module query optimization; documented path to read replicas / managed Postgres |
| R3 | Local-FS uploads lost across deployments | Medium | Configurable UPLOAD_DIR + backup runbook; v2 object-storage migration |
| R4 | AI outputs (competitor analysis) contain inaccuracies used politically | Medium | Advisory labeling in UI; human verification encouraged; metrics-grounded prompts |
| R5 | Subscription expiry interrupts office operations mid-month | Medium | Renewal reminder job N days ahead; PAST_DUE grace state before hard pause; operator reactivation is instant |
| R6 | Seed/demo credentials reused in production | High | Password change mandated at first login; seed intended for dev only; documented prominently (USER_MANUAL §3.5) |
| R7 | Permission misconfiguration silently blocks staff work | Low-Med | Sensible seeded role defaults; admin override editor; deny-by-default keeps blast radius contained |

---

## 15. Out of Scope / Future Enhancements

Deferred beyond the current roadmap (see §13 for near-term): public citizen portal with self-service ticket tracking, native mobile apps, SMS channel, election-campaign module, biometric voter verification, BI warehouse export, full regional-language translation coverage, marketplace of third-party modules.

---

## 16. Glossary

| Term | Definition |
|---|---|
| **MPLAD / MLALAD** | MP / MLA Local Area Development Scheme — annual discretionary development funds |
| **Janata Darbar** | Public hearing session where citizens meet the representative directly |
| **Ward / Booth** | Electoral subdivision of a constituency / individual polling unit within a polling location |
| **Tenant** | A subscribed constituency office with isolated data inside the shared platform |
| **Module entitlement** | Whether a feature area is included in a tenant's subscription plan |
| **Institution Request** | Citizen-submitted application to add a public facility, pending staff approval |
| **SLA (DepartmentSLA)** | Expected resolution timeframe configured per department & grievance category |
| **Soft delete / Recycle Bin** | Deletion pattern where records are flagged removed and restorable before purge |

---

*Confidential — Vibrantick Infotech Solutions. This PRD reflects the implemented v1.0 baseline of the MP-MLA Constituency Management System.*









