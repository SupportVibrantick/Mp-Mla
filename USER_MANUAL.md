# Constituency Management System (MP-MLA) — User Manual

**Version:** 2.0
**Audience:** MPs / MLAs, Office Administrators, Office Staff, and Platform Operators
**System:** Multi-tenant Constituency Management Platform

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [Getting Started](#3-getting-started)
4. [Logging In & Your Account](#4-logging-in--your-account)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Dashboard](#6-dashboard)
7. [Geography Management](#7-geography-management)
8. [Demographics & Voter Lists](#8-demographics--voter-lists)
9. [Voter Portal & Voter Verification (Public)](#9-voter-portal--voter-verification-public)
10. [Grievances (Public Requests)](#10-grievances-public-requests)
11. [Public Facilities & Citizen Registration](#11-public-facilities--citizen-registration)
12. [Departments](#12-departments)
13. [Development Projects](#13-development-projects)
14. [Funds & Financial Tracking](#14-funds--financial-tracking)
15. [Government Schemes & Applications](#15-government-schemes--applications)
16. [Tasks (Internal Work Management)](#16-tasks-internal-work-management)
17. [Community Groups](#17-community-groups)
18. [Leaders, Birthdays & Greetings](#18-leaders-birthdays--greetings)
19. [Meetings, Events, Janata Darbar & Appointments](#19-meetings-events-janata-darbar--appointments)
20. [Creative Studio](#20-creative-studio)
21. [Website Builder & Publishing Platform](#21-website-builder--publishing-platform)
22. [Social Media Hub](#22-social-media-hub)
23. [Helpline Numbers & Citizen Directory](#23-helpline-numbers--citizen-directory)
24. [Competitor Analysis (AI-Powered)](#24-competitor-analysis-ai-powered)
25. [CRM Contacts](#25-crm-contacts)
26. [Documents](#26-documents)
27. [Reports](#27-reports)
28. [User Management & Permissions](#28-user-management--permissions)
29. [Billing, Subscription & Plan Quotas](#29-billing-subscription--plan-quotas)
30. [Settings & Branding](#30-settings--branding)
31. [Audit Logs & Recycle Bin](#31-audit-logs--recycle-bin)
32. [Platform Administration (Master Dashboard)](#32-platform-administration-master-dashboard)
33. [Common Workflows (Step-by-Step)](#33-common-workflows-step-by-step)
34. [Frequently Asked Questions](#34-frequently-asked-questions)
35. [Troubleshooting](#35-troubleshooting)

---
## 1. Introduction

The **Constituency Management System (CMS)** is a complete digital platform built for Members of Parliament (MP), Members of Legislative Assembly (MLA), and their administrative offices. It replaces registers, spreadsheets, and scattered WhatsApp messages with one organized system where your office can:

- Track every ward, village, booth, and demographic detail of the constituency — down to each voter.
- Register and resolve citizen grievances (tickets) with full timelines.
- Monitor development projects, funds (MPLAD / MLALAD / State / Central), and schemes.
- Manage institutions, public facilities, community groups, and local leaders.
- Plan meetings, events, Janata Darbars, and appointments.
- **Design posters and campaign creatives** with a built-in Creative Studio.
- **Launch and publish a public constituency website** with a no-code Website Builder.
- **Manage Facebook / Instagram / X / YouTube / LinkedIn pages** from one Social Media Hub.
- **Publish an emergency helpline directory** citizens can access without an account.
- Let voters **self-serve** via a public Voter Portal and Voter Verification page.
- Keep an internal document vault, task board, CRM contacts, and audit trail.

The system is **multi-tenant**: each constituency office gets its own secure, isolated workspace, while a central **Platform Operator** manages subscriptions, modules, billing, backups, and storage quotas through a separate Master Dashboard.

### Who should read which section?

| Reader | Read sections |
|---|---|
| MLA / MP | 4, 5, 6, 8–15, 19–24, 27, 29 |
| Office Administrator | All sections |
| Office Staff / Data Entry | 4, 6–28 |
| Platform Operator (SaaS owner) | 3, 29, 32 |

## 2. System Overview & Architecture

The product consists of **three applications** plus several **public pages**:

```
┌──────────────────────────┐   ┌────────────────────────────┐
│  Frontend (Constituency) │   │  Master Dashboard           │
│  React 19 + Vite         │   │  (Platform Operator Panel)  │
│  http://localhost:5173   │   │  http://localhost:5174      │
└───────────┬──────────────┘   └─────────────┬───────────────┘
            │  REST API (JWT auth)           │  REST API (JWT auth)
┌───────────▼────────────────────────────────▼───────────────┐
│                 Backend API (Express + TypeScript)          │
│                      http://localhost:5000                  │
│      /api/public   /api/admin/*        /api/platform/*      │
└───────────┬──────────────────────────────────────────────────┘
            │ Prisma ORM             ┌─────────────────────────────┐
     ┌──────▼──────┐                 │ Background jobs:            │
     │ PostgreSQL  │                 │ publish/schedule social     │
     └─────────────┘                 │ posts, website snapshots,   │
                                     │ meeting reminders, backups, │
                                     │ subscription sweep          │
                                     └─────────────────────────────┘
```

Public, no-login pages hosted by the frontend:

| Page | URL | Purpose |
|---|---|---|
| Facility registration | `/register-public-facility` | Citizens submit institution details + proofs |
| Public website runtime | `/site/{slug}` | Live constituency website served from its public slug |
| Voter Portal | `/voter-portal` | Voters log in to view/update their record |
| Voter Verification | `/verify-voter` | Voters confirm their record / submit identity proof |
| Helpline directory | `/helpline`, `/helpline-directory`, `/public/helplines` | Emergency & service numbers for citizens |
### The three API surfaces

| Surface | URL prefix | Auth | Used by |
|---|---|---|---|
| **Public API** | `/api/public` | None (rate-limited) | Citizens; public pages resolve the active tenant automatically |
| **Admin API** | `/api/admin` | Tenant user JWT | The main constituency app (all staff users) |
| **Platform API** | `/api/platform` | Platform user JWT | Master Dashboard (SaaS operator only) |

### Technology summary

- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT with refresh-token rotation, Zod validation, Helmet + rate limiting, Nodemailer email, Multer uploads, ExcelJS/PDFKit exports, Razorpay payments, DeepSeek/Gemini AI integration.
- **Constituency Frontend:** React 19, Vite, Tailwind CSS, Shadcn/Radix UI, TanStack Query, Wouter routing, React Hook Form, Recharts, Framer Motion. The Creative Studio renders to `html-to-image` PNG/JPG exports; the Website Builder renders section-based JSON pages.
- **Social engine:** adapter pattern with providers for **Facebook, Instagram, X (Twitter), YouTube, LinkedIn** (OAuth 2.0 + encrypted token storage).
- **Website engine:** template-based site configuration with JSON section pages, immutable deployment snapshots, and custom-domain (CNAME/A record) mapping.
- **Master Dashboard:** Same stack, runs on port **5174**.

---

## 3. Getting Started

### 3.1 Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- npm

### 3.2 Backend setup

```bash
cd backend
npm install

# Create .env from .env.example and fill values:
#   DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT,
#   FRONTEND_URL, rate-limit and upload settings
npx prisma migrate dev       # create database tables
npx prisma generate          # generate the Prisma client
npm run db:seed              # seed permissions, demo tenant & users
npm run dev                  # start API on http://localhost:5000
```

Useful database scripts:

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Apply migrations during development |
| `npm run db:seed` | Seed permissions, roles, demo data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:reset` | Reset the database (⚠ destructive) |

### 3.3 Constituency Frontend setup

```bash
cd frontend
npm install
# Create .env with: VITE_API_URL=http://localhost:5000/api
npm run dev                   # opens on http://localhost:5173
```

### 3.4 Master Dashboard setup

```bash
cd master-dashboard
npm install
npm run dev                   # opens on http://localhost:5174
```

### 3.5 First-time login (seeded demo accounts)

> ⚠️ **Change these passwords immediately in production** (Profile → Change Password).

| App | Role | Email | Password |
|---|---|---|---|
| Master Dashboard | Platform Super Admin | `superadmin@admin.mpmla.in` | `Platform@123456` |
| Constituency App | System Administrator | `admin@constituency.gov.in` | `Admin@123456` |
| Constituency App | MLA / MP | `mla@constituency.gov.in` | `Mla@123456` |
| Constituency App | Office Staff (PA) | `pa@constituency.gov.in` | `Staff@123456` |
| Constituency App | Office Staff (Data Entry) | `dataentry@constituency.gov.in` | `Staff@123456` |

---
## 4. Logging In & Your Account

### 4.1 Logging in

1. Open the constituency app (`http://localhost:5173`).
2. Enter your **email** and **password**, then click **Sign In**.
3. Sessions use short-lived access tokens with automatic refresh-token rotation — you stay logged in securely without re-entering credentials constantly.
4. If your account is inactive/suspended, login will be rejected — contact your administrator.

### 4.2 What you see after login

After login you land on the **Dashboard**. A left-hand sidebar shows every module you have permission to open; items you cannot access are hidden automatically. The top header shows your profile menu and language controls.

### 4.3 Changing your password

1. Click your avatar → **Profile**, or go directly to **/change-password**.
2. Enter your current password and the new password twice, then confirm.
3. Passwords are stored hashed (bcrypt) — nobody, including admins, can see your old password.

### 4.4 Editing your profile

On the **Profile** page you can update your display name and phone number. Your role and permissions are managed by your administrator and cannot be self-edited.

### 4.5 Logging out

Click your avatar → **Logout**. This invalidates your refresh token server-side so the session cannot be reused.

---

## 5. User Roles & Permissions

### 5.1 Roles

| Role | Typical holder | Scope |
|---|---|---|
| **SYSTEM_ADMIN** | Office IT/Admin head | Full access to everything in their constituency, including user management, settings, audit logs, and recycle bin. Bypasses all permission checks. |
| **MLA_MP** | The elected representative | Full visibility of all data — dashboards, grievances, projects, funds, reports. Typically no user administration. |
| **OFFICE_STAFF** | PAs, secretaries, data-entry operators | Working access to day-to-day modules (grievances, tasks, events, voter lists, creative studio, etc.), restricted admin functions. |

*(On the Master Dashboard side there is a separate **SUPER_ADMIN** platform role — see Section 32.)*

### 5.2 How permissions work

Every screen action maps to a **module : action** pair (e.g., `grievances:update`, `projects:create`, `creative:create`). When deciding access, the system checks in order:

1. **SYSTEM_ADMIN?** → always allowed.
2. **Per-user override** set by an admin for that specific user → wins if present.
3. **Role default** assigned to your role → used otherwise.
4. Nothing found → **denied**.

This means two OFFICE_STAFF users can have different abilities — e.g., a data-entry operator may be explicitly blocked from publishing creative designs even though other staff can.

### 5.3 Actions you'll encounter

| Action | Meaning |
|---|---|
| `read` | View lists and details |
| `create` | Add new records |
| `update` | Edit existing records |
| `delete` | Remove records (soft-deleted to Recycle Bin) |
| Others (`export`, `bulk`, `send`, …) | Module-specific extras |

Administrators manage these in **User Management → Permissions** (see Section 28).

---
## 6. Dashboard

The Dashboard is your command center the moment you log in. It aggregates live data from every module:

- **Key stat cards** — total grievances (open vs. resolved), active projects, funds utilization, wards, institutions, upcoming events.
- **Grievance trend charts** — complaints received and resolved over time, broken down by category/priority.
- **Project progress indicators** — sanctioned vs. utilized budget with completion percentages.
- **Birthday widget** — upcoming birthdays of leaders/institution heads so greetings are never missed.
- **Recent activity** — latest tickets, tasks, and correspondence updates.

Everything you see is filtered by your permissions and belongs only to your constituency (tenant). Clicking most widgets navigates to the underlying module for details.

---

## 7. Geography Management

Found under **Geography Management** in the sidebar, this is where your constituency's structure is defined. The hierarchy is:

```
Constituency → District → Block → Town/Village → Ward → Polling Location → Booth
```

### 7.1 Overview page (`/geography`)

A single hub linking to all geography sub-pages with counts at each level.

### 7.2 Constituencies

Manage one or more constituencies (useful if an office handles an MP seat covering multiple MLA seats). Each constituency holds its name, type, state, district, and status.

### 7.3 Representative Profile (`/geography/representative`)

Maintain the public profile of the sitting MP/MLA — photo, party, contact details, and bio used across reports, branding, and the public website (see Website Builder, Section 21).

### 7.4 Districts & Blocks

Add districts within the constituency, then blocks within each district. Both support edit/delete and detail views.

### 7.5 Towns / Villages

Register towns and villages under blocks, each typed (Nagar Palika / Nagar Panchayat / Gram Panchayat / Village, etc.) with population data.

### 7.6 Wards (`/geography/wards`)

Wards are the operational heart of constituency work:

- Ward number, name, councillor details (**Ward Councillors** sub-records).
- **Areas** inside a ward (colonies, localities) with area types.
- Status management (ACTIVE/INACTIVE).
- Detail pages show demographics, grievances, voters, and projects tied to that ward.

### 7.7 Polling Locations & Booths

- **Polling locations:** school / community-hall level polling stations.
- **Booths:** individual booths with voter capacity; booth detail pages show assigned voters and demographics.

### 7.8 Bulk Import (`/geography/import`)

Instead of typing records one by one, upload Excel files:

1. Download the sample template from the import page.
2. Fill in rows for the selected entity (wards, towns, booths, etc.).
3. Upload — the backend creates an **import job**, validates rows, and reports per-row success/error so you can fix bad rows and re-import.

---
## 8. Demographics & Voter Lists

### 8.1 Demographics (`/demographics`)

Per-ward demographic tracking displayed with charts:

- Population by **age group**, **gender**, **religion**, and **social category** (SC/ST/OBC/General).
- Voter counts and new-voter registration trends.
- Edit demographic figures directly from this screen (requires `demographics:update` permission).
- **Demographics sync** — recalculates ward-level aggregates automatically from the voter registry (see 8.2), so charts stay accurate after bulk uploads.

### 8.2 Voter List (`/voter-list`)

The Voter List module (`voter_list` permission) is your office's complete, searchable voter registry:

| Feature | How |
|---|---|
| Search & filters | By name, voter ID (EPIC), application number, ward, ward-area, booth, section, gender, age, political leaning |
| Add manually | "Add Voter" form with electoral + personal + cadre details |
| Bulk upload | Excel-based background job with per-row validation report |
| Export | Download filtered lists to Excel |
| Demographics sync | Recalculate ward-level aggregates from voter data |
| Photo upload | Store voter photo per record |
| Family members | Optional linked household members (relation, DOB, gender) |

> Voter data is sensitive. Access is permission-controlled and every view/change is audit-logged. Voter records respect your plan's **voter quota** (see Section 29) — once the limit is reached the system blocks further creates/imports and asks you to upgrade.

### 8.3 Adding & editing a voter

From **Voter List → Add Voter** capture:

- **Electoral identity:** EPIC / voter ID number, generated **application number** (`APP-YYYY-NNNNNN`, auto-assigned), serial number, section/part number, booth number.
- **Personal details:** name, father/husband/mother name + relation type (F/H/M), gender, age, blood group, photo.
- **Address:** house number, address, locality, ward, ward-area, booth.
- **Contact:** phone (optional — used for Voter Portal / verification).
- **Flags:** disability status, active/shifted/deleted status.

### 8.4 Political leaning & canvassing tagging

This is the office's private field-campaign layer:

| Leaning | Meaning |
|---|---|
| 🟢 **Our Voter** | Committed loyal supporter |
| 🟢 **Supporter** | Favourable constituent |
| 🟣 **Key Influencer** | Community opinion leader |
| ⚪ **Neutral / Swing** | Undecided or swing voter |
| 🔴 **Opposition** | Leaning toward opposition |
| ⚪ **Unsurveyed** | Not yet surveyed by field cadre (default) |

- Use **"Mark as Our Voter"** for committed supporters and **cadre notes** to record follow-up context.
- The **tagged by / tagged at** fields show who last updated the leaning for accountability.
- Filter the list by leaning to plan door-to-door drives, booth meetings, and greetings.
- Filter by **Our Voter** to segment the committed base for polling-day rosters.

Leaning data is internal to your office and is **never** exposed on any public page (Voter Portal shows only electoral details).

### 8.5 Voter families

Open a voter record → **Family** tab to add household members (relation, name, gender, DOB). This helps plan booth-level outreach household by household.

### 8.6 Bulk upload of voters

1. From Voter List, download the **Excel template** (columns: voter ID, name, ward, booth, section, gender, age, phone, address, leaning, etc.).
2. Fill the rows and upload the file.
3. The upload runs as a **background job** — you see progress (total / processed / succeeded / failed / duplicates) live on the list page.
4. When done, review the **per-row error report** (row number, field, reason), fix invalid rows, and re-upload. Duplicate EPIC numbers are reported instead of silently rejected.

### 8.7 Voter Portal & verification (quick links)

Your voters can self-serve without staff help using the public pages described in Section 9. Share these links on your website, social media, and WhatsApp broadcasts:

- Voter Portal: `https://{your-app}/voter-portal`
- Voter Verification: `https://{your-app}/verify-voter`

---
## 9. Voter Portal & Voter Verification (Public)

These are **no-login public pages** for citizens. They read only the voter records belonging to the active constituency and cannot access any other office data.

### 9.1 Voter Portal (`/voter-portal`)

A self-service account for citizens who appear in your voter registry:

1. **Create account:** the voter enters their **Application Number** (`APP-…)` and chooses a password, or signs in if they already have an account.
2. **First login** forces a password change (set by the office when the record was created).
3. Once inside, the voter sees their own record — electoral details, ward/booth, family, and address.
4. They can **update their phone number, address, photo and other contact fields**, keeping your registry current without staff data-entry.
5. **Forgot password:** OTP is sent to the registered mobile number for secure reset.
6. **Change mobile number:** verified with an OTP before the change is accepted.

> One citizen account can be linked to multiple voter records (e.g., head of household managing family members).

Staff tips:
- Voters can only see their own details — the portal never reveals canvassing/leaning data.
- The portal keeps voter data fresher at scale; instruct booth-level workers to share the link during door-to-door drives.
- Every portal change is audit-logged with the voter account's identity.

### 9.2 Voter Verification (`/verify-voter`)

A lightweight verification page citizens use to:

1. Select their **constituency**.
2. Enter their **EPIC / Voter ID number**.
3. Confirm the record belongs to them (name / relative name / age shown).
4. Submit **identity verification** in one of three ways:

| Method | What happens |
|---|---|
| **Aadhaar OTP** | OTP flow initiated against the provided Aadhaar number |
| **Aadhaar card upload** | Upload a masked Aadhaar image for office review |
| **Document upload** | Upload any supporting document (ration card, passport, PAN, etc.) |

5. Requested updates to name / relative / age / phone / address / blood group are submitted with the verification record and appear in the office audit trail for staff follow-up.

Verification submissions are stored as `VoterIdentityVerification` records (PENDING → SUBMITTED → VERIFIED / FAILED / REJECTED). Staff can review them from the voter's detail page.

---
## 10. Grievances (Public Requests)

The Grievance module (**Public Requests** in the sidebar) is your office's complaint ticketing system.

### 10.1 Understanding a grievance record

Each grievance contains: ticket number, complainant name/contact, category (water, roads, electricity, …), description, ward, **priority** (LOW / MEDIUM / HIGH / URGENT), **status**, assigned department/staff, attachments, and a full **timeline** of every status change.

### 10.2 Status lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
               ↘ REJECTED / ESCALATED
```

### 10.3 Day-to-day use

1. **Create:** `Public Requests → New`. Fill complainant details, pick category/ward, set priority, attach photos/documents if any.
2. **Triage:** Filter the list by status/priority/ward; open a ticket and **assign it to a department or staff member**.
3. **Work it:** Update status as progress happens — every change is appended to the timeline with who/when/notes.
4. **Resolve:** Mark RESOLVED with resolution notes; optionally close after citizen confirmation.
5. **Bulk actions:** Select multiple tickets to change status or assign in bulk (permission-gated).
6. **Export:** Push the filtered list to Excel for physical reporting.

### 10.4 Tips

- Use HIGH/URGENT priority sparingly — dashboards sort by priority.
- Always write clear timeline notes; they become evidence in monthly performance reports.
- You can add a **grievance form to your public website** (Website Builder, Section 21) so citizens can raise requests online; those submissions appear here.

---

## 11. Public Facilities & Citizen Registration

### 11.1 Public facility directory (`/public-facilities`)

Central directory of schools, hospitals, anganwadis, religious sites, government offices, NGOs, etc. Each record includes category/subcategory, address, ward link, capacity, established date, contact details, and an **Incharge** (head person with designation, phone, DOB, appointment date).

Actions: create/edit facilities, bulk upload, export, and manage incharges.

### 11.2 Citizen-initiated registrations (`/register-public-facility`)

This is a **public web page that requires no login**. Any citizen can:

1. Choose their constituency and ward.
2. Submit institution details (name, category, address, head-person info).
3. Attach proof documents (institution proof, identity proof, address proof).

Submissions land in **Public Facility Requests** (`/public-facility-requests`) inside the office app with status PENDING. Staff review documents and either **approve** (the facility enters the main directory) or **reject** with a reason. The system automatically emails the organization's registered email about the new request.

---

## 12. Departments

Departments (**Departments** in the sidebar) represent the government/utility departments grievances are routed to — PWD, Water Works, Electricity Board, Health, etc.

- Create a department with name, description, head/contact person, and contact details.
- Attach **SLA rules** (DepartmentSLA) defining expected resolution time per grievance category — used to flag overdue tickets.
- Department detail pages show assigned grievances, workload, and performance.
- Bulk upload and export are supported.

Set up departments *before* logging grievances so assignment is possible at triage time.

---

## 13. Development Projects

(**Projects** in the sidebar.) End-to-end tracking of construction and development works funded through MPLAD / MLALAD / State / Central funds.

### 13.1 Creating a project

From `Projects → New`, capture:

- Name, description, category, executing agency/contractor
- Source of fund & linked fund record
- Location (ward/district), sanctioned amount, utilized amount
- Scheduled start/end dates, current **status**

### 13.2 Project statuses

`PLANNED → TENDERED → IN_PROGRESS → COMPLETED`, plus `ON_HOLD` / `CANCELLED`.

### 13.3 Tracking tools on the project detail page

| Tool | Purpose |
|---|---|
| **Milestones** | Break the work into checkpoints with due dates and completion marks |
| **Updates** | Progress journal entries (e.g., "foundation complete") |
| **Timeline** | Chronological log of all project events |
| **Attachments** | Photos, DPRs, bills, work orders |

### 13.4 Lists, bulk & export

The list page offers filters by status/ward/fund, percentage-complete indicators, bulk operations, and Excel export for review meetings.

---

## 14. Funds & Financial Tracking

(**Funds** in the sidebar → `/funds`.) Track every rupee that enters the constituency office.

- **Fund sources:** MPLAD, MLALAD, State Fund, Central Fund, and other custom funds — each with total sanctioned amount.
- **Transactions:** record individual releases/expenditures against a fund; running balance is computed automatically.
- **Overview page:** shows all funds with sanctioned vs. utilized bars and remaining balance at a glance.
- **Fund detail:** full transaction history, linked projects spending from this fund, export to Excel.

Best practice: create the fund first (e.g., "MPLAD 2025-26"), then link projects and log transactions as money moves so utilization percentages stay accurate.

---
## 15. Government Schemes & Applications

Two related modules under **Schemes**:

### 15.1 Scheme catalog (`/schemes`)

Maintain a directory of government welfare schemes (state/central level) with:

- Name, description, **level** (Central / State / District), department, eligibility criteria, benefits, application process, official link, and status (ACTIVE / INACTIVE / ARCHIVED).

Use this as your office's knowledge base when citizens ask "which scheme applies to me?"

### 15.2 Scheme applications (`/schemes/applications`)

When a citizen applies for a scheme through your office, log an application:

1. `Applications → New` — pick the citizen/contact, select the scheme, enter details, attach supporting documents.
2. Track status: `SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED / DISBURSED`.
3. The detail page keeps documents and the full status history, so any staff member can answer "what happened to my application?"

---

## 16. Tasks (Internal Work Management)

(**Tasks** → `/tasks`.) The internal to-do board for office staff.

- Create tasks with title, description, assignee, due date, priority (LOW/MEDIUM/HIGH/URGENT), and status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- Link tasks to grievances, events, or correspondence where relevant.
- Every status change is recorded in a task timeline for accountability.
- Bulk create/update and Excel export supported.
- Staff see their own queue; admins see everyone's workload.

Tip: convert recurring duties (weekly reports, meeting follow-ups) into tasks so nothing slips.

---

## 17. Community Groups

(**Community Groups** in the sidebar.) Directory of organized community bodies:

- Types: **RWA** (Resident Welfare Associations), Trade Unions, Youth Groups, Women's Groups, NGOs, etc.
- Each group stores name, type, ward/area, office bearers, member strength, and contact info.
- Detail pages track interactions and related events.
- Bulk upload and export available.

Use this list before any event or announcement to know exactly which stakeholder groups exist in each ward.

---

## 18. Leaders, Birthdays & Greetings

(**Local Representatives** and **Birthdays** in the sidebar.)

### 18.1 Leader directory

Records of political/social figures in the constituency: booth-level workers, mandal presidents, panchayat heads, party functionaries — categorized via **LeaderCategory** (e.g., Booth Level, Mandal Level, District Level).

Each leader has contact details, ward/booth linkage, photo, and notes. Bulk upload and export are included.

### 18.2 Birthdays page (`/birthdays`)

A month-wise calendar of upcoming birthdays across leaders and institution heads, so the office never misses a call or greeting.

### 18.3 Greetings log

Record every birthday/festival greeting sent (call, letter, WhatsApp, visit) per leader — useful during election season to demonstrate relationship maintenance. Use **Creative Studio** (Section 20) to generate the poster for the greetings.

---

## 19. Meetings, Events, Janata Darbar & Appointments

All public-engagement scheduling lives in this cluster (permission module: `meeting`).

### 19.1 Meetings (`/meetings`)

Internal/official meetings: schedule with date-time, venue, agenda, attendees, and outcomes. A background **scheduler service** on the backend sends reminders and auto-updates meeting status when times pass.

### 19.2 Events (`/events`)

Public programs — rallies, inaugurations, camps. The event detail page is a full workspace:

| Tab | What you manage |
|---|---|
| Agenda | Session-wise program for the day |
| Guests / Invites | Invitee list with RSVP status |
| Team | Staff assignments (security, logistics, media…) |
| Attendance | Mark who actually attended |
| Media | Photos/videos captured at the event |
| Report | Post-event summary; exportable |
| Timeline | Auto-logged history of changes |

Events can be exported to Excel for approvals.

### 19.3 Janata Darbar (`/janata-darbar`)

The public hearing system:

1. **Create a session** (regular/special) with date, time, and venue.
2. On the session page, issue **tokens** to citizens as they arrive — each token captures name, contact, and issue summary.
3. Call tokens one by one during the darbar; mark each as SERVED / SKIPPED.
4. Convert serious issues directly into grievances from the token.

This digitizes the traditional queue-management of an MLA/MP office.

### 19.4 Appointments (`/appointments`)

One-on-one appointment diary: visitor details, purpose, type (walk-in / scheduled / VIP), requested slot, and approval workflow (PENDING → APPROVED → COMPLETED / REJECTED). Conflicts and past appointments are visible to avoid double-booking.

---
## 20. Creative Studio

(**Creative Studio** in the sidebar → `/creatives`, permission module: `creative`.) An in-app poster/picture editor for everything the office prints or posts — birthday cards, meeting notices, janata darbar announcements, festival greetings, scheme publicity, achievement posts, and development-work updates.

### 20.1 How it works

The studio has four screens:

| Screen | Purpose |
|---|---|
| **Landing** | Start a **blank canvas** or open a saved design |
| **Template Library** | Browse ready-made templates, categorized and searchable, with favorites |
| **Editor** | The visual canvas — insert, move, resize, rotate, style elements |
| **Saved Designs** | Your saved posters with status (Draft / Pending / Approved / Published / Rejected) |

### 20.2 Templates & categories

| Category | Examples |
|---|---|
| 🎂 Birthday | Leader / citizen birthday wishes |
| 🤝 Meeting & Samvad | Public meeting notices with date–time–venue badges |
| 📢 General Notice | Announcements, progress reports, community notices |
| 🎉 Other / Greetings | Achievements, festival greetings, congrats |

Every template ships in ready-made square (1080×1080) format with editable text slots. Supporting categories in the system include Events, Janata Darbar, Govt. Schemes, Awareness, Festival, National Days, and Development Work.

### 20.3 The editor

- **Canvas:** drag elements to position, corner handles to resize, top handle to **rotate**.
- **Format switcher:** SQUARE_POST, PORTRAIT_POST, STORY_STATUS, LANDSCAPE_POST, PRINT_A4, PRINT_A3, BANNER_WIDE, or CUSTOM dimensions.
- **Left tabs:**
  - **Content** — edit heading, subheading, message, slogan, date/time/venue text, and other template slots.
  - **Elements** — add shapes, images, icons, stickers, text boxes.
  - **Background** — solid/gradient/image backgrounds and colors.
  - **Brand** — Brand Kit (office logo, party logo, colours, fonts) applied across designs.
  - **Layers** — reorder/duplicate/delete elements like a design tool.
- **Tools:** Undo / Redo, preview, save draft, and quick tips panel showing current resolution and layer count.

### 20.4 Export & share

- **Download** the design as **PNG or JPEG** at the canvas resolution (1080×1080 default, A4/A3 and banner supported).
- **Share preview link** — generates a token URL that anyone can open to view the poster without logging in (great for WhatsApp approvals).

### 20.5 Approval workflow

Designs flow through `DRAFT → PENDING REVIEW → APPROVED → READY TO PUBLISH → PUBLISHED` (or `REJECTED` with a reason). Admins can define who is permitted to create vs. approve; only approved designs should be pushed to the Social Media Hub (Section 22) for publishing.

---
## 21. Website Builder & Publishing Platform

(**Website Builder** in the sidebar → `/websites`.) Create, design, and publish a **public website for the constituency** — no code required.

### 21.1 Creating a website

1. Go to **Website Builder** → **New Website** (`/websites`).
2. Enter a site **name**.
3. Choose the public **slug** — the site becomes live at `https://{slug}.mpmla.in`.
4. Pick a **starting template** from the system template gallery.
5. Click **Initialize Website** → you land in the visual builder.

### 21.2 The visual builder (`/websites/:id/builder`)

A split-screen editor — left **section add-menu**, center **live page preview**, right **inspector** for the selected section.

- **Add sections** from 25+ blocks:

| Group | Sections |
|---|---|
| Hero | Hero, Representative Hero, Dev Hero, Stats / Constituency Stats |
| Development | Projects, Development Projects, All Projects, Schemes / Govt Schemes, Events / Upcoming Events, Gallery |
| Citizen services | Grievance CTA, Grievance Form, Contact / Office Directory, Office Locations |
| About | About Representative, Leader Profile, Bio, Testimonials, Press & News, Video Embed, FAQ Accordion, Newsletter, Rich Text, Custom Box |
| Chroming | Navbar, Footer |

- **Style sections** — background colour/image, text colour, padding, alignment, container width.
- **Global theme** — primary/secondary/accent colours, font family, header style (sticky/fixed/standard), footer style (dark/light/colored), party badge.
- **Site-wide extras** — logo, favicon, social links (Facebook / X / Instagram / YouTube / WhatsApp / Telegram), SEO meta (title, description, OG image), and optional custom CSS/JS.
- **Save Draft** anytime; the last-saved time is shown in the toolbar.

### 21.3 Pages (`/websites/:id/pages`)

- Manage all pages — title, URL slug, SEO title/description/image, order, home-page flag.
- **Duplicate** an existing page to base a new one on it, or delete pages.
- The first page is set as the home page automatically.

### 21.4 Menus, media & forms

- **Navigation menus** — define menu structure and links shown on the site.
- **Media library** — upload images/logo/favicons used by the site.
- **Built-in forms** — embed Contact, Grievance, Appointment, Janata Darbar, Feedback, or Volunteer forms; submissions land in the corresponding office modules.

### 21.5 Domains (`/websites/:id/domains`)

- By default every site uses its `https://{slug}.mpmla.in` subdomain.
- Add a **custom domain** (e.g., `mla-ramesh.in`). The page shows exact DNS records to configure at your registrar:
  - **CNAME** → `cname.mpmla.in`
  - **A record** → `76.76.21.21`
- Click **Verify DNS** — the system checks propagation and reports verification + SSL activation status (PENDING → PROVISIONING → ACTIVE / FAILED).
- Mark one domain as **primary**; you can add/remove domains anytime.

### 21.6 Publish & version history (`/websites/:id/deployments`)

1. Click **Publish** in the builder.
2. The system saves the current draft, generates an **immutable JSON snapshot** (site config + all pages + menus), and pushes the new version live.
3. Every publish becomes a numbered **version**. Open **Deployment History** to see all snapshots with publisher and time.
4. **Rollback** to any previous version with one click — the draft is overwritten with that snapshot so you can re-publish it.

### 21.7 The public runtime

Visitors view the live site at: `https://{slug}.mpmla.in` (or your custom domain), and in development at `http://localhost:5173/site/{slug}`. Public visitors never need a login.

---
## 22. Social Media Hub

(**Social Media Hub** in the sidebar → `/social`.) Publish to Facebook, Instagram, X (Twitter), YouTube, and LinkedIn from one dashboard.

### 22.1 Connecting accounts

1. Open **Social Media Hub** → **Accounts** → **Connect Account**.
2. Choose the platform (Facebook / Instagram / X / YouTube / LinkedIn). You are taken through the platform's **OAuth authorization** screen.
3. After approval, the panel shows the **discovered pages/channels** — select which ones to activate.
4. Connected accounts appear on the dashboard with their platform, account name, avatar, and connection status.

The backend stores tokens **encrypted** (AES-GCM) and runs periodic **health checks**. You can **Test Connection** or **Disconnect** an account at any time. Every connect/disconnect is recorded in the Social Audit Log.

> You need a developer application/client-ID for each platform (Facebook/Meta, X, Google for YouTube, LinkedIn). Ask your platform operator to configure the credentials in the environment.

### 22.2 Composing & publishing (`/social` → **New Post**)

1. Write the post content (or add media — image, carousel, video/reel, story).
2. Choose **one or more target accounts** — the same post can go to multiple platforms at once (the system publishes to each target independently).
3. Choose **Publish now** or **Schedule** a date/time (uses `Asia/Kolkata` timezone by default).
4. If the post requires approval (per org settings), it is created as **SUBMITTED_FOR_APPROVAL**; an approver confirms before it is queued.
5. The dashboard shows the timeline: DRAFT → SUBMITTED_FOR_APPROVAL → APPROVED → PUBLISHING → PUBLISHED / FAILED, with per-platform status chips.

### 22.3 Scheduling & reliability

- Scheduled posts are processed by **background publish jobs** (`SocialPublishJob`) with up to 3 automatic retries on failure.
- If a platform fails, use **Retry failed** on the affected post; you can also **cancel** an unpublished post.
- Failed targets never block other platforms — each target is published/scheduled independently.

### 22.4 Engagement metrics

- The dashboard lists recent posts with **likes, comments, shares, and views** per platform.
- Click **Sync metrics** for one post or **Sync All** to refresh engagement across all connected platforms.
- Metrics are stored as snapshots over time, so you can trend performance per post and platform.

### 22.5 Best practices

- Design the artwork in **Creative Studio** (Section 20), export PNG/JPG, then upload into the composer.
- Standardise a review step (approver role) for official political messaging.
- Schedule campaign posts during peak citizen hours; sync metrics weekly and archive best-performing ideas.

---

## 23. Helpline Numbers & Citizen Directory

(**Helpline Numbers** in the sidebar → `/helplines`.) Curate the emergency and service numbers your citizens most need, and publish them on a **public page that needs no login**.

### 23.1 Managing helpline entries

From the admin page you can add/edit/delete helpline cards with:

| Field | Example |
|---|---|
| Category | Emergency, Health & Ambulance, Police, Women & Child Care, Senior Citizens, Disaster Management, Civic & Municipal, Electricity, Water & Sanitation, Cyber & Citizen Services, MLA Office & Citizen Desk, Govt Services, Other |
| Title & subtitle | "Fire & Emergency", "State Fire Services" |
| Numbers | Primary phone, secondary phone, toll-free, WhatsApp |
| Contact info | Email, address |
| Availability | Hours text and 24×7 flag |
| Distinct flags | Emergency, toll-free, WhatsApp-enabled |
| Coverage | Area/ward coverage e.g. "Constituency-Wide" or "Ward 1 to 14" |
| Display order & status | Order on the page and active/inactive toggle |

### 23.2 Public directory

Citizens can browse the directory without logging in at:

- `/helpline`
- `/helpline-directory`
- `/public/helplines`

The public page:
- Groups numbers by category with colour-coded, icon-led cards (emergency entries float to the top).
- Supports **search** by name, number, department, or area.
- Shows a "24×7" / "Emergency" badge set and optional constituency-office card at the top.
- Only shows entries marked **active** — deactivating an entry hides it immediately from the public page.

### 23.3 Sharing

Print the URL on posters, share on social media (Section 22), or embed a link on your public website (Section 21), so citizens always have the correct number for every situation.

---
## 24. Competitor Analysis (AI-Powered)

(**Competitor Analysis** in the sidebar.) An AI-assisted module that compares your office's public-facing performance against other representatives.

- **Competitors:** register rival representatives with their constituency and profile.
- **Metrics:** log periodic metric entries for them (social-media followers, press coverage, scheme announcements, etc.) and your own office's equivalents (**Own Metrics** are collected too).
- **Dashboard:** side-by-side trend charts showing where you lead/lag.
- **AI Analysis:** backend integration with **DeepSeek / Gemini** generates SWOT-style analysis, chat-based Q&A about competitive positioning, and improvement suggestions based on logged metrics.

> Treat AI output as advisory. Verify facts before acting on or publishing any analysis.

---

## 25. CRM Contacts

(**CRM Contacts** → `/crm/contacts`.) A lightweight CRM for important individuals — journalists, officers, donors, community figures, frequent complainants.

- **Contacts:** categorized profiles (ContactCategory) with phone/email/address, organization, and notes.
- **Interactions:** log every call/meeting/message with channel (CALL, MEETING, EMAIL, WHATSAPP…) and outcome notes.
- **Follow-ups:** schedule next actions per contact with status tracking (PENDING / DONE / OVERDUE).

The contact detail page shows the full relationship history so any staff member can pick up a conversation seamlessly.

---

## 26. Documents

(**Documents** in the sidebar.) The office's digital file cabinet.

- Upload files into categories (letters, circulars, court papers, media clippings…).
- **Versioning:** re-upload a revised file — old versions remain retrievable.
- **Linking:** attach documents to grievances, projects, schemes, contacts, etc., via document links so records cross-reference cleanly.
- Detail pages show version history, links, upload metadata, and stats.
- Search/filter by category, uploader, and date.

Supported formats and size limits depend on backend `MAX_FILE_SIZE` configuration. **Your subscription's storage quota applies to every upload** (see Section 29) — a file that would exceed the plan limit is rejected with a clear message.

---

## 27. Reports

Two reporting screens under **Reports**:

### 27.1 Analytics reports (`/reports`)

Interactive dashboards summarizing grievance resolution rates, departmental performance, project completion, fund utilization, ward-level activity — filterable by period and ward. Also shows **data-activity stats** (exports/imports) so you can see how much data moved through the office.

### 27.2 PDF reports (`/reports/pdf`)

Generate print-ready **PDF documents** (built with PDFKit on the backend):

- Monthly performance summaries
- Grievance registers
- Project status books
- Fund utilization statements

Choose report type + date range → download. These are suitable for submission to party leadership or government departments.

---

## 28. User Management & Permissions

(Admin area — requires SYSTEM_ADMIN or delegated rights.)

### 28.1 Creating users (`/users`)

1. Go to **User Management → Add User**.
2. Enter name, email (used for login), phone, and select a **role** (SYSTEM_ADMIN / MLA_MP / OFFICE_STAFF).
3. Set an initial password and share it securely; the user should change it at first login.
4. Users can be **activated/suspended** anytime — suspended users cannot log in.

> The number of active users you can create is capped by your plan's **user quota** (see Section 29).

### 28.2 Editing & deleting

Edit profile details or reset passwords from the user list. Deleting a user is soft-deleted (recoverable from Recycle Bin) and their historical audit entries remain intact.

### 28.3 Permission editor

Two levels of control:

- **Role defaults** (`/permissions`): pick a role, then toggle each module:action permission. All users of that role inherit it.
- **Per-user overrides** (User Management → user → Permissions): grant/deny specific permissions to one individual regardless of role. Overrides always win over role defaults.

Changes take effect on the user's next token refresh. The permission catalog includes the newer modules (e.g., `creative`/`creatives`, `voter_list`) alongside the classic ones.

---
## 29. Billing, Subscription & Plan Quotas

(`/billing`) Your constituency's subscription is managed by the platform operator. From this page you can view:

- Current plan, billing cycle, subscription status (TRIAL / ACTIVE / PAST_DUE / EXPIRED), and renewal date.
- Invoice history and payment records.
- Which **modules** your plan includes (a module not in your plan is hidden even if you have role permissions).
- **Plan limits** — users, voters, and storage included in your plan, plus the **usage summary** (how many users/voters you have created and how much storage you have used).

### 29.1 Usage limits enforced by the platform

| Limit | What happens when reached |
|---|---|
| **Users** (`maxUsers`) | Creating another user is blocked with a clear message; delete/suspend users or upgrade the plan |
| **Voters** (`maxVoters`) | Adding voters (manually or via bulk import) is blocked; the import report flags quota-exceeded rows |
| **Storage** (`storageLimitMB`) | Uploads (photos, documents, website media, etc.) are rejected with HTTP 413 and a clear message; deleting files frees space |

Limits apply to **all** types of creates including bulk imports. When a file is deleted (or its record removed), the used storage is released automatically.

### 29.2 Managing your subscription

If you need more modules, higher quotas, or a bigger plan, submit a **Plan Upgrade Request** here; the platform operator approves it from the Master Dashboard. Payments are processed via Razorpay.

> If your trial expires without activation, module access pauses until the operator activates a paid subscription. Your data is never deleted — it simply pauses.

---

## 30. Settings & Branding

(`/settings`, requires `settings:read`.) Tenant-level configuration:

| Group | Typical settings |
|---|---|
| Organization | Name, contact email/phone, address |
| Branding | Logo, primary color, constituency display name |
| Email | SMTP/mail credentials used by system notifications |
| WhatsApp | API credentials for message templates |
| Notifications | Enable/disable channels per event type |
| Localization | Default language |

Settings are stored as key–value pairs with typed values and sensible platform defaults; anything unset falls back automatically. Changes apply immediately across the app.

---

## 31. Audit Logs & Recycle Bin

### 31.1 Audit Logs (`/audit-logs`)

Every meaningful action in the system — logins, record creation/update/deletion, status changes, exports — is written to an immutable audit trail capturing **who**, **what**, **when**, and (for updates) before/after values.

- Filter by user, action type, module, entity, and date range.
- Use it to answer accountability questions ("who changed this grievance's priority?", "who tagged this voter as Our Voter?", "who published the website?").
- Social Media Hub actions (connect/disconnect/post/publish/retry) are recorded in the Social Audit Log as well.

### 31.2 Recycle Bin (`/recycle-bin`)

Deletes are **soft deletes**: removed records land here instead of being erased.

1. Open Recycle Bin and browse/filter deleted items by type.
2. **Restore** any item back to its module.
3. Items can be permanently purged (admin only).

This safety net means accidental deletions are almost never fatal.

---
## 32. Platform Administration (Master Dashboard)

The **Master Dashboard** (`http://localhost:5174`) is a separate app for the SaaS operator who runs the whole platform. Log in with a Platform User account (e.g., the seeded `superadmin@admin.mpmla.in`). It manages all constituency offices ("tenants"):

| Page | Purpose |
|---|---|
| **Dashboard** | Platform-wide stats — tenants, active subscriptions, revenue, trials ending |
| **Tenants** | Onboard constituency offices; set name, constituency, state/district; activate/suspend tenants; view storage used vs. plan limit |
| **Tenant Subscriptions** | Assign plans, start trials, mark payments, expire/renew subscriptions; see voters used + storage used per tenant |
| **Subscriptions & Plans** | Define plans (price, billing cycle, **user/voter/storage quotas**, included modules) |
| **Modules** | Master list of billable modules toggled into plans |
| **Payments & Invoices** | Track Razorpay transactions, generate/download invoices (PDF) |
| **Upgrade Requests** | Approve/reject tenant requests for plan changes |
| **Upcoming Renewals** | Watch subscriptions due for renewal; reminders emailed automatically by a scheduled job |
| **Platform Users** | Manage operator accounts (SUPER_ADMIN etc.) and their permissions |
| **Platform Settings** | Global keys — platform name, support email, default trial days, allow tenant creation |
| **Backups** | Create, download, restore, and delete tenant/full-platform backups |
| **Audit Logs** | Operator-side audit trail |
| **Recycle Bin** | Soft-deleted tenant/platform records |

### 32.1 Backup management (`/backups`)

The platform includes a built-in **backup & restore** tool. From **Backups** you can:

1. **Create a backup** — choose the tenant (or the whole platform) and add an optional note. The job snapshots the database tables plus the uploaded files (`public/` uploads) for that tenant.
2. **Track progress** — backups move through IN_PROGRESS → COMPLETED/FAILED; the list shows file size, record counts per table, who triggered it, and when.
3. **Download** — any COMPLETED backup can be downloaded as a JSON bundle for off-site storage.
4. **Restore** — restoring replaces the tenant's current data with the backup snapshot (a confirmation checkbox guards against accidents) and re-copies the snapshot files into `public/`. Storage used is recalculated after restore.
5. **Delete** — tidy up old backups; deletion is permanent.

Backup files are stored under `backend/public/uploads/backups/{tenantId}/`. Best practice: create a backup before major migrations, bulk imports, or tenant restores, and download a copy regularly for disaster recovery.

### The tenant lifecycle

```
Create Tenant → Trial (default 14 days) → Paid Subscription (ACTIVE)
      ↕ suspend/reactivate              ↓ non-payment
                                PAST_DUE / EXPIRED (module access paused)
```

---
## 33. Common Workflows (Step-by-Step)

### 33.1 Setting up a brand-new constituency office

1. Platform operator creates the tenant and starts a trial (Master Dashboard).
2. Log in as SYSTEM_ADMIN → **Geography Management**: add constituency → districts → blocks → wards.
3. **Departments:** add local departments with SLA rules.
4. **Users:** create staff accounts under correct roles (watch the plan's user quota).
5. **Settings:** upload logo, set org email, configure mail settings.
6. Bulk-import voters/geography via Excel where available.
7. (Optional) Add **helpline entries** and **connect social accounts** so day-one engagement is ready.
8. Start logging grievances, projects, and funds.

### 33.2 Handling a citizen complaint end-to-end

1. Citizen visits office / Janata Darbar → issue Darbar **token** (or directly create grievance).
2. Staff create the **grievance** with category + ward + attachments.
3. Assign to the responsible department; SLA clock starts.
4. Department/staff update status with notes as work proceeds.
5. Mark RESOLVED with resolution summary → citizen informed → ticket CLOSED.
6. Monthly PDF report shows resolution statistics for review.

### 33.3 Approving a citizen facility registration

1. Citizen submits `/register-public-facility` form with proofs (no login needed); org email notified automatically.
2. Staff open **Public Facility Requests**, verify uploaded documents.
3. Click **Approve** → facility appears in the main directory; or **Reject** with a reason.

### 33.4 Adding a development project with milestones

1. Ensure the funding source exists (**Funds**).
2. Create project, link fund, enter sanctioned amount and dates.
3. Add milestones ("Foundation", "Structure", "Finishing"…) with target dates.
4. As work progresses, post updates, upload site photos, adjust utilized amount.
5. Completion percentage reflects milestone progress on dashboards and reports.

### 33.5 Running a monthly review

1. Generate **PDF reports** for grievances/projects/funds.
2. Review **Analytics reports** for departmental SLA breaches.
3. Check the pending **Tasks** list and reassign stale items.
4. Scan **Audit Logs** for unusual activity.
5. Verify your **storage & voter usage** against the plan (Billing) and check for quota warnings.

### 33.6 Designing and publishing a campaign post

1. Open **Creative Studio** → choose a template (e.g., Birthday or Meeting).
2. Edit the text, apply the **Brand Kit**, and export **PNG/JPG**.
3. Open **Social Media Hub** → **New Post**, attach the image, pick target accounts.
4. Publish now or **schedule**; get it approved if required by your workflow.
5. Track **likes/comments/shares** via Sync metrics; file the best-performing design back into **Saved Designs**.

### 33.7 Launching the constituency website

1. **Website Builder → New Website**, pick the slug and a template.
2. Add sections to the home page (Hero, Stats, Projects, Grievance Form, Office Contact). Create extra pages if needed.
3. Set **theme colors, logo, favicon, and social links**; verify the live preview.
4. Optional: add a **custom domain** and verify DNS.
5. Click **Publish** → share `https://{slug}.mpmla.in` on social media and printed materials.
6. Update content over time; each publish creates a version you can roll back to.

### 33.8 Voter outreach cycle

1. Import the electoral roll via **bulk upload**; review the error report and re-upload fixes.
2. Tag leaning during canvassing (**Our Voter / Supporter / Influencer / Neutral / Opposition**).
3. Filter **Our Voters** per ward/booth for polling-day rosters and outreach lists.
4. Create saved creative for the booth meeting, publish via Social Hub, and print posters.
5. Point voters to the **Voter Portal** to update their phone/address — keeps the registry fresh.
6. Re-sync **demographics** so ward charts reflect the latest voter data.

---
## 34. Frequently Asked Questions

**Q: I can't see a module in my sidebar.**
Your role/user lacks the read permission, or the module isn't included in your subscription plan. Contact your administrator (or platform operator for plan issues).

**Q: I deleted a ward/project by mistake.**
Open **Recycle Bin**, find it, click Restore.

**Q: Can two offices use the same installation?**
Yes — data is isolated per tenant. Each office only ever sees its own records.

**Q: Does the public form expose our data?**
No. Public pages (facility registration, helpline directory, voter portal, website) only expose the records meant for the public. Voter canvassing/leaning data is never shown publicly.

**Q: How do I give one staff member extra rights?**
User Management → that user → Permissions → add specific grants (overrides beat role defaults).

**Q: What happens when our trial ends?**
Module access pauses until the operator assigns a paid plan; your data remains intact.

**Q: Are exports available for everything?**
Most list modules (grievances, projects, funds, voters, leaders, tasks…) have Excel export buttons; reports also export to PDF.

**Q: I hit a "storage quota exceeded" error while uploading.**
Your plan has a storage limit (see Billing). Delete unused documents/attachments first, or submit an upgrade request to increase the quota.

**Q: I can't add more voters.**
Your plan has a max-voter quota. Reduce duplicates/deleted records, or upgrade the plan via Billing → Upgrade Request.

**Q: Where is my website live?**
At `https://{your-slug}.mpmla.in` (or your custom domain). In development it's `http://localhost:5173/site/{slug}`. You must **Publish** from the Website Builder for changes to go live.

**Q: How do I schedule a social media post?**
Social Media Hub → New Post → set a date/time and choose targets. Background jobs publish it automatically; failed targets can be retried.

**Q: Can I point my own domain to the website?**
Yes — add it in Websites → Domains, configure the CNAME/A record at your registrar, and click Verify DNS.

**Q: Who can see the Voter Portal?**
Any citizen with a valid Application Number in your registry. Each voter sees only their own record.

**Q: How do I recover a tenant's data?**
Platform operator opens Master Dashboard → **Backups**, and either downloads or restores an existing backup (restore required a confirmation).

---

## 35. Troubleshooting

| Problem | Likely cause & fix |
|---|---|
| Login fails but password is correct | Account suspended/expired — ask admin to check user status |
| "Too many attempts" error on login | Auth rate limiting triggered; wait a few minutes (limits configurable via env) |
| Page loads but no data / network errors | Backend not running or wrong `VITE_API_URL`; confirm API answers at `http://localhost:5000/api` |
| File upload rejected | Exceeds `MAX_FILE_SIZE`, unsupported format, or **storage quota reached** — check Billing and free space |
| "Voter quota limit exceeded" on save/import | Plan max-voter limit reached — clean up or upgrade the plan |
| Emails not sending | Mail settings missing/wrong in Settings, or server can't reach SMTP |
| Voter Portal login fails | Application number not yet issued (record created without one) or password not set/OTP expired |
| Website changes not visible publicly | The site hasn't been **Publish**ed, or DNS/SSL still verifying for a custom domain |
| Social post not publishing | Unauthorized/expired connection (Test Connection in Social Hub), approval pending, or publish job failed — click Retry |
| Admin's changes not reflected for a user | Permissions refresh on token rotation — user logs out/in once |
| Charts show empty | No data for selected filters/date range yet — re-run Demographics sync after voter imports |
| Subscription expired banner | Contact platform operator via Billing page to renew |
| Forgot admin password | Another SYSTEM_ADMIN resets it from User Management; if none exists, a developer must reset it in the database |
| Bulk import rows failed | Check the per-row error report — usually duplicate IDs or invalid references; fix and re-upload |
| Storage used looks wrong after a restore | Restore recalculates storage automatically; contact operator if numbers still look off |

---

## Security Notes for All Users

- Never share logins; every action is audit-logged under your name.
- Use strong unique passwords; change the seeded demo credentials immediately.
- Voter and citizen personal data must stay within the office — exports are logged.
- Political leaning/canvassing data is confidential and must never be shared externally.
- Social media tokens are encrypted at rest; do not share account credentials with staff outside your office.
- Report suspected unauthorized access to your SYSTEM_ADMIN immediately.

---

*© Constituency Management System (MP-MLA). Proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.*
---