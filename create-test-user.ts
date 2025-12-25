// Script para criar/atualizar usuário de teste
import { config as loadEnv } from 'dotenv';
import { argv, env, exit } from 'process';
import type { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { SignJWT } from 'jose';

loadEnv({ path: '.env.local' });
loadEnv();

type CliOptions = {
  email?: string;
  password?: string;
  name?: string;
  company?: string;
};

const DEFAULT_OPTIONS: Required<CliOptions> = {
  email: 'jeferson@masteriaoficial.com.br',
  password: 'Test@123456',
  name: 'Jeferson Teste',
  company: 'Masteria Local',
};

const parseCliArgs = (): Required<CliOptions> => {
  const args = argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    if (!key?.startsWith('--')) {
      continue;
    }

    if (!value) {
      console.warn(`⚠️  Valor ausente para a opção '${key}'. Ignorando.`);
      i -= 1;
      continue;
    }

    switch (key) {
      case '--email':
        options.email = value;
        break;
      case '--password':
        options.password = value;
        break;
      case '--company':
        options.company = value;
        break;
      case '--name':
        options.name = value;
        break;
      default:
        console.warn(`⚠️  Opção desconhecida '${key}'. Ignorando.`);
    }
  }

  return {
    email: options.email ?? DEFAULT_OPTIONS.email,
    password: options.password ?? DEFAULT_OPTIONS.password,
    name: options.name ?? DEFAULT_OPTIONS.name,
    company: options.company ?? DEFAULT_OPTIONS.company,
  };
};

async function createOrUpdateTestUser() {
  const options = parseCliArgs();

  if (!env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não está definida. Configure o arquivo .env.local.');
    exit(1);
  }

  const { db } = await import('./src/lib/db');
  const schemaModule = await import('./src/lib/db/schema');
  const users = schemaModule.users;
  const companies = schemaModule.companies;

  const ensureCompany = async (companyName: string): Promise<InferInsertModel<typeof companies>> => {
    const [existing] = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyName))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(companies)
      .values({ name: companyName })
      .returning();

    console.log(`🏢 Empresa '${companyName}' criada automaticamente.`);
    return created;
  };

  console.log('🔧 Criando/atualizando usuário de teste...');
  console.log(`Email: ${options.email}`);
  console.log(`Senha: ${options.password}`);
  console.log(`Empresa: ${options.company}`);

  try {
    const hashedPassword = await hash(options.password, 10);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, options.email))
      .limit(1);

    const company = await ensureCompany(options.company);

    let userId: string;
    let companyId = company.id;

    if (existingUser) {
      companyId = existingUser.companyId ?? companyId;

      await db
        .update(users)
        .set({
          password: hashedPassword,
          emailVerified: new Date(),
          name: options.name,
          companyId,
        })
        .where(eq(users.id, existingUser.id));

      userId = existingUser.id;
      console.log('✅ Usuário existente atualizado com sucesso!');
      console.log(`ID: ${existingUser.id}`);
      console.log(`CompanyID: ${companyId}`);
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          email: options.email,
          password: hashedPassword,
          companyId,
          emailVerified: new Date(),
          role: 'admin',
          name: options.name,
          firebaseUid: `test-firebase-${Date.now()}`,
        })
        .returning();

      userId = newUser.id;
      console.log('✅ Novo usuário criado com sucesso!');
      console.log(`ID: ${newUser.id}`);
      console.log(`CompanyID: ${newUser.companyId}`);
    }

    console.log('\n📝 Use estas credenciais nos testes:');
    console.log(`Email: ${options.email}`);
    console.log(`Senha: ${options.password}`);

    const secret = new TextEncoder().encode(
      env.JWT_SECRET_KEY ?? 'test-key-32-bytes-long-for-jose!'
    );

    const token = await new SignJWT({
      userId,
      companyId,
      email: options.email,
      role: 'admin',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    console.log('\n🔐 Session Token for API Testing:');
    console.log(token);
    console.log('\n🚀 Use this token em requests:');
    console.log(`Cookie: session=${token}`);
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar usuário:', error);
    exit(1);
  }

  exit(0);
}

createOrUpdateTestUser();