# OperonPulse

> **OperonPulse is a lightweight team execution and productivity platform for tracking weekly priorities, progress, blockers, goals, and accountability.**
> 
> *Core Cadence: Plan → Prioritize → Execute → Track → Unblock → Review → Carry Forward → Improve*

---

## 📌 Project Overview

**OperonPulse** is an internal team execution and productivity platform designed specifically for fast-moving startup teams. Rather than managing complex, endless backlogs, OperonPulse brings laser-focus to **weekly execution cycles**:
- Company-level weekly goals establishing clear top priorities.
- Direct alignment connecting operational tasks to strategic goals.
- Real-time tracking of task progress, statuses, and critical blockers.
- End-of-week review, intentional task rollover, carryover history, and weekly check-ins.
- Unified founder execution overview and velocity metrics for founders and team leads.

---

## 🚀 Current Status: Phase 7.1 Completed (Admin Team Management)

Phase 7.1 adds in-app team member provisioning for workspace Administrators. Admins can create new Member or Admin accounts directly from `/team` using secure server-only Supabase Admin Auth APIs without exposing credentials to the client.

### What is Completed in Phase 7.1:
- [x] **Server-Only Admin Client (`lib/supabase/admin.ts`)**:
  - Initialized with `SUPABASE_SERVICE_ROLE_KEY` using `server-only` to ensure it is never bundled or leaked to client browsers.
- [x] **Privileged Creation Server Action (`lib/team/actions.ts`)**:
  - `createTeamMemberAction`: Authenticates the caller, strictly verifies `callerProfile.role === 'ADMIN'`, and provisions the user via `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
  - Seamlessly integrates with the existing database trigger `on_auth_user_created` to create matching `public.profiles` records.
  - Safely handles ADMIN role promotions and duplicate email violations.
- [x] **Admin Add Member Dialog (`components/team/add-member-dialog.tsx`)**:
  - Modal form for Admins to input Full Name, Work Email, Temporary Password (with show/hide toggle), and Role (MEMBER or ADMIN).
  - Passwords are strictly ephemeral during creation and never persisted in database profiles or client storage.
- [x] **Team Directory View (`components/team/team-view.tsx` & `/team`)**:
  - Displays team members in a responsive table (desktop) and card layout (mobile) with member roles, emails, and joined dates.
  - "Add Member" button is visible exclusively to workspace Administrators.

---

### 🔑 Service Role Setup for Admin Team Provisioning

To enable direct in-app team creation:
1. Open your **Supabase Dashboard** → **Project Settings** → **API**.
2. Locate the **`service_role` (secret)** key.
3. In your local `.env.local` file, add:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
> [!CAUTION]
> Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` and never commit it to Git. It must only be read by server-side actions.

---

## 📊 Phase 7 Analytics Definitions & Formulas

### 1. Task Metrics
- **Tasks Planned**: `count(tasks WHERE week_start = selected_week)`
- **Tasks Completed**: `count(tasks WHERE week_start = selected_week AND status = 'DONE')`
- **Completion Rate**: `(completed / planned) * 100` *(returns `null` when planned is 0)*
- **Incomplete Tasks**: `planned - completed`

### 2. Carryovers & Repeated Lineage
- **Carryovers Out**: `count(task_weekly_reviews WHERE week_start = selected_week AND outcome IN ('CARRY_FORWARD', 'REASSIGN'))`
- **Carryover Rate**: `(carryovers_out / incomplete_tasks) * 100` *(returns `null` when incomplete is 0)*
- **Repeated Carryover**: A source-week review outcome of `CARRY_FORWARD` or `REASSIGN` where the source task already had `rollover_count >= 1` (meaning carrying it forward results in `rollover_count >= 2` in subsequent weeks).

### 3. Blockers & Overdue Detection
- **Blocked Tasks**: `count(tasks WHERE week_start = selected_week AND (status = 'BLOCKED' OR is_blocked = true))`
- **Critical Blockers**: Blocked tasks where `priority = 'CRITICAL'`.
- **Historical Overdue**: For past weeks, tasks with `status != 'DONE'` and `due_date < Sunday_end_of_week`. For the active week, `due_date < today`.

### 4. Goals & Workload
- **Goals Committed**: `count(weekly_goals WHERE week_start = selected_week)`
- **Goals Achieved**: `count(weekly_goals WHERE week_start = selected_week AND status = 'ACHIEVED')`
- **Goal Achievement Rate**: `(achieved / committed) * 100` *(returns `null` when committed is 0)*
- **Average Goal Progress**: Average of derived progress across all committed goals in that week.
- **Workload Distribution**: Per-member task counts (Planned, Done, Active, Blocked, Critical), sorted alphabetically by name.

