import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { reportDateQueryRules, validate } from '../middleware/validationMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/daily', reportDateQueryRules, validate, reportController.dailyReport);
router.get('/month-to-date', reportDateQueryRules, validate, reportController.monthToDateReport);
router.get('/monthly', reportDateQueryRules, validate, reportController.monthlyReport);

export default router;
