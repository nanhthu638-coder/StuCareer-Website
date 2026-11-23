import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CircleCheck, CircleX, Download, RefreshCw } from 'lucide-react'
import { downloadApiFile, requestApiJson } from './api.js'
import ReviewStatus from './ReviewStatus.jsx'

const statusLabels = {
  new: 'Mới',
  in_progress: 'Đang xử lý',
  resolved: 'Đã giải quyết',
}

function formatDate(value) {
  return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('vi-VN')
}

function SupportDashboard({ accessToken, onHome, onLogout }) {
  const [requests, setRequests] = useState([])
  const [draftStatuses, setDraftStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [tab, setTab] = useState('requests')
  const [applications, setApplications] = useState([])
  const [reviewingId, setReviewingId] = useState(null)

  const fetchRequests = useCallback(
    () => requestApiJson('/api/support/requests', { accessToken }),
    [accessToken],
  )

  const loadRequests = async () => {
    setError('')
    setLoading(true)
    try {
      const [result, applicationResult] = await Promise.all([
        fetchRequests(),
        requestApiJson('/api/support/applications', { accessToken }),
      ])
      setApplications(applicationResult.applications)
      setRequests(result.requests)
      setDraftStatuses(Object.fromEntries(result.requests.map((request) => [request.id, request.status])))
    } catch (loadError) {
      setError(loadError.message || 'Không thể tải hộp thư hỗ trợ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([fetchRequests(), requestApiJson('/api/support/applications', { accessToken })])
      .then(([result, applicationResult]) => {
        if (!active) return
        setApplications(applicationResult.applications)
        setRequests(result.requests)
        setDraftStatuses(Object.fromEntries(result.requests.map((request) => [request.id, request.status])))
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Không thể tải hộp thư hỗ trợ.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [fetchRequests, accessToken])

  const updateStatus = async (requestId) => {
    setError('')
    setUpdatingId(requestId)
    try {
      const status = draftStatuses[requestId]
      await requestApiJson(`/api/support/requests/${requestId}`, {
        method: 'PATCH',
        body: { status },
        accessToken,
      })
      setRequests((current) => current.map((request) => (
        request.id === requestId ? { ...request, status } : request
      )))
    } catch (updateError) {
      setError(updateError.message || 'Không thể cập nhật yêu cầu.')
    } finally {
      setUpdatingId(null)
    }
  }

  const reviewApplication = async (applicationId, reviewStatus) => {
    setError('')
    setReviewingId(applicationId)
    try {
      await requestApiJson(`/api/support/applications/${applicationId}`, {
        method: 'PATCH',
        body: { reviewStatus },
        accessToken,
      })
      setApplications((current) => current.map((item) => (
        item.id === applicationId ? { ...item, reviewStatus } : item
      )))
    } catch (reviewError) {
      setError(reviewError.message || 'Không thể cập nhật trạng thái đơn ứng tuyển.')
    } finally {
      setReviewingId(null)
    }
  }

  const downloadCv = async (application) => {
    setError('')
    try {
      await downloadApiFile(`/api/support/applications/${application.id}/cv`, accessToken, application.cv)
    } catch (downloadError) {
      setError(downloadError.message || 'Không thể tải CV về.')
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
            <span>Nhân viên hỗ trợ</span>
            <button className="button button-outline" type="button" onClick={onLogout}>Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="page-shell support-main">
        <button className="support-back" type="button" onClick={onHome}><ArrowLeft size={16} /> Về trang chủ</button>
        <div className="support-heading">
          <div>
            <span className="support-eyebrow">TRUNG TÂM HỖ TRỢ</span>
            <h1>Thắc mắc từ người dùng</h1>
            <p>Xem và cập nhật trạng thái các biểu mẫu liên hệ đã gửi.</p>
          </div>
          <button className="button button-outline support-refresh" type="button" onClick={loadRequests} disabled={loading}>
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>

        <div className="support-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            Thắc mắc ({requests.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'applications'} className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>
            Đơn ứng tuyển ({applications.length})
          </button>
        </div>

        {error && <div className="support-error" role="alert">{error}</div>}
        {tab === 'applications' ? (
          loading ? (
            <div className="support-empty">Đang tải đơn ứng tuyển...</div>
          ) : applications.length === 0 ? (
            <div className="support-empty">Chưa có đơn ứng tuyển nào.</div>
          ) : (
            <div className="support-request-list">
              {applications.map((application) => (
                <article className="support-request-card" key={application.id}>
                  <div className="support-request-heading">
                    <div>
                      <ReviewStatus status={application.reviewStatus} />
                      <h2>{application.title}</h2>
                      <small>{application.company}</small>
                    </div>
                    <time dateTime={`${application.createdAt.replace(' ', 'T')}Z`}>{formatDate(application.createdAt)}</time>
                  </div>
                  {application.coverLetter && <p className="support-request-message">{application.coverLetter}</p>}
                  <div className="support-request-footer">
                    <div className="support-request-sender">
                      <strong>{application.candidateName}</strong>
                      <a href={`mailto:${application.candidateEmail}`}>{application.candidateEmail}</a>
                      <span>{application.candidatePhone}</span>
                    </div>
                    <div className="support-review-actions">
                      <button className="button button-outline" type="button" onClick={() => downloadCv(application)}>
                        <Download size={14} /> CV
                      </button>
                      <button
                        className="button review-button review-button-accept"
                        type="button"
                        disabled={application.reviewStatus === 'accepted' || reviewingId === application.id}
                        onClick={() => reviewApplication(application.id, 'accepted')}
                      >
                        <CircleCheck size={14} /> Duyệt
                      </button>
                      <button
                        className="button review-button review-button-reject"
                        type="button"
                        disabled={application.reviewStatus === 'rejected' || reviewingId === application.id}
                        onClick={() => reviewApplication(application.id, 'rejected')}
                      >
                        <CircleX size={14} /> Từ chối
                      </button>
                      {application.reviewStatus !== 'pending' && (
                        <button
                          className="button button-outline"
                          type="button"
                          disabled={reviewingId === application.id}
                          onClick={() => reviewApplication(application.id, 'pending')}
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : loading ? (
          <div className="support-empty">Đang tải yêu cầu...</div>
        ) : requests.length === 0 ? (
          <div className="support-empty">Chưa có biểu mẫu liên hệ nào.</div>
        ) : (
          <div className="support-request-list">
            {requests.map((request) => (
              <article className="support-request-card" key={request.id}>
                <div className="support-request-heading">
                  <div>
                    <span className={`support-status-badge support-status-${request.status}`}>{statusLabels[request.status]}</span>
                    <h2>{request.subject}</h2>
                  </div>
                  <time dateTime={`${request.created_at.replace(' ', 'T')}Z`}>{formatDate(request.created_at)}</time>
                </div>
                <p className="support-request-message">{request.message}</p>
                <div className="support-request-footer">
                  <div className="support-request-sender">
                    <strong>{request.name}</strong>
                    <a href={`mailto:${request.email}`}>{request.email}</a>
                  </div>
                  <div className="support-status-control">
                    <label htmlFor={`request-status-${request.id}`}>Trạng thái</label>
                    <select
                      id={`request-status-${request.id}`}
                      value={draftStatuses[request.id] ?? request.status}
                      onChange={(event) => setDraftStatuses((current) => ({ ...current, [request.id]: event.target.value }))}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={draftStatuses[request.id] === request.status || updatingId === request.id}
                      onClick={() => updateStatus(request.id)}
                    >
                      {updatingId === request.id ? 'Đang lưu...' : 'Cập nhật'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default SupportDashboard
