import { Router } from 'express';
import { requireAuth } from "../middleware/auth"
import {
  getUser,
  submitUser,
  getMe,
  updateMe,
  deleteMe,
  cancelDeletion,
} from '../controllers/userController';

const router = Router();

// Protected: Get current user data
router.get('/getUser', requireAuth, getUser);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.delete('/me', requireAuth, deleteMe);
router.post('/me/cancel-deletion', requireAuth, cancelDeletion);

// Create/update user on first login (call from client post-signup)
router.post('/submitUser', requireAuth, submitUser);

export default router;
