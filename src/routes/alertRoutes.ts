import { Router } from 'express';
import { getPetAlerts, markAlertAsRead } from '../controllers/alertController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/:petId', getPetAlerts);
router.patch('/:alertId/read', markAlertAsRead);

export default router;