# Guest Auto Ops: Hotel Automation System

A comprehensive hotel property management system built with modern web technologies, with a real Express + Prisma + PostgreSQL backend. Streamline hotel operations with automated workflows, real-time dashboards, and role-based access control.

## ✨ Features

### 🏨 Core Hotel Management
- **Room Management**: Track room status (available, occupied, dirty, maintenance), pricing, and amenities
- **Guest Profiles**: Maintain detailed guest information, preferences, stay history, and VIP status
- **Booking Engine**: Handle reservations, check-ins/outs, modifications, and cancellations
- **Housekeeping Automation**: Automatically generate cleaning tasks based on booking status changes
- **Staff Management**: Assign roles, track performance, and manage team schedules

### 💰 Financial Operations
- **Invoicing & Payments**: Generate invoices, track payment status, and manage folios
- **Expense Tracking**: Monitor operational costs by category and property
- **Revenue Analytics**: Real-time KPIs for daily, weekly, monthly, and yearly performance
- **Multi-currency Support**: Handle transactions in various currencies with automatic conversion

### 🤖 Intelligent Automation
- **Workflow Automation**: Trigger actions based on events (check-ins, check-outs, payments)
- **Custom Rules Engine**: Create property-specific automation without coding
- **Notifications System**: Automated alerts for staff and guests via email/internal messaging
- **Maintenance Tracking**: Schedule and track preventive maintenance and repairs

### 📊 Analytics & Reporting
- **Real-time Dashboard**: Occupancy rates, revenue metrics, and operational KPIs
- **Activity Feed**: Audit trail of all system actions and user activities
- **Custom Reports**: Generate reports on bookings, revenue, expenses, and guest statistics
- **Performance Insights**: Identify trends and optimization opportunities

### 🔐 Security & Access Control
- **Role-Based Access Control (RBAC)**: Granular permissions for Super Admin, Owner, Manager, and Housekeeping roles
- **Multi-property Support**: Super Admin view for managing multiple hotels from one dashboard
- **Secure Authentication**: Email/password login with session management
- **Data Privacy**: Role-specific data visibility and access restrictions

## 🛠️ Technology Stack

### Frontend Framework
- **React 18** - Modern component-based UI library
- **TypeScript** - Static typing for enhanced developer experience and code reliability
- **Vite** - Lightning-fast build tool and development server

### UI & Styling
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Shadcn-ui** - Reusable, accessible component library built on Radix UI
- **Lucide Icons** - Beautiful, consistent icon set
- **Sonner** - Toast notification system
- **Recharts** - Data visualization library for charts and graphs

### State Management & Data
- **TanStack Query (React Query)** - Server state management, caching, and background updates
- **React Hook Form** - Performant form validation and management
- **Zod** - Schema validation for forms and API data
- **Date-fns** - Modern date manipulation library

### Routing & Navigation
- **React Router DOM v7** - Declarative routing for single-page applications
- **Protected Routes** - Role-based route protection

## 🏗️ Architecture

### Modular Design
```
src/
├── components/          # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard-specific widgets
│   ├── layout/          # Application layout components
│   └── ui/              # Shadcn-ui wrapped components
├── contexts/            # React context providers
├── hooks/               # Custom React hooks for data fetching
├── lib/                 # API client, types and utilities
├── pages/               # Application pages/routes
└── styles/              # Global styles and themes
```

### Data Flow
1. **API Layer** - Express + Prisma + PostgreSQL backend (`backend/`); the frontend talks to it through `src/lib/api.ts`
2. **Custom Hooks** - Encapsulate data fetching and state logic (`useRooms`, `useBookings`, etc.)
3. **React Query** - Handles caching, background updates, and stale data management
4. **Context API** - Global state for settings, authentication, and currency preferences
5. **Component Hierarchy** - Presentational components consume data from hooks/context

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd guest-auto-ops-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The frontend needs the API running too — see **Backend API → Local setup** below (API on `http://localhost:3001`, or set `VITE_API_BASE_URL` to point elsewhere).

