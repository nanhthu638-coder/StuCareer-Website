import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Building2, CalendarDays, CircleDollarSign, MapPin, UsersRound } from 'lucide-react'
import { getJobById } from './jobsData.js'

function JobDetail({ jobId, onBack }) {
    const job = getJobById(jobId)

    // trg hợp ko tìm thấy công việc (id sai, tin xóa,...)
    if (!job) {
        return (
            <main className="section job-detail">
                <div className="page-shell">
                    <div className="empty-jobs">
                        <strong>Không tìm thấy công việc</strong>
                        <p>Tin tuyển dụng này không tồn tại hoặc đã bị gỡ.</p>
                        <button className="button button-primary" type="button" onClick={onBack}>
                            Về trang chủ
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    // các dòng thông tin ở khung bên phải (số lượng tuyển nằm ở đây)
    const facts = [
        { icon: UsersRound, label: 'Số lượng tuyển', value: `${job.slots} người` },
        { icon: CircleDollarSign, label: 'Mức lương', value: job.salary },
        { icon: MapPin, label: 'Địa điểm', value: job.location },
        { icon: BriefcaseBusiness, label: 'Hình thức', value: job.type },
        { icon: CalendarDays, label: 'Hạn nộp hồ sơ', value: job.deadline },
    ]

    return (
        <main className="section job-detail">
            <div className="page-shell">
                <button className="back-link" type="button" onClick={onBack}>
                    <ArrowLeft size={16} /> Quay lại
                </button>

                <div className="job-detail-layout">
                    <article className="job-detail-main">
                        <header className="job-detail-header">
                            <div className={`company-logo logo-${job.tone}`}>{job.logo}</div>
                            <div>
                                <h1>{job.title}</h1>
                                <div className="job-company">
                                    <Building2 size={15} />
                                    {job.company}
                                    <BadgeCheck size={14} className="verified-icon" />
                                </div>
                            </div>
                        </header>

                        <section>
                            <h2>Mô tả công việc</h2>
                            <p>{job.description}</p>
                        </section>

                        <section>
                            <h2>Yêu cầu ứng viên</h2>
                            <ul>
                                {job.requirements.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h2>Quyền lợi</h2>
                            <ul>
                                {job.benefits.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </section>
                    </article>

                    <aside className="job-detail-side">
                        <ul className="job-facts">
                            {facts.map(({ icon: Icon, label, value }) => (
                                <li key={label}>
                                    <span className="fact-icon"><Icon size={17} /></span>
                                    <span>
                                        <small>{label}</small>
                                        <strong>{value}</strong>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </div>
            </div>
        </main>
    )
}

export default JobDetail