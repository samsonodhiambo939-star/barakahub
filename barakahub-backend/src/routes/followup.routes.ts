import { Router } from 'express';
import { followUpController } from '../controllers/followup.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', followUpController.findAll.bind(followUpController));
router.get('/stats', followUpController.getStats.bind(followUpController));
router.post('/', authorize('admin', 'pastor', 'leader'), followUpController.create.bind(followUpController));
router.put('/:id/status', followUpController.updateStatus.bind(followUpController));

export default router;
