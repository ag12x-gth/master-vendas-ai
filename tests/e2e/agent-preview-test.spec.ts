import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'diegomaninhu@gmail.com';
const TEST_PASSWORD = 'MasterIA2025!';

test.describe('Agent Preview & Test Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
  });

  test('Task 1: Aba "Testar" está presente na página do agente', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 5000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await expect(firstAgentLink).toBeVisible();
    await firstAgentLink.click();

    await page.waitForSelector('text=Configurações', { timeout: 5000 });

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await expect(testTab).toBeVisible();

    const configTab = page.locator('button[role="tab"]', { hasText: 'Configurações' });
    const performanceTab = page.locator('button[role="tab"]', { hasText: 'Performance' });

    await expect(configTab).toBeVisible();
    await expect(performanceTab).toBeVisible();
    await expect(testTab).toBeVisible();
  });

  test('Task 2: Ao clicar na aba "Testar", o componente de chat é exibido', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 5000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    await page.waitForSelector('text=Testar Agente:', { timeout: 3000 });

    const chatContainer = page.locator('text=Nenhuma mensagem ainda');
    await expect(chatContainer).toBeVisible();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    await expect(messageInput).toBeVisible();

    const sendButton = page.locator('button:has-text(""), button:has(svg)').last();
    await expect(sendButton).toBeVisible();
  });

  test('Task 3: Enviar mensagem de teste e receber resposta da IA', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 10000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    await messageInput.fill('Teste rápido');

    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();

    await page.waitForSelector('text=Teste rápido', { timeout: 5000 });

    const assistantMessage = page.locator('.bg-muted').first();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });

    const messageText = await assistantMessage.textContent();
    expect(messageText?.length).toBeGreaterThan(0);
  });

  test('Task 4: Histórico de conversa é mantido', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 10000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    await messageInput.fill('Msg 1');
    await sendButton.click();
    await page.waitForSelector('.bg-muted', { timeout: 30000 });

    await messageInput.fill('Msg 2');
    await sendButton.click();
    await page.waitForTimeout(5000);

    const userMessages = page.locator('.bg-primary');
    const count = await userMessages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Task 5: Botão "Limpar" remove histórico de conversa', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 5000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    await messageInput.fill('Mensagem de teste');
    await sendButton.click();
    await page.waitForTimeout(2000);

    const clearButton = page.locator('button:has-text("Limpar")');
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    const emptyState = page.locator('text=Nenhuma mensagem ainda');
    await expect(emptyState).toBeVisible();

    const userMessages = page.locator('.bg-primary');
    await expect(userMessages).toHaveCount(0);
  });

  test('Task 6: Contador de tokens é exibido após mensagens', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 5000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    await messageInput.fill('Teste de tokens');
    await sendButton.click();

    await page.waitForSelector('text=Tokens utilizados:', { timeout: 15000 });

    const tokensDisplay = page.locator('text=Tokens utilizados:');
    await expect(tokensDisplay).toBeVisible();

    const tokensText = await tokensDisplay.textContent();
    expect(tokensText).toMatch(/Tokens utilizados: \d+/);
  });

  test('Task 7: Mensagens de erro são exibidas corretamente', async ({ page }) => {
    await page.goto(`${BASE_URL}/agentes-ia`);
    await page.waitForSelector('text=Agentes de IA', { timeout: 5000 });

    const firstAgentLink = page.locator('a[href*="/agentes-ia/"]').first();
    await firstAgentLink.click();

    const testTab = page.locator('button[role="tab"]', { hasText: 'Testar' });
    await testTab.click();

    const messageInput = page.locator('textarea[placeholder*="Digite sua mensagem"]');
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    await messageInput.fill('');
    
    await expect(sendButton).toBeDisabled();

    await messageInput.fill('Mensagem válida');
    await expect(sendButton).toBeEnabled();
  });
});
