import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const sql = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(sql, { schema });

async function main() {
    console.log('Creating meeting tables...');
    
    await sql`CREATE TYPE meeting_status AS ENUM ('scheduled', 'waiting', 'in_progress', 'completed', 'failed', 'cancelled')`;
    console.log('✓ Created meeting_status enum');
    
    await sql`
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id TEXT NOT NULL REFERENCES companies(id),
            lead_id TEXT REFERENCES kanban_leads(id) ON DELETE SET NULL,
            contact_id TEXT REFERENCES contacts(id),
            closer_id TEXT NOT NULL REFERENCES users(id),
            google_meet_url TEXT NOT NULL,
            meeting_baas_id TEXT,
            bot_joined_at TIMESTAMP,
            bot_left_at TIMESTAMP,
            status meeting_status DEFAULT 'scheduled' NOT NULL,
            scheduled_for TIMESTAMP,
            recording_url TEXT,
            transcript_url TEXT,
            duration INTEGER,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
    `;
    console.log('✓ Created meetings table');
    
    await sql`
        CREATE TABLE IF NOT EXISTS meeting_analysis_realtime (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            timestamp TIMESTAMP NOT NULL,
            speaker TEXT,
            speaker_type TEXT,
            transcript TEXT,
            sentiment TEXT,
            sentiment_score DECIMAL(5,2),
            emotions JSONB,
            facial_data JSONB,
            prosody_data JSONB,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
    `;
    console.log('✓ Created meeting_analysis_realtime table');
    
    await sql`
        CREATE TABLE IF NOT EXISTS meeting_insights (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
            summary_text TEXT,
            key_points JSONB,
            pain_points JSONB,
            interests JSONB,
            objections JSONB,
            lead_score INTEGER,
            recommended_proposal TEXT,
            next_steps JSONB,
            overall_sentiment TEXT,
            engagement_level TEXT,
            emotion_summary JSONB,
            talk_time_ratio JSONB,
            generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
    `;
    console.log('✓ Created meeting_insights table');
    
    console.log('✅ All meeting tables created successfully!');
    await sql.end();
}

main().catch((err) => {
    console.error('Error creating tables:', err);
    process.exit(1);
});
