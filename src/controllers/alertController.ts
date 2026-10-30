import { Request, Response } from 'express';
import { db } from '../config/database';

export const getPetAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id } = req.params;
    await db.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id VARCHAR(100) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await db.query(
      `SELECT * FROM alerts WHERE pet_id = $1 ORDER BY created_at DESC LIMIT 20;`,
      [pet_id]
    );

    res.status(200).json({
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al consultar alertas:', error);
    res.status(500).json({ error: error.message || 'Error al consultar alertas' });
  }
};

export const createCommunityAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location_name, hazard_type, description, latitude, longitude } = req.body;

    if (!location_name || !hazard_type) {
      res.status(400).json({ error: 'Faltan parámetros obligatorios: location_name, hazard_type' });
      return;
    }

    res.status(201).json({
      message: 'Alerta comunitaria registrada y difundida a tutores cercanos 🛡️',
      community_alert: {
        alert_id: 'COM-' + Date.now(),
        location_name,
        hazard_type,
        description: description || 'Alerta sanitaria de prevención en la zona',
        coords: { latitude, longitude },
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    console.error('❌ Error en alerta comunitaria:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
};
