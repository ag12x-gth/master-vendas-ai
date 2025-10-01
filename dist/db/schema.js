"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationsRelations = exports.aiAgentExecutions = exports.aiUsageDaily = exports.aiChatMessages = exports.aiChats = exports.crmSyncLogs = exports.crmMappings = exports.crmAccounts = exports.crmIntegrations = exports.smsDeliveryLogs = exports.smsDeliveryReports = exports.whatsappDeliveryReports = exports.campaigns = exports.smsGateways = exports.templates = exports.mediaAssets = exports.kanbanLeads = exports.kanbanBoards = exports.messages = exports.conversations = exports.aiPersonas = exports.aiCredentials = exports.automationLogs = exports.automationRules = exports.contactsToContactLists = exports.contactsToTags = exports.contacts = exports.contactLists = exports.tags = exports.webhookLogs = exports.webhooks = exports.apiKeys = exports.whatsappQrSessions = exports.connections = exports.emailVerificationTokens = exports.passwordResetTokens = exports.users = exports.companies = exports.userRoleEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['admin', 'atendente', 'superadmin']);
// ==============================
// TABELAS PRINCIPAIS
// ==============================
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull().unique(),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    website: (0, pg_core_1.text)('website'),
    addressStreet: (0, pg_core_1.text)('address_street'),
    addressCity: (0, pg_core_1.text)('address_city'),
    addressState: (0, pg_core_1.text)('address_state'),
    addressZipCode: (0, pg_core_1.text)('address_zip_code'),
    country: (0, pg_core_1.text)('country'),
    webhookSlug: (0, pg_core_1.text)('webhook_slug').unique().default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    mksmsApiToken: (0, pg_core_1.text)('mksms_api_token'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    password: (0, pg_core_1.text)('password').notNull(),
    firebaseUid: (0, pg_core_1.varchar)('firebase_uid', { length: 255 }).notNull().unique(),
    role: (0, exports.userRoleEnum)('role').notNull(),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }),
    emailVerified: (0, pg_core_1.timestamp)("email_verified", { mode: "date" }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.passwordResetTokens = (0, pg_core_1.pgTable)('password_reset_tokens', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.text)('user_id').notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.emailVerificationTokens = (0, pg_core_1.pgTable)("email_verification_tokens", {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    userId: (0, pg_core_1.text)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    tokenHash: (0, pg_core_1.text)("token_hash").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true }).notNull()
});
exports.connections = (0, pg_core_1.pgTable)('connections', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }),
    config_name: (0, pg_core_1.text)('config_name').notNull(),
    wabaId: (0, pg_core_1.text)('waba_id').notNull(),
    phoneNumberId: (0, pg_core_1.text)('phone_number_id').notNull(),
    appId: (0, pg_core_1.text)('app_id'),
    accessToken: (0, pg_core_1.text)('access_token').notNull(),
    webhookSecret: (0, pg_core_1.text)('webhook_secret').notNull(),
    appSecret: (0, pg_core_1.text)('app_secret').notNull().default(''),
    connectionType: (0, pg_core_1.text)('connection_type').default('meta_api').notNull(), // 'meta_api' or 'whatsapp_qr'
    isActive: (0, pg_core_1.boolean)('is_active').default(false).notNull(),
    assignedPersonaId: (0, pg_core_1.text)('assigned_persona_id').references(function () { return exports.aiPersonas.id; }, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.whatsappQrSessions = (0, pg_core_1.pgTable)('whatsapp_qr_sessions', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    connectionId: (0, pg_core_1.text)('connection_id').notNull().references(function () { return exports.connections.id; }, { onDelete: 'cascade' }),
    sessionData: (0, pg_core_1.jsonb)('session_data'),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 50 }),
    isActive: (0, pg_core_1.boolean)('is_active').default(false).notNull(),
    lastConnectedAt: (0, pg_core_1.timestamp)('last_connected_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.apiKeys = (0, pg_core_1.pgTable)('api_keys', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    key: (0, pg_core_1.text)('key').notNull().unique(),
    name: (0, pg_core_1.text)('name').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.webhooks = (0, pg_core_1.pgTable)('webhooks', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    eventTriggers: (0, pg_core_1.text)('event_triggers').array().notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
exports.webhookLogs = (0, pg_core_1.pgTable)('webhook_logs', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    color: (0, pg_core_1.text)('color').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, function (table) { return ({
    nameCompanyUnique: (0, pg_core_1.unique)('tags_name_company_id_unique').on(table.name, table.companyId),
}); });
exports.contactLists = (0, pg_core_1.pgTable)('contact_lists', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, function (table) { return ({
    nameCompanyUnique: (0, pg_core_1.unique)('contact_lists_name_company_id_unique').on(table.name, table.companyId),
}); });
exports.contacts = (0, pg_core_1.pgTable)('contacts', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    whatsappName: (0, pg_core_1.text)('whatsapp_name'),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    avatarUrl: (0, pg_core_1.text)('avatar_url'),
    status: (0, pg_core_1.text)('status').default('ACTIVE').notNull(),
    notes: (0, pg_core_1.text)('notes'),
    profileLastSyncedAt: (0, pg_core_1.timestamp)('profile_last_synced_at'),
    addressStreet: (0, pg_core_1.text)('address_street'),
    addressNumber: (0, pg_core_1.text)('address_number'),
    addressComplement: (0, pg_core_1.text)('address_complement'),
    addressDistrict: (0, pg_core_1.text)('address_district'),
    addressCity: (0, pg_core_1.text)('address_city'),
    addressState: (0, pg_core_1.text)('address_state'),
    addressZipCode: (0, pg_core_1.text)('address_zip_code'),
    externalId: (0, pg_core_1.text)('external_id'),
    externalProvider: (0, pg_core_1.text)('external_provider'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at'),
}, function (table) { return ({
    phoneCompanyUnique: (0, pg_core_1.unique)('contacts_phone_company_id_unique').on(table.phone, table.companyId),
    externalIdProviderUnique: (0, pg_core_1.unique)('contacts_external_id_provider_unique').on(table.externalId, table.externalProvider),
}); });
exports.contactsToTags = (0, pg_core_1.pgTable)('contacts_to_tags', {
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    tagId: (0, pg_core_1.text)('tag_id').notNull().references(function () { return exports.tags.id; }, { onDelete: 'cascade' }),
}, function (t) { return ({
    pk: (0, pg_core_1.primaryKey)({ columns: [t.contactId, t.tagId] }),
}); });
exports.contactsToContactLists = (0, pg_core_1.pgTable)('contacts_to_contact_lists', {
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    listId: (0, pg_core_1.text)('list_id').notNull().references(function () { return exports.contactLists.id; }, { onDelete: 'cascade' }),
}, function (t) { return ({
    pk: (0, pg_core_1.primaryKey)({ columns: [t.contactId, t.listId] }),
}); });
// ==============================
// AUTOMATIONS & AI
// ==============================
exports.automationRules = (0, pg_core_1.pgTable)('automation_rules', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    triggerEvent: (0, pg_core_1.text)('trigger_event').notNull(),
    conditions: (0, pg_core_1.jsonb)('conditions').$type().notNull(),
    actions: (0, pg_core_1.jsonb)('actions').$type().notNull(),
    connectionIds: (0, pg_core_1.text)('connection_ids').array(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.automationLogs = (0, pg_core_1.pgTable)('automation_logs', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    ruleId: (0, pg_core_1.text)('rule_id').references(function () { return exports.automationRules.id; }, { onDelete: 'set null' }),
    conversationId: (0, pg_core_1.text)('conversation_id').references(function () { return exports.conversations.id; }, { onDelete: 'cascade' }),
    level: (0, pg_core_1.text)('level').notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    details: (0, pg_core_1.jsonb)('details'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.aiCredentials = (0, pg_core_1.pgTable)('ai_credentials', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    provider: (0, pg_core_1.text)('provider').notNull(), // e.g., 'GEMINI', 'OPENAI'
    apiKey: (0, pg_core_1.text)('api_key').notNull(), // This will be encrypted
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.aiPersonas = (0, pg_core_1.pgTable)('ai_personas', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    systemPrompt: (0, pg_core_1.text)('system_prompt'),
    provider: (0, pg_core_1.text)('provider').notNull(), // 'GEMINI' or 'OPENAI'
    model: (0, pg_core_1.text)('model').notNull(), // e.g., 'gemini-1.5-pro-latest'
    credentialId: (0, pg_core_1.text)('credential_id').references(function () { return exports.aiCredentials.id; }, { onDelete: 'set null' }),
    temperature: (0, pg_core_1.decimal)('temperature', { precision: 3, scale: 2 }).default('0.7').notNull(),
    topP: (0, pg_core_1.decimal)('top_p', { precision: 3, scale: 2 }).default('0.9').notNull(),
    maxOutputTokens: (0, pg_core_1.integer)('max_output_tokens').default(2048),
    mcpServerUrl: (0, pg_core_1.text)('mcp_server_url'),
    mcpServerHeaders: (0, pg_core_1.jsonb)('mcp_server_headers').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
// ==============================
// CONVERSATIONS & MESSAGES
// ==============================
exports.conversations = (0, pg_core_1.pgTable)('conversations', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    connectionId: (0, pg_core_1.text)('connection_id').references(function () { return exports.connections.id; }, { onDelete: 'set null' }),
    status: (0, pg_core_1.text)('status').default('NEW').notNull(),
    assignedTo: (0, pg_core_1.text)('assigned_to').references(function () { return exports.users.id; }, { onDelete: 'set null' }),
    lastMessageAt: (0, pg_core_1.timestamp)('last_message_at').defaultNow().notNull(),
    aiActive: (0, pg_core_1.boolean)('ai_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    archivedAt: (0, pg_core_1.timestamp)('archived_at'),
    archivedBy: (0, pg_core_1.text)('archived_by').references(function () { return exports.users.id; }, { onDelete: 'set null' }),
});
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    conversationId: (0, pg_core_1.text)('conversation_id').notNull().references(function () { return exports.conversations.id; }, { onDelete: 'cascade' }),
    providerMessageId: (0, pg_core_1.text)('provider_message_id').unique(),
    repliedToMessageId: (0, pg_core_1.text)('replied_to_message_id'),
    senderType: (0, pg_core_1.text)('sender_type').notNull(),
    senderId: (0, pg_core_1.text)('sender_id'),
    content: (0, pg_core_1.text)('content').notNull(),
    contentType: (0, pg_core_1.text)('content_type').default('TEXT').notNull(),
    mediaUrl: (0, pg_core_1.text)('media_url'),
    status: (0, pg_core_1.text)('status'),
    sentAt: (0, pg_core_1.timestamp)('sent_at').defaultNow().notNull(),
    readAt: (0, pg_core_1.timestamp)('read_at'),
});
// ==============================
// KANBAN / CRM
// ==============================
exports.kanbanBoards = (0, pg_core_1.pgTable)('kanban_boards', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').references(function () { return exports.companies.id; }).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    stages: (0, pg_core_1.jsonb)('stages').$type().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.kanbanLeads = (0, pg_core_1.pgTable)('kanban_leads', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    boardId: (0, pg_core_1.text)('board_id').notNull().references(function () { return exports.kanbanBoards.id; }, { onDelete: 'cascade' }),
    stageId: (0, pg_core_1.text)('stage_id').notNull(),
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    title: (0, pg_core_1.text)('title'),
    notes: (0, pg_core_1.text)('notes'),
    value: (0, pg_core_1.decimal)('value', { precision: 10, scale: 2 }).default('0').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    externalId: (0, pg_core_1.text)('external_id'),
    externalProvider: (0, pg_core_1.text)('external_provider'),
}, function (table) { return ({
    externalIdProviderUnique: (0, pg_core_1.unique)('kanban_leads_external_id_provider_unique').on(table.externalId, table.externalProvider),
}); });
// ==============================
// CAMPANHAS, MODELOS & SMS
// ==============================
exports.mediaAssets = (0, pg_core_1.pgTable)('media_assets', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    fileSize: (0, pg_core_1.integer)('file_size').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type'),
    s3Url: (0, pg_core_1.text)('s3_url').notNull(),
    s3Key: (0, pg_core_1.text)('s3_key').notNull(),
    metaHandles: (0, pg_core_1.jsonb)('meta_handles').$type().default((0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["'[]'::jsonb"], ["'[]'::jsonb"])))),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.templates = (0, pg_core_1.pgTable)('templates', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    wabaId: (0, pg_core_1.text)('waba_id').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    category: (0, pg_core_1.text)('category').notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    headerType: (0, pg_core_1.text)('header_type').default('NONE'),
    language: (0, pg_core_1.text)('language').notNull(),
    status: (0, pg_core_1.text)('status').notNull(),
    metaId: (0, pg_core_1.text)('meta_id').unique(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.smsGateways = (0, pg_core_1.pgTable)('sms_gateways', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.text)('provider').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    credentials: (0, pg_core_1.jsonb)('credentials').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.campaigns = (0, pg_core_1.pgTable)('campaigns', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    channel: (0, pg_core_1.text)('channel').notNull().default('WHATSAPP'),
    status: (0, pg_core_1.text)('status').notNull(),
    scheduledAt: (0, pg_core_1.timestamp)('scheduled_at'),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    connectionId: (0, pg_core_1.text)('connection_id').references(function () { return exports.connections.id; }),
    templateId: (0, pg_core_1.text)('template_id').references(function () { return exports.templates.id; }, { onDelete: 'set null' }),
    variableMappings: (0, pg_core_1.jsonb)('variable_mappings'),
    mediaAssetId: (0, pg_core_1.text)('media_asset_id').references(function () { return exports.mediaAssets.id; }, { onDelete: 'set null' }),
    smsGatewayId: (0, pg_core_1.text)('sms_gateway_id').references(function () { return exports.smsGateways.id; }),
    smsProviderMailingId: (0, pg_core_1.text)('sms_provider_mailing_id'),
    message: (0, pg_core_1.text)('message'),
    contactListIds: (0, pg_core_1.text)('contact_list_ids').array(),
    batchSize: (0, pg_core_1.integer)('batch_size'),
    batchDelaySeconds: (0, pg_core_1.integer)('batch_delay_seconds'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.whatsappDeliveryReports = (0, pg_core_1.pgTable)('whatsapp_delivery_reports', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    campaignId: (0, pg_core_1.text)('campaign_id').notNull().references(function () { return exports.campaigns.id; }, { onDelete: 'cascade' }),
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    connectionId: (0, pg_core_1.text)('connection_id').notNull().references(function () { return exports.connections.id; }, { onDelete: 'set null' }),
    providerMessageId: (0, pg_core_1.text)('provider_message_id'),
    status: (0, pg_core_1.text)('status').notNull(),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    sentAt: (0, pg_core_1.timestamp)('sent_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.smsDeliveryReports = (0, pg_core_1.pgTable)('sms_delivery_reports', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    campaignId: (0, pg_core_1.text)('campaign_id').notNull().references(function () { return exports.campaigns.id; }, { onDelete: 'cascade' }),
    contactId: (0, pg_core_1.text)('contact_id').notNull().references(function () { return exports.contacts.id; }, { onDelete: 'cascade' }),
    smsGatewayId: (0, pg_core_1.text)('sms_gateway_id').notNull().references(function () { return exports.smsGateways.id; }),
    providerMessageId: (0, pg_core_1.text)('provider_message_id'),
    status: (0, pg_core_1.text)('status').notNull(),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    sentAt: (0, pg_core_1.timestamp)('sent_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.smsDeliveryLogs = (0, pg_core_1.pgTable)('sms_delivery_logs', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    campaignId: (0, pg_core_1.varchar)('campaign_id').notNull(),
    contactId: (0, pg_core_1.varchar)('contact_id').notNull(),
    smsGatewayId: (0, pg_core_1.varchar)('sms_gateway_id').notNull(),
    status: (0, pg_core_1.varchar)('status').notNull(),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// ==============================
// CRM INTEGRATIONS
// ==============================
exports.crmIntegrations = (0, pg_core_1.pgTable)('crm_integrations', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.text)('provider').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('disconnected'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.crmAccounts = (0, pg_core_1.pgTable)('crm_accounts', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    integrationId: (0, pg_core_1.text)('integration_id').notNull().references(function () { return exports.crmIntegrations.id; }, { onDelete: 'cascade' }),
    domain: (0, pg_core_1.text)('domain').notNull(),
    authType: (0, pg_core_1.text)('auth_type').notNull(),
    accessToken: (0, pg_core_1.text)('access_token').notNull(),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
});
exports.crmMappings = (0, pg_core_1.pgTable)('crm_mappings', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    integrationId: (0, pg_core_1.text)('integration_id').notNull().references(function () { return exports.crmIntegrations.id; }, { onDelete: 'cascade' }),
    boardId: (0, pg_core_1.text)('board_id').notNull().references(function () { return exports.kanbanBoards.id; }, { onDelete: 'cascade' }),
    pipelineId: (0, pg_core_1.text)('pipeline_id').notNull(),
    stageMap: (0, pg_core_1.jsonb)('stage_map').notNull(),
}, function (table) { return ({
    boardIdUnique: (0, pg_core_1.unique)('crm_mappings_board_id_unique').on(table.boardId),
}); });
exports.crmSyncLogs = (0, pg_core_1.pgTable)('crm_sync_logs', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    integrationId: (0, pg_core_1.text)('integration_id').notNull().references(function () { return exports.crmIntegrations.id; }, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    payload: (0, pg_core_1.jsonb)('payload'),
    status: (0, pg_core_1.text)('status').notNull(),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// AI Chat Tables
exports.aiChats = (0, pg_core_1.pgTable)('ai_chats', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.text)('user_id').references(function () { return exports.users.id; }, { onDelete: 'set null' }),
    title: (0, pg_core_1.text)('title'),
    personaId: (0, pg_core_1.text)('persona_id').references(function () { return exports.aiPersonas.id; }, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
});
exports.aiChatMessages = (0, pg_core_1.pgTable)('ai_chat_messages', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    chatId: (0, pg_core_1.text)('chat_id').notNull().references(function () { return exports.aiChats.id; }, { onDelete: 'cascade' }),
    role: (0, pg_core_1.text)('role').notNull(), // 'user' | 'assistant' | 'system'
    content: (0, pg_core_1.text)('content').notNull(),
    tokensIn: (0, pg_core_1.integer)('tokens_in').default(0),
    tokensOut: (0, pg_core_1.integer)('tokens_out').default(0),
    cost: (0, pg_core_1.decimal)('cost', { precision: 10, scale: 6 }).default('0'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.aiUsageDaily = (0, pg_core_1.pgTable)('ai_usage_daily', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    date: (0, pg_core_1.date)('date').notNull(),
    provider: (0, pg_core_1.text)('provider').notNull(),
    model: (0, pg_core_1.text)('model').notNull(),
    tokensIn: (0, pg_core_1.integer)('tokens_in').default(0).notNull(),
    tokensOut: (0, pg_core_1.integer)('tokens_out').default(0).notNull(),
    cost: (0, pg_core_1.decimal)('cost', { precision: 10, scale: 6 }).default('0').notNull(),
    requestCount: (0, pg_core_1.integer)('request_count').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull().$onUpdate(function () { return new Date(); }),
}, function (table) { return ({
    companyDateProviderModelUnique: (0, pg_core_1.unique)('ai_usage_daily_company_date_provider_model_unique').on(table.companyId, table.date, table.provider, table.model),
}); });
exports.aiAgentExecutions = (0, pg_core_1.pgTable)('ai_agent_executions', {
    id: (0, pg_core_1.text)('id').primaryKey().default((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    companyId: (0, pg_core_1.text)('company_id').notNull().references(function () { return exports.companies.id; }, { onDelete: 'cascade' }),
    agentName: (0, pg_core_1.text)('agent_name'),
    toolName: (0, pg_core_1.text)('tool_name'),
    request: (0, pg_core_1.text)('request'),
    response: (0, pg_core_1.text)('response'),
    status: (0, pg_core_1.text)('status').notNull().default('completed'),
    executionTime: (0, pg_core_1.integer)('execution_time'), // in milliseconds
    tokensUsed: (0, pg_core_1.integer)('tokens_used').default(0),
    cost: (0, pg_core_1.decimal)('cost', { precision: 10, scale: 6 }).default('0'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// ===================================
// RELAÇÕES (DRIZZLE ORM)
// ===================================
exports.conversationsRelations = (0, drizzle_orm_1.relations)(exports.conversations, function (_a) {
    var one = _a.one;
    return ({
        contact: one(exports.contacts, {
            fields: [exports.conversations.contactId],
            references: [exports.contacts.id],
        }),
        connection: one(exports.connections, {
            fields: [exports.conversations.connectionId],
            references: [exports.connections.id]
        })
    });
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37;
