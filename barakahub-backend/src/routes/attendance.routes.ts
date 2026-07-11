import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/services', attendanceController.getServices.bind(attendanceController));
router.post('/services', authorize('admin', 'pastor'), attendanceController.createService.bind(attendanceController));
router.post('/services/:id/close', authorize('admin', 'pastor'), attendanceController.closeService.bind(attendanceController));
router.post('/services/:id/reopen', authorize('admin'), attendanceController.reopenService.bind(attendanceController));
router.post('/check-in', attendanceController.checkIn.bind(attendanceController));
router.post('/services/:serviceId/attendance/:userId/undo', authorize('admin', 'pastor'), attendanceController.undoCheckIn.bind(attendanceController));
router.post('/sync-offline', authorize('usher', 'leader'), attendanceController.syncOffline.bind(attendanceController));
router.get('/services/:serviceId/attendance', attendanceController.getServiceAttendance.bind(attendanceController));
router.get('/services/:serviceId/absentees', authorize('admin', 'pastor', 'leader'), attendanceController.getAbsentees.bind(attendanceController));
router.get('/reports/attendance', authorize('admin', 'pastor'), attendanceController.getAttendanceReport.bind(attendanceController));

export default router;
