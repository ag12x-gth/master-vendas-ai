CREATE TYPE "public"."alert_channel" AS ENUM('console', 'database', 'webhook', 'in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'acknowledged', 'resolved', 'suppressed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('high_memory_usage', 'cache_failure', 'database_pool_exhausted', 'rate_limit_breach', 'queue_failure', 'auth_failures_spike', 'response_time_degradation', 'custom');--> statement-breakpoint
CREATE TYPE "public"."cadence_enrollment_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cadence_event_type" AS ENUM('enrolled', 'step_sent', 'replied', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."error_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."error_source" AS ENUM('frontend', 'backend', 'database', 'api', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."error_status" AS ENUM('new', 'investigating', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped', 'retried');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('daily_report', 'weekly_report', 'biweekly_report', 'monthly_report', 'biannual_report', 'new_meeting', 'new_sale', 'campaign_sent');--> statement-breakpoint
CREATE TYPE "public"."user_notification_type" AS ENUM('campaign_completed', 'new_conversation', 'system_error', 'info');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_type" AS ENUM('conversation_created', 'conversation_updated', 'message_received', 'message_sent', 'lead_created', 'lead_stage_changed', 'sale_closed', 'meeting_scheduled', 'campaign_sent', 'campaign_completed');--> statement-breakpoint
CREATE TABLE "alert_notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" text NOT NULL,
	"rule_id" text,
	"channel" "alert_channel" NOT NULL,
	"recipient" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp,
	"failure_reason" text,
	"response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"name" varchar(255) NOT NULL,
	"description" text,
	"alert_type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"metric" varchar(255) NOT NULL,
	"condition" varchar(50) NOT NULL,
	"threshold" numeric(10, 2) NOT NULL,
	"window_seconds" integer DEFAULT 300 NOT NULL,
	"aggregation" varchar(50) DEFAULT 'avg',
	"channels" "alert_channel"[] NOT NULL,
	"webhook_urls" text[],
	"cooldown_seconds" integer DEFAULT 3600 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_rules_name_company_unique" UNIQUE("name","company_id")
);
--> statement-breakpoint
CREATE TABLE "alert_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"memory_threshold" numeric(5, 2) DEFAULT '90.00',
	"response_time_p95_threshold" integer DEFAULT 1000,
	"rate_limit_429_threshold" integer DEFAULT 100,
	"auth_failure_threshold" integer DEFAULT 10,
	"queue_failure_threshold" integer DEFAULT 5,
	"db_pool_threshold" numeric(5, 2) DEFAULT '90.00',
	"alert_retention_days" integer DEFAULT 30,
	"enabled_channels" "alert_channel"[] DEFAULT '{database,console}'::alert_channel[],
	"default_webhook_url" text,
	"email_recipients" text[],
	"suppression_rules" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_settings_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"alert_type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metric" varchar(255),
	"threshold" numeric(10, 2),
	"current_value" numeric(10, 2),
	"context" jsonb,
	"fingerprint" varchar(255) NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"first_occurred_at" timestamp DEFAULT now() NOT NULL,
	"last_occurred_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baileys_auth_state" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" text NOT NULL,
	"creds" jsonb,
	"keys" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cadence_definitions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"funnel_id" text,
	"stage_id" text,
	"trigger_after_days" integer DEFAULT 21 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cadence_enrollments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence_id" text NOT NULL,
	"lead_id" text,
	"contact_id" text NOT NULL,
	"conversation_id" text,
	"status" "cadence_enrollment_status" DEFAULT 'active' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_reason" text,
	CONSTRAINT "cadence_enrollments_lead_active_unique" UNIQUE("lead_id","cadence_id")
);
--> statement-breakpoint
CREATE TABLE "cadence_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" text NOT NULL,
	"step_id" text,
	"event_type" "cadence_event_type" NOT NULL,
	"message_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cadence_steps" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"offset_days" integer DEFAULT 0 NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"template_id" text,
	"message_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cadence_steps_cadence_order_unique" UNIQUE("cadence_id","step_order")
);
--> statement-breakpoint
CREATE TABLE "custom_message_templates" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"category_id" text,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"variables" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_predefined" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_template_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_stage_personas" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" text NOT NULL,
	"stage_id" text,
	"active_persona_id" text,
	"passive_persona_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kanban_stage_personas_board_stage_unique" UNIQUE("board_id","stage_id")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"reactor_phone" text NOT NULL,
	"reactor_name" text,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_reactor_phone_unique" UNIQUE("message_id","reactor_phone")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(512) NOT NULL,
	"display_name" varchar(255),
	"meta_template_id" varchar(255),
	"waba_id" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"language" varchar(10) DEFAULT 'pt_BR' NOT NULL,
	"parameter_format" varchar(20) DEFAULT 'POSITIONAL',
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"rejected_reason" text,
	"components" jsonb NOT NULL,
	"message_send_ttl_seconds" integer,
	"company_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"sent_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true,
	"allow_category_change" boolean DEFAULT true,
	CONSTRAINT "message_templates_name_waba_unique" UNIQUE("name","waba_id")
);
--> statement-breakpoint
CREATE TABLE "notification_agent_groups" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"group_jid" varchar(255) NOT NULL,
	"group_name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_agent_groups_unique" UNIQUE("agent_id","group_jid")
);
--> statement-breakpoint
CREATE TABLE "notification_agents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"enabled_notifications" jsonb DEFAULT '{"dailyReport":false,"weeklyReport":false,"biweeklyReport":false,"monthlyReport":false,"biannualReport":false,"newMeeting":false,"newSale":false,"campaignSent":false}'::jsonb NOT NULL,
	"schedule_time" varchar(5) DEFAULT '09:00',
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo',
	"last_sent_at" jsonb,
	"rate_limit_window" integer DEFAULT 60,
	"rate_limit_count" integer DEFAULT 10,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_agents_company_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"group_jid" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(50),
	"failure_reason" text,
	"trace_id" text DEFAULT gen_random_uuid(),
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_prompt_sections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" text NOT NULL,
	"section_name" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'all' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_errors" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"user_id" text,
	"source" "error_source" NOT NULL,
	"severity" "error_severity" DEFAULT 'medium' NOT NULL,
	"status" "error_status" DEFAULT 'new' NOT NULL,
	"error_type" varchar(255),
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"ai_diagnosis" text,
	"ai_recommendation" text,
	"ai_analyzed_at" timestamp,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"last_occurred_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" text NOT NULL,
	"type" "user_notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link_to" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vapi_calls" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"contact_id" text,
	"conversation_id" text,
	"vapi_call_id" text NOT NULL,
	"vapi_assistant_id" text,
	"customer_number" text NOT NULL,
	"customer_name" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"summary" text,
	"analysis" jsonb,
	"resolved" boolean,
	"next_steps" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vapi_calls_vapi_call_id_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
