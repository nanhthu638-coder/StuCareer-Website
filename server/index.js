import { randomBytes, randomInt } from 'node:crypto'
import { mkdirSync, existsSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import express from 'express'
import { all, get, initializeDatabase, run, withTransaction } from './database.js'
import { notifyApplicationResult, sendEmail } from './mailer.js'
import { seedJobCatalog } from './seed-job-catalog.js'

const directory = dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(directory, 'data', 'stuwork.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
const cvDirectory = resolve(dirname(databasePath), 'cvs')
mkdirSync(cvDirectory, { recursive: true })
await initializeDatabase()
const seededJobCount = await seedJobCatalog()
if (seededJobCount > 0) console.log(`Đã thêm ${seededJobCount} tin tuyển dụng mẫu vào cơ sở dữ liệu.`)

const app = express()
const otpByIdentifier = new Map()
const resetTokens = new Map()
const requestTimes = new Map()
const chatRequestTimes = new Map()
const sessions = new Map()
const port = Number(process.env.PORT) || 3001
const bcryptRounds = 12
const otpLifetimeMs = 5 * 60 * 1000
const resetTokenLifetimeMs = 10 * 60 * 1000
const otpResendDelayMs = 60 * 1000
const sessionLifetimeMs = 12 * 60 * 60 * 1000
const maxCvBytes = 5 * 1024 * 1024
const cvTypes = {
  '.pdf': { signature: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  '.docx': { signature: [0x50, 0x4b, 0x03, 0x04], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.doc': { signature: [0xd0, 0xcf, 0x11, 0xe0], mime: 'application/msword' },
}

app.disable('x-powered-by')
app.use(express.json({ limit: '64kb' }))
const cvUpload = express.raw({ type: 'application/octet-stream', limit: maxCvBytes })

function normalizePhone(value) {
  const phone = value.trim().replace(/[^\d+]/g, '')
  if (phone.startsWith('+84')) return `0${phone.slice(3)}`
  if (phone.startsWith('84') && phone.length >= 11) return `0${phone.slice(2)}`
  return phone
}

function normalizeIdentifier(value) {
  const trimmed = value.trim()
  return trimmed.includes('@') ? trimmed.toLowerCase() : normalizePhone(trimmed)
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPhone(value) {
  return /^\+?\d{8,15}$/.test(value)
}

function isPhoneInput(value) {
  return /^[\d\s+().-]+$/.test(value) && isPhone(normalizePhone(value))
}

function authenticateRequest(request, response, next) {
  const authorization = request.get('authorization') ?? ''
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]+)$/)
  const token = match?.[1]
  const session = token ? sessions.get(token) : null
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token)
    return response.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' })
  }
  request.auth = { token, user: session.user }
  return next()
}

function requireSupportRole(request, response, next) {
  if (request.auth.user.role !== 'support') {
    return response.status(403).json({ error: 'Bạn không có quyền truy cập khu vực hỗ trợ.' })
  }
  return next()
}

function requireAdmin(request, response, next) {
    if (request.auth.user.role !== 'admin') {
        return response.status(403).json({ error: 'Chỉ quản trị viên mới dùng được chức năng này.' })
    }
    return next()
}

async function getUserByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier)
  return normalized.includes('@')
    ? get('SELECT id, email, phone FROM users WHERE email = ?', [normalized])
    : get('SELECT id, email, phone FROM users WHERE phone = ?', [normalized])
}

app.get('/api/jobs', async (_request, response) => {
  const jobs = await all(`
    SELECT id, title, company, location, salary_min, salary_max, type, category, tone, logo,
           description, requirements, benefits, slots, deadline, created_at
    FROM jobs
    WHERE status = 'approved'
    ORDER BY id
  `)
  return response.json({ jobs })
})

app.post('/api/auth/register', async (request, response) => {
  const { name, email, phone, password, role } = request.body ?? {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return response.status(400).json({ error: 'Họ tên cần có từ 2 đến 80 ký tự.' })
  }
  if (typeof email !== 'string' || !isEmail(email.trim())) {
    return response.status(400).json({ error: 'Email chưa đúng định dạng.' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = typeof phone === 'string' ? normalizePhone(phone) : ''
  if (typeof phone !== 'string' || !isPhoneInput(phone)) {
    return response.status(400).json({ error: 'Số điện thoại chưa đúng định dạng.' })
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Mật khẩu cần có ít nhất 8 ký tự và không vượt quá 72 byte.' })
  }

  const existingUser = await get('SELECT id FROM users WHERE email = ? OR phone = ?', [normalizedEmail, normalizedPhone])
  if (existingUser) {
    return response.status(409).json({ error: 'Email hoặc số điện thoại này đã được đăng ký.' })
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds)
  await run('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', [
    name.trim(),
    normalizedEmail,
    normalizedPhone,
    passwordHash,
    role === 'employer' ? 'employer' : 'seeker',
  ])
  return response.status(201).json({ message: 'Tạo tài khoản thành công.' })
})

app.post('/api/auth/login', async (request, response) => {
  const { identifier, password } = request.body ?? {}
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Vui lòng nhập email/số điện thoại và mật khẩu.' })
  }
  const normalized = normalizeIdentifier(identifier)
  const user = normalized.includes('@')
    ? await get('SELECT id, name, email, phone, password_hash, role FROM users WHERE email = ?', [normalized])
    : await get('SELECT id, name, email, phone, password_hash, role FROM users WHERE phone = ?', [normalized])
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false
  if (!passwordMatches) {
    return response.status(401).json({ error: 'Email/số điện thoại hoặc mật khẩu chưa chính xác.' })
  }
  const { id, name, email, phone, role } = user
  const accessToken = randomBytes(32).toString('base64url')
  sessions.set(accessToken, {
    user: { id, name, email, phone, role },
    expiresAt: Date.now() + sessionLifetimeMs,
  })
  return response.json({
    message: 'Đăng nhập thành công.',
    accessToken,
    user: { id, name, email, phone, role },
  })
})

app.delete('/api/auth/session', authenticateRequest, (request, response) => {
  sessions.delete(request.auth.token)
  return response.json({ message: 'Đăng xuất thành công.' })
})

app.post('/api/contact', optionalAuthentication, async (request, response) => {
  const { name, email, subject, message } = request.body ?? {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return response.status(400).json({ error: 'Họ tên cần có từ 2 đến 80 ký tự.' })
  }
  if (typeof email !== 'string' || !isEmail(email.trim()) || email.trim().length > 254) {
    return response.status(400).json({ error: 'Email chưa đúng định dạng.' })
  }
  if (typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 120) {
    return response.status(400).json({ error: 'Chủ đề cần có từ 3 đến 120 ký tự.' })
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
    return response.status(400).json({ error: 'Nội dung cần có từ 10 đến 5000 ký tự.' })
  }

  // Gắn với tài khoản đang đăng nhập để sau này thông báo kết quả xử lý ngay trong ứng dụng.
  await run(`
    INSERT INTO contact_requests (name, email, subject, message, user_id)
    VALUES (?, ?, ?, ?, ?)
  `, [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim(), request.auth?.user.id ?? null])
  return response.status(201).json({ message: 'Biểu mẫu của bạn đã được gửi.' })
})

const contactStatuses = ['new', 'in_progress', 'resolved']

// Dùng chung cho admin và nhân viên hỗ trợ: đổi trạng thái, và khi xử lý xong thì báo cho người gửi.
async function updateContactRequest({ id, status, note, assignedRole }) {
  const existing = await get(
    `SELECT id, name, email, subject, status FROM contact_requests WHERE id = ?${assignedRole ? ' AND assigned_role = ?' : ''}`,
    assignedRole ? [id, assignedRole] : [id],
  )
  if (!existing) return { status: 404, error: 'Không tìm thấy yêu cầu hỗ trợ.' }
  if (existing.status === status) return { status: 409, error: 'Yêu cầu đang ở trạng thái này rồi.' }
  const result = await run(`
    UPDATE contact_requests
    SET status = ?, resolution_note = ?,
        resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
        user_seen = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = ?
  `, [status, status === 'resolved' ? note || null : null, status, id, existing.status])
  if (result.changes === 0) return { status: 409, error: 'Yêu cầu vừa được người khác cập nhật. Vui lòng tải lại danh sách.' }
  if (status !== 'resolved') return { status: 200 }
  const email = await sendEmail({
    to: existing.email,
    subject: '[StuWork] Thắc mắc của bạn đã được xử lý',
    text: `Xin chào ${existing.name},

Thắc mắc "${existing.subject}" của bạn đã được đội ngũ StuWork xử lý.${note ? `\n\nPhản hồi: ${note}` : ''}

Nếu cần hỗ trợ thêm, bạn có thể gửi biểu mẫu liên hệ mới trên StuWork.

Trân trọng,
Đội ngũ StuWork`,
  })
  return { status: 200, emailStatus: email.status }
}

function readContactUpdate(request) {
  const id = Number(request.params.id)
  const { status, note } = request.body ?? {}
  if (!Number.isSafeInteger(id) || id < 1) return { error: 'Mã yêu cầu không hợp lệ.' }
  if (!contactStatuses.includes(status)) return { error: 'Trạng thái yêu cầu không hợp lệ.' }
  if (note !== undefined && note !== null && typeof note !== 'string') return { error: 'Phản hồi không hợp lệ.' }
  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  if (trimmedNote.length > 1000) return { error: 'Phản hồi tối đa 1000 ký tự.' }
  return { id, status, note: trimmedNote }
}

app.get('/api/support/requests', authenticateRequest, requireSupportRole, async (_request, response) => {
  const requests = await all(`
    SELECT id, name, email, subject, message, status, created_at, updated_at
    FROM contact_requests
    WHERE assigned_role = 'support'
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
  `)
  return response.json({ requests })
})

app.patch('/api/support/requests/:id', authenticateRequest, requireSupportRole, async (request, response) => {
  const update = readContactUpdate(request)
  if (update.error) return response.status(400).json({ error: update.error })
  const result = await updateContactRequest({ ...update, assignedRole: 'support' })
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.json({ message: 'Đã cập nhật trạng thái yêu cầu.', emailStatus: result.emailStatus })
})

app.get('/api/admin/contact-requests', authenticateRequest, requireAdmin, async (_request, response) => {
  const rows = await all(`
    SELECT id, name, email, subject, message, status, resolution_note, resolved_at, user_id, created_at
    FROM contact_requests
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC, id DESC
  `)
  const requests = rows.map(({ user_id: userId, ...row }) => ({ ...row, hasAccount: userId !== null && userId !== undefined }))
  return response.json({ requests })
})

app.patch('/api/admin/contact-requests/:id', authenticateRequest, requireAdmin, async (request, response) => {
  const update = readContactUpdate(request)
  if (update.error) return response.status(400).json({ error: update.error })
  const result = await updateContactRequest(update)
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.json({
    message: update.status === 'resolved' ? 'Đã xử lý thắc mắc và thông báo cho người gửi.' : 'Đã cập nhật trạng thái yêu cầu.',
    emailStatus: result.emailStatus,
  })
})

app.get('/api/notifications/contact', authenticateRequest, async (request, response) => {
  const rows = await all(`
    SELECT id, subject, resolution_note, resolved_at, user_seen
    FROM contact_requests
    WHERE user_id = ? AND status = 'resolved'
    ORDER BY resolved_at DESC, id DESC
  `, [request.auth.user.id])
  const notices = rows.slice(0, 20).map((row) => ({
    id: row.id,
    subject: row.subject,
    note: row.resolution_note || '',
    resolvedAt: row.resolved_at,
    seen: Number(row.user_seen) === 1,
  }))
  return response.json({ notices })
})

app.post('/api/notifications/contact/:id/seen', authenticateRequest, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã thông báo không hợp lệ.' })
  await run('UPDATE contact_requests SET user_seen = 1 WHERE id = ? AND user_id = ?', [id, request.auth.user.id])
  return response.json({ message: 'Đã đánh dấu đã đọc.' })
})

app.get('/api/notifications/employer', authenticateRequest, requireEmployer, async (request, response) => {
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [request.auth.user.id])
  if (!company?.name) return response.json({ notices: [] })
  const rows = await all(`
    SELECT a.id, a.created_at, a.employer_seen, a.decision_status,
           u.name AS candidate_name, u.major, j.id AS job_id, j.title, j.company
    FROM applications a
    JOIN users u ON u.id = a.user_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.status = 'submitted' AND LOWER(j.company) = LOWER(?)
    ORDER BY a.created_at DESC, a.id DESC
  `, [company.name.trim()])
  const notices = rows.slice(0, 20).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    candidateName: row.candidate_name,
    major: row.major || '',
    jobTitle: row.title,
    company: row.company,
    decisionStatus: row.decision_status || 'pending',
    createdAt: row.created_at,
    seen: Number(row.employer_seen) === 1,
  }))
  return response.json({ notices })
})

