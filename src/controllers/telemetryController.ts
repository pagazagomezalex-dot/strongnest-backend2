import { Request, Response } from 'express';
import { db } from '../config/database';

// 1. Ingesta de Telemetría GPS
export const sendTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, latitude, longitude, battery_level, speed, sat_count } = req.body;

    if (!pet_id || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Faltan parámetros obligatorios: pet_id, latitude, longitude' });
      return;
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        telemetry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id VARCHAR(100) NOT NULL,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        battery_level INT DEFAULT 100,
        speed NUMERIC(5, 2) DEFAULT 0.0,
        sat_count INT DEFAULT 10,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const query = `
      INSERT INTO telemetry (pet_id, latitude, longitude, battery_level, speed, sat_count)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await db.query(query, [
      String(pet_id),
      latitude,
      longitude,
      battery_level || 100,
      speed || 0.0,
      sat_count || 10
    ]);

    res.status(201).json({
      message: 'Telemetría GPS registrada con éxito en KIN-O 📡',
      telemetry: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al guardar telemetría:', error);
    res.status(500).json({ error: error.message || 'Error interno al guardar telemetría' });
  }
};

// Alias explícito de exportación para compatibilidad
export const ingestTelemetry = sendTelemetry;

// 2. Obtener la última posición GPS conocida
export const getLatestTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT * FROM telemetry WHERE pet_id = $1 ORDER BY timestamp DESC LIMIT 1;`,
      [pet_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No hay registros de telemetría para esta mascota' });
      return;
    }

    res.status(200).json({
      latest_telemetry: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Error al obtener telemetría:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
};
