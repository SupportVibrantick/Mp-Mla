# Constituency Management System (MP-MLA) — User Manual

**Version:** 1.0
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
9. [Grievances (Public Requests)](#9-grievances-public-requests)
10. [Public Facilities & Citizen Registration](#10-public-facilities--citizen-registration)
11. [Departments](#11-departments)
12. [Development Projects](#12-development-projects)
13. [Funds & Financial Tracking](#13-funds--financial-tracking)
14. [Government Schemes & Applications](#14-government-schemes--applications)
15. [Tasks (Internal Work Management)](#15-tasks-internal-work-management)
16. [Community Groups](#16-community-groups)
17. [Leaders, Birthdays & Greetings](#17-leaders-birthdays--greetings)
18. [Meetings, Events, Janata Darbar & Appointments](#18-meetings-events-janata-darbar--appointments)
19. [Competitor Analysis (AI-Powered)](#19-competitor-analysis-ai-powered)
20. [CRM Contacts](#20-crm-contacts)
21. [Documents](#21-documents)
22. [Reports](#22-reports)
23. [User Management & Permissions](#23-user-management--permissions)
24. [Billing & Subscription](#24-billing--subscription)
25. [Settings & Branding](#25-settings--branding)
26. [Audit Logs & Recycle Bin](#26-audit-logs--recycle-bin)
27. [Platform Administration (Master Dashboard)](#27-platform-administration-master-dashboard)
28. [Common Workflows (Step-by-Step)](#28-common-workflows-step-by-step)
29. [Frequently Asked Questions](#29-frequently-asked-questions)
30. [Troubleshooting](#30-troubleshooting)

---

## 1. Introduction

The **Constituency Management System (CMS)** is a complete digital platform built for Members of Parliament (MP), Members of Legislative Assembly (MLA), and their administrative offices. It replaces registers, spreadsheets, and scattered WhatsApp messages with one organized system where your office can:

- Track every ward, village, booth, and demographic detail of the constituency.
- Register and resolve citizen grievances (tickets) with full timelines.
- Monitor development projects, funds (MPLAD / MLALAD / State / Central), and schemes.
- Manage institutions, public facilities, community groups, and local leaders.
- Plan meetings, events, Janata Darbars, and appointments.
- Keep an internal document vault, task board, CRM contacts, and audit trail.

The system is **multi-tenant**: each constituency office gets its own secure, isolated workspace, while a central **Platform Operator** manages subscriptions, modules, and billing through a separate Master Dashboard.

### Who should read which section?

| Reader | Read sections |
|---|---|
| MLA / MP | 4, 5, 6, 9–14, 18, 22 |
| Office Administrator | All sections |
| Office Staff / Data Entry | 4, 6–22 |
| Platform Operator (SaaS owner) | 3, 27 |

---

## 2. System Overview & Architecture

The product consists of **three applications**:

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
            │ Prisma ORM
     ┌──────▼──────┐
     │ PostgreSQL  │  (shared DB, tenant-isolated rows)
     └─────────────┘
```

### The three API surfaces

| Surface | URL prefix | Auth | Used by |
|---|---|---|---|
| **Public API** | `/api/public` | None (rate-limited) | Citizens registering facilities; dropdown data for the public form |
| **Admin API** | `/api/admin` | Tenant user JWT | The main constituency app (all staff users) |
| **Platform API** | `/api/platform` | Platform user JWT | Master Dashboard (SaaS operator only) |

### Technology summary

- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT with refresh-token rotation, Zod validation, Helmet + rate limiting, Nodemailer email, Multer uploads, ExcelJS/PDFKit exports, Razorpay payments, DeepSeek/Gemini AI integration.
- **Constituency Frontend:** React 19, Vite, Tailwind CSS, Shadcn/Radix UI, TanStack Query, Wouter routing, React Hook Form, Recharts, Framer Motion.
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
| **OFFICE_STAFF** | PAs, secretaries, data-entry operators | Working access to day-to-day modules (grievances, tasks, events, voter lists, etc.), restricted admin functions. |

*(On the Master Dashboard side there is a separate **SUPER_ADMIN** platform role — see Section 27.)*

### 5.2 How permissions work

Every screen action maps to a **module : action** pair (e.g., `grievances:update`, `projects:create`). When deciding access, the system checks in order:

1. **SYSTEM_ADMIN?** → always allowed.
2. **Per-user override** set by an admin for that specific user → wins if present.
3. **Role default** assigned to your role → used otherwise.
4. Nothing found → **denied**.

This means two OFFICE_STAFF users can have different abilities — e.g., a data-entry operator may be explicitly blocked from sending notifications even though other staff can.

### 5.3 Actions you'll encounter

| Action | Meaning |
|---|---|
| `read` | View lists and details |
| `create` | Add new records |
| `update` | Edit existing records |
| `delete` | Remove records (soft-deleted to Recycle Bin) |
| Others (`export`, `bulk`, `send`, …) | Module-specific extras |

Administrators manage these in **User Management → Permissions** (see Section 23).

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

Maintain the public profile of the sitting MP/MLA — photo, party, contact details, and bio used across reports and branding.

### 7.4 Districts & Blocks

Add districts within the constituency, then blocks within each district. Both support edit/delete and detail views.

### 7.5 Towns / Villages

Register towns and villages under blocks, each typed (Nagar Palika / Nagar Panchayat / Gram Panchayat / Village, etc.) with population data.

### 7.6 Wards (`/geography/wards`)

Wards are the operational heart of constituency work:

- Ward number, name, councillor details (**Ward Councillors** sub-records).
- **Areas** inside a ward (colonies, localities) with area types.
- Status management (ACTIVE/INACTIVE).
- Detail pages show demographics, grievances, and projects tied to that ward.

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

### 8.2 Voter List (`/voter-list`)

A searchable registry of voters:

| Feature | How |
|---|---|
| Search | Filter by name, voter ID, ward, booth, gender, age |
| Add manually | "Add Voter" form with personal + booth details |
| Bulk upload | Excel-based bulk job with validation report |
| Export | Download filtered lists to Excel |
| Demographics sync | Recalculate ward-level aggregates from voter data |

> Voter data is sensitive. Access is permission-controlled and every view/change is audit-logged.

---

## 9. Grievances (Public Requests)

The Grievance module (**Public Requests** in the sidebar) is your office's complaint ticketing system.

### 9.1 Understanding a grievance record

Each grievance contains: ticket number, complainant name/contact, category (water, roads, electricity, …), description, ward, **priority** (LOW / MEDIUM / HIGH / URGENT), **status**, assigned department/staff, attachments, and a full **timeline** of every status change.

### 9.2 Status lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
               ↘ REJECTED / ESCALATED
```

### 9.3 Day-to-day use

1. **Create:** `Public Requests → New`. Fill complainant details, pick category/ward, set priority, attach photos/documents if any.
2. **Triage:** Filter the list by status/priority/ward; open a ticket and **assign it to a department or staff member**.
3. **Work it:** Update status as progress happens — every change is appended to the timeline with who/when/notes.
4. **Resolve:** Mark RESOLVED with resolution notes; optionally close after citizen confirmation.
5. **Bulk actions:** Select multiple tickets to change status or assign in bulk (permission-gated).
6. **Export:** Push the filtered list to Excel for physical reporting.

### 9.4 Tips

- Use HIGH/URGENT priority sparingly — dashboards sort by priority.
- Always write clear timeline notes; they become evidence in monthly performance reports.

---

## 10. Public Facilities & Citizen Registration

### 10.1 Public facility directory (`/public-facilities`)

Central directory of schools, hospitals, anganwadis, religious sites, government offices, NGOs, etc. Each record includes category/subcategory, address, ward link, capacity, established date, contact details, and an **Incharge** (head person with designation, phone, DOB, appointment date).

Actions: create/edit facilities, bulk upload, export, and manage incharges.

### 10.2 Citizen-initiated registrations (`/register-public-facility`)

This is a **public web page that requires no login**. Any citizen can:

1. Choose their constituency and ward.
2. Submit institution details (name, category, address, head-person info).
3. Attach proof documents (institution proof, identity proof, address proof).

Submissions land in **Public Facility Requests** (`/public-facility-requests`) inside the office app with status PENDING. Staff review documents and either **approve** (the facility enters the main directory) or **reject** with a reason. The system automatically emails the organization's registered email about the new request.

---

## 11. Departments

Departments (**Departments** in the sidebar) represent the government/utility departments grievances are routed to — PWD, Water Works, Electricity Board, Health, etc.

- Create a department with name, description, head/contact person, and contact details.
- Attach **SLA rules** (DepartmentSLA) defining expected resolution time per grievance category — used to flag overdue tickets.
- Department detail pages show assigned grievances, workload, and performance.
- Bulk upload and export are supported.

Set up departments *before* logging grievances so assignment is possible at triage time.

---

## 12. Development Projects

(**Projects** in the sidebar.) End-to-end tracking of construction and development works funded through MPLAD / MLALAD / State / Central funds.

### 12.1 Creating a project

From `Projects → New`, capture:

- Name, description, category, executing agency/contractor
- Source of fund & linked fund record
- Location (ward/district), sanctioned amount, utilized amount
- Scheduled start/end dates, current **status**

### 12.2 Project statuses

`PLANNED → TENDERED → IN_PROGRESS → COMPLETED`, plus `ON_HOLD` / `CANCELLED`.

### 12.3 Tracking tools on the project detail page

| Tool | Purpose |
|---|---|
| **Milestones** | Break the work into checkpoints with due dates and completion marks |
| **Updates** | Progress journal entries (e.g., "foundation complete") |
| **Timeline** | Chronological log of all project events |
| **Attachments** | Photos, DPRs, bills, work orders |

### 12.4 Lists, bulk & export

The list page offers filters by status/ward/fund, percentage-complete indicators, bulk operations, and Excel export for review meetings.

---

## 13. Funds & Financial Tracking

(**Funds** in the sidebar → `/funds`.) Track every rupee that enters the constituency office.

- **Fund sources:** MPLAD, MLALAD, State Fund, Central Fund, and other custom funds — each with total sanctioned amount.
- **Transactions:** record individual releases/expenditures against a fund; running balance is computed automatically.
- **Overview page:** shows all funds with sanctioned vs. utilized bars and remaining balance at a glance.
- **Fund detail:** full transaction history, linked projects spending from this fund, export to Excel.

Best practice: create the fund first (e.g., "MPLAD 2025-26"), then link projects and log transactions as money moves so utilization percentages stay accurate.

---

## 14. Government Schemes & Applications

Two related modules under **Schemes**:

### 14.1 Scheme catalog (`/schemes`)

Maintain a directory of government welfare schemes (state/central level) with:

- Name, description, **level** (Central / State / District), department, eligibility criteria, benefits, application process, official link, and status (ACTIVE / INACTIVE / ARCHIVED).

Use this as your office's knowledge base when citizens ask "which scheme applies to me?"

### 14.2 Scheme applications (`/schemes/applications`)

When a citizen applies for a scheme through your office, log an application:

1. `Applications → New` — pick the citizen/contact, select the scheme, enter details, attach supporting documents.
2. Track status: `SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED / DISBURSED`.
3. The detail page keeps documents and the full status history, so any staff member can answer "what happened to my application?"

---

## 15. Tasks (Internal Work Management)

(**Tasks** → `/tasks`.) The internal to-do board for office staff.

- Create tasks with title, description, assignee, due date, priority (LOW/MEDIUM/HIGH/URGENT), and status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- Link tasks to grievances, events, or correspondence where relevant.
- Every status change is recorded in a task timeline for accountability.
- Bulk create/update and Excel export supported.
- Staff see their own queue; admins see everyone's workload.

Tip: convert recurring duties (weekly reports, meeting follow-ups) into tasks so nothing slips.

---

## 16. Community Groups

(**Community Groups** in the sidebar.) Directory of organized community bodies:

- Types: **RWA** (Resident Welfare Associations), Trade Unions, Youth Groups, Women's Groups, NGOs, etc.
- Each group stores name, type, ward/area, office bearers, member strength, and contact info.
- Detail pages track interactions and related events.
- Bulk upload and export available.

Use this list before any event or announcement to know exactly which stakeholder groups exist in each ward.

---

## 17. Leaders, Birthdays & Greetings

(**Local Representatives** and **Birthdays** in the sidebar.)

### 17.1 Leader directory

Records of political/social figures in the constituency: booth-level workers, mandal presidents, panchayat heads, party functionaries — categorized via **LeaderCategory** (e.g., Booth Level, Mandal Level, District Level).

Each leader has contact details, ward/booth linkage, photo, and notes. Bulk upload and export are included.

### 17.2 Birthdays page (`/birthdays`)

A month-wise calendar of upcoming birthdays across leaders and institution heads, so the office never misses a call or greeting.

### 17.3 Greetings log

Record every birthday/festival greeting sent (call, letter, WhatsApp, visit) per leader — useful during election season to demonstrate relationship maintenance.

---

## 18. Meetings, Events, Janata Darbar & Appointments

All public-engagement scheduling lives in this cluster (permission module: `meeting`).

### 18.1 Meetings (`/meetings`)

Internal/official meetings: schedule with date-time, venue, agenda, attendees, and outcomes. A background **scheduler service** on the backend sends reminders and auto-updates meeting status when times pass.

### 18.2 Events (`/events`)

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

### 18.3 Janata Darbar (`/janata-darbar`)

The public hearing system:

1. **Create a session** (regular/special) with date, time, and venue.
2. On the session page, issue **tokens** to citizens as they arrive — each token captures name, contact, and issue summary.
3. Call tokens one by one during the darbar; mark each as SERVED / SKIPPED.
4. Convert serious issues directly into grievances from the token.

This digitizes the traditional queue-management of an MLA/MP office.

### 18.4 Appointments (`/appointments`)

One-on-one appointment diary: visitor details, purpose, type (walk-in / scheduled / VIP), requested slot, and approval workflow (PENDING → APPROVED → COMPLETED / REJECTED). Conflicts and past appointments are visible to avoid double-booking.

---

## 19. Competitor Analysis (AI-Powered)

(**Competitor Analysis** in the sidebar.) An AI-assisted module that compares your office's public-facing performance against other representatives.

- **Competitors:** register rival representatives with their constituency and profile.
- **Metrics:** log periodic metric entries for them (social-media followers, press coverage, scheme announcements, etc.) and your own office's equivalents (**Own Metrics** are collected too).
- **Dashboard:** side-by-side trend charts showing where you lead/lag.
- **AI Analysis:** backend integration with **DeepSeek / Gemini** generates SWOT-style analysis, chat-based Q&A about competitive positioning, and improvement suggestions based on logged metrics.

> Treat AI output as advisory. Verify facts before acting on or publishing any analysis.

---

## 20. CRM Contacts

(**CRM Contacts** → `/crm/contacts`.) A lightweight CRM for important individuals — journalists, officers, donors, community figures, frequent complainants.

- **Contacts:** categorized profiles (ContactCategory) with phone/email/address, organization, and notes.
- **Interactions:** log every call/meeting/message with channel (CALL, MEETING, EMAIL, WHATSAPP…) and outcome notes.
- **Follow-ups:** schedule next actions per contact with status tracking (PENDING / DONE / OVERDUE).

The contact detail page shows the full relationship history so any staff member can pick up a conversation seamlessly.

---

## 21. Documents

(**Documents** in the sidebar.) The office's digital file cabinet.

- Upload files into categories (letters, circulars, court papers, media clippings…).
- **Versioning:** re-upload a revised file — old versions remain retrievable.
- **Linking:** attach documents to grievances, projects, schemes, contacts, etc., via document links so records cross-reference cleanly.
- Detail pages show version history, links, upload metadata, and stats.
- Search/filter by category, uploader, and date.

Supported formats and size limits depend on backend `MAX_FILE_SIZE` configuration; uploads are stored server-side under `UPLOAD_DIR`.

---

## 22. Reports

Two reporting screens under **Reports**:

### 22.1 Analytics reports (`/reports`)

Interactive dashboards summarizing grievance resolution rates, departmental performance, project completion, fund utilization, ward-level activity — filterable by period and ward.

### 22.2 PDF reports (`/reports/pdf`)

Generate print-ready **PDF documents** (built with PDFKit on the backend):

- Monthly performance summaries
- Grievance registers
- Project status books
- Fund utilization statements

Choose report type + date range → download. These are suitable for submission to party leadership or government departments.

---

## 23. User Management & Permissions

(Admin area — requires SYSTEM_ADMIN or delegated rights.)

### 23.1 Creating users (`/users`)

1. Go to **User Management → Add User**.
2. Enter name, email (used for login), phone, and select a **role** (SYSTEM_ADMIN / MLA_MP / OFFICE_STAFF).
3. Set an initial password and share it securely; the user should change it at first login.
4. Users can be **activated/suspended** anytime — suspended users cannot log in.

### 23.2 Editing & deleting

Edit profile details or reset passwords from the user list. Deleting a user is soft-deleted (recoverable from Recycle Bin) and their historical audit entries remain intact.

### 23.3 Permission editor

Two levels of control:

- **Role defaults** (`/permissions`): pick a role, then toggle each module:action permission. All users of that role inherit it.
- **Per-user overrides** (User Management → user → Permissions): grant/deny specific permissions to one individual regardless of role. Overrides always win over role defaults.

Changes take effect on the user's next token refresh.

---

## 24. Billing & Subscription

(`/billing`) Your constituency's subscription is managed by the platform operator. From this page you can view:

- Current plan, billing cycle, subscription status (TRIAL / ACTIVE / PAST_DUE / EXPIRED), and renewal date.
- Invoice history and payment records.
- Which **modules** your plan includes (a module not in your plan is hidden even if you have role permissions).

If you need more modules or a higher plan, submit a **Plan Upgrade Request** here; the platform operator approves it from the Master Dashboard. Payments are processed via Razorpay.

> If your trial expires without activation, module access pauses until the operator activates a paid subscription.

---

## 25. Settings & Branding

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

## 26. Audit Logs & Recycle Bin

### 26.1 Audit Logs (`/audit-logs`)

Every meaningful action in the system — logins, record creation/update/deletion, status changes, exports — is written to an immutable audit trail capturing **who**, **what**, **when**, and (for updates) before/after values.

- Filter by user, action type, module, entity, and date range.
- Use it to answer accountability questions ("who changed this grievance's priority?").

### 26.2 Recycle Bin (`/recycle-bin`)

Deletes are **soft deletes**: removed records land here instead of being erased.

1. Open Recycle Bin and browse/filter deleted items by type.
2. **Restore** any item back to its module.
3. Items can be permanently purged (admin only).

This safety net means accidental deletions are almost never fatal.

---

## 27. Platform Administration (Master Dashboard)

The **Master Dashboard** (`http://localhost:5174`) is a separate app for the SaaS operator who runs the whole platform. Log in with a Platform User account (e.g., the seeded `superadmin@admin.mpmla.in`). It manages all constituency offices ("tenants"):

| Page | Purpose |
|---|---|
| **Dashboard** | Platform-wide stats — tenants, active subscriptions, revenue, trials ending |
| **Tenants** | Onboard constituency offices; set name, constituency, state/district; activate/suspend tenants |
| **Tenant Subscriptions** | Assign plans, start trials, mark payments, expire/renew subscriptions |
| **Subscriptions & Plans** | Define plans (price, billing cycle, included modules) |
| **Modules** | Master list of billable modules toggled into plans |
| **Payments & Invoices** | Track Razorpay transactions, generate/download invoices (PDF) |
| **Upgrade Requests** | Approve/reject tenant requests for plan changes |
| **Upcoming Renewals** | Watch subscriptions due for renewal; reminders emailed automatically by a scheduled job |
| **Platform Users** | Manage operator accounts (SUPER_ADMIN etc.) and their permissions |
| **Platform Settings** | Global keys — platform name, support email, default trial days, allow tenant creation |
| **Audit Logs** | Operator-side audit trail |
| **Recycle Bin** | Soft-deleted tenant/platform records |

### The tenant lifecycle

```
Create Tenant → Trial (default 14 days) → Paid Subscription (ACTIVE)
      ↕ suspend/reactivate              ↓ non-payment
                                PAST_DUE / EXPIRED (module access paused)
```

---

## 28. Common Workflows (Step-by-Step)

### 28.1 Setting up a brand-new constituency office

1. Platform operator creates the tenant and starts a trial (Master Dashboard).
2. Log in as SYSTEM_ADMIN → **Geography Management**: add constituency → districts → blocks → wards.
3. **Departments:** add local departments with SLA rules.
4. **Users:** create staff accounts under correct roles.
5. **Settings:** upload logo, set org email, configure mail settings.
6. Bulk-import voters/geography via Excel where available.
7. Start logging grievances, projects, and funds.

### 28.2 Handling a citizen complaint end-to-end

1. Citizen visits office / Janata Darbar → issue Darbar **token** (or directly create grievance).
2. Staff create the **grievance** with category + ward + attachments.
3. Assign to the responsible department; SLA clock starts.
4. Department/staff update status with notes as work proceeds.
5. Mark RESOLVED with resolution summary → citizen informed → ticket CLOSED.
6. Monthly PDF report shows resolution statistics for review.

### 28.3 Approving a citizen facility registration

1. Citizen submits `/register-public-facility` form with proofs (no login needed); org email notified automatically.
2. Staff open **Public Facility Requests**, verify uploaded documents.
3. Click **Approve** → facility appears in the main directory; or **Reject** with a reason.

### 28.4 Adding a development project with milestones

1. Ensure the funding source exists (**Funds**).
2. Create project, link fund, enter sanctioned amount and dates.
3. Add milestones ("Foundation", "Structure", "Finishing"…) with target dates.
4. As work progresses, post updates, upload site photos, adjust utilized amount.
5. Completion percentage reflects milestone progress on dashboards and reports.

### 28.5 Running a monthly review

1. Generate **PDF reports** for grievances/projects/funds.
2. Review **Analytics reports** for departmental SLA breaches.
3. Check the pending **Tasks** list and reassign stale items.
4. Scan **Audit Logs** for unusual activity.

---

## 29. Frequently Asked Questions

**Q: I can't see a module in my sidebar.**
Your role/user lacks the read permission, or the module isn't included in your subscription plan. Contact your administrator (or platform operator for plan issues).

**Q: I deleted a ward/project by mistake.**
Open **Recycle Bin**, find it, click Restore.

**Q: Can two offices use the same installation?**
Yes — data is isolated per tenant. Each office only ever sees its own records.

**Q: Does the public form expose our data?**
No. The public page only accepts new registrations and shows dropdowns of constituencies/wards. It cannot read office records.

**Q: How do I give one staff member extra rights?**
User Management → that user → Permissions → add specific grants (overrides beat role defaults).

**Q: What happens when our trial ends?**
Module access pauses until the operator assigns a paid plan; your data remains intact.

**Q: Are exports available for everything?**
Most list modules (grievances, projects, funds, voters, leaders, tasks…) have Excel export buttons; reports also export to PDF.

---

## 30. Troubleshooting

| Problem | Likely cause & fix |
|---|---|
| Login fails but password is correct | Account suspended/expired — ask admin to check user status |
| "Too many attempts" error on login | Auth rate limiting triggered; wait a few minutes (limits configurable via env) |
| Page loads but no data / network errors | Backend not running or wrong `VITE_API_URL`; confirm API answers at `http://localhost:5000/api` |
| File upload rejected | Exceeds `MAX_FILE_SIZE` or unsupported format; compress and retry |
| Emails not sending | Mail settings missing/wrong in Settings, or server can't reach SMTP |
| Admin's changes not reflected for a user | Permissions refresh on token rotation — user logs out/in once |
| Charts show empty | No data for selected filters/date range yet |
| Subscription expired banner | Contact platform operator via Billing page to renew |
| Forgot admin password | Another SYSTEM_ADMIN resets it from User Management; if none exists, a developer must reset it in the database |
| Bulk import rows failed | Check the per-row error report — usually duplicate IDs or invalid references; fix and re-upload |

---

## Security Notes for All Users

- Never share logins; every action is audit-logged under your name.
- Use strong unique passwords; change the seeded demo credentials immediately.
- Voter and citizen personal data must stay within the office — exports are logged.
- Report suspected unauthorized access to your SYSTEM_ADMIN immediately.

---

*© Constituency Management System (MP-MLA). Proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.*








