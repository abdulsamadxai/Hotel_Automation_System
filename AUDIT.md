# Hotel Automation System — Full Code Audit

**Repo:** `github.com/abdulsamadxai/Hotel_Automation_System`
**Date:** 26 November 2026
**Auditor role:** senior software engineer
**Stack:** Vite + React 18 + TypeScript + shadcn/ui + Tailwind, frontend-only. All data lives in
in-memory mock state (`src/lib/mockStore.ts` over seed data in `src/lib/mockData.ts`). There is no
backend, no database, no real auth, no real email.
**Scope:** `src/App.tsx`, `src/main.tsx`, `src/lib/mockStore.ts`, `src/lib/mockData.ts`,
`src/contexts/AppSettingsContext.tsx`, all hooks in `src/hooks/`, all pages in `src/pages/`, the
dashboard components in `src/components/dashboard/`, layout, sidebar and `ErrorBoundary`.
**Audit only — no source files were edited, nothing was committed or pushed.**

---

## 1. Verification results (run in this audit)

Environment: Node v24.22.1, npm 10.9.4.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | **PASS** — 506 packages, ~25 s |
| Build | `npm run build` (`vite build`) | **PASS** — 6.24 s, 2096 modules, dist JS 680.73 kB (gzip 192.04 kB). Chunk-size warning (>500 kB, no code-splitting). Browserslist data 17 months old (warning only). **The build does NOT run `tsc`, so all type errors below are invisible to it.** |
| Lint | `npm run lint` (`eslint .`) | **FAIL — 115 problems: 103 errors, 12 warnings.** Dominated by `@typescript-eslint/no-explicit-any` across pages + `src/utils/currency.ts`, plus `ban-ts-comment` (`@ts-ignore` in `Login.tsx:65`), `no-require-imports` (`tailwind.config.ts:110`), `react-hooks/exhaustive-deps` (`Housekeeping.tsx:66`). |
| Typecheck | `npx tsc -b tsconfig.app.json --noEmit` | **FAIL — 102 type errors across 17 files.** Billing.tsx 25, Automations.tsx 12, Staff.tsx 11, Housekeeping.tsx 10, Logs.tsx 9, Index.tsx 8, Messages.tsx 5, Bookings.tsx 5, Alerts.tsx 5, Rooms.tsx 3, mockStore.ts 2, useNotifications.tsx 2, Guests.tsx 1, useMessages.tsx 1, useInvoices.tsx 1, useHousekeeping.tsx 1, useAutomations.tsx 1. |
| Tests | `npm run test -- --run` (`vitest`) | **FAIL — 0 tests ran.** The only test file, `src/smoke.test.tsx` (renders `<App/>`, expects truthy), fails at suite level: `Error: Cannot find module '.../src/test/setup.ts'`. `vite.config.ts` sets `setupFiles: './src/test/setup.ts'` but the file does not exist. **Effective test coverage is zero.** |

---

## 2. Critical bugs

### C1. Booking money math is broken — every booking totals `NaN` / $0
**`src/pages/Bookings.tsx:103`, `:321-323`, `:349-353`, `:365`, `:397`; `src/pages/Rooms.tsx:287`**
- `totalAmount = selectedRoom.rate * nights`, but rooms carry `price_per_night`, not `rate`
  (the `Room` type has an optional `rate`; no seed room has one). `rate` is `undefined`, so
  `totalAmount` is `NaN`.
- Consequences: the price summary box never renders (`NaN > 0` is false, `:349`); the room
  dropdown shows "$0.00/night" for every room (`:323`); the confirm button shows "$0 Paid";
  every new booking is saved with `total_amount: NaN` (`:127`, `:165`), which the store's
  JSON-round-trip `clone()` silently turns into `null`, so bookings display $0.00. Deposit and
  pay-now flows inherit the same NaN.
- Editing a booking re-saves `total_amount` as NaN/null too.
- TypeScript already flags this: `Bookings.tsx:103,323,352 — Property 'rate' does not exist on type
  '{ ... price_per_night: number ... }'`.
