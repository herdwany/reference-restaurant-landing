# Frontend Hosting Options

Phase 9I does not choose a permanent hosting provider. It documents practical options for the React/Vite frontend while Appwrite Cloud remains the backend.

## Option A: Vercel

Vercel is a strong practical starting point for this project.

- Good support for React and Vite.
- Environment variables can be configured from the Vercel dashboard.
- Build command:

```bash
npm run build
```

- Output directory:

```text
dist
```

- Works well with Appwrite Cloud as the backend.
- Fast to set up for staging and production branches.

Recommended initial approach:

```text
Vercel frontend + Appwrite Cloud backend
```

## Option B: Appwrite Sites

Appwrite Sites can be considered if the team wants frontend hosting closer to Appwrite.

- Keeps frontend and backend operations inside the Appwrite ecosystem.
- Requires configuring build command, output directory, and Vite environment variables in Appwrite Sites.
- Useful to evaluate after the first production deployment path is stable.

Expected settings:

```text
Build command: npm run build
Output directory: dist
```

## Current Recommendation

Start with Vercel for the frontend and Appwrite Cloud for backend services. Keep Appwrite Sites as an alternative if operational simplicity inside Appwrite becomes more valuable than Vercel's deployment workflow.

## Domain Note

Both options should serve the current working public URL format first:

```text
/r/:slug
```

Do not enable subdomain or custom domain routing until the resolver, wildcard/DNS setup, SSL behavior, and verification flow are implemented in a later phase.
