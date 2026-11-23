import { ArrowLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Building2, Mail, MapPin, Phone, UsersRound } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { getCompanyById } from './data/mockCompanies.js'
import './CompanyDetail.css'

function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { onViewJob } = useOutletContext()
  const shouldReduceMotion = useReducedMotion()
  const company = getCompanyById(id)

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
                <span className="company-job-count">{company.jobs.length} vị trí</span>
              </div>
              <div className="company-detail-job-list">
                {company.jobs.map((job, index) => (
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
                    <button className="company-apply-button" type="button" onClick={() => onViewJob(job.appJobId)}>
                      Ứng tuyển <ArrowUpRight size={15} />
                    </button>
                  </motion.article>
                ))}
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
                <div><small>Email liên hệ</small><a href={`mailto:${company.email}`}>{company.email}</a></div>
              </div>
              <div className="company-fact">
                <span><Phone size={16} /></span>
                <div><small>Điện thoại</small><a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a></div>
              </div>
              <a className="company-website" href={company.website} target="_blank" rel="noreferrer">
                Website công ty <ArrowUpRight size={14} />
              </a>
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
