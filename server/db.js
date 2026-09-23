const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbInstance = null;

if (process.env.DATABASE_URL) {
  // Use Neon / Standard PostgreSQL
  const { Pool } = require('pg');
  console.log('🔗 Connecting to remote PostgreSQL via DATABASE_URL...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  dbInstance = {
    query: (text, params) => pool.query(text, params),
    pool,
    isNeon: true
  };
} else {
  // Use Embedded PostgreSQL engine (PGlite WASM) - zero config, 100% native PostgreSQL compatibility
  const { PGlite } = require('@electric-sql/pglite');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`📦 Using embedded PostgreSQL engine (PGlite) at ${dataDir}`);
  const pglite = new PGlite(dataDir);

  dbInstance = {
    query: async (text, params) => {
      try {
        if (!params || params.length === 0) {
          // If multiple statements present (e.g. multiple semicolons), use exec
          if (text.includes(';') && text.trim().split(';').filter(s => s.trim().length > 0).length > 1) {
            await pglite.exec(text);
            return { rows: [], rowCount: 0 };
          }
        }
        const result = await pglite.query(text, params || []);
        return {
          rows: result.rows || [],
          rowCount: result.rows ? result.rows.length : (result.affectedRows || 0)
        };
      } catch (err) {
        console.error('Database query error:', err.message, '\nQuery:', text);
        throw err;
      }
    },
    exec: async (sql) => {
      return await pglite.exec(sql);
    },
    pglite,
    isNeon: false
  };
}

module.exports = dbInstance;
