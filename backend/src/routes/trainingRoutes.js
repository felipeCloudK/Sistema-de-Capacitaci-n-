import { Router } from 'express';
import { uploadCertificate } from '../middlewares/uploadCertificate.js';
import {
  listTrainings,
  getTraining,
  createTraining,
  replaceTrainingCertificate,
  deleteTraining,
} from '../controllers/trainingController.js';

const router = Router();

router.get('/', listTrainings);
router.get('/:id', getTraining);
router.post('/', uploadCertificate.single('certificado'), createTraining);
router.put('/:id', uploadCertificate.single('certificado'), replaceTrainingCertificate);
router.delete('/:id', deleteTraining);

export default router;
