import { jobs } from '../src/jobsData.js'
import { get, run, withTransaction } from './database.js'

export async function seedJobCatalog() {
  return withTransaction(async (transaction) => {
    let inserted = 0

    for (const job of jobs) {
      const existing = await get(
        'SELECT id FROM jobs WHERE title = ? AND company = ?',
        [job.title, job.company],
        transaction,
      )
      if (existing) continue

      await run(`
        INSERT INTO jobs (
          title, company, location, salary_min, salary_max, type, category,
          tone, logo, description, requirements, benefits, slots, deadline, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `, [
        job.title,
        job.company,
        job.location,
        job.salaryMin,
        job.salaryMax,
        job.type,
        job.category,
        job.tone,
        job.logo,
        job.description,
        JSON.stringify(job.requirements),
        JSON.stringify(job.benefits),
        job.slots,
        job.deadline,
      ], transaction)
      inserted += 1
    }

    return inserted
  }, { immediate: true })
}