app.post('/api/notifications/employer/:id/seen', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã thông báo không hợp lệ.' })
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [request.auth.user.id])
  if (!company?.name) return response.status(404).json({ error: 'Không tìm thấy thông tin doanh nghiệp.' })
  const application = await get(`
    SELECT a.id
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? AND a.status = 'submitted' AND LOWER(j.company) = LOWER(?)
  `, [id, company.name.trim()])
  if (!application) return response.status(404).json({ error: 'Không tìm thấy thông báo thuộc doanh nghiệp của bạn.' })
  await run('UPDATE applications SET employer_seen = 1 WHERE id = ?', [id])
  return response.json({ message: 'Đã đánh dấu đã đọc.' })
})

app.post('/api/auth/forgot-password', async (request, response) => {
  if (process.env.NODE_ENV === 'production') {
    return response.status(503).json({ error: 'Dịch vụ gửi OTP chưa được cấu hình. Vui lòng liên hệ hỗ trợ.' })
  }
  const { identifier } = request.body ?? {}
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return response.status(400).json({ error: 'Vui lòng nhập email hoặc số điện thoại.' })
  }
  const normalized = normalizeIdentifier(identifier)
  if (normalized.includes('@') ? !isEmail(normalized) : !isPhoneInput(identifier)) {
    return response.status(400).json({ error: 'Email hoặc số điện thoại chưa đúng định dạng.' })
  }
  const user = await getUserByIdentifier(normalized)
  if (!user) return response.status(404).json({ error: 'Không tìm thấy tài khoản với thông tin này.' })

  const now = Date.now()
  const lastRequest = requestTimes.get(normalized) ?? 0
  if (now - lastRequest < otpResendDelayMs) {
    return response.status(429).json({ error: 'Vui lòng đợi một chút trước khi gửi lại mã OTP.' })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  otpByIdentifier.set(normalized, { code, expiresAt: now + otpLifetimeMs, attempts: 0 })
  requestTimes.set(normalized, now)
  return response.json({ message: 'Mã xác nhận đã được tạo.', developmentCode: code })
})

app.post('/api/auth/verify-otp', async (request, response) => {
  const { identifier, code } = request.body ?? {}
  if (typeof identifier !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: 'Vui lòng nhập mã OTP gồm 6 chữ số.' })
  }
  const normalized = normalizeIdentifier(identifier)
  const challenge = otpByIdentifier.get(normalized)
  if (!challenge || challenge.expiresAt <= Date.now()) {
    otpByIdentifier.delete(normalized)
    return response.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' })
  }
  challenge.attempts += 1
  if (challenge.attempts > 5) {
    otpByIdentifier.delete(normalized)
    return response.status(429).json({ error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' })
  }
  if (challenge.code !== code) {
    return response.status(400).json({ error: 'Mã OTP chưa chính xác. Vui lòng kiểm tra lại.' })
  }

  otpByIdentifier.delete(normalized)
  const user = await getUserByIdentifier(normalized)
  if (!user) return response.status(404).json({ error: 'Không tìm thấy tài khoản.' })
  const resetToken = randomBytes(32).toString('base64url')
  resetTokens.set(resetToken, { userId: user.id, expiresAt: Date.now() + resetTokenLifetimeMs })
  return response.json({ resetToken })
})

app.post('/api/auth/reset-password', async (request, response) => {
  const { resetToken, password } = request.body ?? {}
  if (typeof resetToken !== 'string' || !resetToken || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Mật khẩu mới cần có ít nhất 8 ký tự và không vượt quá 72 byte.' })
  }
  const tokenData = resetTokens.get(resetToken)
  if (!tokenData || tokenData.expiresAt <= Date.now()) {
    resetTokens.delete(resetToken)
    return response.status(401).json({ error: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng xác nhận OTP lại.' })
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds)
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenData.userId])
  resetTokens.delete(resetToken)
  return response.json({ message: 'Mật khẩu đã được cập nhật.' })
})
function requireEmployer(request, response, next) {
  if (request.auth.user.role !== 'employer') {
    return response.status(403).json({ error: 'Chỉ tài khoản nhà tuyển dụng mới dùng được chức năng này.' })
  }
  return next()
}