- Same schism in `src/pages/Rooms.tsx`: the Rooms page reads/writes `rate` everywhere
  (`:43`, `:69`, `:91`, `:187-188`, `:287`), so **all seed rooms show $0.00/night** and the edit
  form loads an empty rate. New rooms get a `rate` field, seed rooms have `price_per_night` —
  the two fields are never reconciled, so pricing is broken in both directions.

### C2. Alerts page crashes on render
**`src/pages/Alerts.tsx:208`**
- Uses `disabled={deleteNotification.isPending}`, but `deleteNotification` is never defined or
  imported anywhere in the file. Every render of a notification row throws `ReferenceError`
  and the app-level `ErrorBoundary` catches it — the Alerts page is unusable.
- Secondary: seed notification types (`'info'/'warning'/'success'`) are not in `typeConfig`, so
  they fall back to a generic room icon; "Dismiss" only marks as read — no delete exists.

### C3. Billing editor crashes on every seed invoice
**`src/pages/Billing.tsx:168`, `:300`, `:362`**
- `calculateTotal(lines)` calls `lines.reduce(...)` with no guard. Seed invoices have no
  `line_items` field, so opening any seed invoice in the editor — or its Save / Add-Item paths —
  throws `TypeError` and hits the `ErrorBoundary`. `handleAddLineItem(selectedInvoice.line_items,
  ...)` (`:300`) spreads `undefined` the same way.
- Related: `useUpdateInvoice` (`src/hooks/useInvoices.tsx`) validates `updates.amount` against
  `amount_paid`, which is `undefined` for seed invoices (no `amount_paid` field in mock data) and
  defaults to 0 — marking a seed invoice 'paid' always throws *"Cannot set status to 'Paid'
  while balance is greater than 0"* unless `amount_paid` is passed. It also compares `amount`
  (not `total`), so tax is ignored.

### C4. Auth is bypassable and credentials are shipped in plaintext
**`src/lib/mockData.ts` (test users); `src/lib/mockStore.ts:70-77,97-108,419`; `src/hooks/useAuth.tsx:55,87-89,154`; `src/pages/Login.tsx:55-66,88`; `src/pages/Signup.tsx`**
- All 5 test users — including super admin `mrabdulsamad323@gmail.com` — have the plaintext
  password `password123` committed in the public repo and shipped in the JS bundle.
  `mockStore.auth.signIn` compares plaintext (`mockStore.ts:76`).
- `mockStore.auth.signUp` lets **anyone self-register with role `'owner'`** — no approval, no
  invite, no email verification, no hotel name collected; the new "hotel" is an empty shell
  (`hotel_${id}`) with no rooms, guests or invoices. The Signup page advertises this as
  "Exclusive registration for property owners".
- The **Hotel Access Code** field for manager/housekeeping is never validated: Login requires a
  non-empty code (`Login.tsx:55`), passes it via `signIn(email, password, hotelCode)` with an
  `@ts-ignore` (`Login.tsx:65-66`), and `useAuth.signIn` drops it — `mockStore.auth.signIn(email,
  password)` never receives it (`useAuth.tsx:89`). Any non-empty string passes.
- The Login role selector is cosmetic: the real role comes from the test-user record, but the
  welcome toast prints the *selected* role (`Login.tsx:88` — "Logged in as super admin" can
  appear while the real role is owner).
- Super-admin status is just a hardcoded email match (`SUPER_ADMIN_EMAIL` in `useAuth.tsx:55,154`).
- `mockStore.staff.create` creates login users with default password `'password123'` and mutates
  the shared `mockData.testUsers` array (`mockStore.ts:419`). Changing a staff member's password
  in the Staff UI (`Staff.tsx:89`) updates only the staff record, never the login user — the
  password change silently does nothing.

### C5. All seed messages render as blank bubbles
**`src/pages/Messages.tsx:192-204`; `src/hooks/useMessages.tsx:68`**
- The page renders `msg.content` (`:201`), but seed messages carry a `message` field, not
  `content`. The entire message history appears empty; only newly sent messages (created with
  `content` by `useSendMessage`) show text.
