// Script para criar/atualizar usuário de teste
import { config } from 'dotenv';
import { db } from './src/lib/db';
import { users, companies } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { SignJWT } from 'jose';

config({ path: '.env.local' });

async function createOrUpdateTestUser() {
  const testEmail = 'jeferson@masteriaoficial.com.br';
  const testPassword = 'Test@123456';
  
  console.log('🔧 Criando/atualizando usuário de teste...');
  console.log(`Email: ${testEmail}`);
  console.log(`Senha: ${testPassword}`);
  
  try {
    const hashedPassword = await hash(testPassword, 10);
    
    // Verificar se usuário existe
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);
    
    if (existingUser) {
      // Atualizar senha e verificar email
      await db
        .update(users)
        .set({
          password: hashedPassword,
          emailVerified: new Date()
        })
        .where(eq(users.id, existingUser.id));
      
      console.log('✅ Usuário existente atualizado com sucesso!');
      console.log(`ID: ${existingUser.id}`);
      console.log(`CompanyID: ${existingUser.companyId}`);
    } else {
      // Buscar uma empresa existente
      const [company] = await db.query.companies.findMany({ limit: 1 });
      
      if (!company) {
        console.error('❌ Nenhuma empresa encontrada no banco!');
        process.exit(1);
      }
      
      // Criar novo usuário
      const [newUser] = await db
        .insert(users)
        .values({
          email: testEmail,
          password: hashedPassword,
          companyId: company.id,
          emailVerified: new Date(),
          role: 'admin',
          name: 'Jeferson Teste',
          firebaseUid: 'test-firebase-' + Date.now()
        })
        .returning();
      
      console.log('✅ Novo usuário criado com sucesso!');
      console.log(`ID: ${newUser.id}`);
      console.log(`CompanyID: ${newUser.companyId}`);
    }
    
    console.log('\n📝 Use estas credenciais no teste:');
    console.log(`Email: ${testEmail}`);
    console.log(`Senha: ${testPassword}`);
    
    // Generate session token
    const userId = existingUser ? existingUser.id : (await db.select().from(users).where(eq(users.email, testEmail)).limit(1))[0].id;
    const companyId = existingUser ? existingUser.companyId : (await db.select().from(users).where(eq(users.email, testEmail)).limit(1))[0].companyId;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY || 'test-key-32-bytes-long-for-jose!');
    const token = await new SignJWT({ 
      userId: userId, 
      companyId: companyId,
      email: testEmail,
      role: 'admin' 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    console.log('\n🔐 Session Token for API Testing:');
    console.log(token);
    console.log('\n🚀 Use this token in requests:');
    console.log(`Cookie: session=${token}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar usuário:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createOrUpdateTestUser();