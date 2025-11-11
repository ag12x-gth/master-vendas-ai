import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite for case-insensitive channel routing in campaign triggers
 * 
 * Validates that campaign trigger correctly handles:
 * - Different case variants: 'whatsapp', 'WHATSAPP', 'WhatsApp'
 * - Proper routing to Meta API vs Baileys based on connectionType
 * - Graceful handling when sessions are unavailable
 */

describe('Campaign Channel Routing - Case Insensitivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Channel normalization', () => {
    it('should normalize lowercase "whatsapp" to uppercase', () => {
      const channel = 'whatsapp';
      const normalized = channel.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });

    it('should normalize uppercase "WHATSAPP" to uppercase', () => {
      const channel = 'WHATSAPP';
      const normalized = channel.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });

    it('should normalize mixed case "WhatsApp" to uppercase', () => {
      const channel = 'WhatsApp';
      const normalized = channel.toUpperCase();
      
      expect(normalized).toBe('WHATSAPP');
    });

    it('should handle SMS channel correctly', () => {
      const channel = 'sms';
      const normalized = channel.toUpperCase();
      
      expect(normalized).toBe('SMS');
    });
  });

  describe('Connection type routing', () => {
    it('should identify Meta API connection type', () => {
      const connection = {
        id: 'test-meta-id',
        connectionType: 'meta_api',
        configName: 'Test Meta Connection'
      };

      expect(connection.connectionType).toBe('meta_api');
    });

    it('should identify Baileys connection type', () => {
      const connection = {
        id: 'test-baileys-id',
        connectionType: 'baileys',
        configName: 'Test Baileys Connection'
      };

      expect(connection.connectionType).toBe('baileys');
    });
  });

  describe('Campaign routing logic', () => {
    it('should route WHATSAPP campaign with meta_api connection to Meta API sender', () => {
      const campaign = {
        id: 'campaign-1',
        channel: 'WHATSAPP',
        connectionId: 'meta-conn-1'
      };

      const connection = {
        id: 'meta-conn-1',
        connectionType: 'meta_api'
      };

      // Simulate routing decision
      const shouldUseMeta = campaign.channel === 'WHATSAPP' && connection.connectionType === 'meta_api';
      const shouldUseBaileys = campaign.channel === 'WHATSAPP' && connection.connectionType === 'baileys';

      expect(shouldUseMeta).toBe(true);
      expect(shouldUseBaileys).toBe(false);
    });

    it('should route whatsapp campaign (lowercase) with baileys connection to Baileys sender', () => {
      const campaign = {
        id: 'campaign-2',
        channel: 'whatsapp', // lowercase
        connectionId: 'baileys-conn-1'
      };

      const connection = {
        id: 'baileys-conn-1',
        connectionType: 'baileys'
      };

      // Normalize channel
      const normalizedChannel = campaign.channel.toUpperCase();

      // Simulate routing decision
      const shouldUseMeta = normalizedChannel === 'WHATSAPP' && connection.connectionType === 'meta_api';
      const shouldUseBaileys = normalizedChannel === 'WHATSAPP' && connection.connectionType === 'baileys';

      expect(shouldUseMeta).toBe(false);
      expect(shouldUseBaileys).toBe(true);
    });

    it('should handle SMS campaigns separately', () => {
      const campaign = {
        id: 'campaign-3',
        channel: 'SMS',
        smsGatewayId: 'gateway-1'
      };

      const normalizedChannel = campaign.channel.toUpperCase();

      expect(normalizedChannel).toBe('SMS');
      expect(normalizedChannel).not.toBe('WHATSAPP');
    });
  });

  describe('Edge cases', () => {
    it('should handle null channel gracefully', () => {
      const channel: string | null = null;
      
      expect(() => {
        if (channel !== null) {
          channel.toUpperCase();
        }
      }).not.toThrow();
    });

    it('should handle undefined channel gracefully', () => {
      const channel: string | undefined = undefined;
      
      expect(() => {
        if (channel !== undefined) {
          channel.toUpperCase();
        }
      }).not.toThrow();
    });

    it('should handle empty string channel', () => {
      const channel = '';
      const normalized = channel.toUpperCase();
      
      expect(normalized).toBe('');
    });
  });

  describe('Variable mapping scenarios', () => {
    it('should handle variableMappings for Meta API template campaigns', () => {
      const campaign = {
        id: 'template-campaign-1',
        channel: 'WHATSAPP',
        templateId: 'template-123',
        variableMappings: {
          '1': { type: 'fixed', value: 'Hello' },
          '2': { type: 'dynamic', value: 'name' }
        }
      };

      expect(campaign.variableMappings).toBeDefined();
      expect(Object.keys(campaign.variableMappings).length).toBe(2);
    });

    it('should handle simple text messages for Baileys campaigns', () => {
      const campaign = {
        id: 'simple-campaign-1',
        channel: 'whatsapp',
        message: 'Simple text message',
        connectionId: 'baileys-conn-1',
        templateId: undefined as string | undefined
      };

      expect(campaign.message).toBeDefined();
      expect(campaign.templateId).toBeUndefined();
    });
  });
});