- Seed messages also have no `direction` field, so `msg.direction === 'inbound'` is always false:
  `useConversations` unread counts are always 0, and every seed message renders as outbound.
- TypeScript flags it: `Messages.tsx:192,196,201,202,204 — Property 'direction'/'content' does
  not exist on type ...`.

### C6. Logs page renders blank rows; search and delete are dead
**`src/pages/Logs.tsx` (filter ~:29-33, row render ~:95-115); `src/hooks/useActivity.tsx`**
- Search filters on `log.title`, `log.description`, `log.event_name` — seed logs have `action`,
  `details`, `entity_type` instead, so **search never matches anything**.
- Rows render `log.title`, `log.source`, `log.event_name`, `log.description` — all `undefined`,
  so every row is blank except the timestamp. Icons fall back to the generic Zap icon.
- The delete button calls `useDeleteActivity`, which is a **no-op**: it does nothing and returns
  success, so the log stays after the confirm dialog.
- `useActivity` returns `logs.slice(0, limit)` unsorted — oldest first, not latest.

### C7. Housekeeping role sees zero tasks (its own work list is empty)
**`src/pages/Housekeeping.tsx:78,250,322,330,339,348,351,354`; `src/hooks/useHousekeeping.tsx:48`**
- The hook filters by `assigned_to`/`assignee_id`, then the page re-filters by
  `t.assignee_id === currentStaffMember?.id` (`:78`). Seed tasks use `assigned_to` only, so
  `assignee_id` is `undefined` on every seed task and the housekeeper's table is empty — while
  the toast (based on the hook result) claims pending tasks exist.
- The table renders `task.assignee?.name`, but the join returns `{id, full_name}` → the assignee
  column falls back to the Assign select; the select options render `staff.name` (undefined —
  staff have `full_name`) → **blank dropdown entries** (`:250`, `:339`).
- `task.task_number` does not exist in data → empty Task ID column (`:322`).
- `due_at` is only set on manually created tasks; "Overdue" status is never computed from it →
  Overdue count is always 0 (`:348`).
- `automation_triggered` is never set, so the "Auto" badge never shows even for checkout-generated
  tasks (`:354`). Checkout-generated tasks say "Checkout cleaning for room" with **no room
  number** (`mockStore.ts` bookings.update).
- Edit dialog reads `task.assignee_id` (undefined on seed tasks).

### C8. Check-in never marks the room occupied; no overlap validation
**`src/lib/mockStore.ts:229-262` (`bookings.update`); `src/pages/Bookings.tsx:97,100`**
- `bookings.update` only handles `checked_out` (room → `'dirty'` + creates a housekeeping task).
  `checked_in` does nothing to the room, so a checked-in room stays `'available'` and **can be
  re-booked**. (`bookings.create` only sets occupied if created with status `checked_in`.)
- `availableRooms` (`Bookings.tsx:97`) filters only by current room status — a room with a future
  confirmed booking still shows as available. **There is no double-booking / date-overlap
  validation anywhere.**
- No check-out > check-in validation either: `nights = Math.max(1, ...)` silently turns a
  backwards date range into 1 night (`:100`).
- Blocked guests are not enforced (guest-005 carries tag `'blocked'`; the form reuses guests by
  phone/email with no blocked check). "International = VIP" is claimed in the UI but the created
  guest always gets tags `["regular"]`.

---

## 3. High-severity bugs

### H1. Automations are decorative — no engine exists
**`src/pages/Automations.tsx`; `src/pages/Index.tsx:390-392`; `src/components/dashboard/AutomationIndicator.tsx`**
- Nothing in the codebase ever evaluates an automation rule. The checkout housekeeping task is
  hardcoded in `mockStore.bookings.update`, not driven by the automations table; toggling a rule
  off does not stop it. The "send welcome email on check-in" rule does nothing.
- Seed rules use `enabled`, but the UI reads `is_active` (undefined → falsy), so seeded rules
  display as **DISABLED despite `enabled: true`**. `execution_count`, `last_triggered_at`,
  `description`, `trigger_event`, `action_type` are never populated — Total Executions is always 0.
