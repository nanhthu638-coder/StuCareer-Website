import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Building2, BriefcaseBusiness, Download, UsersRound, Check, X } from 'lucide-react'
import { apiRequest, downloadApiFile } from './api.js'
import EmployerJobs from './EmployerJobs.jsx'

const emptyCompany = { name: '', industry: '', size: '', address: '', website: '', description: '' }
const sizeOptions = ['Dưới 50 nhân viên', '50 – 200 nhân viên', '200 – 1000 nhân viên', 'Trên 1000 nhân viên']
const industryOptions = [
    'Công nghệ thông tin',
    'Thương mại điện tử',
    'Công nghệ tài chính',
    'Marketing',
    'Thiết kế sáng tạo',
    'Tài chính - Kế toán',
    'Kinh doanh',
    'Nhân sự',
    'Giáo dục',
    'Sản xuất',
    'Thực phẩm và đồ uống',
]
const locationOptions = [
    'TP. Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Làm việc từ xa',
]

function CompanyProfile({ token, onBack, initialTab = 'company' }) {
    const [company, setCompany] = useState(emptyCompany)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [applications, setApplications] = useState([])
    const [applicationError, setApplicationError] = useState('')
    const [applicationNotice, setApplicationNotice] = useState(null)
    const [applicationLoading, setApplicationLoading] = useState(initialTab === 'applications')
    const [busyApplicationId, setBusyApplicationId] = useState(null)
    const [activeTab, setActiveTab] = useState(initialTab)

    // Tải thông tin doanh nghiệp một lần khi mở trang
    useEffect(() => {
        let cancelled = false
        apiRequest('company', { token })
            .then((result) => {
                if (!cancelled) setCompany(result.company)
            })
            .catch((loadError) => {
                if (!cancelled) setError(loadError.message)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [token])

    const loadApplications = useCallback(async () => {
        setApplicationLoading(true)
        setApplicationError('')
        try {
            const result = await apiRequest('employer/applications', { token })
            setApplications(result.applications || [])
        } catch (loadError) {
            setApplicationError(loadError.message || 'Không thể tải danh sách ứng viên.')
        } finally {
            setApplicationLoading(false)
        }
    }, [token])

    useEffect(() => {
        if (initialTab !== 'applications') return undefined
        let cancelled = false
        apiRequest('employer/applications', { token })
            .then((result) => {
                if (!cancelled) setApplications(result.applications || [])
            })
            .catch((loadError) => {
                if (!cancelled) setApplicationError(loadError.message || 'Không thể tải danh sách ứng viên.')
            })
            .finally(() => {
                if (!cancelled) setApplicationLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [initialTab, token])

    const decideApplication = async (application, decisionStatus) => {
        setBusyApplicationId(application.id)
        setApplicationError('')
        setApplicationNotice(null)
        try {
            const result = await apiRequest(`employer/applications/${application.id}/decision`, {
                method: 'PATCH', token, body: { decisionStatus },
            })
            if (result.emailStatus === 'sent') {
                setApplicationNotice({ message: 'Đã cập nhật kết quả và gửi email cho ứng viên.', isError: false })
            } else if (result.emailStatus === 'logged') {
                setApplicationNotice({ message: 'Đã cập nhật kết quả. SMTP chưa cấu hình nên email chỉ được ghi vào nhật ký.', isError: false })
            } else if (result.emailStatus === 'failed') {
                setApplicationNotice({
                    message: result.emailError || 'Đã cập nhật kết quả nhưng không thể gửi email.',
                    isError: true,
                })
            } else {
                setApplicationNotice({ message: result.message, isError: false })
            }
            await loadApplications()
        } catch (updateError) {
            setApplicationError(updateError.message || 'Không thể cập nhật kết quả.')
        } finally {
            setBusyApplicationId(null)
        }
    }

    const downloadCv = async (application) => {
        try {
            await downloadApiFile(`/api/employer/applications/${application.id}/cv`, token, application.cvName)
        } catch (downloadError) {
            setApplicationError(downloadError.message || 'Không thể tải CV.')
        }
    }

    // Mỗi ô nhập có thuộc tính name trùng tên trường trong company
    const handleChange = (event) => {
        const { name, value } = event.target
        setCompany((current) => ({ ...current, [name]: value }))
        setSuccess('')
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setSuccess('')
        if (company.name.trim().length < 2) {
            setError('Vui lòng nhập tên doanh nghiệp (ít nhất 2 ký tự).')
            return
        }
        setSaving(true)
        try {
            const result = await apiRequest('company', { method: 'PUT', token, body: company })
            setCompany(result.company)
            setSuccess(result.message)
        } catch (saveError) {
            setError(saveError.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <main className="section company-page">
            <div className="page-shell">
                <button className="back-link" type="button" onClick={onBack}>
                    <ArrowLeft size={16} /> Về trang chủ
                </button>

                <div className="company-tabs" role="tablist" aria-label="Quản lý doanh nghiệp">
                    <button type="button" className={`company-tab${activeTab === 'company' ? ' company-tab-active' : ''}`} onClick={() => setActiveTab('company')}><Building2 size={16} /> Thông tin doanh nghiệp</button>
                    <button type="button" className={`company-tab${activeTab === 'jobs' ? ' company-tab-active' : ''}`} onClick={() => setActiveTab('jobs')}><BriefcaseBusiness size={16} /> Tin tuyển dụng</button>
                    <button type="button" className={`company-tab${activeTab === 'applications' ? ' company-tab-active' : ''}`} onClick={() => { setActiveTab('applications'); loadApplications() }}><UsersRound size={16} /> Danh sách ứng viên</button>
                </div>
                {activeTab === 'jobs' ? (
                    <EmployerJobs token={token} />
                ) : activeTab === 'applications' ? (
                    <section className="company-card company-applications">
                        <div className="company-card-heading">
                            <span className="company-card-icon"><UsersRound size={20} /></span>
                            <div><h1>Danh sách ứng viên</h1><p>Xem hồ sơ, tải CV và cập nhật kết quả tuyển dụng.</p></div>
                        </div>
                        {applicationError && <div className="form-api-error" role="alert">{applicationError}</div>}
                        {applicationNotice && (
                            <div className={applicationNotice.isError ? 'form-api-error' : 'form-api-success'} role={applicationNotice.isError ? 'alert' : 'status'}>
                                {applicationNotice.message}
                            </div>
                        )}
                        {applicationLoading ? <p>Đang tải danh sách ứng viên...</p> : applications.length === 0 ? (
                            <div className="support-empty">Chưa có ứng viên cho doanh nghiệp này. Hãy kiểm tra tên doanh nghiệp trong hồ sơ có trùng với tên công ty của tin tuyển dụng.</div>
                        ) : (
                            <div className="company-applicant-list">
                                {applications.map((applicant) => (
                                    <article className="company-applicant-card" key={applicant.id}>
                                        <div className="company-applicant-heading">
                                            <div><h2>{applicant.name}</h2><p>{applicant.title} · {applicant.company}</p></div>
                                            <span className={`support-status-badge ${applicant.decisionStatus === 'accepted' ? 'admin-status-approved' : applicant.decisionStatus === 'rejected' ? 'admin-status-rejected' : 'admin-status-pending'}`}>
                                                {applicant.decisionStatus === 'accepted' ? 'Trúng tuyển' : applicant.decisionStatus === 'rejected' ? 'Từ chối' : 'Chờ xử lý'}
                                            </span>
                                        </div>
                                        <div className="company-applicant-details">
                                            <p><b>Email:</b> {applicant.email}</p><p><b>Điện thoại:</b> {applicant.phone}</p>
                                            <p><b>Trường/ngành:</b> {[applicant.university, applicant.major].filter(Boolean).join(' · ') || 'Chưa cập nhật'}</p>
                                            {applicant.skills && <p><b>Kỹ năng:</b> {applicant.skills}</p>}
                                            {applicant.coverLetter && <p><b>Thư giới thiệu:</b> {applicant.coverLetter}</p>}
                                        </div>
                                        <div className="company-applicant-actions">
                                            <button className="button button-outline" type="button" onClick={() => downloadCv(applicant)}><Download size={15} /> Tải CV ({applicant.cvName})</button>
                                            <button className="button button-primary" type="button" disabled={busyApplicationId === applicant.id || applicant.decisionStatus === 'accepted'} onClick={() => decideApplication(applicant, 'accepted')}><Check size={15} /> Trúng tuyển</button>
                                            <button className="button button-outline" type="button" disabled={busyApplicationId === applicant.id || applicant.decisionStatus === 'rejected'} onClick={() => decideApplication(applicant, 'rejected')}><X size={15} /> Từ chối</button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                <div className="company-card">
                    <div className="company-card-heading">
                        <span className="company-card-icon"><Building2 size={20} /></span>
                        <div>
                            <h1>Thông tin doanh nghiệp</h1>
                            <p>Cập nhật thông tin để sinh viên hiểu rõ hơn về doanh nghiệp của bạn.</p>
                        </div>
                    </div>

                    {error && <div className="form-api-error" role="alert">{error}</div>}
                    {success && <div className="form-api-success" role="status">{success}</div>}

                    {loading ? (
                        <p>Đang tải thông tin...</p>
                    ) : (
                        <form className="company-form" onSubmit={handleSubmit} noValidate>
                            <div className="company-field">
                                <label htmlFor="company-name">Tên doanh nghiệp *</label>
                                <input id="company-name" name="name" value={company.name} onChange={handleChange} maxLength={100} placeholder="Công ty TNHH ABC" />
                            </div>

                            <div className="company-row">
                                <div className="company-field">
                                    <label htmlFor="company-industry">Lĩnh vực hoạt động</label>
                                    <select id="company-industry" name="industry" value={company.industry} onChange={handleChange}>
                                        <option value="">Chọn lĩnh vực</option>
                                        {company.industry && !industryOptions.includes(company.industry) && (
                                            <option value={company.industry}>{company.industry}</option>
                                        )}
                                        {industryOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="company-field">
                                    <label htmlFor="company-size">Quy mô</label>
                                    <select id="company-size" name="size" value={company.size} onChange={handleChange}>
                                        <option value="">Chọn quy mô</option>
                                        {sizeOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="company-field">
                                <label htmlFor="company-address">Địa chỉ</label>
                                <input
                                    id="company-address"
                                    name="address"
                                    list="company-location-options"
                                    value={company.address}
                                    onChange={handleChange}
                                    maxLength={200}
                                    placeholder="Chọn hoặc nhập địa điểm"
                                />
                                <datalist id="company-location-options">
                                    {locationOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </datalist>
                            </div>

                            <div className="company-field">
                                <label htmlFor="company-website">Website</label>
                                <input id="company-website" name="website" value={company.website} onChange={handleChange} placeholder="https://congty.vn" />
                            </div>

                            <div className="company-field">
                                <label htmlFor="company-description">Giới thiệu</label>
                                <textarea id="company-description" name="description" value={company.description} onChange={handleChange} maxLength={1000} placeholder="Giới thiệu ngắn về doanh nghiệp, văn hóa làm việc..." />
                            </div>

                            <div className="company-actions">
                                <button className="button button-primary" type="submit" disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                )}
            </div>
        </main>
    )
}

export default CompanyProfile