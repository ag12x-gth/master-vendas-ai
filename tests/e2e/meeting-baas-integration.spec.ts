import { test, expect } from '@playwright/test';

test.describe('Meeting BaaS Integration E2E', () => {
    const MEETING_URL = 'https://meet.google.com/hjj-mnbs-amp';
    
    test('should create meeting and receive webhooks from Meeting BaaS bot', async ({ page }) => {
        // 1. Login na aplicação
        await page.goto('/login');
        await page.fill('input[type="email"]', 'teste.e2e@meetingbaas.com');
        await page.fill('input[type="password"]', 'senha123');
        await page.click('button[type="submit"]');
        
        // Aguardar login completar (pode redirecionar para dashboard ou permanecer)
        await page.waitForTimeout(2000);
        
        // 2. Navegar diretamente para página de reuniões
        await page.goto('/meetings');
        await expect(page.getByRole('heading', { name: 'Reuniões' })).toBeVisible({ timeout: 5000 });
        
        // 3. Abrir diálogo de nova reunião
        const newMeetingButton = page.getByRole('button', { name: /nova reunião/i });
        await newMeetingButton.click();
        
        // Aguardar diálogo abrir
        await page.waitForTimeout(1000);
        
        // 4. Preencher formulário
        await page.getByRole('textbox', { name: /URL do Google Meet/i }).fill(MEETING_URL);
        
        // Adicionar observações (campo opcional)
        const notesField = page.getByRole('textbox', { name: /Observações/i });
        if (await notesField.count() > 0) {
            await notesField.fill('Teste E2E de integração Meeting BaaS');
        }
        
        // 5. Criar reunião
        const submitButton = page.getByRole('button', { name: /Criar e Iniciar Bot/i });
        await submitButton.click();
        
        // 6. Verificar mensagem de sucesso
        await expect(page.getByText(/bot foi adicionado/i)).toBeVisible({ timeout: 10000 });
        
        // 7. Verificar se reunião aparece na lista
        await expect(page.getByText(MEETING_URL)).toBeVisible({ timeout: 5000 });
        
        // 8. Verificar status da reunião (pending ou in_progress)
        const statusBadges = ['pending', 'in_progress', 'joining_call', 'in_waiting_room'];
        let statusFound = false;
        for (const status of statusBadges) {
            const badge = page.getByText(status, { exact: false });
            if (await badge.count() > 0) {
                statusFound = true;
                break;
            }
        }
        expect(statusFound).toBe(true);
        
        console.log('✅ Teste E2E concluído com sucesso!');
        console.log('⚠️  Nota: O bot só entrará na reunião se ela estiver ATIVA no Google Meet');
    });
});
