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
    // Drop existing tables (if recreating)
    console.log('🗑️  Dropping existing tables if they exist...');
    await sql`DROP TABLE IF EXISTS trips CASCADE`;
    await sql`DROP TABLE IF EXISTS trip_themes CASCADE`;
    console.log('✅ Existing tables dropped');
    
    // Create trip_themes table with UUID
    console.log('📝 Creating trip_themes table...');
    await sql`
      CREATE TABLE trip_themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Trip themes table created');
    
    // Insert predefined themes with icons
    console.log('📝 Inserting trip themes...');
    await sql`
      INSERT INTO trip_themes (name, icon) VALUES
        ('City Exploration', '🏙️'),
        ('Food & Drink', '🍽️'),
        ('Cultural', '🎭'),
        ('Adventure', '🧗‍♂️'),
        ('Nature', '🦫'),
        ('Family-Friendly', '🧑‍🧑‍🧒'),
        ('Wellness', '🧘‍♀️'),
        ('Shopping', '🛍️')
    `;
    console.log('✅ Trip themes inserted');
    
    // Create trips table
    console.log('📝 Creating trips table...');
    await sql`
      CREATE TABLE trips (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        users JSONB NOT NULL,
        theme_id UUID REFERENCES trip_themes(id),
        transport_mode VARCHAR(20)
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
