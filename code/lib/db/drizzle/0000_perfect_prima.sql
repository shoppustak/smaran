CREATE TABLE "purohits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"latitude" double precision,
	"longitude" double precision,
	"locality_key" text,
	"upi_id" text,
	"calendar_system" text DEFAULT 'purnimanta' NOT NULL,
	"hints_shown" text[],
	"plan" text DEFAULT 'trial' NOT NULL,
	"renews_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"referred_by_purohit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purohits_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "purohits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "yajmans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purohit_id" uuid NOT NULL,
	"family_name" text NOT NULL,
	"gotra" text,
	"whatsapp_number" text,
	"locality_key" text,
	"consent_status" text DEFAULT 'pending' NOT NULL,
	"family_sub_status" text DEFAULT 'none' NOT NULL,
	"family_sub_renews_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yajmans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yajman_id" uuid NOT NULL,
	"purohit_id" uuid,
	"date" timestamp with time zone,
	"time" text,
	"event_type" text NOT NULL,
	"maas" text NOT NULL,
	"paksha" text NOT NULL,
	"tithi" smallint NOT NULL,
	"last_performed_year" smallint,
	"label" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"ingest_job_id" uuid,
	"resolved_date" timestamp with time zone,
	"resolved_window" text,
	"resolved_cycle_year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purohit_id" uuid NOT NULL,
	"yajman_id" uuid NOT NULL,
	"event_id" uuid,
	"amount_collected" numeric(10, 2),
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"purohit_claimed_at" timestamp with time zone,
	"family_confirmed_at" timestamp with time zone,
	"locality_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "onboarding_state" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"current_step" text DEFAULT 'name' NOT NULL,
	"name" text,
	"city" text,
	"latitude" double precision,
	"longitude" double precision,
	"locality_key" text,
	"upi_id" text,
	"calendar_system" text,
	"referred_by_purohit_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ingest_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purohit_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"transcript" text,
	"extraction" jsonb,
	"field_scores" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingest_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lapse_recoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"purohit_id" uuid NOT NULL,
	"yajman_id" uuid NOT NULL,
	"cycle_year" integer NOT NULL,
	"nudged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "lapse_recoveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "processed_webhooks" (
	"message_id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "processed_webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "short_links" (
	"code" varchar(12) PRIMARY KEY NOT NULL,
	"type" varchar(10) NOT NULL,
	"target" text NOT NULL,
	"purohit_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "short_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"yajman_id" uuid NOT NULL,
	"purohit_id" uuid NOT NULL,
	"cycle_year" smallint NOT NULL,
	"performed_on" date,
	"source" text NOT NULL,
	"ledger_id" uuid,
	"attested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occurrences_event_id_cycle_year_unique" UNIQUE("event_id","cycle_year")
);
--> statement-breakpoint
ALTER TABLE "occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"error_log" jsonb,
	CONSTRAINT "outbound_messages_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "outbound_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "family_content_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yajman_id" uuid NOT NULL,
	"content_date" date NOT NULL,
	"content_type" text NOT NULL,
	"message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_content_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purohits" ADD CONSTRAINT "purohits_referred_by_purohit_id_purohits_id_fk" FOREIGN KEY ("referred_by_purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yajmans" ADD CONSTRAINT "yajmans_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_yajman_id_yajmans_id_fk" FOREIGN KEY ("yajman_id") REFERENCES "public"."yajmans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_yajman_id_yajmans_id_fk" FOREIGN KEY ("yajman_id") REFERENCES "public"."yajmans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_referred_by_purohit_id_purohits_id_fk" FOREIGN KEY ("referred_by_purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lapse_recoveries" ADD CONSTRAINT "lapse_recoveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lapse_recoveries" ADD CONSTRAINT "lapse_recoveries_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lapse_recoveries" ADD CONSTRAINT "lapse_recoveries_yajman_id_yajmans_id_fk" FOREIGN KEY ("yajman_id") REFERENCES "public"."yajmans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_yajman_id_yajmans_id_fk" FOREIGN KEY ("yajman_id") REFERENCES "public"."yajmans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_purohit_id_purohits_id_fk" FOREIGN KEY ("purohit_id") REFERENCES "public"."purohits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_ledger_id_ledger_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledger"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_content_log" ADD CONSTRAINT "family_content_log_yajman_id_yajmans_id_fk" FOREIGN KEY ("yajman_id") REFERENCES "public"."yajmans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lapse_recoveries_event_year_idx" ON "lapse_recoveries" USING btree ("event_id","cycle_year");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_daily_content_idx" ON "family_content_log" USING btree ("yajman_id","content_date","content_type");