- The page hardcodes 5 "System Automations" claiming "Always Active via SQL Triggers" — there is
  no SQL and no backend. It inflates the active count with `+ 5`.
- The claimed behaviours are false: sys-1 "Mark Room Occupied & Ensure Invoice Exists" — check-in
  does not mark the room occupied (see C8) and no invoice is ever created; sys-3 "Cancellation
  Cleanup: Free Room, Cancel Invoice & Remove Tasks" — cancelling does none of this.
- Toggling or deleting a hardcoded system rule calls the mutation with an id (`sys-1`…) that does
  not exist in the store → `mockStore.automations.update` throws "Automation not found" → error
  toast; the rule stays. The **Edit (pencil) button has no onClick at all** — dead.
- `getTriggerLabel`/`getActionLabel` receive `undefined` for seed rules and show "Unknown
  Trigger"/"Unknown Action" (same in `AutomationIndicator` via the Index mapping, which also
  shows "0 of 2 rules active").

### H2. Dashboard headline numbers are permanently wrong
**`src/pages/Index.tsx:99-101,119-120,125-127,157-159,307-308,390-392`**
- Today's Check-ins / Check-outs compare a full ISO datetime (`'2024-02-01T14:00:00Z'`) to a
  `yyyy-MM-dd` string — never equal, so **both are always 0**, and the check-in/out filter table
  never matches (`:100-101`, `:119-120`).
- `finStats` reads `inv.paid_at`, but invoices carry `paid_date` (and seed dates are Feb 2024) →
  **Daily / Weekly / Monthly / Yearly revenue are always $0** (`:125-127`). It also sums `amount`,
  not `total`, excluding tax.
- The Activity Feed maps `a.event_type` / `a.title` / `a.description`, but logs carry `action` /
  `details` / `entity_type` → **every activity renders "Untitled Activity" with no description**
  (`:157-159`). The "Live" pulsing badge is fake — nothing is realtime.
- "Pending Tasks" KPI counts **confirmed bookings**, not housekeeping tasks (`:307-308`).
- Role `'staff'` gets a **blank dashboard** — sections only render for super_admin/owner/manager.
- Super-admin global view: `useBookings` / `useRooms` / `useInvoices` with hotelId `'global'`
  return `[]` (the store filters by `hotel_id === 'global'`), so Global Bookings = 0 and Total
  Revenue = $0. "Platform Health 100%" is hardcoded; the hotel count is derived from staff
  distinct hotel_ids, not the hotels table.
- `useActivity` returns logs unsorted (oldest first).

### H3. Invoice flows: fake email, wrong hotel, broken payment rules, manager sees nothing
**`src/pages/Billing.tsx`; `src/hooks/useInvoices.tsx`; `src/hooks/useMessages.tsx`**
- Seed invoices have no `guest_id` → `mockStore.invoices.getAll` join always yields `guest: null`
  → Billing shows "Unknown" guest, and **Email always fails with "Recipient missing"** for seed
  invoices. Email itself is fake: a 2 s delay, then an "Invoice Sent Successfully" toast — nothing
  is sent.
- Invoice preview hardcodes the wrong hotel: "Grand Sky Resort, 123 Hospitality Way, Maldives"
  vs the actual "Grand Plaza Hotel, Dubai, UAE".
- Tax is never shown or applied in the invoice wizard; `totalRevenue` sums `amount`, not `total`.
- Managers only see invoices created today (`isToday`) → **0 for the Feb-2024 seed data**.
- `handlePrint` / `window.print()` prints the whole app — **no print CSS** (`@media print` /
  printable-invoice rules do not exist anywhere in `src/index.css` / `src/styles/themes.css`).
- `useAddService` calls `useAuth()` **inside** `mutationFn` — a React hooks-rule violation that
  throws at runtime when adding a service — and adds to `amount` without updating `total`/`tax`.
  `useDeleteConversation` (`useMessages.tsx`) has the same violation and crashes on delete.
