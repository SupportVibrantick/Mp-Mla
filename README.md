# Constituency Management System

The Constituency Management System (CMS) is a comprehensive digital platform designed for Members of Parliament (MP), Members of Legislative Assembly (MLA), and their administrative offices. This platform streamlines the governance, monitoring, and development activities within a constituency, providing data-driven insights and efficient grievance redressal mechanisms.

---

## Key Modules

### Administrative Dashboard
- **Role-Based Access Control (RBAC)**: Distinct permissions for System Admins, MLA/MP, and Office Staff.
- **Constituency Branding**: Customizable interface with constituency-specific logos, colors, and representative profiles.
- **Audit Logging**: Comprehensive tracking of all system actions for transparency and accountability.

### Ward and Area Management
- **Hierarchical Structure**: Management of wards and sub-areas with detailed demographic data.
- **Demographic Insights**: Tracking population distribution across age, gender, religion, and social categories.
- **Voter Analysis**: Monitoring voter counts and new voter registrations at the ward level.

### Infrastructure and Institution Tracking
- **Institution Directory**: Centralized database for schools, hospitals, religious sites (Temples, Mosques, Gurudwaras, Churches), government offices, and NGOs.
- **Incharge Management**: Tracking administrative heads and contact persons for each institution.
- **KYC & Requests**: Workflow for adding new institutions with document verification.

### Grievance Redressal System
- **Ticket Management**: Automated ticket generation for citizen complaints with priority levels.
- **Departmental Assignment**: Dynamic routing of grievances to relevant departments or staff members.
- **Timeline Tracking**: Historical logs of grievance status changes, resolution notes, and escalation reasons.

### Project and Fund Monitoring
- **Development Projects**: End-to-end monitoring of construction and development projects (MPLAD, MLALAD, State/Central Funds).
- **Financial Tracking**: Budget sanctioned vs. utilized tracking with completion percentage indicators.
- **Timeline Management**: Monitoring project schedules from start date to actual completion.

### Community Engagement
- **Community Groups**: Integration with Resident Welfare Associations (RWA), Trade Unions, and Youth Groups.
- **Task Management**: Internal task assignment for office staff to ensure timely completion of constituency duties.

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Primary Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens) with Refresh Token rotation
- **Security**: Helmet, Express-Rate-Limit, Bcrypt.js
- **Validation**: Zod
- **Email Services**: Nodemailer

### Frontend
- **Library**: React.js (v19)
- **Tooling**: Vite
- **Styling**: Tailwind CSS
- **Component Library**: Radix UI (Shadcn UI)
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form
- **Data Visualization**: Recharts

---

## Project Structure

```text
Constituency-Management/
├── backend/                # Express API with Prisma ORM
│   ├── prisma/             # Database schema and migrations
│   ├── src/                # API source code
│   └── bin/                # Server entry point
├── frontend/               # React Application (Vite)
│   ├── client/             # Frontend source code
│   │   └── src/            # Components, pages, hooks, etc.
│   └── shared/             # Shared types and utilities
└── README.md               # Project documentation
```

---

## Installation Guide

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file based on `.env.example`.
   - Update `DATABASE_URL` with your PostgreSQL credentials.
4. Initialize the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. Seed initial data (optional):
   ```bash
   npm run db:seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file and set `VITE_API_URL` to your backend URL (usually `http://localhost:5000`).
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Deployment

### Building for Production
- **Backend**:
  ```bash
  cd backend
  npm run build
  npm start
  ```
- **Frontend**:
  ```bash
  cd frontend
  npm run build
  ```

---

## Maintenance and Support

For internal development, ensure all schema changes are recorded via Prisma migrations and all environment variables are updated across the deployment environment.

---

## License
This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
