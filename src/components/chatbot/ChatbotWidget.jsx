import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUp,
  Bot,
  BrainCircuit,
  Check,
  CircleHelp,
  Paperclip,
  X,
} from 'lucide-react'
import CompanyCard from './CompanyCard.jsx'
import JobCard from './JobCard.jsx'
import { requestApiJson } from '../../api.js'
import { buildCompanies, isOpenJob, loadLiveData, newestOpenJob } from './liveJobs.js'
import { intents, synonymGroups, welcomeReplies } from './mockData.js'
import './ChatbotWidget.css'

const socialResponse = intents.social.response
const jobSearchStopWords = new Set([
  'tìm', 'việc', 'làm', 'tuyển', 'dụng', 'intern', 'job', 'công', 'cho', 'mình', 'tôi', 'muốn',
])
const jobSearchAliases = { reactjs: 'react' }

const welcomeMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Xin chào! Mình là Trợ lý AI của StuWork. Bạn đang cần hỗ trợ điều gì hôm nay?',
  quickReplies: welcomeReplies,
}

function normalizeInput(text) {
  let normalized = String(text || '')
    .toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const synonyms = synonymGroups.flatMap(({ canonical, aliases }) => (
    aliases
      .slice()
      .sort((left, right) => right.length - left.length)
      .map((alias) => ({ alias, canonical }))
  )).sort((left, right) => right.alias.length - left.alias.length)

  for (const { alias, canonical } of synonyms) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    normalized = normalized.replace(
      new RegExp(`(^|\\s)${escapedAlias}(?=\\s|$)`, 'g'),
      (_match, prefix) => `${prefix}${canonical}`,
    )
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function containsPhrase(text, phrase) {
  const normalizedPhrase = normalizeInput(phrase)
  return ` ${text} `.includes(` ${normalizedPhrase} `)
}

function rankJob(job, searchTerms, includeIntern) {
  const title = normalizeInput(job.title)
  const company = normalizeInput(job.company)
  const category = normalizeInput(job.category)
  const details = normalizeInput([
    job.description,
    ...(job.requirements || []),
    ...(job.benefits || []),
  ].join(' '))
  let score = 0

  for (const term of searchTerms) {
    if (title.includes(term)) score += 6
    else if (category.includes(term)) score += 4
    else if (company.includes(term)) score += 3
    else if (details.includes(term)) score += 1
  }

  if (includeIntern && title.includes('intern')) score += 3
  return score
}

// Chỉ gợi ý tin còn slot và còn hạn; nếu chỉ có tin đã hết chỗ thì báo riêng để người dùng không bấm vào tin không ứng tuyển được.
function findMatchingJob(normalizedText, jobs) {
  const terms = normalizedText
    .split(' ')
    .filter((term) => term && !jobSearchStopWords.has(term))
    .map((term) => jobSearchAliases[term] || term)
  if (terms.length === 0) return null

  const includeIntern = normalizedText.split(' ').includes('intern')
  const ranked = jobs
    .map((job, index) => ({ job, index, score: rankJob(job, terms, includeIntern) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
  const open = ranked.find((candidate) => isOpenJob(candidate.job))
  if (open) return { job: open.job }
  return ranked.length > 0 ? { unavailable: ranked[0].job } : null
}

function getBotResponse(text, jobs) {
  const normalized = normalizeInput(text)
  const hasCv = containsPhrase(normalized, 'cv')
  const hasInterview = containsPhrase(normalized, 'phỏng vấn')

  if (hasCv && hasInterview) {
    return {
      text: intents.multipleTopics.response,
      emotion: 'happy',
      quickReplies: intents.multipleTopics.quickReplies,
    }
  }

  const helpActionResponse = intents.help.actionResponses[normalized]
  if (helpActionResponse) return { text: helpActionResponse, emotion: 'happy' }

  if (intents.help.keywords.some((keyword) => containsPhrase(normalized, keyword))) {
    return {
      text: intents.help.response,
      emotion: 'happy',
      quickReplies: intents.help.quickReplies,
    }
  }

  const hasTopic = hasCv || hasInterview || containsPhrase(normalized, 'lương')
  if (!hasTopic && intents.social.keywords.some((keyword) => containsPhrase(normalized, keyword))) {
    return { text: socialResponse, emotion: 'happy' }
  }

  const hasExplicitJobIntent = intents.jobSearch.keywords.some((keyword) => containsPhrase(normalized, keyword))
  const hasInternPositionSearch = normalized.startsWith(`${intents.jobSearch.internPrefix} `)
    && !containsPhrase(normalized, 'lương')
  if (hasExplicitJobIntent || hasInternPositionSearch) {
    if (!jobs) {
      return {
        text: 'Mình chưa kết nối được dữ liệu việc làm lúc này. Bạn thử lại sau ít phút nhé.',
        emotion: 'confused',
        quickReplies: intents.jobSearch.quickReplies,
      }
    }
    const match = findMatchingJob(normalized, jobs)
    if (match?.job) return { job: match.job, emotion: 'happy' }
    if (match?.unavailable) {
      return {
        text: `Vị trí “${match.unavailable.title}” tại ${match.unavailable.company} hiện đã hết slot hoặc hết hạn nộp hồ sơ. Bạn thử vị trí khác nhé.`,
        emotion: 'happy',
        quickReplies: intents.jobSearch.quickReplies,
      }
    }

    const hasPositionTerms = normalized.split(' ').some((term) => !jobSearchStopWords.has(term))
    return {
      text: hasPositionTerms ? intents.jobSearch.noResults : intents.jobSearch.noPosition,
      emotion: 'happy',
      quickReplies: intents.jobSearch.quickReplies,
    }
  }

  if (hasCv) {
    const response = normalized.includes('mẫu cv it')
      ? intents.cv.templates.it
      : normalized.includes('mẫu cv marketing')
        ? intents.cv.templates.marketing
        : intents.cv.response
    return { text: response, emotion: 'happy', quickReplies: intents.cv.quickReplies }
  }

  if (hasInterview) {
    return { text: intents.interview.response, emotion: 'happy', quickReplies: intents.interview.quickReplies }
  }

  if (containsPhrase(normalized, 'lương')) {
    const response = normalized.includes('lương it')
      ? intents.salary.byField.it
      : normalized.includes('lương marketing')
        ? intents.salary.byField.marketing
        : intents.salary.response
    return { text: response, emotion: 'happy', quickReplies: intents.salary.quickReplies }
  }

  if (intents.greeting.keywords.some((keyword) => containsPhrase(normalized, keyword))) {
    return { text: intents.greeting.response, emotion: 'happy' }
  }

  return { text: intents.fallback.response, emotion: 'confused' }
}

function BotAvatar({ emotion, className = '' }) {
  const Icon = emotion === 'thinking' ? BrainCircuit : emotion === 'confused' ? CircleHelp : Bot

  return (
    <motion.span
      className={`chatbot-avatar chatbot-avatar-${emotion} ${className}`}
      animate={emotion === 'confused' ? { x: [0, -3, 3, -2, 2, 0] } : undefined}
      transition={{ duration: 0.4 }}
      aria-hidden="true"
    >
      <Icon size={18} strokeWidth={2.2} />
    </motion.span>
  )
}

function TypingIndicator() {
  return (
    <div className="chatbot-typing" role="status" aria-label="Trợ lý đang soạn tin nhắn">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.65, repeat: Infinity, delay: dot * 0.14 }}
        />
      ))}
    </div>
  )
}

