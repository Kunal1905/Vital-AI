import { Router } from 'express'
import { runEscalationChecker } from '../jobs/escalationChecker'
import { runAnalyticsWorker } from '../jobs/analyticsWorker'

const router = Router()

router.use((req, res, next) => {
  const secret = process.env.DEV_ROUTES_SECRET
  if (!secret) return next()
  const provided = req.header('x-dev-secret')
  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

router.post('/run-escalation', async (_req, res) => {
  const count = await runEscalationChecker()
  res.json({ alerted: count })
})

router.post('/run-analytics', async (_req, res) => {
  const count = await runAnalyticsWorker()
  res.json({ processed: count })
})

export default router
