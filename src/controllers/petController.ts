import { Request, Response } from 'express';
import { db } from '../config/database';

export const createOrUpdatePetProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id || null;
    const {
      name, species, breed, birth_date, weight_kg, color_markings,
      microchip_imei, blood_type, is_support_animal, support_type,
      allergies, medical_notes, vet_name, vet_phone, vaccination_record,
      owner_name, contact_phone, secondary_phone, home_address,
      special_observations, is_sterilized, photo_url
    } = req.body;

    const rescueCode = `RESCUE-${microchip_imei || 'SN-PET-' + Date.now()}`;

    // Auto-migración defensiva para Neon DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS pets (
        pet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        owner_id UUID,
        name VARCHAR(100),
        species VARCHAR(50),
        breed VARCHAR(100),
        birth_date DATE,
        weight_kg NUMERIC(5,2),
        color_markings TEXT,
        microchip_imei VARCHAR(50),
        blood_type VARCHAR(20),
        is_support_animal BOOLEAN DEFAULT FALSE,
        support_type VARCHAR(50),
        allergies TEXT,
        medical_notes TEXT,
        vet_name VARCHAR(150),
        vet_phone VARCHAR(50),
        vaccination_record JSONB,
        rescue_code VARCHAR(100),
        owner_name VARCHAR(150),
        contact_phone VARCHAR(50),
        secondary_phone VARCHAR(50),
        home_address TEXT,
        special_observations TEXT,
        is_sterilized BOOLEAN DEFAULT FALSE,
        photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_name VARCHAR(150);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50);
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS home_address TEXT;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS special_observations TEXT;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_sterilized BOOLEAN DEFAULT FALSE;
      ALTER TABLE pets ADD COLUMN IF NOT EXISTS photo_url TEXT;

      -- Tabla para el módulo Pet Care Scheduler (Alarmas)
      CREATE TABLE IF NOT EXISTS pet_reminders (
        reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        dosage_notes TEXT,
        scheduled_time TIME NOT NULL,
        days_of_week VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_microchip_imei_key') THEN 
          ALTER TABLE pets ADD CONSTRAINT pets_microchip_imei_key UNIQUE (microchip_imei); 
        END IF; 
      END $$;
    `);

    const query = `
      INSERT INTO pets (
        user_id, owner_id, name, species, breed, birth_date, weight_kg, color_markings,
        microchip_imei, blood_type, is_support_animal, support_type,
        allergies, medical_notes, vet_name, vet_phone, vaccination_record, rescue_code,
        owner_name, contact_phone, secondary_phone, home_address, special_observations,
        is_sterilized, photo_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (microchip_imei) DO UPDATE SET
        name = EXCLUDED.name,
        species = EXCLUDED.species,
        breed = EXCLUDED.breed,
        weight_kg = EXCLUDED.weight_kg,
        color_markings = EXCLUDED.color_markings,
        medical_notes = EXCLUDED.medical_notes,
        vaccination_record = EXCLUDED.vaccination_record,
        owner_name = EXCLUDED.owner_name,
        contact_phone = EXCLUDED.contact_phone,
        secondary_phone = EXCLUDED.secondary_phone,
        home_address = EXCLUDED.home_address,
        special_observations = EXCLUDED.special_observations,
        is_sterilized = EXCLUDED.is_sterilized,
        photo_url = EXCLUDED.photo_url,
        updated_at = NOW()
      RETURNING *;
    `;

    const jsonVaccines = typeof vaccination_record === 'string' 
      ? vaccination_record 
      : JSON.stringify(vaccination_record || []);

    const values = [
      userId, userId, name || 'Mascota', species || 'Canino', breed || null,
      birth_date || null, weight_kg || null, color_markings || null,
      microchip_imei || `SN-PET-${Date.now()}`, blood_type || null,
      is_support_animal || false, support_type || null, allergies || null,
      medical_notes || null, vet_name || null, vet_phone || null,
      jsonVaccines, rescueCode, owner_name || null, contact_phone || null,
      secondary_phone || null, home_address || null, special_observations || null,
      is_sterilized || false, photo_url || null
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Ficha médica y de rescate actualizada exitosamente 🐾',
      pet: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al guardar perfil de mascota:', error);
    res.status(500).json({ error: error.message || 'Error interno al registrar la mascota' });
  }
};

export const getRescueProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rescue_code } = req.params;
    const result = await db.query(
      `SELECT name, species, breed, color_markings, blood_type, is_support_animal, 
              support_type, allergies, medical_notes, vet_name, vet_phone, vaccination_record,
              owner_name, contact_phone, secondary_phone, home_address, special_observations,
              is_sterilized, photo_url, rescue_code 
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
