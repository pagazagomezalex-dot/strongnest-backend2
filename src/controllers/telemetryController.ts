import { Request, Response } from 'express';
import { db } from '../config/database';

// 1. Registrar un ping de telemetría recibido desde el hardware IoT o simulador
export const ingestTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      device_imei, pet_id, latitude, longitude, altitude, 
      battery_level, rssi, positioning_mode, tamper_alert 
    } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Faltan coordenadas obligatorias: latitude, longitude' });
      return;
    }

    // Auto-migración defensiva para Neon DB
    await db.query(`
      CREATE TABLE IF NOT EXISTS device_telemetry (
        telemetry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_imei VARCHAR(50),
        pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
        latitude NUMERIC(10, 8) NOT NULL,
        longitude NUMERIC(11, 8) NOT NULL,
        altitude NUMERIC(6, 2),
        battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
        rssi INT,
        positioning_mode VARCHAR(20) DEFAULT 'GPS',
        tamper_alert BOOLEAN DEFAULT FALSE,
        recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const query = `
      INSERT INTO device_telemetry (
        device_imei, pet_id, latitude, longitude, altitude,
        battery_level, rssi, positioning_mode, tamper_alert
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      device_imei || null,
      pet_id || null,
      latitude,
      longitude,
      altitude || null,
      battery_level || 100,
      rssi || null,
      positioning_mode || 'GPS',
      tamper_alert || false
    ];

    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Ping de telemetría registrado con éxito 📡📍',
      telemetry: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al procesar ping de telemetría:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 2. Obtener la ubicación en vivo más reciente de una mascota
export const getLatestLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT * FROM device_telemetry 
       WHERE pet_id = $1 
       ORDER BY recorded_at DESC 
       LIMIT 1;`,
      [pet_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'No hay registros de ubicación para esta mascota' });
      return;
    }

    res.status(200).json({
      location: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al obtener ubicación actual:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 3. Obtener el historial de trayectorias / ruta recorrida
export const getLocationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;
    const limitStr = req.query.limit ? String(req.query.limit) : '50';
    const limitNum = parseInt(limitStr, 10) || 50;

    const result = await db.query(
      `SELECT * FROM device_telemetry 
       WHERE pet_id = $1 
       ORDER BY recorded_at DESC 
       LIMIT $2;`,
      [pet_id, limitNum]
    );

    res.status(200).json({
      count: result.rows.length,
      history: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al obtener historial de ubicación:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
