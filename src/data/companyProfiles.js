import { requestApiJson } from '../api.js'
import { createLogo, mockCompanies, toSlug } from './mockCompanies.js'

function companyKey(name) {
  return String(name || '').trim().toLocaleLowerCase('vi')
}

export async function loadCompanyProfiles() {
  const result = await requestApiJson('/api/companies')
  return Array.isArray(result.companies) ? result.companies : []
}

// Thông tin nhà tuyển dụng tự khai báo (database) được ưu tiên; hồ sơ mẫu chỉ bổ sung logo, ảnh bìa và liên hệ mà database chưa có.
export function buildCompanyProfiles(dbCompanies) {
  const profiles = new Map(mockCompanies.map((company) => [companyKey(company.name), { ...company, hasPage: true }]))
  for (const company of dbCompanies) {
    const key = companyKey(company.name)
    const base = profiles.get(key) ?? {
      id: toSlug(company.name) || key,
      logo: createLogo(company.name, '#26a9a0'),
      cover: '',
      email: '',
      phone: '',
      isVerified: false,
      postedAt: 'Đang tuyển',
    }
    profiles.set(key, {
      ...base,
      name: company.name,
      industry: company.industry || base.industry || 'Chưa cập nhật',
      location: company.address || base.location || 'Chưa cập nhật',
      size: company.size || base.size || 'Chưa cập nhật',
      website: company.website || base.website || '',
      description: company.description || base.description || `Các vị trí tuyển dụng hiện có tại ${company.name}.`,
      hasPage: true,
    })
  }
  return [...profiles.values()]
}