- "Final invoice generated" toast lies: `Bookings.tsx:113-115` toasts that the final invoice is
  now in Billing on check-out, but **nothing creates an invoice** (the comment at `:172` —
  "Invoice will be created by mock store hooks automatically" — is false; the store has no such
  logic). Invoices are manual-only.

### H4. Nothing persists — every change is lost on reload
**`src/lib/mockStore.ts` (whole file)**
- All CRUD mutates in-memory module state. Only the session (`mock_user` in localStorage) survives
  a reload — every booking, guest, invoice, task and settings change is gone on refresh.
- `resetStore` is dead code (no callers).
- Booking/invoice numbers are random 0–9999 with no uniqueness check (`BK-XXXX`, `INV-XXXX` can
  collide).
- `clone()` via JSON round-trip turns `NaN` into `null` and drops `undefined` fields — this is
  what hides bug C1 (NaN totals become silent nulls).

### H5. Field-name drift everywhere (root cause of most type errors)
The same concept has two different field names in seed data, types and UI:

| Concept | Seed data / store | UI / hook reads |
|---|---|---|
| Room price | `price_per_night` | `rate` |
| Automation on/off | `enabled` | `is_active` |
| Automation trigger/action | `trigger` / `action` | `trigger_event` / `action_type` |
| Notification read | `is_read` (dual-written with `read` as a workaround) | `read` |
| Task assignee | `assigned_to` | `assignee_id` |
| Staff name | `full_name` | `name` |
| Invoice paid date | `paid_date` | `paid_at` |
| Invoice lines / paid | (missing) `line_items` / `amount_paid` | expected present |
| Message body | `message` | `content` |
| Message direction | (missing) | `direction` |
| Activity | `action` / `details` / `entity_type` | `event_type` / `title` / `description` |
| Log search | `action` / `details` | `title` / `description` / `event_name` |

Fixing the drift in one place (a single canonical type per entity, enforced by `tsc` in the build)
fixes most of C1–C7 and H1–H3 at once.

### H6. Guest lifetime stats are frozen
**`src/hooks/useGuests.tsx:17-18,41`; `src/pages/Guests.tsx:312-314`; `src/lib/mockStore.ts:151-152`**
- `total_stays` / `total_spent` are never updated by any flow (no booking, check-out or payment
  code touches them). New guests start at 0 and stay 0 forever; seed values are static fiction.
- `Guests.tsx:343` — seed guest shape is not assignable to the `Guest` type.

### H7. Settings "Save" is fake
**`src/pages/Settings.tsx:52-68,311`**
- "Save Branding Changes" runs a mutation that just returns `{...hotel, ...updates}` — it never
  calls the store — then toasts "Settings updated". Reload and the change is gone.
- Notification toggles are hardcoded (`enabled: false`) — not wired to anything.

### H8. Activity is never logged
- Zero callers of `mockStore.activity.create` outside the store itself. The Activity Feed and
  Logs page can only ever show the 3 Feb-2024 seed rows and never grow. `useRealtime*` hooks are
  no-op stubs.

### H9. Staff page label maps are incomplete
**`src/pages/Staff.tsx:28,33`**
- Role colour map covers only `housekeeping`/`manager` (missing `owner`, `staff` — TS2739);
  status map covers only `on_duty`/`off_duty`/`break` (missing `active` — TS2741). Affected rows
  render with undefined labels/colours. Same class of bug: `Rooms.tsx:273` (string vs
  `StatusType`), `Bookings.tsx:211,504` (string vs `BookingStatus`).

---

## 4. Medium-severity issues

- **M1 — No persistence layer design.** See H4. Any real deployment needs a backend or at minimum
  a localStorage-backed store with schema versioning; today the app is a demo that forgets.
- **M2 — Currency.** `src/utils/currency.ts`: `formatCurrency` uses `toFixed` with **no thousands
  separators** ($1250.00 renders as-is); FX rates are hardcoded constants (PKR 278, etc.) with no
  live rates and no date. Conversion itself is correctly applied via `formatAndConvert` in
  Billing / Bookings / Expenses / Guests / Index (verified by grep).
