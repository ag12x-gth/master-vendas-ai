import fs from 'fs'
import path from 'path'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const loadEnvironment = () => {
  const envFiles = ['.env.local', '.env']

  for (const file of envFiles) {
    const envPath = path.resolve(process.cwd(), file)
    if (fs.existsSync(envPath)) {
      loadEnv({ path: envPath })
    }
  }
}

const runMigrations = async () => {
  loadEnvironment()

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined. Cannot run migrations.')
  }

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle')

  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(`Migrations folder not found at: ${migrationsFolder}`)
  }

  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  })

  try {
    const db = drizzle(client)
    await migrate(db, { migrationsFolder })
    console.log('✅ Database migrations applied successfully.')
  } finally {
    await client.end()
  }
}

runMigrations().catch((error) => {
  console.error('❌ Failed to run database migrations:', error)
  process.exit(1)
})
