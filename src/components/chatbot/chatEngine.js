import { chatKB } from './mockData.js'
import { jobs } from '../../jobsData.js'
import { mockCompanies } from '../../data/mockCompanies.js'

const stopWords = new Set([
  'a', 'ban', 'bi', 'biet', 'cac', 'cho', 'co', 'cua', 'da', 'de', 'di', 'duoc', 'gi', 'hay',
  'khong', 'kip', 'la', 'lam', 'minh', 'mot', 'muon', 'nao', 'nen', 'nhu', 'nhung', 'oi', 'ra',
  'sao', 'the', 'thi', 'toi', 'va', 've', 'voi', 'xin',
])

const industries = [
  { id: 'it', aliases: ['cong nghe thong tin', 'lap trinh', 'developer', 'cntt', 'it'] },
  { id: 'marketing', aliases: ['marketing', 'truyen thong', 'content'] },
  { id: 'design', aliases: ['thiet ke', 'do hoa', 'designer', 'design', 'ui ux'] },
  { id: 'business', aliases: ['kinh doanh', 'business', 'sales', 'ban hang'] },
  { id: 'accounting', aliases: ['ke toan', 'accounting'] },
]

const locations = [
  { id: 'ho chi minh', aliases: ['thanh pho ho chi minh', 'tp ho chi minh', 'ho chi minh', 'sai gon', 'tphcm', 'hcm'] },
  { id: 'ha noi', aliases: ['ha noi', 'hanoi'] },
  { id: 'da nang', aliases: ['da nang', 'danang'] },
  { id: 'remote', aliases: ['lam viec tu xa', 'tu xa', 'remote', 'online', 'o nha'] },
  { id: 'can tho', aliases: ['can tho'] },
  { id: 'hai phong', aliases: ['hai phong'] },
  { id: 'hue', aliases: ['hue'] },
  { id: 'binh duong', aliases: ['binh duong'] },
  { id: 'dong nai', aliases: ['dong nai'] },
]

const searchWords = new Set([
  ...stopWords, 'con', 'o', 'tai', 'tim', 'kiem', 'goi', 'y', 'liet', 'ke', 'xem',
  'danh', 'sach', 'viec', 'cong', 'ty', 'doanh', 'nghiep', 'tuyen', 'dung',
  'ung', 'tuyen', 'vi', 'tri', 'intern', 'thuc', 'tap', 'viec', 'luong', 'thu',
  'nhap', 'tro', 'cap', 'muc', 'trieu', 'tr', 'tu', 'tren', 'duoi', 'den', 'toi',
  'khoang', 'it', 'marketing', 'design', 'business', 'accounting', 'nao', 'nhe',
  'cach', 'stuwork', 'nguoi', 'moi', 'giup', 'toi', 'thong', 'tin', 'gioi', 'thieu',
])

function normalize(value) {
  return String(value ?? '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/(\d)\.(?=\d{3}(?:\D|$))/g, '$1')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1 den ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `)
}

function distanceAtMostOne(a, b) {
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
    } else {
      edits += 1
      if (edits > 1) return false
      if (a.length >= b.length) i += 1
      if (b.length >= a.length) j += 1
    }
  }
  return edits + Number(i < a.length || j < b.length) <= 1
}

function meaningfulTokens(text) {
  return [...new Set(text.split(' ').filter((token) => token && !stopWords.has(token)))]
}

function tokenScore(inputTokens, sample) {
  const sampleTokens = meaningfulTokens(normalize(sample))
  return inputTokens.reduce((score, token) => {
    if (sampleTokens.includes(token)) return score + 1
    return score + (sampleTokens.some((candidate) => distanceAtMostOne(token, candidate)) ? 0.45 : 0)
  }, 0)
}

