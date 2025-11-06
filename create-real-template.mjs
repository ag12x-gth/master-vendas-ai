import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Decrypt function (matching src/lib/crypto.ts format)
function decrypt(encryptedHex) {
  if (!encryptedHex) return encryptedHex;
  
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
  
  // Hash key to 32 bytes if needed
  let key;
  if (ENCRYPTION_KEY.length === 32) {
    key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
  } else {
    key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  }
  
  try {
    const IV_LENGTH = 16;
    const AUTH_TAG_LENGTH = 16;
    
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

async function createAndSubmitTemplate() {
  try {
    console.log('🔧 Criando template UTILITY real...\n');
    
    // 1. Criar template no banco
    const templateData = {
      id: crypto.randomUUID(),
      name: 'lembrete_consulta_masterial',
      display_name: 'Lembrete de Consulta',
      category: 'UTILITY',
      language: 'pt_BR',
      waba_id: '399691246563833',
      connection_id: '194c93a8-ba37-4342-91a6-6faf84fb4a7a',
      company_id: '682b91ea-15ee-42da-8855-70309b237008',
      status: 'DRAFT',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'Agendamento Confirmado ✅'
        },
        {
          type: 'BODY',
          text: 'Olá {{1}}! Seu agendamento foi confirmado com sucesso.\n\nData: {{2}}\nHorário: {{3}}\nServiço: {{4}}\n\nAguardamos você!',
          example: {
            body_text: [
              ['João Silva', '15/11/2025', '14:30', 'Consultoria Master IA']
            ]
          }
        },
        {
          type: 'FOOTER',
          text: 'Master IA - Automação Inteligente'
        }
      ],
      allow_category_change: true
    };
    
    console.log('📝 Template criado:', {
      nome: templateData.name,
      categoria: templateData.category,
      idioma: templateData.language
    });
    
    // Inserir no banco
    await pool.query(`
      INSERT INTO message_templates (
        id, name, display_name, category, language, waba_id, 
        connection_id, company_id, status, components, 
        allow_category_change, created_at, updated_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        components = EXCLUDED.components,
        updated_at = NOW()
    `, [
      templateData.id,
      templateData.name,
      templateData.display_name,
      templateData.category,
      templateData.language,
      templateData.waba_id,
      templateData.connection_id,
      templateData.company_id,
      templateData.status,
      JSON.stringify(templateData.components),
      templateData.allow_category_change
    ]);
    
    console.log('✅ Template salvo no banco\n');
    
    // 2. Buscar conexão e preparar submissão
    console.log('🔍 Buscando credenciais da conexão...');
    const connResult = await pool.query(
      'SELECT access_token FROM connections WHERE id = $1',
      [templateData.connection_id]
    );
    
    console.log('Debug - Rows:', connResult.rows.length);
    console.log('Debug - Access token exists:', !!connResult.rows[0]?.access_token);
    console.log('Debug - Access token type:', typeof connResult.rows[0]?.access_token);
    console.log('Debug - Access token length:', connResult.rows[0]?.access_token?.length);
    
    if (!connResult.rows[0]?.access_token) {
      throw new Error('Access token não encontrado ou é null/undefined');
    }
    
    const encryptedToken = connResult.rows[0].access_token;
    console.log('Debug - Token a decriptar:', encryptedToken.substring(0, 50) + '...');
    
    const accessToken = decrypt(encryptedToken);
    console.log('✅ Token obtido e decriptado\n');
    
    // 3. Preparar payload para Meta API
    const payload = {
      name: templateData.name,
      language: templateData.language,
      category: templateData.category,
      components: templateData.components,
      allow_category_change: templateData.allow_category_change
    };
    
    console.log('📤 Submetendo à Meta Cloud API...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');
    
    const url = `https://graph.facebook.com/v21.0/${templateData.waba_id}/message_templates`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('❌ ERRO na submissão:\n');
      console.error(JSON.stringify(responseData, null, 2));
      console.error('');
      
      // Atualizar status para REJECTED
      await pool.query(
        'UPDATE message_templates SET status = $1, rejected_reason = $2, updated_at = NOW() WHERE id = $3',
        ['REJECTED', responseData.error?.message || 'Erro desconhecido', templateData.id]
      );
      
      return {
        success: false,
        templateId: templateData.id,
        templateName: templateData.name,
        error: responseData
      };
    }
    
    console.log('✅ SUCESSO! Template submetido à Meta\n');
    console.log('📊 Resposta da Meta:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('');
    
    const metaTemplateId = responseData.id;
    const status = responseData.status || 'PENDING';
    
    // Atualizar no banco
    await pool.query(
      'UPDATE message_templates SET meta_template_id = $1, status = $2, submitted_at = NOW(), updated_at = NOW() WHERE id = $3',
      [metaTemplateId, status, templateData.id]
    );
    
    // Também criar na tabela legacy
    await pool.query(`
      INSERT INTO templates (
        id, company_id, waba_id, name, category, body, 
        header_type, language, status, meta_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        meta_id = EXCLUDED.meta_id,
        updated_at = NOW()
    `, [
      templateData.id,
      templateData.company_id,
      templateData.waba_id,
      templateData.name,
      templateData.category,
      templateData.components.find(c => c.type === 'BODY')?.text || '',
      'TEXT',
      templateData.language,
      status,
      metaTemplateId
    ]);
    
    console.log('✅ Template atualizado no banco');
    console.log(`   Meta ID: ${metaTemplateId}`);
    console.log(`   Status: ${status}`);
    console.log('');
    
    return {
      success: true,
      templateId: templateData.id,
      templateName: templateData.name,
      metaTemplateId,
      status
    };
    
  } catch (error) {
    console.error('💥 ERRO FATAL:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// Executar
const result = await createAndSubmitTemplate();

if (result.success) {
  console.log('\n🎉 TEMPLATE CRIADO E SUBMETIDO COM SUCESSO!');
  console.log(`   ID: ${result.templateId}`);
  console.log(`   Nome: ${result.templateName}`);
  console.log(`   Meta ID: ${result.metaTemplateId}`);
  console.log(`   Status: ${result.status}`);
  console.log('\n⏳ Aguarde alguns minutos/horas para aprovação da Meta.');
} else {
  console.log('\n❌ FALHA NA SUBMISSÃO');
  console.log('   Verifique os erros acima e corrija.');
}
