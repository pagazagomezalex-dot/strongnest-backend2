import { Router } from 'express';
import { 
  createGeofence, 
  getPetGeofences, 
  checkGeofenceBreach 
} from '../controllers/geofenceController';

const router = Router();

// Endpoints de Zonas Seguras
router.post('/geofences', createGeofence);
router.get('/pets/:pet_id/geofences', getPetGeofences);
router.post('/geofences/check', checkGeofenceBreach);

export default router;
