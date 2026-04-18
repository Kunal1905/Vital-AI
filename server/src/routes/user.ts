import { Router } from 'express';
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from "../middleware/auth"
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
router.get('/getUser', requireAuthOrTest, getUser);
router.get('/me', requireAuthOrTest, getMe);
router.patch('/me', requireAuthTokenOrTest_DEBUG, updateMe);
router.delete('/me', requireAuthTokenOrTest_DEBUG, deleteMe);
router.post('/me/cancel-deletion', requireAuthTokenOrTest_DEBUG, cancelDeletion);

// Create/update user on first login (call from client post-signup)
router.post('/submitUser', requireAuthTokenOrTest_DEBUG, submitUser);

export default router;