function parseDeadline(value) {
  if (!value) return null
  const [day, month, year] = value.split('/').map(Number)
  if (![day, month, year].every(Number.isFinite)) return null
  return new Date(year, month - 1, day, 23, 59, 59)
}

async function getJobAvailability(jobId, userId) {
  const job = await get(
    "SELECT id, slots, deadline FROM jobs WHERE id = ? AND status = 'approved'",
    [jobId],
  )
  if (!job) return null
  const { applied } = await get(
    "SELECT COUNT(*) AS applied FROM applications WHERE job_id = ? AND status = 'submitted' AND decision_status IN ('pending', 'accepted')",
    [jobId],
  )
  const deadline = parseDeadline(job.deadline)
  const expired = Boolean(deadline && deadline.getTime() < Date.now())
  const mine = userId
    ? await get('SELECT id, status, created_at, decision_status FROM applications WHERE job_id = ? AND user_id = ?', [jobId, userId])
    : null
  const user = userId ? await get('SELECT cv_path FROM users WHERE id = ?', [userId]) : null
  const slots = Number(job.slots)
  return {
    jobId,
    slots,
    applied,
    remaining: Math.max(slots - applied, 0),
    expired,
    hasCv: Boolean(user?.cv_path),
    application: mine?.status === 'submitted'
      ? { id: mine.id, createdAt: mine.created_at, decisionStatus: mine.decision_status || 'pending' }
      : null,
  }
}

async function readProfile(userId) {
  const row = await get(`
    SELECT id, name, email, phone, role, university, major, graduation_year, bio, skills,
           cv_original_name, cv_uploaded_at
    FROM users WHERE id = ?
  `, [userId])
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    university: row.university ?? '',
    major: row.major ?? '',
    graduationYear: row.graduation_year ?? '',
    bio: row.bio ?? '',
    skills: row.skills ?? '',
    cv: row.cv_original_name ? { name: row.cv_original_name, uploadedAt: row.cv_uploaded_at } : null,
  }
}

function optionalText(value, max) {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string' || value.trim().length > max) return { error: true }
  return { value: value.trim() }
}

function requireSeeker(request, response, next) {
  if (request.auth.user.role !== 'seeker') {
    return response.status(403).json({ error: 'Chỉ tài khoản ứng viên mới dùng được chức năng này.' })
  }
  return next()
}

app.get('/api/profile', authenticateRequest, requireSeeker, async (request, response) => {
  return response.json({ profile: await readProfile(request.auth.user.id) })
})

app.put('/api/profile', authenticateRequest, requireSeeker, async (request, response) => {
  const { name, phone, university, major, graduationYear, bio, skills } = request.body ?? {}
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return response.status(400).json({ error: 'Họ tên cần có từ 2 đến 80 ký tự.' })
  }
  if (typeof phone !== 'string' || !isPhoneInput(phone)) {
    return response.status(400).json({ error: 'Số điện thoại chưa đúng định dạng.' })
  }
  const normalizedPhone = normalizePhone(phone)
  const duplicate = await get('SELECT id FROM users WHERE phone = ? AND id != ?', [normalizedPhone, request.auth.user.id])
  if (duplicate) return response.status(409).json({ error: 'Số điện thoại này đã được tài khoản khác sử dụng.' })

  const uni = optionalText(university, 120)
  const maj = optionalText(major, 120)
  const bioText = optionalText(bio, 1000)
  const skillText = optionalText(skills, 300)
  if (uni.error || maj.error) return response.status(400).json({ error: 'Trường/ngành học tối đa 120 ký tự.' })
  if (bioText.error) return response.status(400).json({ error: 'Giới thiệu bản thân tối đa 1000 ký tự.' })
  if (skillText.error) return response.status(400).json({ error: 'Kỹ năng tối đa 300 ký tự.' })
  let year = null
  if (graduationYear !== undefined && graduationYear !== null && graduationYear !== '') {
    year = Number(graduationYear)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return response.status(400).json({ error: 'Năm tốt nghiệp chưa hợp lệ.' })
    }
  }

  await run(`
    UPDATE users SET name = ?, phone = ?, university = ?, major = ?, graduation_year = ?, bio = ?, skills = ?
    WHERE id = ?
  `, [name.trim(), normalizedPhone, uni.value, maj.value, year, bioText.value, skillText.value, request.auth.user.id])

  for (const session of sessions.values()) {
    if (session.user.id === request.auth.user.id) {
      session.user.name = name.trim()
      session.user.phone = normalizedPhone
    }
  }
  return response.json({ message: 'Đã cập nhật hồ sơ.', profile: await readProfile(request.auth.user.id) })
})

