
// src/lib/automation-engine.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { processIncomingMessageTrigger } from './automation-engine';
import { db } from './db';
import * as facebookApiService from './facebookApiService';
import type { AutomationRule, Contact, Conversation, Message } from './types';

// Mocking the database dependency
vi.mock('./db', () => ({
  db: {
    query: {
      automationRules: {
        findMany: vi.fn(),
      },
      conversations: {
        findFirst: vi.fn(),
      },
      messages: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn(),
    select: vi.fn(() => ({ from: vi.fn(() => (Promise.resolve([]))) })),
  },
}));

// Mocking the facebookApiService dependency
vi.mock('./facebookApiService', () => ({
  sendWhatsappTextMessage: vi.fn(),
}));

const mockContact: Contact = {
  id: 'contact_1',
  companyId: 'company_1',
  name: 'Test Contact',
  phone: '123456789',
  email: null,
  createdAt: new Date(),
  status: 'ACTIVE',
  avatarUrl: null,
  addressStreet: null,
  addressCity: null,
  addressState: null,
  addressZipCode: null,
  externalId: null,
  externalProvider: null,
  whatsappName: 'Test Contact WA',
  notes: null,
  profileLastSyncedAt: null,
  addressNumber: null,
  addressComplement: null,
  addressDistrict: null,
  deletedAt: null,
};

const mockConversation: Conversation = {
  id: 'conv_1',
  companyId: 'company_1',
  contactId: 'contact_1',
  connectionId: 'conn_1',
  status: 'IN_PROGRESS',
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedTo: null,
  lastMessageAt: new Date(),
  aiActive: true,
  archivedAt: null,
  archivedBy: null,
  contactName: 'Test Contact',
  contactAvatar: null,
  phone: '123456789',
  lastMessage: null,
  lastMessageStatus: null,
  connectionName: 'Test Connection',
};

const mockFullConversation = {
    ...mockConversation,
    contact: mockContact,
    connection: { id: 'conn_1', wabaId: 'waba_1', name: 'Test Connection' }
};


describe('Automation Engine', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    vi.clearAllMocks();
  });

  it('deve executar uma ação de adicionar tag quando a condição de conteúdo da mensagem é atendida', async () => {
    const mockMessage: Message = {
      id: 'msg_1',
      conversationId: 'conv_1',
      senderId: 'contact_1',
      content: 'olá, gostaria de saber o preço do produto',
      contentType: 'TEXT',
      senderType: 'USER',
      sentAt: new Date(),
      status: null,
      providerMessageId: null,
      repliedToMessageId: null,
      mediaUrl: null,
      readAt: null,
    };

    const mockRule: AutomationRule = {
      id: 'rule_1',
      companyId: 'company_1',
      name: 'Rule for Pricing',
      triggerEvent: 'new_message_received',
      conditions: [
        {
          type: 'message_content',
          operator: 'contains',
          value: 'preço',
        },
      ],
      actions: [
        {
          type: 'add_tag',
          value: 'tag_pricing_inquiry',
        },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      connectionIds: ['conn_1'],
    };

    vi.mocked(db.query.conversations.findFirst).mockResolvedValue(mockFullConversation as any);
    vi.mocked(db.query.messages.findFirst).mockResolvedValue(mockMessage);
    vi.mocked(db.query.automationRules.findMany).mockResolvedValue([mockRule]);
    const insertSpy = vi.spyOn(db, 'insert');

    await processIncomingMessageTrigger(
      'conv_1',
      'msg_1'
    );
    
    expect(db.query.automationRules.findMany).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledTimes(2); // 1 for log, 1 for tag
  });
  
  it('não deve executar uma ação quando a condição de conteúdo da mensagem não é atendida', async () => {
    const mockMessage: Message = {
      id: 'msg_2',
      conversationId: 'conv_1',
      senderId: 'contact_1',
      content: 'olá, tudo bem?', // Esta mensagem não contém "preço"
      contentType: 'TEXT',
      senderType: 'USER',
      sentAt: new Date(),
      status: null,
      providerMessageId: null,
      repliedToMessageId: null,
      mediaUrl: null,
      readAt: null,
    };

    const mockRule: AutomationRule = {
      id: 'rule_1',
      companyId: 'company_1',
      name: 'Rule for Pricing',
      triggerEvent: 'new_message_received',
      conditions: [
        {
          type: 'message_content',
          operator: 'contains',
          value: 'preço',
        },
      ],
      actions: [
        {
          type: 'add_tag',
          value: 'tag_pricing_inquiry',
        },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      connectionIds: ['conn_1'],
    };
    
    vi.mocked(db.query.conversations.findFirst).mockResolvedValue(mockFullConversation as any);
    vi.mocked(db.query.messages.findFirst).mockResolvedValue(mockMessage);
    vi.mocked(db.query.automationRules.findMany).mockResolvedValue([mockRule]);
    const insertSpy = vi.spyOn(db, 'insert');
    const sendMsgSpy = vi.spyOn(facebookApiService, 'sendWhatsappTextMessage');

    await processIncomingMessageTrigger(
      'conv_1',
      'msg_2'
    );

    expect(db.query.automationRules.findMany).toHaveBeenCalledTimes(1);
    // Deve chamar o log, mas não a ação de tag
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(sendMsgSpy).not.toHaveBeenCalled();
  });

  it('deve executar uma ação de enviar mensagem', async () => {
    const mockMessage: Message = {
      id: 'msg_3',
      conversationId: 'conv_1',
      senderId: 'contact_1',
      content: 'ajuda',
      contentType: 'TEXT',
      senderType: 'USER',
      sentAt: new Date(),
      status: null,
      providerMessageId: null,
      repliedToMessageId: null,
      mediaUrl: null,
      readAt: null,
    };

    const mockRule: AutomationRule = {
      id: 'rule_2',
      companyId: 'company_1',
      name: 'Rule for Help',
      triggerEvent: 'new_message_received',
      conditions: [{ type: 'message_content', operator: 'equals', value: 'ajuda' }],
      actions: [{ type: 'send_message', value: 'Olá! Um agente irá atendê-lo em breve.' }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      connectionIds: ['conn_1'],
    };
    
    vi.mocked(db.query.conversations.findFirst).mockResolvedValue(mockFullConversation as any);
    vi.mocked(db.query.messages.findFirst).mockResolvedValue(mockMessage);
    vi.mocked(db.query.automationRules.findMany).mockResolvedValue([mockRule]);
    const sendMsgSpy = vi.spyOn(facebookApiService, 'sendWhatsappTextMessage');

    await processIncomingMessageTrigger(
      'conv_1',
      'msg_1'
    );
    
    expect(sendMsgSpy).toHaveBeenCalledTimes(1);
    expect(sendMsgSpy).toHaveBeenCalledWith({
      connectionId: mockConversation.connectionId,
      to: mockContact.phone,
      text: 'Olá! Um agente irá atendê-lo em breve.',
    });
  });
});
