import { Router, Request, Response, NextFunction } from 'express';
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

// Debug incoming headers
router.use((req: Request, _res: Response, next: NextFunction) => {
  console.log('User routes headers (RELOADED):', req.headers);
  console.log(req.headers.authorization);
  next();
});

// Protected: Get current user data
router.get('/getUser', requireAuthOrTest, getUser);
router.get('/me', requireAuthOrTest, getMe);
router.patch('/me', requireAuthTokenOrTest_DEBUG, updateMe);
router.delete('/me', requireAuthTokenOrTest_DEBUG, deleteMe);
router.post('/me/cancel-deletion', requireAuthTokenOrTest_DEBUG, cancelDeletion);

// Create/update user on first login (call from client post-signup)
router.post('/submitUser', requireAuthTokenOrTest_DEBUG, submitUser);

export default router;
