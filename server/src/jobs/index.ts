import cron from 'node-cron'
import { runEscalationChecker } from './escalationChecker'
import { runAnalyticsWorker } from './analyticsWorker'

export function startJobs(): void {
  cron.schedule('0 */6 * * *', async () => {
    const startTime = Date.now()
    console.log(`[JOB] Escalation checker starting at ${new Date().toISOString()}`)
    try {
      const alertedCount = await runEscalationChecker()
      const duration = Date.now() - startTime
      console.log(`[JOB] Escalation checker done. Alerted: ${alertedCount}. Duration: ${duration}ms`)
    } catch (err) {
      console.error('[JOB] Escalation checker failed:', err)
    }
  })

  cron.schedule('0 2 * * *', async () => {
    const startTime = Date.now()
    console.log(`[JOB] Analytics worker starting at ${new Date().toISOString()}`)
    try {
      const processedCount = await runAnalyticsWorker()
      const duration = Date.now() - startTime
      console.log(`[JOB] Analytics worker done. Processed: ${processedCount}. Duration: ${duration}ms`)
    } catch (err) {
      console.error('[JOB] Analytics worker failed:', err)
    }
  })

  console.log('Cron jobs scheduled (escalation: every 6h, analytics: 2am daily)')
}
