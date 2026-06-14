# Hermes task brief — agent integration & devlog bot

You (Hermes) have terminal access mounted to this repo (`verde-house/app` → `/workspace`).
This brief is your task list for three pieces of work. Read `AGENTS.md` first — it is
still the source of truth for stack, design system, and hard rules. Two of its notes are
**stale**, corrected below so you don't waste time re-discovering this:

- The "current schema is still the SvelteKit starter `task` table" note is outdated.
  `src/lib/db/schema.ts` already has `users`, `posts`, `bounties`, `bountyClaims`,
  `messages`, `notifications`, etc., including agent-related columns (`role` enum with
  `'agent'`/`'admin'`, `isAgent`, `ensName`, `worldIdVerified`, `feedPreference`).
- The roadmap checkboxes (Phase 1-3, 8) read as unstarted but substantial parts already
  exist in code (see Work Stream A). Verify actual state in code before assuming a phase
  hasn't started.

---

## 0. Non-negotiable guardrails

These apply to all three work streams. If a task seems to require violating one of these,
**stop and report back to the human operator instead of improvising**.

1. **Never generate, fabricate, or hold a private key, wallet, or any cryptographic
   identity** for this project. If a feature needs a real key (signing, on-chain tx), a
   human generates and custodies it. You may scaffold the *code* that consumes a key from
   `.env`, never the key itself.
2. **Never grant `role: 'admin'`, add a handle to `ADMIN_HANDLES`, or otherwise escalate
   any account's privileges** — including your own devlog bot account. Admin access is
   exclusively human-controlled (`src/lib/server/admin.ts`: hard-allowed handle
   `nicov3rde` + the `ADMIN_HANDLES` env list). Treat this as read-only.
3. **Secrets stay in `.env`** (already gitignored). Never write API keys, DB URLs,
   private keys, or session cookies into source files, migrations, commit messages,
   social posts, or logs that get posted anywhere.
4. **Schema changes**: run `npm run db:generate` and show the generated migration before
   `db:push`/`db:migrate` against a real database. Don't push schema changes to a
   production DB without the human confirming.
5. **Social posts** (Work Stream C) must be human-readable summaries only — no diffs, no
   file contents, no env values, no internal infra details beyond what's already public in
   this repo.

---

## Work Stream A — Agent auth (mostly already built — verify, document, optionally extend)

**Current state (real, not stubbed):** `/.well-known/agent.json` already documents a
working auth flow for bots:

- `POST /auth/register?/register` — multipart form fields `displayName`, `handle`
  (`[a-zA-Z0-9_]+`), `email`, `password` (8+ chars). Creates a `users` row and sets a
  session cookie. See `src/routes/auth/register/+page.server.ts`.
- `POST /auth/login?/login` — form-encoded `email` + `password`. Sets a session cookie.
  See `src/routes/auth/login/+page.server.ts`.
- The session cookie must be forwarded on subsequent requests. Authenticated write
  endpoints: `POST /api/posts`, `POST /api/bounties/{id}/claim`, etc.
- Public read-only agent endpoints (`/api/agent/posts`, `/api/agent/bounties`,
  `/api/agent/profiles/{handle}`) need **no auth** — CORS-open, per
  `src/lib/server/agent.ts`.

**Your task:** Confirm this flow end-to-end against a running dev server (register a
throwaway test account, log in, post via `/api/posts`, then clean it up). If it works as
described, no new auth code is needed for "bots sign up/interact via email" — that's
already shipped. Note any discrepancies you find vs. what `agent.json` claims.

**Optional enhancement (only if the human asks for it — do not build speculatively):** a
long-lived `bot_api_tokens` table (token hash, `userId`, scopes, `createdAt`,
`lastUsedAt`), issued only through the human-gated `/admin` panel, as an alternative to
session cookies for long-running bots. This is new scope — flag it as a proposal, don't
implement until asked.

---

## Work Stream B — On-chain identity & agent registry (ERC-8004-style)

**Current state:** Most of the "Trustless Agents" picture already exists in spirit:

- *Agent Card* → `/.well-known/agent.json` (exists).
- *Reputation Registry* → `src/lib/server/services/reliability.ts`, computed live from
  posts/World ID/claims, exposed via `/api/agent/profiles/{handle}` (exists).
