# TaskFlow – Project Scope & Blueprint

_Take-home assignment: Full Stack Engineer · Spring Boot + Kotlin API, React + TypeScript UI · Prepared 17 November 2026_

## 1. Scope at a glance

**Goal:** a small, clean, fully working team task tracker that hits every mandatory requirement in the brief, handles the edge cases a reviewer will probe, and leaves a 45-minute live walkthrough and "extend one feature" session easy to survive.

**Guiding principle from the brief:** clean, working, well-structured code beats finishing every bonus. So the plan is tiered: **Tier 1 = mandatory**, **Tier 2 = bonus that is cheap**, **Tier 3 = polish if time remains**.

| Area          | Decision                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| Backend       | Spring Boot 3.x (latest patch), Kotlin, Gradle (Kotlin DSL), Java 21             |
| Persistence   | PostgreSQL (Docker) for dev/prod, H2 for tests, Spring Data JPA, Flyway          |
| Auth          | Spring Security, stateless JWT (HS256), BCrypt                                   |
| API docs      | springdoc-openapi (Swagger UI)                                                   |
| Frontend      | React 18, TypeScript, Vite                                                       |
| UI kit        | **shadcn/ui** (Radix primitives + Tailwind) + lucide-react icons + sonner toasts |
| Server state  | TanStack Query (React Query)                                                     |
| Forms         | React Hook Form + Zod                                                            |
| Drag and drop | dnd-kit (pointer, touch and keyboard sensors)                                    |
| HTTP          | axios instance in a dedicated API layer                                          |
| Tests         | JUnit 5 + MockK, @SpringBootTest + MockMvc, Jest + React Testing Library         |
| DevOps        | Docker Compose (db + backend + frontend), GitHub Actions CI                      |

**Assumption to confirm:** "premium UI components already available" is read as **shadcn/ui** (accessible, themeable, copied into the repo, no licence issue). If you meant a specific internal or paid library, only Section 6.2 changes; the architecture stays the same.

## 2. Architecture overview

```
Browser (React SPA)
  routes → feature components → hooks (TanStack Query) → api layer (axios)
                                                           │  Bearer JWT
                                                           ▼
Spring Boot (Kotlin)
  JwtAuthFilter → Controller (DTOs, validation)
               → Service (rules, ownership, Clock)
               → Repository (Spring Data JPA + Specifications)
               → PostgreSQL (Flyway-managed schema)
  @RestControllerAdvice → one consistent error shape
```

**Layer rules (enforced in review):** controllers never touch repositories; services never return entities; entities never leave the service layer; mappers convert entity ↔ DTO in one place.

## 3. Repository layout

```
taskflow/
├── backend/
│   ├── src/main/kotlin/com/taskflow/
│   │   ├── config/        SecurityConfig, CorsConfig, OpenApiConfig, ClockConfig
│   │   ├── security/      JwtService, JwtAuthFilter, entry point / denied handlers
│   │   ├── auth/          AuthController, AuthService
│   │   ├── user/          User, UserRepository, UserController (me, list)
│   │   ├── project/       Project, ProjectRepository, ProjectService, ProjectController
│   │   ├── task/          Task, TaskRepository, TaskService, TaskController,
│   │   │                  spec/ (TaskSpecifications), sort/ (TaskSortStrategy*), TaskMapper
│   │   ├── activity/      TaskActivity (bonus)
│   │   ├── common/        ApiError, GlobalExceptionHandler, PageResponse, exceptions
│   │   └── seed/          DevDataSeeder (@ConditionalOnProperty SEED_DEMO_DATA)
│   ├── src/main/resources/ application.yml, application-dev.yml, db/migration/V1__init.sql …
│   ├── src/test/kotlin/…   service tests (MockK), integration tests (MockMvc)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/           client.ts, auth.api.ts, projects.api.ts, tasks.api.ts, users.api.ts
│   │   ├── components/ui/ shadcn components
│   │   ├── components/    TaskCard, TaskColumn, SummaryBar, FilterBar, TaskFormDialog,
│   │   │                  ConfirmDialog, EmptyState, ErrorState, AppShell
│   │   ├── features/      auth/, projects/, board/ (hooks + pages)
│   │   ├── lib/           auth-storage.ts, errors.ts, dates.ts, utils.ts, validation/
│   │   ├── routes/        ProtectedRoute, PublicOnlyRoute, router.tsx
│   │   └── types/         DTO types mirroring the API
│   ├── Dockerfile, nginx.conf
├── docker-compose.yml · .env.example · .github/workflows/ci.yml · README.md
```

