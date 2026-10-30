import { Router } from 'express';
import { createPet, getUserPets, getPetById } from '../controllers/petController';

const router = Router();

router.post('/pets', createPet);
router.get('/pets/owner/:owner_id', getUserPets);
router.get('/pets/:pet_id', getPetById);

export default router;
