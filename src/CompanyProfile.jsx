import { useEffect, useState } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { apiRequest } from './api.js'

const emptyCompany = { name: '', industry: '', size: '', address: '', website: '', description: '' }
const sizeOptions = ['Dưới 50 nhân viên', '50 – 200 nhân viên', '200 – 1000 nhân viên', 'Trên 1000 nhân viên']

function CompanyProfile({ token, onBack }) {
    const [company, setCompany] = useState(emptyCompany)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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
                                    <input id="company-industry" name="industry" value={company.industry} onChange={handleChange} maxLength={80} placeholder="Công nghệ thông tin" />
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
                                <input id="company-address" name="address" value={company.address} onChange={handleChange} maxLength={200} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
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
            </div>
        </main>
    )
}

export default CompanyProfile