_Strategy classes live in `task/sort/`; the filter specifications in `task/spec/`._

## 4. Backend blueprint

### 4.1 Data model

| Entity               | Fields                                                                                                                             | Notes                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| User                 | id (UUID), name, email, passwordHash, createdAt                                                                                    | email stored lowercase, unique index                                                         |
| Project              | id, name, description, owner → User, createdAt                                                                                     | index on owner_id                                                                            |
| Task                 | id, title, description, status, priority, dueDate (LocalDate, nullable), assignee → User (nullable), project, createdAt, updatedAt | enums stored as STRING; indexes on (project_id, status), (project_id, due_date), assignee_id |
| TaskActivity (bonus) | id, task, actor, type, fromValue, toValue, createdAt                                                                               | status changes only                                                                          |

**Kotlin + JPA specifics:** enable `kotlin-jpa` and `kotlin-spring` (all-open) plugins; entities are plain classes with `var`s, **not** data classes; equals/hashCode based on id; lazy associations; auditing (`@CreatedDate`, `@LastModifiedDate`) for timestamps; `spring.jpa.open-in-view=false`; Hibernate `ddl-auto=validate` because Flyway owns the schema.

### 4.2 Endpoints

**Required**

| Method | Endpoint                   | Success | Notes                                               |
| ------ | -------------------------- | ------- | --------------------------------------------------- |
| POST   | /api/auth/register         | 201     | validates, 409 on duplicate email, returns user DTO |
| POST   | /api/auth/login            | 200     | returns `{token, tokenType, expiresIn, user}`       |
| GET    | /api/projects              | 200     | only current user's projects                        |
| POST   | /api/projects              | 201     | owner = current user                                |
| GET    | /api/projects/{id}/tasks   | 200     | filters, sort, pagination (4.5)                     |
| POST   | /api/projects/{id}/tasks   | 201     | status defaults to TODO, priority to MEDIUM         |
| PUT    | /api/tasks/{id}            | 200     | full update of editable fields                      |
| PATCH  | /api/tasks/{id}/status     | 200     | body `{status}` only                                |
| DELETE | /api/tasks/{id}            | 204     | second delete returns 404                           |
| GET    | /api/projects/{id}/summary | 200     | counts per status plus overdue                      |

**Supporting (small additions, called out as assumptions in the README)**

| Method | Endpoint                 | Why                                          |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | /api/users/me            | restore session on page refresh              |
| GET    | /api/users               | id + name only, powers the assignee dropdown |
| GET    | /api/tasks/{id}/activity | bonus activity log                           |

### 4.3 Security

