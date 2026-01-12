# AGENTS.md

## Project Overview

BinCal generates iCal subscriptions for UK council bin collections. React 19 + TypeScript frontend, Cloudflare Workers backend. Supports Tunbridge Wells, Tonbridge & Malling, and Maidstone councils.

## Setup

```bash
bun install
bunx wrangler login        # Required for deploy/dev with KV
bun run dev                 # http://localhost:5173
```

**Use `bun`, not `npm` or `pnpm`.**

## Common Commands

| Task | Command |
|------|---------|
| Dev server | `bun run dev` |
| Build | `bun run build` |
| Type check | `bun run typecheck` |
| Deploy | `bun run deploy` |
| Full pipeline | `bun run ship` |

No test or lint commands exist.

## Code Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Path alias**: `@/*` maps to `src/*`
- **Frontend**: `src/` - React components, pages, API client
- **Backend**: `worker/` - Cloudflare Worker routes, council scrapers, iCal generation
- **Council scrapers**: Implement `CouncilFetcher` interface in `worker/councils/`
- **Types**: Shared types in `worker/types.ts`

### Adding a Council

1. Create `worker/councils/{id}.ts` implementing `CouncilFetcher`
2. Register in `worker/councils/index.ts`
3. Add to `COUNCILS` array in `src/pages/Home.tsx`

## Tests & CI

- **No test framework** configured
- **No CI/CD pipelines** - manual deployment only
- **Type checking** is the only pre-deploy validation (`bun run typecheck`)

## PR & Workflow Rules

- Branch: `main`
- Commit style: Conventional Commits, lowercase, no period
- No PR templates or branch protection configured

## Security & Gotchas

**Never commit:**
- `.env`, `.env.local`, `.env.*.local`
- `.wrangler/` directory
- Cloudflare API tokens

**Known issues:**
- Council scrapers have hardcoded form tokens/IDs that may break when councils update their sites
- CORS is open (`*`) - any origin can call the API
- Postcodes and UPRNs passed as URL query parameters (visible in logs/history)

**Bindings required:**
- `CACHE` - KV namespace for 24-hour bin data cache
- `BROWSER` - Cloudflare Browser Rendering (Maidstone scraper only)
