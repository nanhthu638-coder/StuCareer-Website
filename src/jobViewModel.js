function parseJobList(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('Dữ liệu yêu cầu hoặc quyền lợi của tin tuyển dụng không hợp lệ.')
  }
  return parsed
}

export function toJobViewModel(job) {
  const salaryMinValue = job.salary_min ?? job.salaryMin
  const salaryMaxValue = job.salary_max ?? job.salaryMax
  const salaryMin = salaryMinValue == null ? null : Number(salaryMinValue)
  const salaryMax = salaryMaxValue == null ? null : Number(salaryMaxValue)
  const createdAt = job.created_at ?? job.createdAt

  return {
    ...job,
    id: Number(job.id),
    salaryMin: salaryMin ?? 0,
    salaryMax: salaryMax ?? 0,
    salary: salaryMin === null || salaryMax === null
      ? 'Thỏa thuận'
      : `${salaryMin} – ${salaryMax} triệu / tháng`,
    posted: createdAt ? `Đăng ngày ${new Date(`${createdAt.replace(' ', 'T')}Z`).toLocaleDateString('vi-VN')}` : 'Mới đăng',
    slots: Number(job.slots),
    description: job.description ?? '',
    requirements: parseJobList(job.requirements),
    benefits: parseJobList(job.benefits),
  }
}
