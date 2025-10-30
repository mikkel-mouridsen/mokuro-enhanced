const { Client } = require('pg');

async function setupDevDatabase() {
  // Connect to postgres default database first
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'mokuro_enhanced'"
    );

    if (result.rowCount === 0) {
      // Create database
      await client.query('CREATE DATABASE mokuro_enhanced');
      console.log('✅ Created database: mokuro_enhanced');
    } else {
      console.log('ℹ️  Database mokuro_enhanced already exists');
    }

    await client.end();
    console.log('✅ Database setup complete!');
    console.log('🚀 You can now run: npm run start:dev');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('\n💡 Make sure PostgreSQL is running:');
    console.error('   docker-compose up -d');
    process.exit(1);
  }
}

setupDevDatabase();

