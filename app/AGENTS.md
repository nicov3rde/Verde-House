# Verde House — Project Rules

## What we're building
A social network first (Instagram / Facebook style) with a marketplace on the side.
The social experience is the product. Bounties, business tools, and blockchain are
modular layers underneath — never the headline UI.

## Stack
- SvelteKit (full-stack, TypeScript). Server routes for the API, +page/+layout for UI.
- Postgres via Drizzle ORM. (Neon serverless Postgres — connection string in env.)
- Auth: session-based (Lucia). World ID is an *additional* verification layer, not the login itself.
- Styling: Tailwind + CSS variables for theming. Clean custom components.
- Payments: Stripe (test mode).
- Chain layer (modular, behind a clean service interface so it can be stubbed):
  World ID, ENS, Unlink SDK, Arc (USDC settlement) on Ethereum/EVM, Solidity for the escrow contract.

## Data model (target)
The current schema (`app/src/lib/server/db/schema.ts`) is still the SvelteKit starter's `task`
table. As social + marketplace features land, build toward this shape (sketch, not a migration —
adjust as needed):
- `users` — id, handle, email, password_hash (Lucia), wallet_address, world_id_verified,
  ens_name, reputation_score, feed_preference (humans | agents | both)
- `posts` — id, user_id, body, image_urls, location, bounty_id (nullable), verified, created_at
- `bounties` — id, creator_id, title, description, amount_usd, status, arc_contract_address
- `payments` — id, from_user_id, to_user_id, amount_usdc, unlink_tx_hash, arc_tx_hash, created_at

Keep `payments`/`bounties` columns behind the chain service-module interface (see Hard rules) so
the social core works with these tables stubbed out.

## Design system
- Default theme: DARK. Near-black background (#0A0F0D), elevated surfaces (#111815).
- Accent: Verde green (#2BE07A / emerald). Use sparingly for CTAs, active states, verified badges.
- Light theme: warm off-white (#F7F8F6) surfaces, same green accent, dark text.
- Both themes driven by CSS variables; a theme toggle lives in Settings AND a quick toggle in the top bar.
- Typography: clean, slightly bold display font for headings. "Verde" is green, "House" is foreground color.
- Layout: DESKTOP-FIRST and fully responsive. Desktop uses a persistent left sidebar nav:
  Home, Explore, Messages, Marketplace, Notifications, Profile, Settings.
  Collapses to a bottom tab bar on mobile.
- Feel: trustworthy, calm, "verified" — not loud crypto. The blockchain is plumbing, not decoration.

## Hard rules
- Social core must be rock-solid and usable before marketplace/chain work begins.
- The Humans / Agents / Both control is a SETTING (feed preference), never a big top-of-screen toggle. Default = Both.
- Every chain/payment call goes through a service module with a mock/stub fallback.
- Use real components and data flows — no hard-coded fake values in anything you demo.
- After each module, run the app and verify it in the browser before moving on.
- Keep secrets in `.env`; never commit keys. Provide `.env.example`.
- World ID verification gates posting content and claiming bounties once the verification layer
  lands (Phase 3 below) — design flows for this now, stub the check until then.
- Bounty payouts route through Unlink for privacy. Write tests for every escrow/Solidity function
  before it touches the Arc testnet.

## Don't
- Don't make a single-page crypto dashboard.
- Don't put wallet/chain jargon in the main social UI.
- Don't block posting/browsing behind wallet connection.

## MCP servers
See root `CLAUDE.md` for the full list and credential setup. Day-to-day in `app/`:
- **shadcn** — scaffold/reference shadcn components before writing custom ones
- **playwright** — E2E tests for feed, posting, and bounty flows
- **chrome-devtools** — debug network/console/perf issues in the running dev server

## Build roadmap
- [ ] Phase 1: Social core — feed, posting, profiles, auth (Lucia)
- [ ] Phase 2: Marketplace UI — bounty browse/create/claim (UI only, payments stubbed)
- [ ] Phase 3: World ID verification layer
- [ ] Phase 4: Escrow contract (Solidity, Arc testnet) + tests
- [ ] Phase 5: Unlink private payments integration
- [ ] Phase 6: Stripe fiat on-ramp (test mode)
- [ ] Phase 7: AI content/SEO tooling
- [ ] Phase 8: Agent-facing content verification
