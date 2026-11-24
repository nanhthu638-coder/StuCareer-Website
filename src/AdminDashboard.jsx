import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, RefreshCw } from 'lucide-react'
import { requestApiJson } from './api.js'

const statusLabels = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    hidden: 'Đã ẩn',
    closed: 'Đã đóng',
}
const filterTabs = [
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'hidden', label: 'Đã ẩn' },
    { value: 'closed', label: 'Đã đóng' },
    { value: 'rejected', label: 'Từ chối' },
    { value: 'all', label: 'Tất cả' },
]
const emailStatusLabels = {
    sent: 'Đã gửi',
    logged: 'Chỉ ghi nhật ký (chưa cấu hình SMTP)',
    failed: 'Gửi lỗi',
}
function formatDate(value) {
    return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('vi-VN')
}
function actionLabel(from, to) {
    if (to === 'approved') return from === 'pending' ? 'Duyệt' : 'Hiển thị lại'
    if (to === 'rejected') return 'Từ chối'
    if (to === 'hidden') return 'Ẩn tin'
    return 'Đóng tin'
}
function AdminDashboard({ accessToken, onHome, onLogout }) {
    const [filter, setFilter] = useState('pending')
    const [jobs, setJobs] = useState([])
    const [transitions, setTransitions] = useState({})
    const [emails, setEmails] = useState([])
    const [notes, setNotes] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [busyId, setBusyId] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let active = true
        const query = filter === 'all' ? '' : `?status=${filter}`
        Promise.all([
            requestApiJson(`/api/admin/jobs${query}`, { accessToken }),
            requestApiJson('/api/admin/emails', { accessToken }),
        ])
            .then(([jobResult, emailResult]) => {
                if (!active) return
                setJobs(jobResult.jobs)
                setTransitions(jobResult.allowedTransitions)
                setEmails(emailResult.emails)
            })
            .catch((loadError) => {
                if (active) setError(loadError.message || 'Không thể tải dữ liệu quản trị.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => { active = false }
    }, [accessToken, filter, reloadKey])

    const selectFilter = (value) => {
        if (value === filter) return // đổi cùng giá trị thì effect không chạy lại, sẽ kẹt ở “Đang tải”
        setError('')
        setLoading(true)
        setFilter(value)
    }
    const reload = () => {
        setError('')
        setLoading(true)
        setReloadKey((key) => key + 1)
    }
    const changeStatus = async (job, status) => {
        setError('')
        setBusyId(job.id)
        try {
            await requestApiJson(`/api/admin/jobs/${job.id}/status`, {
                method: 'PATCH',
                body: { status, note: notes[job.id] ?? '' },
                accessToken,
            })
            setNotes((current) => ({ ...current, [job.id]: '' }))
            reload()
        } catch (updateError) {
            reload() // tải lại để thấy trạng thái mới nhất, rồi hiện lỗi
            setError(updateError.message || 'Không thể cập nhật trạng thái.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="support-page">
            <header className="site-header">
                <div className="page-shell header-inner">
                    <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); onHome() }}>
                        <span className="brand-icon"><BriefcaseBusiness size={21} strokeWidth={2.3} /></span>
                        <span>Stu<span>Work</span></span>
                    </a>
                    <div className="support-header-actions">
                        <span>Quản trị viên</span>
                        <button className="button button-outline" type="button" onClick={onLogout}>Đăng xuất</button>
                    </div>
                </div>
            </header>
            <main className="page-shell support-main">
                <button className="support-back" type="button" onClick={onHome}><ArrowLeft size={16} /> Về trang chủ</button>
                <div className="support-heading">
                    <div>
                        <span className="support-eyebrow">QUẢN TRỊ TIN TUYỂN DỤNG</span>
                        <h1>Duyệt và quản lý trạng thái tin</h1>
                        <p>Chỉ tin “Đã duyệt” mới hiển thị cho sinh viên trên trang chủ.</p>
                    </div>
                    <button className="button button-outline support-refresh" type="button" onClick={reload} disabled={loading}>
                        <RefreshCw size={15} /> Làm mới
                    </button>
                </div>
                <div className="admin-tabs">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            className={`admin-tab${filter === tab.value ? ' admin-tab-active' : ''}`}
                            onClick={() => selectFilter(tab.value)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {error && <div className="support-error" role="alert">{error}</div>}
                {loading ? (
                    <div className="support-empty">Đang tải...</div>
                ) : jobs.length === 0 ? (
                    <div className="support-empty">Không có tin nào ở trạng thái này.</div>
                ) : (
                    <div className="support-request-list">
                        {jobs.map((job) => {
                            const targets = transitions[job.status] ?? []
                            return (
                                <article className="support-request-card" key={job.id}>
                                    <div className="support-request-heading">
                                        <div>
                                            <span className={`support-status-badge admin-status-${job.status}`}>{statusLabels[job.status]}</span>
                                            <h2>{job.title}</h2>
                                            <p className="admin-job-meta">{job.company} · {job.location} · {job.type} · {job.category}</p>
                                        </div>
                                        <time dateTime={`${job.created_at.replace(' ', 'T')}Z`}>{formatDate(job.created_at)}</time>
                                    </div>
                                    {job.review_note && <p className="support-request-message">Ghi chú: {job.review_note}</p>}
                                    <div className="support-request-footer">
                                        <div className="support-request-sender"><strong>Mã tin: {job.id}</strong></div>
                                        <div className="admin-actions">
                                            {targets.includes('rejected') && (
                                                <input
                                                    type="text"
                                                    aria-label="Lý do từ chối"
                                                    placeholder="Lý do từ chối (bắt buộc)"
                                                    value={notes[job.id] ?? ''}
                                                    onChange={(event) => setNotes((current) => ({ ...current, [job.id]: event.target.value }))}
                                                />
                                            )}
                                            {targets.map((target) => (
                                                <button
                                                    key={target}
                                                    className={`button ${target === 'rejected' ? 'button-outline' : 'button-primary'}`}
                                                    type="button"
                                                    disabled={busyId === job.id}
                                                    onClick={() => changeStatus(job, target)}
                                                >
                                                    {actionLabel(job.status, target)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
                <h2 className="admin-section-title">Email thông báo kết quả đã gửi</h2>
                {emails.length === 0 ? (
                    <div className="support-empty">Chưa có email nào.</div>
                ) : (
                    <div className="support-request-list">
                        {emails.map((email) => (
                            <article className="support-request-card" key={email.id}>
                                <div className="support-request-heading">
                                    <div>
                                        <span className={`support-status-badge admin-email-status-${email.status}`}>{emailStatusLabels[email.status]}</span>
                                        <h2>{email.subject}</h2>
                                        <p className="admin-job-meta">Tới: {email.to_email}</p>
                                    </div>
                                    <time dateTime={`${email.created_at.replace(' ', 'T')}Z`}>{formatDate(email.created_at)}</time>
                                </div>
                                <p className="admin-email-body">{email.body}</p>
                                {email.error && <p className="admin-job-meta">Lỗi: {email.error}</p>}
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
export default AdminDashboard