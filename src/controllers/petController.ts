import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { db } from '../config/database';

export const createPet = async (req: AuthenticatedRequest, res: Response) => {
  const { name, species, breed, device_imei } = req.body;
  const owner_id = req.user?.userId;

  if (!name) {
    return res.status(400).json({ error: 'El nombre de la mascota es obligatorio' });
  }

  try {
    const result = await db.query(
      `INSERT INTO pets (owner_id, name, species, breed, device_imei)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [owner_id, name, species || 'dog', breed || null, device_imei || null]
    );

    return res.status(201).json({
      message: 'Mascota registrada con éxito',
      pet: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al registrar mascota:', error.message);
    return res.status(500).json({ error: 'Error interno al registrar mascota', details: error.message });
  }
};

export const getMyPets = async (req: AuthenticatedRequest, res: Response) => {
  const owner_id = req.user?.userId;

  try {
    const result = await db.query(
      'SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC;',
      [owner_id]
    );

    return res.status(200).json({
      count: result.rows.length,
      pets: result.rows
    });
  } catch (error: any) {
    console.error('❌ Error al obtener mascotas:', error.message);
    return res.status(500).json({ error: 'Error interno al obtener mascotas', details: error.message });
  }
};