CREATE TABLE "agent_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"agent_card_url" text,
	"verification_nonce" text NOT NULL,
	"signature" text,
	"verified_at" timestamp,
	"registered_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_registrations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "agent_registrations" ADD CONSTRAINT "agent_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_registrations" ADD CONSTRAINT "agent_registrations_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;