app.post('/api/profile/cv', authenticateRequest, requireSeeker, cvUpload, async (request, response) => {
  const rawName = request.get('x-file-name')
  let originalName = ''
  try {
    originalName = rawName ? decodeURIComponent(rawName) : ''
  } catch {
    originalName = ''
  }
  originalName = Array.from(originalName)
    .filter((char) => char !== '/' && char !== '\\' && char.charCodeAt(0) > 31)
    .join('')
    .slice(-120)
  const extension = originalName.includes('.') ? `.${originalName.split('.').pop().toLowerCase()}` : ''
  const type = cvTypes[extension]
  if (!type) return response.status(400).json({ error: 'CV chỉ hỗ trợ định dạng PDF, DOC hoặc DOCX.' })
  const body = request.body
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return response.status(400).json({ error: 'Vui lòng chọn một file CV.' })
  }
  if (!type.signature.every((byte, index) => body[index] === byte)) {
    return response.status(400).json({ error: 'Nội dung file không khớp với định dạng CV đã chọn.' })
  }

  const fileName = `${request.auth.user.id}-${randomBytes(12).toString('hex')}${extension}`
  await writeFile(resolve(cvDirectory, fileName), body)
  const previous = await get('SELECT cv_path FROM users WHERE id = ?', [request.auth.user.id])
  await run(`
    UPDATE users SET cv_path = ?, cv_original_name = ?, cv_uploaded_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [fileName, originalName, request.auth.user.id])
  // Xóa CV cũ nếu không còn đơn ứng tuyển nào đang dùng file đó.
  if (previous?.cv_path && !(await get('SELECT 1 FROM applications WHERE cv_path = ?', [previous.cv_path]))) {
    await unlink(resolve(cvDirectory, previous.cv_path)).catch(() => {})
  }
  return response.status(201).json({ message: 'Đã tải CV lên.', profile: await readProfile(request.auth.user.id) })
})

app.get('/api/profile/cv', authenticateRequest, requireSeeker, async (request, response) => {
  const row = await get('SELECT cv_path, cv_original_name FROM users WHERE id = ?', [request.auth.user.id])
  if (!row?.cv_path || !existsSync(resolve(cvDirectory, row.cv_path))) {
    return response.status(404).json({ error: 'Bạn chưa tải CV lên.' })
  }
  const extension = `.${row.cv_path.split('.').pop()}`
  response.type(cvTypes[extension]?.mime ?? 'application/octet-stream')
  return response.download(resolve(cvDirectory, row.cv_path), row.cv_original_name)
})

app.delete('/api/profile/cv', authenticateRequest, requireSeeker, async (request, response) => {
  const row = await get('SELECT cv_path FROM users WHERE id = ?', [request.auth.user.id])
  if (!row?.cv_path) return response.status(404).json({ error: 'Bạn chưa tải CV lên.' })
  await run('UPDATE users SET cv_path = NULL, cv_original_name = NULL, cv_uploaded_at = NULL WHERE id = ?', [request.auth.user.id])
  if (!(await get('SELECT 1 FROM applications WHERE cv_path = ?', [row.cv_path]))) {
    await unlink(resolve(cvDirectory, row.cv_path)).catch(() => {})
  }
  return response.json({ message: 'Đã xóa CV.', profile: await readProfile(request.auth.user.id) })
})

function optionalAuthentication(request, _response, next) {
  const match = (request.get('authorization') ?? '').match(/^Bearer ([A-Za-z0-9_-]+)$/)
  const session = match ? sessions.get(match[1]) : null
  request.auth = session && session.expiresAt > Date.now() ? { token: match[1], user: session.user } : null
  return next()
}

app.get('/api/jobs/availability', optionalAuthentication, async (request, response) => {
  const jobs = await all("SELECT id FROM jobs WHERE status = 'approved'")
  const items = await Promise.all(jobs.map((job) => getJobAvailability(job.id, request.auth?.user.id)))
  return response.json({ jobs: items })
})

app.get('/api/jobs/:id/availability', optionalAuthentication, async (request, response) => {
  const jobId = Number(request.params.id)
  if (!Number.isSafeInteger(jobId) || jobId < 1) {
    return response.status(400).json({ error: 'Mã công việc không hợp lệ.' })
  }
  const availability = await getJobAvailability(jobId, request.auth?.user.id)
  if (!availability) return response.status(404).json({ error: 'Không tìm thấy công việc này.' })
  return response.json(availability)
})

function localChatReply(message) {
  const text = message.toLocaleLowerCase('vi')
  if (/(định hướng|nghề nghiệp|chọn ngành|đổi ngành)/.test(text)) {
    return 'Bạn có thể bắt đầu bằng ba câu hỏi: ngành nào phù hợp với sở thích của bạn, kỹ năng hiện có là gì và môi trường làm việc mong muốn ra sao. Tiếp theo hãy thử một dự án nhỏ, nói chuyện với người đang làm nghề và đọc mô tả công việc thực tế. Nếu bạn cho mình biết điểm mạnh, sở thích và môn học yêu thích, mình có thể gợi ý hướng nghề cụ thể.'
  }
  if (/(portfolio|dự án|github)/.test(text)) {
    return 'Một portfolio tốt nên có 3–4 dự án chọn lọc. Mỗi dự án cần nêu bài toán, vai trò của bạn, công nghệ/cách làm, liên kết demo hoặc mã nguồn và kết quả đo được. Hãy ưu tiên một dự án giải quyết vấn đề thật thay vì nhiều dự án sao chép giống nhau.'
  }
  if (/(email|thư xin việc|cover letter)/.test(text)) {
    return 'Email ứng tuyển nên có tiêu đề rõ ràng, lời chào, vị trí đang ứng tuyển, 2–3 lý do bạn phù hợp và lời cảm ơn. Không sao chép lại toàn bộ CV; hãy thêm một đường dẫn CV/portfolio và kiểm tra tên công ty, thông tin liên hệ trước khi gửi.'
  }
  if (/(kỹ năng mềm|giao tiếp|làm việc nhóm|thuyết trình)/.test(text)) {
    return 'Để phát triển kỹ năng mềm, hãy luyện theo tình huống thật: đặt mục tiêu cụ thể, nhận vai trong bài tập nhóm, xin phản hồi và ghi lại điều cần cải thiện. Với giao tiếp, dùng cấu trúc “bối cảnh – ý chính – hành động – kết quả”; với làm việc nhóm, làm rõ trách nhiệm và thời hạn ngay từ đầu.'
  }
  if (/(học|khóa học|tự học|lộ trình)/.test(text)) {
    return 'Một lộ trình tự học hiệu quả gồm mục tiêu cụ thể, 1–2 nguồn học đáng tin, bài thực hành mỗi tuần và dự án tổng hợp. Hãy chia giai đoạn thành nền tảng, luyện tập và dự án; đo tiến bộ bằng sản phẩm hoặc bài kiểm tra thay vì chỉ đếm số giờ xem video.'
  }
  return 'Mình có thể trao đổi sâu hơn về học tập, định hướng nghề nghiệp, CV, portfolio, phỏng vấn, kỹ năng mềm và cách ứng tuyển. Hãy mô tả rõ tình huống hoặc mục tiêu của bạn; nếu câu hỏi liên quan y tế, pháp lý hoặc tài chính quan trọng, bạn nên tham khảo chuyên gia hoặc nguồn chính thức.'
}

app.post('/api/chat', optionalAuthentication, async (request, response) => {
  const message = typeof request.body?.message === 'string' ? request.body.message.trim() : ''
  if (!message || message.length > 2000) {
    return response.status(400).json({ error: 'Tin nhắn phải có từ 1 đến 2000 ký tự.' })
  }

  const clientKey = request.auth?.user.id ? `user:${request.auth.user.id}` : request.ip
  const now = Date.now()
  const recent = (chatRequestTimes.get(clientKey) ?? []).filter((time) => now - time < 60_000)
  if (recent.length >= 15) {
    return response.status(429).json({ error: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau một phút.' })
  }
  chatRequestTimes.set(clientKey, [...recent, now])
  if (chatRequestTimes.size > 5000) {
    for (const [key, times] of chatRequestTimes) {
      if (!times.some((time) => now - time < 60_000)) chatRequestTimes.delete(key)
    }
  }

  const history = Array.isArray(request.body?.history)
    ? request.body.history
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 2000) }))
      .filter((item) => item.content)
    : []
  const endpoint = process.env.CHATBOT_API_URL?.trim()
  if (!endpoint) return response.json({ reply: localChatReply(message), source: 'local' })

  let endpointUrl
  try {
    endpointUrl = new URL(endpoint)
    if (!['http:', 'https:'].includes(endpointUrl.protocol)) throw new Error('protocol')
  } catch {
    console.error('CHATBOT_API_URL không hợp lệ.')
    return response.status(500).json({ error: 'Dịch vụ AI chưa được cấu hình hợp lệ.' })
  }

  const jobs = await all(`
    SELECT id, title, company, location, category, slots, deadline
    FROM jobs WHERE status = 'approved'
    ORDER BY id DESC
  `)
  const jobContext = jobs.slice(0, 20).map((job) => (
    `${job.title} tại ${job.company} (${job.location}, lĩnh vực ${job.category})`
  )).join('; ')
  const systemPrompt = [
    'Bạn là trợ lý StuWork, trả lời bằng tiếng Việt, thân thiện, hữu ích và súc tích.',
    'Bạn được phép trả lời các câu hỏi ngoài tuyển dụng nếu an toàn, nhưng không bịa thông tin thời sự, số liệu hoặc chính sách công ty.',
    'Với câu hỏi cần thông tin cập nhật, hãy nói rõ giới hạn kiến thức và hướng người dùng kiểm tra nguồn chính thức.',
    'Không yêu cầu hoặc suy luận thông tin nhạy cảm; cảnh báo nhẹ khi câu hỏi thuộc y tế, pháp lý hoặc tài chính quan trọng.',
    `Các việc làm hiện có trên StuWork: ${jobContext || 'hiện chưa có tin đã duyệt'}.`,
  ].join('\n')

  try {
    const providerResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CHATBOT_API_KEY ? { Authorization: `Bearer ${process.env.CHATBOT_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.CHATBOT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!providerResponse.ok) {
      console.error(`Nhà cung cấp chatbot trả lỗi HTTP ${providerResponse.status}.`)
      return response.status(502).json({ error: 'Trợ lý AI nâng cao đang tạm thời gián đoạn. Câu trả lời cơ bản vẫn khả dụng.' })
    }
    const result = await providerResponse.json()
    const reply = result?.choices?.[0]?.message?.content
      || result?.output?.[0]?.content?.[0]?.text
      || result?.reply
    if (typeof reply !== 'string' || !reply.trim()) {
      return response.status(502).json({ error: 'Dịch vụ AI trả về nội dung không hợp lệ.' })
    }
    return response.json({ reply: reply.trim(), source: 'ai' })
  } catch (error) {
    console.error('Không thể gọi dịch vụ chatbot:', error)
    return response.status(502).json({ error: 'Trợ lý AI nâng cao đang tạm thời gián đoạn. Câu trả lời cơ bản vẫn khả dụng.' })
  }
})

app.get('/api/jobs/:id', async (request, response) => {
  const jobId = Number(request.params.id)
  if (!Number.isSafeInteger(jobId) || jobId < 1) {
    return response.status(400).json({ error: 'Mã công việc không hợp lệ.' })
  }
  const job = await get(`
    SELECT id, title, company, location, salary_min, salary_max, type, category, tone, logo,
           description, requirements, benefits, slots, deadline, created_at
    FROM jobs
    WHERE id = ? AND status = 'approved'
  `, [jobId])
  if (!job) return response.status(404).json({ error: 'Không tìm thấy công việc này.' })
  return response.json({ job })
})

