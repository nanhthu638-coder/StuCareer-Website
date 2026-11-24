import { ArrowUpRight, BriefcaseBusiness, MapPin } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

function JobCard({ job, onApply }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.article
      className="chat-job-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      <div className="chat-job-heading">
        <span className="chat-job-icon"><BriefcaseBusiness size={17} aria-hidden="true" /></span>
        <div>
          <h3>{job.title}</h3>
          <span>{job.company}</span>
        </div>
      </div>
      <div className="chat-job-meta">
        <span><MapPin size={13} aria-hidden="true" />{job.location}</span>
        <strong>{job.salary}</strong>
      </div>
      <button className="chat-job-apply" type="button" onClick={() => onApply(job)}>
        Ứng tuyển <ArrowUpRight size={14} aria-hidden="true" />
      </button>
    </motion.article>
  )
}

export default JobCard