- **M3 — SaaS Revenue Card invents money.** `src/components/dashboard/SaaSRevenueCard.tsx`:
  "Platform Earnings" = 10% of each paid invoice + $50 per paid invoice — an invented pricing
  model presented as fact — and it formats in hardcoded USD, ignoring the selected currency.
- **M4 — Dead dependency, no charts.** `recharts` is installed but never imported anywhere; the
  dashboard has zero charts. Single 680 kB JS chunk, no code-splitting (`React.lazy` / route
  splitting absent).
- **M5 — Dead buttons on the dashboard.** `RoomStatusGrid`: room tiles have no onClick (should
  open room details / quick actions); fixed `grid-cols-5` is cramped on a 360 px phone; legend
  shows only available/occupied/dirty though cleaning/maintenance exist.
  `AutomationIndicator`: "Manage" and per-rule Play/Pause buttons have no onClick.
  `TodayOverview`: "View All" button has no onClick.
  `Automations.tsx`: Edit button dead (see H1).
- **M6 — `animate-pulse-slow` is not defined** (`SaaSRevenueCard.tsx`) — no such keyframe/animation
  in `tailwind.config.ts`, `src/index.css` or `src/styles/themes.css`; the class silently does
  nothing.
- **M7 — Nav/route RBAC inconsistencies.** `/logs` route allows owner/manager/super_admin but the
  sidebar shows it only for super_admin; `/settings` route allows manager but the sidebar shows
  it only for owner/super_admin. The header user-menu "Settings" item (`AppLayout.tsx:108`)
  navigates to `/settings` for every role, including housekeeping (which is then redirected).
  Route-level guards in `App.tsx` are otherwise sound (`ProtectedRoute` redirects by role;
  housekeeping is forced to `/housekeeping`).
- **M8 — Expenses are the healthiest page** (`src/pages/Expenses.tsx`, `src/hooks/useExpenses.tsx`):
  totals use `amount`, `date` field is consistent. Only the shared persistence and currency
  caveats (H4, M2) apply.
- **M9 — `src/main.tsx` has no `<StrictMode>`** (double-render checks off in dev).
- **M10 — `tailwind.config.ts:110`** uses `require("tailwindcss-animate")` (`no-require-imports`
  lint error); `Login.tsx:65` uses `@ts-ignore` (`ban-ts-comment`); `useHousekeeping.tsx` and
  `useActivity.tsx` place the `useAuth` import mid-file.

## 5. Low-severity / polish

- **L1 — Icon-only buttons lack `aria-label`s** (Housekeeping edit/delete, Logs delete,
  Billing line-item remove) — screen-reader users get no names.
- **L2 — Browserslist data 17 months old** (build warning) — run `npx update-browserslist-db@latest`.
- **L3 — `ErrorBoundary` is actually decent** (renders the error as React text, safe; Refresh /
  Go Home actions work). Keep it; note its reset hard-navigates to `/`.
- **L4 — Theme/currency settings persist to localStorage** via `AppSettingsContext` and Tailwind
  `darkMode: ["class"]` is set — the settings that *do* work are the context ones, not the
  Settings page's branding form (H7).
- **L5 — `useNotifications` dual-writes `is_read` and `read`** — a workaround for the drift in H5;
  remove once types are canonical.

## 6. What is actually good (do not break it)

- Routing + `ProtectedRoute` structure in `src/App.tsx` is sound; role-based redirects work.
- shadcn/ui components, Tailwind theme tokens (`status-*`, `room-*`, `booking-*` CSS vars in
  `src/index.css` / `src/styles/themes.css`) and the `glass-card` system are consistent.
- `AppSettingsContext` theme/currency persistence works.
- Currency conversion is applied consistently wherever money is shown.
- The Expenses page and the overall page/hook separation (one hook per domain) are a reasonable
  skeleton to build on.

---

## 7. Dashboard assessment — what "a proper dashboard" needs

The current dashboard (`src/pages/Index.tsx` + `src/components/dashboard/*`) is a shell over
broken data. Its headline numbers are wrong (H2), its feed is untitled and frozen (H2, H8), its
automation panel shows rules that do nothing (H1), and one role sees nothing at all (H2).

