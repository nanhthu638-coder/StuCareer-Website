import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, MapPin } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

function CompanyCard({ company, onViewCompany }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.article
      className="chat-company-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      <div className="chat-company-heading">
        <img className="chat-company-logo" src={company.logo} alt={`Logo ${company.name}`} />
        <div className="chat-company-title">
          <h3>{company.name}</h3>
          {company.isVerified && (
            <BadgeCheck className="chat-company-verified" size={18} aria-label="Doanh nghiệp đã xác minh" />
          )}
        </div>
      </div>

      <p className="chat-company-industry">{company.industry}</p>
      <p className="chat-company-location"><MapPin size={14} aria-hidden="true" />{company.location}</p>

      <div className="chat-company-jobs">
        <span><BriefcaseBusiness size={14} aria-hidden="true" /> Đang tuyển</span>
        <ul>
          {company.openJobs.map((job) => <li key={job}>{job}</li>)}
        </ul>
      </div>

      <button className="chat-company-link" type="button" onClick={() => onViewCompany(company)}>
        Xem trang công ty <ArrowUpRight size={15} aria-hidden="true" />
      </button>
    </motion.article>
  )
}

export default CompanyCard
