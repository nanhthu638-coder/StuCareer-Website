import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Clock3,
  Code2,
  GraduationCap,
  Headset,
  MapPin,
  Megaphone,
  PenTool,
  UsersRound,
} from 'lucide-react'
import JobHero from './JobHero.jsx'
import { requestApiJson } from './api.js'
import { jobs } from './jobsData.js'

const categories = [
  { name: 'Công nghệ thông tin', count: '1.240 việc làm', icon: Code2, tone: 'mint' },
  { name: 'Marketing', count: '864 việc làm', icon: Megaphone, tone: 'peach' },
  { name: 'Tài chính — Kế toán', count: '532 việc làm', icon: CircleDollarSign, tone: 'blue' },
  { name: 'Thiết kế sáng tạo', count: '416 việc làm', icon: PenTool, tone: 'lilac' },
  { name: 'Kinh doanh', count: '728 việc làm', icon: ChartNoAxesColumnIncreasing, tone: 'yellow' },
  { name: 'Nhân sự', count: '305 việc làm', icon: UsersRound, tone: 'pink' },
  { name: 'Chăm sóc khách hàng', count: '289 việc làm', icon: Headset, tone: 'aqua' },
  { name: 'Giáo dục', count: '194 việc làm', icon: GraduationCap, tone: 'lavender' },
]

function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
}

function getJobIdentity(job) {
  return [job.title, job.company, job.location].map(normalizeSearchText).join('|')
}

function toListingJob(job) {
  const salaryMin = job.salary_min === null ? null : Number(job.salary_min)
  const salaryMax = job.salary_max === null ? null : Number(job.salary_max)

  return {
    id: `db-${job.id}`,
    title: job.title,
    company: job.company,
    location: job.location,
    salaryMin: salaryMin ?? 0,
    salaryMax: salaryMax ?? 0,
    salary: salaryMin === null || salaryMax === null
      ? 'Thỏa thuận'
      : `${salaryMin} – ${salaryMax} triệu / tháng`,
    type: job.type,
    category: job.category,
    tone: job.tone,
    logo: job.logo,
    posted: job.created_at ? `Đăng ngày ${new Date(`${job.created_at.replace(' ', 'T')}Z`).toLocaleDateString('vi-VN')}` : 'Mới đăng',
    slots: null,
    deadline: null,
    description: '',
    requirements: [],
    benefits: [],
  }
}