### Biggest gaps
1. **Correctness first: every headline KPI is wrong.** Today check-ins/check-outs and all
   revenue periods read $0/0 because of date-string and field-name mismatches. A dashboard whose
   numbers lie is worse than no dashboard.
2. **No trends or charts at all.** `recharts` is installed and unused. There is no occupancy
   trend, revenue trend, booking pace, ADR/RevPAR, or source breakdown — the numbers a hotel
   manager actually decides on.
3. **No operational lists.** No arrivals/departures list, no housekeeping summary, no alerts
   summary, no pending-payments list, no quick actions (New Booking, Check-in). The dashboard
   shows aggregates but nothing actionable, and the staff role sees a blank page.

### What the rebuilt dashboard should contain
- **Correct KPIs, computed from a single canonical date/field model:** occupancy %, rooms
  available/occupied/dirty/cleaning/maintenance, today's arrivals/departures (real date
  comparison), revenue today / 7 d / month / year from `total` + `paid_date`, outstanding
  balances, pending housekeeping tasks (real count), unread messages, active alerts.
- **Charts (recharts, already installed):** occupancy last 14 days, revenue last 30 days,
  bookings by source/channel, room-type mix.
- **Operational panels:** Today's arrivals (with Check-in buttons) and departures (with
  Check-out buttons), housekeeping queue with overdue highlighting, recent activity (real,
  newest-first, from an event log that is actually written to), alerts.
- **Role-aware sections:** staff sees their tasks and today's arrivals; housekeeping sees only
  their queue (already the intent); owner/super_admin see revenue + platform cards; manager
  sees everything except platform revenue.
- **Quick actions + search:** New Booking, New Guest, New Invoice, room search.
- **Working room grid:** clickable tiles opening a room drawer (status, current guest, next
  booking, actions), responsive columns (3 on mobile, 5 on desktop), full legend.
- **Honest states:** empty states that say "no arrivals today" instead of 0s that look broken;
  no hardcoded "Platform Health 100%" or invented SaaS revenue.

---

## 8. Implementation plan

### Phase 0 — Stop the bleeding (1–2 days)
1. Add `tsc -b` to the build script (`"build": "tsc -b && vite build"`) so type errors block
   deploys; fix the 102 errors (mostly H5 drift).
2. Create the missing `src/test/setup.ts` (jsdom + Testing Library setup) and make the smoke
   test pass; add a second test that renders the dashboard with seed data.
3. Fix lint to 0 errors (remove `any`s at boundaries, drop the `@ts-ignore` in Login by typing
   `signIn` properly, replace `require()` in tailwind config with an ESM import).

### Phase 1 — Fix the critical runtime bugs (highest value first)
1. **Canonical types:** one `src/types.ts` (or `src/lib/types.ts`) per entity — `Room.price_per_night`
   (delete `rate`), `Automation.enabled`, `Task.assigned_to`, `Staff.full_name`,
   `Invoice.paid_date` / `line_items: []` / `amount_paid: 0` defaults, `Message.message` +
   `direction`, `ActivityLog.action/details/entity_type`. Migrate seed data and all readers.
   This single change fixes C1, C5, C6, C7, H1, H2 and most type errors.
2. **Bookings:** use `price_per_night`; add overlap validation, check-out > check-in validation,
   blocked-guest check, VIP-tag rule; make check-in set the room `occupied` in
   `mockStore.bookings.update`; make check-out create the final invoice (or remove the toast).
3. **Alerts:** define `deleteNotification` (or remove the button) — page must render.
4. **Billing:** default `line_items: []` on every invoice (store-level), guard `calculateTotal`,
   fix `useUpdateInvoice` to compare `total` vs `amount_paid`, fix the hooks-rule violations in
   `useAddService` / `useDeleteConversation` (capture `useAuth()` at hook top level).
5. **Messages/Logs/Housekeeping:** render the fields that actually exist; fix the assignee joins;
   make `useDeleteActivity` real or remove the button.

