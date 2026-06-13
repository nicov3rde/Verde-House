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

## Don't
- Don't make a single-page crypto dashboard.
- Don't put wallet/chain jargon in the main social UI.
- Don't block posting/browsing behind wallet connection.
