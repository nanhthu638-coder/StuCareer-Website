import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { get, initializeDatabase, run } from './database.js'

const demoCompany = 'Công ty Demo Sprint 3'
const demoName = 'Sinh Viên Demo'
const demoEmail = (process.env.DEMO_RECIPIENT_EMAIL || 'NguyenPhanHoangBao32123@gmail.com').trim().toLowerCase()
const demoPhone = '0900000099'
const demoJobId = 10 // Sales Intern trong src/jobsData.js (8 slot)
const demoJobs = [
    {
        title: 'Data Analyst Intern', location: 'TP. Hồ Chí Minh', min: 4, max: 6, slots: 5,
        type: 'Internship', category: 'Công nghệ thông tin', status: 'pending', note: null,
        deadline: '31/12/2026',
        description: 'Thu thập, làm sạch và phân tích dữ liệu kinh doanh để hỗ trợ đội ngũ sản phẩm đưa ra quyết định.',
        requirements: ['Đang học ngành CNTT, Kinh tế hoặc chuyên ngành liên quan', 'Biết Excel và SQL cơ bản', 'Có tư duy phân tích và trình bày số liệu'],
        benefits: ['Trợ cấp thực tập', 'Được hướng dẫn bởi chuyên gia dữ liệu', 'Cơ hội làm việc thực tế'],
    },
    {
        title: 'Digital Marketing Intern', location: 'Hà Nội', min: 3, max: 5, slots: 4,
        type: 'Internship', category: 'Marketing', status: 'pending', note: null,
        deadline: '31/12/2026',
        description: 'Hỗ trợ lập kế hoạch, triển khai và đo lường các chiến dịch digital marketing trên các kênh truyền thông số.',
        requirements: ['Sinh viên ngành Marketing, Truyền thông hoặc liên quan', 'Hiểu cơ bản về mạng xã hội và Google Analytics', 'Viết nội dung tốt và chủ động học hỏi'],
        benefits: ['Trợ cấp thực tập', 'Được làm dự án truyền thông thật', 'Giấy xác nhận thực tập'],
    },
    {
        title: 'Customer Support Executive', location: 'Đà Nẵng', min: 7, max: 10, slots: 3,
        type: 'Full-time', category: 'Kinh doanh', status: 'pending', note: null,
        deadline: '31/12/2026',
        description: 'Tiếp nhận và xử lý yêu cầu của khách hàng, phối hợp với các bộ phận liên quan để đảm bảo chất lượng hỗ trợ.',
        requirements: ['Giao tiếp và xử lý tình huống tốt', 'Kỹ năng làm việc nhóm', 'Có kinh nghiệm chăm sóc khách hàng là lợi thế'],
        benefits: ['Chế độ bảo hiểm', 'Đào tạo quy trình hỗ trợ', 'Môi trường làm việc chuyên nghiệp'],
    },
    {
        title: 'Mobile Developer Intern', location: 'TP. Hồ Chí Minh', min: 5, max: 8, slots: 3,
        type: 'Internship', category: 'Công nghệ thông tin', status: 'approved', note: null,
        deadline: '31/12/2026',
        description: 'Tham gia phát triển ứng dụng di động, fix lỗi giao diện và viết tài liệu cho các tính năng được giao.',
        requirements: ['Biết JavaScript hoặc một ngôn ngữ lập trình di động', 'Hiểu REST API cơ bản', 'Chăm chỉ, có khả năng tự học'],
        benefits: ['Trợ cấp thực tập', 'Được mentor hướng dẫn', 'Cơ hội trở thành nhân viên chính thức'],
    },
    {
        title: 'Content Writer (Part-time)', location: 'Làm việc từ xa', min: 3, max: 4, slots: 5,
        type: 'Part-time', category: 'Marketing', status: 'hidden', note: null,
        deadline: '31/12/2026',
        description: 'Viết bài cho website, fanpage và email marketing, kiểm tra nội dung và hỗ trợ lên kế hoạch bài đăng.',
        requirements: ['Viết tiếng Việt rõ ràng, mạch lạc', 'Có khả năng nghiên cứu chủ đề', 'Có thể làm việc linh hoạt theo lịch'],
        benefits: ['Làm việc từ xa', 'Trợ cấp theo năng suất', 'Được góp ý và cải thiện kỹ năng viết'],
    },
    {
        title: 'Sales Executive', location: 'Hà Nội', min: 8, max: 12, slots: 2,
        type: 'Full-time', category: 'Kinh doanh', status: 'closed', note: null,
        deadline: '31/12/2026',
        description: 'Tìm kiếm khách hàng tiềm năng, tư vấn sản phẩm và theo dõi doanh số đến khi hoàn tất hợp đồng.',
        requirements: ['Kinh nghiệm bán hàng hoặc tư vấn từ 1 năm', 'Giao tiếp tốt, chủ động', 'Có khả năng đạt và báo cáo KPI'],
        benefits: ['Hoa hồng theo hiệu quả', 'Thưởng doanh số', 'Đào tạo kỹ năng bán hàng'],
    },
    {
        title: 'Junior Designer', location: 'Đà Nẵng', min: 6, max: 9, slots: 2,
        type: 'Full-time', category: 'Thiết kế sáng tạo', status: 'rejected', note: 'Mô tả công việc chưa đầy đủ.',
        deadline: '31/12/2026',
        description: 'Thiết kế ấn phẩm truyền thông và giao diện sản phẩm theo yêu cầu, phối hợp với đội marketing để hoàn thiện nội dung.',
        requirements: ['Thành thạo Figma, Photoshop hoặc Illustrator', 'Có portfolio cá nhân', 'Có mắt thẩm mỹ và kỹ năng hợp tác'],
        benefits: ['Môi trường sáng tạo', 'Lộ trình phát triển chuyên môn', 'Thưởng theo dự án'],
    },
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
    const values = [
        job.title, demoCompany, job.location, job.min, job.max, job.type, job.category,
        job.status, job.note, job.description, JSON.stringify(job.requirements),
        JSON.stringify(job.benefits), job.slots, job.deadline,
    ]
    if (existing) {
        await run(`
            UPDATE jobs
            SET location = ?, salary_min = ?, salary_max = ?, type = ?, category = ?, status = ?, review_note = ?,
                description = ?, requirements = ?, benefits = ?, slots = ?, deadline = ?
            WHERE id = ?
        `, [
            job.location, job.min, job.max, job.type, job.category, job.status, job.note,
            job.description, JSON.stringify(job.requirements), JSON.stringify(job.benefits),
            job.slots, job.deadline, existing.id,
        ])
        continue
    }
    await run(`
        INSERT INTO jobs (
            title, company, location, salary_min, salary_max, type, category, status, review_note,
            tone, logo, description, requirements, benefits, slots, deadline
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'teal', ?, ?, ?, ?, ?, ?)
    `, [
        job.title, demoCompany, job.location, job.min, job.max, job.type, job.category,
        job.status, job.note, job.title.charAt(0).toLocaleUpperCase('vi'),
        job.description, JSON.stringify(job.requirements), JSON.stringify(job.benefits),
        job.slots, job.deadline,
    ])
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