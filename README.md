# Elevate — Performance & KPI Management MVP

Elevate is a locally runnable business-logic prototype for managing reporting hierarchies, KPI templates, monthly and quarterly evaluation periods, scored employee evaluations, bonuses, and performance history. It uses JSON files instead of a database and a demo identity switcher instead of production authentication.

## Quick start

Requirements: Node.js 20 or newer and npm 10 or newer.

```bash
npm install
npm run seed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:4000/api](http://localhost:4000/api). The app seeds itself automatically when its data directory is empty, so `npm run seed` is only required when you want to reset the demo.

Useful commands:

```bash
npm run build       # Compile contracts, backend, and frontend
npm test            # Backend unit/integration and frontend component tests
npm run test:e2e    # Playwright end-to-end journey (requires a Playwright browser)
npm run lint        # Strict TypeScript checks
npm run seed        # Reset the local JSON files to the demo dataset
```

If Playwright has no browser installed, run `npx playwright install chromium` once before `npm run test:e2e`.

## Demo workflow

The application opens as **Nadia Hassan**, the root Engineering Director. Use the identity selector at the bottom of the sidebar to switch between managers and employees. Useful seeded identities include:

- Nadia Hassan — root manager and global setup administrator
- Mariam Adel — manager with employees and another manager below her
- Islam Abdallah — employee with Q1–Q3 history and a 95.60% current score
- Youssef Samir — nested manager with his own reports

The intended stakeholder journey is:

1. Create or edit a user from **People**, including the explicit **Is Manager** switch.
2. Inspect the dynamically generated **Organization** tree.
3. Create and activate a 100%-weighted KPI template.
4. Assign it from a user's detail page and optionally override expectations or weights.
5. Create a period and advance it from Draft → Published → Active.
6. Create an evaluation from **Team evaluations**, enter actual values, save, and submit.
7. Switch to the employee and inspect **My performance** and **History**.

## Architecture

```text
frontend/             React, Vite, Tailwind, TanStack Query, Recharts
backend/src/routes    REST route declarations
backend/src/controllers
backend/src/services  hierarchy, access, templates, scoring, lifecycle, audit
backend/src/repositories
backend/data          JSON persistence
packages/contracts    shared TypeScript entities and Zod request schemas
e2e                   Playwright stakeholder journey
```

Untitled UI's open-source React patterns are copied into the frontend as owned components, using its neutral layout, purple brand tokens, Tailwind CSS, accessible controls, cards, badges, tables, dialogs, switches, and empty states.

### JSON persistence

Data lives in:

- `backend/data/users.json`
- `backend/data/kpi-keys.json`
- `backend/data/kpi-templates.json`
- `backend/data/periods.json`
- `backend/data/evaluations.json`
- `backend/data/audit-logs.json`

`FileRepository<T>` uses async filesystem operations, serializes writes inside the process, and replaces files via a temporary file. This is appropriate for a single-process POC, not concurrent production deployment.

To replace JSON storage, implement the same repository operations with a database adapter and inject those repositories into the services. Routes, validation, hierarchy rules, snapshots, scoring, and frontend contracts can remain unchanged.

## API conventions

Protected requests require the demo header:

```http
X-Actor-User-Id: director
```

Success responses use `{ "data": ... }`. Errors use `{ "error": { "code", "message", "details" } }`. The frontend sends the selected identity automatically.

Main resources:

- `GET|POST /api/users`, `GET|PUT /api/users/:id`
- `GET /api/users/:id/children`, `/team`, `/evaluations`, `/performance-history`
- `PUT /api/users/:id/kpi-assignment`
- `GET|POST /api/kpi-keys`, `GET|PUT|DELETE /api/kpi-keys/:key`
- `GET|POST /api/kpi-templates`, `GET|PUT|DELETE /api/kpi-templates/:id`
- `GET|POST /api/periods`, `PUT /api/periods/:id`
- `GET|POST /api/evaluations`, `GET|PUT /api/evaluations/:id`
- `POST /api/evaluations/:id/submit`, `/close`
- `GET /api/dashboard`, `/api/audit-logs`

## Important POC boundaries

- The identity switcher is not authentication and must not be used in production.
- The backend enforces hierarchy authorization despite the demo identity mechanism.
- Q1–Q10 remain immutable system starter keys. Managers can create new globally unique, immutable key codes owned by their actor identity; custom-key visibility and template usage are scoped to the owner’s management hierarchy.
- KPI templates are owned by their creator and visible only to that manager, ancestor managers, and root managers; the API enforces this scope for reads, edits, deletion, assignment, and evaluation creation.
- Active templates and resolved user overrides must total 100%.
- Evaluations contain configuration snapshots and do not change when templates change.
- Submitted evaluations cannot be edited; closed evaluations and closed/archived periods are read-only.
- No database, passwords, sessions, notifications, deployment pipeline, or multi-process write coordination is included.
