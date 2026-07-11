import { Router } from 'express';
import { communicationController } from '../controllers/communication.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Prayer requests (public can submit)
router.post('/prayer-requests', communicationController.createPrayerRequest.bind(communicationController));

// Protected routes
router.use(authenticate);

router.get('/prayer-requests', authorize('admin', 'pastor'), communicationController.getPrayerRequests.bind(communicationController));
router.put('/prayer-requests/:id/status', authorize('admin', 'pastor'), communicationController.updatePrayerStatus.bind(communicationController));

router.post('/sms', authorize('admin', 'pastor', 'leader'), communicationController.sendSms.bind(communicationController));
router.post('/sms/bulk', authorize('admin', 'pastor'), communicationController.sendBulkSms.bind(communicationController));
router.get('/messages', authorize('admin', 'pastor'), communicationController.getMessages.bind(communicationController));

router.get('/announcements', communicationController.getAnnouncements.bind(communicationController));
router.post('/announcements', authorize('admin', 'pastor'), communicationController.createAnnouncement.bind(communicationController));

export default router;
