import { Router } from 'express';
import { getPetAlerts, createCommunityAlert } from '../controllers/alertController';

const router = Router();

router.get('/alerts/:pet_id', getPetAlerts);
router.post('/alerts/community', createCommunityAlert);

export default router;
