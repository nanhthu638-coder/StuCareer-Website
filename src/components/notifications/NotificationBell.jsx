import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Bell, Building2, MapPin, X } from 'lucide-react'
import { requestApiJson } from '../../api.js'
import { mockCompanies } from '../../data/mockCompanies.js'
import './NotificationBell.css'

function normalizeSkills(value) {
  const skills = Array.isArray(value) ? value : String(value || '').split(',')
  return new Set(skills.map((skill) => skill.trim().toLocaleLowerCase('vi')).filter(Boolean))
}

function NotificationBell({ accessToken, profileVersion, onNavigateCompany }) {
  const shouldReduceMotion = useReducedMotion()
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [readCompanies, setReadCompanies] = useState([])
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    requestApiJson('/api/profile', { accessToken })
      .then(({ profile: nextProfile }) => {
        if (!cancelled) {
          setProfileError('')
          setProfile(nextProfile)
        }
      })
      .catch((error) => {
        if (!cancelled) setProfileError(error.message || 'Không thể tải thông báo.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [accessToken, profileVersion])

  useEffect(() => {
    if (!dropdownOpen && !selectedCompany) return undefined

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setDropdownOpen(false)
        setSelectedCompany(null)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
        setSelectedCompany(null)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [dropdownOpen, selectedCompany])

  const notifications = useMemo(() => {
    if (!profile) return []
    const userSkills = normalizeSkills(profile.skills)
    const userMajor = String(profile.major || '').trim().toLocaleLowerCase('vi')

    return mockCompanies.flatMap((company) => {
      const matchingJobs = company.jobs.filter((job) => {
        const sameMajor = userMajor && job.major.trim().toLocaleLowerCase('vi') === userMajor
        const sharedSkill = job.skills.some((skill) => userSkills.has(skill.toLocaleLowerCase('vi')))
        return sameMajor || sharedSkill
      })
      return matchingJobs.length ? [{ ...company, matchingJobs }] : []
    }).slice(0, 5)
  }, [profile])

  const unreadCount = notifications.filter((company) => !readCompanies.includes(company.id)).length

  const openCompanyPreview = (company) => {
    setReadCompanies((current) => current.includes(company.id) ? current : [...current, company.id])
    setSelectedCompany(company)
  }

  const goToCompany = () => {
    if (!selectedCompany) return
    const companyId = selectedCompany.id
    setSelectedCompany(null)
    setDropdownOpen(false)
    onNavigateCompany(companyId)
  }

  return (
    <div className="notification-bell-root" ref={rootRef}>
      <button
        className="notification-bell-trigger"
        type="button"
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        aria-expanded={dropdownOpen}
        aria-haspopup="dialog"
        onClick={() => setDropdownOpen((open) => !open)}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            className="notification-dropdown"
            role="dialog"
            aria-label="Thông báo việc làm phù hợp"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -7, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
            <div className="notification-dropdown-heading">
              <div>
                <strong>Thông báo</strong>
                <span>Việc làm phù hợp với hồ sơ của bạn</span>
              </div>
              <button type="button" aria-label="Đóng thông báo" onClick={() => setDropdownOpen(false)}>
                <X size={17} />
              </button>
            </div>

            {isLoading ? (
              <p className="notification-empty">Đang tải thông báo...</p>
            ) : profileError ? (
              <p className="notification-empty notification-error" role="alert">{profileError}</p>
            ) : notifications.length === 0 ? (
              <p className="notification-empty">Chưa có doanh nghiệp nào phù hợp với ngành học hoặc kỹ năng của bạn.</p>
            ) : (
              <ul className="notification-list">
                {notifications.map((company) => {
                  const unread = !readCompanies.includes(company.id)
                  return (
                    <li key={company.id}>
                      <button
                        className={`notification-item${unread ? ' notification-item-unread' : ''}`}
                        type="button"
                        onClick={() => openCompanyPreview(company)}
                      >
                        <img src={company.logo} alt="" />
                        <span className="notification-item-copy">
                          <strong>{company.name}</strong>
                          <span>Vừa đăng {company.matchingJobs.length} vị trí phù hợp</span>
                          <small><MapPin size={12} />{company.location}</small>
                          <time>{company.postedAt}</time>
                        </span>
                        {unread && <i className="notification-unread-dot" aria-label="Chưa đọc" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCompany && (
          <motion.div
            className="notification-modal-backdrop"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            <motion.section
              className="notification-preview-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-preview-title"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            >
              <button
                className="notification-preview-close"
                type="button"
                aria-label="Đóng xem trước"
                onClick={() => setSelectedCompany(null)}
              >
                <X size={18} />
              </button>
              <img src={selectedCompany.logo} alt="" />
              <span className="notification-preview-eyebrow"><Building2 size={14} /> GỢI Ý DOANH NGHIỆP</span>
              <h2 id="notification-preview-title">Doanh nghiệp mới: {selectedCompany.name}</h2>
              <p>Bạn có muốn xem thử thông tin công ty và các vị trí phù hợp không?</p>
              <div className="notification-preview-actions">
                <button className="button button-outline" type="button" onClick={() => setSelectedCompany(null)}>Để sau</button>
                <motion.button
                  className="button button-primary"
                  type="button"
                  onClick={goToCompany}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                >
                  Xem ngay <ArrowUpRight size={15} />
                </motion.button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
