import { Router } from 'express';
import { addMedicalRecord, getPetMedicalHistory } from '../controllers/medicalController';

const router = Router();

// Endpoints de Ficha y Carnet Médico (con alias de compatibilidad de rutas)
router.post('/records', addMedicalRecord);
router.post('/medical/records', addMedicalRecord);

router.get('/records/:pet_id', getPetMedicalHistory);
router.get('/medical/records/:pet_id', getPetMedicalHistory);
router.get('/pets/:pet_id/medical', getPetMedicalHistory);
router.get('/medical/pets/:pet_id', getPetMedicalHistory);

export default router;
