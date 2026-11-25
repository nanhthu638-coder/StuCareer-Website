import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Bell, BriefcaseBusiness, MapPin, MessageCircleQuestion, UserRoundPlus, X } from 'lucide-react'
import { requestApiJson } from '../../api.js'
import { createLogo } from '../../data/mockCompanies.js'
import './NotificationBell.css'

const pollIntervalMs = 60 * 1000
const maxNotifications = 8
// Ngành học ở hồ sơ không trùng tên với lĩnh vực của tin, nên cần ánh xạ sang lĩnh vực tương ứng.
const categoriesByMajor = {
  'Công nghệ thông tin': ['Công nghệ thông tin'],
  'Hệ thống thông tin': ['Công nghệ thông tin'],
  'Khoa học dữ liệu': ['Công nghệ thông tin'],
  Marketing: ['Marketing'],
  'Truyền thông': ['Marketing', 'Thiết kế sáng tạo'],
  'Kinh doanh': ['Kinh doanh', 'Chăm sóc khách hàng'],
  'Thiết kế sáng tạo': ['Thiết kế sáng tạo'],
  'Tài chính - Kế toán': ['Tài chính — Kế toán'],
  'Quản trị nhân lực': ['Nhân sự'],
}

function normalizeSkills(value) {
  const skills = Array.isArray(value) ? value : String(value || '').split(',')
  return skills.map((skill) => skill.trim().toLocaleLowerCase('vi')).filter((skill) => skill.length >= 2)
}

function matchesProfile(job, profile) {
  const major = String(profile.major || '').trim()
  if (major && (categoriesByMajor[major] ?? [major]).includes(job.category)) return true
  const skills = normalizeSkills(profile.skills)
  if (skills.length === 0) return false
  const text = [job.title, job.description, job.requirements, job.benefits].join(' ').toLocaleLowerCase('vi')
  return skills.some((skill) => text.includes(skill))
}

function readStorageKey(userId) {
  return `stucareer:read-jobs:${userId}`
}

function loadReadJobs(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(readStorageKey(userId)))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function formatDate(value, verb) {
  const date = value ? new Date(`${String(value).replace(' ', 'T')}Z`) : null
  return date && !Number.isNaN(date.getTime()) ? `${verb} ngày ${date.toLocaleDateString('vi-VN')}` : 'Mới'
}

