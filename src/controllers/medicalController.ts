import { Request, Response } from 'express';
import { db } from '../config/database';

// 1. Registrar una nueva atención o consulta médica
export const createMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      pet_id, visit_date, reason, diagnosis, treatment_prescribed, 
      vet_name, clinic_name, cost_mxn, attachment_url 
    } = req.body;

    if (!pet_id || !visit_date || !reason) {
      res.status(400).json({ error: 'Faltan campos obligatorios: pet_id, visit_date, reason' });
      return;
    }

    // Auto-migración defensiva para Neon DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS pet_medical_records (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
        visit_date DATE NOT NULL,
        reason VARCHAR(150) NOT NULL,
        diagnosis TEXT,
        treatment_prescribed TEXT,
        vet_name VARCHAR(150),
        clinic_name VARCHAR(150),
        cost_mxn NUMERIC(8,2),
        attachment_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const query = `
      INSERT INTO pet_medical_records (
        pet_id, visit_date, reason, diagnosis, treatment_prescribed, 
        vet_name, clinic_name, cost_mxn, attachment_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      pet_id, visit_date, reason, diagnosis || null, treatment_prescribed || null,
      vet_name || null, clinic_name || null, cost_mxn || null, attachment_url || null
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Atención médica registrada exitosamente en el expediente 🩺🐾',
      record: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al crear historial médico:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 2. Obtener la bitácora médica completa de una mascota
export const getPetMedicalRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT * FROM pet_medical_records WHERE pet_id = $1 ORDER BY visit_date DESC;`,
      [pet_id]
    );

    res.status(200).json({
      medical_history: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar historial médico:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 3. Eliminar una entrada del historial médico
export const deleteMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { record_id } = req.params;

    await db.query(`DELETE FROM pet_medical_records WHERE record_id = $1;`, [record_id]);

    res.status(200).json({ message: 'Registro médico eliminado correctamente 🗑️' });
  } catch (error: any) {
    console.error('❌ Error al eliminar registro médico:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
