import { Request, Response } from 'express';
import { db } from '../config/database';

export const createOrUpdatePetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const {
      name, species, breed, birth_date, weight_kg, color_markings,
      microchip_imei, blood_type, is_support_animal, support_type,
      allergies, medical_notes, vet_name, vet_phone, vaccination_record
    } = req.body;

    const rescueCode = `RESCUE-${microchip_imei || 'SN-PET-' + Date.now()}`;

    // Auto-migración defensiva para garantizar que la tabla tenga TODAS las columnas en Neon DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS pets (
        pet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        name VARCHAR(100),
        species VARCHAR(50),
        breed VARCHAR(100),
        birth_date DATE,
        weight_kg NUMERIC(5,2),
        color_markings TEXT,
        microchip_imei VARCHAR(50) UNIQUE,
        blood_type VARCHAR(20),
        is_support_animal BOOLEAN DEFAULT FALSE,
        support_type VARCHAR(50),
        allergies TEXT,
        medical_notes TEXT,
        vet_name VARCHAR(150),
        vet_phone VARCHAR(50),
        vaccination_record JSONB,
        rescue_code VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE pets ADD COLUMN IF NOT EXISTS user_id UUID;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS species VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS breed VARCHAR(100);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS birth_date DATE;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS color_markings TEXT;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS microchip_imei VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_support_animal BOOLEAN DEFAULT FALSE;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS support_type VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS allergies TEXT;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS medical_notes TEXT;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS vet_name VARCHAR(150);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS vet_phone VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS vaccination_record JSONB;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS rescue_code VARCHAR(100);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    `);

    const query = `
      INSERT INTO pets (
        user_id, name, species, breed, birth_date, weight_kg, color_markings,
        microchip_imei, blood_type, is_support_animal, support_type,
        allergies, medical_notes, vet_name, vet_phone, vaccination_record, rescue_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (microchip_imei) DO UPDATE SET
        name = EXCLUDED.name,
        weight_kg = EXCLUDED.weight_kg,
        medical_notes = EXCLUDED.medical_notes,
        vaccination_record = EXCLUDED.vaccination_record,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      userId || null, name, species, breed, birth_date || null, weight_kg || null, color_markings,
      microchip_imei, blood_type, is_support_animal || false, support_type,
      allergies, medical_notes, vet_name, vet_phone, JSON.stringify(vaccination_record || []), rescueCode
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Ficha médica y de rescate registrada exitosamente 🐾',
      pet: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al guardar perfil de mascota:', error.message);
    res.status(500).json({ error: error.message || 'Error interno al registrar la mascota' });
  }
};

export const getMyPets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const result = await db.query('SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at DESC;', [userId]);
    res.status(200).json({ pets: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRescueProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rescue_code } = req.params;
    const result = await db.query(
      `SELECT name, species, breed, color_markings, blood_type, is_support_animal, 
              support_type, allergies, medical_notes, vet_name, vet_phone, vaccination_record 
       FROM pets WHERE rescue_code = $1;`,
      [rescue_code]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ficha de rescate no encontrada' });
      return;
    }

    res.status(200).json({
      title: 'FICHA PÚBLICA DE RESCATE - STRONGNEST PETS 🐾',
      rescue_info: result.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
