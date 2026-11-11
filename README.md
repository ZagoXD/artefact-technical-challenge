# Task manager

Build a simple task manager with Next.js 15, React and tRPC. Tasks live in server memory.

## Requirements

- Generated id, required titulo, optional descricao, and dataCriacao timestamp.
- Create, list, update and delete tasks through tRPC.
- Validate titles and return meaningful errors for missing tasks.
- Server-render the initial task list.
- Create/edit forms using functional components and hooks.
- Delete from the list with loading, success and error feedback.
- Bonus: incremental loading on scroll and concise documentation.

## Initial scaffold

This initial revision contains the standard Next.js App Router scaffold and installed tRPC dependencies. Application behavior follows in subsequent commits.

## Development

Requires Node.js 22 or newer and npm. Run npm ci, then npm run dev. Open http://localhost:3000.
