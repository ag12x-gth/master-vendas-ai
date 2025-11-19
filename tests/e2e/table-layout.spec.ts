import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Table Layout Structure Validation', () => {
  const componentsToValidate = [
    'src/components/settings/team-table.tsx',
    'src/components/settings/api-keys-manager.tsx',
    'src/components/settings/notifications-manager.tsx',
    'src/components/settings/sms-gateways-manager.tsx',
    'src/components/settings/tags-manager.tsx',
    'src/components/settings/webhooks-manager.tsx',
    'src/components/campaigns/campaign-table.tsx',
    'src/components/contacts/contact-table.tsx',
  ];

  test('Validar estrutura correta de divs em todos os componentes de tabela', async () => {
    const projectRoot = process.cwd();
    const results: { file: string; hasCorrectStructure: boolean; hasOldPattern: boolean }[] = [];

    for (const componentPath of componentsToValidate) {
      const fullPath = path.join(projectRoot, componentPath);
      
      if (!fs.existsSync(fullPath)) {
        results.push({ file: componentPath, hasCorrectStructure: false, hasOldPattern: false });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      const hasCorrectStructure = content.includes('border rounded-lg relative') && 
                                   content.includes('overflow-auto');

      const hasOldPattern = /className="[^"]*overflow-x-auto[^"]*border[^"]*rounded-lg/.test(content) ||
                           /className="[^"]*border[^"]*rounded-lg[^"]*overflow-x-auto/.test(content);

      results.push({ 
        file: componentPath, 
        hasCorrectStructure, 
        hasOldPattern 
      });
    }

    const failures = results.filter(r => !r.hasCorrectStructure || r.hasOldPattern);
    
    if (failures.length > 0) {
      console.error('Componentes com problemas:', failures);
    }

    expect(failures).toHaveLength(0);
  });

  test('Validar que todos os componentes têm estrutura aninhada correta', async () => {
    const projectRoot = process.cwd();
    const results: { file: string; hasNestedStructure: boolean }[] = [];

    for (const componentPath of componentsToValidate) {
      const fullPath = path.join(projectRoot, componentPath);
      
      if (!fs.existsSync(fullPath)) {
        results.push({ file: componentPath, hasNestedStructure: false });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      const outerWrapperPattern = /className="w-full border rounded-lg relative"/;
      const innerWrapperPattern = /className="w-full overflow-auto"/;
      
      const hasNestedStructure = outerWrapperPattern.test(content) && innerWrapperPattern.test(content);

      results.push({ 
        file: componentPath, 
        hasNestedStructure 
      });
    }

    const failures = results.filter(r => !r.hasNestedStructure);
    
    if (failures.length > 0) {
      console.error('Componentes sem estrutura aninhada:', failures);
    }

    expect(failures).toHaveLength(0);
  });

  test('Validar que os fechamentos de divs estão balanceados', async () => {
    const projectRoot = process.cwd();
    const results: { file: string; balanced: boolean; message?: string }[] = [];

    for (const componentPath of componentsToValidate) {
      const fullPath = path.join(projectRoot, componentPath);
      
      if (!fs.existsSync(fullPath)) {
        results.push({ file: componentPath, balanced: false, message: 'File not found' });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      const tableClosingIndex = content.indexOf('</Table>');
      if (tableClosingIndex === -1) {
        results.push({ file: componentPath, balanced: false, message: '</Table> not found' });
        continue;
      }

      const afterTableClose = content.substring(tableClosingIndex);
      const closingDivs = (afterTableClose.match(/<\/div>/g) || []).slice(0, 3);

      const hasDoubleClose = closingDivs.length >= 2;

      results.push({ 
        file: componentPath, 
        balanced: hasDoubleClose,
        message: hasDoubleClose ? 'OK' : `Only ${closingDivs.length} closing div(s) found`
      });
    }

    const failures = results.filter(r => !r.balanced);
    
    if (failures.length > 0) {
      console.error('Componentes com divs desbalanceadas:', failures);
    }

    expect(failures).toHaveLength(0);
  });
});