function NotificationBell({ accessToken, userId, role, profileVersion, onOpenJob, onOpenApplications = () => {} }) {
  const shouldReduceMotion = useReducedMotion()
  const isSeeker = role === 'seeker'
  const isEmployer = role === 'employer'
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [notices, setNotices] = useState([])
  const [applicationNotices, setApplicationNotices] = useState([])
  const [profileError, setProfileError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [readJobs, setReadJobs] = useState(() => loadReadJobs(userId))
  const rootRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = (isFirstLoad) => Promise.all([
      isSeeker ? requestApiJson('/api/profile', { accessToken }) : null,
      isSeeker ? requestApiJson('/api/jobs') : null,
      requestApiJson('/api/notifications/contact', { accessToken }),
      isEmployer ? requestApiJson('/api/notifications/employer', { accessToken }) : null,
    ])
      .then(([profileResult, jobsResult, noticeResult, applicationResult]) => {
        if (cancelled) return
        setProfileError('')
        if (profileResult) setProfile(profileResult.profile)
        if (jobsResult) setJobs(Array.isArray(jobsResult.jobs) ? jobsResult.jobs : [])
        setNotices(Array.isArray(noticeResult.notices) ? noticeResult.notices : [])
        if (applicationResult) {
          setApplicationNotices(Array.isArray(applicationResult.notices) ? applicationResult.notices : [])
        }
      })
      .catch((error) => {
        if (!cancelled && isFirstLoad) setProfileError(error.message || 'Không thể tải thông báo.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    load(true)
    // Định kỳ tải lại để tin vừa được duyệt hoặc thắc mắc vừa được xử lý xuất hiện mà không cần tải lại trang.
    const timer = window.setInterval(() => load(false), pollIntervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [accessToken, profileVersion, isSeeker, isEmployer])

  useEffect(() => {
    if (!dropdownOpen && !selectedItem) return undefined

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setDropdownOpen(false)
        setSelectedItem(null)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
        setSelectedItem(null)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [dropdownOpen, selectedItem])

  const notifications = useMemo(() => {
    const contactItems = notices.map((notice) => ({
      key: `contact-${notice.id}`,
      kind: 'contact',
      id: notice.id,
      title: 'Thắc mắc của bạn đã được xử lý',
      subject: notice.subject,
      note: notice.note,
      date: formatDate(notice.resolvedAt, 'Xử lý'),
      unread: !notice.seen,
    }))
    const jobItems = !profile ? [] : jobs
      .filter((job) => matchesProfile(job, profile))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id)
      .slice(0, maxNotifications)
      .map((job) => ({
        key: `job-${job.id}`,
        kind: 'job',
        id: job.id,
        title: job.title,
        company: job.company,
        category: job.category,
        location: job.location,
        date: formatDate(job.created_at, 'Đăng'),
        unread: !readJobs.includes(job.id),
      }))
    const applicationItems = applicationNotices.map((notice) => ({
      key: `application-${notice.id}`,
      kind: 'application',
      id: notice.id,
      title: `${notice.candidateName} vừa ứng tuyển`,
      jobTitle: notice.jobTitle,
      company: notice.company,
      major: notice.major,
      decisionStatus: notice.decisionStatus,
      date: formatDate(notice.createdAt, 'Nộp'),
      unread: !notice.seen,
    }))
    return [...applicationItems, ...contactItems, ...jobItems]
  }, [notices, applicationNotices, jobs, profile, readJobs])

  const unreadCount = notifications.filter((item) => item.unread).length

  const openPreview = (item) => {
    if (item.kind === 'job' && item.unread) {
      const nextRead = [...readJobs, item.id]
      setReadJobs(nextRead)
      try {
        localStorage.setItem(readStorageKey(userId), JSON.stringify(nextRead))
      } catch {
        // Không lưu được (chế độ riêng tư): trạng thái đã đọc chỉ giữ trong phiên này.
      }
    }
    if (item.kind === 'contact' && item.unread) {
      setNotices((current) => current.map((notice) => (notice.id === item.id ? { ...notice, seen: true } : notice)))
      requestApiJson(`/api/notifications/contact/${item.id}/seen`, { method: 'POST', accessToken }).catch(() => {})
    }
    if (item.kind === 'application' && item.unread) {
      setApplicationNotices((current) => current.map((notice) => (
        notice.id === item.id ? { ...notice, seen: true } : notice
      )))
      requestApiJson(`/api/notifications/employer/${item.id}/seen`, { method: 'POST', accessToken }).catch(() => {})
    }
    setSelectedItem(item)
  }

  const goToJob = () => {
    if (selectedItem?.kind !== 'job') return
    const jobId = selectedItem.id
    setSelectedItem(null)
    setDropdownOpen(false)
    onOpenJob(jobId)
  }

  const goToApplications = () => {
    setSelectedItem(null)
    setDropdownOpen(false)
    onOpenApplications()
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
            aria-label="Thông báo của tài khoản"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -7, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
            <div className="notification-dropdown-heading">
              <div>
                <strong>Thông báo</strong>
                <span>{isSeeker ? 'Việc làm phù hợp và phản hồi thắc mắc' : 'Ứng viên mới và phản hồi thắc mắc'}</span>
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
              <p className="notification-empty">
                {isSeeker
                  ? 'Chưa có thông báo nào. Hãy cập nhật ngành học và kỹ năng trong hồ sơ để nhận gợi ý việc làm chính xác hơn.'
                  : 'Chưa có thông báo nào.'}
              </p>
            ) : (
              <ul className="notification-list">
                {notifications.map((item) => (
                  <li key={item.key}>
                    <button
                      className={`notification-item${item.unread ? ' notification-item-unread' : ''}`}
                      type="button"
                      onClick={() => openPreview(item)}
                    >
                      <img src={item.kind === 'contact' ? createLogo('Hỗ trợ', '#124e66') : createLogo(item.company || 'Ứng viên', '#26a9a0')} alt="" />
                      <span className="notification-item-copy">
                        <strong>{item.title}</strong>
                        {item.kind === 'job' ? (
                          <>
                            <span>{item.company} · {item.category}</span>
                            <small><MapPin size={12} />{item.location}</small>
                          </>
                        ) : item.kind === 'application' ? (
                          <>
                            <span>{item.jobTitle}{item.major ? ` · ${item.major}` : ''}</span>
                            <small>Hồ sơ chờ nhà tuyển dụng xem xét</small>
                          </>
                        ) : (
                          <span>{item.subject}</span>
                        )}
                        <time>{item.date}</time>
                      </span>
                      {item.unread && <i className="notification-unread-dot" aria-label="Chưa đọc" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
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
                onClick={() => setSelectedItem(null)}
              >
                <X size={18} />
              </button>
              {selectedItem.kind === 'job' ? (
                <>
                  <img src={createLogo(selectedItem.company, '#26a9a0')} alt="" />
                  <span className="notification-preview-eyebrow"><BriefcaseBusiness size={14} /> VIỆC LÀM PHÙ HỢP</span>
                  <h2 id="notification-preview-title">{selectedItem.title}</h2>
                  <p>{selectedItem.company} · {selectedItem.location}. Bạn có muốn xem chi tiết vị trí này không?</p>
                  <div className="notification-preview-actions">
                    <button className="button button-outline" type="button" onClick={() => setSelectedItem(null)}>Để sau</button>
                    <motion.button
                      className="button button-primary"
                      type="button"
                      onClick={goToJob}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                    >
                      Xem ngay <ArrowUpRight size={15} />
                    </motion.button>
                  </div>
                </>
              ) : selectedItem.kind === 'application' ? (
                <>
                  <img src={createLogo(selectedItem.company, '#26a9a0')} alt="" />
                  <span className="notification-preview-eyebrow"><UserRoundPlus size={14} /> ỨNG VIÊN MỚI</span>
                  <h2 id="notification-preview-title">{selectedItem.title}</h2>
                  <p>Hồ sơ dành cho vị trí “{selectedItem.jobTitle}”. Bạn có thể xem CV, thông tin liên hệ và cập nhật kết quả tuyển dụng.</p>
                  <div className="notification-preview-actions">
                    <button className="button button-outline" type="button" onClick={() => setSelectedItem(null)}>Để sau</button>
                    <motion.button
                      className="button button-primary"
                      type="button"
                      onClick={goToApplications}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                    >
                      Xem ứng viên <ArrowUpRight size={15} />
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  <img src={createLogo('Hỗ trợ', '#124e66')} alt="" />
                  <span className="notification-preview-eyebrow"><MessageCircleQuestion size={14} /> THẮC MẮC ĐÃ ĐƯỢC XỬ LÝ</span>
                  <h2 id="notification-preview-title">{selectedItem.subject}</h2>
                  <p>{selectedItem.note ? `Phản hồi từ StuWork: ${selectedItem.note}` : 'Thắc mắc của bạn đã được đội ngũ StuWork xử lý.'}</p>
                  <div className="notification-preview-actions">
                    <button className="button button-primary" type="button" onClick={() => setSelectedItem(null)}>Đã hiểu</button>
                  </div>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
