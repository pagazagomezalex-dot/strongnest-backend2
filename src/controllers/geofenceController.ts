import { Request, Response } from 'express';
import { db } from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
  };
}

// 1. Crear o actualizar perfil de mascota
export const createOrUpdatePetProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    const { 
      pet_id, name, species, breed, age, weight, 
      medical_notes, emergency_contact, is_lost 
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'El nombre de la mascota es obligatorio' });
      return;
    }

    // Auto-migración defensiva para la tabla pets en Neon DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS pets (
        pet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        species VARCHAR(50) DEFAULT 'Dog',
        breed VARCHAR(100),
        age INT,
        weight NUMERIC(5, 2),
        medical_notes TEXT,
        emergency_contact VARCHAR(100),
        is_lost BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (pet_id) {
      // Actualizar perfil existente
      const updateQuery = `
        UPDATE pets 
        SET name = $1, species = $2, breed = $3, age = $4, weight = $5, 
            medical_notes = $6, emergency_contact = $7, is_lost = $8, updated_at = CURRENT_TIMESTAMP
        WHERE pet_id = $9
        RETURNING *;
      `;
      const result = await db.query(updateQuery, [
        name, species || 'Dog', breed || null, age || null, weight || null,
        medical_notes || null, emergency_contact || null, is_lost || false,
        pet_id
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Mascota no encontrada' });
        return;
      }

      res.status(200).json({
        message: 'Perfil de mascota actualizado con éxito 🐾',
        pet: result.rows
      });
    } else {
      // Crear nuevo perfil
      const insertQuery = `
        INSERT INTO pets (user_id, name, species, breed, age, weight, medical_notes, emergency_contact, is_lost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const result = await db.query(insertQuery, [
        user_id || null, name, species || 'Dog', breed || null, age || null, weight || null,
        medical_notes || null, emergency_contact || null, is_lost || false
      ]);

      res.status(201).json({
        message: 'Perfil de mascota creado con éxito 🐾',
        pet: result.rows
      });
    }
  } catch (error: any) {
    console.error('❌ Error en createOrUpdatePetProfile:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 2. Obtener todas las mascotas del usuario autenticado
export const getMyPets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.user_id;

    const result = await db.query(
      `SELECT * FROM pets ${user_id ? 'WHERE user_id = $1' : ''} ORDER BY created_at DESC;`,
      user_id ? [user_id] : []
    );

    res.status(200).json({
      count: result.rows.length,
      pets: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error en getMyPets:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 3. Obtener perfil público de rescate / Ficha Médica QR
export const getRescueProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT pet_id, name, species, breed, age, weight, medical_notes, emergency_contact, is_lost 
       FROM pets WHERE pet_id = $1;`,
      [pet_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ficha de rescate no encontrada' });
      return;
    }

    res.status(200).json({
      rescue_profile: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error en getRescueProfile:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
