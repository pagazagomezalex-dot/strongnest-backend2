import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (full_name, email, password)' });
  }

  try {
    const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1;', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, full_name, email, created_at;`,
      [full_name, email.toLowerCase(), password_hash]
    );

    const newUser = result.rows[0];

    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: newUser,
      token
    });
  } catch (error: any) {
    console.error('❌ Error en registro:', error.message);
    return res.status(500).json({ error: 'Error al registrar usuario', details: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1;', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at
      },
      token
    });
  } catch (error: any) {
    console.error('❌ Error en login:', error.message);
    return res.status(500).json({ error: 'Error al iniciar sesión', details: error.message });
  }
};