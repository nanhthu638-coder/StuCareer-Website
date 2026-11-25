import { useState } from 'react'
import { requestApiJson } from './api.js'

const statusLabels = { new: 'Mới', in_progress: 'Đang xử lý', resolved: 'Đã xử lý' }
const filterTabs = [
    { value: 'all', label: 'Tất cả' },
    { value: 'new', label: 'Mới' },
    { value: 'in_progress', label: 'Đang xử lý' },
    { value: 'resolved', label: 'Đã xử lý' },
]

function formatDate(value) {
    return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('vi-VN')
}

function AdminContactRequests({ accessToken, requests, onChanged }) {
    const [filter, setFilter] = useState('all')
    const [notes, setNotes] = useState({})
    const [busyId, setBusyId] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const visible = filter === 'all' ? requests : requests.filter((request) => request.status === filter)

    const changeStatus = async (request, status) => {
        setError('')
        setNotice('')
        setBusyId(request.id)
        try {
            const result = await requestApiJson(`/api/admin/contact-requests/${request.id}`, {
                method: 'PATCH',
                body: { status, note: notes[request.id] ?? '' },
                accessToken,
            })
            setNotice(result.message)
            setNotes((current) => ({ ...current, [request.id]: '' }))
        } catch (updateError) {
            setError(updateError.message || 'Không thể cập nhật yêu cầu.')
        } finally {
            setBusyId(null)
            onChanged()
        }
    }

    return (
        <>
            <div className="support-heading">
                <div>
                    <span className="support-eyebrow">BIỂU MẪU THẮC MẮC</span>
                    <h1>Thắc mắc từ người dùng</h1>
                    <p>Người dùng gửi biểu mẫu liên hệ sẽ hiện ở đây. Khi bạn đánh dấu “Đã xử lý”, người gửi nhận được thông báo.</p>
                </div>
            </div>
            <div className="admin-tabs">
                {filterTabs.map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        className={`admin-tab${filter === tab.value ? ' admin-tab-active' : ''}`}
                        onClick={() => setFilter(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {error && <div className="support-error" role="alert">{error}</div>}
            {notice && <div className="form-api-success" role="status">{notice}</div>}
            {visible.length === 0 ? (
                <div className="support-empty">Không có thắc mắc nào ở mục này.</div>
            ) : (
                <div className="support-request-list">
                    {visible.map((request) => (
                        <article className="support-request-card" key={request.id}>
                            <div className="support-request-heading">
                                <div>
                                    <span className={`support-status-badge support-status-${request.status}`}>{statusLabels[request.status]}</span>
                                    <h2>{request.subject}</h2>
                                </div>
                                <time dateTime={`${request.created_at.replace(' ', 'T')}Z`}>{formatDate(request.created_at)}</time>
                            </div>
                            <p className="support-request-message">{request.message}</p>
                            {request.status === 'resolved' && (
                                <p className="admin-job-meta">
                                    Đã xử lý lúc {formatDate(request.resolved_at)}{request.resolution_note ? ` · Phản hồi: ${request.resolution_note}` : ''}
                                </p>
                            )}
                            <div className="support-request-footer">
                                <div className="support-request-sender">
                                    <strong>{request.name}</strong>
                                    <a href={`mailto:${request.email}`}>{request.email}</a>
                                    <span className="admin-job-meta">{request.hasAccount ? 'Gửi khi đã đăng nhập: nhận thông báo trong ứng dụng và email' : 'Khách chưa đăng nhập: chỉ nhận email'}</span>
                                </div>
                                <div className="admin-actions">
                                    {request.status !== 'resolved' && (
                                        <input
                                            type="text"
                                            className="admin-note-input"
                                            aria-label="Phản hồi cho người dùng"
                                            placeholder="Phản hồi gửi người dùng (không bắt buộc)"
                                            maxLength={1000}
                                            value={notes[request.id] ?? ''}
                                            onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                                        />
                                    )}
                                    {request.status === 'new' && (
                                        <button className="button button-outline" type="button" disabled={busyId === request.id} onClick={() => changeStatus(request, 'in_progress')}>Tiếp nhận</button>
                                    )}
                                    {request.status !== 'resolved' && (
                                        <button className="button button-primary" type="button" disabled={busyId === request.id} onClick={() => changeStatus(request, 'resolved')}>Đã xử lý</button>
                                    )}
                                    {request.status === 'resolved' && (
                                        <button className="button button-outline" type="button" disabled={busyId === request.id} onClick={() => changeStatus(request, 'in_progress')}>Mở lại</button>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    )
}

export default AdminContactRequests
