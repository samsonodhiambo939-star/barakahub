import { Router } from 'express';
import { groupController } from '../controllers/group.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', groupController.findAll.bind(groupController));
router.get('/my', groupController.myGroups.bind(groupController));
router.get('/suggested/:id', groupController.getSuggestedMembers.bind(groupController));
router.get('/:id', groupController.findById.bind(groupController));
router.get('/:id/stats', groupController.getStats.bind(groupController));
router.post('/', authorize('admin', 'pastor'), groupController.create.bind(groupController));
router.put('/:id', authorize('admin', 'pastor'), groupController.update.bind(groupController));
router.post('/:id/members', authorize('admin', 'pastor', 'leader', 'secretary'), groupController.addMember.bind(groupController));
router.post('/:id/members/bulk', authorize('admin', 'pastor', 'leader', 'secretary'), groupController.addMembers.bind(groupController));
router.put('/:id/members/:userId/role', authorize('admin', 'pastor', 'leader'), groupController.updateMemberRole.bind(groupController));
router.delete('/:id/members/:userId', authorize('admin', 'pastor', 'leader', 'secretary'), groupController.removeMember.bind(groupController));

export default router;
