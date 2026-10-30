import { Router } from 'express';
import { createPet, getUserPets, getPetById } from '../controllers/petController';

const router = Router();

// Alias de compatibilidad para creación y consulta de mascotas
router.post('/pets', createPet);
router.post('/pets/register', createPet);
router.post('/pet', createPet);

router.get('/pets/owner/:owner_id', getUserPets);
router.get('/pets/:pet_id', getPetById);

export default router;
