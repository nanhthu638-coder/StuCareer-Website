import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Building2, Mail, MapPin, Phone, UsersRound } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { requestApiJson } from './api.js'
import { getCompanyById } from './data/mockCompanies.js'
import { toJobViewModel } from './jobViewModel.js'
import './CompanyDetail.css'

function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { onViewJob } = useOutletContext()
  const shouldReduceMotion = useReducedMotion()
  const company = getCompanyById(id)
  const companyName = company?.name
  const [companyJobs, setCompanyJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')

  useEffect(() => {
    if (!companyName) return undefined

    let cancelled = false
    requestApiJson('/api/jobs')
      .then(({ jobs }) => {
        if (!Array.isArray(jobs)) throw new Error('Dữ liệu việc làm từ máy chủ không hợp lệ.')
        const matchingJobs = jobs
          .filter((job) => job.company.trim().toLocaleLowerCase('vi') === companyName.trim().toLocaleLowerCase('vi'))
          .map((job) => ({
            ...toJobViewModel(job),
            major: job.category,
          }))
        if (!cancelled) setCompanyJobs(matchingJobs)
      })
      .catch((error) => {
        if (!cancelled) setJobsError(error.message || 'Không thể tải việc làm của doanh nghiệp.')
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false)
      })

    return () => { cancelled = true }
  }, [companyName])

  if (!company) {
    return (
      <main className="company-detail-page">
        <div className="page-shell company-not-found">
          <Building2 size={34} />
          <h1>Không tìm thấy doanh nghiệp</h1>
          <p>Đường dẫn này không có trong dữ liệu doanh nghiệp mẫu.</p>
          <button className="button button-primary" type="button" onClick={() => navigate('/')}>Quay lại trang chủ</button>
        </div>
      </main>
    )
  }

  const jobVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.24, delay: shouldReduceMotion ? 0 : index * 0.08 },
    }),
  }

  return (
    <main className="company-detail-page">
      <div className="company-detail-shell">
        <motion.header
          className="company-detail-header"
          initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
        >
          <div className="company-detail-cover" style={{ backgroundImage: `url("${company.cover}")` }} />
          <div className="company-detail-header-content">
            <img className="company-detail-logo" src={company.logo} alt={`Logo ${company.name}`} />
            <div className="company-detail-identity">
              <div className="company-detail-name">
                <h1>{company.name}</h1>
                {company.isVerified && <BadgeCheck size={20} aria-label="Doanh nghiệp đã xác minh" />}
              </div>
              <p>{company.industry}</p>
              <span><MapPin size={14} />{company.location}</span>
            </div>
            <button className="company-back-button" type="button" onClick={() => navigate('/')}>
              <ArrowLeft size={15} /> Quay lại
            </button>
          </div>
        </motion.header>

        <div className="company-detail-columns">
          <div className="company-detail-main-column">
            <section className="company-detail-section company-about">
              <span className="company-section-eyebrow">VỀ CHÚNG TÔI</span>
              <h2>Giới thiệu doanh nghiệp</h2>
              <p>{company.description}</p>
            </section>

            <section className="company-detail-section company-jobs-section">
              <div className="company-jobs-heading">
                <div>
                  <span className="company-section-eyebrow">CƠ HỘI NGHỀ NGHIỆP</span>
                  <h2>Vị trí đang tuyển</h2>
                </div>
                <span className="company-job-count">{companyJobs.length} vị trí</span>
              </div>
              <div className="company-detail-job-list">
                {companyJobs.map((job, index) => (
                  <motion.article
                    className="company-detail-job"
                    key={job.id}
                    custom={index}
                    variants={jobVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="company-detail-job-title">
                      <span className="company-job-icon"><BriefcaseBusiness size={18} /></span>
                      <div>
                        <h3>{job.title}</h3>
                        <span><MapPin size={12} />{job.location}</span>
                      </div>
                    </div>
                    <div className="company-job-tags">
                      <span>{job.major}</span>
                      <strong>{job.salary}</strong>
                    </div>
                    <button className="company-apply-button" type="button" onClick={() => onViewJob(job)}>
                      Ứng tuyển <ArrowUpRight size={15} />
                    </button>
                  </motion.article>
                ))}
                {jobsLoading && <p role="status">Đang tải việc làm...</p>}
                {jobsError && <p className="field-error" role="alert">{jobsError}</p>}
                {!jobsLoading && !jobsError && companyJobs.length === 0 && <p>Doanh nghiệp hiện chưa có tin tuyển dụng đang mở.</p>}
              </div>
            </section>
          </div>

          <aside className="company-detail-sidebar">
            <section className="company-detail-section company-facts-card">
              <h2>Thông tin công ty</h2>
              <div className="company-fact">
                <span><UsersRound size={16} /></span>
                <div><small>Quy mô</small><strong>{company.size}</strong></div>
              </div>
              <div className="company-fact">
                <span><MapPin size={16} /></span>
                <div><small>Địa điểm</small><strong>{company.location}</strong></div>
              </div>
              <div className="company-fact">
                <span><Mail size={16} /></span>
                <div><small>Email liên hệ</small>{company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : <strong>Chưa cập nhật</strong>}</div>
              </div>
              <div className="company-fact">
                <span><Phone size={16} /></span>
                <div><small>Điện thoại</small>{company.phone ? <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a> : <strong>Chưa cập nhật</strong>}</div>
              </div>
              {company.website
                ? <a className="company-website" href={company.website} target="_blank" rel="noreferrer">Website công ty <ArrowUpRight size={14} /></a>
                : <p className="company-website">Website: Chưa cập nhật</p>}
            </section>
            <button className="company-sidebar-back" type="button" onClick={() => navigate('/')}>
              <ArrowLeft size={15} /> Quay lại
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default CompanyDetail