### Phase 2 — Auth + persistence (before any real user touches it)
1. Remove plaintext passwords from the repo (rotate anything that was ever real); stop shipping
   test users in the bundle; hash passwords (even a demo needs `crypto.subtle` hashing, not
   plaintext) or, better, replace the mock auth with a real provider.
2. Validate the Hotel Access Code server-side (or remove the field); delete the cosmetic role
   selector on Login; derive super-admin from a role field, not a hardcoded email.
3. Gate or remove public owner self-registration (invite-only or approval queue); collect the
   hotel name at signup.
4. Add persistence: a store adapter that serialises state to localStorage (with a schema version)
   as the interim step, designed so a real API can replace it without touching pages. Replace
   random `BK-XXXX`/`INV-XXXX` numbers with a persisted counter.

### Phase 3 — Real automation engine
1. Add a tiny event bus in the store: `bookings.create/update`, `rooms.update`, `invoices.create`
   emit events; a rule evaluator runs matching enabled rules and executes actions
   (create housekeeping task, send/log notification, create invoice, log activity).
2. Update `execution_count` / `last_triggered_at` on every run; delete the 5 fake "System
   Automations" (or implement them as real rules); fix the Edit/Toggle/Delete buttons.

### Phase 4 — Dashboard rebuild
1. Correct all KPI computations (H2) with date-aware helpers (`date-fns` is already a dep).
2. Add recharts visualisations (occupancy + revenue trends), arrivals/departures panels,
   housekeeping queue, alerts, quick actions, clickable room grid, role-aware sections.
3. Write activity on every mutation (fix H8) and show it newest-first.
4. Remove invented numbers (SaaS card formula, "Platform Health 100%") or label them as demo.

### Phase 5 — Invoice/payment correctness + polish
1. Invoice wizard: tax line, `guest_id` join, correct hotel in preview, print-only CSS for the
   invoice, manager view not limited to today.
2. Guest lifetime stats updated on payment/check-out.
3. Code-split routes (`React.lazy`), remove the unused `recharts` import gap (use it or drop it),
   update browserslist, add `aria-label`s to icon buttons, add `<StrictMode>`, responsive
   `RoomStatusGrid` columns, live FX rates (or show the rate date), remove dead code
   (`resetStore`, `useRealtime*` stubs, `useDeleteActivity` no-op, dead imports).

### Suggested order of work
**Phase 0 → Phase 1 → Phase 4 (dashboard) → Phase 2 → Phase 3 → Phase 5.**
Phase 1 and the dashboard rebuild are the visible wins the user asked for; Phase 2 (auth) must
land before the app is shown to any real hotel, and Phase 3 makes the "automation" in the product
name real instead of decorative.

---

## 9. Files referenced (quick index)

- Build/test config: `package.json` (build has no `tsc`), `vite.config.ts` (missing setup file),
  `tailwind.config.ts:110`, `src/main.tsx` (no StrictMode).
- Store/seed: `src/lib/mockStore.ts` (693 lines — auth, bookings, invoices, tasks, clone/reset),
  `src/lib/mockData.ts` (554 lines — all seed data).
- Auth: `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`,
  `src/components/auth/ProtectedRoute.tsx`.
- Hooks: `useBookings`, `useRooms`, `useGuests`, `useInvoices`, `useHousekeeping`,
  `useAutomations`, `useNotifications`, `useExpenses`, `useStaff`, `useMessages`, `useActivity`.
- Pages: `Index` (dashboard), `Rooms`, `Guests`, `Bookings`, `Housekeeping`, `Billing`, `Staff`,
  `Expenses`, `Automations`, `Messages`, `Alerts`, `Logs`, `Settings`, `Login`, `Signup`.
- Dashboard components: `TodayOverview`, `ActivityFeed`, `AutomationIndicator`, `RoomStatusGrid`,
  `SaaSRevenueCard`, `KPICard`, `StatusBadge`, `CurrencySelector`, `HotelCodeDisplay`,
  `GlobalUsersTable`, `SuperAdminHotelTable`, `ThemeSelector`.
- Layout: `src/components/layout/AppLayout.tsx`, `AppSidebar.tsx`, `src/components/ErrorBoundary.tsx`.
