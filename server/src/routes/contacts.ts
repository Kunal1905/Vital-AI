import { Router } from 'express'
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from "../middleware/auth";
import {
  getContact,
  updateContact,
  removeContact,
  restoreContact,
  manualAlert,
} from '../controllers/contactController'
 
const router = Router()
 
// Single contact — no :id needed on most routes
// because there's only one contact per user.
// We find it using req.userId, not an ID param.
router.get('/',requireAuthOrTest,getContact)      // GET    /api/contacts
router.put('/',requireAuthTokenOrTest_DEBUG,updateContact)   // PUT    /api/contacts
router.delete('/',requireAuthTokenOrTest_DEBUG,removeContact)   // DELETE /api/contacts
router.post('/restore',requireAuthTokenOrTest_DEBUG, restoreContact)  // POST   /api/contacts/restore
router.post('/alert',requireAuthTokenOrTest_DEBUG, manualAlert)     // POST   /api/contacts/alert
 
export default router