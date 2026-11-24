import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { get, initializeDatabase, run, withTransaction } from './database.js'

const directory = dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(directory, 'data', 'stuwork.sqlite')
const cvDirectory = resolve(dirname(databasePath), 'cvs')
const companyName = 'Công ty Demo StuCareer'
const password = process.env.DEMO_PASSWORD

const employer = {
  name: 'Nhà tuyển dụng Demo',
  email: 'demo.employer@stucareer.test',
  phone: '0900000701',
}

const candidates = [
  {
    name: 'Nguyễn Minh Anh (Demo)',
    email: 'demo.student.01@stucareer.test',
    phone: '0900000711',
    university: 'Đại học Bách khoa - ĐHQG TP. Hồ Chí Minh',
    major: 'Công nghệ thông tin',
    graduationYear: 2027,
    skills: 'ReactJS, JavaScript, Git',
    bio: 'Sinh viên yêu thích phát triển giao diện web và làm việc nhóm.',
    cvName: 'CV-Nguyen-Minh-Anh-Demo.pdf',
  },
  {
    name: 'Trần Hoàng Nam (Demo)',
    email: 'demo.student.02@stucareer.test',
    phone: '0900000712',
    university: 'Đại học Công nghệ - ĐHQGHN',
    major: 'Marketing',
    graduationYear: 2027,
    skills: 'Content Marketing, SEO, Google Analytics',
    bio: 'Quan tâm đến nội dung số và phân tích hiệu quả chiến dịch.',
    cvName: 'CV-Tran-Hoang-Nam-Demo.pdf',
  },
  {
    name: 'Lê Khánh Linh (Demo)',
    email: 'demo.student.03@stucareer.test',
    phone: '0900000713',
    university: 'Đại học Kinh tế TP. Hồ Chí Minh',
    major: 'Kinh doanh',
    graduationYear: 2028,
    skills: 'Excel, Phân tích dữ liệu, PowerPoint',
    bio: 'Sinh viên chủ động, yêu thích phân tích vấn đề kinh doanh.',
    cvName: 'CV-Le-Khanh-Linh-Demo.pdf',
  },
  {
    name: 'Phạm Gia Bảo (Demo)',
    email: 'demo.student.04@stucareer.test',
    phone: '0900000714',
    university: 'Đại học FPT',
    major: 'Công nghệ thông tin',
    graduationYear: 2028,
    skills: 'HTML/CSS, JavaScript, SQL',
    bio: 'Đang tìm cơ hội thực tập để phát triển kỹ năng lập trình.',
    cvName: 'CV-Pham-Gia-Bao-Demo.pdf',
  },
]

const demoJobs = [
  {
    title: 'Thực tập sinh Frontend React',
    location: 'TP. Hồ Chí Minh',
    salaryMin: 5,
    salaryMax: 8,
    type: 'Internship',
    category: 'Công nghệ thông tin',
    slots: 3,
    deadline: '31/12/2026',
    logo: 'SD',
    tone: 'teal',
    description: 'Tham gia phát triển giao diện sản phẩm web và phối hợp cùng đội thiết kế, backend.',
    requirements: ['Biết HTML, CSS và JavaScript', 'Đã làm quen với React', 'Có thể thực tập ít nhất 3 ngày mỗi tuần'],
    benefits: ['Được mentor hướng dẫn', 'Trợ cấp thực tập', 'Tham gia sản phẩm thực tế'],
  },
  {
    title: 'Thực tập sinh Digital Marketing',
    location: 'Hà Nội',
    salaryMin: 3,
    salaryMax: 6,
    type: 'Internship',
    category: 'Marketing',
    slots: 2,
    deadline: '31/12/2026',
    logo: 'SD',
    tone: 'teal',
    description: 'Hỗ trợ lập kế hoạch nội dung, tối ưu chiến dịch số và tổng hợp báo cáo hiệu quả.',
    requirements: ['Có kỹ năng viết nội dung', 'Biết sử dụng mạng xã hội', 'Biết Excel hoặc công cụ phân tích là lợi thế'],
    benefits: ['Được hướng dẫn công cụ marketing', 'Lịch làm việc linh hoạt', 'Có xác nhận thực tập'],
  },
  {
    title: 'Thực tập sinh Phân tích dữ liệu',
    location: 'Làm việc từ xa',
    salaryMin: 4,
    salaryMax: 7,
    type: 'Internship',
    category: 'Kinh doanh',
    slots: 2,
    deadline: '31/12/2026',
    logo: 'SD',
    tone: 'teal',
    description: 'Làm sạch dữ liệu, xây dựng báo cáo và hỗ trợ nhóm đưa ra quyết định dựa trên số liệu.',
    requirements: ['Sử dụng tốt Excel', 'Biết SQL cơ bản', 'Cẩn thận và có tư duy phân tích'],
    benefits: ['Làm việc từ xa', 'Được hướng dẫn SQL và dashboard', 'Tham gia dự án thực tế'],
  },
]

