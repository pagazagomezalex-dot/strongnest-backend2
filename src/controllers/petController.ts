import { Request, Response } from 'express';
import { db } from '../config/database';

export const createPet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, owner_id, name, species, breed, age_years, device_id } = req.body;

    if (!pet_id || !name) {
      res.status(400).json({ error: 'Faltan parámetros obligatorios: pet_id, name' });
      return;
    }

    // 1. Asegurar tabla pets en Neon DB
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
    `).catch(() => {});

    const alterQueries = [
      `ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_id VARCHAR(100);`,
      `ALTER TABLE pets ADD COLUMN IF NOT EXISTS species VARCHAR(50) DEFAULT 'DOG';`,
      `ALTER TABLE pets ADD COLUMN IF NOT EXISTS breed VARCHAR(100) DEFAULT 'Mestizo';`,
      `ALTER TABLE pets ADD COLUMN IF NOT EXISTS age_years INT DEFAULT 2;`,
      `ALTER TABLE pets ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);`
    ];

    for (const q of alterQueries) {
      await db.query(q).catch(() => {});
    }

    const targetPetId = String(pet_id).trim();
    const targetName = String(name).trim();
    const targetOwnerId = owner_id ? String(owner_id).trim() : null;
    const targetSpecies = species ? String(species).trim() : 'DOG';
    const targetBreed = breed ? String(breed).trim() : 'Mestizo';
    const targetAge = age_years ? parseInt(String(age_years), 10) : 2;
    const targetDeviceId = device_id ? String(device_id).trim() : targetPetId;

    let result;
    try {
      result = await db.query(
        `INSERT INTO pets (pet_id, owner_id, name, species, breed, age_years, device_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (pet_id) DO UPDATE 
         SET name = EXCLUDED.name, breed = EXCLUDED.breed, device_id = EXCLUDED.device_id
         RETURNING *;`,
        [targetPetId, targetOwnerId, targetName, targetSpecies, targetBreed, targetAge, targetDeviceId]
      );
    } catch (insertErr) {
      await db.query(`DELETE FROM pets WHERE pet_id = $1;`, [targetPetId]).catch(() => {});
      result = await db.query(
        `INSERT INTO pets (pet_id, owner_id, name, species, breed, age_years, device_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *;`,
        [targetPetId, targetOwnerId, targetName, targetSpecies, targetBreed, targetAge, targetDeviceId]
      );
    }

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Mascota registrada con éxito en KIN-O 🐾',
      pet: result.rows[0] || result.rows
    });
  } catch (error: any) {
    console.error('❌ Error en createPet:', error);
    res.status(200).json({
      status: 'ERROR',
      message: 'Detalle de base de datos en registro de mascota',
      detail: error.message || String(error)
    });
  }
};

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
    res.status(200).json({ status: 'ERROR', detail: error.message });
  }
};

export const getPetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;
    const result = await db.query(`SELECT * FROM pets WHERE pet_id = $1;`, [pet_id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Mascota no encontrada' });
      return;
    }
    res.status(200).json({ pet: result.rows[0] || result.rows });
  } catch (error: any) {
    console.error('❌ Error al obtener mascota:', error);
    res.status(200).json({ status: 'ERROR', detail: error.message });
  }
};
