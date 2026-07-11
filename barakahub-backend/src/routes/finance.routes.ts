import { Router } from 'express';
import { financeController } from '../controllers/finance.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTransactionSchema, stkPushSchema, pledgeSchema } from '../types/finance';

const router = Router();

router.use(authenticate);

// Categories
router.get('/categories', financeController.getCategories.bind(financeController));

// Transactions
router.get('/transactions', authorize('admin', 'pastor', 'leader'), financeController.findAllTransactions.bind(financeController));
router.get('/transactions/next-receipt', financeController.getNextReceiptNo.bind(financeController));
router.post('/transactions', authorize('admin', 'pastor'), validate(createTransactionSchema), financeController.createTransaction.bind(financeController));
router.post('/transactions/:id/reverse', authorize('admin'), financeController.reverseTransaction.bind(financeController));

// Member's own giving
router.get('/my-giving', financeController.getMyGiving.bind(financeController));
router.get('/members/:userId/giving', authorize('admin', 'pastor'), financeController.getMemberGiving.bind(financeController));

// Pledges
router.post('/pledges', authorize('admin', 'pastor'), validate(pledgeSchema), financeController.createPledge.bind(financeController));

// Reports
router.get('/reports/monthly', authorize('admin', 'pastor'), financeController.getMonthlyReport.bind(financeController));

export default router;
