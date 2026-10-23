import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.on('connect', () => {
  console.log('⚡ Conexión establecida con la base de datos PostgreSQL');
});

db.on('error', (err) => {
  console.error('❌ Error en el cliente de PostgreSQL:', err);
});