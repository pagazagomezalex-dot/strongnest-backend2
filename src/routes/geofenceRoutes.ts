import { Router } from 'express';
import { createGeofence, checkGeofenceStatus, updateGeofence } from '../controllers/geofenceController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createGeofence);
router.get('/:petId/status', checkGeofenceStatus);
router.put('/:geofenceId', updateGeofence);

export default router;