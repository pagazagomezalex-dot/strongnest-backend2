import { Request, Response } from 'express';
import { db } from '../config/database';
import crypto from 'crypto';

const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Faltan campos obligatorios: email, password, full_name' });
      return;
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const existing = await db.query(`SELECT * FROM users WHERE email = $1;`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado' });
      return;
    }

    const hashedPassword = hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING user_id, email, full_name, created_at;`,
      [email.toLowerCase().trim(), hashedPassword, full_name]
    );

    const newUser = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    res.status(201).json({
      message: 'Usuario registrado con éxito en KIN-O 🔐',
      user: newUser,
      token
    });
  } catch (error: any) {
    console.error('❌ Error en Registro:', error);
    res.status(500).json({ error: error.message || 'Error interno al registrar usuario' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Faltan credenciales: email, password' });
      return;
    }

    const result = await db.query(`SELECT * FROM users WHERE email = $1;`, [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = result.rows[0];
    const hashedPassword = hashPassword(password);

    if (user.password_hash !== hashedPassword) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');

    res.status(200).json({
      message: 'Inicio de sesión exitoso en KIN-O 🚀',
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error: any) {
    console.error('❌ Error en Login:', error);
    res.status(500).json({ error: error.message || 'Error interno en login' });
  }
};
