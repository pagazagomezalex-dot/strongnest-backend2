import { Request, Response } from 'express';
import { db } from '../config/database';

// 1. Crear o actualizar registro de mascota
export const createPet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, owner_id, name, species, breed, age_years, device_id } = req.body;

    if (!pet_id || !name) {
      res.status(400).json({ error: 'Faltan parámetros obligatorios: pet_id, name' });
      return;
    }

    // Verificación defensiva de la tabla en Neon DB
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS pets (
          pet_id VARCHAR(100) PRIMARY KEY,
          owner_id VARCHAR(100),
          name VARCHAR(100) NOT NULL,
          species VARCHAR(50) DEFAULT 'DOG',
          breed VARCHAR(100) DEFAULT 'Mestizo',
          age_years INT DEFAULT 2,
          device_id VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_id VARCHAR(100);`).catch(() => {});
      await db.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS species VARCHAR(50) DEFAULT 'DOG';`).catch(() => {});
      await db.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS breed VARCHAR(100) DEFAULT 'Mestizo';`).catch(() => {});
      await db.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS age_years INT DEFAULT 2;`).catch(() => {});
      await db.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);`).catch(() => {});
    } catch (e) {
      console.log('Aviso de esquema pets:', e);
    }

    const queryUpsert = `
      INSERT INTO pets (pet_id, owner_id, name, species, breed, age_years, device_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (pet_id) DO UPDATE 
      SET name = EXCLUDED.name, breed = EXCLUDED.breed, device_id = EXCLUDED.device_id
      RETURNING *;
    `;

    const result = await db.query(queryUpsert, [
      String(pet_id),
      owner_id ? String(owner_id) : null,
      String(name),
      species ? String(species) : 'DOG',
      breed ? String(breed) : 'Mestizo',
      age_years ? parseInt(String(age_years), 10) : 2,
      device_id ? String(device_id) : String(pet_id)
    ]);

    res.status(201).json({
      message: 'Mascota registrada con éxito en KIN-O 🐾',
      pet: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al crear mascota:', error);
    res.status(500).json({ error: error.message || 'Error interno al crear mascota' });
  }
};

// 2. Obtener mascotas de un tutor
export const getUserPets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner_id } = req.params;
    const result = await db.query(`SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC;`, [owner_id]);
    res.status(200).json({
      count: result.rows.length,
      pets: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar mascotas:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
};

// 3. Obtener mascota por su ID único
export const getPetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;
    const result = await db.query(`SELECT * FROM pets WHERE pet_id = $1;`, [pet_id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Mascota no encontrada' });
      return;
    }
    res.status(200).json({ pet: result.rows });
  } catch (error: any) {
    console.error('❌ Error al obtener mascota:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
};
