import { randomBytes, randomInt } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import express from 'express'

const directory = dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(directory, 'data', 'stuwork.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

const database = new Database(databasePath)
database.pragma('journal_mode = WAL')
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'seeker',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)
if (!database.pragma('table_info(users)').some((column) => column.name === 'role')) {
  database.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'seeker'")
}
database.exec(`
  CREATE TABLE IF NOT EXISTS contact_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
    assigned_role TEXT NOT NULL DEFAULT 'support',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const app = express()
const otpByIdentifier = new Map()
const resetTokens = new Map()
const requestTimes = new Map()
const sessions = new Map()
const port = Number(process.env.PORT) || 3001
const bcryptRounds = 12
const otpLifetimeMs = 5 * 60 * 1000
const resetTokenLifetimeMs = 10 * 60 * 1000
const otpResendDelayMs = 60 * 1000
const sessionLifetimeMs = 12 * 60 * 60 * 1000

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

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

function getUserByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier)
  return normalized.includes('@')
    ? database.prepare('SELECT id, email, phone FROM users WHERE email = ?').get(normalized)
    : database.prepare('SELECT id, email, phone FROM users WHERE phone = ?').get(normalized)
}

app.post('/api/auth/register', async (request, response) => {
  const { name, email, phone, password } = request.body ?? {}
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

  const existingUser = database.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(normalizedEmail, normalizedPhone)
  if (existingUser) {
    return response.status(409).json({ error: 'Email hoặc số điện thoại này đã được đăng ký.' })
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds)
  database.prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
    .run(name.trim(), normalizedEmail, normalizedPhone, passwordHash)
  return response.status(201).json({ message: 'Tạo tài khoản thành công.' })
})

app.post('/api/auth/login', async (request, response) => {
  const { identifier, password } = request.body ?? {}
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Vui lòng nhập email/số điện thoại và mật khẩu.' })
  }
  const normalized = normalizeIdentifier(identifier)
  const user = normalized.includes('@')
    ? database.prepare('SELECT id, name, email, phone, password_hash, role FROM users WHERE email = ?').get(normalized)
    : database.prepare('SELECT id, name, email, phone, password_hash, role FROM users WHERE phone = ?').get(normalized)
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

app.post('/api/contact', (request, response) => {
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

  database.prepare(`
    INSERT INTO contact_requests (name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim())
  return response.status(201).json({ message: 'Biểu mẫu của bạn đã được gửi.' })
})

app.get('/api/support/requests', authenticateRequest, requireSupportRole, (_request, response) => {
  const requests = database.prepare(`
    SELECT id, name, email, subject, message, status, created_at, updated_at
    FROM contact_requests
    WHERE assigned_role = 'support'
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, created_at DESC
  `).all()
  return response.json({ requests })
})

app.patch('/api/support/requests/:id', authenticateRequest, requireSupportRole, (request, response) => {
  const id = Number(request.params.id)
  const { status } = request.body ?? {}
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: 'Mã yêu cầu không hợp lệ.' })
  }
  if (!['new', 'in_progress', 'resolved'].includes(status)) {
    return response.status(400).json({ error: 'Trạng thái yêu cầu không hợp lệ.' })
  }
  const result = database.prepare(`
    UPDATE contact_requests SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND assigned_role = 'support'
  `).run(status, id)
  if (result.changes === 0) {
    return response.status(404).json({ error: 'Không tìm thấy yêu cầu hỗ trợ.' })
  }
  return response.json({ message: 'Đã cập nhật trạng thái yêu cầu.' })
})

app.post('/api/auth/forgot-password', (request, response) => {
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
  const user = getUserByIdentifier(normalized)
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

app.post('/api/auth/verify-otp', (request, response) => {
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
  const user = getUserByIdentifier(normalized)
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
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, tokenData.userId)
  resetTokens.delete(resetToken)
  return response.json({ message: 'Mật khẩu đã được cập nhật.' })
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.use((error, _request, response, _next) => {
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
  const existingUser = database.prepare('SELECT role FROM users WHERE email = ?').get(email)
  if (existingUser) {
    if (existingUser.role !== 'support') {
      throw new Error('Email SUPPORT_EMAIL đã được dùng bởi tài khoản không có role support.')
    }
    return
  }

  const passwordHash = await bcrypt.hash(settings.password, bcryptRounds)
  database.prepare(`
    INSERT INTO users (name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, 'support')
  `).run(settings.name.trim(), email, normalizePhone(settings.phone), passwordHash)
  console.log(`Tài khoản hỗ trợ đã được tạo: ${email}`)
}

await initializeSupportAccount()

app.listen(port, () => {
  console.log(`StuWork API listening on http://localhost:${port}`)
})
