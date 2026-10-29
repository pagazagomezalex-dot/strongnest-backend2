import { Request, Response } from 'express';
import { db } from '../config/database';

// 1. Registrar una vacuna o desparasitación
export const addMedicalRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, record_type, title, description, administered_date, next_due_date } = req.body;

    if (!pet_id || !title || !record_type) {
      res.status(400).json({ error: 'Faltan parámetros obligatorios: pet_id, record_type, title' });
      return;
    }

    // Auto-migración defensiva
    await db.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id VARCHAR(100) NOT NULL,
        record_type VARCHAR(50) NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        administered_date DATE DEFAULT CURRENT_DATE,
        next_due_date DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const query = `
      INSERT INTO medical_records (pet_id, record_type, title, description, administered_date, next_due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await db.query(query, [
      String(pet_id),
      record_type,
      title,
      description || null,
      administered_date || new Date(),
      next_due_date || null
    ]);

    res.status(201).json({
      message: 'Registro médico guardado con éxito 🩺',
      medical_record: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al guardar registro médico:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 2. Obtener el historial médico completo de una mascota
export const getPetMedicalHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT * FROM medical_records WHERE pet_id = $1 ORDER BY administered_date DESC;`,
      [pet_id]
    );

    res.status(200).json({
      count: result.rows.length,
      history: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar historial médico:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
