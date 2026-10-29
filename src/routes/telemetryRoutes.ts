import { Router } from 'express';
import { 
  ingestTelemetry, 
  getLatestLocation, 
  getLocationHistory 
} from '../controllers/telemetryController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint de ingesta de pings (usado por tarjetas SIM/eSIM IoT y simuladores)
router.post('/telemetry/ingest', ingestTelemetry);

// Endpoints consultados por la App Móvil (protegidos con Token JWT)
router.get('/pets/:pet_id/location', authMiddleware, getLatestLocation);
router.get('/pets/:pet_id/history', authMiddleware, getLocationHistory);

export default router;