function ChatbotWidget({ accessToken, onViewCompany = () => {}, onApplyJob = () => {} }) {
  const shouldReduceMotion = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([welcomeMessage])
  const [botEmotion, setBotEmotion] = useState('happy')
  const [isThinking, setIsThinking] = useState(false)
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [interactionVersion, setInteractionVersion] = useState(0)
  const [notificationSent, setNotificationSent] = useState(false)
  const messageListRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const replyTimerRef = useRef(null)
  const liveJobsRef = useRef(null)

  const addMessage = (message) => {
    setMessages((current) => [...current, { ...message, id: `chat-${crypto.randomUUID()}` }])
  }

  const recordInteraction = () => setInteractionVersion((version) => version + 1)

  useEffect(() => {
    const messageList = messageListRef.current
    if (messageList) messageList.scrollTo({ top: messageList.scrollHeight, behavior: shouldReduceMotion ? 'instant' : 'smooth' })
  }, [isThinking, messages, shouldReduceMotion])

  useEffect(() => () => window.clearTimeout(replyTimerRef.current), [])

  useEffect(() => {
    if (!isOpen || !interactionVersion || notificationSent) return undefined

    let cancelled = false
    const idleTimer = window.setTimeout(() => {
      loadLiveData()
        .then((liveData) => {
          const newest = newestOpenJob(liveData.jobs)
          if (cancelled || !newest) return
          liveJobsRef.current = liveData
          addMessage({
            role: 'bot',
            text: `🔔 Ting ting! ${newest.company} vừa đăng tin tuyển ${newest.title}. Bạn có muốn xem không?`,
            companyNotification: true,
            notificationJob: newest,
          })
          setNotificationSent(true)
        })
        .catch(() => {})
    }, 10000)

    return () => {
      cancelled = true
      window.clearTimeout(idleTimer)
    }
  }, [interactionVersion, isOpen, notificationSent])

  const findCompany = (text, companies) => companies.find((company) => {
    const normalized = normalizeInput(text)
    return normalized.includes(company.name.toLocaleLowerCase('vi'))
      || (company.hasPage && normalized.includes(company.id.split('-')[0]))
  })

  const sendMessage = (messageText = input, file = attachment) => {
    const text = messageText.trim()
    if ((!text && !file) || isThinking) return

    recordInteraction()
    addMessage({
      role: 'user',
      text,
      attachmentName: file?.name,
    })
    setInput('')
    setAttachment(null)
    setBotEmotion('thinking')
    setIsThinking(true)

    // Tải dữ liệu mới nhất trong lúc "đang soạn tin" để câu trả lời luôn khớp slot và tin hiện tại.
    const dataPromise = loadLiveData()
      .then((liveData) => {
        liveJobsRef.current = liveData
        return liveData
      })
      .catch(() => liveJobsRef.current)
    replyTimerRef.current = window.setTimeout(async () => {
      const liveData = await dataPromise
      const matchedCompany = liveData ? findCompany(text, buildCompanies(liveData)) : null
      if (matchedCompany) {
        addMessage({ role: 'bot', company: matchedCompany })
        setBotEmotion('happy')
      } else {
        let reply = getBotResponse(text, liveData?.jobs ?? null)
        if (reply.emotion === 'confused' && text) {
          try {
            const result = await requestApiJson('/api/chat', {
              method: 'POST',
              accessToken,
              body: {
                message: text,
                history: messages
                  .filter((messageItem) => ['user', 'bot'].includes(messageItem.role) && messageItem.text)
                  .slice(-8)
                  .map((messageItem) => ({
                    role: messageItem.role === 'bot' ? 'assistant' : 'user',
                    content: messageItem.text,
                  })),
              },
            })
            reply = { text: result.reply, emotion: 'happy' }
          } catch (error) {
            reply = {
              text: error.message || 'Trợ lý AI đang tạm thời gián đoạn. Bạn hãy thử lại sau ít phút.',
              emotion: 'confused',
            }
          }
        }
        addMessage({ role: 'bot', ...reply })
        setBotEmotion(reply.emotion)
      }
      setIsThinking(false)
      recordInteraction()
      inputRef.current?.focus()
    }, 1500)
  }

  const handleQuickReply = (reply, sourceMessageId) => {
    recordInteraction()
    setMessages((current) => current.map((message) => (
      message.id === sourceMessageId
        ? { ...message, quickReplies: undefined, companyNotification: false }
        : message
    )))
    if (reply.action === 'show-job') {
      addMessage({ role: 'user', text: reply.label })
      setBotEmotion('happy')
      loadLiveData()
        .then((liveData) => {
          liveJobsRef.current = liveData
          const fresh = liveData.jobs.find((job) => job.id === reply.job.id)
          if (fresh && isOpenJob(fresh)) addMessage({ role: 'bot', job: fresh })
          else addMessage({ role: 'bot', text: 'Vị trí này vừa hết slot hoặc không còn tuyển. Bạn thử vị trí khác nhé.' })
        })
        .catch(() => addMessage({ role: 'bot', job: reply.job }))
      return
    }
    if (reply.action === 'dismiss-notification') {
      addMessage({ role: 'user', text: reply.label })
      addMessage({ role: 'bot', text: 'Vâng, có gì mới mình sẽ cập nhật cho bạn.' })
      setBotEmotion('happy')
      return
    }
    sendMessage(reply.message)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  const handleFileChange = (event) => {
    const [file] = event.target.files || []
    if (!file) return
    setAttachment(file)
    recordInteraction()
    event.target.value = ''
  }

  return (
    <div className="chatbot-widget">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            className="chatbot-panel"
            aria-label="Trò chuyện với Trợ lý AI"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <header className="chatbot-header">
              <BotAvatar emotion={botEmotion} className="chatbot-header-avatar" />
              <div className="chatbot-header-copy">
                <strong>Trợ lý AI</strong>
                <span><i aria-hidden="true" /> Đang hoạt động</span>
              </div>
              <button
                className="chatbot-close"
                type="button"
                aria-label="Đóng cửa sổ trò chuyện"
                onClick={() => setIsOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="chatbot-messages" ref={messageListRef} aria-live="polite">
              {messages.map((message) => (
                <motion.div
                  className={`chatbot-message-row chatbot-message-${message.role}`}
                  key={message.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: message.role === 'user' ? 12 : -12, y: 5 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                >
                  {message.role === 'bot' && <BotAvatar emotion={botEmotion} className="chatbot-message-avatar" />}
                  <div className="chatbot-message-content">
                    {message.text && <div className="chatbot-bubble">{message.text}</div>}
                    {message.attachmentName && <span className="chatbot-attachment-label"><Paperclip size={13} />{message.attachmentName}</span>}
                    {message.company && (
                      <CompanyCard company={message.company} onViewCompany={onViewCompany} />
                    )}
                    {message.job && <JobCard job={message.job} onApply={onApplyJob} />}
                    {message.quickReplies?.length > 0 && (
                      <div className="chatbot-quick-replies">
                        {message.quickReplies.map((reply) => (
                          <button
                            key={reply.label}
                            type="button"
                            disabled={isThinking}
                            onClick={() => handleQuickReply(reply, message.id)}
                          >
                            {reply.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.companyNotification && (
                      <div className="chatbot-quick-replies chatbot-notification-replies">
                        <button type="button" onClick={() => handleQuickReply({ label: 'Xem ngay', action: 'show-job', job: message.notificationJob }, message.id)}>
                          Xem ngay <ArrowUp size={13} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => handleQuickReply({ label: 'Để sau', action: 'dismiss-notification' }, message.id)}>
                          Để sau <Check size={13} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <div className="chatbot-message-row chatbot-message-bot">
                  <BotAvatar emotion="thinking" className="chatbot-message-avatar" />
                  <TypingIndicator />
                </div>
              )}
            </div>

            <form className="chatbot-composer" onSubmit={handleSubmit}>
              {attachment && (
                <span className="chatbot-selected-file">
                  <Paperclip size={13} />{attachment.name}
                  <button type="button" aria-label="Bỏ tệp đính kèm" onClick={() => setAttachment(null)}><X size={13} /></button>
                </span>
              )}
              <div className="chatbot-composer-row">
                <input
                  ref={fileInputRef}
                  className="chatbot-file-input"
                  type="file"
                  onChange={handleFileChange}
                  aria-label="Chọn tệp đính kèm"
                />
                <button
                  className="chatbot-attach"
                  type="button"
                  aria-label="Đính kèm tệp"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={inputRef}
                  className="chatbot-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onFocus={recordInteraction}
                  placeholder="Nhập tin nhắn..."
                  aria-label="Tin nhắn của bạn"
                />
                <button
                  className="chatbot-send"
                  type="submit"
                  aria-label="Gửi tin nhắn"
                  disabled={(!input.trim() && !attachment) || isThinking}
                >
                  <ArrowUp size={19} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        className={`chatbot-fab${isOpen ? ' chatbot-fab-open' : ''}`}
        type="button"
        aria-label={isOpen ? 'Đóng Trợ lý AI' : 'Mở Trợ lý AI'}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open)
          recordInteraction()
        }}
        animate={shouldReduceMotion || isOpen ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
      >
        {isOpen ? <X size={23} /> : (
          <span className="chatbot-robot-face" aria-hidden="true">
            <i className="chatbot-robot-eye" />
            <i className="chatbot-robot-eye" />
          </span>
        )}
      </motion.button>
    </div>
  )
}

export default ChatbotWidget
