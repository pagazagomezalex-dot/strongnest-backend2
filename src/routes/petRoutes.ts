iimport { Router } from 'express';
import { createOrUpdatePetProfile, getMyPets, getRescueProfile } from '../controllers/petController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// 1. Ruta pública para escaneo QR de emergencia (sin token JWT)
router.get('/rescue/:rescue_code', getRescueProfile);

// 2. Rutas privadas (requieren token JWT)
router.post('/profile', authMiddleware, createOrUpdatePetProfile);
router.get('/my-pets', authMiddleware, getMyPets);

export default router;