function scoreIntent(text, inputTokens, intent) {
  const keywordScore = intent.keywords.reduce((best, keyword) => {
    const phrase = normalize(keyword)
    if (hasPhrase(text, phrase)) return Math.max(best, 5 + phrase.split(' ').length)
    const words = phrase.split(' ')
    if (words.length === 1 && inputTokens.some((token) => distanceAtMostOne(token, phrase))) {
      return Math.max(best, 2.5)
    }
    return best
  }, 0)
  const sampleScore = Math.max(...intent.samples.map((sample) => (
    tokenScore(inputTokens, sample) + (normalize(sample) === text ? 10 : 0)
  )))
  return keywordScore + sampleScore
}

function findAlias(text, choices) {
  const matches = choices.flatMap((choice) => choice.aliases
    .filter((alias) => hasPhrase(text, alias))
    .map((alias) => ({ id: choice.id, alias })))
  if (matches.length) return matches.sort((a, b) => b.alias.length - a.alias.length)[0]
  for (const choice of choices) {
    for (const alias of choice.aliases) {
      if (alias.includes(' ')) continue
      const token = text.split(' ').find((word) => distanceAtMostOne(word, alias))
      if (token) return { id: choice.id, alias: token }
    }
  }
  return null
}

function extractSalary(text) {
  const pattern = /\b(?:(luong|thu nhap|tro cap)\s*)?(?:(tu|tren|hon|duoi|toi thieu|toi da|it nhat|khong qua|khoang)\s*)?(\d+(?:\.\d+)?)(?:\s*(trieu|tr|dong|vnd|nghin|ngan|k))?(?:\s+(den|toi)\s+(\d+(?:\.\d+)?)(?:\s*(trieu|tr|dong|vnd|nghin|ngan|k))?)?\b/g
  for (const match of text.matchAll(pattern)) {
    const [, prefix, qualifier, first, unit, , second, secondUnit] = match
    if (!prefix && !unit && !secondUnit) continue
    const toMillions = (number, currency) => {
      const value = Number(number)
      if (currency === 'dong' || currency === 'vnd' || (!currency && value >= 100000)) return value / 1000000
      if (['nghin', 'ngan', 'k'].includes(currency)) return value / 1000
      return value
    }
    const value = toMillions(first, unit ?? secondUnit)
    const end = second == null ? null : toMillions(second, secondUnit ?? unit)
    if (end !== null) return { min: Math.min(value, end), max: Math.max(value, end), matched: match[0] }
    if (['tren', 'hon', 'toi thieu', 'it nhat', 'tu'].includes(qualifier)) {
      return { min: value, minExclusive: ['tren', 'hon'].includes(qualifier), matched: match[0] }
    }
    if (['duoi', 'toi da', 'khong qua'].includes(qualifier)) {
      return { max: value, maxExclusive: qualifier === 'duoi', matched: match[0] }
    }
    return { min: value, max: value, matched: match[0] }
  }
  return null
}

function extractSlots(text) {
  const industry = findAlias(text, industries)
  let location = findAlias(text, locations)
  if (!location) {
    const match = text.match(/\b(?:o|tai)\s+([a-z]+(?:\s+[a-z]+){0,4})/)
    if (match) {
      const words = match[1].split(' ')
      const end = words.findIndex((word) => [
        'luong', 'thu', 'tro', 'voi', 'cho', 'nganh', 'thi', 'nhe', 'sao', 'dang', 'tuyen',
      ].includes(word))
      const alias = words.slice(0, end < 0 ? undefined : end).join(' ')
      if (alias && !['dau', 'day', 'do', 'cong', 'doanh'].includes(words[0])) {
        location = { id: alias, alias }
      }
    }
  }
  const salary = extractSalary(text)
  return {
    slots: {
      ...(industry && { industry: industry.id }),
      ...(location && { location: location.id }),
      ...(salary && {
        salary: {
          min: salary.min ?? null,
          max: salary.max ?? null,
          ...(salary.minExclusive && { minExclusive: true }),
          ...(salary.maxExclusive && { maxExclusive: true }),
        },
      }),
    },
    matched: [industry?.alias, location?.alias, salary?.matched].filter(Boolean),
  }
}

function removeMatched(text, matched) {
  let remaining = ` ${text} `
  for (const phrase of matched) remaining = remaining.replace(` ${phrase} `, ' ')
  return remaining.trim().replace(/\s+/g, ' ')
}

