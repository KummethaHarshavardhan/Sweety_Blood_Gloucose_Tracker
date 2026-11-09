import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth, requireTrustedOrigin } from '../middleware/authMiddleware.js';
import { loginRules, registerRules, validate } from '../middleware/validationMiddleware.js';

const router = Router();

router.post('/register', registerRules, validate, authController.register);
router.post('/login', requireTrustedOrigin, loginRules, validate, authController.login);
router.post('/refresh', requireTrustedOrigin, authController.refresh);
router.post('/logout', requireTrustedOrigin, authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
