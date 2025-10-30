/**
 * Script to create an admin user
 * 
 * Usage:
 *   node scripts/create-admin-user.js [username] [password]
 * 
 * Example:
 *   node scripts/create-admin-user.js admin SecurePassword123
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Get database config from environment or use defaults
const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'mokuro_enhanced',
};

async function createAdminUser(username, password) {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.error(`Error: User "${username}" already exists!`);
      process.exit(1);
    }

    // Hash the password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID
    const userId = uuidv4();

    // Insert user
    console.log('Creating user...');
    await client.query(
      `INSERT INTO users (id, username, password, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())`,
      [userId, username, hashedPassword]
    );

    console.log('\n✅ Admin user created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   User ID: ${userId}`);
    console.log('\nYou can now login with these credentials.');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    // Check if there are any manga without users
    const orphanedManga = await client.query(
      'SELECT COUNT(*) as count FROM manga WHERE user_id IS NULL'
    );

    const orphanCount = parseInt(orphanedManga.rows[0].count);

    if (orphanCount > 0) {
      console.log(`\n📚 Found ${orphanCount} manga without an owner.`);
      console.log('   Would you like to assign them to this user?');
      console.log(`   Run: UPDATE manga SET user_id = '${userId}' WHERE user_id IS NULL;`);
    }

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node scripts/create-admin-user.js [username] [password]');
  console.log('Example: node scripts/create-admin-user.js admin SecurePassword123');
  process.exit(1);
}

const [username, password] = args;

// Validate inputs
if (username.length < 3) {
  console.error('Error: Username must be at least 3 characters long');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Error: Password must be at least 6 characters long');
  process.exit(1);
}

if (!/^[a-zA-Z0-9_]+$/.test(username)) {
  console.error('Error: Username can only contain letters, numbers, and underscores');
  process.exit(1);
}

// Run the script
createAdminUser(username, password);

