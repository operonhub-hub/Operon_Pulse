# Operon Pulse — Project Overview

> Read-only discovery pass, 2026-10-20, at commit `8cd5920` (`main`, clean, in sync with `origin`).
> **Update, same day:** `next` and `eslint-config-next` upgraded 15.5.18 → 15.5.28 (see §5.1).
> Every claim cites a file. Where something could not be confirmed from the code, it says so.

---

## 0. Important: what this codebase actually is

The brief described Operon Pulse as part of the Operon **school EdTech platform** (report cards, school fees, attendance, school–parent communication).

**The code does not contain any of that.** There are no students, classes, parents, fees, attendance, results, payments or SMS anywhere: not in the schema (`supabase/migrations/*.sql`), the code (`app/`, `components/`, `lib/`) or the dependencies (`package.json`).

What it is, in its own words (`README.md:3`, `app/layout.tsx:5-7`):

> "OperonPulse is a lightweight team execution and productivity platform for tracking weekly priorities, progress, blockers, goals, and accountability."

The evidence points to an **internal tool for a company team**, not a product for schools:

- Departments are business functions: Sales, Marketing, Engineering, Finance… (`lib/team/departments.ts:8-20`).
- The workspace label is "OperonPulse HQ" (`lib/auth/session.ts:86`).
- The business timezone is hard-coded to `Africa/Lagos` (`lib/utils/date.ts:7`), which is consistent with the Operon team itself using it.
- The README describes it as a platform "designed specifically for fast-moving startup teams" (`README.md:13`).

**Confirmed by the owner (2026-10-20):** Operon Pulse is **Operon's own internal team execution tool**. It is not part of the school product. The rest of this document is written on that basis.

---

## 1. Orientation

| Item | Finding |
|---|---|
| Repository | `github.com/operonhub-hub/Operon_Pulse`, branch `main`, working tree clean |
| History | 8 commits, 2026-10-04 → 2026-10-12, by "Nacho" (the initial commit is by `operonhub-hub`) |
| README | `README.md`. **Partly stale.** It says "Current Status: Phase 7.1" (`README.md:20`) and its folder tree omits the later `attention/`, `insights/`, `team/` and `auth/` folders and the Phase 8 migrations. |
| Docs folder | None existed before this file |
| `.env.example` | 3 variables (see §2.4) |
| `.env.local` | Present locally, correctly git-ignored (`.gitignore`: `.env*.local`), never committed |
| Size | `app` 14 files / 1.3k lines · `components` 60 / 10.3k · `lib` 31 / 5.1k · `supabase` 8 / 1.1k · `scripts` 7 / 2.9k |

Recent work, newest first (`git log`):

```
8cd5920 feat(planning): preserve planning week and add team departments
43b4652 fix(team): prevent production Add Member server action failure
57e6fc4 feat(auth): add secure self-service password changes
33b97f3 feat(team): add safe team member deactivation and reactivation
f7cb0c8 style(ui): polish UI/UX, typography, responsiveness, and mobile layouts
6ad1bc7 chore(security): upgrade Next.js to patched 15.5.18
4ac3060 feat(core): complete OperonPulse Phases 1-8 for Vercel production readiness
2477617 Initial commit
```

---

## 2. Stack & architecture

### 2.1 Frontend

| Concern | Choice | Source |
|---|---|---|
| Framework | **Next.js 15.5.18**, App Router, React 19 | `package.json` |
| Language | TypeScript, `strict: true` | `tsconfig.json` |
| Styling | Tailwind CSS 3.4 + shadcn-style CSS variables | `tailwind.config.ts`, `app/globals.css`, `components.json` |
| UI primitives | Hand-written (`components/ui/*`), using `class-variance-authority`, `clsx`, `tailwind-merge`. No Radix or other headless library is installed. | `package.json`, `components/ui/` |
| Icons | `lucide-react` | `package.json` |
| Charts | Hand-built SVG/CSS; no chart library | `components/insights/*-chart.tsx` |
| State | Local React state in client "view" containers, seeded from server-component props. No global store. | e.g. `components/tasks/tasks-view.tsx` |
| Data flow | Server Components read via `lib/*/queries.ts`; mutations via **Server Actions** in `lib/*/actions.ts`, then `revalidatePath(...)` | `lib/tasks/actions.ts` |
| Routing | File-based, with `(auth)` and `(dashboard)` route groups | `app/` |

