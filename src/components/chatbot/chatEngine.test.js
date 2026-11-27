import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getReply } from './chatEngine.js'

test('chuẩn hóa tiếng Việt và nhận diện từ khóa', () => {
  const reply = getReply('XIN CHÀO!!!')
  assert.equal(reply.context.intent, 'greeting')
  assert.equal(reply.emotion, 'happy')
})

test('nhận diện từ bị sai một ký tự', () => {
  const reply = getReply('Lương intern markting bao nhiêu?')
  assert.equal(reply.context.intent, 'salary-marketing')
})

test('chip hiện tại dẫn tới đúng chủ đề hoặc hỏi thêm ngành', () => {
  assert.equal(getReply('Gợi ý viết CV').context.intent, 'cv-structure')
  assert.equal(getReply('Bí kíp phỏng vấn').context.intent, 'interview-questions')
  const salary = getReply('Mức lương intern')
  assert.match(salary.text, /quan tâm ngành nào/)
  assert.equal(getReply('IT', salary.context).context.intent, 'salary-it')
})

test('câu hỏi hướng dẫn không bị biến thành truy vấn tìm việc', () => {
  assert.equal(getReply('Làm sao đăng ký tài khoản tìm việc?').context.intent, 'register')
  assert.equal(getReply('Làm sao tránh lừa đảo khi tìm việc?').context.intent, 'scam-prevention')
  const reply = getReply('Cách tìm việc trên StuWork')
  assert.equal(reply.context.searchKind, null)
  assert.doesNotMatch(reply.text, /dữ liệu mẫu/)
})

test('fallback có ba câu hỏi gợi ý khi không đủ điểm', () => {
  const reply = getReply('xyzzy qqqq')
  assert.match(reply.text, /^Mình chưa hiểu rõ, bạn thử hỏi:/)
  assert.equal(reply.quickReplies.length, 3)
  assert.equal(reply.text.split('\n').length, 4)
  const salary = getReply('lương')
  assert.ok(salary.quickReplies.every(({ message }) => /lương/i.test(message)))
})

test('không lặp lại câu trả lời liền trước', () => {
  const first = getReply('Xin chào')
  const second = getReply('Xin chào', first.context)
  assert.notEqual(first.text, second.text)
})

test('lọc việc theo ngành, địa điểm và khoảng lương', () => {
  const reply = getReply('Tìm việc IT ở Hà Nội lương từ 5 đến 8 triệu')
  assert.equal(reply.context.slots.industry, 'it')
  assert.equal(reply.context.slots.location, 'ha noi')
  assert.deepEqual(reply.context.slots.salary, { min: 5, max: 8 })
  assert.match(reply.text, /^Mình tìm thấy các việc phù hợp trên StuWork:\n/)
  assert.match(reply.text, /Backend Developer/)
  assert.doesNotMatch(reply.text, /Frontend Developer/)
  assert.ok(reply.text.split('\n').length <= 4)
})

test('câu nối tiếp kế thừa ngành và thay địa điểm', () => {
  const first = getReply('Tìm việc IT ở Hà Nội')
  const second = getReply('Còn ở Đà Nẵng thì sao?', first.context)
  assert.equal(second.context.slots.industry, 'it')
  assert.equal(second.context.slots.location, 'da nang')
  assert.match(second.text, /Fullstack Developer/)
  assert.doesNotMatch(second.text, /Backend Developer/)
})

test('đổi chủ đề không giữ bộ lọc tìm việc', () => {
  const first = getReply('Tìm việc IT ở Hà Nội')
  const second = getReply('CV thực tập cần những mục nào?', first.context)
  assert.equal(second.context.intent, 'cv-structure')
  assert.equal(second.context.searchKind, null)
  assert.deepEqual(second.context.slots, {})
})

test('chuyển ngành trong câu nối tiếp về lương', () => {
  const first = getReply('Lương intern IT bao nhiêu?')
  const second = getReply('Còn Marketing thì sao?', first.context)
  assert.equal(second.context.intent, 'salary-marketing')
  assert.equal(second.context.slots.industry, 'marketing')
})

test('lọc công ty theo việc cùng ngành, địa điểm và lương', () => {
  const reply = getReply('Tìm công ty IT ở Hà Nội lương trên 7 triệu')
  assert.equal(reply.context.searchKind, 'companies')
  assert.match(reply.text, /^Mình tìm thấy các công ty phù hợp trên StuWork:\n/)
  assert.match(reply.text, /FPT Software/)
  assert.doesNotMatch(reply.text, /Momo/)
})

test('tra cứu công ty theo tên', () => {
  const reply = getReply('Thông tin công ty FPT')
  assert.equal(reply.context.searchKind, 'companies')
  assert.match(reply.text, /FPT Software/)
})

test('không trả kết quả khi bộ lọc không khớp', () => {
  const reply = getReply('Tìm việc Marketing ở Huế lương trên 100 triệu')
  assert.equal(reply.text, 'Hiện StuWork chưa có việc phù hợp, bạn thử đổi ngành hoặc địa điểm nhé')
  assert.equal(reply.context.slots.location, 'hue')
})

test('hiểu mức lương bằng đồng và phân biệt ngưỡng trên, dưới', () => {
  const above = getReply('Tìm việc IT ở Hà Nội lương trên 8.000.000 đồng')
  assert.equal(above.context.slots.salary.min, 8)
  assert.match(above.text, /chưa có việc phù hợp/)
  const below = getReply('Tìm việc IT ở Hà Nội lương dưới 5 triệu')
  assert.match(below.text, /chưa có việc phù hợp/)
})

test('bỏ từ đệm khi tìm việc', () => {
  const reply = getReply('Mình muốn tìm việc IT ở Hà Nội')
  assert.match(reply.text, /Backend Developer/)
})

test('thay địa điểm không có trong dữ liệu bằng địa điểm khác', () => {
  const first = getReply('Tìm việc IT ở Vũng Tàu')
  assert.equal(first.context.slots.location, 'vung tau')
  assert.match(first.text, /chưa có việc phù hợp/)
  const second = getReply('Còn ở Hà Nội thì sao?', first.context)
  assert.match(second.text, /Backend Developer/)
})
