const { Client } = require('pg');

async function resetDevDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Terminate existing connections
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'mokuro_enhanced'
        AND pid <> pg_backend_pid()
    `);
    console.log('ℹ️  Terminated existing connections');

    // Drop database if exists
    await client.query('DROP DATABASE IF EXISTS mokuro_enhanced');
    console.log('✅ Dropped database: mokuro_enhanced');

    // Create database
    await client.query('CREATE DATABASE mokuro_enhanced');
    console.log('✅ Created database: mokuro_enhanced');

    await client.end();
    console.log('✅ Database reset complete!');
    console.log('🚀 You can now run: npm run start:dev');
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    console.error('\n💡 Make sure PostgreSQL is running:');
    console.error('   docker-compose up -d');
    process.exit(1);
  }
}

resetDevDatabase();

