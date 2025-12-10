/**
 * Types for incoming webhook events from external platforms
 * Supports Grapfy, custom integrations, and other platforms
 */

export type IncomingEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.qualified'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'message.received'
  | 'form.submitted'
  | 'conversion.completed'
  | 'custom';

export interface IncomingWebhookPayload {
  event_type: IncomingEventType;
  timestamp: number;
  data: Record<string, any>;
  metadata?: {
    source?: string;
    campaignId?: string;
    userId?: string;
    trackingId?: string;
  };
}

export interface IncomingWebhookEvent {
  id: string;
  companyId: string;
  source: string;
  eventType: IncomingEventType;
  payload: IncomingWebhookPayload;
  headers?: Record<string, any>;
  ipAddress?: string;
  signatureValid: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface IncomingWebhookConfig {
  id: string;
  companyId: string;
  name: string;
  source: string;
  secret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookSignatureHeaders {
  signature: string;
  timestamp: string;
  nonce?: string;
}

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  timestamp?: number;
}
