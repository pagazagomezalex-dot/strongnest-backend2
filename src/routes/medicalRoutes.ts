import { Router } from 'express';
import { 
  createMedicalRecord, 
  getPetMedicalRecords, 
  deleteMedicalRecord 
} from '../controllers/medicalController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/medical-records', authMiddleware, createMedicalRecord);
router.get('/medical-records/:pet_id', authMiddleware, getPetMedicalRecords);
router.delete('/medical-records/:record_id', authMiddleware, deleteMedicalRecord);

export default router;
