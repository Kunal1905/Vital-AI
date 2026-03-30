import { Router } from 'express'
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from '../middleware/auth'
import { getAlerts, respondToAlert } from '../controllers/alertsController'

const router = Router()

router.get('/', requireAuthOrTest, getAlerts)
router.post('/:id/respond', requireAuthTokenOrTest_DEBUG, respondToAlert)

export default router
