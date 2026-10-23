import { Router } from 'express';
import { createPet, getMyPets } from '../controllers/petController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/', createPet);
router.get('/', getMyPets);

export default router;