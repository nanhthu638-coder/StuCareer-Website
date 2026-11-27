import { Fragment, useEffect, useRef, useState } from 'react'
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
import { isOpenJob, loadLiveData, newestOpenJob } from './liveJobs.js'
import { welcomeReplies } from './mockData.js'
import { getReply } from './chatEngine.js'
import './ChatbotWidget.css'

const welcomeMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Xin chào! Mình là Trợ lý AI của StuWork. Bạn đang cần hỗ trợ điều gì hôm nay?',
  quickReplies: welcomeReplies,
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
    <div className="chatbot-bubble" role="status">Đang nhập...</div>
  )
}

function ChatbotWidget({ onViewCompany = () => {}, onApplyJob = () => {} }) {
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
  const chatContextRef = useRef({})

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

    replyTimerRef.current = window.setTimeout(() => {
      const { context, ...reply } = text
        ? getReply(text, chatContextRef.current)
        : { text: 'Mình chưa thể đọc tệp đính kèm. Bạn hãy nhập câu hỏi nhé.', emotion: 'confused', context: chatContextRef.current }
      chatContextRef.current = context
      addMessage({ role: 'bot', ...reply })
      setBotEmotion(reply.emotion)
      setIsThinking(false)
      recordInteraction()
      inputRef.current?.focus()
    }, 500 + Math.floor(Math.random() * 301))
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
          const fresh = liveData.jobs.find((job) => job.id === reply.job.id)
          if (fresh && isOpenJob(fresh)) addMessage({ role: 'bot', job: fresh })
          else addMessage({ role: 'bot', text: 'Vị trí này vừa hết slot hoặc không còn tuyển. Bạn thử vị trí khác nhé.' })
        })
        .catch(() => addMessage({ role: 'bot', text: 'Mình chưa kiểm tra được tình trạng vị trí này. Bạn thử lại sau nhé.' }))
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
                    {message.text && (
                      <div className="chatbot-bubble">
                        {message.text.split('\n').map((line, index) => (
                          <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>
                        ))}
                      </div>
                    )}
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