4. **Open your browser**
Navigate to `http://localhost:5173` to view the application

### Demo Accounts
Demo accounts are seeded by the backend — see the **Demo accounts** table in the Backend API section below. The password is whatever `SEED_DEMO_PASSWORD` was set to when the seed ran; it is never written in the repo.

## 🔧 Development

### Available Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run tests
npm run test
```

### Code Standards
- **ESLint** - Code quality and style enforcement
- **TypeScript Strict Mode** - Type safety throughout the codebase
- **Prettier** - Code formatting (configured in IDE settings)
- **Component Composition** - Small, reusable components following RADIX UI patterns

## 📱 Responsive Design
The application is fully responsive and works across:
- Desktop computers (1920px+)
- Laptops and large tablets (1024px-1919px)
- Tablets and small laptops (768px-1023px)
- Mobile phones (320px-767px)

## 🎯 Use Cases

### Independent Hotel Owners
- Manage daily operations without complex PMS systems
- Automate routine tasks to focus on guest experience
- Gain insights into property performance with real-time analytics

### Hotel Management Companies
- Oversee multiple properties from a centralized dashboard
- Standardize operations across different locations
- Monitor financial performance and operational efficiency

### Hospitality Educators & Students
- Learn modern hotel management systems
- Practice with realistic data and scenarios
- Understand the technology behind hotel operations

## 🔄 Future Enhancements

Planned features for future releases:
- **Calendar View**: Visual booking management with drag-and-drop
- **Channel Manager**: Integration with OTAs (Booking.com, Expedia, etc.)
- **Point of Sale**: Restaurant and spa billing integration
- **Advanced Reporting**: Custom report builder with export options
- **Mobile App**: Native mobile applications for housekeeping and maintenance staff
- **Multi-language Support**: Internationalization for global properties
- **Advanced Analytics**: Predictive occupancy forecasting and pricing recommendations

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

Built with modern web technologies:
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn-ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com/)

---

**Guest Auto Ops** - Modernizing hotel operations through intelligent automation and intuitive design.---

## Backend API

The real backend lives in `backend/` — **Express + TypeScript + Prisma + PostgreSQL**. It replaced the old frontend-only mock store with a persistent API, and the frontend in `src/` is wired to it through `src/lib/api.ts` (JWT in `localStorage`, base URL from `VITE_API_BASE_URL`).

### Stack

- **Express 4 + TypeScript** (strict, ESM, `module: NodeNext`)
- **Prisma 6** — PostgreSQL in production (see `backend/prisma/schema.prisma`); every entity from `src/lib/types.ts` is a model, field names are snake_case throughout so they match the frontend types exactly. Invoice line items are stored in an `InvoiceLineItem` table and serialised back as the `line_items` array the frontend expects.
- **Auth** — JWT Bearer tokens (`jsonwebtoken`, 7-day expiry), passwords hashed with bcrypt (cost 10). Roles: `super_admin`, `owner`, `manager`, `housekeeping`, `staff`.
- **Validation** — Zod schemas on every write input (`backend/src/validation/schemas.ts`).

### Local setup

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL + JWT_SECRET
npx prisma migrate dev      # creates the tables (PostgreSQL)
npm run seed                # loads the demo data from backend/src/seedData.ts
npm run dev                 # tsx watch on http://localhost:3001
```

Other scripts: `npm run build` (`tsc`), `npm start` (`node dist/index.js`), `npm run typecheck`.

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `3001`; Render sets it) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs — **required in production** (the server refuses to boot without it); a long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | Allowed browser origins, comma-separated (default `http://localhost:5173`; add the deployed Vercel URL) |
| `SEED_DEMO_PASSWORD` | Password for the 5 demo accounts created by `npm run seed`. **Required by the seed** — it exits with an error when unset. Never commit a real value. |

### Demo accounts

