import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AsyncLocalStorage } from 'node:async_hooks'
import Database from 'better-sqlite3'
import sql from 'mssql'

const directory = dirname(fileURLToPath(import.meta.url))
const provider = (process.env.DB_PROVIDER || 'sqlite').toLowerCase()
let sqliteDatabase
let sqlPool
let sqliteTail = Promise.resolve()
const transactionContext = new AsyncLocalStorage()

async function withSqliteLock(callback) {
  let release
  const previous = sqliteTail
  sqliteTail = new Promise((resolveLock) => { release = resolveLock })
  await previous
  try {
    return await callback()
  } finally {
    release()
  }
}

function initializeSqlite() {
  const databasePath = process.env.DATABASE_PATH
    ? resolve(process.env.DATABASE_PATH)
    : resolve(directory, 'data', 'stuwork.sqlite')
  mkdirSync(dirname(databasePath), { recursive: true })
  sqliteDatabase = new Database(databasePath)
  sqliteDatabase.pragma('journal_mode = WAL')
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seeker',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!sqliteDatabase.pragma('table_info(users)').some((column) => column.name === 'role')) {
    sqliteDatabase.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'seeker'")
  }
  sqliteDatabase.exec("UPDATE users SET role = 'seeker' WHERE role = 'student'")
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
      assigned_role TEXT NOT NULL DEFAULT 'support',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      salary_min INTEGER,
      salary_max INTEGER,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'momo',
      logo TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        requirements TEXT NOT NULL DEFAULT '[]',
        benefits TEXT NOT NULL DEFAULT '[]',
        slots INTEGER NOT NULL DEFAULT 1,
        deadline TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
    for (const [column, definition] of [
        ['status', `TEXT NOT NULL DEFAULT 'pending'`],
        ['review_note', 'TEXT'],
        ['reviewed_at', 'TEXT'],
          ['description', `TEXT NOT NULL DEFAULT ''`],
          ['requirements', `TEXT NOT NULL DEFAULT '[]'`],
          ['benefits', `TEXT NOT NULL DEFAULT '[]'`],
          ['slots', 'INTEGER NOT NULL DEFAULT 1'],
          ['deadline', 'TEXT'],
    ]) {
        if (!sqliteDatabase.pragma('table_info(jobs)').some((item) => item.name === column)) {
            sqliteDatabase.exec(`ALTER TABLE jobs ADD COLUMN ${column} ${definition}`)
        }
    }
    sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS email_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'logged')),
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  for (const [column, definition] of [
    ['university', 'TEXT'],
    ['major', 'TEXT'],
    ['graduation_year', 'INTEGER'],
    ['bio', 'TEXT'],
    ['skills', 'TEXT'],
    ['cv_path', 'TEXT'],
    ['cv_original_name', 'TEXT'],
    ['cv_uploaded_at', 'TEXT'],
  ]) {
    if (!sqliteDatabase.pragma('table_info(users)').some((item) => item.name === column)) {
      sqliteDatabase.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`)
    }
  }
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      job_id INTEGER NOT NULL,
      cover_letter TEXT,
      cv_path TEXT NOT NULL,
      cv_original_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'withdrawn')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, job_id)
    )
  `)
  if (!sqliteDatabase.pragma('table_info(applications)').some((item) => item.name === 'decision_status')) {
    sqliteDatabase.exec("ALTER TABLE applications ADD COLUMN decision_status TEXT NOT NULL DEFAULT 'pending'")
  }
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      job_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, job_id)
    )
  `)
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      name TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function createSqlServerPool() {
  const user = process.env.SQL_USER
  const password = process.env.SQL_PASSWORD
  if (!user || !password) {
    throw new Error('Cần cấu hình SQL_USER và SQL_PASSWORD khi DB_PROVIDER=sqlserver.')
  }

  const config = {
    server: process.env.SQL_SERVER || 'localhost',
    database: process.env.SQL_DATABASE || 'StuCareer-Website',
    user,
    password,
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  }
  if (process.env.SQL_PORT) {
    config.port = Number(process.env.SQL_PORT)
  } else {
    config.options.instanceName = process.env.SQL_INSTANCE || 'SQLEXPRESS'
  }

  const pool = new sql.ConnectionPool(config)
  try {
    return await pool.connect()
  } catch (error) {
    await pool.close().catch(() => {})
    throw new Error(`Không thể kết nối SQL Server ${config.server}: ${error.message}`)
  }
}

export async function ensureSqlServerSchema(pool) {
  const statements = [
    `IF OBJECT_ID(N'dbo.users', N'U') IS NULL
     CREATE TABLE dbo.users (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(80) NOT NULL,
       email NVARCHAR(254) NOT NULL UNIQUE,
       phone NVARCHAR(30) NOT NULL UNIQUE,
       password_hash NVARCHAR(255) NOT NULL,
       role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT 'seeker',
       created_at DATETIME2 NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
       university NVARCHAR(120) NULL,
       major NVARCHAR(120) NULL,
       graduation_year INT NULL,
       bio NVARCHAR(1000) NULL,
       skills NVARCHAR(300) NULL,
       cv_path NVARCHAR(255) NULL,
       cv_original_name NVARCHAR(120) NULL,
       cv_uploaded_at DATETIME2 NULL
     )`,
    `IF COL_LENGTH(N'dbo.users', N'role') IS NULL
       ALTER TABLE dbo.users ADD role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role_migration DEFAULT 'seeker'`,
    ...[
      ['university', 'NVARCHAR(120) NULL'],
      ['major', 'NVARCHAR(120) NULL'],
      ['graduation_year', 'INT NULL'],
      ['bio', 'NVARCHAR(1000) NULL'],
      ['skills', 'NVARCHAR(300) NULL'],
      ['cv_path', 'NVARCHAR(255) NULL'],
      ['cv_original_name', 'NVARCHAR(120) NULL'],
      ['cv_uploaded_at', 'DATETIME2 NULL'],
    ].map(([column, definition]) => `IF COL_LENGTH(N'dbo.users', N'${column}') IS NULL ALTER TABLE dbo.users ADD ${column} ${definition}`),
    `UPDATE dbo.users SET role = 'seeker' WHERE role = 'student'`,
    `IF OBJECT_ID(N'dbo.contact_requests', N'U') IS NULL
     CREATE TABLE dbo.contact_requests (
       id INT IDENTITY(1,1) PRIMARY KEY,
       name NVARCHAR(80) NOT NULL,
       email NVARCHAR(254) NOT NULL,
       subject NVARCHAR(120) NOT NULL,
       message NVARCHAR(MAX) NOT NULL,
       status NVARCHAR(20) NOT NULL CONSTRAINT DF_contact_requests_status DEFAULT 'new',
       assigned_role NVARCHAR(20) NOT NULL CONSTRAINT DF_contact_requests_assigned_role DEFAULT 'support',
       created_at DATETIME2 NOT NULL CONSTRAINT DF_contact_requests_created_at DEFAULT SYSUTCDATETIME(),
       updated_at DATETIME2 NOT NULL CONSTRAINT DF_contact_requests_updated_at DEFAULT SYSUTCDATETIME()
     )`,
    `IF OBJECT_ID(N'dbo.jobs', N'U') IS NULL
     CREATE TABLE dbo.jobs (
       id INT IDENTITY(1,1) PRIMARY KEY,
       title NVARCHAR(200) NOT NULL,
       company NVARCHAR(200) NOT NULL,
       location NVARCHAR(200) NOT NULL,
       salary_min INT NULL,
       salary_max INT NULL,
       type NVARCHAR(100) NOT NULL,
       category NVARCHAR(100) NOT NULL,
       tone NVARCHAR(50) NOT NULL CONSTRAINT DF_jobs_tone DEFAULT 'momo',
       logo NVARCHAR(50) NOT NULL CONSTRAINT DF_jobs_logo DEFAULT '',
       description NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_description DEFAULT '',
       requirements NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_requirements DEFAULT '[]',
       benefits NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_benefits DEFAULT '[]',
       slots INT NOT NULL CONSTRAINT DF_jobs_slots DEFAULT 1,
       deadline NVARCHAR(20) NULL,
       created_at DATETIME2 NOT NULL CONSTRAINT DF_jobs_created_at DEFAULT SYSUTCDATETIME()
     )`, [
          ['status', `NVARCHAR(20) NOT NULL CONSTRAINT DF_jobs_status DEFAULT 'pending'`],
          ['review_note', 'NVARCHAR(500) NULL'],
          ['reviewed_at', 'DATETIME2 NULL'],
          ['description', `NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_description_migration DEFAULT ''`],
          ['requirements', `NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_requirements_migration DEFAULT '[]'`],
          ['benefits', `NVARCHAR(MAX) NOT NULL CONSTRAINT DF_jobs_benefits_migration DEFAULT '[]'`],
          ['slots', 'INT NOT NULL CONSTRAINT DF_jobs_slots_migration DEFAULT 1'],
          ['deadline', 'NVARCHAR(20) NULL'],
      ].map(([column, definition]) => `IF COL_LENGTH(N'dbo.jobs', N'${column}') IS NULL ALTER TABLE dbo.jobs ADD ${column} ${definition}`),
      `IF OBJECT_ID(N'dbo.email_outbox', N'U') IS NULL
     CREATE TABLE dbo.email_outbox (
       id INT IDENTITY(1,1) PRIMARY KEY,
       to_email NVARCHAR(254) NOT NULL,
       subject NVARCHAR(200) NOT NULL,
       body NVARCHAR(MAX) NOT NULL,
       status NVARCHAR(20) NOT NULL,
       error NVARCHAR(500) NULL,
       created_at DATETIME2 NOT NULL CONSTRAINT DF_email_outbox_created_at DEFAULT SYSUTCDATETIME()
     )`,
    `IF OBJECT_ID(N'dbo.applications', N'U') IS NULL
     CREATE TABLE dbo.applications (
       id INT IDENTITY(1,1) PRIMARY KEY,
       user_id INT NOT NULL,
       job_id INT NOT NULL,
       cover_letter NVARCHAR(2000) NULL,
       cv_path NVARCHAR(255) NOT NULL,
       cv_original_name NVARCHAR(120) NOT NULL,
       status NVARCHAR(20) NOT NULL CONSTRAINT DF_applications_status DEFAULT 'submitted',
       created_at DATETIME2 NOT NULL CONSTRAINT DF_applications_created_at DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_applications_user_job UNIQUE (user_id, job_id),
       CONSTRAINT FK_applications_users FOREIGN KEY (user_id) REFERENCES dbo.users(id)
     )`,
    `IF COL_LENGTH(N'dbo.applications', N'decision_status') IS NULL
       ALTER TABLE dbo.applications ADD decision_status NVARCHAR(20) NOT NULL CONSTRAINT DF_applications_decision_status DEFAULT 'pending'`,
    `IF OBJECT_ID(N'dbo.bookmarks', N'U') IS NULL
     CREATE TABLE dbo.bookmarks (
       id INT IDENTITY(1,1) PRIMARY KEY,
       user_id INT NOT NULL,
       job_id INT NOT NULL,
       created_at DATETIME2 NOT NULL CONSTRAINT DF_bookmarks_created_at DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_bookmarks_user_job UNIQUE (user_id, job_id),
       CONSTRAINT FK_bookmarks_users FOREIGN KEY (user_id) REFERENCES dbo.users(id)
     )`,
    `IF OBJECT_ID(N'dbo.companies', N'U') IS NULL
     CREATE TABLE dbo.companies (
       id INT IDENTITY(1,1) PRIMARY KEY,
       user_id INT NOT NULL UNIQUE,
       name NVARCHAR(100) NOT NULL,
       industry NVARCHAR(80) NOT NULL CONSTRAINT DF_companies_industry DEFAULT '',
       size NVARCHAR(40) NOT NULL CONSTRAINT DF_companies_size DEFAULT '',
       address NVARCHAR(200) NOT NULL CONSTRAINT DF_companies_address DEFAULT '',
       website NVARCHAR(254) NOT NULL CONSTRAINT DF_companies_website DEFAULT '',
       description NVARCHAR(1000) NOT NULL CONSTRAINT DF_companies_description DEFAULT '',
       updated_at DATETIME2 NOT NULL CONSTRAINT DF_companies_updated_at DEFAULT SYSUTCDATETIME(),
       CONSTRAINT FK_companies_users FOREIGN KEY (user_id) REFERENCES dbo.users(id)
     )`,
  ]

  for (const statement of statements) await pool.request().query(statement)
}

export async function initializeDatabase() {
  if (provider === 'sqlite') {
    initializeSqlite()
    return
  }
  if (provider !== 'sqlserver') {
    throw new Error(`DB_PROVIDER không được hỗ trợ: ${provider}. Chọn sqlite hoặc sqlserver.`)
  }
  sqlPool = await createSqlServerPool()
  await ensureSqlServerSchema(sqlPool)
}

function toSqlServerStatement(statement, parameters) {
  let index = 0
  const converted = statement
    .replace(/\bCURRENT_TIMESTAMP\b/g, 'SYSUTCDATETIME()')
    .replace(/\?/g, () => `@p${index++}`)
  if (index !== parameters.length) {
    throw new Error(`Số lượng tham số SQL không khớp: cần ${index}, nhận ${parameters.length}.`)
  }
  return converted
}

async function query(statement, parameters, transaction) {
  if (provider === 'sqlite') {
    const execute = () => sqliteDatabase.prepare(statement).all(...parameters)
    return transactionContext.getStore() ? execute() : withSqliteLock(execute)
  }

  const request = transaction ? new sql.Request(transaction) : sqlPool.request()
  const sqlStatement = toSqlServerStatement(statement, parameters)
  parameters.forEach((value, index) => request.input(`p${index}`, value))
  return request.query(sqlStatement)
}

export async function get(statement, parameters = [], transaction) {
  if (provider === 'sqlite') {
    const execute = () => sqliteDatabase.prepare(statement).get(...parameters)
    return transactionContext.getStore() ? execute() : withSqliteLock(execute)
  }
  const result = await query(statement, parameters, transaction)
  return normalizeRow(result.recordset[0])
}

export async function all(statement, parameters = [], transaction) {
  if (provider === 'sqlite') {
    const execute = () => sqliteDatabase.prepare(statement).all(...parameters)
    return transactionContext.getStore() ? execute() : withSqliteLock(execute)
  }
  const result = await query(statement, parameters, transaction)
  return result.recordset.map(normalizeRow)
}

export async function run(statement, parameters = [], transaction) {
  if (provider === 'sqlite') {
    const execute = () => sqliteDatabase.prepare(statement).run(...parameters)
    return transactionContext.getStore() ? execute() : withSqliteLock(execute)
  }
  const result = await query(statement, parameters, transaction)
  return { changes: result.rowsAffected.reduce((total, count) => total + count, 0) }
}

export async function withTransaction(callback, { immediate = false } = {}) {
  if (provider === 'sqlite') {
    return withSqliteLock(() => transactionContext.run(true, async () => {
      sqliteDatabase.exec(immediate ? 'BEGIN IMMEDIATE' : 'BEGIN')
      try {
        const result = await callback()
        sqliteDatabase.exec('COMMIT')
        return result
      } catch (error) {
        sqliteDatabase.exec('ROLLBACK')
        throw error
      }
    }))
  }

  const transaction = new sql.Transaction(sqlPool)
  await transaction.begin(immediate ? sql.ISOLATION_LEVEL.SERIALIZABLE : sql.ISOLATION_LEVEL.READ_COMMITTED)
  try {
    const result = await callback(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

function normalizeRow(row) {
  if (!row) return row
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value instanceof Date ? value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '') : value,
  ]))
}
