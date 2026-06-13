# Verde House — Social App

The Verde House social app: a feed + marketplace where users post verified visits and businesses
fund location-based bounties. SvelteKit + Drizzle ORM + Neon Postgres, with Stripe handling bounty
escrow/payouts.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (Neon Postgres connection string) and
   `AUTH_SECRET` at minimum. Everything else (Stripe, World ID, ENS, Unlink, Arc) is optional —
   those services run in **stub mode** when their keys are unset, so the app works end-to-end
   without any third-party accounts.

3. Apply the database schema:

   ```sh
   npm run db:migrate
   ```

   After changing `src/lib/db/schema.ts`, generate a new migration with `npm run db:generate`,
   review the SQL it produces, then run `npm run db:migrate` again.

4. Start the dev server:

   ```sh
   npm run dev
   ```

## Stripe (bounty escrow & payouts)

The Marketplace tab lets businesses deploy bounty campaigns and escrow the total payout
(`payout per claim × claim cap`) via Stripe. To test this with real Stripe test-mode flows:

1. Get test-mode keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and
   set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `.env`.
2. Forward webhooks to your dev server with the
   [Stripe CLI](https://stripe.com/docs/stripe-cli):

   ```sh
   stripe listen --forward-to localhost:5173/api/webhooks/stripe
   ```

   Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET`.
3. Deploy a bounty — you'll be prompted for a test card (`4242 4242 4242 4242`, any future
   expiry/CVC). On `payment_intent.succeeded`, the webhook marks the bounty `open` and records the
   escrow deposit.

Without these keys, escrow is **simulated**: bounties are marked `open` and funded immediately on
creation, and payouts on verified claims are recorded as stub transactions (`stub_pi_...` /
`stub_tx_...`). The app behaves identically either way — only the payment rails differ.

## Reliability & Expertise Scores

Every profile shows a **Reliability Score** (0–100) and four **category expertise** scores
(Pizza, Coffee, Nightlife, Local Trust), computed live from real data in `src/lib/server/services/reliability.ts` —
nothing here is hardcoded or simulated.

**Reliability Score** is the sum of:

| Signal | Points |
|---|---|
| World ID verified | +25 |
| Account age | +1 per 7 days, capped at +20 (~140 days for the max) |
| Verified-visit posts | +5 each, capped at +30 |
| Paid bounty claims | +10 each, capped at +25 |

**Category expertise** (Pizza / Coffee / Nightlife) scans a user's posts for keyword matches in
`placeName`/`caption` (e.g. "pizza"/"pizzeria"/"slice" for Pizza, "coffee"/"cafe"/"espresso" for
Coffee, "bar"/"club"/"lounge" for Nightlife). Each matching post contributes +20 if it's a
verified visit or +5 if not, plus up to +20 total from that category's engagement (likes +
comments + saves). Capped at 100.

**Local Trust** is the percentage of a user's posts that are verified visits.

## Agent Verification

When a bounty creator reviews a pending claim, `src/lib/server/services/verification.ts` runs an
agent check on the fulfillment post and shows the creator a verdict before they verify/reject:

- **Geo/time match** — reuses the geo-fence check already performed when the post was created
  (`posts.verifiedVisit`, computed in `api/posts` from the poster's shared location vs. the
  bounty's `lat`/`lng`/`radiusMiles`/`active`/`expiresAt`). `null` if the poster shared no location.
- **Originality** — a real DB query for the post's `imageUrl`/`videoUrl` appearing on any other
  post (possible repost/reused media).
- **External engagement** — clearly **stubbed**: off-platform reach/social-share metrics aren't
  connected, and this check never affects the verdict.

The combined `verified: boolean | null` verdict and a human-readable `notes` string are stored on
the claim (`bounty_claims.agent_verified` / `agent_notes`) when the creator verifies or rejects.
This is advisory only — the business/admin always makes the final call.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.1 create --template minimal --types ts --add tailwindcss="plugins:none" drizzle="database:postgresql+postgresql:neon" --no-install app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
