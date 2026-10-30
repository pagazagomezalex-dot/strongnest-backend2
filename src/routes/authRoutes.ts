import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController';

const router = Router();

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

export default router;
