import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getAlerts, respondToAlert } from '../controllers/alertsController'

const router = Router()

router.get('/', requireAuth, getAlerts)
router.post('/:id/respond', requireAuth, respondToAlert)

export default router