Seeded by `npm run seed` (idempotent — safe to run twice). The password for all five is whatever `SEED_DEMO_PASSWORD` was set to when the seed ran; it is **not written in any file** — whoever runs the seed chooses it and shares it out of band.

| Role | Email | Hotel code (login) |
|---|---|---|
| Super Admin | `admin@demo.hotel` | — (exempt) |
| Owner | `owner@demo.hotel` | — (exempt) |
| Manager | `manager@demo.hotel` | `DEMO-1001` (Grand Plaza) |
| Housekeeping | `housekeeping@demo.hotel` | `DEMO-1001` |
| Staff | `staff@demo.hotel` | `DEMO-1001` |

Manager / housekeeping / staff must present their hotel's access code at login (validated server-side against the hotel's `access_code`); a second demo hotel exists (Sunset Resort, code `DEMO-1002`).

> **Signup:** `POST /api/auth/signup` only creates `manager` / `housekeeping` / `staff` accounts, and only with a valid hotel code; it also creates the linked `StaffMember` record. Owner / super_admin accounts are created by an administrator, never by self-signup.

### Auth

Send `Authorization: Bearer <token>` on every `/api/*` call except login/signup. `GET /health` needs no auth. Non-`super_admin` users are scoped to their own hotel — passing another hotel's `?hotel_id=` returns 403. A `super_admin` may pass `?hotel_id=` to scope to one hotel, otherwise they see all hotels.

### Endpoints

