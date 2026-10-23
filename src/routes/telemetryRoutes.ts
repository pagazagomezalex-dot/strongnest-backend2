import { Router } from 'express';
import { receiveTelemetryPing, getLatestLocation, getPetHistory } from '../controllers/telemetryController';

const router = Router();

router.post('/ping', receiveTelemetryPing);
router.get('/:petId/latest', getLatestLocation);
router.get('/:petId/history', getPetHistory);

export default router;