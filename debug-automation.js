const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'master_ia_studio',
  user: 'postgres',
  password: 'postgres'
});

async function checkAutomationRules() {
  try {
    console.log('Buscando regras de automação que contêm "SIM"...');
    
    const result = await pool.query(`
      SELECT id, name, is_active, conditions, actions 
      FROM automation_rules 
      WHERE conditions::text ILIKE '%SIM%'
    `);
    
    console.log('Regras encontradas:', result.rows.length);
    
    result.rows.forEach((rule, index) => {
      console.log(`\n--- Regra ${index + 1} ---`);
      console.log('ID:', rule.id);
      console.log('Nome:', rule.name);
      console.log('Ativa:', rule.is_active);
      console.log('Condições:', JSON.stringify(rule.conditions, null, 2));
      console.log('Ações:', JSON.stringify(rule.actions, null, 2));
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkAutomationRules();