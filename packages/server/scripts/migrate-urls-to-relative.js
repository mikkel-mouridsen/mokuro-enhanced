/**
 * Migration script to convert absolute URLs to relative paths in the database
 * 
 * This script updates:
 * - manga.coverUrl
 * - volume.coverUrl
 * - page.imageUrl
 * - user.profilePicture
 * 
 * From: http://localhost:3000/files/...
 * To: /api/files/...
 */

const { Client } = require('pg');

// Database configuration - adjust as needed
const DB_CONFIG = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'mokuro_enhanced',
};

async function migrateUrls() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Start transaction
    await client.query('BEGIN');
    console.log('🔄 Starting migration...\n');

    // Function to convert URL
    const convertUrl = (url) => {
      if (!url) return url;
      
      // Match patterns like:
      // http://localhost:3000/files/...
      // http://localhost:3000/api/files/...
      // https://domain.com/files/...
      // https://domain.com/api/files/...
      
      const patterns = [
        /https?:\/\/[^/]+\/api\/files\/(.*)/,
        /https?:\/\/[^/]+\/files\/(.*)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return `/api/files/${match[1]}`;
        }
      }

      // If already relative, ensure it starts with /api/files
      if (url.startsWith('/files/')) {
        return `/api${url}`;
      }

      return url;
    };

    // 1. Update manga table
    console.log('📚 Updating manga coverUrls...');
    const mangaResult = await client.query(
      `SELECT id, "coverUrl" FROM manga WHERE "coverUrl" IS NOT NULL AND "coverUrl" LIKE '%/files/%'`
    );
    
    let mangaUpdated = 0;
    for (const row of mangaResult.rows) {
      const newUrl = convertUrl(row.coverUrl);
      if (newUrl !== row.coverUrl) {
        await client.query(
          `UPDATE manga SET "coverUrl" = $1 WHERE id = $2`,
          [newUrl, row.id]
        );
        console.log(`  ✓ Manga ${row.id}: ${row.coverUrl} → ${newUrl}`);
        mangaUpdated++;
      }
    }
    console.log(`  Updated ${mangaUpdated} manga cover URLs\n`);

    // 2. Update volumes table
    console.log('📖 Updating volume coverUrls...');
    const volumeResult = await client.query(
      `SELECT id, "coverUrl" FROM volumes WHERE "coverUrl" IS NOT NULL AND "coverUrl" LIKE '%/files/%'`
    );
    
    let volumesUpdated = 0;
    for (const row of volumeResult.rows) {
      const newUrl = convertUrl(row.coverUrl);
      if (newUrl !== row.coverUrl) {
        await client.query(
          `UPDATE volumes SET "coverUrl" = $1 WHERE id = $2`,
          [newUrl, row.id]
        );
        console.log(`  ✓ Volume ${row.id}: ${row.coverUrl} → ${newUrl}`);
        volumesUpdated++;
      }
    }
    console.log(`  Updated ${volumesUpdated} volume cover URLs\n`);

    // 3. Update pages table
    console.log('🖼️  Updating page imageUrls...');
    const pageResult = await client.query(
      `SELECT id, "imageUrl" FROM pages WHERE "imageUrl" IS NOT NULL AND "imageUrl" LIKE '%/files/%'`
    );
    
    let pagesUpdated = 0;
    for (const row of pageResult.rows) {
      const newUrl = convertUrl(row.imageUrl);
      if (newUrl !== row.imageUrl) {
        await client.query(
          `UPDATE pages SET "imageUrl" = $1 WHERE id = $2`,
          [newUrl, row.id]
        );
        pagesUpdated++;
        if (pagesUpdated <= 5) {
          console.log(`  ✓ Page ${row.id}: ${row.imageUrl} → ${newUrl}`);
        }
      }
    }
    console.log(`  Updated ${pagesUpdated} page image URLs\n`);

    // 4. Update users table (profile pictures)
    console.log('👤 Updating user profile pictures...');
    const userResult = await client.query(
      `SELECT id, "profilePicture" FROM users WHERE "profilePicture" IS NOT NULL AND "profilePicture" LIKE '%/files/%'`
    );
    
    let usersUpdated = 0;
    for (const row of userResult.rows) {
      const newUrl = convertUrl(row.profilePicture);
      if (newUrl !== row.profilePicture) {
        await client.query(
          `UPDATE users SET "profilePicture" = $1 WHERE id = $2`,
          [newUrl, row.id]
        );
        console.log(`  ✓ User ${row.id}: ${row.profilePicture} → ${newUrl}`);
        usersUpdated++;
      }
    }
    console.log(`  Updated ${usersUpdated} user profile pictures\n`);

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Manga covers: ${mangaUpdated}`);
    console.log(`  - Volume covers: ${volumesUpdated}`);
    console.log(`  - Page images: ${pagesUpdated}`);
    console.log(`  - User profiles: ${usersUpdated}`);
    console.log(`  - Total: ${mangaUpdated + volumesUpdated + pagesUpdated + usersUpdated}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
console.log('🚀 Starting URL migration to relative paths...\n');
console.log('Database configuration:');
console.log(`  Host: ${DB_CONFIG.host}`);
console.log(`  Port: ${DB_CONFIG.port}`);
console.log(`  Database: ${DB_CONFIG.database}`);
console.log(`  User: ${DB_CONFIG.user}\n`);

migrateUrls().catch(console.error);

