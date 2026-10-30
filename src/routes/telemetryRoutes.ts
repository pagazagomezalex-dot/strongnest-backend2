import { Router } from 'express';
import { sendTelemetry, getLatestTelemetry } from '../controllers/telemetryController';

const router = Router();

// Alias de compatibilidad para ingesta de telemetría GPS
router.post('/telemetry', sendTelemetry);
router.post('/telemetry/ingest', sendTelemetry);
router.post('/telemetry/data', sendTelemetry);

router.get('/telemetry/:pet_id/latest', getLatestTelemetry);
router.get('/telemetry/:pet_id', getLatestTelemetry);

export default router;
