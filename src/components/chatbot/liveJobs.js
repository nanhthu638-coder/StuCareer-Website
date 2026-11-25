import { requestApiJson } from '../../api.js'
import { buildCompanyProfiles, loadCompanyProfiles } from '../../data/companyProfiles.js'
import { createLogo, toSlug } from '../../data/mockCompanies.js'
import { toJobViewModel } from '../../jobViewModel.js'

function companyKey(name) {
  return String(name || '').trim().toLocaleLowerCase('vi')
}

// Lấy tin đã duyệt kèm số slot còn lại và thông tin doanh nghiệp từ máy chủ để chatbot luôn khớp với trang chủ, trang công ty và trang nhà tuyển dụng.
export async function loadLiveData() {
  const [jobsResult, availabilityResult, companies] = await Promise.all([
    requestApiJson('/api/jobs'),
    requestApiJson('/api/jobs/availability'),
    loadCompanyProfiles().catch(() => []),
  ])
  const availabilityByJob = new Map((availabilityResult.jobs ?? []).map((item) => [Number(item.jobId), item]))
  const jobs = (jobsResult.jobs ?? []).flatMap((rawJob) => {
    try {
      const job = toJobViewModel(rawJob)
      const availability = availabilityByJob.get(job.id)
      return [{ ...job, remaining: availability ? availability.remaining : job.slots, expired: Boolean(availability?.expired) }]
    } catch {
      return []
    }
  })
  return { jobs, companies }
}

export function isOpenJob(job) {
  return job.remaining > 0 && !job.expired
}

export function newestOpenJob(jobs) {
  return jobs
    .filter(isOpenJob)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id)[0] ?? null
}

// Thẻ công ty dùng cùng hồ sơ với trang CompanyDetail; công ty chỉ có tin tuyển dụng mà chưa khai báo hồ sơ thì không có trang riêng.
export function buildCompanies({ jobs, companies }) {
  const titlesByCompany = new Map()
  const firstJobByCompany = new Map()
  for (const job of jobs) {
    const key = companyKey(job.company)
    if (!firstJobByCompany.has(key)) firstJobByCompany.set(key, job)
    if (isOpenJob(job)) titlesByCompany.set(key, [...(titlesByCompany.get(key) ?? []), job.title])
  }

  const profiles = buildCompanyProfiles(companies)
  const known = profiles.map((profile) => ({
    ...profile,
    openJobs: titlesByCompany.get(companyKey(profile.name)) ?? [],
  }))
  const knownKeys = new Set(profiles.map((profile) => companyKey(profile.name)))
  const extra = [...firstJobByCompany]
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, job]) => ({
      id: toSlug(job.company) || key,
      name: job.company,
      industry: job.category,
      location: job.location,
      logo: createLogo(job.company, '#26a9a0'),
      isVerified: false,
      hasPage: false,
      openJobs: titlesByCompany.get(key) ?? [],
    }))
  return [...known, ...extra]
}
