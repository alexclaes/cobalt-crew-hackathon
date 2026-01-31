// Script to set up database schema in Neon
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Load DATABASE_URL from .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  
  if (!match) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }
  
  const databaseUrl = match[1].trim();
  const sql = neon(databaseUrl);
  
  console.log('🔌 Connecting to Neon database...');
  
  try {
    // Create trips table
    console.log('📝 Creating trips table...');
    await sql`
      CREATE TABLE IF NOT EXISTS trips (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        users JSONB NOT NULL
      )
    `;
    console.log('✅ Trips table created');
    
    // Create index
    console.log('📝 Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC)
    `;
    console.log('✅ Index created');
    
    // Test the connection by querying
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful!');
    console.log('⏰ Server time:', result[0].current_time);
    
    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