### 2.2 Backend

There's no separate API server and **no API route handlers** (`app/api` does not exist). The backend is:

- **Supabase** (Postgres + Auth), via `@supabase/ssr` and `@supabase/supabase-js`:
  - Browser client: `lib/supabase/client.ts`
  - Server client: `lib/supabase/server.ts`
  - Middleware client: `lib/supabase/middleware.ts`
  - **Service-role admin client:** `lib/supabase/admin.ts`, guarded by `import "server-only"`. It is only used by `lib/team/actions.ts`.
- **Next.js Server Actions** (`"use server"`) as the only write path from the UI.
- **Postgres-side business rules:**
  - Row-level security on every table.
  - Consistency triggers.
  - One RPC, `public.rollover_task(...)` (`supabase/migrations/20261004000004_phase6_weekly_review.sql:143-305`).
- **Auth:** email + password (`supabase.auth.signInWithPassword`, `lib/auth/actions.ts:45`).
  - Sessions are cookie-based via `@supabase/ssr`.
  - `middleware.ts` → `lib/supabase/middleware.ts` refreshes the session and redirects unauthenticated users away from protected paths.
  - Every Server Action calls `requireActiveUser()` or `requireActiveAdmin()` (`lib/auth/guards.ts`).
- **External services:** Supabase only. There are no payment, email, SMS, file-storage, font or analytics integrations (`package.json`, and nothing found in code).

### 2.3 Hosting / deploy

- Commit `4ac3060` says "for **Vercel** production readiness".
- There's **no** `vercel.json`, `netlify.toml` or `.vercel/` in the repo, so the deploy settings live in the hosting dashboard. **Unconfirmed:** the actual host and environment.
- `package.json` requires Node ≥ 20.

### 2.4 Environment variables (names only)