- Stateless sessions, CSRF disabled (token auth, no cookies), CORS origins from an env var.
- Public: `/api/auth/**`, Swagger paths (only when Swagger is enabled by flag). Everything else authenticated.
- `JwtAuthFilter` (OncePerRequestFilter) validates signature, expiry and subject; sets the principal.
- Custom `AuthenticationEntryPoint` returns **401** and `AccessDeniedHandler` returns **403**, both in the standard error JSON shape (not Spring's default HTML).
- BCrypt for passwords. **Password rule: 8–72 bytes, with at least one letter and one number** (BCrypt ignores bytes past 72).
- Login failure always returns the same message for unknown email and wrong password (no user enumeration).
- Secret must be 256 bits or more, read from `JWT_SECRET`; the app **fails fast at startup** if it is missing or too short.
- **Ownership:** every project and task lookup goes through `findByIdAndOwnerId` (tasks via `project.owner`). A resource that exists but belongs to someone else returns **404**, not 403, so IDs cannot be probed.

### 4.4 Validation and error handling

Validation rules (Jakarta Bean Validation on request DTOs; full matrix in section 19):

- Task title: required, not blank, trimmed, max **120**. Description max 2000.
- Project name: required, max 100. Description max 1000.
- Email format, max 254; name 2–80.
- **dueDate must not be in the past on create.** On update it is only rejected if the value **changed** to a past date, so editing an already-overdue task does not fail.
- assigneeId, if present, must reference an existing user (400 with field error otherwise).

One error shape for everything:

```json
{
  "timestamp": "2026-11-17T10:15:30Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Validation failed",
  "path": "/api/projects/…/tasks",
  "fieldErrors": [{ "field": "title", "message": "Title is required" }]
}
```

`GlobalExceptionHandler` maps: `MethodArgumentNotValidException` and `ConstraintViolationException` → 400 with fieldErrors; `HttpMessageNotReadableException` (bad JSON or unknown enum value) → 400 with a readable message; `MethodArgumentTypeMismatchException` (bad UUID, bad sort key) → 400; `ResourceNotFoundException` → 404; `DuplicateEmailException` and `DataIntegrityViolationException` → 409; `BadCredentialsException` → 401; `AccessDeniedException` → 403; catch-all → 500 with a generic message, full stack trace only in logs.

### 4.5 Listing: filters, sorting, pagination

- Query params: `status`, `priority`, `assigneeId` (UUID or the literal `unassigned`), `sort` (`dueDate,asc|desc` or `priority,asc|desc`), `page` (0-based, default 0), `size` (default 20, **max 100**).
- Filters are composed with JPA `Specification`s (one small spec per filter, AND-combined).
- Sorting uses **Strategy** objects behind a whitelist; an unknown sort key returns 400 instead of leaking a Hibernate error.
- **Priority sort is semantic, not alphabetical.** A STRING enum would sort HIGH, LOW, MEDIUM, so the priority strategy sorts by a `CASE` expression (LOW=1, MEDIUM=2, HIGH=3).
- **Nulls last** for dueDate in both directions, with `id` as a stable tie-breaker so pages never overlap or skip.
- Response is our own `PageResponse<T>` (`content, page, size, totalElements, totalPages, last`), not Spring's `Page` JSON.

### 4.6 Summary endpoint

One grouped query for counts plus one count for overdue. Response always contains **all three statuses, zero-filled**, plus `overdue` and `total`.
**Overdue = `dueDate < today` AND `status != DONE`.** "Today" comes from an injected `java.time.Clock` (UTC), so tests can fix the date and the UI and API agree.

### 4.7 Status changes and activity log (bonus)

PATCH and PUT both route through one `TaskService.changeStatus` path. A no-op (same status) writes no activity row. Each real change records actor, from, to, timestamp. Activity rows are deleted with their task.

### 4.8 Backend tests

| Type                                        | What                                                                                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (JUnit 5 + MockK)                      | `AuthService`: duplicate email, wrong password. `ProjectService`: ownership isolation. `TaskService`: create rejects past date, update allows unchanged past date, status change logs activity, not-owner → not found, summary and overdue maths with a fixed Clock |
| Integration (@SpringBootTest + MockMvc, H2) | register → login → create project → create task → filter/sort → patch status → summary; 401 without token; 404 when user B reads user A's project; 400 field-error shape                                                                                            |
| Optional                                    | `@WebMvcTest` slice for the validation error shape                                                                                                                                                                                                                  |

## 5. Configuration and secrets

- `application.yml` holds only non-secret defaults; `application-dev.yml`, `application-test.yml`, `application-prod.yml` override per profile.
- Environment variables: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`, `CORS_ALLOWED_ORIGINS`, `SPRING_PROFILES_ACTIVE`; frontend uses `VITE_API_URL`.
- `.env` is git-ignored; `.env.example` is committed with placeholders. The test profile uses a clearly labelled throw-away secret that only exists in `src/test/resources`.
- Flyway migrations (`V1__init.sql`, `V2__indexes.sql`, `V3__activity.sql`) written in portable SQL so they also run on H2 in tests.
- **Seed data:** a `DevDataSeeder` (runs only when the demo-data flag is on, idempotent) creates a demo user, 2 projects and about 12 tasks with every status and priority, some overdue, some unassigned. Credentials documented in the README (a demo-only password, hashed at seed time).
- **Demo mode flags:** `SEED_DEMO_DATA` and `SWAGGER_ENABLED` are false by default in production and true in the dev profile **and in `docker-compose.yml`**, so a reviewer who only runs `docker compose up` still gets the demo login and Swagger UI.

## 6. Frontend blueprint

### 6.1 Routes

| Route             | Access                                           | Screen                 |
| ----------------- | ------------------------------------------------ | ---------------------- |
| /login, /register | public-only (authed users redirect to /projects) | auth forms             |
| /projects         | protected                                        | projects list + create |
| /projects/:id     | protected                                        | board                  |
| *                 | public                                           | 404 page               |

`ProtectedRoute` shows a full-page skeleton while the session restores (`/users/me`), then either renders or redirects to `/login` with the original location saved, so login returns the user to where they were.

### 6.2 Component plan (premium, accessible, already available)

| Need                          | Component                                                  |
| ----------------------------- | ---------------------------------------------------------- |
| Buttons, inputs, textareas    | shadcn Button (with loading state), Input, Textarea, Label |
| Forms                         | shadcn Form + React Hook Form + Zod                        |
| Task create/edit              | **Dialog** on desktop, **Sheet** (bottom drawer) on mobile |
| Delete confirmation           | AlertDialog                                                |
| Priority and assignee pickers | Select, Avatar                                             |
| Due date                      | Popover + Calendar (past dates disabled on create)         |
| Priority and overdue badges   | Badge (colour **plus** icon and text)                      |
| Summary bar                   | Card ×4 (To Do, In Progress, Done, Overdue)                |
| Column switcher (mobile)      | Tabs with counts                                           |
| Loading                       | Skeleton (card-shaped, not spinners)                       |
| Feedback                      | sonner toasts, Alert for inline errors                     |
| Card actions                  | DropdownMenu (Edit, Move to…, Delete), Tooltip             |
| Icons                         | lucide-react                                               |
| Theme                         | light/dark via CSS variables (Tier 3 toggle)               |

**Reusable app components** (called out in the brief): `TaskCard`, `TaskColumn`, `Modal` wrapper (Dialog/Sheet switcher), `Button`, `SummaryBar`, `FilterBar`, `EmptyState`, `ErrorState`.

### 6.3 API layer

- One axios instance, `baseURL` from `VITE_API_URL`; **no HTTP calls inside components**.
- Request interceptor attaches `Authorization: Bearer <token>`.
- Response interceptor: on **401** (except from `/auth/login`) clear token, toast "Session expired, please sign in again", redirect to `/login`. A shared guard prevents several parallel 401s from firing repeated redirects.
- Errors are normalised to `ApiError { status, code, message, fieldErrors }`; a helper maps `fieldErrors` straight onto React Hook Form fields.
- Typed functions per resource (`tasksApi.list(projectId, params)`, `tasksApi.updateStatus(id, status)` …). Network failure and timeout produce a friendly message, not a raw axios error.
- Token in localStorage (the brief asks to "store the JWT"); XSS trade-off documented. A `storage` event listener logs out all tabs together; the JWT `exp` is checked client-side so an expired token never triggers a request.

### 6.4 State management: TanStack Query + a small Auth Context

Server state (projects, tasks, summary, users) is cache data, which is exactly what React Query is for: caching, request dedupe, retries, loading/error flags and optimistic updates for free. The only client-global state is the auth session, so a Context is enough. Redux would add boilerplate with no benefit here. _(This is the README explanation the brief asks for.)_

Query keys: `['projects']`, `['tasks', projectId, status, filters]`, `['summary', projectId]`, `['users']`.

### 6.5 Screens

**Register / Login:** Zod rules mirror the server (email format, password 8–72, name required). Show/hide password, submit disabled while pending, server field errors shown inline, "email already registered" surfaced on the email field, wrong credentials shown as one form-level alert. Token saved, redirect to `/projects`.

**Projects list:** responsive card grid; "New project" dialog; skeletons while loading; empty state with a primary CTA; error state with Retry; new project appears immediately after create (cache update).

**Project board:**

- Header with project name, "New task" button, back link.
- **SummaryBar** from `/summary` (always project-wide, not affected by filters; documented).
- **FilterBar:** priority, assignee (All / Unassigned / each user), sort by due date asc/desc, "Clear filters". State lives in the **URL search params**, so a refresh or shared link keeps the view.
- **Columns:** one paginated query **per status** (size 20) with a "Load more" button, so a column with 500 tasks never silently truncates. Column header shows the total from the summary.
- **TaskCard:** title, priority badge, due date, assignee avatar; overdue = destructive colour + alert icon + "Overdue" text (never colour alone); overdue styling is **not** applied to DONE tasks.
- **Moving tasks:** drag between columns (dnd-kit with pointer, touch with a short press delay, and keyboard sensors) **and** a "Move to…" menu on every card, which is the primary path on mobile and for accessibility.
- Optimistic move: cancel in-flight queries, snapshot, move the card, call PATCH; on error roll back and toast; on settle invalidate the column queries and summary. Dropping in the same column or outside any column is a no-op. Order within a column follows the active sort (no manual ordering, per the brief's data model).
- Delete via AlertDialog; edit by clicking the card.

**Task form (create/edit):** title (counter, max 120), description, priority, due date, assignee, status shown on edit. Create blocks past dates; edit keeps an existing past date valid. Server `fieldErrors` mapped onto fields. Closing with unsaved changes asks for confirmation. Prefilled on edit. Submit locked while saving to prevent duplicates.

**App shell and logout:** a top bar on every protected page with the TaskFlow logo, a theme toggle (Tier 3) and a user menu (DropdownMenu + Avatar) showing the user's name and a **Log out** item. Logout clears the stored token, clears the whole React Query cache (so no data from the previous user can flash for the next one), and redirects to `/login`. It also fires the cross-tab `storage` event so other open tabs sign out too.

### 6.6 States checklist (every API call)

| Call                          | Loading                  | Empty                                                     | Error                              |
| ----------------------------- | ------------------------ | --------------------------------------------------------- | ---------------------------------- |
| Session restore               | full-page skeleton       | n/a                                                       | redirect to login                  |
| Projects list                 | card skeletons           | "No projects yet" + CTA                                   | ErrorState + Retry                 |
| Board tasks (per column)      | card skeletons           | "Nothing here" / "No tasks match filters" + Clear filters | per-column ErrorState + Retry      |
| Summary                       | skeleton cards           | zeros                                                     | inline retry, board still usable   |
| Create/update/delete/move     | button spinner, disabled | n/a                                                       | toast + inline field errors        |
| Project not found / not yours | n/a                      | n/a                                                       | dedicated "Project not found" page |

### 6.7 Responsive and accessibility

- Mobile-first Tailwind: below `md` the board becomes **Tabs** (one column at a time, counts on tabs); from `md` up, a 3-column grid. Dialog becomes a bottom Sheet. Filter bar collapses into a horizontal scroll row. Touch targets at least 44px.
- Radix gives focus trapping, ARIA roles and Escape handling; visible focus rings; icon buttons have labels; `prefers-reduced-motion` respected; contrast checked on badges.

### 6.8 Frontend tests (Jest + React Testing Library)

Minimum is two; plan four:

1. `TaskCard`: renders fields, shows the overdue treatment for a past due date, none when DONE.
2. `TaskFormDialog`: shows "title required" and the 120-character limit, submits valid data to the mocked API layer, maps a server field error.
3. `LoginForm`: validation messages and error alert on 401.
4. `ProtectedRoute`: redirects when logged out, renders children when logged in.

The API module is mocked at its boundary (or MSW if time allows). `import.meta.env` access sits in one config module so Jest can mock it.

## 7. Edge-case register

| #   | Area       | Edge case                                             | Handling                                                                                   |
| --- | ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Auth       | Duplicate email with different casing                 | normalise to lowercase; unique index; 409                                                  |
| 2   | Auth       | Two simultaneous registrations, same email            | catch `DataIntegrityViolationException` → 409                                              |
| 3   | Auth       | Password over 72 bytes                                | rejected at validation                                                                     |
| 4   | Auth       | Unknown email vs wrong password                       | identical 401 message                                                                      |
| 5   | Auth       | Expired, tampered or malformed JWT                    | 401 JSON via entry point; client logs out cleanly                                          |
| 6   | Auth       | Token expires mid-session or in another tab           | interceptor and storage event; toast and redirect                                          |
| 7   | Authz      | User B requests user A's project, task or summary     | 404 (not 403) via owner-scoped queries                                                     |
| 8   | Authz      | Task id valid but its project belongs to someone else | same 404 path                                                                              |
| 9   | Validation | Title blank or whitespace only, 121 chars             | 400 with field message                                                                     |
| 10  | Validation | Past due date on create vs update                     | blocked on create; update only rejects a changed past date                                 |
| 11  | Validation | Malformed JSON, unknown enum, bad UUID                | 400, readable message, no stack trace                                                      |
| 12  | Validation | assigneeId of a non-existent user                     | 400 field error                                                                            |
| 13  | Listing    | Sorting by priority                                   | CASE-based rank, not alphabetical                                                          |
| 14  | Listing    | Null due dates                                        | nulls last, both directions                                                                |
| 15  | Listing    | Page size 0, negative, 10 000; invalid sort key       | clamped or 400; whitelist                                                                  |
| 16  | Listing    | Page boundaries with equal sort values                | id tie-breaker                                                                             |
| 17  | Listing    | Filters combined, or no results                       | AND composition; empty page is 200, not 404                                                |
| 18  | Summary    | Statuses with zero tasks; DONE tasks past due         | zero-filled; DONE never counted overdue                                                    |
| 19  | Time       | Day boundary and timezones                            | LocalDate + injected UTC Clock; UI formats dates without timezone shifts                   |
| 20  | Tasks      | PATCH to the same status                              | idempotent, no activity row                                                                |
| 21  | Tasks      | Delete twice; edit after delete in another tab        | 404; UI shows toast and refreshes the board                                                |
| 22  | Tasks      | Edit and drop at the same time                        | last write wins (documented trade-off; `updatedAt` available for optimistic locking later) |
| 23  | Data       | Entity leaks, lazy-loading errors, N+1                | DTOs only, `open-in-view=false`, fetch joins or batch size                                 |
| 24  | Errors     | Unexpected exception                                  | generic 500, details only in logs                                                          |
| 25  | UI         | Drag fails server-side                                | rollback and toast                                                                         |
| 26  | UI         | Drag on touch scrolls the page                        | touch sensor with press delay plus the Move-to menu                                        |
| 27  | UI         | Double click on submit                                | button disabled while pending                                                              |
| 28  | UI         | Column with many tasks                                | per-column pagination with Load more                                                       |
| 29  | UI         | Filter changes flicker the board                      | keep previous data while fetching                                                          |
| 30  | UI         | Refresh on a deep link while logged in                | session restored before routes render                                                      |
| 31  | UI         | Backend down or slow                                  | timeout, friendly error with Retry                                                         |
| 32  | UI         | Overdue shown by colour only                          | icon and text label too                                                                    |
| 33  | Seed       | Seeder run twice                                      | idempotent check on demo email                                                             |
| 34  | Config     | Missing or short `JWT_SECRET`                         | application refuses to start                                                               |

## 8. Design patterns (named in the README)

| Pattern                                | Where                                                                     | Why it earns its place                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Repository**                         | Spring Data repositories behind services                                  | isolates persistence, easy to mock with MockK                                        |
| **Strategy**                           | `TaskSortStrategy` (DueDate, Priority) picked from a registry by sort key | new sort keys need no change to the service; this is the likely live-extension point |
| **Specification** (composable filters) | `TaskSpecifications.status/priority/assignee`                             | filters combine without `if` chains                                                  |
| **Mapper / Factory**                   | `TaskMapper`, `ProjectMapper`, `ApiError` factory methods                 | one place for entity ↔ DTO and error construction                                    |

Frontend equivalents worth a README line: container/presentational split and custom hooks (`useTasks`, `useMoveTask`).

## 9. DevOps and bonus items

- **Docker Compose:** `postgres` (healthcheck), `backend` (multi-stage Dockerfile, waits for healthy db), `frontend` (Vite build served by nginx, `/api` proxied to backend so no CORS in the container setup). One command: `docker compose up --build`.
- **Swagger:** springdoc with a Bearer security scheme and example payloads.
- **Flyway:** see Section 5.
- **GitHub Actions:** on push and PR: backend job (setup-java 21, Gradle cache, `./gradlew test`), frontend job (Node LTS, `npm ci`, lint, test, build).
- **Activity log:** Section 4.7, shown as a small timeline in the task dialog (Tier 3 on the UI side).
