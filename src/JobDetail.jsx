import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BadgeCheck, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, MapPin, Pencil, UsersRound } from 'lucide-react'
import { requestApiJson } from './api.js'
import { toJobViewModel } from './jobViewModel.js'
import ReviewStatus from './ReviewStatus.jsx'

const jobTypes = ['Internship', 'Full-time', 'Part-time']
const jobCategories = [
    'Công nghệ thông tin', 'Marketing', 'Tài chính — Kế toán', 'Thiết kế sáng tạo',
    'Kinh doanh', 'Nhân sự', 'Chăm sóc khách hàng', 'Giáo dục',
]

function toDateInput(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '')
    return match ? `${match[3]}-${match[2]}-${match[1]}` : ''
}

function fromDateInput(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
    return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

function toEditForm(job) {
    const salaryMin = job.salary_min !== undefined ? job.salary_min : job.salaryMin
    const salaryMax = job.salary_max !== undefined ? job.salary_max : job.salaryMax
    return {
        title: job.title,
        category: job.category,
        type: job.type,
        location: job.location,
        salaryMin: salaryMin ?? '',
        salaryMax: salaryMax ?? '',
        slots: String(job.slots),
        deadline: toDateInput(job.deadline),
        description: job.description || '',
        requirements: (job.requirements || []).join('\n'),
        benefits: (job.benefits || []).join('\n'),
    }
}

function toEditPayload(form) {
    const lines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean)
    return {
        title: form.title,
        category: form.category,
        type: form.type,
        location: form.location,
        salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
        salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
        slots: Number(form.slots),
        deadline: fromDateInput(form.deadline),
        description: form.description,
        requirements: lines(form.requirements),
        benefits: lines(form.benefits),
    }
}

