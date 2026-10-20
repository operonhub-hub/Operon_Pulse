# OperonPulse

> **Operon's internal team execution tool** for tracking weekly priorities, progress, blockers, goals and accountability.
>
> *Plan → Prioritize → Execute → Track → Unblock → Review → Carry Forward → Improve*

OperonPulse is **not** part of Operon's school product. It's a single-workspace tool for the Operon team, and all week boundaries use the **Africa/Lagos** timezone (`lib/utils/date.ts`).

For architecture, data model, security notes and known issues, see [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md). Working rules for contributors (and AI assistants) are in [`CLAUDE.md`](CLAUDE.md).

---

## 🚀 Current status

**Phases 1–8.2 complete · Phase 9 (cleanup and hardening) in progress.**

| Phase | Delivered |
|---|---|
| 1–2 | App shell, Supabase auth, profiles with ADMIN / MEMBER roles |
| 3 | Weekly tasks (My Tasks) |
| 4 | Shared Team Board (kanban) |
| 5 | Weekly company goals, with task-to-goal links |
| 6 | Weekly review: outcomes, task rollover, check-ins |
| 7 | Insights / analytics · 7.1 admin team provisioning |
| 8 | In-app attention centre (notifications) |
| 8.1 | Team member deactivation and reactivation |
| 8.2 | Team departments, preserved planning week |
| — | Self-service password change (shipped between 8.1 and 8.2) |
| **9** | **In progress:** cleanup (font fix, dead-code removal, docs) |

---

## ✨ Features

| Page | What it does | Who |
|---|---|---|
| `/dashboard` | Week at a glance: task stats, goal progress, items needing attention | everyone |
| `/my-tasks` | Plan and update your own tasks for any week | everyone |
| `/team-board` | Shared kanban of the team's tasks (drag, or "Move to" on mobile) | everyone; edit own tasks (admins: all) |
| `/goals` | Weekly company goals with derived progress and risk signals | view: everyone · manage: admins |
| `/weekly-review` | Close the week: carry forward, cancel, keep or reassign incomplete tasks; submit a check-in | everyone; admins see the team |
| `/insights` | Multi-week execution analytics | admins: team and per member · members: own |
| `/team` | Team directory; add, edit, deactivate and reactivate members | view: everyone · manage: admins |
| `/settings` | Edit your name, change your password | everyone |

The header's **attention centre** surfaces overdue, blocked and at-risk work, and pending reviews and check-ins. Read and dismiss state is saved per user.

---

## 🛠️ Tech stack

