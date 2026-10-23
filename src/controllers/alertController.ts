import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { db } from '../config/database';

// Función auxiliar exportada para generar alertas automáticas desde telemetría
export const createAlertRecord = async (
  pet_id: string,
  device_imei: string,
  type: 'LOW_BATTERY' | 'GEOFENCE_EXIT' | 'SOS',
  message: string
) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id BIGSERIAL PRIMARY KEY,
        pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
        device_imei VARCHAR(50) NOT NULL,
        type VARCHAR(30) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Evitar duplicar la misma alerta en un lapso menor a 10 minutos
    const recentAlert = await db.query(
      `SELECT alert_id FROM alerts
       WHERE pet_id = $1 AND type = $2 AND is_read = FALSE
       AND created_at > NOW() - INTERVAL '10 minutes';`,
      [pet_id, type]
    );

    if (recentAlert.rows.length === 0) {
      await db.query(
        `INSERT INTO alerts (pet_id, device_imei, type, message)
         VALUES ($1, $2, $3, $4);`,
        [pet_id, device_imei, type, message]
      );
      console.log(`🚨 [ALERTA GENERADA EN BD] ${type} para IMEI ${device_imei}: ${message}`);
    }
  } catch (error: any) {
    console.error('❌ Error al guardar alerta automática:', error.message);
  }
};

// Consultar el buzón de alertas de una mascota para la App Móvil
export const getPetAlerts = async (req: AuthenticatedRequest, res: Response) => {
  const { petId } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM alerts WHERE pet_id = $1 ORDER BY created_at DESC LIMIT 30;`,
      [petId]
    );

    return res.status(200).json({
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar alertas:', error.message);
    return res.status(500).json({ error: 'Error al consultar alertas', details: error.message });
  }
};

// Marcar alerta como leída desde la App
export const markAlertAsRead = async (req: AuthenticatedRequest, res: Response) => {
  const { alertId } = req.params;

  try {
    const result = await db.query(
      `UPDATE alerts SET is_read = TRUE WHERE alert_id = $1 RETURNING *;`,
      [alertId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    return res.status(200).json({
      message: 'Alerta marcada como leída',
      alert: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar alerta:', error.message);
    return res.status(500).json({ error: 'Error al actualizar alerta', details: error.message });
  }
};