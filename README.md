# Task manager

A small task manager built with Next.js 15, React, TypeScript and tRPC. Create, edit and delete tasks, with server-rendered initial results and incremental loading as you scroll.

## Run locally

Use Node.js 22 or newer and npm. No environment variables or external services are required.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

For production:

```sh
npm run build
npm start
```

## Check the application

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The browser suite starts its own production server on port 3100, so build first and keep that port available. It uses a separate, temporary server process and clears its tasks between tests. To use an installed browser instead of downloading Chromium, set PLAYWRIGHT_CHANNEL to msedge or chrome.

The router tests cover CRUD, validation, missing tasks, timestamps and pagination after deletion. Browser tests cover the complete CRUD flow, SSR with JavaScript disabled, infinite scroll, HTTP errors, recovery from network failures and a mobile viewport.

## Pages

| Route            | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| /                | Server-rendered task list with inline deletion |
| /tasks/new       | Create a task                                  |
| /tasks/[id]/edit | Load and edit an existing task                 |
| /api/trpc/[trpc] | tRPC HTTP endpoint                             |

The first ten tasks are rendered on the server for each request. The browser loads further pages with IntersectionObserver. A Load more button also works when the observer is unavailable. Failed loads stop automatic retries and expose a Try again button.

Forms validate before submission, disable controls while saving, preserve input after failure, and show success feedback on the list. Missing edit targets render the not-found page. Backend errors remain visible in the form or list.

## Data and API

Task fields use English names throughout the application:

| Field       | Type             | Rules                                               |
| ----------- | ---------------- | --------------------------------------------------- |
| id          | string           | Generated UUID                                      |
| title       | string           | Required, trimmed, 1–120 characters                  |
| description | string, optional | Trimmed, at most 2,000 characters                    |
| createdAt   | number           | Unix timestamp in milliseconds; preserved on update |

The tasks router exposes:

| Procedure    | Input                          | Output               |
| ------------ | ------------------------------ | -------------------- |
| tasks.create | title, optional description    | Created task         |
| tasks.list   | Optional cursor and limit      | items and nextCursor |
| tasks.get    | id                             | One task             |
| tasks.update | id, title, optional description | Updated task         |
| tasks.delete | id                             | Deleted id           |

Update replaces the editable fields; omitting description clears it. Invalid input returns BAD_REQUEST, and missing IDs return NOT_FOUND. Client and server share the same Zod field schema.

List defaults to ten tasks, allows up to fifty, and returns null for nextCursor at the end. Tasks appear in creation order, oldest first. An internal increasing sequence serves as the cursor, so deleting earlier tasks does not shift subsequent pages. The sequence is internal and is not part of the task model.

## Design decisions

- App Router server components call the same tRPC router directly for SSR, avoiding an HTTP request back to the application itself. The list and edit routes use force-dynamic.
- Browser interactions use the typed tRPC client over the Fetch adapter. Local React state and hooks are sufficient for this small application; no additional state or query library is needed.
- A Map on globalThis shares task data between route bundles and survives development hot reloads within the same Node.js process.
- CSS and system fonts keep the interface small and avoid build-time font downloads.
- Next.js is pinned to the latest available 15.x patch when this project was created, honoring the explicit major version in the brief. Compatible dependencies are recorded in package-lock.json. PostCSS and the TypeScript linter's minimatch dependency use patched overrides.

## In-memory scope

Tasks are shared by visitors using the same server process. They disappear when that process restarts. Multiple workers or serverless instances have independent data; this exercise should be run as one Node.js process. There is no authentication or database, as neither is part of the challenge.

## Project layout

```text
src/app/          Pages and the tRPC route handler
src/components/  Task form and incremental task list
src/lib/         Shared schema/types and browser client
src/server/      In-memory store and tRPC procedures
tests/           Router behavior and browser tests
```

## References

- [Next.js 15 route configuration](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-segment-config)
- [tRPC client setup](https://trpc.io/docs/client/vanilla/setup)
- [tRPC Fetch adapter](https://trpc.io/docs/server/adapters/fetch)