### 5. Historical Accuracy Limitations
- Task completion metrics reflect the **current persisted task state** for that historical week.
- OperonPulse does not use event sourcing or retrospective point-in-time state reconstruction for mutable fields; immutable review decisions are anchored in `task_weekly_reviews`.

---

## 🚫 Intentionally NOT Implemented (Deferred to Future Phases)

To uphold the "Insights, not surveillance" philosophy:
- ❌ Employee rankings, productivity scores, or leaderboards
- ❌ AI/LLM-generated summaries or speculative diagnoses
- ❌ Slack, WhatsApp, or email digests
- ❌ Comments, activity feeds, and file attachments
- ❌ Recurring automated tasks
- ❌ External BI / Data warehouse integrations

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend SDK & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`)
- **Linting & Quality**: [ESLint](https://eslint.org/)

---

## 📁 Folder Architecture

```text
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page with password visibility toggle & alerts
│   │   └── layout.tsx              # Centered minimal authentication layout
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx      # Upgraded Founder Overview & live weekly metrics
│   │   ├── my-tasks/page.tsx       # Personal Weekly Task Management with Goal & Rollover Pills
│   │   ├── team-board/page.tsx     # Shared Team Kanban Board with Goal & Rollover Pills
│   │   ├── goals/page.tsx          # Weekly Company Goals Workspace
│   │   ├── weekly-review/page.tsx  # End-of-Week Review & Rollover Workspace (Phase 6)
│   │   ├── insights/page.tsx       # Insights placeholder view
│   │   ├── team/page.tsx           # Team directory with role badges
│   │   ├── settings/page.tsx       # Profile & account configuration page
│   │   └── layout.tsx              # App shell with server session retrieval
│   ├── globals.css                 # Theme tokens, variables, and Tailwind directives
│   ├── layout.tsx                  # Root HTML layout
│   └── page.tsx                    # Root redirect to /dashboard
├── components/
│   ├── board/
│   │   ├── blocker-prompt-dialog.tsx # Prompt modal for blocker description on drag to Blocked
│   │   ├── kanban-card.tsx         # Draggable task card with priority, progress, goal & rollover pill
│   │   ├── kanban-column.tsx       # Column drop target with header counter & empty state
│   │   ├── task-detail-dialog.tsx  # Read-only task viewer with linked goal details
│   │   └── team-board-view.tsx     # Client board container with drag logic, filters & mobile tabs
│   ├── goals/
│   │   ├── delete-goal-dialog.tsx  # Accessible confirmation modal for deleting goals
│   │   ├── goal-card.tsx           # Goal card with progress bar, task summary & risk signals
│   │   ├── goal-detail-dialog.tsx  # Modal displaying goal details and all linked tasks
│   │   ├── goal-form-dialog.tsx    # Accessible create/edit goal dialog for Admins
│   │   ├── goal-status-badge.tsx   # Color-coded badge for goal statuses
│   │   └── goals-view.tsx          # Client container for /goals with week navigation & stats
│   ├── reviews/
│   │   ├── incomplete-tasks-list.tsx         # List of incomplete tasks with Review action
│   │   ├── rollover-badge.tsx                # Subtle rollover counter pill (Carried 1x, etc.)
│   │   ├── task-review-dialog.tsx            # Modal for review decisions (Carry, Cancel, Keep, Reassign)
│   │   ├── team-checkin-status.tsx           # Admin roster for team check-in submission status
│   │   ├── weekly-checkin-card.tsx           # 4-question self-reflection check-in form
│   │   ├── weekly-execution-summary-card.tsx # Deterministic summary metrics & template text
│   │   └── weekly-review-view.tsx            # Main client container for /weekly-review
│   ├── layout/
│   │   ├── header.tsx              # Top sticky header with week calculation & user avatar
│   │   ├── mobile-nav.tsx          # Responsive mobile slide-out drawer
│   │   └── sidebar.tsx             # Desktop sidebar with user panel & sign-out
│   ├── tasks/
│   │   ├── delete-task-dialog.tsx  # Confirmation dialog for deleting tasks
│   │   ├── empty-tasks-view.tsx    # Zero-state placeholder with "+ Add Task" action
│   │   ├── task-form-dialog.tsx    # Modal dialog with optional weekly goal selection
│   │   ├── task-table.tsx          # Responsive table & mobile cards view with goal & rollover pills
│   │   ├── tasks-view.tsx          # Client container with weekly metrics & navigation
│   │   └── week-navigator.tsx      # Week navigation bar with ?week=YYYY-MM-DD state
│   ├── settings/
│   │   └── profile-form.tsx        # Interactive profile editor with feedback
│   ├── shared/
│   │   ├── page-container.tsx      # Consistent max-width container wrapper
│   │   ├── placeholder-view.tsx    # Clean placeholder container for upcoming phases
│   │   ├── priority-badge.tsx      # Priority indicator badge (Critical, High, etc.)
│   │   ├── section-header.tsx      # Section heading with optional badge/action
│   │   ├── stat-card.tsx           # Stat metric card with trend indicators
│   │   └── status-badge.tsx        # Status badge (Not Started, In Progress, etc.)
│   └── ui/
│       ├── avatar.tsx              # Accessible user avatar component
│       ├── badge.tsx               # CVA badge component
│       ├── button.tsx              # Button component with variants
│       ├── card.tsx                # Card structural components
│       └── progress.tsx            # Animated progress bar
├── lib/
│   ├── auth/
│   │   ├── actions.ts              # Server actions: loginAction, logoutAction, updateProfile
│   │   └── session.ts              # Server-side user session & profile retrieval
│   ├── goals/
│   │   ├── actions.ts              # Server actions: createGoalAction, updateGoalAction, deleteGoalAction
│   │   ├── logic.ts                # Calculation engine: progress derivation & risk signals
│   │   └── queries.ts              # Supabase queries: getGoalsForWeek, getGoalsWithTaskSummary, getGoalWithTasks
│   ├── reviews/
│   │   ├── actions.ts              # Server actions: saveWeeklyCheckinAction, recordTaskReviewAction, rolloverTaskAction
│   │   ├── logic.ts                # Deterministic summary calculations & rollover eligibility helpers
│   │   └── queries.ts              # Supabase queries: getWeeklyReviewData, getTaskReviewOutcomes, getWeeklyCheckin
│   ├── tasks/
│   │   ├── actions.ts              # Server actions: createTaskAction, updateTaskAction, updateTaskStatusAction, deleteTaskAction
│   │   └── queries.ts              # Supabase queries: getTasksForWeek, getTeamBoardTasks, getTeamMembersList
│   ├── data/
│   │   └── mock-data.ts            # Fallback fixtures & static structure
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client helper
│   │   ├── middleware.ts           # SSR session refresher & route guard
│   │   └── server.ts               # Server Supabase client helper
│   └── utils/
│       ├── cn.ts                   # Tailwind merge / clsx utility
│       └── date.ts                 # Dynamic ISO week & date range calculations
├── middleware.ts                   # Next.js edge middleware entry point
├── supabase/
│   └── migrations/
│       ├── 20261004000000_create_profiles.sql              # Profiles schema, trigger, & RLS policies
│       ├── 20261004000001_create_tasks.sql                 # Tasks table, indexes, consistency trigger, & RLS
│       ├── 20261004000002_phase4_team_board_visibility.sql # Team-wide read visibility for Team Board
│       ├── 20261004000003_create_weekly_goals.sql          # Weekly goals schema, task FK, triggers & RLS (Phase 5)
│       └── 20261004000004_phase6_weekly_review.sql         # Weekly reviews, check-ins, tasks rollover fields & RPC (Phase 6)
├── types/
│   └── index.ts                    # TypeScript types (TaskReviewOutcome, WeeklyCheckin, DbTask, etc.)
├── .env.example                    # Environment variable template
├── components.json                 # shadcn/ui configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Project dependencies & scripts
├── postcss.config.mjs              # PostCSS Tailwind config
├── tailwind.config.ts              # Tailwind theme extensions & design tokens
└── tsconfig.json                   # TypeScript compiler configuration
```

---

## ⚡ Supabase Setup & Local Development

### 1. Configure Local Environment Variables
Create `.env.local` in the project root:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Run Database Migrations
In your Supabase Dashboard **SQL Editor**, run the migrations in sequential order:
1. [`supabase/migrations/20261004000000_create_profiles.sql`](supabase/migrations/20261004000000_create_profiles.sql)
2. [`supabase/migrations/20261004000001_create_tasks.sql`](supabase/migrations/20261004000001_create_tasks.sql)
3. [`supabase/migrations/20261004000002_phase4_team_board_visibility.sql`](supabase/migrations/20261004000002_phase4_team_board_visibility.sql)
4. [`supabase/migrations/20261004000003_create_weekly_goals.sql`](supabase/migrations/20261004000003_create_weekly_goals.sql)
5. [`supabase/migrations/20261004000004_phase6_weekly_review.sql`](supabase/migrations/20261004000004_phase6_weekly_review.sql)

### 3. Start the Development Server
```bash
npm install
npm run dev
```
Visit [http://localhost:3000/login](http://localhost:3000/login) to sign in.

---

## 🧪 Validation & Quality Checks

Run the verification suite locally:
```bash
# Typecheck TypeScript
npm run typecheck

# Lint Codebase
npm run lint

# Build for Production
npm run build
```
