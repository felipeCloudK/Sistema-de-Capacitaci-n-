import { Router } from 'express';
import {
  getReportData,
  exportReportExcel,
  exportReportPdf,
} from '../controllers/reportController.js';

const router = Router();

router.get('/', getReportData);
router.get('/export/excel', exportReportExcel);
router.get('/export/pdf', exportReportPdf);

export default router;