const sampleApplications = [
  { candidate: 0, job: 0, decision: 'pending', coverLetter: 'Em mong muốn được học hỏi và đóng góp cho nhóm phát triển sản phẩm.' },
  { candidate: 1, job: 0, decision: 'accepted', coverLetter: 'Em có kinh nghiệm làm dự án React trong môn học và hoạt động câu lạc bộ.' },
  { candidate: 2, job: 0, decision: 'rejected', coverLetter: 'Em muốn thử sức với vị trí thực tập frontend.' },
  { candidate: 3, job: 0, decision: 'pending', coverLetter: 'Em đang tìm môi trường thực tập để phát triển kỹ năng JavaScript.' },
  { candidate: 0, job: 1, decision: 'accepted', coverLetter: 'Em quan tâm đến nội dung số và đo lường hiệu quả chiến dịch.' },
  { candidate: 2, job: 1, decision: 'pending', coverLetter: 'Em có thể hỗ trợ tổng hợp số liệu và báo cáo marketing.' },
  { candidate: 1, job: 2, decision: 'pending', coverLetter: 'Em muốn áp dụng kỹ năng Excel vào phân tích dữ liệu.' },
  { candidate: 3, job: 2, decision: 'rejected', coverLetter: 'Em muốn tìm hiểu thêm về công việc phân tích dữ liệu.' },
]

const sampleBookmarks = [
  { candidate: 0, job: 2 },
  { candidate: 1, job: 1 },
  { candidate: 3, job: 0 },
]

function createPdf(name) {
  const printableName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[()\\]/g, '')
  const stream = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    '(StuCareer - Sample CV) Tj',
    '0 -32 Td',
    `(${printableName}) Tj`,
    '0 -28 Td',
    '(Fictional candidate profile for local demonstration.) Tj',
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf)
}

