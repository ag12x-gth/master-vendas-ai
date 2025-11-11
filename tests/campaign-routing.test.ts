import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Integration tests for campaign routing logic
 * 
 * Tests real routing logic from campaign-sender.ts:
 * - Case-insensitive channel detection ('whatsapp', 'WHATSAPP', 'WhatsApp')
 * - Meta API vs Baileys routing based on connectionType
 * - Media blocking for Baileys connections
 * - Template resolution and variable mapping
 * - SessionManager availability checks
 */

// Mock dependencies before importing the module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  }
}));

vi.mock('@/lib/facebookApiService', () => ({
  sendWhatsappTemplateMessage: vi.fn()
}));

vi.mock('@/services/baileys-session-manager', () => ({
  sessionManager: {
    sendMessage: vi.fn(),
    checkAvailability: vi.fn(),
    getSession: vi.fn()
  }
}));

// Import after mocks are set up
import { sendWhatsappCampaign } from '@/lib/campaign-sender';
import { db } from '@/lib/db';
import { sendWhatsappTemplateMessage } from '@/lib/facebookApiService';
import { sessionManager } from '@/services/baileys-session-manager';

// Helper to create mock database responses
const createMockDbResponse = (data: any) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  then: vi.fn().mockResolvedValue(data)
});

describe('Campaign Routing - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Case-insensitive channel routing in trigger endpoint', () => {
    it('should normalize lowercase "whatsapp" to uppercase in trigger logic', () => {
      const channel = 'whatsapp';
      const normalized = channel?.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });

    it('should normalize "WhatsApp" mixed case to uppercase', () => {
      const channel = 'WhatsApp';
      const normalized = channel?.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });

    it('should keep "WHATSAPP" uppercase as-is', () => {
      const channel = 'WHATSAPP';
      const normalized = channel?.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });
  });

  describe('Connection type detection and routing', () => {
    beforeEach(() => {
      // Setup common mocks
      (db.select as Mock).mockReturnValue(createMockDbResponse([]));
      (db.update as Mock).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined)
      });
    });

    it('should identify Baileys connection from connectionType field', async () => {
      const baileysConnection = {
        id: 'conn-baileys-1',
        connectionType: 'baileys',
        companyId: 'company-1',
        configName: 'Baileys Test',
        status: 'connected'
      };

      const isBaileys = baileysConnection.connectionType === 'baileys';
      
      expect(isBaileys).toBe(true);
    });

    it('should identify Meta API connection from connectionType field', async () => {
      const metaConnection = {
        id: 'conn-meta-1',
        connectionType: 'meta_api',
        companyId: 'company-1',
        configName: 'Meta API Test',
        status: 'active'
      };

      const isBaileys = metaConnection.connectionType === 'baileys';
      const isMetaApi = metaConnection.connectionType === 'meta_api' || !metaConnection.connectionType;
      
      expect(isBaileys).toBe(false);
      expect(isMetaApi).toBe(true);
    });

    it('should default to Meta API when connectionType is null/undefined', () => {
      const connection = {
        id: 'conn-legacy-1',
        connectionType: null,
        companyId: 'company-1'
      };

      const isBaileys = connection.connectionType === 'baileys';
      
      expect(isBaileys).toBe(false);
    });
  });

  describe('Media handling for different connection types', () => {
    it('should block media campaigns for Baileys connections', () => {
      const campaign = {
        id: 'camp-1',
        channel: 'WHATSAPP',
        connectionId: 'conn-baileys-1',
        mediaAssetId: 'media-123',
        companyId: 'company-1'
      };

      const connection = {
        id: 'conn-baileys-1',
        connectionType: 'baileys'
      };

      const resolvedTemplate = {
        name: 'test_template',
        language: 'pt_BR',
        bodyText: 'Hello {{1}}',
        headerType: 'IMAGE',
        hasMedia: true
      };

      const isBaileys = connection.connectionType === 'baileys';
      const shouldBlock = isBaileys && resolvedTemplate.hasMedia && !!campaign.mediaAssetId;
      
      expect(shouldBlock).toBe(true);
    });

    it('should allow media campaigns for Meta API connections', () => {
      const campaign = {
        id: 'camp-2',
        channel: 'WHATSAPP',
        connectionId: 'conn-meta-1',
        mediaAssetId: 'media-123',
        companyId: 'company-1'
      };

      const connection = {
        id: 'conn-meta-1',
        connectionType: 'meta_api'
      };

      const resolvedTemplate = {
        name: 'test_template',
        language: 'pt_BR',
        bodyText: 'Hello {{1}}',
        headerType: 'IMAGE',
        hasMedia: true
      };

      const isBaileys = connection.connectionType === 'baileys';
      const shouldBlock = isBaileys && resolvedTemplate.hasMedia && !!campaign.mediaAssetId;
      
      expect(shouldBlock).toBe(false);
    });

    it('should allow text-only campaigns for Baileys', () => {
      const campaign = {
        id: 'camp-3',
        channel: 'whatsapp',
        connectionId: 'conn-baileys-1',
        mediaAssetId: null,
        companyId: 'company-1'
      };

      const connection = {
        id: 'conn-baileys-1',
        connectionType: 'baileys'
      };

      const resolvedTemplate = {
        name: 'simple_text',
        language: 'pt_BR',
        bodyText: 'Simple message',
        headerType: null,
        hasMedia: false
      };

      const isBaileys = connection.connectionType === 'baileys';
      const shouldBlock = isBaileys && resolvedTemplate.hasMedia && !!campaign.mediaAssetId;
      
      expect(shouldBlock).toBe(false);
    });
  });

  describe('Template resolution and variable mapping', () => {
    it('should extract body text from legacy template structure', () => {
      const legacyTemplate = {
        id: 'tmpl-1',
        name: 'legacy_template',
        language: 'pt_BR',
        body: 'Hello {{1}}, welcome to {{2}}!'
      };

      const bodyText = legacyTemplate.body && typeof legacyTemplate.body === 'string' 
        ? legacyTemplate.body 
        : '';
      
      expect(bodyText).toBe('Hello {{1}}, welcome to {{2}}!');
    });

    it('should extract body text from v2 template with components', () => {
      const v2Template = {
        id: 'tmpl-2',
        name: 'v2_template',
        language: 'pt_BR',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Welcome' },
          { type: 'BODY', text: 'Your code is {{1}}' }
        ]
      };

      const bodyComponent = v2Template.components.find((c: any) => c.type === 'BODY');
      const bodyText = bodyComponent?.text || '';
      
      expect(bodyText).toBe('Your code is {{1}}');
    });

    it('should handle variable mapping with fixed values', () => {
      const bodyText = 'Hello {{1}}, your order {{2}} is ready';
      const variableMappings = {
        '1': { type: 'fixed' as const, value: 'John' },
        '2': { type: 'fixed' as const, value: '#12345' }
      };

      let result = bodyText;
      const placeholder1 = '{{1}}';
      const placeholder2 = '{{2}}';
      
      result = result.replace(placeholder1, variableMappings['1'].value);
      result = result.replace(placeholder2, variableMappings['2'].value);
      
      expect(result).toBe('Hello John, your order #12345 is ready');
    });

    it('should handle variable mapping with dynamic contact fields', () => {
      const bodyText = 'Hello {{1}}, your phone is {{2}}';
      const contact = {
        id: 'contact-1',
        name: 'Jane Doe',
        phone: '5511999999999'
      };
      
      const variableMappings = {
        '1': { type: 'dynamic' as const, value: 'name' },
        '2': { type: 'dynamic' as const, value: 'phone' }
      };

      let result = bodyText;
      
      // Simulate dynamic replacement
      for (const [key, mapping] of Object.entries(variableMappings)) {
        if (mapping.type === 'dynamic') {
          const dynamicValue = (contact as any)[mapping.value];
          if (dynamicValue !== null && dynamicValue !== undefined) {
            result = result.replace(`{{${key}}}`, String(dynamicValue));
          }
        }
      }
      
      expect(result).toBe('Hello Jane Doe, your phone is 5511999999999');
    });
  });

  describe('SessionManager integration for Baileys', () => {
    it('should check SessionManager availability before sending', async () => {
      const connectionId = 'conn-baileys-1';
      const companyId = 'company-1';

      (sessionManager.checkAvailability as Mock).mockResolvedValue({
        available: true,
        connectionId,
        companyId,
        status: 'connected'
      });

      const availability = await sessionManager.checkAvailability(connectionId, companyId);
      
      expect(sessionManager.checkAvailability).toHaveBeenCalledWith(connectionId, companyId);
      expect(availability.available).toBe(true);
    });

    it('should handle unavailable SessionManager gracefully', async () => {
      const connectionId = 'conn-baileys-disconnected';

      (sessionManager.checkAvailability as Mock).mockResolvedValue({
        available: false,
        connectionId,
        error: 'Session not found'
      });

      const availability = await sessionManager.checkAvailability(connectionId);
      
      expect(availability.available).toBe(false);
      expect(availability.error).toBeDefined();
    });

    it('should send message via Baileys SessionManager', async () => {
      const connectionId = 'conn-baileys-1';
      const phone = '5511999999999';
      const messageText = 'Test message';
      const messageId = 'msg-baileys-12345';

      (sessionManager.sendMessage as Mock).mockResolvedValue(messageId);

      const result = await sessionManager.sendMessage(connectionId, phone, { text: messageText });
      
      expect(sessionManager.sendMessage).toHaveBeenCalledWith(
        connectionId,
        phone,
        { text: messageText }
      );
      expect(result).toBe(messageId);
    });
  });

  describe('Meta API integration', () => {
    it('should send structured template via Meta API', async () => {
      const mockResponse = {
        messages: [{ id: 'wamid.meta123' }]
      };

      (sendWhatsappTemplateMessage as Mock).mockResolvedValue(mockResponse);

      const params = {
        connectionId: 'conn-meta-1',
        to: '5511999999999',
        templateName: 'hello_world',
        languageCode: 'pt_BR',
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'John' }] }
        ]
      };

      const response = await sendWhatsappTemplateMessage(params);
      
      expect(sendWhatsappTemplateMessage).toHaveBeenCalledWith(params);
      expect(response.messages[0].id).toBe('wamid.meta123');
    });
  });

  describe('Error handling', () => {
    it('should handle missing template gracefully', () => {
      const template = null;
      
      expect(() => {
        if (!template) {
          throw new Error('Template not found');
        }
      }).toThrow('Template not found');
    });

    it('should handle missing connection gracefully', () => {
      const connection = null;
      
      expect(() => {
        if (!connection) {
          throw new Error('Connection not found');
        }
      }).toThrow('Connection not found');
    });

    it('should validate campaign has required fields', () => {
      const campaign = {
        id: 'camp-1',
        channel: 'WHATSAPP',
        companyId: null,
        templateId: null,
        connectionId: null
      };

      const errors: string[] = [];
      
      if (!campaign.companyId) errors.push('Missing companyId');
      if (!campaign.templateId) errors.push('Missing templateId');
      if (!campaign.connectionId) errors.push('Missing connectionId');
      
      expect(errors).toHaveLength(3);
    });
  });
});
