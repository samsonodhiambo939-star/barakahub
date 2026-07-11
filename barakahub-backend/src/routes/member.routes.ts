import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMemberSchema, updateMemberSchema } from '../types/member';

const router = Router();

router.use(authenticate);

router.get('/', memberController.findAll.bind(memberController));
router.get('/:id', memberController.findById.bind(memberController));
router.post('/', authorize('admin', 'pastor'), validate(createMemberSchema), memberController.create.bind(memberController));
router.put('/:id', authorize('admin', 'pastor'), validate(updateMemberSchema), memberController.update.bind(memberController));
router.delete('/:id', authorize('admin'), memberController.deactivate.bind(memberController));

export default router;
