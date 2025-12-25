CREATE TABLE "whatsapp_qr_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"session_data" jsonb,
	"phone_number" varchar(50),
	"is_active" boolean DEFAULT false NOT NULL,
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "connection_type" text DEFAULT 'meta_api' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_qr_sessions" ADD CONSTRAINT "whatsapp_qr_sessions_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;