| Name | Exposure | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | all Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | all non-admin clients; also `changePasswordAction` (`lib/auth/actions.ts:214-227`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | `lib/supabase/admin.ts` → `lib/team/actions.ts` |

---

## 3. Structure map

```
app/
  layout.tsx                 Root HTML shell + metadata
  page.tsx                   Redirects "/" → /dashboard
  globals.css                Theme CSS variables (light only)
  (auth)/
    layout.tsx               Centred auth layout
    login/page.tsx           Login form (client component, useActionState)
  (dashboard)/
    layout.tsx               App shell: session gate, sidebar, header, attention data
    dashboard/ my-tasks/ team-board/ goals/ weekly-review/
    insights/ team/ settings/                  One page.tsx each (see routing table)
components/
  ui/                        Primitives: avatar, badge, button, card, progress
  shared/                    page-container, section-header, stat-card, status/priority badges
  layout/                    sidebar, header, mobile-nav
  tasks/ board/ goals/       Feature UIs: views, tables, kanban, dialogs
  reviews/ insights/ team/   Feature UIs
  attention/                 Notification bell + drawer
  auth/auth-session-sync.tsx Cross-tab session/role sync (BroadcastChannel + onAuthStateChange)
  settings/                  Profile form, change-password card
lib/
  supabase/                  client / server / middleware / admin clients
  auth/                      actions (login, logout, profile, password), guards, session, broadcast
  tasks/ goals/ reviews/     queries.ts (reads) + actions.ts (Server Actions) + logic.ts (pure calcs)
  insights/                  queries, pure analytics logic, types
  attention/                 derived "needs attention" items: logic, queries, actions, types
  team/                      admin team management actions, departments list, ban constants
  utils/                     date.ts (Africa/Lagos week math), week.ts (week URL/context), cn.ts
  utils.ts                   cn() helper (the one actually used)
  data/mock-data.ts          UNUSED fixtures (see §5.3)
supabase/migrations/         8 SQL migrations, run manually in the Supabase SQL editor (README §Supabase Setup)
scripts/                     7 offline test scripts (node --experimental-strip-types)
types/index.ts               Hand-written shared types (not generated from the DB)
middleware.ts                Edge middleware entry → lib/supabase/middleware.ts
```

### 3.1 Routing table

| Route | Renders | Access | Notes |
|---|---|---|---|
| `/` | redirect → `/dashboard` | — | `app/page.tsx` |
| `/login` | Login form | signed-out (signed-in users are redirected to `/dashboard`) | `app/(auth)/login/page.tsx`; `lib/supabase/middleware.ts:72-76` |
| `/dashboard` | Weekly overview: task stats, goal progress, attention list, recent tasks | any active user | `app/(dashboard)/dashboard/page.tsx` (588 lines, Server Component) |
| `/my-tasks?week=` | Own tasks for a week, create/edit/delete | any active user | → `components/tasks/tasks-view.tsx` |
| `/team-board?week=` | Shared kanban of everyone's tasks; drag (desktop) or "Move to" (mobile) | any active user; edit only own tasks unless admin | → `components/board/team-board-view.tsx` |
| `/goals?week=` | Weekly company goals with derived progress and risk | view: all · create/edit/delete: **admin** | → `components/goals/goals-view.tsx` |
| `/weekly-review?week=` | Incomplete-task review (carry, cancel, keep, reassign), personal check-in, admin check-in roster, summary | any active user; admin sees team | → `components/reviews/weekly-review-view.tsx` |
| `/insights?from=&to=&member=&preset=` | Multi-week analytics and charts | admin: team + per-member · member: self only | `lib/insights/queries.ts:65-254` |
| `/team` | Team directory; add, edit, deactivate and reactivate members | view: all · manage: **admin** | → `components/team/team-view.tsx` |
| `/settings` | Edit own full name, change password; email read-only | any active user | `components/settings/*` |

All `(dashboard)` routes are gated three times:

1. Middleware: no user → `/login` (`lib/supabase/middleware.ts:65-69`).
2. Layout: unauthenticated or deactivated → `/login` (`app/(dashboard)/layout.tsx:17-19`).
3. Each page: `auth.getUser()` → `/login`.

### 3.2 Data model

All tables live in `public`. Each has row-level security enabled, and `anon` access is revoked.

```
auth.users ──1:1── profiles
                    id, email, full_name, role ADMIN|MEMBER, avatar_url,
                    is_active (8.1), department (8.2), timestamps

profiles ──< tasks.owner_id / created_by / support_person_id
tasks: title, description, priority, status, progress 0-100, due_date,
       week_start (Monday), is_blocked, blocker_reason, acceptance_criteria,
       goal_id → weekly_goals, carried_from_task_id → tasks (self-lineage),
       rollover_count, rollover_note

weekly_goals: title, description, week_start (Monday),
              status ON_TRACK|AT_RISK|OFF_TRACK|ACHIEVED, owner_id, created_by, target_date
              tasks.goal_id must be in the same week (trigger verify_task_goal_week)

task_weekly_reviews: task_id, week_start, outcome, note, reviewed_by
                     outcome: CARRY_FORWARD|CANCEL|REASSIGN|KEEP_IN_WEEK
                     UNIQUE(task_id, week_start); task FK is ON DELETE RESTRICT

weekly_checkins: user_id, week_start, 4 free-text answers, is_submitted, submitted_at
                 UNIQUE(user_id, week_start)

attention_states: user_id, attention_key, read_at, dismissed_at
                  UNIQUE(user_id, attention_key)
```

| Table | Defined in | Who can read | Who can write |
|---|---|---|---|
| `profiles` | `20261004000000_create_profiles.sql`, `20261005000000_phase8_1_team_member_deactivation.sql`, `20261012000000_add_profile_department.sql` | all authenticated users | the user may update **only `full_name`** (column grant, line 152). Role, `is_active` and `department` change only via service role. |
| `tasks` | `…000001_create_tasks.sql`, `…000002_phase4…sql` | **all authenticated users** (Phase 4 widened this) | owner or admin |
| `weekly_goals` | `…000003_create_weekly_goals.sql` | all | admin only |
| `task_weekly_reviews` | `…000004_phase6…sql` | owner of the task, or admin | owner of the task (as `reviewed_by = self`), or admin; insert only, no update or delete |
| `weekly_checkins` | `…000004_phase6…sql` | own, or admin | own only (insert and update) |
| `attention_states` | `…000006_phase8_attention_states.sql` | own | own |

Business rules enforced in the database:

- Status, progress and blocker consistency (`handle_task_consistency`, `…000001…sql:55-132`).
- `created_by` is immutable.
- A goal's week can't change once tasks are linked to it.
- A task and its goal must share a week.
- A review's week must match its task's week.
- Check-in identity fields are immutable.
- `rollover_task` RPC (atomic):
  - copies the task into a later week, carrying `rollover_count + 1`;
  - records a `CARRY_FORWARD` or `REASSIGN` review;
  - only admins may reassign the owner.

There's no migration numbered `…000005`. The sequence jumps from `…000004` to `…000006`.

---

## 4. Feature inventory

### 4.1 Roles

| Role | Can do | Source |
|---|---|---|
| **MEMBER** | View all tasks and goals and the full team directory. Create, edit and delete **own** tasks. Review and roll over own tasks. Submit own check-in. View own insights. Edit own name and change own password. | RLS in `supabase/migrations/*`; guards in `lib/*/actions.ts` |
| **ADMIN** | Everything a member can, plus: CRUD on goals; edit, assign and reassign any task; review any task; see all check-ins and team insights or workload; add members (with a temporary password); edit member name and department; deactivate or reactivate members (never self, never the last admin). | `lib/goals/actions.ts`, `lib/team/actions.ts`, `lib/insights/queries.ts:131-150` |

Role changes after creation are **not available in the app**. The README's route to promoting an admin is a manual SQL update (`…000000_create_profiles.sql:160-167`). No code path changes an existing member's role (`lib/team/actions.ts` has none).

### 4.2 Features

| # | Feature | Where | Status | Notes |
|---|---|---|---|---|
| 1 | Email/password login and logout | `lib/auth/actions.ts:24-113`, `app/(auth)/login/page.tsx` | **Complete** | Deactivated or banned users get a clear message |
| 2 | Route protection | `middleware.ts`, `lib/supabase/middleware.ts`, `app/(dashboard)/layout.tsx` | **Complete** | Middleware lets requests through if env vars are missing (`lib/supabase/middleware.ts:19-21`); pages still redirect |
| 3 | Forgot / reset password | — | **Missing** | No code at all; users locked out need an admin |
| 4 | Change own password | `lib/auth/actions.ts:169-258`, `components/settings/change-password-card.tsx` | **Complete** | Verifies the current password with an isolated client |
| 5 | Edit own profile (name) | `lib/auth/actions.ts:118-156`, `components/settings/profile-form.tsx` | **Complete** | Email read-only; no avatar upload (`avatar_url` is never written) |
| 6 | My Tasks (weekly CRUD) | `app/(dashboard)/my-tasks`, `components/tasks/*`, `lib/tasks/*` | **Complete** | Week navigation via `?week=` |
| 7 | Team Board (kanban) | `components/board/*` | **Complete** | HTML5 drag-and-drop plus a "Move to" fallback (`kanban-card.tsx:130`); blocker prompt when moving to Blocked |
| 8 | Weekly company goals | `components/goals/*`, `lib/goals/*` | **Complete** | Derived progress and risk signals (`lib/goals/logic.ts`) |
| 9 | Weekly review (task outcomes) | `components/reviews/*`, `lib/reviews/actions.ts` | **Complete, with an integrity gap** | See problem P4 |
| 10 | Task rollover / carry forward | `rollover_task` RPC, `lib/reviews/actions.ts:169-208` | **Complete** | Doesn't check that the new owner is active |
| 11 | Weekly check-ins plus admin roster | `components/reviews/weekly-checkin-card.tsx`, `team-checkin-status.tsx` | **Complete** | Submitted check-ins stay editable (by design? see questions) |
| 12 | Insights / analytics | `lib/insights/*`, `components/insights/*` | **Complete, with scaling risk** | See problem P5 |
| 13 | Attention centre (in-app notifications) | `lib/attention/*`, `components/attention/*` | **Complete** | 12 derived types (`lib/attention/types.ts:4-15`); read and dismiss state persisted; no email or push |
| 14 | Team directory | `app/(dashboard)/team`, `components/team/team-view.tsx` | **Complete** | Table on desktop, cards on mobile |
| 15 | Admin: add member | `lib/team/actions.ts:63-250` | **Complete** | Rolls back the auth user if profile setup fails |
| 16 | Admin: edit member (name, department) | `lib/team/actions.ts:507-605` | **Complete** | Department from a fixed list |
| 17 | Admin: deactivate / reactivate | `lib/team/actions.ts:264-496` | **Complete** | Sets `is_active` and bans the auth user for 100 years, with rollback |
| 18 | Admin: change a member's role | — | **Missing** | Manual SQL only |
| 19 | Cross-tab session sync | `components/auth/auth-session-sync.tsx`, `lib/auth/broadcast.ts` | **Complete** | Reloads or refreshes other tabs on sign-out or role change |
| 20 | Dark mode | `tailwind.config.ts:4` (`darkMode: ["class"]`) | **Stubbed** | No dark tokens in `app/globals.css` |
| 21 | Insights placeholder page | README says "Insights placeholder view" | **Superseded** | `/insights` is now a real feature; the README line is stale |

### 4.3 Mock / hard-coded data

- **`lib/data/mock-data.ts` is not imported anywhere**: dead code, not a live fallback. The legacy types it uses (`Task`, `TeamMember`, `StatMetric`, `AttentionItem`, `WeeklyFocus` in `types/index.ts`) are also unused elsewhere.
- **Hard-coded values:**
  - Workspace name "OperonPulse HQ" (`lib/auth/session.ts:86`).
  - Timezone `Africa/Lagos` (`lib/utils/date.ts:7`).
  - Department list (`lib/team/departments.ts`).
  - Example admin email `founder@operonpulse.io`, in a comment only (`…000000_create_profiles.sql:163`).
- Pages fall back to a synthetic `Profile` object when the profile row is missing (e.g. `app/(dashboard)/my-tasks/page.tsx:39-47`). This is defensive rather than mock data.

---

## 5. Health check

### 5.1 Scripts (all run 2026-10-20, Node v24.11.0)

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **Pass**, 0 errors |
| `npm run lint` (`next lint`) | **Pass**, no warnings. `next lint` is deprecated and will be removed in Next 16. |
| `npm test` (6 scripts) | **Pass**. Prints `MODULE_TYPELESS_PACKAGE_JSON` warnings because `package.json` has no `"type"` |
| `scripts/test-insights.mjs` (not in `npm test`) | **Pass**, 15 scenarios, but it isn't part of the test command |
| `npm run build` | **Pass**. 11 routes; middleware 93.8 kB; largest page `/weekly-review` 10.3 kB |
| `npm audit` | Before: **12 (1 critical, 9 high, 2 moderate).** After upgrading to Next 15.5.28: **12 (0 critical, 9 high, 3 moderate)**, with no remaining Next.js advisories. The rest are build-time tooling (Tailwind 3, ESLint config, PostCSS) or `sharp` (unused, since `next/image` isn't used); each fix needs a major upgrade. |

**What the tests actually cover.** Several suites test copies of the logic rather than the real code:

| Suite | Imports production code? |
|---|---|
| `test-attention.mjs` (29) | ✅ `lib/attention/logic.ts`, `lib/utils/date.ts` |
| `test-week-planning.mjs` (14) | ✅ `lib/utils/date.ts`, `lib/utils/week.ts` |
| `test-department.mjs` (10) | ⚠️ only `lib/team/departments.ts`; the server action is re-implemented inside the test (line ~83) |
| `test-deactivation.mjs` (24) | ⚠️ only `lib/team/constants.ts`; deactivation logic simulated |
| `test-team-creation.mjs` (14) | ❌ no production imports; tests a local copy |
| `test-change-password.mjs` (14) | ❌ no production imports |
| `test-insights.mjs` (15) | ❌ no production imports, and not run by `npm test` |

So the auth, team-management, task, goal, review and insights-query code paths have **no real automated coverage**, and the database policies and triggers are untested.

### 5.2 TODO / FIXME / HACK

None found in tracked files (`git grep -nE "TODO|FIXME|HACK|XXX"`).

### 5.3 Dead code and duplication

**Dead files**

- `lib/data/mock-data.ts`: never imported.
- `components/shared/placeholder-view.tsx`: never imported.
- `lib/utils/cn.ts`: an exact duplicate of `lib/utils.ts`, and never imported (13 files import `@/lib/utils`).
- Legacy types `Task`, `TeamMember`, `StatMetric`, `AttentionItem`, `WeeklyFocus` in `types/index.ts`: used only by the dead mock file.

**Duplicated logic**

- The "fetch user, then profile, else build a fallback Profile" block is copy-pasted in four pages: `goals`, `my-tasks`, `team-board`, `weekly-review` (`page.tsx` lines ~18-47 each). Those copies also select a column list that **omits `is_active` and `department`**.
- Week-parameter parsing is inconsistent:
  - Most pages use `normalizeWeekStart()` (`lib/utils/week.ts:36`).
  - `/weekly-review` only regex-checks the format (`app/(dashboard)/weekly-review/page.tsx:54-57`), so a non-Monday date such as `?week=2026-10-14` is accepted and simply returns no data.
- Status and priority colour mappings are defined in several components (`kanban-card.tsx`, `task-table.tsx`, `incomplete-tasks-list.tsx`, `task-detail-dialog.tsx`, …) as well as `types/index.ts`.
- "Department column may not exist yet" fallback queries are scattered through runtime code (`lib/tasks/queries.ts:87-103`, `lib/team/actions.ts:565-579`). They hide schema drift instead of failing loudly.

### 5.4 Security

**Done well**

- The service-role key is server-only (`import "server-only"`) and imported only in `lib/team/actions.ts`.
- RLS is on every table, `anon` is revoked, and `profiles` uses column-level `UPDATE` grants.
- Every Server Action re-checks auth and active status, and admin status where needed (`lib/auth/guards.ts`).
- No secrets are in the repository or Git history.
- No `dangerouslySetInnerHTML` or `eval`.
- Middleware uses `getUser()`, not the spoofable `getSession()` (`lib/supabase/middleware.ts:42-46`).

**Concerns**

1. **Vulnerable Next.js 15.5.18** (`npm audit`). Advisories affecting this app include:
   - Server Actions denial of service — GHSA-m99w-x7hq-7vfj.
   - Disclosure of internal Server Function endpoints — GHSA-955p-x3mx-jcvp.
   - Cache-confusion issues.

   The RCE advisories in the list concern Windows hosting and the AVIF image optimiser; the app uses neither `next/image` nor, presumably, Windows. A non-breaking fix exists: **`next@15.5.28`**.
2. **Deactivation isn't enforced at the database layer.** No RLS policy references `profiles.is_active` (verified by grep).
   - Deactivation bans the auth user (`lib/team/actions.ts:351-353`), which stops new logins and token refresh.
   - But an **already-issued access token stays valid until it expires** (Supabase default: 1 hour). During that window it can be used against the Supabase REST API directly, bypassing the Server Action guards.
3. **The owner-reassignment guard in the trigger is ineffective.** In `handle_task_consistency`, `current_user NOT IN ('postgres', …)` (`…000001_create_tasks.sql:121`) always evaluates as `postgres`, because the function is `SECURITY DEFINER` (line 132).
   - Today the RLS `WITH CHECK` on `tasks` still blocks a member from giving a task away, so this isn't currently exploitable.
   - But the second layer of defence doesn't work as written.
4. **Review outcomes aren't validated.** `recordTaskReviewAction` casts the client-supplied outcome (`lib/reviews/actions.ts:138`) without checking it.
   - A member can record `CARRY_FORWARD` or `REASSIGN` on their own task without creating the carried task.
   - The database CHECK allows those values, so this skews carryover analytics.
   - Scope is limited to the member's own tasks.
5. **Inactive users can be assigned work.** Server Actions and `rollover_task` accept any existing profile as `owner_id` or support person, including deactivated users (`…phase6…sql:205-209`). The UI hides inactive members (`lib/tasks/queries.ts:84`), but the server doesn't enforce it.
6. **Raw backend error text reaches the UI** (e.g. `lib/tasks/actions.ts:112`, `lib/team/actions.ts:140`). Low risk for an internal tool, but it can leak schema and constraint names.
7. **No visible application-level rate limiting** on login or password checks. This relies on Supabase Auth's own limits; I couldn't verify what they're set to.
8. **Admin-only data is visible to all members.** Every authenticated user can read every task (Phase 4 policy) and every profile, including emails. For an internal single-team tool this is likely intended (see question 3).

### 5.5 Performance

- **Repeated auth round-trips.** Each dashboard page view calls `auth.getUser()` four or five times: in middleware, in the layout's `getCurrentUserSession`, in attention queries, and in the page itself. No `React.cache()` is used anywhere.
- **Attention data computed on every page.** It's built in the dashboard layout on every navigation (`app/(dashboard)/layout.tsx:21`) and again on `/dashboard` (`dashboard/page.tsx:47`). That's about 12 Supabase queries each time (`lib/attention/queries.ts`).
- **Insights queries are unbounded.**
  - A custom `from`/`to` range isn't capped (`lib/insights/queries.ts:92-108`).
  - Result sets have no explicit paging. PostgREST's default row cap (commonly 1,000) could **silently truncate** analytics as data grows. I couldn't verify this project's actual cap.
  - Query errors aren't checked (`tasksRes.error` is ignored), so a failure shows as zero metrics.
- **The app renders in a serif font (Times).** Tailwind's `font-sans` starts with `var(--font-sans)`, which is never defined. An undefined `var()` invalidates the whole `font-family` declaration, so the browser falls back to its default serif instead of the listed system fonts. This was confirmed in the browser on `/login` (computed `font-family: Times`). It's a visible UI bug, not just a consistency issue.

### 5.6 UX and accessibility

- **13 hand-rolled modal dialogs**, each re-implementing overlay and layout.
  - All set `role="dialog"` and `aria-modal`.
  - **None traps keyboard focus.**
  - **9 of 13 don't close on Escape**: blocker-prompt, task-detail, delete-goal, goal-detail, goal-form, task-review, delete-task, add-member, edit-member.
- Very small text is common: `text-[11px]` ×103, `text-[10px]` ×87, `text-[9px]` ×2.
- There's no password-reset path, so a forgotten password always needs an admin.
- Board drag-and-drop uses native HTML5 drag events, which don't fire on touch screens. The "Move to" menu covers this.

---

## 6. Design system

| Aspect | Definition | Source |
|---|---|---|
| Colour tokens | shadcn-style HSL variables: background (warm off-white `36 20% 98%`), foreground, card, primary (near-black), secondary, muted, **accent = amber** (`38 92% 50%`), destructive, border, input, ring (amber) | `app/globals.css:6-33` |
| Brand scale | `brand-50…950` (Tailwind amber values) | `tailwind.config.ts:56-68`. **Used 0 times.** |
| Radius | `--radius: 0.5rem` → `lg`/`md`/`sm` | `globals.css:33`, `tailwind.config.ts:70-74` |
| Typography | `font-sans: var(--font-sans), system-ui…`. `--font-sans` is **never defined** and `next/font` isn't used, so the whole declaration is invalid and **every page renders in the browser's default serif (Times)**, confirmed in the browser. | `tailwind.config.ts:74`, `app/globals.css` |
| Spacing | Tailwind defaults; container max 1400px | `tailwind.config.ts` |
| Dark mode | Enabled in config, **no dark tokens** | `tailwind.config.ts:4`, `globals.css` |
| Shared components | `ui/`: avatar, badge (CVA), button (CVA), card, progress. `shared/`: page-container, section-header, stat-card, status-badge, priority-badge. **No** dialog, input, select or textarea primitives (51 raw form controls are styled inline). | `components/ui`, `components/shared` |

**Consistency.** Across 73 `.tsx` files in `app/` and `components/`:

| Colour usage | Count |
|---|---:|
| Theme tokens (`bg-background`, `text-muted-foreground`…) | 404 |
| Raw `slate`/`gray` | 1,060 |
| Raw `amber` | 474 |
| Raw `zinc` | 330 |
| Other raw hues | 749 |

So about 85% of colour usage bypasses the theme, and `zinc` and `slate` are mixed even though the shadcn base colour is `zinc` (`components.json`). The core primitives (`components/ui/button.tsx`, `card.tsx`) are themselves hard-coded to `zinc`. The amber accent is consistent in practice (focus rings, login mark, active states), so the *look* is coherent, but re-theming would mean editing most files.

---

## 7. Top problems, by severity

| # | Severity | Problem | Evidence |
|---|---|---|---|
| **P1** | High | Next.js 15.5.18 has known advisories (Server Actions DoS, function endpoint disclosure, cache confusion). The patched version 15.5.28 is a non-breaking upgrade. | `npm audit`; §5.4 (1) |
| **P2** | High | Most critical logic has no real test coverage: 3 suites test re-implemented copies, `test-insights` isn't wired in, and DB policies and triggers are untested. Passing tests give false confidence. | §5.1 |
| **P3** | Medium | Deactivation isn't enforced by RLS. Existing access tokens work against Supabase directly until expiry; inactive users can still be assigned tasks. | §5.4 (2, 5) |
| **P4** | Medium | Data-integrity gaps: unvalidated review outcomes skew analytics; the trigger's owner guard is ineffective under `SECURITY DEFINER`; `/weekly-review` accepts non-Monday weeks. | `lib/reviews/actions.ts:138`; `…000001…sql:121,132`; `weekly-review/page.tsx:54-57` |
| **P5** | Medium | Scaling: insights have no range cap or paging, so a row cap could silently truncate; ~12 attention queries plus repeated `getUser()` on every page view. | §5.5 |

Also worth fixing soon: dialog accessibility (no focus trap, missing Escape), the missing password reset, the stale README, and design-token drift.

---

## 8. Recommended next steps

1. **Upgrade `next` to 15.5.28** (patch release; then `npm audit` again, and rebuild and smoke-test the Server Actions).
2. **Make the tests real.**
   - Import the actual modules in the team, password and department suites, and add `test-insights.mjs` to `npm test`.
   - Add database-level tests for the RLS policies and the `rollover_task` RPC, run against a local Supabase.
3. **Close the integrity and authorisation gaps.**
   - Validate the review outcome against `CANCEL | KEEP_IN_WEEK`.
   - Reject inactive owners and support people on the server and in the RPC.
   - Add an `is_active` check to RLS, for example through an `is_active_user()` helper alongside `is_admin()`.
   - Fix or remove the ineffective `current_user` check.
   - Normalise the `/weekly-review` week parameter.
4. **Reduce per-request work.**
   - Wrap the session and attention loaders in `React.cache()`.
   - Cap the insights range and page or aggregate the queries.
   - Surface query errors instead of showing zero metrics.

After that:

- Delete the three dead files.
- Extract a shared `Dialog` with focus trap and Escape.
- **Fix the serif-font bug:** define `--font-sans` (or load a font with `next/font`).
- Move hard-coded colours onto theme tokens.
- Refresh the README.
- Add the Phase 8 migrations to its setup list.

---

## 9. Things I could not verify

- Which Supabase migrations are actually applied in production. `…000006` carries "DO NOT RUN AUTOMATICALLY ON PRODUCTION — user approval required" (`…000006_phase8_attention_states.sql:5-6`), and the code contains fallbacks for a missing `department` column.
- The hosting platform and its environment settings (no `vercel.json` in the repo).
- Supabase project settings: JWT expiry, PostgREST max rows, auth rate limits, email confirmation and sign-up settings. **Public sign-up being enabled would let anyone create a MEMBER account and read all tasks and profiles.** This is worth checking first.
- Runtime behaviour in a browser. This pass didn't log in or click through the UI.

---

## 10. Open questions

1. ~~Is Operon Pulse an internal tool or part of the school platform?~~ **Answered:** it's Operon's own internal team tool. Single-tenant is therefore fine.
2. Is **public sign-up disabled** in Supabase Auth? The app has no sign-up page, but the code doesn't control the setting.
3. Should **members see all tasks and all profiles**, including emails? The Phase 4 migration made that deliberate.
4. Should **submitted check-ins be locked**? Today they stay editable.
5. Should members be able to **move their tasks to other weeks**, including past ones, through edit? Nothing prevents it.
6. Should admins be able to **change roles in-app**, and is there a need for **password reset**?
7. Is `Africa/Lagos` meant to be **fixed**, or per-user or per-workspace?
8. Which migrations are applied in production, and is there a reason `…000005` is missing?
