import { Router } from 'express';
import { getPublicLeaveRequestForm, submitPublicLeaveRequest } from '../controllers/publicLeaveRequest.controller';

const router = Router();

// Deliberately no requireAuth here — this is the whole point of the
// no-login employee-facing leave request link. Security comes from the
// per-employee random token in the URL, not a session.
router.get('/:code/:token', getPublicLeaveRequestForm);
router.post('/:code/:token', submitPublicLeaveRequest);

export default router;