app.post('/api/jobs/:id/apply', authenticateRequest, requireSeeker, async (request, response) => {
  const jobId = Number(request.params.id)
  if (!Number.isSafeInteger(jobId) || jobId < 1) {
    return response.status(400).json({ error: 'Mã công việc không hợp lệ.' })
  }
  const coverLetter = optionalText(request.body?.coverLetter, 2000)
  if (coverLetter.error) return response.status(400).json({ error: 'Thư giới thiệu tối đa 2000 ký tự.' })

  // Kiểm tra slot và ghi đơn trong cùng một transaction để hai người không giành nhau slot cuối.
  const result = await withTransaction(async (transaction) => {
    const job = await get(
      "SELECT id, slots, deadline FROM jobs WHERE id = ? AND status = 'approved'",
      [jobId],
      transaction,
    )
    if (!job) return { status: 404, error: 'Không tìm thấy công việc này.' }
    const user = await get('SELECT cv_path, cv_original_name FROM users WHERE id = ?', [request.auth.user.id], transaction)
    if (!user?.cv_path) return { status: 400, error: 'Bạn cần tải CV lên hồ sơ trước khi ứng tuyển.' }
    const deadline = parseDeadline(job.deadline)
    if (deadline && deadline.getTime() < Date.now()) {
      return { status: 410, error: 'Tin tuyển dụng này đã hết hạn nộp hồ sơ.' }
    }
    const existing = await get('SELECT id, status FROM applications WHERE user_id = ? AND job_id = ?', [request.auth.user.id, jobId], transaction)
    if (existing?.status === 'submitted') return { status: 409, error: 'Bạn đã ứng tuyển công việc này rồi.' }
    const { applied } = await get(
      "SELECT COUNT(*) AS applied FROM applications WHERE job_id = ? AND status = 'submitted' AND decision_status IN ('pending', 'accepted')",
      [jobId],
      transaction,
    )
    if (applied >= job.slots) return { status: 409, error: 'Công việc này đã đủ số lượng tuyển (hết slot).' }

    if (existing) {
      await run(`
        UPDATE applications SET status = 'submitted', cover_letter = ?, cv_path = ?, cv_original_name = ?,
          decision_status = 'pending', employer_seen = 0, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [coverLetter.value, user.cv_path, user.cv_original_name, existing.id], transaction)
    } else {
      await run(`
        INSERT INTO applications (user_id, job_id, cover_letter, cv_path, cv_original_name)
        VALUES (?, ?, ?, ?, ?)
      `, [request.auth.user.id, jobId, coverLetter.value, user.cv_path, user.cv_original_name], transaction)
    }
    return { status: 201 }
  }, { immediate: true })
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.status(201).json({
    message: 'Ứng tuyển thành công.',
    availability: await getJobAvailability(jobId, request.auth.user.id),
  })
})

app.get('/api/applications', authenticateRequest, requireSeeker, async (request, response) => {
  const rows = await all(`
    SELECT a.id, a.job_id, a.status, a.decision_status, a.created_at, a.cv_original_name, j.title, j.company
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.user_id = ? AND a.status = 'submitted'
    ORDER BY a.created_at DESC
  `, [request.auth.user.id])
  const applications = rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    company: row.company,
    decisionStatus: row.decision_status || 'pending',
    cv: row.cv_original_name,
    createdAt: row.created_at,
  }))
  return response.json({ applications })
})

app.delete('/api/applications/:id', authenticateRequest, requireSeeker, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã đơn ứng tuyển không hợp lệ.' })
  const result = await run(`
    UPDATE applications SET status = 'withdrawn' WHERE id = ? AND user_id = ? AND status = 'submitted'
  `, [id, request.auth.user.id])
  if (result.changes === 0) return response.status(404).json({ error: 'Không tìm thấy đơn ứng tuyển.' })
  return response.json({ message: 'Đã rút đơn ứng tuyển. Slot đã được trả lại.' })
})


// Nhà tuyển dụng chỉ xem và xử lý hồ sơ thuộc doanh nghiệp đã khai báo trong tài khoản.
async function getEmployerJob(jobId, userId, transaction) {
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [userId], transaction)
  if (!company?.name) return null
  const job = await get(
    'SELECT id, title, company, slots, status FROM jobs WHERE id = ?',
    [jobId],
    transaction,
  )
  return job?.company.trim().toLocaleLowerCase('vi') === company.name.trim().toLocaleLowerCase('vi')
    ? job
    : null
}

app.get('/api/employer/applications', authenticateRequest, requireEmployer, async (request, response) => {
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [request.auth.user.id])
  if (!company?.name) return response.json({ applications: [], companyName: '' })
  const rows = await all(`
    SELECT a.id, a.job_id, a.cover_letter, a.cv_original_name, a.created_at, a.decision_status,
           u.name, u.email, u.phone, u.university, u.major, u.graduation_year, u.skills, u.bio,
           j.title, j.company
    FROM applications a
    JOIN users u ON u.id = a.user_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.status = 'submitted'
    ORDER BY a.created_at DESC
  `)
  const applications = rows
    .filter((row) => row.company.trim().toLocaleLowerCase('vi') === company.name.trim().toLocaleLowerCase('vi'))
    .map((row) => ({
      id: row.id, jobId: row.job_id, title: row.title, company: row.company,
      name: row.name, email: row.email, phone: row.phone, university: row.university || '',
      major: row.major || '', graduationYear: row.graduation_year || '',
      skills: row.skills || '', bio: row.bio || '', coverLetter: row.cover_letter || '',
      cvName: row.cv_original_name, createdAt: row.created_at,
      decisionStatus: row.decision_status || 'pending',
    }))
  return response.json({ applications, companyName: company.name })
})

app.patch('/api/employer/applications/:id/decision', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  const { decisionStatus } = request.body ?? {}
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã hồ sơ không hợp lệ.' })
  if (!['accepted', 'rejected', 'pending'].includes(decisionStatus)) return response.status(400).json({ error: 'Kết quả tuyển dụng không hợp lệ.' })
  const result = await withTransaction(async (transaction) => {
    const application = await get(`
      SELECT a.id, a.job_id, a.status, a.decision_status,
             u.name AS candidate_name, u.email, j.title, j.company
      FROM applications a
      JOIN users u ON u.id = a.user_id
      JOIN jobs j ON j.id = a.job_id
      WHERE a.id = ?
    `, [id], transaction)
    if (!application || application.status !== 'submitted') return { status: 404, error: 'Không tìm thấy hồ sơ ứng tuyển.' }
    const job = await getEmployerJob(application.job_id, request.auth.user.id, transaction)
    if (!job) return { status: 403, error: 'Bạn không có quyền quản lý hồ sơ của tin này.' }
    if (decisionStatus !== 'rejected') {
      const { applied } = await get(`
        SELECT COUNT(*) AS applied
        FROM applications
        WHERE job_id = ? AND status = 'submitted'
          AND decision_status IN ('pending', 'accepted')
          AND id <> ?
      `, [application.job_id, id], transaction)
      if (applied >= Number(job.slots)) return { status: 409, error: 'Tin tuyển dụng đã hết slot.' }
    }
    const shouldNotify = application.decision_status !== decisionStatus
      && ['accepted', 'rejected'].includes(decisionStatus)
    await run('UPDATE applications SET decision_status = ? WHERE id = ?', [decisionStatus, id], transaction)
    return { status: 200, shouldNotify, application }
  }, { immediate: true })
  if (result.error) return response.status(result.status).json({ error: result.error })
  let emailStatus
  let emailError
  if (result.shouldNotify) {
    try {
      const emailResult = await notifyApplicationResult({
        to: result.application.email,
        candidateName: result.application.candidate_name,
        jobTitle: result.application.title,
        company: result.application.company,
        result: decisionStatus,
      })
      emailStatus = emailResult.status
      emailError = emailResult.error
    } catch (error) {
      console.error('Không thể ghi nhận email kết quả ứng tuyển:', error)
      emailStatus = 'failed'
      emailError = 'Không thể gửi hoặc ghi nhật ký email. Trạng thái hồ sơ vẫn đã được cập nhật.'
    }
  }
  return response.json({
    message: decisionStatus === 'accepted' ? 'Đã xác nhận trúng tuyển.' : decisionStatus === 'rejected' ? 'Đã từ chối ứng viên và giải phóng slot.' : 'Đã đưa hồ sơ về trạng thái chờ xử lý.',
    ...(emailStatus ? { emailStatus, ...(emailError ? { emailError } : {}) } : {}),
  })
})

app.get('/api/employer/applications/:id/cv', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã hồ sơ không hợp lệ.' })
  const row = await get(`
    SELECT a.cv_path, a.cv_original_name, a.job_id
    FROM applications a WHERE a.id = ? AND a.status = 'submitted'
  `, [id])
  if (!row || !(await getEmployerJob(row.job_id, request.auth.user.id))) {
    return response.status(404).json({ error: 'Không tìm thấy CV hoặc bạn không có quyền truy cập.' })
  }
  if (!existsSync(resolve(cvDirectory, row.cv_path))) return response.status(404).json({ error: 'File CV không còn tồn tại.' })
  const extension = `.${row.cv_path.split('.').pop()}`
  response.type(cvTypes[extension]?.mime ?? 'application/octet-stream')
  return response.download(resolve(cvDirectory, row.cv_path), row.cv_original_name)
})

app.get('/api/bookmarks', authenticateRequest, requireSeeker, async (request, response) => {
  const savedJobs = await all(`
    SELECT b.job_id, b.created_at, j.title, j.company
    FROM bookmarks b
    JOIN jobs j ON j.id = b.job_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `, [request.auth.user.id])
  const bookmarks = savedJobs.map((job) => ({
    jobId: job.job_id,
    title: job.title,
    company: job.company,
    createdAt: job.created_at,
  }))
  return response.json({ bookmarks })
})

app.post('/api/bookmarks/:jobId', authenticateRequest, requireSeeker, async (request, response) => {
  const jobId = Number(request.params.jobId)
  if (!Number.isSafeInteger(jobId) || jobId < 1) {
    return response.status(400).json({ error: 'Mã công việc không hợp lệ.' })
  }
  const job = await get("SELECT id FROM jobs WHERE id = ? AND status = 'approved'", [jobId])
  if (!job) return response.status(404).json({ error: 'Không tìm thấy tin tuyển dụng.' })
  await withTransaction(async (transaction) => {
    const existing = await get('SELECT id FROM bookmarks WHERE user_id = ? AND job_id = ?', [request.auth.user.id, jobId], transaction)
    if (!existing) await run('INSERT INTO bookmarks (user_id, job_id) VALUES (?, ?)', [request.auth.user.id, jobId], transaction)
  }, { immediate: true })
  return response.status(201).json({ message: 'Đã lưu tin tuyển dụng.' })
})

app.delete('/api/bookmarks/:jobId', authenticateRequest, requireSeeker, async (request, response) => {
  const jobId = Number(request.params.jobId)
  await run('DELETE FROM bookmarks WHERE user_id = ? AND job_id = ?', [request.auth.user.id, jobId])
  return response.json({ message: 'Đã bỏ lưu tin tuyển dụng.' })
})

const jobTypes = ['Internship', 'Full-time', 'Part-time']
const jobCategories = [
  'Công nghệ thông tin', 'Marketing', 'Tài chính — Kế toán', 'Thiết kế sáng tạo',
  'Kinh doanh', 'Nhân sự', 'Chăm sóc khách hàng', 'Giáo dục',
]
// Nhà tuyển dụng chỉ được ẩn/hiện/đóng/mở lại tin; duyệt và từ chối là việc của admin.
const employerJobTransitions = {
  approved: ['hidden', 'closed'],
  hidden: ['approved', 'closed'],
  closed: ['approved'],
}

function readJobList(value, label) {
  if (value === undefined || value === null) return { value: [] }
  const items = Array.isArray(value) ? value : null
  if (!items || items.some((item) => typeof item !== 'string')) return { error: `${label} không hợp lệ.` }
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  if (cleaned.length > 10 || cleaned.some((item) => item.length > 200)) {
    return { error: `${label} tối đa 10 dòng, mỗi dòng không quá 200 ký tự.` }
  }
  return { value: cleaned }
}

function readSalary(value) {
  if (value === undefined || value === null || value === '') return { value: null }
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0 || number > 1000) return { error: true }
  return { value: number }
}

function isValidDeadline(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false
  const [day, month, year] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function parseJobInput(body) {
  const input = body ?? {}
  const text = (value) => (typeof value === 'string' ? value.trim() : '')
  const title = text(input.title)
  const location = text(input.location)
  const description = text(input.description)
  const deadline = text(input.deadline)
  const slots = Number(input.slots)
  const salaryMin = readSalary(input.salaryMin)
  const salaryMax = readSalary(input.salaryMax)
  const requirements = readJobList(input.requirements, 'Yêu cầu ứng viên')
  const benefits = readJobList(input.benefits, 'Quyền lợi')

  if (title.length < 3 || title.length > 200) return { error: 'Tiêu đề cần có từ 3 đến 200 ký tự.' }
  if (location.length < 2 || location.length > 200) return { error: 'Địa điểm cần có từ 2 đến 200 ký tự.' }
  if (!jobTypes.includes(input.type)) return { error: 'Hình thức làm việc không hợp lệ.' }
  if (!jobCategories.includes(input.category)) return { error: 'Lĩnh vực không hợp lệ.' }
  if (description.length < 10 || description.length > 3000) return { error: 'Mô tả công việc cần có từ 10 đến 3000 ký tự.' }
  if (!Number.isInteger(slots) || slots < 1 || slots > 1000) return { error: 'Số lượng tuyển phải từ 1 đến 1000.' }
  if (salaryMin.error || salaryMax.error) return { error: 'Mức lương phải là số nguyên từ 0 đến 1000 (triệu đồng).' }
  if ((salaryMin.value === null) !== (salaryMax.value === null)) return { error: 'Vui lòng nhập đủ lương tối thiểu và tối đa, hoặc để trống cả hai.' }
  if (salaryMin.value !== null && salaryMin.value > salaryMax.value) return { error: 'Lương tối thiểu không được lớn hơn lương tối đa.' }
  if (requirements.error) return { error: requirements.error }
  if (benefits.error) return { error: benefits.error }
  if (deadline && !isValidDeadline(deadline)) return { error: 'Hạn nộp hồ sơ cần theo định dạng DD/MM/YYYY.' }
  if (deadline && parseDeadline(deadline).getTime() < Date.now()) return { error: 'Hạn nộp hồ sơ phải ở tương lai.' }

  return {
    job: {
      title, location, description, slots,
      type: input.type,
      category: input.category,
      salaryMin: salaryMin.value,
      salaryMax: salaryMax.value,
      requirements: requirements.value,
      benefits: benefits.value,
      deadline: deadline || null,
    },
  }
}

function parseStoredList(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function countActiveApplications(jobId, transaction) {
  const { applied } = await get(`
    SELECT COUNT(*) AS applied FROM applications
    WHERE job_id = ? AND status = 'submitted' AND decision_status IN ('pending', 'accepted')
  `, [jobId], transaction)
  return applied
}

app.get('/api/employer/jobs', authenticateRequest, requireEmployer, async (request, response) => {
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [request.auth.user.id])
  if (!company?.name) return response.json({ jobs: [], companyName: '', allowedTransitions: employerJobTransitions })
  const rows = await all(`
    SELECT id, title, company, location, salary_min, salary_max, type, category, description,
           requirements, benefits, slots, deadline, status, review_note, reviewed_at, created_at
    FROM jobs
    ORDER BY created_at DESC, id DESC
  `)
  const counts = await all(`
    SELECT job_id,
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'submitted' AND decision_status IN ('pending', 'accepted') THEN 1 ELSE 0 END) AS applied
    FROM applications
    GROUP BY job_id
  `)
  const countByJob = new Map(counts.map((row) => [Number(row.job_id), row]))
  const companyName = company.name.trim().toLocaleLowerCase('vi')
  const jobs = rows
    .filter((row) => row.company.trim().toLocaleLowerCase('vi') === companyName)
    .map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      type: row.type,
      category: row.category,
      description: row.description,
      requirements: parseStoredList(row.requirements),
      benefits: parseStoredList(row.benefits),
      slots: row.slots,
      deadline: row.deadline || '',
      status: row.status,
      reviewNote: row.review_note || '',
      createdAt: row.created_at,
      applied: Number(countByJob.get(row.id)?.applied ?? 0),
      totalApplications: Number(countByJob.get(row.id)?.total ?? 0),
    }))
  return response.json({ jobs, companyName: company.name, allowedTransitions: employerJobTransitions })
})

app.post('/api/employer/jobs', authenticateRequest, requireEmployer, async (request, response) => {
  const parsed = parseJobInput(request.body)
  if (parsed.error) return response.status(400).json({ error: parsed.error })
  const company = await get('SELECT name FROM companies WHERE user_id = ?', [request.auth.user.id])
  if (!company?.name) {
    return response.status(400).json({ error: 'Vui lòng cập nhật Thông tin doanh nghiệp trước khi đăng tin.' })
  }
  const { job } = parsed
  await run(`
    INSERT INTO jobs (
      title, company, location, salary_min, salary_max, type, category,
      tone, logo, description, requirements, benefits, slots, deadline, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'teal', ?, ?, ?, ?, ?, ?, 'pending')
  `, [
    job.title, company.name.trim(), job.location, job.salaryMin, job.salaryMax, job.type, job.category,
    company.name.trim().charAt(0).toLocaleUpperCase('vi'), job.description,
    JSON.stringify(job.requirements), JSON.stringify(job.benefits), job.slots, job.deadline,
  ])
  return response.status(201).json({ message: 'Đã đăng tin. Tin sẽ hiển thị sau khi quản trị viên duyệt.' })
})

app.put('/api/employer/jobs/:id', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã tin tuyển dụng không hợp lệ.' })
  const parsed = parseJobInput(request.body)
  if (parsed.error) return response.status(400).json({ error: parsed.error })
  const { job } = parsed
  const result = await withTransaction(async (transaction) => {
    if (!(await getEmployerJob(id, request.auth.user.id, transaction))) {
      return { status: 404, error: 'Không tìm thấy tin tuyển dụng của bạn.' }
    }
    if (job.slots < await countActiveApplications(id, transaction)) {
      return { status: 409, error: 'Số lượng tuyển không được nhỏ hơn số hồ sơ đang chiếm slot.' }
    }
    // Sửa nội dung thì tin quay về "Chờ duyệt" để admin kiểm tra lại.
    await run(`
      UPDATE jobs
      SET title = ?, location = ?, salary_min = ?, salary_max = ?, type = ?, category = ?,
          description = ?, requirements = ?, benefits = ?, slots = ?, deadline = ?,
          status = 'pending', review_note = NULL, reviewed_at = NULL
      WHERE id = ?
    `, [
      job.title, job.location, job.salaryMin, job.salaryMax, job.type, job.category,
      job.description, JSON.stringify(job.requirements), JSON.stringify(job.benefits), job.slots, job.deadline, id,
    ], transaction)
    const updatedJob = await get(`
      SELECT id, title, company, location, salary_min, salary_max, type, category, tone, logo,
             description, requirements, benefits, slots, deadline, created_at, status
      FROM jobs
      WHERE id = ?
    `, [id], transaction)
    return { status: 200, job: updatedJob }
  }, { immediate: true })
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.json({
    message: 'Đã lưu thay đổi. Tin được gửi lại để quản trị viên duyệt.',
    job: result.job,
  })
})

app.patch('/api/employer/jobs/:id/status', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  const { status } = request.body ?? {}
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã tin tuyển dụng không hợp lệ.' })
  if (!jobStatuses.includes(status)) return response.status(400).json({ error: 'Trạng thái không hợp lệ.' })
  const result = await withTransaction(async (transaction) => {
    const job = await getEmployerJob(id, request.auth.user.id, transaction)
    if (!job) return { status: 404, error: 'Không tìm thấy tin tuyển dụng của bạn.' }
    if (!(employerJobTransitions[job.status] ?? []).includes(status)) {
      return { status: 409, error: 'Bạn không thể chuyển tin sang trạng thái này ở thời điểm hiện tại.' }
    }
    await run('UPDATE jobs SET status = ? WHERE id = ? AND status = ?', [status, id, job.status], transaction)
    return { status: 200 }
  }, { immediate: true })
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.json({ message: 'Đã cập nhật trạng thái tin tuyển dụng.' })
})

app.delete('/api/employer/jobs/:id', authenticateRequest, requireEmployer, async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ error: 'Mã tin tuyển dụng không hợp lệ.' })
  const result = await withTransaction(async (transaction) => {
    if (!(await getEmployerJob(id, request.auth.user.id, transaction))) {
      return { status: 404, error: 'Không tìm thấy tin tuyển dụng của bạn.' }
    }
    const { total } = await get('SELECT COUNT(*) AS total FROM applications WHERE job_id = ?', [id], transaction)
    if (total > 0) {
      return { status: 409, error: 'Tin đã có hồ sơ ứng tuyển nên không thể xóa. Hãy dùng Ẩn tin hoặc Đóng tuyển.' }
    }
    await run('DELETE FROM bookmarks WHERE job_id = ?', [id], transaction)
    await run('DELETE FROM jobs WHERE id = ?', [id], transaction)
    return { status: 200 }
  }, { immediate: true })
  if (result.error) return response.status(result.status).json({ error: result.error })
  return response.json({ message: 'Đã xóa tin tuyển dụng.' })
})

const emptyCompany = { name: '', industry: '', size: '', address: '', website: '', description: '' }

app.get('/api/company', authenticateRequest, requireEmployer, async (request, response) => {
  const company = await get(
    'SELECT name, industry, size, address, website, description FROM companies WHERE user_id = ?',
    [request.auth.user.id],
  )
  return response.json({ company: company ?? emptyCompany })
})

app.put('/api/company', authenticateRequest, requireEmployer, async (request, response) => {
  const body = request.body ?? {}
  const readText = (value) => (typeof value === 'string' ? value.trim() : '')
  const company = {
    name: readText(body.name),
    industry: readText(body.industry),
    size: readText(body.size),
    address: readText(body.address),
    website: readText(body.website),
    description: readText(body.description),
  }
  if (company.name.length < 2 || company.name.length > 100) {
    return response.status(400).json({ error: 'Tên doanh nghiệp cần có từ 2 đến 100 ký tự.' })
  }
  if (company.industry.length > 80 || company.size.length > 40 || company.address.length > 200) {
    return response.status(400).json({ error: 'Ngành nghề, quy mô hoặc địa chỉ quá dài.' })
  }
  if (company.website && !/^https?:\/\/\S+\.\S+$/i.test(company.website)) {
    return response.status(400).json({ error: 'Website cần bắt đầu bằng http:// hoặc https://.' })
  }
  if (company.description.length > 1000) {
    return response.status(400).json({ error: 'Giới thiệu không được vượt quá 1000 ký tự.' })
  }
  await withTransaction(async (transaction) => {
    const existing = await get('SELECT user_id, name FROM companies WHERE user_id = ?', [request.auth.user.id], transaction)
    const values = [company.name, company.industry, company.size, company.address, company.website, company.description]
    if (existing) {
      await run(`
        UPDATE companies
        SET name = ?, industry = ?, size = ?, address = ?, website = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [...values, request.auth.user.id], transaction)
      // Tin tuyển dụng gắn với doanh nghiệp theo tên, nên đổi tên công ty phải đổi theo để không mất quyền quản lý tin.
      if (existing.name !== company.name) {
        const oldName = existing.name.trim().toLocaleLowerCase('vi')
        const jobs = await all('SELECT id, company FROM jobs', [], transaction)
        for (const job of jobs.filter((item) => item.company.trim().toLocaleLowerCase('vi') === oldName)) {
          await run('UPDATE jobs SET company = ?, logo = ? WHERE id = ?', [
            company.name,
            company.name.charAt(0).toLocaleUpperCase('vi'),
            job.id,
          ], transaction)
        }
      }
    } else {
      await run(`
        INSERT INTO companies (user_id, name, industry, size, address, website, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [request.auth.user.id, ...values], transaction)
    }
  }, { immediate: true })
  return response.json({ message: 'Đã lưu thông tin doanh nghiệp.', company })
})

// Thông tin doanh nghiệp công khai: nguồn chung cho trang CompanyDetail và thẻ công ty của chatbot.
app.get('/api/companies', async (_request, response) => {
  const companies = await all('SELECT name, industry, size, address, website, description FROM companies ORDER BY name')
  return response.json({ companies: companies.filter((company) => company.name?.trim()) })
})
const jobStatuses = ['pending', 'approved', 'rejected', 'hidden', 'closed']
const allowedJobTransitions = {
    pending: ['approved', 'rejected'],
    approved: ['hidden', 'closed'],
    hidden: ['approved', 'closed'],
    closed: ['approved'],
    rejected: ['approved'],
}
app.get('/api/admin/jobs', authenticateRequest, requireAdmin, async (request, response) => {
    const status = request.query.status
    if (status !== undefined && (typeof status !== 'string' || !jobStatuses.includes(status))) {
        return response.status(400).json({ error: 'Trạng thái lọc không hợp lệ.' })
    }
    const columns = 'id, title, company, location, type, category, status, review_note, reviewed_at, created_at'
    const rows = status
        ? await all(`SELECT ${columns} FROM jobs WHERE status = ? ORDER BY created_at DESC, id DESC`, [status])
        : await all(`SELECT ${columns} FROM jobs ORDER BY created_at DESC, id DESC`)
    return response.json({ jobs: rows, allowedTransitions: allowedJobTransitions })
})
app.patch('/api/admin/jobs/:id/status', authenticateRequest, requireAdmin, async (request, response) => {
    const id = Number(request.params.id)
    const { status, note } = request.body ?? {}
    if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ error: 'Mã tin tuyển dụng không hợp lệ.' })
    }
    if (!jobStatuses.includes(status)) {
        return response.status(400).json({ error: 'Trạng thái không hợp lệ.' })
    }
    const reviewNote = typeof note === 'string' ? note.trim() : ''
    if (reviewNote.length > 500) {
        return response.status(400).json({ error: 'Ghi chú tối đa 500 ký tự.' })
    }
    if (status === 'rejected' && reviewNote.length < 5) {
        return response.status(400).json({ error: 'Vui lòng nhập lý do từ chối (ít nhất 5 ký tự).' })
    }
    const job = await get('SELECT id, status FROM jobs WHERE id = ?', [id])
    if (!job) return response.status(404).json({ error: 'Không tìm thấy tin tuyển dụng.' })
    if (!(allowedJobTransitions[job.status] ?? []).includes(status)) {
        return response.status(409).json({ error: `Không thể chuyển tin từ “${job.status}” sang “${status}”.` })
    }
    // AND status = ? : nếu admin khác vừa đổi trạng thái thì lệnh này không cập nhật dòng nào.
    const result = await run(`
    UPDATE jobs SET status = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = ?
  `, [status, reviewNote || null, id, job.status])
    if (result.changes === 0) {
        return response.status(409).json({ error: 'Tin vừa được người khác cập nhật. Vui lòng tải lại danh sách.' })
    }
    return response.json({ message: 'Đã cập nhật trạng thái tin tuyển dụng.' })
})
app.get('/api/admin/emails', authenticateRequest, requireAdmin, async (_request, response) => {
    // Không dùng LIMIT/TOP vì SQLite và SQL Server viết khác nhau; bảng nhỏ nên cắt ở đây.
    const emails = await all('SELECT id, to_email, subject, body, status, error, created_at FROM email_outbox ORDER BY id DESC')
    return response.json({ emails: emails.slice(0, 50) })
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({ error: 'File quá lớn. CV tối đa 5 MB.' })
  }
  console.error('API request failed:', error)
  response.status(500).json({ error: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.' })
})

async function initializeSupportAccount() {
  const settings = {
    name: process.env.SUPPORT_NAME,
    email: process.env.SUPPORT_EMAIL,
    phone: process.env.SUPPORT_PHONE,
    password: process.env.SUPPORT_PASSWORD,
  }
  const configuredValues = Object.values(settings).filter(Boolean).length
  if (configuredValues === 0) return
  if (configuredValues !== Object.keys(settings).length) {
    throw new Error('Cần cấu hình đầy đủ SUPPORT_NAME, SUPPORT_EMAIL, SUPPORT_PHONE và SUPPORT_PASSWORD để tạo tài khoản hỗ trợ.')
  }
  if (typeof settings.name !== 'string' || settings.name.trim().length < 2 || settings.name.trim().length > 80
    || !isEmail(settings.email.trim()) || !isPhoneInput(settings.phone)
    || settings.password.length < 8 || Buffer.byteLength(settings.password, 'utf8') > 72) {
    throw new Error('Thông tin SUPPORT_* không hợp lệ; hãy kiểm tra tên, email, điện thoại và mật khẩu (8–72 byte).')
  }

  const email = settings.email.trim().toLowerCase()
  const existingUser = await get('SELECT role FROM users WHERE email = ?', [email])
  if (existingUser) {
    if (existingUser.role !== 'support') {
      throw new Error('Email SUPPORT_EMAIL đã được dùng bởi tài khoản không có role support.')
    }
    return
  }

  const passwordHash = await bcrypt.hash(settings.password, bcryptRounds)
  await run(`
    INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'support')
  `, [settings.name.trim(), email, normalizePhone(settings.phone), passwordHash])
  console.log(`Tài khoản hỗ trợ đã được tạo: ${email}`)
}

async function initializeEmployerAccount() {
  const settings = {
    name: process.env.EMPLOYER_NAME,
    email: process.env.EMPLOYER_EMAIL,
    phone: process.env.EMPLOYER_PHONE,
    password: process.env.EMPLOYER_PASSWORD,
  }
  const configuredValues = Object.values(settings).filter(Boolean).length
  if (configuredValues === 0) return
  if (configuredValues !== Object.keys(settings).length) {
    throw new Error('Cần cấu hình đầy đủ EMPLOYER_NAME, EMPLOYER_EMAIL, EMPLOYER_PHONE và EMPLOYER_PASSWORD để tạo tài khoản nhà tuyển dụng.')
  }
  if (settings.name.trim().length < 2 || settings.name.trim().length > 80
    || !isEmail(settings.email.trim()) || !isPhoneInput(settings.phone)
    || settings.password.length < 8 || Buffer.byteLength(settings.password, 'utf8') > 72) {
    throw new Error('Thông tin EMPLOYER_* không hợp lệ; hãy kiểm tra tên, email, điện thoại và mật khẩu (8–72 byte).')
  }

  const email = settings.email.trim().toLowerCase()
  const phone = normalizePhone(settings.phone)
  const existingUsers = await all('SELECT id, email, phone, role FROM users WHERE email = ? OR phone = ?', [email, phone])
  if (existingUsers.length > 0) {
    const matchingEmployer = existingUsers.length === 1
      && existingUsers[0].role === 'employer'
      && existingUsers[0].email === email
      && existingUsers[0].phone === phone
    if (!matchingEmployer) {
      throw new Error('EMPLOYER_EMAIL hoặc EMPLOYER_PHONE đã được dùng bởi tài khoản khác.')
    }
    return
  }

  const passwordHash = await bcrypt.hash(settings.password, bcryptRounds)
  await run(`
    INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'employer')
  `, [settings.name.trim(), email, phone, passwordHash])
  console.log(`Tài khoản nhà tuyển dụng đã được tạo: ${email}`)
}
async function initializeAdminAccount() {
    const settings = {
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        phone: process.env.ADMIN_PHONE,
        password: process.env.ADMIN_PASSWORD,
    }
    const configuredValues = Object.values(settings).filter(Boolean).length
    if (configuredValues === 0) return
    if (configuredValues !== Object.keys(settings).length) {
        throw new Error('Cần cấu hình đầy đủ ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE và ADMIN_PASSWORD để tạo tài khoản quản trị viên.')
    }
    if (settings.name.trim().length < 2 || settings.name.trim().length > 80
        || !isEmail(settings.email.trim()) || !isPhoneInput(settings.phone)
        || settings.password.length < 8 || Buffer.byteLength(settings.password, 'utf8') > 72) {
        throw new Error('Thông tin ADMIN_* không hợp lệ; hãy kiểm tra tên, email, điện thoại và mật khẩu (8–72 byte).')
    }
    const email = settings.email.trim().toLowerCase()
    const phone = normalizePhone(settings.phone)
    const existingUsers = await all('SELECT id, email, phone, role FROM users WHERE email = ? OR phone = ?', [email, phone])
    if (existingUsers.length > 0) {
        const matchingAdmin = existingUsers.length === 1
            && existingUsers[0].role === 'admin'
            && existingUsers[0].email === email
            && existingUsers[0].phone === phone
        if (!matchingAdmin) {
            throw new Error('ADMIN_EMAIL hoặc ADMIN_PHONE đã được dùng bởi tài khoản khác.')
        }
        return
    }
    const passwordHash = await bcrypt.hash(settings.password, bcryptRounds)
    await run(`
    INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'admin')
  `, [settings.name.trim(), email, phone, passwordHash])
    console.log(`Tài khoản quản trị viên đã được tạo: ${email}`)
}
await initializeSupportAccount()
await initializeEmployerAccount()
await initializeAdminAccount()

app.listen(port, () => {
  console.log(`StuWork API listening on http://localhost:${port}`)
})
