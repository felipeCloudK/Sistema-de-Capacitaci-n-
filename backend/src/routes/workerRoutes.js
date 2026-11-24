import { Router } from 'express';
import {
  listWorkers,
  getWorker,
  createWorker,
  updateWorker,
  changeWorkerStatus,
  deleteWorker,
} from '../controllers/workerController.js';

const router = Router();

router.get('/', listWorkers);
router.get('/:id', getWorker);
router.post('/', createWorker);
router.put('/:id', updateWorker);
router.patch('/:id/status', changeWorkerStatus);
router.delete('/:id', deleteWorker);

export default router;
