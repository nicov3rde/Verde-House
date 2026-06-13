# /superpowers — Full Agent Mode

Activate full autonomous build mode for Verde House:
- Use all configured MCP tools as needed (Playwright for E2E, Chrome DevTools for debugging/network/perf, Shadcn for component references). GitHub, Supabase, Stripe, Vercel, and Magic MCP are not yet configured — see root `CLAUDE.md` for setup steps before relying on them.
- Run the app and verify changes in the browser after every significant change (per `app/AGENTS.md`)
- Run tests after every significant change
- If a build fails, diagnose and fix before reporting back
- Keep a running changelog in PROGRESS.md
- Think 3 steps ahead — flag what the next blockers will be
- Do not commit or push to GitHub automatically — propose the commit and wait for confirmation