async function getOrCreateUser(account, role, passwordHash, transaction) {
  const existing = await get(
    'SELECT id, role, cv_path, cv_original_name FROM users WHERE email = ?',
    [account.email],
    transaction,
  )
  if (existing) {
    if (existing.role !== role) throw new Error(`Tài khoản demo ${account.email} đã tồn tại với vai trò khác.`)
    return existing
  }

  const phoneOwner = await get('SELECT id FROM users WHERE phone = ?', [account.phone], transaction)
  if (phoneOwner) throw new Error(`Số điện thoại demo ${account.phone} đã được tài khoản khác sử dụng.`)
  await run(`
    INSERT INTO users (name, email, phone, password_hash, role, university, major, graduation_year, bio, skills)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    account.name,
    account.email,
    account.phone,
    passwordHash,
    role,
    account.university ?? null,
    account.major ?? null,
    account.graduationYear ?? null,
    account.bio ?? null,
    account.skills ?? null,
  ], transaction)
  return get(
    'SELECT id, role, cv_path, cv_original_name FROM users WHERE email = ?',
    [account.email],
    transaction,
  )
}

if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('Cần đặt DEMO_PASSWORD dài từ 8 đến 72 byte trong .env.demo trước khi nạp dữ liệu mẫu.')
}

await initializeDatabase()
mkdirSync(cvDirectory, { recursive: true })
const passwordHash = await bcrypt.hash(password, 12)

const result = await withTransaction(async (transaction) => {
  const employerUser = await getOrCreateUser(employer, 'employer', passwordHash, transaction)
  const existingCompany = await get('SELECT user_id FROM companies WHERE user_id = ?', [employerUser.id], transaction)
  const companyValues = [
    companyName,
    'Công nghệ và dịch vụ số',
    '50 – 200 nhân viên',
    'TP. Hồ Chí Minh',
    '',
    'Doanh nghiệp mẫu dành cho việc kiểm thử các luồng tuyển dụng trong StuCareer.',
  ]
  if (existingCompany) {
    await run(`
      UPDATE companies
      SET name = ?, industry = ?, size = ?, address = ?, website = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [...companyValues, employerUser.id], transaction)
  } else {
    await run(`
      INSERT INTO companies (user_id, name, industry, size, address, website, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employerUser.id, ...companyValues], transaction)
  }

  const candidateUsers = []
  for (const candidate of candidates) {
    const user = await getOrCreateUser(candidate, 'seeker', passwordHash, transaction)
    const existingCvPath = user.cv_path && existsSync(resolve(cvDirectory, user.cv_path))
      ? user.cv_path
      : null
    const cvPath = existingCvPath || `demo-${user.id}.pdf`
    const cvName = existingCvPath ? user.cv_original_name : candidate.cvName
    if (!existingCvPath) {
      await writeFile(resolve(cvDirectory, cvPath), createPdf(candidate.name))
      await run(`
        UPDATE users SET cv_path = ?, cv_original_name = ?, cv_uploaded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [cvPath, cvName, user.id], transaction)
    }
    candidateUsers.push({ ...user, cv_path: cvPath, cv_original_name: cvName })
  }

  const jobIds = []
  let jobsAdded = 0
  for (const job of demoJobs) {
    let existingJob = await get(
      'SELECT id FROM jobs WHERE title = ? AND company = ?',
      [job.title, companyName],
      transaction,
    )
    if (!existingJob) {
      await run(`
        INSERT INTO jobs (
          title, company, location, salary_min, salary_max, type, category, tone, logo,
          description, requirements, benefits, slots, deadline, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `, [
        job.title,
        companyName,
        job.location,
        job.salaryMin,
        job.salaryMax,
        job.type,
        job.category,
        job.tone,
        job.logo,
        job.description,
        JSON.stringify(job.requirements),
        JSON.stringify(job.benefits),
        job.slots,
        job.deadline,
      ], transaction)
      existingJob = await get(
        'SELECT id FROM jobs WHERE title = ? AND company = ?',
        [job.title, companyName],
        transaction,
      )
      jobsAdded += 1
    }
    jobIds.push(existingJob.id)
  }

  let applicationsAdded = 0
  for (const application of sampleApplications) {
    const candidate = candidateUsers[application.candidate]
    const existing = await get(
      'SELECT id FROM applications WHERE user_id = ? AND job_id = ?',
      [candidate.id, jobIds[application.job]],
      transaction,
    )
    if (existing) continue
    await run(`
      INSERT INTO applications (
        user_id, job_id, cover_letter, cv_path, cv_original_name, status, decision_status
      )
      VALUES (?, ?, ?, ?, ?, 'submitted', ?)
    `, [
      candidate.id,
      jobIds[application.job],
      application.coverLetter,
      candidate.cv_path,
      candidate.cv_original_name,
      application.decision,
    ], transaction)
    applicationsAdded += 1
  }

  let bookmarksAdded = 0
  for (const bookmark of sampleBookmarks) {
    const candidate = candidateUsers[bookmark.candidate]
    const existing = await get(
      'SELECT id FROM bookmarks WHERE user_id = ? AND job_id = ?',
      [candidate.id, jobIds[bookmark.job]],
      transaction,
    )
    if (existing) continue
    await run(
      'INSERT INTO bookmarks (user_id, job_id) VALUES (?, ?)',
      [candidate.id, jobIds[bookmark.job]],
      transaction,
    )
    bookmarksAdded += 1
  }

  return {
    candidates: candidateUsers.length,
    jobs: demoJobs.length,
    jobsAdded,
    applicationsAdded,
    bookmarksAdded,
  }
}, { immediate: true })

console.log(`Dữ liệu demo sẵn sàng: ${result.jobs} tin tuyển dụng, ${result.candidates} ứng viên.`)
console.log(`Lần chạy này thêm ${result.jobsAdded} tin, ${result.applicationsAdded} đơn ứng tuyển và ${result.bookmarksAdded} tin đã lưu.`)
console.log(`Tài khoản nhà tuyển dụng: ${employer.email}`)
console.log(`Tài khoản ứng viên: ${candidates.map((candidate) => candidate.email).join(', ')}`)
process.exit(0)
