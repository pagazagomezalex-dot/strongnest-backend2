import { Request, Response } from 'express';
import { db } from '../config/database';

export const sendTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, latitude, longitude, battery_level, speed, sat_count, device_id } = req.body;

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
        device_id VARCHAR(100),
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const targetPetId = String(pet_id).trim();
    const targetLat = parseFloat(String(latitude));
    const targetLng = parseFloat(String(longitude));
    const targetBattery = battery_level !== undefined ? parseInt(String(battery_level), 10) : 100;
    const targetSpeed = speed !== undefined ? parseFloat(String(speed)) : 0.0;
    const targetSat = sat_count !== undefined ? parseInt(String(sat_count), 10) : 10;
    const targetDeviceId = device_id ? String(device_id).trim() : targetPetId;

    const query = `
      INSERT INTO telemetry (pet_id, latitude, longitude, battery_level, speed, sat_count, device_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await db.query(query, [
      targetPetId, targetLat, targetLng, targetBattery, targetSpeed, targetSat, targetDeviceId
    ]);

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Telemetría GPS registrada con éxito en KIN-O 📡',
      telemetry: result.rows
    });
  } catch (error: any) {
    try {
      // Recreación limpia si la tabla legacy tenía conflicto de columnas
      await db.query(`DROP TABLE IF EXISTS telemetry;`);
      await db.query(`
        CREATE TABLE telemetry (
          telemetry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pet_id VARCHAR(100) NOT NULL,
          latitude NUMERIC(10, 7) NOT NULL,
          longitude NUMERIC(10, 7) NOT NULL,
          battery_level INT DEFAULT 100,
          speed NUMERIC(5, 2) DEFAULT 0.0,
          sat_count INT DEFAULT 10,
          device_id VARCHAR(100),
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const targetPetId = String(req.body.pet_id).trim();
      const targetLat = parseFloat(String(req.body.latitude));
      const targetLng = parseFloat(String(req.body.longitude));
      const targetBattery = req.body.battery_level !== undefined ? parseInt(String(req.body.battery_level), 10) : 100;
      const targetSpeed = req.body.speed !== undefined ? parseFloat(String(req.body.speed)) : 0.0;
      const targetSat = req.body.sat_count !== undefined ? parseInt(String(req.body.sat_count), 10) : 10;
      const targetDeviceId = req.body.device_id ? String(req.body.device_id).trim() : targetPetId;

      const retryResult = await db.query(
        `INSERT INTO telemetry (pet_id, latitude, longitude, battery_level, speed, sat_count, device_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
        [targetPetId, targetLat, targetLng, targetBattery, targetSpeed, targetSat, targetDeviceId]
      );

      res.status(201).json({
        status: 'SUCCESS',
        message: 'Telemetría GPS registrada con éxito en KIN-O (Esquema actualizado) 📡',
        telemetry: retryResult.rows
      });
    } catch (retryErr: any) {
      console.error('❌ Error en sendTelemetry:', retryErr);
      res.status(500).json({ error: retryErr.message || 'Error al guardar telemetría' });
    }
  }
};

export const ingestTelemetry = sendTelemetry;

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
      latest_telemetry: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al obtener telemetría:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
};