function JobDetail({ job: selectedJob, jobId, currentUser, onBack, onLogin, onEditProfile, onNotice, onApplicationsChanged }) {
    const [job, setJob] = useState(selectedJob)
    const accessToken = currentUser?.accessToken
    const isSeeker = currentUser?.role === 'seeker'
    const isEmployer = currentUser?.role === 'employer'
    const [availability, setAvailability] = useState(null)
    const [coverLetter, setCoverLetter] = useState('')
    const [applyError, setApplyError] = useState('')
    const [busy, setBusy] = useState(false)
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [bookmarkBusy, setBookmarkBusy] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [editError, setEditError] = useState('')
    const [editNotice, setEditNotice] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    // lấy số slot còn lại (và trạng thái ứng tuyển của người đang đăng nhập) từ server
    const loadAvailability = useCallback(async () => {
        try {
            setAvailability(await requestApiJson(`/api/jobs/${jobId}/availability`, { accessToken }))
        } catch {
            setAvailability(null)
        }
    }, [jobId, accessToken])

    useEffect(() => {
        let cancelled = false
        if (!isSeeker) return undefined
        requestApiJson('/api/bookmarks', { accessToken })
            .then((result) => { if (!cancelled) setIsBookmarked(result.bookmarks.some((item) => item.jobId === Number(jobId))) })
            .catch(() => { if (!cancelled) setIsBookmarked(false) })
        return () => { cancelled = true }
    }, [jobId, accessToken, isSeeker])

    const toggleBookmark = async () => {
        setBookmarkBusy(true)
        try {
            if (isBookmarked) {
                await requestApiJson(`/api/bookmarks/${jobId}`, { method: 'DELETE', accessToken })
                setIsBookmarked(false)
                onNotice('Đã bỏ lưu tin tuyển dụng.')
            } else {
                await requestApiJson(`/api/bookmarks/${jobId}`, { method: 'POST', accessToken })
                setIsBookmarked(true)
                onNotice('Đã lưu tin tuyển dụng.')
            }
        } catch (error) {
            onNotice(error.message || 'Không thể cập nhật tin đã lưu.')
        } finally {
            setBookmarkBusy(false)
        }
    }

    useEffect(() => {
        let cancelled = false
        requestApiJson(`/api/jobs/${jobId}/availability`, { accessToken })
            .then((result) => { if (!cancelled) setAvailability(result) })
            .catch(() => { if (!cancelled) setAvailability(null) })
        return () => { cancelled = true }
    }, [jobId, accessToken])

    const handleApply = async () => {
        setApplyError('')
        setBusy(true)
        try {
            const result = await requestApiJson(`/api/jobs/${jobId}/apply`, {
                method: 'POST',
                body: { coverLetter },
                accessToken,
            })
            setAvailability(result.availability)
            setCoverLetter('')
            onNotice('Ứng tuyển thành công!')
            onApplicationsChanged()
        } catch (error) {
            setApplyError(error.message)
            loadAvailability() // slot có thể vừa hết, tải lại để hiển thị đúng
        } finally {
            setBusy(false)
        }
    }

    const handleWithdraw = async () => {
        setApplyError('')
        setBusy(true)
        try {
            await requestApiJson(`/api/applications/${availability.application.id}`, { method: 'DELETE', accessToken })
            onNotice('Đã rút đơn ứng tuyển.')
            onApplicationsChanged()
            await loadAvailability()
        } catch (error) {
            setApplyError(error.message)
        } finally {
            setBusy(false)
        }
    }

    const openEdit = () => {
        setEditForm(toEditForm(job))
        setEditError('')
        setEditNotice('')
        setIsEditing(true)
    }

    const closeEdit = () => {
        if (savingEdit) return
        setIsEditing(false)
        setEditForm(null)
        setEditError('')
    }

    const handleEditChange = (event) => {
        const { name, value } = event.target
        setEditForm((current) => ({ ...current, [name]: value }))
    }

    const handleEditSubmit = async (event) => {
        event.preventDefault()
        setEditError('')
        setEditNotice('')
        setSavingEdit(true)
        try {
            const result = await requestApiJson(`/api/employer/jobs/${jobId}`, {
                method: 'PUT',
                body: toEditPayload(editForm),
                accessToken,
            })
            if (!result.job) throw new Error('Máy chủ đã lưu nhưng không trả về dữ liệu công việc mới.')
            setJob(toJobViewModel(result.job))
            setAvailability(null)
            setIsEditing(false)
            setEditForm(null)
            setEditNotice(result.message)
        } catch (error) {
            setEditError(error.message || 'Không thể lưu thay đổi công việc.')
        } finally {
            setSavingEdit(false)
        }
    }

    // trg hợp ko tìm thấy công việc (id sai, tin xóa,...)
    if (!job) {
        return (
            <main className="section job-detail">
                <div className="page-shell">
                    <div className="empty-jobs">
                        <strong>Không tìm thấy công việc</strong>
                        <p>Tin tuyển dụng này không tồn tại hoặc đã bị gỡ.</p>
                        <button className="button button-primary" type="button" onClick={onBack}>
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    // các dòng thông tin ở khung bên phải (số lượng tuyển nằm ở đây)
    const facts = [
        { icon: UsersRound, label: 'Số lượng tuyển', value: availability ? `Còn ${availability.remaining}/${availability.slots} slot` : job.slots ? `${job.slots} người` : 'Chưa cập nhật' },
        { icon: CircleDollarSign, label: 'Mức lương', value: job.salary },
        { icon: MapPin, label: 'Địa điểm', value: job.location },
        { icon: BriefcaseBusiness, label: 'Hình thức', value: job.type },
        { icon: CalendarDays, label: 'Hạn nộp hồ sơ', value: job.deadline || 'Chưa cập nhật' },
    ]

    return (
        <main className="section job-detail">
            <div className="page-shell">
                <button className="back-link" type="button" onClick={onBack}>
                    <ArrowLeft size={16} /> Quay lại
                </button>

                <div className="job-detail-layout">
                    <article className="job-detail-main">
                        <header className="job-detail-header">
                            <div className={`company-logo logo-${job.tone}`}>{job.logo}</div>
                            <div>
                                <h1>{job.title}</h1>
                                <div className="job-company">
                                    <Building2 size={15} />
                                    {job.company}
                                    <BadgeCheck size={14} className="verified-icon" />
                                </div>
                            </div>
                        </header>
                        {isEmployer && !isEditing && (
                            <button className="button button-outline job-edit-button" type="button" onClick={openEdit}>
                                <Pencil size={16} /> Chỉnh sửa tin
                            </button>
                        )}
                        {isSeeker && (
                            <button className="button button-outline job-bookmark-button" type="button" disabled={bookmarkBusy} onClick={toggleBookmark}>
                                {isBookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                                {isBookmarked ? 'Đã lưu tin' : 'Lưu tin tuyển dụng'}
                            </button>
                        )}

                        {editNotice && !isEditing && <p className="form-api-success" role="status">{editNotice}</p>}
                        {isEditing ? (
                            <form className="company-form" onSubmit={handleEditSubmit} aria-busy={savingEdit}>
                                {editError && <div className="form-api-error" role="alert">{editError}</div>}
                                <div className="company-field">
                                    <label htmlFor="detail-job-title">Tiêu đề *</label>
                                    <input id="detail-job-title" name="title" value={editForm.title} onChange={handleEditChange} minLength="3" maxLength="200" required />
                                </div>
                                <div className="company-row">
                                    <div className="company-field">
                                        <label htmlFor="detail-job-category">Lĩnh vực *</label>
                                        <select id="detail-job-category" name="category" value={editForm.category} onChange={handleEditChange} required>
                                            {jobCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                                        </select>
                                    </div>
                                    <div className="company-field">
                                        <label htmlFor="detail-job-type">Hình thức *</label>
                                        <select id="detail-job-type" name="type" value={editForm.type} onChange={handleEditChange} required>
                                            {jobTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="company-field">
                                    <label htmlFor="detail-job-location">Địa điểm *</label>
                                    <input id="detail-job-location" name="location" value={editForm.location} onChange={handleEditChange} minLength="2" maxLength="200" required />
                                </div>
                                <div className="company-row">
                                    <div className="company-field">
                                        <label htmlFor="detail-job-salary-min">Lương tối thiểu (triệu/tháng)</label>
                                        <input id="detail-job-salary-min" name="salaryMin" type="number" min="0" max="1000" step="1" value={editForm.salaryMin} onChange={handleEditChange} />
                                    </div>
                                    <div className="company-field">
                                        <label htmlFor="detail-job-salary-max">Lương tối đa (triệu/tháng)</label>
                                        <input id="detail-job-salary-max" name="salaryMax" type="number" min="0" max="1000" step="1" value={editForm.salaryMax} onChange={handleEditChange} />
                                    </div>
                                </div>
                                <div className="company-row">
                                    <div className="company-field">
                                        <label htmlFor="detail-job-slots">Số lượng tuyển *</label>
                                        <input id="detail-job-slots" name="slots" type="number" min="1" max="1000" step="1" value={editForm.slots} onChange={handleEditChange} required />
                                    </div>
                                    <div className="company-field">
                                        <label htmlFor="detail-job-deadline">Hạn nộp hồ sơ</label>
                                        <input id="detail-job-deadline" name="deadline" type="date" value={editForm.deadline} onChange={handleEditChange} />
                                    </div>
                                </div>
                                <div className="company-field">
                                    <label htmlFor="detail-job-description">Mô tả công việc *</label>
                                    <textarea id="detail-job-description" name="description" value={editForm.description} onChange={handleEditChange} minLength="10" maxLength="3000" required />
                                </div>
                                <div className="company-field">
                                    <label htmlFor="detail-job-requirements">Yêu cầu ứng viên (mỗi dòng một ý)</label>
                                    <textarea id="detail-job-requirements" name="requirements" value={editForm.requirements} onChange={handleEditChange} rows="4" />
                                </div>
                                <div className="company-field">
                                    <label htmlFor="detail-job-benefits">Quyền lợi (mỗi dòng một ý)</label>
                                    <textarea id="detail-job-benefits" name="benefits" value={editForm.benefits} onChange={handleEditChange} rows="4" />
                                </div>
                                <p className="company-job-hint">Sau khi lưu, tin sẽ chuyển về trạng thái chờ quản trị viên duyệt.</p>
                                <div className="company-actions company-job-form-actions">
                                    <button className="button button-primary" type="submit" disabled={savingEdit}>
                                        {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                    <button className="button button-outline" type="button" onClick={closeEdit} disabled={savingEdit}>Hủy</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <section>
                                    <h2>Mô tả công việc</h2>
                                    <p>{job.description || 'Thông tin mô tả chưa được cập nhật.'}</p>
                                </section>

                                {job.requirements?.length > 0 && (
                                    <section>
                                        <h2>Yêu cầu ứng viên</h2>
                                        <ul>
                                            {job.requirements.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {job.benefits?.length > 0 && (
                                    <section>
                                        <h2>Quyền lợi</h2>
                                        <ul>
                                            {job.benefits.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </>
                        )}
                    </article>

                    <aside className="job-detail-side">
                        <ul className="job-facts">
                            {facts.map(({ icon: Icon, label, value }) => (
                                <li key={label}>
                                    <span className="fact-icon"><Icon size={17} /></span>
                                    <span>
                                        <small>{label}</small>
                                        <strong>{value}</strong>
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <div className="apply-box">
                            {!currentUser && (
                                <button className="button button-primary apply-main" type="button" onClick={onLogin}>
                                    Đăng nhập để ứng tuyển
                                </button>
                            )}
                            {currentUser && !isSeeker && (
                                <p className="apply-note">Tài khoản hỗ trợ không thể ứng tuyển.</p>
                            )}
                            {isSeeker && availability?.application && (
                                <>
                                    <p className="apply-status apply-status-done">Bạn đã ứng tuyển công việc này.</p>
                                    <ReviewStatus status={availability.application.decisionStatus} />
                                    <button className="button button-outline apply-main" type="button" disabled={busy} onClick={handleWithdraw}>
                                        Rút đơn ứng tuyển
                                    </button>
                                </>
                            )}
                            {isSeeker && availability && !availability.application && (
                                availability.expired ? (
                                    <button className="button button-primary apply-main" type="button" disabled>Đã hết hạn nộp hồ sơ</button>
                                ) : availability.remaining === 0 ? (
                                    <button className="button button-primary apply-main" type="button" disabled>Đã hết slot</button>
                                ) : !availability.hasCv ? (
                                    <>
                                        <p className="apply-note">Bạn cần tải CV lên hồ sơ trước khi ứng tuyển.</p>
                                        <button className="button button-primary apply-main" type="button" onClick={onEditProfile}>
                                            Cập nhật hồ sơ &amp; tải CV
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <label className="apply-letter">
                                            <span>Thư giới thiệu (không bắt buộc)</span>
                                            <textarea
                                                rows="4"
                                                maxLength="2000"
                                                value={coverLetter}
                                                onChange={(event) => setCoverLetter(event.target.value)}
                                            />
                                        </label>
                                        <button className="button button-primary apply-main" type="button" disabled={busy} onClick={handleApply}>
                                            {busy ? 'Đang gửi...' : 'Ứng tuyển ngay'}
                                        </button>
                                        <p className="apply-note">Hồ sơ gửi kèm CV hiện tại trong tài khoản của bạn.</p>
                                    </>
                                )
                            )}
                            {applyError && <p className="contact-form-error" role="alert">{applyError}</p>}
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}

export default JobDetail