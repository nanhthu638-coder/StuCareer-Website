import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { get, initializeDatabase, run } from './database.js'

const demoCompany = 'Công ty Demo Sprint 3'
const demoName = 'Sinh Viên Demo'
const demoEmail = (process.env.DEMO_RECIPIENT_EMAIL || 'NguyenPhanHoangBao32123@gmail.com').trim().toLowerCase()
const demoPhone = '0900000099'
const demoJobId = 10 // Sales Intern trong src/jobsData.js (8 slot)
const demoJobs = [
    { title: 'Data Analyst Intern', location: 'TP. Hồ Chí Minh', min: 4, max: 6, type: 'Internship', category: 'Công nghệ thông tin', status: 'pending', note: null },
    { title: 'Digital Marketing Intern', location: 'Hà Nội', min: 3, max: 5, type: 'Internship', category: 'Marketing', status: 'pending', note: null },
    { title: 'Customer Support Executive', location: 'Đà Nẵng', min: 7, max: 10, type: 'Full-time', category: 'Kinh doanh', status: 'pending', note: null },
    { title: 'Mobile Developer Intern', location: 'TP. Hồ Chí Minh', min: 5, max: 8, type: 'Internship', category: 'Công nghệ thông tin', status: 'approved', note: null },
    { title: 'Content Writer (Part-time)', location: 'Làm việc từ xa', min: 3, max: 4, type: 'Part-time', category: 'Marketing', status: 'hidden', note: null },
    { title: 'Sales Executive', location: 'Hà Nội', min: 8, max: 12, type: 'Full-time', category: 'Kinh doanh', status: 'closed', note: null },
    { title: 'Junior Designer', location: 'Đà Nẵng', min: 6, max: 9, type: 'Full-time', category: 'Thiết kế sáng tạo', status: 'rejected', note: 'Mô tả công việc chưa đầy đủ.' },
]

async function resetDemoData() {
    // Chỉ xóa tài khoản do script này tạo (đúng tên demo), không bao giờ xóa tài khoản thật.
    const user = await get('SELECT id FROM users WHERE email = ? AND name = ?', [demoEmail, demoName])
    if (user) {
        await run('DELETE FROM applications WHERE user_id = ?', [user.id])
        await run('DELETE FROM users WHERE id = ?', [user.id])
    }
    await run('DELETE FROM jobs WHERE company = ?', [demoCompany])
    console.log('Đã xóa dữ liệu demo Sprint 3.')
}

await initializeDatabase()
if (process.argv.includes('--reset')) {
    await resetDemoData()
    process.exit(0)
}
let created = 0
for (const job of demoJobs) {
    const existing = await get('SELECT id FROM jobs WHERE title = ? AND company = ?', [job.title, demoCompany])
    if (existing) continue
    await run(`
    INSERT INTO jobs (title, company, location, salary_min, salary_max, type, category, status, review_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [job.title, demoCompany, job.location, job.min, job.max, job.type, job.category, job.status, job.note])
    created += 1
}
console.log(`Tin tuyển dụng demo: thêm ${created}, đã có ${demoJobs.length - created}.`)

let user = await get('SELECT id FROM users WHERE email = ?', [demoEmail])
if (!user) {
    // Mật khẩu ngẫu nhiên không ai biết: tài khoản này chỉ dùng để nhận email demo, không đăng nhập được.
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 12)
    await run(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [demoName, demoEmail, demoPhone, passwordHash, 'seeker'],
    )
    user = await get('SELECT id FROM users WHERE email = ?', [demoEmail])
}
let application = await get('SELECT id FROM applications WHERE user_id = ? AND job_id = ?', [user.id, demoJobId])
if (!application) {
    await run(
        'INSERT INTO applications (user_id, job_id, cv_path, cv_original_name) VALUES (?, ?, ?, ?)',
        [user.id, demoJobId, 'demo/khong-co-cv.pdf', 'demo-cv.pdf'],
    )
    application = await get('SELECT id FROM applications WHERE user_id = ? AND job_id = ?', [user.id, demoJobId])
}
console.log(`Người nhận demo: ${demoEmail}`)
console.log(`Đơn ứng tuyển demo số ${application.id}. Thử email: npm run demo:result-email -- ${application.id} accepted`)
// Thoát hẳn: kết nối SQL Server đang mở sẽ giữ tiến trình chạy mãi.
process.exit(0)