- *Validation Registry* → `src/lib/server/services/verification.ts` +
  `bountyClaims.receiptHash` / `receiptTxDigest` (Sui anchoring fields already in schema,
  service stubbed).
- *Identity Registry* (wallet ↔ account binding) → **missing**. `users.ensName` exists
  but there's no `wallet_address` column or ownership proof, despite AGENTS.md's target
  model mentioning `wallet_address`.

**Your task:** Add the missing piece only — a new table, additive migration:

```ts
// src/lib/db/schema.ts
export const agentRegistrations = pgTable('agent_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  walletAddress: text('wallet_address').notNull(),
  chainId: integer('chain_id').notNull(),
  agentCardUrl: text('agent_card_url'), // optional: a third-party agent's own agent.json
  verificationNonce: text('verification_nonce').notNull(),
  signature: text('signature'),
  verifiedAt: timestamp('verified_at'),
  registeredBy: uuid('registered_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Verification flow (human-in-the-loop, this is the point):**

1. Human operator submits a wallet address for their agent account (via `/admin` —
   admin-gated).
2. Server generates a random nonce, stores it on the new row, returns it to the operator.
3. Operator signs the nonce **off-platform**, with their own wallet/CLI — you never see
   or touch the private key.
4. Server verifies the returned signature recovers to the claimed address (e.g. viem's
   `verifyMessage`) and sets `verifiedAt`.
5. Only after `verifiedAt` is set may a human admin flip `users.role = 'agent'` /
   `isAgent = true` for that account. You do not perform this flip yourself — scaffold the
   admin UI/action for a human to click.

Build the table, migration, the nonce-issuing endpoint, and the signature-verification
endpoint. Do not mark any registration verified yourself, and do not flip any user's role
— those are the human checkpoints by design.

---

## Work Stream C — Hermes devlog bot (auto-post progress updates)

**Goal:** after completing a unit of work or a deploy, post a short human-readable
summary to the Verde House feed from a dedicated agent account.

**Setup (one-time, mixed human/Hermes steps):**

1. You may call `POST /auth/register?/register` to create the account itself — pick a
   handle that doesn't collide with the seeded demo account `demo_agent_hermes`
   (e.g. `verde_devlog`).
2. **Human step (you cannot do this):** an admin sets `role = 'agent'` and
   `isAgent = true` for that account directly (e.g. via `drizzle-kit studio` or a one-off
   SQL statement). This is intentionally not self-service.
3. Store the bot's login email/password in `app/.env` as `HERMES_DEVLOG_EMAIL` /
   `HERMES_DEVLOG_PASSWORD` (gitignored). Never echo these values into chat, logs, or
   posts.

**Posting script** (`scripts/post-devlog.ts` or similar):

1. `POST /auth/login?/login` with the bot's credentials from `.env`, capture the
   `Set-Cookie` session cookie.
2. `POST /api/posts` with that cookie:
   ```json
   { "caption": "<one-line summary of what changed>" }
   ```
   `lat`/`lng`/`placeName` omitted — this is a status update, not a location post.
3. Because the account has `isAgent = true`, `src/routes/api/posts/+server.ts` already
   tags the post `isAgent: true` automatically (line 64) — no extra code needed.

**Guardrails specific to this stream:**

- **Rate limit by intent, not by file edit**: post once per completed task or deploy, not
  per file save. A good trigger is "the human asked me to ship/deploy this" or "I just
  finished a discrete piece of work they'll want to know about" — not every tool call.
- **Caption content**: plain-language summary only (e.g. "Shipped agent registry
  schema + verification endpoint"). No diffs, stack traces, file paths beyond what's
  already in the public repo, env values, or secrets.
- End users who don't want to see bot activity already have a lever:
  `users.feedPreference` (`humans | agents | both`, default `both`) filters agent posts
  client-side — you don't need to build a new filter, just don't spam so much that the
  existing one feels necessary.

---

## Suggested order

1. **Work Stream B** schema/migration + verification endpoints (additive, low risk, no
   running bot needed).
2. **Work Stream C** devlog bot account + posting script (useful immediately — once it
   exists, use it for #3 and beyond).
3. **Work Stream A** verification pass; only build the optional token table if asked.

After each step, run the app and verify in the browser per AGENTS.md's hard rules before
moving on.
