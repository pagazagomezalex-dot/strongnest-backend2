import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { db } from '../config/database';

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

export const createGeofence = async (req: AuthenticatedRequest, res: Response) => {
  const { pet_id, name, center_lat, center_lng, radius_meters } = req.body;

  if (!pet_id || !center_lat || !center_lng || !radius_meters) {
    return res.status(400).json({ error: 'pet_id, centro (lat/lng) y radio en metros son obligatorios' });
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS geofences (
        geofence_id BIGSERIAL PRIMARY KEY,
        pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
        name VARCHAR(100) DEFAULT 'Zona Segura',
        center_lat DECIMAL(10, 8) NOT NULL,
        center_lng DECIMAL(11, 8) NOT NULL,
        radius_meters INT NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await db.query(
      `INSERT INTO geofences (pet_id, name, center_lat, center_lng, radius_meters)
       VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [pet_id, name || 'Casa / Zona Segura', center_lat, center_lng, radius_meters]
    );

    return res.status(201).json({
      message: '🛡️ Geocerca creada con éxito',
      geofence: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Error al crear geocerca:', error.message);
    return res.status(500).json({ error: 'Error al crear geocerca', details: error.message });
  }
};

// Editar/Modificar radio o centro de una geocerca existente
export const updateGeofence = async (req: AuthenticatedRequest, res: Response) => {
  const { geofenceId } = req.params;
  const { name, center_lat, center_lng, radius_meters } = req.body;

  try {
    const existing = await db.query('SELECT * FROM geofences WHERE geofence_id = $1;', [geofenceId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Geocerca no encontrada' });
    }

    const current = existing.rows[0];

    const updatedName = name !== undefined ? name : current.name;
    const updatedLat = center_lat !== undefined ? center_lat : current.center_lat;
    const updatedLng = center_lng !== undefined ? center_lng : current.center_lng;
    const updatedRadius = radius_meters !== undefined ? radius_meters : current.radius_meters;

    const result = await db.query(
      `UPDATE geofences
       SET name = $1, center_lat = $2, center_lng = $3, radius_meters = $4
       WHERE geofence_id = $5
       RETURNING *;`,
      [updatedName, updatedLat, updatedLng, updatedRadius, geofenceId]
    );

    return res.status(200).json({
      message: '⚙️ Radio/Geocerca actualizada con éxito',
      geofence: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar geocerca:', error.message);
    return res.status(500).json({ error: 'Error al actualizar geocerca', details: error.message });
  }
};

export const checkGeofenceStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { petId } = req.params;

  try {
    const locRes = await db.query(
      `SELECT t.latitude, t.longitude, p.name FROM pets p
       JOIN telemetry_logs t ON p.device_imei = t.device_imei
       WHERE p.pet_id = $1 ORDER BY t.recorded_at DESC LIMIT 1;`,
      [petId]
    );

    if (locRes.rows.length === 0) {
      return res.status(404).json({ error: 'No hay coordenadas registradas para esta mascota' });
    }

    const { latitude, longitude, name } = locRes.rows[0];
    const geoRes = await db.query('SELECT * FROM geofences WHERE pet_id = $1 ORDER BY geofence_id DESC LIMIT 1;', [petId]);

    if (geoRes.rows.length === 0) {
      return res.status(200).json({ status: 'NO_GEOFENCE', message: 'No hay geocerca configurada para esta mascota' });
    }

    const geofence = geoRes.rows[0];
    const distance = calculateDistanceMeters(
      parseFloat(latitude), parseFloat(longitude),
      parseFloat(geofence.center_lat), parseFloat(geofence.center_lng)
    );

    const isInside = distance <= geofence.radius_meters;

    return res.status(200).json({
      pet_name: name,
      geofence_name: geofence.name,
      distance_from_center_meters: Math.round(distance),
      radius_meters: geofence.radius_meters,
      is_inside: isInside,
      alert: isInside ? '✅ Mascota dentro del perímetro seguro' : '🚨 ALERTA: ¡Mascota fuera de la Zona Segura!'
    });
  } catch (error: any) {
    console.error('❌ Error al evaluar geocerca:', error.message);
    return res.status(500).json({ error: 'Error interno de geocerca', details: error.message });
  }
};