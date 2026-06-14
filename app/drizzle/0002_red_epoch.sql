ALTER TABLE "bounty_claims" ADD COLUMN "receipt_hash" text;--> statement-breakpoint
ALTER TABLE "bounty_claims" ADD COLUMN "receipt_tx_digest" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;