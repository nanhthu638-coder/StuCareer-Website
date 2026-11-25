import { useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiRequest } from './api.js'

const jobTypes = ['Internship', 'Full-time', 'Part-time']
const jobCategories = [
    'Công nghệ thông tin', 'Marketing', 'Tài chính — Kế toán', 'Thiết kế sáng tạo',
    'Kinh doanh', 'Nhân sự', 'Chăm sóc khách hàng', 'Giáo dục',
]
const statusLabels = { pending: 'Chờ duyệt', approved: 'Đang hiển thị', rejected: 'Bị từ chối', hidden: 'Đã ẩn', closed: 'Đã đóng' }
const emptyForm = {
    title: '', category: jobCategories[0], type: jobTypes[0], location: '', salaryMin: '', salaryMax: '',
    slots: '1', deadline: '', description: '', requirements: '', benefits: '',
}

// Server lưu hạn nộp dạng DD/MM/YYYY, còn <input type="date"> dùng YYYY-MM-DD.
function toDateInput(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '')
    return match ? `${match[3]}-${match[2]}-${match[1]}` : ''
}

function fromDateInput(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
    return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

function toForm(job) {
    return {
        title: job.title, category: job.category, type: job.type, location: job.location,
        salaryMin: job.salaryMin ?? '', salaryMax: job.salaryMax ?? '', slots: String(job.slots),
        deadline: toDateInput(job.deadline), description: job.description,
        requirements: job.requirements.join('\n'), benefits: job.benefits.join('\n'),
    }
}

function toPayload(form) {
    const lines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean)
    return {
        title: form.title, category: form.category, type: form.type, location: form.location,
        salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
        salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
        slots: Number(form.slots), deadline: fromDateInput(form.deadline), description: form.description,
        requirements: lines(form.requirements), benefits: lines(form.benefits),
    }
}