CREATE TABLE "vapi_transcripts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" "webhook_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"next_retry_at" timestamp,
	"response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" "webhook_event_type"[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "waba_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "phone_number_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "access_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "webhook_secret" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ALTER COLUMN "app_secret" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "firebase_uid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_delivery_reports" ALTER COLUMN "connection_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD COLUMN "use_rag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD COLUMN "first_response_min_delay" integer DEFAULT 33 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD COLUMN "first_response_max_delay" integer DEFAULT 68 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD COLUMN "followup_response_min_delay" integer DEFAULT 81 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_personas" ADD COLUMN "followup_response_max_delay" integer DEFAULT 210 NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "connection_type" text DEFAULT 'meta_api' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "last_connected" timestamp;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_group" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "assigned_persona_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "contact_type" text DEFAULT 'PASSIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "kanban_boards" ADD COLUMN "funnel_type" text DEFAULT 'GENERAL';--> statement-breakpoint
ALTER TABLE "kanban_boards" ADD COLUMN "objective" text;--> statement-breakpoint
ALTER TABLE "kanban_leads" ADD COLUMN "current_stage" jsonb;--> statement-breakpoint
ALTER TABLE "kanban_leads" ADD COLUMN "last_stage_change_at" timestamp;--> statement-breakpoint
ALTER TABLE "kanban_leads" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_access_token" text;--> statement-breakpoint
ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_notifications" ADD CONSTRAINT "alert_notifications_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baileys_auth_state" ADD CONSTRAINT "baileys_auth_state_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_definitions" ADD CONSTRAINT "cadence_definitions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_definitions" ADD CONSTRAINT "cadence_definitions_funnel_id_kanban_boards_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."kanban_boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_enrollments" ADD CONSTRAINT "cadence_enrollments_cadence_id_cadence_definitions_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."cadence_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_enrollments" ADD CONSTRAINT "cadence_enrollments_lead_id_kanban_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."kanban_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_enrollments" ADD CONSTRAINT "cadence_enrollments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_enrollments" ADD CONSTRAINT "cadence_enrollments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_events" ADD CONSTRAINT "cadence_events_enrollment_id_cadence_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."cadence_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_events" ADD CONSTRAINT "cadence_events_step_id_cadence_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."cadence_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_events" ADD CONSTRAINT "cadence_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_cadence_id_cadence_definitions_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."cadence_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_message_templates" ADD CONSTRAINT "custom_message_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_message_templates" ADD CONSTRAINT "custom_message_templates_category_id_custom_template_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."custom_template_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_template_categories" ADD CONSTRAINT "custom_template_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_stage_personas" ADD CONSTRAINT "kanban_stage_personas_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_stage_personas" ADD CONSTRAINT "kanban_stage_personas_active_persona_id_ai_personas_id_fk" FOREIGN KEY ("active_persona_id") REFERENCES "public"."ai_personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_stage_personas" ADD CONSTRAINT "kanban_stage_personas_passive_persona_id_ai_personas_id_fk" FOREIGN KEY ("passive_persona_id") REFERENCES "public"."ai_personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_agent_groups" ADD CONSTRAINT "notification_agent_groups_agent_id_notification_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."notification_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_agents" ADD CONSTRAINT "notification_agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_agents" ADD CONSTRAINT "notification_agents_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_agent_id_notification_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."notification_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_prompt_sections" ADD CONSTRAINT "persona_prompt_sections_persona_id_ai_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."ai_personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_errors" ADD CONSTRAINT "system_errors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_errors" ADD CONSTRAINT "system_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_errors" ADD CONSTRAINT "system_errors_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_calls" ADD CONSTRAINT "vapi_calls_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_calls" ADD CONSTRAINT "vapi_calls_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_calls" ADD CONSTRAINT "vapi_calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vapi_transcripts" ADD CONSTRAINT "vapi_transcripts_call_id_vapi_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."vapi_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_persona_id_ai_personas_id_fk" FOREIGN KEY ("assigned_persona_id") REFERENCES "public"."ai_personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id");