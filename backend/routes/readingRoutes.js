import { Router } from 'express';
import * as readingController from '../controllers/readingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  idParamRules,
  readingListQueryRules,
  readingRules,
  validate,
} from '../middleware/validationMiddleware.js';

const router = Router();


router.use(requireAuth);

router.get('/', readingListQueryRules, validate, readingController.listReadings);
router.post('/', readingRules, validate, readingController.createReading);
router.get('/:id', idParamRules, validate, readingController.getReading);
router.put('/:id', idParamRules, readingRules, validate, readingController.updateReading);
router.delete('/:id', idParamRules, validate, readingController.deleteReading);

export default router;
