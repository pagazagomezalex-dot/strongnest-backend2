import { Router } from 'express';
import { sendTelemetry, ingestTelemetry, getLatestTelemetry } from '../controllers/telemetryController';

const router = Router();

// Endpoints de Ingesta GPS y Consulta
router.post('/telemetry', sendTelemetry);
router.post('/telemetry/ingest', ingestTelemetry);
router.post('/telemetry/data', sendTelemetry);

router.get('/telemetry/:pet_id/latest', getLatestTelemetry);
router.get('/telemetry/:pet_id', getLatestTelemetry);

export default router;
