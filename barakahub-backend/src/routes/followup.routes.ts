import { Router } from 'express';
import { followUpController } from '../controllers/followup.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Standard CRUD
router.get('/', followUpController.findAll.bind(followUpController));
router.get('/stats', followUpController.getStats.bind(followUpController));
router.post('/', authorize('admin', 'pastor', 'leader'), followUpController.create.bind(followUpController));
router.put('/:id/status', followUpController.updateStatus.bind(followUpController));

// Smart lists
router.get('/smart/absent', followUpController.getAbsentMembers.bind(followUpController));
router.get('/smart/visitors', followUpController.getFirstTimeVisitors.bind(followUpController));

// Assign & complete
router.post('/assign', authorize('admin', 'pastor'), followUpController.assignTask.bind(followUpController));
router.put('/tasks/:id/done', followUpController.completeTask.bind(followUpController));

// Leaders
router.get('/leaders', followUpController.getLeaders.bind(followUpController));

export default router;
