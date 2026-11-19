# TaskFlow

Small team task tracker: **Spring Boot 3 + Kotlin** API and **React + TypeScript** UI.

## Stack

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Backend      | Spring Boot 3.3, Kotlin, Gradle (Kotlin DSL), Java 21       |
| Persistence  | PostgreSQL, Spring Data JPA, Flyway (`ddl-auto=validate`)   |
| Auth         | Spring Security, stateless JWT (HS256), BCrypt              |
| API docs     | springdoc-openapi (Swagger UI when enabled)                 |
| Frontend     | React, TypeScript, Vite, Tailwind, shadcn-style Radix UI    |
| Server state | TanStack Query                                              |
| Forms        | React Hook Form + Zod                                       |
| DnD          | dnd-kit                                                     |
| HTTP         | axios (`/api/v1`)                                           |
| Quality      | Husky + lint-staged + Prettier; Jest + RTL; JUnit 5 + MockK |
| DevOps       | Docker Compose, GitHub Actions CI                           |

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- App UI: http://localhost:3000
- API: http://localhost:8080/api/v1
- Swagger: http://localhost:8080/swagger-ui.html

**Demo login:** `demo@taskflow.com` / `Demo1234`

### Docker with live reload

Production Compose builds static images. For real-time updates while coding, use the **dev overlay + Compose Watch** (Vite HMR + Gradle continuous `bootRun`):

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --watch
# or: npm run dev:docker
```

- UI: http://localhost:3000 (edits under `frontend/` hot-reload in the browser)
- API: http://localhost:8080 (edits under `backend/src` recompile and restart the app)
- `--watch` syncs host files into the containers (reliable on Docker Desktop / Windows)
- First backend start can take a few minutes while Gradle resolves dependencies

Stop with `Ctrl+C`. Use plain `docker compose up --build` when you want the production-like nginx + JAR stack.

## Local development

### Prerequisites

- JDK 21, Node.js 22+, Docker (for Postgres)

### Database

```bash
docker compose up postgres -d
```

### Backend

```bash
cd backend
# PowerShell
$env:JWT_SECRET="change-me-to-a-long-random-secret-at-least-32-chars"
$env:SPRING_PROFILES_ACTIVE="dev"
$env:SEED_DEMO_DATA="true"
$env:SWAGGER_ENABLED="true"
./gradlew bootRun
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:8080/api/v1
npm install
npm run dev
```

### Monorepo tooling (Husky + Prettier)

From the repo root:

```bash
npm install          # installs husky, prettier, lint-staged; sets up git hooks
npm run format       # format markdown / yaml / frontend sources
```

Pre-commit runs `lint-staged` (Prettier on staged frontend and root config files).

## API versioning

All REST endpoints live under **`/api/v1`** (e.g. `POST /api/v1/auth/login`, `GET /api/v1/projects`).

Supporting endpoints (documented as assumptions):

- `GET /api/v1/users/me` — restore session after refresh
- `GET /api/v1/users` — assignee picker (id + name)
- `GET /api/v1/projects/{id}` — board header / not-found
- `GET /api/v1/tasks/{id}/activity` — status-change activity log

## Frontend layout

```
frontend/src/
  api/                 axios client + resource APIs
  components/          TaskCard, TaskColumn, SummaryBar, FilterBar, AppShell, …
  components/ui/       shadcn-style primitives
  context/             AuthContext, AuthProvider
  modules/             auth/, projects/, board/
  routes/              AppRoutes, ProtectedRoute, PublicOnlyRoute
  lib/                 storage, errors, validation, utils
  types/               DTOs aligned with the API
```

- **AuthContext / AuthProvider** — JWT in `localStorage`, session restore via `/users/me`, cross-tab logout, React Query cache cleared on logout.
- **AppRoutes** — single place for every route (`/login`, `/register`, `/projects`, `/projects/:id`, 404).

## Architecture

```
Browser (React SPA)
  AppRoutes → modules → TanStack Query hooks → axios (/api/v1) + Bearer JWT
                                                   │
Spring Boot (Kotlin)
  JwtAuthFilter → Controller (DTOs) → Service → Repository → PostgreSQL
  GlobalExceptionHandler → consistent ApiError JSON
```

**Layer rules:** controllers never touch repositories; services never return entities; mappers convert entity ↔ DTO.

### Design patterns (named for the brief)

| Pattern          | Where                              | Why                                                      |
| ---------------- | ---------------------------------- | -------------------------------------------------------- |
| Repository       | Spring Data repositories           | Isolates persistence; easy MockK doubles                 |
| Strategy         | `task/sort/*` (`TaskSortStrategy`) | Whitelisted sort keys; priority uses semantic CASE ranks |
| Specification    | `task/spec/TaskSpecifications`     | Composable AND filters without if-chains                 |
| Mapper / Factory | `*Mapper`, `ApiError.of`           | One place for DTO mapping and error shape                |

Frontend: container/presentational split and hooks (`useTasks`, `useMoveTask`).

### State management choice

**TanStack Query** for server state (projects, tasks, summary, users): caching, dedupe, retries, optimistic moves. **AuthContext** for the session only — Redux would add boilerplate without benefit here.

## Tests

```bash
# Backend
cd backend && ./gradlew test

# Frontend
cd frontend && npm run test:ci
```

Backend: AuthService / ProjectService / TaskService / JwtService unit tests + MockMvc integration flow.  
Frontend: TaskCard (overdue), TaskFormDialog validation, ProtectedRoute, date helpers.

## CI (GitHub Actions)

`.github/workflows/ci.yml` on push/PR:

1. **Backend** — JDK 21, Gradle cache, `./gradlew test`
2. **Frontend** — Node 22, `npm ci`, format check, lint, typecheck, tests, build
3. **Root Prettier** — monorepo format check

## Security notes

- Ownership lookups return **404** (not 403) for other users’ resources.
- Passwords: 8–72 bytes, at least one letter and one number; BCrypt.
- `JWT_SECRET` must be ≥ 32 bytes or the app refuses to start.
- JWT in `localStorage` matches the brief; XSS risk is documented — keep CSP / sanitisation in mind for production.

## Assumptions & trade-offs

- API path uses **`/api/v1`** for clear versioning (assignment listed `/api/...`).
- Filters/sort live in the board URL query string for shareable views.
- Summary counts are **project-wide**, not affected by board filters.
- Concurrent edit + drag: last write wins (`updatedAt` available for locking later).
- Drag order within a column follows the active API sort (no manual rank field).

## Environment variables

See `.env.example`. Important keys: `DB_*`, `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`, `CORS_ALLOWED_ORIGINS`, `SEED_DEMO_DATA`, `SWAGGER_ENABLED`, `VITE_API_URL`.
