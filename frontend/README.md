# TaskFlow — Frontend

React 19 + TypeScript + Vite single-page app for the TaskFlow kanban API.

## Stack

Tailwind CSS v4 · shadcn/ui-style components (Radix primitives) · TanStack Query · React Hook Form + Zod ·
axios · dnd-kit · lucide-react · sonner · react-router-dom · Jest + React Testing Library · Prettier

## Getting started

```bash
cp .env.example .env      # optional; defaults to http://localhost:8080/api/v1
npm install
npm run dev               # http://localhost:5173
```

| Script                            | Purpose                       |
| --------------------------------- | ----------------------------- |
| `npm run dev`                     | Vite dev server               |
| `npm run build`                   | Type-check + production build |
| `npm run lint`                    | oxlint                        |
| `npm run typecheck`               | `tsc -b`                      |
| `npm test` / `npm run test:ci`    | Jest + React Testing Library  |
| `npm run format` / `format:check` | Prettier                      |

Tests use **Jest** (babel-jest, jsdom). `src/lib/config.ts` is swapped for `src/test/config.mock.ts` in Jest because
`import.meta.env` is Vite-only.

## Structure

```
src/
  api/          axios client (auth interceptor, 401 handling, error normalization) + per-resource API modules
  components/   shared UI: AppShell, TaskCard, TaskColumn, SummaryBar, FilterBar, TaskFormDialog, ConfirmDialog, ...
    ui/         shadcn-style primitives
  context/      AuthContext (+ useAuth) and AuthProvider
  lib/          auth-storage, errors, dates, utils, config, task-meta, validation/ (zod schemas)
  modules/
    auth/       LoginPage, RegisterPage, forms, hooks, schemas
    projects/   ProjectsPage, CreateProjectDialog, hooks
    board/      BoardPage, hooks (useTasks, useMoveTask, useSummary, ...)
  routes/       AppRoutes (all routes), ProtectedRoute, PublicOnlyRoute, NotFoundPage
  types/        shared DTO types
  test/         Jest setup + tests
```

## Behavior notes

- **Auth**: JWT in `localStorage`; the session is restored via `GET /users/me` on load (expired tokens are dropped
  client-side). Cross-tab logout/login is synced through the `storage` event. Logout clears the React Query cache.
- **401s** (except login/register) clear the token, show a toast and end the session once; routes then redirect to
  `/login` with the original location in state.
- **Board**: each status column is its own paginated query (`status` filter + "Load more"). Filters (`priority`,
  `assigneeId`, `sort`) live in the URL. Drag & drop (desktop) and the "Move to" menu use an optimistic update with
  rollback. Below `md` the columns become tabs.
- `sort` values use Spring style (`field,direction`, e.g. `dueDate,asc`) — adjust `SORT_OPTIONS` in `lib/task-meta.ts`
  if the backend expects something else.

## Docker

```bash
docker build -t taskflow-frontend .
docker run -p 3000:80 taskflow-frontend
```

nginx serves the SPA and proxies `/api/` to `http://backend:8080` (edit `nginx.conf` for another host). The image is
built with `VITE_API_URL=/api/v1` so the browser calls the same origin.
