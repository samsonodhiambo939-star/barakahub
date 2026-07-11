import { Router } from 'express';
import { portalController } from '../controllers/portal.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('member'));

router.get('/dashboard', portalController.dashboard.bind(portalController));
router.put('/profile', portalController.updateProfile.bind(portalController));
router.post('/change-password', portalController.changePassword.bind(portalController));

export default router;
