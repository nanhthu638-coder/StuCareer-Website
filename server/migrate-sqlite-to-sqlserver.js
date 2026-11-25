import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import sql from 'mssql'
import { createSqlServerPool, ensureSqlServerSchema } from './database.js'

const directory = dirname(fileURLToPath(import.meta.url))
const sourcePath = resolve(process.env.SQLITE_SOURCE || process.env.DATABASE_PATH || resolve(directory, 'data', 'stuwork.sqlite'))
const tables = [
  {
    name: 'users',
    columns: [
      'id', 'name', 'email', 'phone', 'password_hash', 'role', 'created_at',
      'university', 'major', 'graduation_year', 'bio', 'skills', 'cv_path',
      'cv_original_name', 'cv_uploaded_at',
    ],
  },
  {
    name: 'contact_requests',
    columns: [
      'id', 'name', 'email', 'subject', 'message', 'status', 'assigned_role', 'created_at', 'updated_at',
      'user_id', 'resolution_note', 'resolved_at', 'user_seen',
    ],
  },
  {
    name: 'jobs',
    columns: [
      'id', 'title', 'company', 'location', 'salary_min', 'salary_max', 'type', 'category',
      'tone', 'logo', 'description', 'requirements', 'benefits', 'slots', 'deadline',
      'created_at', 'status', 'review_note', 'reviewed_at',
    ],
  },
  {
    name: 'companies',
    columns: ['id', 'user_id', 'name', 'industry', 'size', 'address', 'website', 'description', 'updated_at'],
  },
  {
    name: 'applications',
    columns: [
      'id', 'user_id', 'job_id', 'cover_letter', 'cv_path', 'cv_original_name',
      'status', 'decision_status', 'employer_seen', 'created_at',
    ],
  },
  {
    name: 'bookmarks',
    columns: ['id', 'user_id', 'job_id', 'created_at'],
  },
  {
    name: 'email_outbox',
    columns: ['id', 'to_email', 'subject', 'body', 'status', 'error', 'created_at'],
  },
]

function getSourceTable(source, table) {
  const exists = source.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table.name)
  if (!exists) return { columns: [], rows: [] }
  const sourceColumns = new Set(source.pragma(`table_info("${table.name}")`).map((column) => column.name))
  const columns = table.columns.filter((column) => sourceColumns.has(column))
  return {
    columns,
    rows: source.prepare(`SELECT * FROM "${table.name}" ORDER BY id`).all(),
  }
}

async function countRows(pool, tableName) {
  const result = await pool.request().query(`SELECT COUNT_BIG(*) AS row_count FROM dbo.${tableName}`)
  return Number(result.recordset[0].row_count)
}

// IDENTITY_INSERT chỉ có hiệu lực trong phạm vi session/batch đang chạy, nên ON, INSERT và OFF
// phải nằm trong cùng một batch (một request) thì lệnh INSERT mới thấy được trạng thái ON.
async function insertRows(transaction, table, sourceTable) {
  const { columns, rows } = sourceTable
  if (rows.length === 0) return
  const columnList = columns.map((column) => `[${column}]`).join(', ')
  for (const row of rows) {
    const request = new sql.Request(transaction)
    const placeholders = columns.map((column, index) => {
      request.input(`p${index}`, column === 'role' && row[column] === 'student' ? 'seeker' : (row[column] ?? null))
      return `@p${index}`
    })
    await request.query(`
      SET IDENTITY_INSERT dbo.${table.name} ON;
      INSERT INTO dbo.${table.name} (${columnList})
      VALUES (${placeholders.join(', ')});
      SET IDENTITY_INSERT dbo.${table.name} OFF;
    `)
  }
}

async function migrate() {
  if (!existsSync(sourcePath)) throw new Error(`Không tìm thấy SQLite nguồn: ${sourcePath}`)
  const source = new Database(sourcePath, { readonly: true, fileMustExist: true })
  const pool = await createSqlServerPool()
  try {
    await ensureSqlServerSchema(pool)
    const existingCounts = await Promise.all(tables.map(async (table) => ({
      name: table.name,
      count: await countRows(pool, table.name),
    })))
    const occupied = existingCounts.filter((table) => table.count > 0)
    if (occupied.length > 0) {
      throw new Error(`Database đích phải trống trước khi migrate. Bảng đã có dữ liệu: ${occupied.map((table) => table.name).join(', ')}`)
    }

    const sourceRows = new Map(tables.map((table) => [table.name, getSourceTable(source, table)]))
    const transaction = new sql.Transaction(pool)
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)
    try {
      for (const table of tables) await insertRows(transaction, table, sourceRows.get(table.name))
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    const summary = Object.fromEntries([...sourceRows].map(([table, sourceTable]) => [table, sourceTable.rows.length]))
    console.log(`Đã migrate dữ liệu SQLite sang SQL Server: ${JSON.stringify(summary)}`)
    console.log('Các file CV vẫn nằm trong thư mục server/data/cvs; hãy giữ hoặc chuyển thư mục này cùng ứng dụng.')
  } finally {
    source.close()
    await pool.close()
  }
}

migrate().catch((error) => {
  console.error(`SQLite → SQL Server thất bại: ${error.message}`)
  process.exitCode = 1
})