- **Framework:** [Next.js](https://nextjs.org/) 15.5 (App Router, Server Actions), React 19
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 3, with shadcn-style theme variables in `app/globals.css`
- **Font:** Inter via `next/font` (self-hosted at build time)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Backend:** [Supabase](https://supabase.com/): Postgres with row-level security, plus Auth (`@supabase/supabase-js`, `@supabase/ssr`)
- **Deployment target:** Vercel (per commit `4ac3060`; not configured in the repo)

---

## 📁 Folder structure

```text
├── app/
│   ├── (auth)/login/             Login page
│   ├── (dashboard)/              Signed-in app: layout plus one folder per page
│   │   ├── dashboard/  my-tasks/  team-board/  goals/
│   │   └── weekly-review/  insights/  team/  settings/
│   ├── globals.css               Theme variables and Tailwind layers
│   ├── layout.tsx                Root layout (metadata, Inter font)
│   └── page.tsx                  Redirects / → /dashboard
├── components/
│   ├── ui/                       Primitives: avatar, badge, button, card, progress
│   ├── shared/                   Page container, section header, stat card, status/priority badges
│   ├── layout/                   Sidebar, header, mobile nav
│   ├── attention/                Attention bell, drawer and item card
│   ├── auth/                     Cross-tab session sync
│   ├── board/                    Team Board kanban and dialogs
│   ├── goals/                    Goals view, cards and dialogs
│   ├── insights/                 Insights view, charts, workload table
│   ├── reviews/                  Weekly review, rollover, check-ins
│   ├── settings/                 Profile form, change-password card
│   ├── tasks/                    My Tasks view, table, form, week navigator
│   └── team/                     Team directory and member dialogs
├── lib/
│   ├── supabase/                 Browser, server, middleware and service-role (admin) clients
│   ├── auth/                     Login/logout/profile/password actions, guards, session
│   ├── tasks/  goals/  reviews/  queries.ts (reads) · actions.ts (Server Actions) · logic.ts
│   ├── insights/                 Analytics queries, pure metric logic, types
│   ├── attention/                Attention-centre logic, queries, actions, types
│   ├── team/                     Admin team actions, departments, ban constants
│   ├── utils/                    date.ts (Africa/Lagos week maths), week.ts (week URLs)
│   └── utils.ts                  cn() class-name helper
├── supabase/migrations/          SQL migrations (run manually; see below)
├── scripts/                      Offline test scripts (see Scripts)
├── types/index.ts                Shared TypeScript types
├── docs/PROJECT_OVERVIEW.md      Architecture and findings
├── middleware.ts                 Session refresh and route protection
├── CLAUDE.md                     Working rules
└── .env.example                  Environment variable template
```

---

## ⚡ Setup

### 1. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser and server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser and server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** (`lib/supabase/admin.ts`) | Needed for adding, editing, deactivating and reactivating members |

> [!CAUTION]
> Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`, and never commit it. Set all three in your hosting provider's environment settings for production.

### 2. Database migrations

Migrations are **not** applied automatically. Run them **in this order** in the Supabase Dashboard → **SQL Editor**:

| # | File | Adds |
|---|---|---|
| 1 | [`20261004000000_create_profiles.sql`](supabase/migrations/20261004000000_create_profiles.sql) | `profiles`, sign-up trigger, role protection, RLS |
| 2 | [`20261004000001_create_tasks.sql`](supabase/migrations/20261004000001_create_tasks.sql) | `tasks`, consistency trigger, RLS |
| 3 | [`20261004000002_phase4_team_board_visibility.sql`](supabase/migrations/20261004000002_phase4_team_board_visibility.sql) | Team-wide task visibility |
| 4 | [`20261004000003_create_weekly_goals.sql`](supabase/migrations/20261004000003_create_weekly_goals.sql) | `weekly_goals`, `tasks.goal_id`, week checks |
| 5 | [`20261004000004_phase6_weekly_review.sql`](supabase/migrations/20261004000004_phase6_weekly_review.sql) | Reviews, check-ins, rollover fields, `rollover_task` RPC |
| — | *`…000005` does not exist* | The numbering skips it; nothing is missing |
| 6 | [`20261004000006_phase8_attention_states.sql`](supabase/migrations/20261004000006_phase8_attention_states.sql) | `attention_states` ⚠️ |
| 7 | [`20261005000000_phase8_1_team_member_deactivation.sql`](supabase/migrations/20261005000000_phase8_1_team_member_deactivation.sql) | `profiles.is_active` |
| 8 | [`20261012000000_add_profile_department.sql`](supabase/migrations/20261012000000_add_profile_department.sql) | `profiles.department` |

> [!WARNING]
> `20261004000006_phase8_attention_states.sql` is marked **"DO NOT RUN AUTOMATICALLY ON PRODUCTION. User approval required before execution."** Review it before running it against production.

**First admin:** new users are always created as `MEMBER`. Promote the first administrator once, in the SQL Editor:

```sql
UPDATE public.profiles SET role = 'ADMIN', updated_at = now() WHERE email = 'you@example.com';
```

After that, admins add teammates from `/team`.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

---

## 🧪 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`next lint`) |
| `npm test` | Runs the offline test scripts in `scripts/`: attention, deactivation, change-password, team-creation, week-planning, department |

`scripts/test-insights.mjs` exists but is **not** part of `npm test` yet. Run it directly:

```bash
node --experimental-strip-types scripts/test-insights.mjs
```

Before committing, all four of typecheck, lint, test and build must pass (see `CLAUDE.md`).

---

## 📊 Analytics definitions

### Tasks
- **Tasks planned:** `count(tasks WHERE week_start = selected_week)`
- **Tasks completed:** `count(tasks WHERE week_start = selected_week AND status = 'DONE')`
- **Completion rate:** `(completed / planned) * 100`, or `null` when planned is 0
- **Incomplete tasks:** `planned - completed`

### Carryovers
- **Carryovers out:** `count(task_weekly_reviews WHERE week_start = selected_week AND outcome IN ('CARRY_FORWARD', 'REASSIGN'))`
- **Carryover rate:** `(carryovers_out / incomplete_tasks) * 100`, or `null` when incomplete is 0
- **Repeated carryover:** a `CARRY_FORWARD` or `REASSIGN` outcome on a task that already had `rollover_count >= 1`

### Blockers and overdue
- **Blocked tasks:** `status = 'BLOCKED' OR is_blocked = true`
- **Critical blockers:** blocked tasks with `priority = 'CRITICAL'`
- **Overdue:** past weeks use `status != 'DONE' AND due_date < end of week`; the active week uses `due_date < today`

### Goals and workload
- **Goal achievement rate:** `(achieved / committed) * 100`, or `null` when committed is 0
- **Average goal progress:** mean derived progress across that week's goals
- **Workload distribution:** per-member counts (planned, done, active, blocked, critical), sorted alphabetically. There is deliberately no ranking.

### Limitations
- Historical task metrics reflect each task's **current** saved state. There is no event sourcing. Review decisions are immutable in `task_weekly_reviews`.

---

## 🚫 Intentionally not built

Following the "insights, not surveillance" principle:

- Employee rankings, productivity scores or leaderboards
- AI/LLM-generated summaries or diagnoses
- Slack, WhatsApp or email digests (notifications are in-app only)
- Comments, activity feeds and file attachments
- Recurring automated tasks
- External BI / data-warehouse integrations
