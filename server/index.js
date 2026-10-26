import { randomBytes, randomInt } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import express from 'express'

const directory = dirname(fileURLToPath(import.meta.url))
const databasePath = resolve(directory, 'data', 'stuwork.sqlite')
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const app = express()
const otpByIdentifier = new Map()
const resetTokens = new Map()
const requestTimes = new Map()
const port = Number(process.env.PORT) || 3001
const bcryptRounds = 12
const otpLifetimeMs = 5 * 60 * 1000
const resetTokenLifetimeMs = 10 * 60 * 1000
const otpResendDelayMs = 60 * 1000

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
    ? database.prepare('SELECT id, name, email, phone, password_hash FROM users WHERE email = ?').get(normalized)
    : database.prepare('SELECT id, name, email, phone, password_hash FROM users WHERE phone = ?').get(normalized)
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false
  if (!passwordMatches) {
    return response.status(401).json({ error: 'Email/số điện thoại hoặc mật khẩu chưa chính xác.' })
  }
  const { id, name, email, phone } = user
  return response.json({
    message: 'Đăng nhập thành công.',
    user: { id, name, email, phone },
  })
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

app.listen(port, () => {
  console.log(`StuWork API listening on http://localhost:${port}`)
})
