import bcrypt from 'bcryptjs'
import { mockCompanies, toSlug } from '../src/data/mockCompanies.js'
import { all, get, initializeDatabase, run, withTransaction } from './database.js'

const password = process.env.DEMO_PASSWORD
if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('Cần đặt DEMO_PASSWORD dài từ 8 đến 72 byte (trong .env.demo) trước khi tạo tài khoản công ty.')
}

// Mỗi công ty trong danh mục tin mẫu có một tài khoản nhà tuyển dụng riêng; tên công ty phải trùng với tên ở tin tuyển dụng.
const accounts = mockCompanies.map((company, index) => ({
  email: `${toSlug(company.name)}@stucareer.test`,
  phone: `09000008${String(index + 1).padStart(2, '0')}`,
  name: `Nhà tuyển dụng ${company.name}`,
  company: {
    name: company.name,
    industry: String(company.industry ?? '').slice(0, 80),
    size: company.size && company.size !== 'Chưa cập nhật' ? company.size.slice(0, 40) : '',
    address: String(company.location ?? '').slice(0, 200),
    website: company.website ?? '',
    description: String(company.description ?? '').slice(0, 1000),
  },
}))

await initializeDatabase()
const passwordHash = await bcrypt.hash(password, 12)

const summary = await withTransaction(async (transaction) => {
  const existingCompanies = await all('SELECT user_id, name FROM companies', [], transaction)
  const results = []
  for (const account of accounts) {
    const existingUser = await get('SELECT id, role FROM users WHERE email = ?', [account.email], transaction)
    if (existingUser && existingUser.role !== 'employer') {
      results.push({ email: account.email, status: 'bỏ qua: email đang thuộc tài khoản không phải nhà tuyển dụng' })
      continue
    }
    const nameKey = account.company.name.trim().toLocaleLowerCase('vi')
    const ownedElsewhere = existingCompanies.find((company) => company.name.trim().toLocaleLowerCase('vi') === nameKey
      && company.user_id !== existingUser?.id)
    if (ownedElsewhere) {
      results.push({ email: account.email, status: 'bỏ qua: công ty đã thuộc tài khoản khác' })
      continue
    }

    let userId = existingUser?.id
    if (!userId) {
      const phoneOwner = await get('SELECT id FROM users WHERE phone = ?', [account.phone], transaction)
      if (phoneOwner) {
        results.push({ email: account.email, status: `bỏ qua: số điện thoại ${account.phone} đã được dùng` })
        continue
      }
      await run(
        "INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'employer')",
        [account.name, account.email, account.phone, passwordHash],
        transaction,
      )
      userId = (await get('SELECT id FROM users WHERE email = ?', [account.email], transaction)).id
    }

    const { name, industry, size, address, website, description } = account.company
    const hasCompany = await get('SELECT user_id FROM companies WHERE user_id = ?', [userId], transaction)
    if (hasCompany) {
      await run(`
        UPDATE companies
        SET name = ?, industry = ?, size = ?, address = ?, website = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [name, industry, size, address, website, description, userId], transaction)
    } else {
      await run(`
        INSERT INTO companies (user_id, name, industry, size, address, website, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, name, industry, size, address, website, description], transaction)
    }
    results.push({ email: account.email, status: existingUser ? 'đã có, cập nhật thông tin công ty' : 'đã tạo' })
  }
  return results
}, { immediate: true })

console.table(summary.map((item, index) => ({ công_ty: accounts[index].company.name, email: item.email, kết_quả: item.status })))
console.log('Tất cả tài khoản dùng chung mật khẩu DEMO_PASSWORD.')
process.exit(0)