function HomePage({ onViewJob }) {
  const [filters, setFilters] = useState({ keyword: '', category: '', location: '', minimumSalary: 0 })
  const [databaseJobs, setDatabaseJobs] = useState([])
  const [jobsLoadError, setJobsLoadError] = useState('')

  useEffect(() => {
    let ignore = false
    requestApiJson('/api/jobs')
      .then((result) => {
        if (!Array.isArray(result.jobs)) throw new Error('Dữ liệu việc làm từ máy chủ không hợp lệ.')
        if (!ignore) setDatabaseJobs(result.jobs.map(toListingJob))
      })
      .catch((error) => {
        if (!ignore) setJobsLoadError(error.message || 'Không thể tải thêm việc làm từ máy chủ.')
      })

    return () => { ignore = true }
  }, [])

  const catalogIdentities = new Set(jobs.map(getJobIdentity))
  const availableJobs = [
    ...jobs,
    ...databaseJobs.filter((job) => !catalogIdentities.has(getJobIdentity(job))),
  ]
  const keyword = normalizeSearchText(filters.keyword.trim())
  const filteredJobs = availableJobs.filter((job) => {
    const searchableText = normalizeSearchText(`${job.title} ${job.company} ${job.category} ${job.type}`)
    const keywordMatches = !keyword
      || searchableText.includes(keyword)
      || (keyword.includes('thuc tap') && job.type === 'Internship')
    const categoryMatches = !filters.category || normalizeSearchText(job.category) === normalizeSearchText(filters.category)
    const locationMatches = !filters.location || normalizeSearchText(job.location) === normalizeSearchText(filters.location)
    const salaryMatches = !filters.minimumSalary || job.salaryMax >= filters.minimumSalary
    return keywordMatches && categoryMatches && locationMatches && salaryMatches
  })
  const hasFilters = Boolean(keyword || filters.category || filters.location || filters.minimumSalary)

  return (
    <main id="home">
      <JobHero onSearch={setFilters} />

      <section className="section categories-section" id="categories">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <div className="section-kicker">TÌM CƠ HỘI CỦA BẠN</div>
              <h2>Ngành nghề nổi bật</h2>
              <p>Chọn lĩnh vực bạn yêu thích, bắt đầu hành trình của riêng mình.</p>
            </div>
            <span className="text-link">Khám phá tất cả <ArrowRight size={16} /></span>
          </div>
          <div className="category-grid">
            {categories.map(({ name, count, icon: Icon, tone }) => (
              <button className="category-card" key={name} type="button">
                <span className={`category-icon category-${tone}`}><Icon size={22} strokeWidth={1.9} /></span>
                <span className="category-title">{name}</span>
                <span className="category-count">{count}</span>
                <ArrowUpRight className="category-arrow" size={17} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="company-strip" id="companies" aria-label="Doanh nghiệp tuyển dụng nổi bật">
        <div className="page-shell company-strip-inner">
          <span className="company-strip-label">CƠ HỘI TỪ NHỮNG DOANH NGHIỆP HÀNG ĐẦU</span>
          <div className="company-strip-list">
            <span className="company-wordmark wordmark-momo">momo</span>
            <span className="company-wordmark wordmark-shopee">Shopee</span>
            <span className="company-wordmark wordmark-vng">VNG</span>
            <span className="company-wordmark wordmark-fpt">FPT</span>
            <span className="company-wordmark wordmark-tiki">tiki</span>
          </div>
        </div>
      </section>

      <section className="section jobs-section" id="jobs">
        <div className="page-shell">
          <div className="section-heading jobs-heading">
            <div>
              <div className="section-kicker">CƠ HỘI MỚI MỖI NGÀY</div>
              <h2>{hasFilters ? 'Kết quả tìm kiếm' : 'Việc làm mới nhất'}</h2>
              <p>{hasFilters ? `${filteredJobs.length} việc làm phù hợp với tiêu chí của bạn.` : 'Cơ hội tốt đang chờ bạn — ứng tuyển ngay hôm nay.'}</p>
            </div>
          </div>
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
                <article className="job-card" key={job.id}>
                    <div className="job-card-top">
                        <div className={`company-logo logo-${job.tone}`}>{job.logo}</div>
                        <button
                            type="button"
                            className="job-save"
                            aria-label={`Lưu việc làm ${job.title}`}
                            aria-pressed="false"
                        >
                            <Bookmark size={15} />
                        </button>
                    </div>
                    <h3>
                        <button type="button" className="job-title-link" onClick={() => onViewJob(job)}>
                            {job.title}
                        </button>
                    </h3>
                    <div className="job-company"><Building2 size={15} />{job.company}<BadgeCheck size={14} className="verified-icon" /></div>
                    <div className="job-tags">
                        <span className="job-tag">{job.type}</span>
                        <span className="job-tag"><MapPin size={12} />{job.location}</span>
                    </div>
                    <div className="job-card-bottom">
                        <div className="job-salary"><strong>{job.salary}</strong><span><Clock3 size={12} />{job.posted}</span></div>
                        <button className="apply-button" type="button" onClick={() => onViewJob(job)}>
                            Xem chi tiết <ArrowRight size={14} />
                        </button>
                    </div>
                </article>
            ))}
          </div>
          {jobsLoadError && <p className="field-error" role="status">{jobsLoadError} Đang hiển thị danh sách việc làm có sẵn.</p>}
          {filteredJobs.length === 0 && (
            <div className="empty-jobs">
              <strong>Không tìm thấy việc làm phù hợp</strong>
              <p>Hãy thử thay đổi từ khóa hoặc tiêu chí tìm kiếm.</p>
            </div>
          )}
        </div>
      </section>

      <section className="cta-section">
        <div className="page-shell cta-inner">
          <div className="cta-decoration">✳</div>
          <div className="cta-icon"><BriefcaseBusiness size={21} /></div>
          <div className="cta-copy">
            <span>BẠN LÀ NHÀ TUYỂN DỤNG?</span>
            <h2>Tìm kiếm những tài năng trẻ đầy nhiệt huyết.</h2>
            <p>Kết nối với hàng ngàn sinh viên sẵn sàng tạo nên khác biệt.</p>
          </div>
          <span className="cta-button">Đăng tin tuyển dụng <ArrowRight size={16} /></span>
        </div>
      </section>
    </main>
  )
}

export default HomePage
