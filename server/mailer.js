import nodemailer from 'nodemailer'
import { run } from './database.js'

const resultLabels = {
    accepted: {
        subject: 'Hồ sơ của bạn đã được chấp nhận',
        line: 'Chúng tôi vui mừng thông báo hồ sơ của bạn đã được chấp nhận (Trúng tuyển). Nhà tuyển dụng sẽ sớm liên hệ với bạn để trao đổi các bước tiếp theo.',
    },
    rejected: {
        subject: 'Kết quả ứng tuyển của bạn',
        line: 'Rất tiếc, lần này hồ sơ của bạn chưa phù hợp với vị trí. Đừng nản lòng, bạn có thể tiếp tục ứng tuyển các vị trí khác trên StuWork.',
    },
}
const smtpHost = process.env.SMTP_HOST
const smtpUser = process.env.SMTP_USER
const smtpPassword = process.env.SMTP_PASSWORD
const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPassword)
let transporter

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: smtpUser, pass: smtpPassword },
        })
    }
    return transporter
}
// Bỏ ký tự điều khiển (xuống dòng, tab...) để tên/tiêu đề không chèn thêm dòng vào email header.
function cleanLine(value) {
    return Array.from(String(value ?? '')).filter((character) => character >= ' ').join('').trim()
}
async function saveToOutbox(to, subject, body, status, error) {
    await run(
        'INSERT INTO email_outbox (to_email, subject, body, status, error) VALUES (?, ?, ?, ?, ?)',
        [to, subject, body, status, error],
    )
}
// Hàm này KHÔNG bao giờ ném lỗi: gửi mail thất bại không được làm hỏng việc cập nhật kết quả.
export async function sendEmail({ to, subject, text }) {
    const safeTo = cleanLine(to)
    const safeSubject = cleanLine(subject)
    if (!safeTo.includes('@') || !safeTo.includes('.') || safeTo.includes(' ')) {
        const message = 'Địa chỉ email người nhận không hợp lệ.'
        await saveToOutbox(safeTo || '(trống)', safeSubject, text, 'failed', message)
        return { status: 'failed', error: message }
    }
    if (!smtpConfigured) {
        console.log('[EMAIL - chưa cấu hình SMTP, chỉ ghi nhật ký]')
        console.log(`Tới: ${safeTo}`)
        console.log(`Chủ đề: ${safeSubject}`)
        console.log(text)
        await saveToOutbox(safeTo, safeSubject, text, 'logged', null)
        return { status: 'logged' }
    }
    try {
        await getTransporter().sendMail({
            from: process.env.MAIL_FROM || smtpUser,
            to: safeTo,
            subject: safeSubject,
            text,
        })
        await saveToOutbox(safeTo, safeSubject, text, 'sent', null)
        return { status: 'sent' }
    } catch (error) {
        const message = String(error.message).slice(0, 500)
        await saveToOutbox(safeTo, safeSubject, text, 'failed', message)
        return { status: 'failed', error: message }
    }
}
// Đây là hàm story 4 (Trúng tuyển/Từ chối) của đồng đội sẽ gọi sau khi cập nhật trạng thái hồ sơ.
export async function notifyApplicationResult({ to, candidateName, jobTitle, company, result }) {
    const label = resultLabels[result]
    if (!label) throw new Error(`result phải là 'accepted' hoặc 'rejected', nhận được: ${result}`)
    const text = `Xin chào ${cleanLine(candidateName)},

Cảm ơn bạn đã ứng tuyển vị trí "${cleanLine(jobTitle)}" tại ${cleanLine(company)}.
${label.line}

Bạn có thể xem trạng thái ứng tuyển trong tài khoản StuWork của mình.

Trân trọng,
Đội ngũ StuWork`
    return sendEmail({ to, subject: `[StuWork] ${label.subject}`, text })
}