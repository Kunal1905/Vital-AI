import { Router } from 'express'
import { requireAuth } from "../middleware/auth";
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
router.get('/',requireAuth,getContact)      // GET    /api/contacts
router.put('/',requireAuth,updateContact)   // PUT    /api/contacts
router.delete('/',requireAuth,removeContact)   // DELETE /api/contacts
router.post('/restore',requireAuth, restoreContact)  // POST   /api/contacts/restore
router.post('/alert',requireAuth, manualAlert)     // POST   /api/contacts/alert
 
export default router