function isContinuation(text, matched) {
  const remaining = removeMatched(text, matched)
  return remaining.split(' ').every((word) => !word || [
    'con', 'o', 'tai', 'thi', 'sao', 'the', 'nao', 'nhe', 'vay', 'luong',
    'muc', 'thu', 'nhap', 'tro', 'cap', 'nganh', 'cong', 'ty', 'viec', 'lam',
  ].includes(word))
}

function matchesIndustry(value, industry) {
  if (!industry) return true
  const normalized = normalize(value)
  return industries.find((item) => item.id === industry).aliases.some((alias) => hasPhrase(normalized, alias))
}

function matchesLocation(value, location) {
  if (!location) return true
  const normalized = normalize(value)
  const known = locations.find((item) => item.id === location)
  return known ? known.aliases.some((alias) => hasPhrase(normalized, alias)) : hasPhrase(normalized, location)
}

function matchesJob(job, slots, terms) {
  if (!matchesIndustry(`${job.category} ${job.title}`, slots.industry)) return false
  if (!matchesLocation(job.location, slots.location)) return false
  if (slots.salary) {
    const min = Number(job.salaryMin)
    const max = Number(job.salaryMax)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return false
    if (slots.salary.min !== null && max < slots.salary.min) return false
    if (slots.salary.max !== null && min > slots.salary.max) return false
    if (slots.salary.minExclusive && max === slots.salary.min) return false
    if (slots.salary.maxExclusive && min === slots.salary.max) return false
  }
  const details = normalize([job.title, job.company, job.category, job.description, ...(job.requirements ?? [])].join(' '))
  return terms.every((term) => details.includes(term === 'reactjs' ? 'react' : term))
}

function searchResults(kind, slots, terms) {
  if (kind === 'companies') {
    return mockCompanies.filter((company) => {
      if (!matchesLocation(company.location, slots.location)) return false
      if (slots.salary || slots.industry || terms.length) {
        return company.jobs.some((job) => matchesJob(job, slots, terms))
          || (!slots.salary && terms.length === 0 && matchesIndustry(company.industry, slots.industry))
      }
      return true
    }).slice(0, 3).map((company) => `${company.name} — ${company.industry} — ${company.location}`)
  }
  return jobs.filter((job) => matchesJob(job, slots, terms)).slice(0, 3)
    .map((job) => `${job.title} — ${job.company} — ${job.location} — ${job.salary}`)
}

function pickAnswer(intent, lastAnswer) {
  const candidates = intent.answers.filter((answer) => answer !== lastAnswer)
  const choices = candidates.length ? candidates : intent.answers
  return choices[Math.floor(Math.random() * choices.length)]
}

function quickReplies(items) {
  return items.map((item) => ({ label: item, message: item }))
}

