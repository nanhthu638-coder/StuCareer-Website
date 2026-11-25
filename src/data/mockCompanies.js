import { jobs } from '../jobsData.js'

const companyProfiles = {
  Momo: { industry: 'Công nghệ tài chính', tone: '#a855f7' },
  Shopee: {
    industry: 'Thương mại điện tử',
    tone: '#f97316',
    location: 'TP. Hồ Chí Minh, Việt Nam',
    isVerified: true,
    size: '1.000+ nhân viên',
    email: 'vn-careers@shopee.com',
    phone: '028 7300 1221',
    website: 'https://careers.shopee.vn',
    logo: 'https://placehold.co/120x120/fff1e8/ee4d2d?text=S',
    cover: 'https://placehold.co/1440x380/ee4d2d/ffffff?text=Shopee',
    postedAt: 'Vừa xong',
    description: 'Shopee là nền tảng thương mại điện tử kết nối người mua và người bán trong khu vực. Đội ngũ hướng tới trải nghiệm mua sắm thuận tiện, đồng thời tạo môi trường làm việc nhanh, nhiều cơ hội học hỏi cho người trẻ.',
  },
  'VNG Corporation': {
    industry: 'Công nghệ & Giải trí',
    tone: '#2563eb',
    location: 'TP. Hồ Chí Minh, Việt Nam',
    isVerified: false,
    size: '3.000+ nhân viên',
    email: 'talent@vng.com.vn',
    phone: '028 3962 3888',
    website: 'https://www.vng.com.vn',
    logo: 'https://placehold.co/120x120/eaf8f5/168a72?text=VNG',
    cover: 'https://placehold.co/1440x380/176d68/ffffff?text=VNG',
    postedAt: '1 giờ trước',
    description: 'VNG xây dựng các sản phẩm công nghệ phục vụ đời sống số, giải trí và kết nối cộng đồng. Sinh viên có thể làm việc với các nhóm sản phẩm đa lĩnh vực và được khuyến khích thử nghiệm ý tưởng mới.',
  },
  'FPT Software': {
    industry: 'Công nghệ thông tin',
    tone: '#ea580c',
    location: 'Hà Nội, Việt Nam',
    isVerified: true,
    size: '30.000+ nhân viên',
    email: 'careers@fpt.com',
    phone: '024 7300 7300',
    website: 'https://fptsoftware.com',
    logo: 'https://placehold.co/120x120/ebf5ff/1769aa?text=FPT',
    cover: 'https://placehold.co/1440x380/124e66/ffffff?text=FPT+Software',
    postedAt: '15 phút trước',
    description: 'FPT Software phát triển các giải pháp công nghệ và dịch vụ chuyển đổi số cho khách hàng trên toàn cầu. Sinh viên có cơ hội tham gia dự án thực tế, học hỏi cùng các kỹ sư giàu kinh nghiệm và phát triển năng lực chuyên môn.',
  },
  Tiki: { industry: 'Thương mại điện tử', tone: '#0284c7' },
  'StuTech Solutions': { industry: 'Công nghệ thông tin', tone: '#0f766e' },
  'Sao Mai Studio': { industry: 'Thiết kế sáng tạo', tone: '#7c3aed' },
  'Cà Phê Việt': { industry: 'Thực phẩm và đồ uống', tone: '#15803d' },
}

export function toSlug(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function createLogo(name, color) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${color}"/><text x="48" y="58" fill="white" font-family="Arial,sans-serif" font-size="32" font-weight="700" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const mockCompanies = Object.values(
  jobs.reduce((companies, job) => {
    const profile = companyProfiles[job.company] ?? {}
    const company = companies[job.company] ?? {
      id: toSlug(job.company),
      name: job.company,
      industry: profile.industry ?? job.category,
      location: profile.location ?? job.location,
      description: profile.description ?? `Các vị trí tuyển dụng hiện có tại ${job.company}.`,
      size: profile.size ?? 'Chưa cập nhật',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      website: profile.website ?? '',
      logo: profile.logo ?? createLogo(job.company, profile.tone ?? '#64748b'),
      cover: profile.cover ?? '',
      isVerified: profile.isVerified ?? false,
      postedAt: profile.postedAt ?? 'Đang tuyển',
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