function EmployerJobs({ token }) {
    const [jobs, setJobs] = useState([])
    const [transitions, setTransitions] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [form, setForm] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [busyId, setBusyId] = useState(null)
    const [hasCompany, setHasCompany] = useState(true)

    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        apiRequest('employer/jobs', { token })
            .then((result) => {
                if (cancelled) return
                setJobs(result.jobs)
                setTransitions(result.allowedTransitions)
                setHasCompany(Boolean(result.companyName))
            })
            .catch((loadError) => {
                if (!cancelled) setError(loadError.message || 'Không thể tải danh sách tin tuyển dụng.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [token, reloadKey])

    const reloadJobs = () => setReloadKey((key) => key + 1)

    const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(''); setNotice('') }
    const openEdit = (job) => { setEditingId(job.id); setForm(toForm(job)); setError(''); setNotice('') }
    const closeForm = () => { setForm(null); setEditingId(null) }
    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((current) => ({ ...current, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setNotice('')
        setSaving(true)
        try {
            const result = await apiRequest(editingId ? `employer/jobs/${editingId}` : 'employer/jobs', {
                method: editingId ? 'PUT' : 'POST', token, body: toPayload(form),
            })
            setNotice(result.message)
            closeForm()
            reloadJobs()
        } catch (saveError) {
            setError(saveError.message || 'Không thể lưu tin tuyển dụng.')
        } finally {
            setSaving(false)
        }
    }

    const runAction = async (job, action) => {
        setBusyId(job.id)
        setError('')
        setNotice('')
        try {
            const result = await action()
            setNotice(result.message)
            reloadJobs()
        } catch (actionError) {
            setError(actionError.message || 'Không thể thực hiện thao tác.')
        } finally {
            setBusyId(null)
        }
    }

    const changeStatus = (job, status) => runAction(job, () => apiRequest(`employer/jobs/${job.id}/status`, { method: 'PATCH', token, body: { status } }))
    const deleteJob = (job) => {
        if (!window.confirm(`Xóa tin "${job.title}"? Thao tác này không thể hoàn tác.`)) return
        runAction(job, () => apiRequest(`employer/jobs/${job.id}`, { method: 'DELETE', token }))
    }

    return (
        <section className="company-card company-jobs">
            <div className="company-card-heading">
                <span className="company-card-icon"><Plus size={20} /></span>
                <div><h1>Tin tuyển dụng</h1><p>Đăng tin mới, chỉnh sửa, ẩn hoặc xóa tin của doanh nghiệp. Tin mới và tin vừa sửa cần quản trị viên duyệt.</p></div>
            </div>
            {error && <div className="form-api-error" role="alert">{error}</div>}
            {notice && <div className="form-api-success" role="status">{notice}</div>}

            {form ? (
                <form className="company-form" onSubmit={handleSubmit}>
                    <div className="company-field">
                        <label htmlFor="job-title">Tiêu đề *</label>
                        <input id="job-title" name="title" value={form.title} onChange={handleChange} maxLength={200} required placeholder="Frontend Developer Intern" />
                    </div>
                    <div className="company-row">
                        <div className="company-field">
                            <label htmlFor="job-category">Lĩnh vực *</label>
                            <select id="job-category" name="category" value={form.category} onChange={handleChange}>
                                {jobCategories.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div className="company-field">
                            <label htmlFor="job-type">Hình thức *</label>
                            <select id="job-type" name="type" value={form.type} onChange={handleChange}>
                                {jobTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="company-field">
                        <label htmlFor="job-location">Địa điểm *</label>
                        <input id="job-location" name="location" value={form.location} onChange={handleChange} maxLength={200} required placeholder="TP. Hồ Chí Minh" />
                    </div>
                    <div className="company-row">
                        <div className="company-field">
                            <label htmlFor="job-salary-min">Lương tối thiểu (triệu/tháng)</label>
                            <input id="job-salary-min" name="salaryMin" type="number" min="0" max="1000" value={form.salaryMin} onChange={handleChange} />
                        </div>
                        <div className="company-field">
                            <label htmlFor="job-salary-max">Lương tối đa (triệu/tháng)</label>
                            <input id="job-salary-max" name="salaryMax" type="number" min="0" max="1000" value={form.salaryMax} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="company-row">
                        <div className="company-field">
                            <label htmlFor="job-slots">Số lượng tuyển *</label>
                            <input id="job-slots" name="slots" type="number" min="1" max="1000" value={form.slots} onChange={handleChange} required />
                        </div>
                        <div className="company-field">
                            <label htmlFor="job-deadline">Hạn nộp hồ sơ</label>
                            <input id="job-deadline" name="deadline" type="date" value={form.deadline} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="company-field">
                        <label htmlFor="job-description">Mô tả công việc *</label>
                        <textarea id="job-description" name="description" value={form.description} onChange={handleChange} maxLength={3000} required />
                    </div>
                    <div className="company-field">
                        <label htmlFor="job-requirements">Yêu cầu ứng viên (mỗi dòng một ý)</label>
                        <textarea id="job-requirements" name="requirements" value={form.requirements} onChange={handleChange} />
                    </div>
                    <div className="company-field">
                        <label htmlFor="job-benefits">Quyền lợi (mỗi dòng một ý)</label>
                        <textarea id="job-benefits" name="benefits" value={form.benefits} onChange={handleChange} />
                    </div>
                    {editingId && <p className="company-job-hint">Sau khi lưu, tin sẽ được gửi lại để quản trị viên duyệt.</p>}
                    <div className="company-actions company-job-form-actions">
                        <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Đăng tin'}</button>
                        <button className="button button-outline" type="button" onClick={closeForm} disabled={saving}>Hủy</button>
                    </div>
                </form>
            ) : (
                <>
                    {loading ? <p>Đang tải danh sách tin...</p> : !hasCompany ? (
                        <div className="support-empty">Bạn chưa khai báo doanh nghiệp. Hãy mở tab <b>Thông tin doanh nghiệp</b>, nhập tên doanh nghiệp rồi lưu để bắt đầu đăng tin.</div>
                    ) : (
                        <div className="company-actions">
                            <button className="button button-primary" type="button" onClick={openCreate}><Plus size={15} /> Đăng tin mới</button>
                        </div>
                    )}
                    {loading || !hasCompany ? null : jobs.length === 0 ? (
                        <div className="support-empty">Doanh nghiệp chưa có tin tuyển dụng nào.</div>
                    ) : (
                        <div className="company-applicant-list">
                            {jobs.map((job) => {
                                const allowed = transitions[job.status] ?? []
                                const busy = busyId === job.id
                                return (
                                    <article className="company-applicant-card" key={job.id}>
                                        <div className="company-applicant-heading">
                                            <div><h2>{job.title}</h2><p>{job.category} · {job.type} · {job.location}</p></div>
                                            <span className={`support-status-badge admin-status-${job.status}`}>{statusLabels[job.status] ?? job.status}</span>
                                        </div>
                                        <div className="company-applicant-details">
                                            <p><b>Slot:</b> {job.applied}/{job.slots} hồ sơ đang chiếm chỗ · <b>Tổng hồ sơ:</b> {job.totalApplications}</p>
                                            {job.deadline && <p><b>Hạn nộp:</b> {job.deadline}</p>}
                                            {job.description && <p><b>Mô tả công việc:</b> {job.description}</p>}
                                            {job.status === 'rejected' && job.reviewNote && <p><b>Lý do từ chối:</b> {job.reviewNote}</p>}
                                            {job.status === 'pending' && <p className="company-job-hint">Tin đang chờ quản trị viên duyệt. Sau khi được duyệt, bạn mới ẩn hoặc đóng tuyển được.</p>}
                                            {job.status === 'rejected' && <p className="company-job-hint">Hãy sửa nội dung rồi lưu để gửi duyệt lại.</p>}
                                        </div>
                                        <div className="company-applicant-actions">
                                            <button className="button button-outline" type="button" disabled={busy} onClick={() => openEdit(job)}><Pencil size={15} /> Sửa</button>
                                            {allowed.includes('hidden') && <button className="button button-outline" type="button" disabled={busy} onClick={() => changeStatus(job, 'hidden')}><EyeOff size={15} /> Ẩn tin</button>}
                                            {job.status === 'hidden' && allowed.includes('approved') && <button className="button button-outline" type="button" disabled={busy} onClick={() => changeStatus(job, 'approved')}><Eye size={15} /> Hiện lại</button>}
                                            {allowed.includes('closed') && <button className="button button-outline" type="button" disabled={busy} onClick={() => changeStatus(job, 'closed')}><Lock size={15} /> Đóng tuyển</button>}
                                            {job.status === 'closed' && allowed.includes('approved') && <button className="button button-outline" type="button" disabled={busy} onClick={() => changeStatus(job, 'approved')}><LockOpen size={15} /> Mở lại</button>}
                                            <button className="button button-outline" type="button" disabled={busy} onClick={() => deleteJob(job)}><Trash2 size={15} /> Xóa</button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </>
            )}
        </section>
    )
}

export default EmployerJobs
