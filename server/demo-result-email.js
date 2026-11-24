import { get, initializeDatabase } from './database.js'
import { jobs } from '../src/jobsData.js'
import { notifyApplicationResult } from './mailer.js'

const [applicationId, result = 'accepted'] = process.argv.slice(2)
await initializeDatabase()
const application = await get(`
  SELECT applications.id, applications.job_id, users.name, users.email
  FROM applications JOIN users ON users.id = applications.user_id
  WHERE applications.id = ?
`, [Number(applicationId)])
if (!application) {
    console.error('Không tìm thấy đơn ứng tuyển. Cách dùng: npm run demo:result-email -- <mã đơn> accepted hoặc rejected')
    process.exit(1)
}
const job = jobs.find((item) => item.id === application.job_id)
try {
    const outcome = await notifyApplicationResult({
        to: application.email,
        candidateName: application.name,
        jobTitle: job?.title ?? 'Tin tuyển dụng',
        company: job?.company ?? 'StuWork',
        result,
    })
    console.log(`Kết quả gửi email: ${outcome.status}${outcome.error ? ` (${outcome.error})` : ''}`)
} catch (error) {
    console.error(error.message)
    process.exit(1)
}
process.exit(0)