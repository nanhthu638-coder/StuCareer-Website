import { jobs } from '../jobsData.js'

const companyDetails = {
  Momo: { industry: 'Công nghệ tài chính', tone: '#a855f7' },
  Shopee: { industry: 'Thương mại điện tử', tone: '#f97316' },
  'VNG Corporation': { industry: 'Công nghệ thông tin', tone: '#2563eb' },
  'FPT Software': { industry: 'Công nghệ thông tin', tone: '#ea580c' },
  Tiki: { industry: 'Thương mại điện tử', tone: '#0284c7' },
  'StuTech Solutions': { industry: 'Công nghệ thông tin', tone: '#0f766e' },
  'Sao Mai Studio': { industry: 'Thiết kế sáng tạo', tone: '#7c3aed' },
  'Cà Phê Việt': { industry: 'Thực phẩm và đồ uống', tone: '#15803d' },
}

function toSlug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function createLogo(name, color) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${color}"/><text x="48" y="58" fill="white" font-family="Arial,sans-serif" font-size="32" font-weight="700" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const mockCompanies = Object.values(
  jobs.reduce((companies, job) => {
    const company = companies[job.company] ?? {
      id: toSlug(job.company),
      name: job.company,
      industry: companyDetails[job.company]?.industry ?? job.category,
      location: job.location,
      description: `Các vị trí tuyển dụng hiện có tại ${job.company}.`,
      size: 'Chưa cập nhật',
      email: '',
      phone: '',
      website: '',
      logo: createLogo(job.company, companyDetails[job.company]?.tone ?? '#64748b'),
      cover: '',
      isVerified: false,
      postedAt: 'Đang tuyển',
      jobs: [],
    }

    company.jobs.push({
      ...job,
      major: job.category,
      skills: job.requirements,
      appJobId: job.id,
    })
    companies[job.company] = company
    return companies
  }, {}),
)

export function getCompanyById(id) {
  return mockCompanies.find((company) => company.id === id)
}
