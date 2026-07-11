import { Router } from 'express';
import { groupController } from '../controllers/group.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', groupController.findAll.bind(groupController));
router.get('/my', groupController.myGroups.bind(groupController));
router.get('/:id', groupController.findById.bind(groupController));
router.post('/', authorize('admin', 'pastor'), groupController.create.bind(groupController));
router.post('/:id/members', authorize('admin', 'pastor', 'leader'), groupController.addMember.bind(groupController));
router.delete('/:id/members/:userId', authorize('admin', 'pastor'), groupController.removeMember.bind(groupController));

export default router;
