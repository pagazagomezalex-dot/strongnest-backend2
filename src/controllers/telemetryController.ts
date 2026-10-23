import { Request, Response } from 'express';
import { db } from '../config/database';
import { createAlertRecord } from './alertController';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const receiveTelemetryPing = async (req: Request, res: Response) => {
  const { imei, latitude, longitude, positioning_mode, battery_level, speed_kmh } = req.body;

  if (!imei || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'IMEI, latitud y longitud son obligatorios' });
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS telemetry_logs (
        log_id BIGSERIAL PRIMARY KEY,
        device_imei VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        positioning_mode VARCHAR(20) DEFAULT 'GPS',
        battery_level INT DEFAULT 100,
        speed_kmh DECIMAL(5,2) DEFAULT 0.0,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const petRes = await db.query('SELECT pet_id, name FROM pets WHERE device_imei = $1;', [imei]);
    const petName = petRes.rows[0]?.name || 'Mascota';
    const petId = petRes.rows[0]?.pet_id;

    // 1. Guardar el ping de telemetría
    const telemetryResult = await db.query(
      `INSERT INTO telemetry_logs (device_imei, latitude, longitude, positioning_mode, battery_level, speed_kmh)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [imei, latitude, longitude, positioning_mode || 'GPS', battery_level || 100, speed_kmh || 0.0]
    );

    // 2. REGLA 1: Evaluar Alerta de Batería Baja
    if (petId && battery_level !== undefined && battery_level <= 15) {
      await createAlertRecord(
        petId,
        imei,
        'LOW_BATTERY',
        `🔋 Batería crítica en el collar de ${petName} (${battery_level}% restante)`
      );
    }

    // 3. REGLA 2: Evaluar Alerta de Salida de Geocerca
    if (petId) {
      const geoRes = await db.query('SELECT * FROM geofences WHERE pet_id = $1 ORDER BY geofence_id DESC LIMIT 1;', [petId]);
      if (geoRes.rows.length > 0) {
        const geofence = geoRes.rows[0];
        const dist = calculateDistanceMeters(
          parseFloat(latitude), parseFloat(longitude),
          parseFloat(geofence.center_lat), parseFloat(geofence.center_lng)
        );

        if (dist > geofence.radius_meters) {
          await createAlertRecord(
            petId,
            imei,
            'GEOFENCE_EXIT',
            `🚨 ¡ALERTA! ${petName} ha salido de la Zona Segura '${geofence.name}' (A ${Math.round(dist)}m del centro)`
          );
        }
      }
    }

    return res.status(201).json({
      message: `📡 Ping de telemetría recibido para ${petName}`,
      pet_name: petName,
      telemetry: telemetryResult.rows
    });
  } catch (error: any) {
    console.error('❌ Error en ingesta de telemetría:', error.message);
    return res.status(500).json({ error: 'Error al registrar telemetría', details: error.message });
  }
};

export const getLatestLocation = async (req: Request, res: Response) => {
  const { petId } = req.params;

  try {
    const result = await db.query(
      `SELECT t.latitude, t.longitude, t.positioning_mode, t.battery_level, t.speed_kmh, t.recorded_at, p.name AS pet_name
       FROM pets p
       JOIN telemetry_logs t ON p.device_imei = t.device_imei
       WHERE p.pet_id = $1
       ORDER BY t.recorded_at DESC
       LIMIT 1;`,
      [petId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay registros de localización para esta mascota' });
    }

    return res.status(200).json({
      location: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar ubicación:', error.message);
    return res.status(500).json({ error: 'Error al consultar ubicación', details: error.message });
  }
};

export const getPetHistory = async (req: Request, res: Response) => {
  const { petId } = req.params;
  const limit = req.query.limit || 50;

  try {
    const result = await db.query(
      `SELECT t.latitude, t.longitude, t.battery_level, t.speed_kmh, t.recorded_at
       FROM pets p
       JOIN telemetry_logs t ON p.device_imei = t.device_imei
       WHERE p.pet_id = $1
       ORDER BY t.recorded_at DESC
       LIMIT $2;`,
      [petId, limit]
    );

    return res.status(200).json({
      count: result.rows.length,
      history: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al obtener historial:', error.message);
    return res.status(500).json({ error: 'Error interno al consultar historial', details: error.message });
  }
};