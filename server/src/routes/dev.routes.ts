import { Router } from 'express'
import { runEscalationChecker } from '../jobs/escalationChecker'
import { runAnalyticsWorker } from '../jobs/analyticsWorker'

const router = Router()

router.post('/run-escalation', async (_req, res) => {
  const count = await runEscalationChecker()
  res.json({ alerted: count })
})

router.post('/run-analytics', async (_req, res) => {
  const count = await runAnalyticsWorker()
  res.json({ processed: count })
})

export default router
