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
      userId, name, species, breed, birth_date, weight_kg, color_markings,
      microchip_imei, blood_type, is_support_animal, support_type,
      allergies, medical_notes, vet_name, vet_phone, JSON.stringify(vaccination_record || []), rescueCode
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Ficha médica y de rescate registrada exitosamente 🐾',
      pet: result.rows[0]
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
      rescue_info: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
