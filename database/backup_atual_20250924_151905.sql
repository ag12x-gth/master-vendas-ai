--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (63f4182)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'atendente',
    'superadmin'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: neondb_owner
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: neondb_owner
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: neondb_owner
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: ai_agent_executions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_agent_executions (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    agent_name text,
    tool_name text,
    request text,
    response text,
    status text DEFAULT 'completed'::text NOT NULL,
    execution_time integer,
    tokens_used integer DEFAULT 0,
    cost numeric(10,6) DEFAULT '0'::numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_agent_executions OWNER TO neondb_owner;

--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_chat_messages (
    id text DEFAULT gen_random_uuid() NOT NULL,
    chat_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tokens_in integer DEFAULT 0,
    tokens_out integer DEFAULT 0,
    cost numeric(10,6) DEFAULT '0'::numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_chat_messages OWNER TO neondb_owner;

--
-- Name: ai_chats; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_chats (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    user_id text,
    title text,
    persona_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_chats OWNER TO neondb_owner;

--
-- Name: ai_credentials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_credentials (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    api_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_credentials OWNER TO neondb_owner;

--
-- Name: ai_personas; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_personas (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    system_prompt text,
    provider text NOT NULL,
    model text NOT NULL,
    credential_id text,
    temperature numeric(3,2) DEFAULT 0.7 NOT NULL,
    top_p numeric(3,2) DEFAULT 0.9 NOT NULL,
    max_output_tokens integer DEFAULT 2048,
    mcp_server_url text,
    mcp_server_headers jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_personas OWNER TO neondb_owner;

--
-- Name: ai_usage_daily; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_usage_daily (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    date date NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    tokens_in integer DEFAULT 0 NOT NULL,
    tokens_out integer DEFAULT 0 NOT NULL,
    cost numeric(10,6) DEFAULT '0'::numeric NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_usage_daily OWNER TO neondb_owner;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.api_keys (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.api_keys OWNER TO neondb_owner;

--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.automation_logs (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    rule_id text,
    conversation_id text,
    level text NOT NULL,
    message text NOT NULL,
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.automation_logs OWNER TO neondb_owner;

--
-- Name: automation_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.automation_rules (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    trigger_event text NOT NULL,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    connection_ids text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.automation_rules OWNER TO neondb_owner;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaigns (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    channel text DEFAULT 'WHATSAPP'::text NOT NULL,
    status text NOT NULL,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    completed_at timestamp without time zone,
    connection_id text,
    template_id text,
    variable_mappings jsonb,
    media_asset_id text,
    sms_gateway_id text,
    sms_provider_mailing_id text,
    message text,
    contact_list_ids text[],
    batch_size integer,
    batch_delay_seconds integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaigns OWNER TO neondb_owner;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.companies (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    avatar_url text,
    website text,
    address_street text,
    address_city text,
    address_state text,
    address_zip_code text,
    country text,
    webhook_slug text DEFAULT gen_random_uuid(),
    mksms_api_token text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- Name: connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.connections (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    config_name text NOT NULL,
    waba_id text NOT NULL,
    phone_number_id text NOT NULL,
    app_id text,
    access_token text NOT NULL,
    webhook_secret text NOT NULL,
    app_secret text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    assigned_persona_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.connections OWNER TO neondb_owner;

--
-- Name: contact_lists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contact_lists (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contact_lists OWNER TO neondb_owner;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    whatsapp_name text,
    phone character varying(50) NOT NULL,
    email character varying(255),
    avatar_url text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    notes text,
    profile_last_synced_at timestamp without time zone,
    address_street text,
    address_number text,
    address_complement text,
    address_district text,
    address_city text,
    address_state text,
    address_zip_code text,
    external_id text,
    external_provider text,
    created_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


ALTER TABLE public.contacts OWNER TO neondb_owner;

--
-- Name: contacts_to_contact_lists; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts_to_contact_lists (
    contact_id text NOT NULL,
    list_id text NOT NULL
);


ALTER TABLE public.contacts_to_contact_lists OWNER TO neondb_owner;

--
-- Name: contacts_to_tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts_to_tags (
    contact_id text NOT NULL,
    tag_id text NOT NULL
);


ALTER TABLE public.contacts_to_tags OWNER TO neondb_owner;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.conversations (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    contact_id text NOT NULL,
    connection_id text,
    status text DEFAULT 'NEW'::text NOT NULL,
    assigned_to text,
    last_message_at timestamp without time zone DEFAULT now() NOT NULL,
    ai_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    archived_at timestamp without time zone,
    archived_by text
);


ALTER TABLE public.conversations OWNER TO neondb_owner;

--
-- Name: crm_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crm_accounts (
    id text DEFAULT gen_random_uuid() NOT NULL,
    integration_id text NOT NULL,
    domain text NOT NULL,
    auth_type text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp without time zone
);


ALTER TABLE public.crm_accounts OWNER TO neondb_owner;

--
-- Name: crm_integrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crm_integrations (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    provider text NOT NULL,
    status text DEFAULT 'disconnected'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.crm_integrations OWNER TO neondb_owner;

--
-- Name: crm_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crm_mappings (
    id text DEFAULT gen_random_uuid() NOT NULL,
    integration_id text NOT NULL,
    board_id text NOT NULL,
    pipeline_id text NOT NULL,
    stage_map jsonb NOT NULL
);


ALTER TABLE public.crm_mappings OWNER TO neondb_owner;

--
-- Name: crm_sync_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crm_sync_logs (
    id text DEFAULT gen_random_uuid() NOT NULL,
    integration_id text NOT NULL,
    type text NOT NULL,
    payload jsonb,
    status text NOT NULL,
    error text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.crm_sync_logs OWNER TO neondb_owner;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_verification_tokens (
    id text DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.email_verification_tokens OWNER TO neondb_owner;

--
-- Name: kanban_boards; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.kanban_boards (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    stages jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kanban_boards OWNER TO neondb_owner;

--
-- Name: kanban_leads; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.kanban_leads (
    id text DEFAULT gen_random_uuid() NOT NULL,
    board_id text NOT NULL,
    stage_id text NOT NULL,
    contact_id text NOT NULL,
    title text,
    notes text,
    value numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    external_id text,
    external_provider text
);


ALTER TABLE public.kanban_leads OWNER TO neondb_owner;

--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.media_assets (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    file_size integer NOT NULL,
    mime_type text,
    s3_url text NOT NULL,
    s3_key text NOT NULL,
    meta_handles jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.media_assets OWNER TO neondb_owner;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id text DEFAULT gen_random_uuid() NOT NULL,
    conversation_id text NOT NULL,
    provider_message_id text,
    replied_to_message_id text,
    sender_type text NOT NULL,
    sender_id text,
    content text NOT NULL,
    content_type text DEFAULT 'TEXT'::text NOT NULL,
    media_url text,
    status text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.password_reset_tokens (
    id text DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO neondb_owner;

--
-- Name: sms_delivery_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sms_delivery_logs (
    id text DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying NOT NULL,
    contact_id character varying NOT NULL,
    sms_gateway_id character varying NOT NULL,
    status character varying NOT NULL,
    failure_reason text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sms_delivery_logs OWNER TO neondb_owner;

--
-- Name: sms_delivery_reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sms_delivery_reports (
    id text DEFAULT gen_random_uuid() NOT NULL,
    campaign_id text NOT NULL,
    contact_id text NOT NULL,
    sms_gateway_id text NOT NULL,
    provider_message_id text,
    status text NOT NULL,
    failure_reason text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sms_delivery_reports OWNER TO neondb_owner;

--
-- Name: sms_gateways; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sms_gateways (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    provider text NOT NULL,
    name text NOT NULL,
    credentials jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sms_gateways OWNER TO neondb_owner;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tags (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tags OWNER TO neondb_owner;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.templates (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    waba_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    body text NOT NULL,
    header_type text DEFAULT 'NONE'::text,
    language text NOT NULL,
    status text NOT NULL,
    meta_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.templates OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    avatar_url text,
    password text NOT NULL,
    firebase_uid character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    company_id text,
    email_verified timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.webhook_logs (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhook_logs OWNER TO neondb_owner;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.webhooks (
    id text DEFAULT gen_random_uuid() NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    event_triggers text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.webhooks OWNER TO neondb_owner;

--
-- Name: whatsapp_delivery_reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.whatsapp_delivery_reports (
    id text DEFAULT gen_random_uuid() NOT NULL,
    campaign_id text NOT NULL,
    contact_id text NOT NULL,
    connection_id text NOT NULL,
    provider_message_id text,
    status text NOT NULL,
    failure_reason text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.whatsapp_delivery_reports OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: neondb_owner
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
25	ef524162a9c232a683aa8da461e61f7cb5661ea7788002964ba088f3ad2f8080	1758725568040
\.


--
-- Data for Name: ai_agent_executions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_agent_executions (id, company_id, agent_name, tool_name, request, response, status, execution_time, tokens_used, cost, created_at) FROM stdin;
\.


--
-- Data for Name: ai_chat_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_chat_messages (id, chat_id, role, content, tokens_in, tokens_out, cost, created_at) FROM stdin;
\.


--
-- Data for Name: ai_chats; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_chats (id, company_id, user_id, title, persona_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_credentials; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_credentials (id, company_id, name, provider, api_key, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_personas; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_personas (id, company_id, name, system_prompt, provider, model, credential_id, temperature, top_p, max_output_tokens, mcp_server_url, mcp_server_headers, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_usage_daily; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_usage_daily (id, company_id, date, provider, model, tokens_in, tokens_out, cost, request_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_keys (id, company_id, key, name, created_at) FROM stdin;
\.


--
-- Data for Name: automation_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.automation_logs (id, company_id, rule_id, conversation_id, level, message, details, created_at) FROM stdin;
\.


--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.automation_rules (id, company_id, name, trigger_event, conditions, actions, connection_ids, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaigns (id, company_id, name, channel, status, scheduled_at, sent_at, completed_at, connection_id, template_id, variable_mappings, media_asset_id, sms_gateway_id, sms_provider_mailing_id, message, contact_list_ids, batch_size, batch_delay_seconds, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.companies (id, name, avatar_url, website, address_street, address_city, address_state, address_zip_code, country, webhook_slug, mksms_api_token, created_at, updated_at) FROM stdin;
17f9f17c-efee-4033-aca7-b31bc4e3793b	João Silva's Company	\N	\N	\N	\N	\N	\N	\N	f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7	\N	2025-09-24 15:05:09.111238	2025-09-24 15:05:09.111238
\.


--
-- Data for Name: connections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.connections (id, company_id, config_name, waba_id, phone_number_id, app_id, access_token, webhook_secret, app_secret, is_active, assigned_persona_id, created_at) FROM stdin;
\.


--
-- Data for Name: contact_lists; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contact_lists (id, company_id, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contacts (id, company_id, name, whatsapp_name, phone, email, avatar_url, status, notes, profile_last_synced_at, address_street, address_number, address_complement, address_district, address_city, address_state, address_zip_code, external_id, external_provider, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: contacts_to_contact_lists; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contacts_to_contact_lists (contact_id, list_id) FROM stdin;
\.


--
-- Data for Name: contacts_to_tags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contacts_to_tags (contact_id, tag_id) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.conversations (id, company_id, contact_id, connection_id, status, assigned_to, last_message_at, ai_active, created_at, updated_at, archived_at, archived_by) FROM stdin;
\.


--
-- Data for Name: crm_accounts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.crm_accounts (id, integration_id, domain, auth_type, access_token, refresh_token, expires_at) FROM stdin;
\.


--
-- Data for Name: crm_integrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.crm_integrations (id, company_id, provider, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: crm_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.crm_mappings (id, integration_id, board_id, pipeline_id, stage_map) FROM stdin;
\.


--
-- Data for Name: crm_sync_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.crm_sync_logs (id, integration_id, type, payload, status, error, created_at) FROM stdin;
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_verification_tokens (id, user_id, token_hash, expires_at) FROM stdin;
53ff9908-210e-4504-8c6f-c1156d538030	9fb27f15-e2fd-4bd3-b877-f6803acfbf6c	d25e816947f2510f538394ea6625a212df3d4da9b1ce9fd1752f525a0fd40f13	2025-09-25 15:05:09.384+00
\.


--
-- Data for Name: kanban_boards; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.kanban_boards (id, company_id, name, stages, created_at) FROM stdin;
\.


--
-- Data for Name: kanban_leads; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.kanban_leads (id, board_id, stage_id, contact_id, title, notes, value, created_at, external_id, external_provider) FROM stdin;
\.


--
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.media_assets (id, company_id, name, type, file_size, mime_type, s3_url, s3_key, meta_handles, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.messages (id, conversation_id, provider_message_id, replied_to_message_id, sender_type, sender_id, content, content_type, media_url, status, sent_at, read_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: sms_delivery_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_delivery_logs (id, campaign_id, contact_id, sms_gateway_id, status, failure_reason, created_at) FROM stdin;
\.


--
-- Data for Name: sms_delivery_reports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_delivery_reports (id, campaign_id, contact_id, sms_gateway_id, provider_message_id, status, failure_reason, sent_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sms_gateways; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sms_gateways (id, company_id, provider, name, credentials, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tags (id, company_id, name, color, created_at) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.templates (id, company_id, waba_id, name, category, body, header_type, language, status, meta_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, name, email, avatar_url, password, firebase_uid, role, company_id, email_verified, created_at) FROM stdin;
9fb27f15-e2fd-4bd3-b877-f6803acfbf6c	João Silva	joao.silva@teste.com	\N	$2a$10$uOzsS/Gcq6oFIo.CDM9rCONYirSRXz.a6cvsO0ItVVAB9MFvqNpX2	native_4410c4cc-18ed-41e2-a003-f70e8f83a898	admin	17f9f17c-efee-4033-aca7-b31bc4e3793b	2025-09-24 15:05:39.644707	2025-09-24 15:05:09.111238
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.webhook_logs (id, company_id, payload, created_at) FROM stdin;
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.webhooks (id, company_id, name, url, event_triggers, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: whatsapp_delivery_reports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.whatsapp_delivery_reports (id, campaign_id, contact_id, connection_id, provider_message_id, status, failure_reason, sent_at, updated_at) FROM stdin;
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: neondb_owner
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 25, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_executions ai_agent_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_agent_executions
    ADD CONSTRAINT ai_agent_executions_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_chats ai_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chats
    ADD CONSTRAINT ai_chats_pkey PRIMARY KEY (id);


--
-- Name: ai_credentials ai_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_credentials
    ADD CONSTRAINT ai_credentials_pkey PRIMARY KEY (id);


--
-- Name: ai_personas ai_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_personas
    ADD CONSTRAINT ai_personas_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_daily ai_usage_daily_company_date_provider_model_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_company_date_provider_model_unique UNIQUE (company_id, date, provider, model);


--
-- Name: ai_usage_daily ai_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_unique UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_rules automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: companies companies_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_unique UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_webhook_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_webhook_slug_unique UNIQUE (webhook_slug);


--
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- Name: contact_lists contact_lists_name_company_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_lists
    ADD CONSTRAINT contact_lists_name_company_id_unique UNIQUE (name, company_id);


--
-- Name: contact_lists contact_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_lists
    ADD CONSTRAINT contact_lists_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_external_id_provider_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_external_id_provider_unique UNIQUE (external_id, external_provider);


--
-- Name: contacts contacts_phone_company_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_phone_company_id_unique UNIQUE (phone, company_id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: contacts_to_contact_lists contacts_to_contact_lists_contact_id_list_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_contact_lists
    ADD CONSTRAINT contacts_to_contact_lists_contact_id_list_id_pk PRIMARY KEY (contact_id, list_id);


--
-- Name: contacts_to_tags contacts_to_tags_contact_id_tag_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_tags
    ADD CONSTRAINT contacts_to_tags_contact_id_tag_id_pk PRIMARY KEY (contact_id, tag_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: crm_accounts crm_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT crm_accounts_pkey PRIMARY KEY (id);


--
-- Name: crm_integrations crm_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_integrations
    ADD CONSTRAINT crm_integrations_pkey PRIMARY KEY (id);


--
-- Name: crm_mappings crm_mappings_board_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_mappings
    ADD CONSTRAINT crm_mappings_board_id_unique UNIQUE (board_id);


--
-- Name: crm_mappings crm_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_mappings
    ADD CONSTRAINT crm_mappings_pkey PRIMARY KEY (id);


--
-- Name: crm_sync_logs crm_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_sync_logs
    ADD CONSTRAINT crm_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_unique UNIQUE (token_hash);


--
-- Name: kanban_boards kanban_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_pkey PRIMARY KEY (id);


--
-- Name: kanban_leads kanban_leads_external_id_provider_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_leads
    ADD CONSTRAINT kanban_leads_external_id_provider_unique UNIQUE (external_id, external_provider);


--
-- Name: kanban_leads kanban_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_leads
    ADD CONSTRAINT kanban_leads_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_provider_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_provider_message_id_unique UNIQUE (provider_message_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_unique UNIQUE (token_hash);


--
-- Name: sms_delivery_logs sms_delivery_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_delivery_logs
    ADD CONSTRAINT sms_delivery_logs_pkey PRIMARY KEY (id);


--
-- Name: sms_delivery_reports sms_delivery_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_delivery_reports
    ADD CONSTRAINT sms_delivery_reports_pkey PRIMARY KEY (id);


--
-- Name: sms_gateways sms_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_gateways
    ADD CONSTRAINT sms_gateways_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_company_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_company_id_unique UNIQUE (name, company_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: templates templates_meta_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_meta_id_unique UNIQUE (meta_id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_firebase_uid_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_unique UNIQUE (firebase_uid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_delivery_reports whatsapp_delivery_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_delivery_reports
    ADD CONSTRAINT whatsapp_delivery_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_executions ai_agent_executions_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_agent_executions
    ADD CONSTRAINT ai_agent_executions_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_chat_id_ai_chats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_chat_id_ai_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.ai_chats(id) ON DELETE CASCADE;


--
-- Name: ai_chats ai_chats_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chats
    ADD CONSTRAINT ai_chats_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ai_chats ai_chats_persona_id_ai_personas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chats
    ADD CONSTRAINT ai_chats_persona_id_ai_personas_id_fk FOREIGN KEY (persona_id) REFERENCES public.ai_personas(id) ON DELETE SET NULL;


--
-- Name: ai_chats ai_chats_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_chats
    ADD CONSTRAINT ai_chats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_credentials ai_credentials_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_credentials
    ADD CONSTRAINT ai_credentials_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ai_personas ai_personas_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_personas
    ADD CONSTRAINT ai_personas_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: ai_personas ai_personas_credential_id_ai_credentials_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_personas
    ADD CONSTRAINT ai_personas_credential_id_ai_credentials_id_fk FOREIGN KEY (credential_id) REFERENCES public.ai_credentials(id) ON DELETE SET NULL;


--
-- Name: ai_usage_daily ai_usage_daily_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_usage_daily
    ADD CONSTRAINT ai_usage_daily_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: automation_logs automation_logs_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: automation_logs automation_logs_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: automation_logs automation_logs_rule_id_automation_rules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_rule_id_automation_rules_id_fk FOREIGN KEY (rule_id) REFERENCES public.automation_rules(id) ON DELETE SET NULL;


--
-- Name: automation_rules automation_rules_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_connection_id_connections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_connection_id_connections_id_fk FOREIGN KEY (connection_id) REFERENCES public.connections(id);


--
-- Name: campaigns campaigns_media_asset_id_media_assets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_media_asset_id_media_assets_id_fk FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_sms_gateway_id_sms_gateways_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_sms_gateway_id_sms_gateways_id_fk FOREIGN KEY (sms_gateway_id) REFERENCES public.sms_gateways(id);


--
-- Name: campaigns campaigns_template_id_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_template_id_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;


--
-- Name: connections connections_assigned_persona_id_ai_personas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_assigned_persona_id_ai_personas_id_fk FOREIGN KEY (assigned_persona_id) REFERENCES public.ai_personas(id) ON DELETE SET NULL;


--
-- Name: connections connections_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: contact_lists contact_lists_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_lists
    ADD CONSTRAINT contact_lists_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: contacts contacts_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: contacts_to_contact_lists contacts_to_contact_lists_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_contact_lists
    ADD CONSTRAINT contacts_to_contact_lists_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: contacts_to_contact_lists contacts_to_contact_lists_list_id_contact_lists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_contact_lists
    ADD CONSTRAINT contacts_to_contact_lists_list_id_contact_lists_id_fk FOREIGN KEY (list_id) REFERENCES public.contact_lists(id) ON DELETE CASCADE;


--
-- Name: contacts_to_tags contacts_to_tags_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_tags
    ADD CONSTRAINT contacts_to_tags_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: contacts_to_tags contacts_to_tags_tag_id_tags_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts_to_tags
    ADD CONSTRAINT contacts_to_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_archived_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_archived_by_users_id_fk FOREIGN KEY (archived_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_connection_id_connections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_connection_id_connections_id_fk FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: crm_accounts crm_accounts_integration_id_crm_integrations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT crm_accounts_integration_id_crm_integrations_id_fk FOREIGN KEY (integration_id) REFERENCES public.crm_integrations(id) ON DELETE CASCADE;


--
-- Name: crm_integrations crm_integrations_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_integrations
    ADD CONSTRAINT crm_integrations_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: crm_mappings crm_mappings_board_id_kanban_boards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_mappings
    ADD CONSTRAINT crm_mappings_board_id_kanban_boards_id_fk FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: crm_mappings crm_mappings_integration_id_crm_integrations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_mappings
    ADD CONSTRAINT crm_mappings_integration_id_crm_integrations_id_fk FOREIGN KEY (integration_id) REFERENCES public.crm_integrations(id) ON DELETE CASCADE;


--
-- Name: crm_sync_logs crm_sync_logs_integration_id_crm_integrations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crm_sync_logs
    ADD CONSTRAINT crm_sync_logs_integration_id_crm_integrations_id_fk FOREIGN KEY (integration_id) REFERENCES public.crm_integrations(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: kanban_boards kanban_boards_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: kanban_leads kanban_leads_board_id_kanban_boards_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_leads
    ADD CONSTRAINT kanban_leads_board_id_kanban_boards_id_fk FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: kanban_leads kanban_leads_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kanban_leads
    ADD CONSTRAINT kanban_leads_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: media_assets media_assets_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sms_delivery_reports sms_delivery_reports_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_delivery_reports
    ADD CONSTRAINT sms_delivery_reports_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: sms_delivery_reports sms_delivery_reports_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_delivery_reports
    ADD CONSTRAINT sms_delivery_reports_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: sms_delivery_reports sms_delivery_reports_sms_gateway_id_sms_gateways_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_delivery_reports
    ADD CONSTRAINT sms_delivery_reports_sms_gateway_id_sms_gateways_id_fk FOREIGN KEY (sms_gateway_id) REFERENCES public.sms_gateways(id);


--
-- Name: sms_gateways sms_gateways_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sms_gateways
    ADD CONSTRAINT sms_gateways_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tags tags_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: templates templates_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: users users_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: webhook_logs webhook_logs_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: webhooks webhooks_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: whatsapp_delivery_reports whatsapp_delivery_reports_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_delivery_reports
    ADD CONSTRAINT whatsapp_delivery_reports_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: whatsapp_delivery_reports whatsapp_delivery_reports_connection_id_connections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_delivery_reports
    ADD CONSTRAINT whatsapp_delivery_reports_connection_id_connections_id_fk FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE SET NULL;


--
-- Name: whatsapp_delivery_reports whatsapp_delivery_reports_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_delivery_reports
    ADD CONSTRAINT whatsapp_delivery_reports_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

