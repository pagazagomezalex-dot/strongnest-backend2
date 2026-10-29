import { Request, Response } from 'express';
import { db } from '../config/database';

// Función matemática auxiliar: Fórmula de Haversine para calcular distancia en metros entre dos puntos GPS
const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 1. Crear una Zona Segura (Geocerca) para una mascota
export const createGeofence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, name, center_latitude, center_longitude, radius_meters } = req.body;

    if (!name || !center_latitude || !center_longitude || !radius_meters) {
      res.status(400).json({ error: 'Faltan campos obligatorios para la geocerca' });
      return;
    }

    // Actualización de la estructura de la tabla geofences en Neon DB
    await db.query(`
      DROP TABLE IF EXISTS geofences CASCADE;
      CREATE TABLE geofences (
        geofence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id VARCHAR(100),
        name VARCHAR(100) NOT NULL,
        center_latitude NUMERIC(10, 8) NOT NULL,
        center_longitude NUMERIC(11, 8) NOT NULL,
        radius_meters INT NOT NULL DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const query = `
      INSERT INTO geofences (pet_id, name, center_latitude, center_longitude, radius_meters)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const targetPetId = pet_id ? String(pet_id) : 'PRUEBA_MASCOTA_1';

    const result = await db.query(query, [
      targetPetId,
      name,
      center_latitude,
      center_longitude,
      radius_meters
    ]);

    res.status(201).json({
      message: 'Zona segura (Geocerca) creada con éxito 🛡️📍',
      geofence: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al crear geocerca:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 2. Obtener todas las geocercas activas de una mascota
export const getPetGeofences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;

    const result = await db.query(
      `SELECT * FROM geofences WHERE pet_id = $1 AND is_active = TRUE;`,
      [pet_id]
    );

    res.status(200).json({
      count: result.rows.length,
      geofences: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar geocercas:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// 3. Evaluar si la ubicación actual de la mascota está dentro o fuera de sus geocercas
export const checkGeofenceBreach = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, current_latitude, current_longitude } = req.body;

    if (!current_latitude || !current_longitude) {
      res.status(400).json({ error: 'Faltan parámetros: current_latitude, current_longitude' });
      return;
    }

    const targetPetId = pet_id ? String(pet_id) : 'PRUEBA_MASCOTA_1';

    const geofencesResult = await db.query(
      `SELECT * FROM geofences WHERE pet_id = $1 AND is_active = TRUE;`,
      [targetPetId]
    );

    if (geofencesResult.rows.length === 0) {
      res.status(200).json({ message: 'La mascota no tiene zonas seguras configuradas' });
      return;
    }

    const evaluations = geofencesResult.rows.map((fence: any) => {
      const distance = calculateDistanceMeters(
        Number(current_latitude),
        Number(current_longitude),
        Number(fence.center_latitude),
        Number(fence.center_longitude)
      );

      const isInside = distance <= Number(fence.radius_meters);

      return {
        geofence_id: fence.geofence_id,
        geofence_name: fence.name,
        radius_meters: Number(fence.radius_meters),
        distance_meters: Math.round(distance),
        status: isInside ? 'SAFE' : 'OUT_OF_BOUNDS_ALERT'
      };
    });

    const hasBreach = evaluations.some((ev) => ev.status === 'OUT_OF_BOUNDS_ALERT');

    res.status(200).json({
      pet_id: targetPetId,
      alert_status: hasBreach ? 'CRITICAL_ALERT_BREACH' : 'ALL_SAFE',
      evaluations
    });
  } catch (error: any) {
    console.error('❌ Error al evaluar geocercas:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};