// Context được trả lại cùng kết quả để mỗi cửa sổ trò chuyện giữ trạng thái riêng.
export function getReply(input, context = {}) {
  const text = normalize(input)
  const inputTokens = meaningfulTokens(text)
  const extracted = extractSlots(text)
  const ranked = chatKB.map((intent, index) => ({
    intent, index, score: scoreIntent(text, inputTokens, intent),
  })).sort((a, b) => b.score - a.score || a.index - b.index)
  const continuation = Boolean(context.intent && isContinuation(text, extracted.matched))
  const exactSample = ranked[0]?.intent.samples.some((sample) => normalize(sample) === text)
  const askingHow = /\b(cach|lam sao|the nao|o dau)\b/.test(text)
  const namedCompany = mockCompanies.some((company) => {
    const name = normalize(company.name)
    return text === name || (text.length >= 3 && text === name.split(' ')[0])
  })
  const companyQuery = namedCompany || (/\b(cong ty|doanh nghiep)\b/.test(text) && /\b(thong tin|gioi thieu)\b/.test(text))
  const isSearch = !exactSample && !(askingHow && !Object.keys(extracted.slots).length)
    && (companyQuery || (/\b(tim|goi y|liet ke|danh sach|xem)\b/.test(text)
    && /\b(viec|cong ty|doanh nghiep|tuyen dung|intern|thuc tap)\b/.test(text)))
  let intent = continuation
    ? chatKB.find((item) => item.id === context.intent)
    : isSearch ? chatKB.find((item) => item.id === 'job-search') : ranked[0]?.intent
  if (continuation && extracted.slots.industry && (context.pendingFamily || /^(salary|skills)-/.test(intent?.id ?? ''))) {
    const family = context.pendingFamily ?? intent.id.split('-')[0]
    intent = chatKB.find((item) => item.id === `${family}-${extracted.slots.industry}`) ?? intent
  }

  if (!continuation && /\b(luong|tro cap)\b/.test(text) && /\b(intern|thuc tap)\b/.test(text)
    && !extracted.slots.industry && !isSearch && ranked[0].score < 5) {
    const questions = ['Lương intern IT thế nào?', 'Lương intern Marketing thế nào?', 'Lương intern Thiết kế thế nào?']
    return {
      text: 'Mình có thể chia sẻ về mức hỗ trợ thực tập theo ngành. Bạn quan tâm ngành nào nhé?',
      emotion: 'happy',
      quickReplies: quickReplies(questions),
      context: { intent: 'interview-salary', slots: {}, searchKind: null, pendingFamily: 'salary', lastAnswer: null },
    }
  }

  const genericInterview = !continuation && /\bphong van\b/.test(text)
    && meaningfulTokens(text).every((token) => ['phong', 'van'].includes(token))
  if (genericInterview) {
    intent = chatKB.find((item) => item.id === 'interview-questions')
  }

  if (!text || (!continuation && !isSearch && !genericInterview && ranked[0].score < 2.5) || !intent) {
    const suggestions = ranked.flatMap(({ intent: candidate, index, score }) => {
      const sampleScores = candidate.samples.map((sample) => tokenScore(inputTokens, sample))
      const keywordScore = score - Math.max(...sampleScores)
      return candidate.samples.map((sample, sampleIndex) => ({
        sample, index, sampleIndex, score: keywordScore + sampleScores[sampleIndex],
      }))
    }).sort((a, b) => b.score - a.score || a.index - b.index || a.sampleIndex - b.sampleIndex)
      .slice(0, 3).map(({ sample }) => sample)
    return {
      text: `Mình chưa hiểu rõ, bạn thử hỏi:\n${suggestions.map((sample) => `• ${sample}`).join('\n')}`,
      emotion: 'confused',
      quickReplies: quickReplies(suggestions),
      context,
    }
  }

  const slots = continuation ? { ...context.slots, ...extracted.slots } : extracted.slots
  const kind = continuation ? context.searchKind : (
    isSearch ? (companyQuery || /\b(cong ty|doanh nghiep)\b/.test(text) ? 'companies' : 'jobs') : null
  )
  if (kind) {
    const terms = continuation ? (context.searchTerms ?? []) : removeMatched(text, extracted.matched)
      .split(' ').filter((word) => word && !searchWords.has(word) && !/^\d/.test(word))
    const results = searchResults(kind, slots, terms)
    return {
      text: results.length
        ? `Mình tìm thấy các ${kind === 'companies' ? 'công ty' : 'việc'} phù hợp trên StuWork:\n${results.map((result) => `• ${result}`).join('\n')}`
        : 'Hiện StuWork chưa có việc phù hợp, bạn thử đổi ngành hoặc địa điểm nhé',
      emotion: 'happy',
      quickReplies: quickReplies(intent.followUps),
      context: { intent: intent.id, slots, searchKind: kind, searchTerms: terms, lastAnswer: null },
    }
  }

  const answer = pickAnswer(intent, context.lastAnswer)
  return {
    text: answer,
    emotion: 'happy',
    quickReplies: quickReplies(intent.followUps),
    context: { intent: intent.id, slots, searchKind: null, searchTerms: [], lastAnswer: answer },
  }
}