All list endpoints return `{data: [...]}`; single resources `{data: {...}}`; errors `{error: {message, details?}}`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me` |
| Hotels | `GET /api/hotels`, `GET /api/hotels/:id`, `POST /api/hotels` (super_admin), `PATCH /api/hotels/:id` (owner of that hotel / super_admin) |
| Users | `GET /api/users`, `POST /api/users/:id/change-password`, `PATCH /api/users/:id` (owner/super_admin; only a super_admin may grant `super_admin`) |
| Rooms | `GET /api/rooms`, `POST /api/rooms`, `GET /api/rooms/:id`, `PATCH /api/rooms/:id`, `DELETE /api/rooms/:id` (owner/super_admin) |
| Guests | `GET /api/guests?q=` (name/email/phone), `POST /api/guests`, `GET /api/guests/:id`, `PATCH /api/guests/:id` |
| Bookings | `GET /api/bookings?status=&date=&room_id=&guest_id=`, `POST /api/bookings`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id`, `POST /api/bookings/:id/check-in`, `POST /api/bookings/:id/check-out`, `POST /api/bookings/:id/cancel` |
| Invoices | `GET /api/invoices`, `POST /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/:id/pay`, `POST /api/invoices/:id/cancel` |
| Housekeeping | `GET /api/housekeeping?status=&assigned_to=`, `POST /api/housekeeping`, `GET /api/housekeeping/:id`, `PATCH /api/housekeeping/:id` |
| Staff | `GET /api/staff`, `POST /api/staff`, `PATCH /api/staff/:id`, `DELETE /api/staff/:id` |
| Expenses | `GET /api/expenses`, `POST /api/expenses`, `PATCH /api/expenses/:id`, `DELETE /api/expenses/:id` (owner/super_admin) |
| Automations | `GET /api/automations`, `POST /api/automations`, `PATCH /api/automations/:id`, `DELETE /api/automations/:id`, `GET /api/automations/executions` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`, `DELETE /api/notifications/:id` |
| Messages | `GET /api/messages?guest_id=`, `POST /api/messages`, `PATCH /api/messages/:id` |
| Activity | `GET /api/activity?limit=` (newest first), `DELETE /api/activity/:id` |
| Settings | `GET /api/settings`, `PATCH /api/settings` (per-hotel: `currency`, `tax_rate` default `0.10`, check-in/out times) |
| Dashboard | `GET /api/dashboard/summary` |

### Business rules (enforced server-side)

- **Booking totals** are `room.price_per_night × nights` — never NaN; a booking without a room keeps the supplied total.
- **Overlap:** no two non-cancelled bookings may hold the same room for overlapping dates — `409` on create and on edit (excluding itself). Check-out must be after check-in.
- **Blocked guests** (`tags` containing `blocked`) cannot be booked.
- **Check-in** (`confirmed` → `checked_in`) sets the room to `occupied`. **Check-out** (`checked_in` → `checked_out`) sets the room to `dirty`, creates the final invoice (room-charge line item + tax from the hotel's `tax_rate`), creates a checkout cleaning task, and bumps the guest's `total_stays` / `total_spent` / `last_stay_at`. **Cancel** frees the room (only if no other active booking holds it), cancels unpaid invoices for the booking, and removes its pending housekeeping tasks.
- **Numbers** (`BK-0001`, `INV-0001`, `TSK-0001`) come from the `Counter` table with atomic increments inside the booking/invoice/task transaction, so they never repeat. The seed continues the existing sequences (hotel-001 starts at BK-0006 / INV-0003 / TSK-0004).
- **Invoices:** `total = amount + tax` is authoritative; paying adds to `amount_paid` and marks the invoice `paid` (with `paid_date`) once `amount_paid >= total`.
- **Housekeeping:** completing a task stamps `completed_at` and frees a `dirty` room back to `available`.
- **Automation engine** (`backend/src/services/automationEngine.ts`): server-side rules run inside the same transaction as the event that fired them — events `booking.created`, `booking.checked_in`, `booking.checked_out`, `booking.cancelled`, `room.updated`, `invoice.created`, `invoice.paid`. Actions: `create_housekeeping_task`, `create_notification`, `log_activity`, `create_invoice`, `send_email`. At most one task and one invoice per event. Every run writes an `AutomationExecution` row and bumps the rule's `execution_count` / `last_triggered_at`. **`send_email` is log-only**: no email provider is configured, so the action is recorded with status `logged` and nothing is sent.
- **Dashboard summary** compares calendar-day keys, never raw datetimes (same as `src/components/dashboard/dashboardDates.ts`). Revenue is invoice `total` by `paid_date`. "Today" is anchored to the latest date present in the records, capped at now — the seed data is Feb 2024, so with no live data the anchor is the last seed date and the numbers still show; with live data the anchor is today. Occupancy trend is 14 days, revenue trend 30 days.

### Deploying on Render

`render.yaml` at the repo root is a Blueprint: a free PostgreSQL database (`hotel-automation-db`) and a free web service (`hotel-automation-api`, `rootDir: backend`). Deploy:

1. Render dashboard → **New → Blueprint** → pick this repo. Render creates the database and the web service; the build runs `npm install && npx prisma migrate deploy && npm run build`, then `npm start`.
2. `JWT_SECRET` is generated by the Blueprint. Set `CORS_ORIGIN` in the service's **Environment** tab to the deployed frontend URL (e.g. `https://hotel-automation-system.vercel.app`) — it is `sync: false`, so Render asks for a value at Blueprint creation.
3. Set `SEED_DEMO_PASSWORD` in the service's Environment, then run the seed **once** from the service's **Shell** tab: `npm run seed`. (The shell starts in the repo root, so run `cd backend && npm run seed`.)
4. Verify: `curl https://<your-service>.onrender.com/health` → `{"status":"ok"}`.

### Dev-only SQLite smoke test

This VM has no PostgreSQL, so the API was smoke-tested locally against SQLite using `backend/prisma/schema.sqlite.prisma` (a dev-only copy: provider `sqlite`, and the two array fields `Room.amenities` / `Guest.tags` are `Json` because SQLite has no array columns). It is **not** the real config — `schema.prisma` (PostgreSQL) is what ships and what Render runs. To repeat the smoke test: `npm run db:smoke` (generates the SQLite client + pushes the schema), set `DATABASE_URL=file:./dev.db` in `backend/.env`, then `npm run seed` and `npm run dev`. Regenerate the PostgreSQL client afterwards with `npm run prisma:generate`.
