# Verde House — Monorepo Guide

Verde House Productions is a full-stack content monetization and distribution system. It turns
long-form video into short-form clips, posts them automatically across social platforms, and runs
a consumer "earn to post" social app — all managed from a central dashboard.

## Components

| Folder | Description | Detailed instructions |
|---|---|---|
| `app/` | Verde House social app (SvelteKit, the "social network + marketplace" product) | [app/AGENTS.md](app/AGENTS.md) |
| `clip-bot/` | AI clip generator — long-form video → TikTok/Reels/Shorts clips | [docs/README.md](docs/README.md) |
| `auto-poster/` | n8n automation — posts finished clips to TikTok, Instagram, YouTube Shorts | [docs/README.md](docs/README.md) |
| `consumer-app/` | Earlier prototype of the earn-to-post app (superseded by `app/`) | [docs/README.md](docs/README.md) |
| `verde-dashboard/` | Operator command center — campaigns, clients, pipelines, analytics | [docs/README.md](docs/README.md) |
| `docs/` | Cross-project documentation | — |

For the social app's stack, design system, and build rules, **`app/AGENTS.md` is the source of
truth** — follow it over any general guidance below when working in `app/`.

## MCP servers

Configured in [.mcp.json](.mcp.json) (project-scoped, work out of the box, no extra credentials):

- **playwright** — browser automation / E2E testing (use for social feed + bounty flow tests)
- **chrome-devtools** — inspect network requests, console, and performance in Chrome
- **shadcn** — shadcn/ui component references and scaffolding

### Pending setup (need credentials)

These were requested but need an API key/token/project ref before they'll work. Once you have the
credential, add the corresponding block to `mcpServers` in `.mcp.json`:

**GitHub** (`@modelcontextprotocol/server-github`) — needs a `GITHUB_PERSONAL_ACCESS_TOKEN`:
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<token>" }
}
```

**Supabase** (`@supabase/mcp-server-supabase`) — needs a project ref and access token. Note: `app/`
uses **Neon** Postgres directly via Drizzle, so this is only useful if another subproject
(e.g. `consumer-app/`, `verde-dashboard/`) ends up on Supabase:
```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<project-ref>"],
  "env": { "SUPABASE_ACCESS_TOKEN": "<token>" }
}
```

**Stripe** (`@stripe/mcp`) — needs `STRIPE_SECRET_KEY` (test mode key, per `app/AGENTS.md`). This
package is a setup CLI — run `npx @stripe/mcp` once the key is in your env and follow its prompts
to generate the config, then copy the resulting entry into `.mcp.json`.

**Magic** (`@21st-dev/magic`) — needs a 21st.dev API key:
```json
"magic": {
  "command": "npx",
  "args": ["-y", "@21st-dev/magic@latest"],
  "env": { "API_KEY": "<21st-dev-api-key>" }
}
```
(Check 21st.dev/magic's current docs for the exact env var name if this doesn't authenticate.)

**Vercel** — `@vercel/mcp-adapter` is an SDK for *building* an MCP endpoint into a Next.js/Vercel
app, not a standalone server to add here. If you want Vercel deploy/env info inside Claude, look
at Vercel's hosted MCP server instead and add it as a remote/SSE server in `.mcp.json`.

## Custom slash commands

Defined in `.claude/commands/`:
- `/uiux` — UI/UX review mode (accessibility, design system, shadcn-first)
- `/stopslop` — anti-slop quality enforcement on code and copy
- `/superpowers` — autonomous build mode (test-after-every-change, no auto-push)
- `/council` — multi-perspective review (Pragmatist, Security, UX, Scalability, PM)
