import { mockCompanies } from '../../data/mockCompanies.js'

export const companies = [
  ...mockCompanies.map((company) => ({
    ...company,
    openJobs: company.jobs.map((job) => job.title),
  })),
]

export const synonymGroups = [
  { canonical: 'cv', aliases: ['resume', 'cv'] },
  { canonical: 'phỏng vấn', aliases: ['interview', 'phỏng vấn'] },
  { canonical: 'intern', aliases: ['thực tập sinh', 'thực tập', 'intern'] },
  { canonical: 'lương', aliases: ['salary', 'thù lao', 'lương'] },
]

export const helpKeywords = ['hỗ trợ', 'giúp đỡ', 'giúp', 'help', 'hướng dẫn', 'bắt đầu', 'làm sao', 'dùng thế nào']

export const intents = {
  greeting: {
    keywords: ['xin chào', 'chào bạn', 'hello', 'hi', 'hey'],
    response: 'Xin chào! Mình là Trợ lý AI của StuWork. Mình có thể giúp bạn chuẩn bị CV, phỏng vấn và tìm hiểu cơ hội thực tập.',
  },
  cv: {
    keywords: ['cv'],
    response: 'CV thực tập nên gói gọn trong 1 trang: nêu mục tiêu rõ ràng, đưa dự án và kỹ năng liên quan lên trước, đồng thời dùng số liệu để thể hiện kết quả. Bạn nhớ kiểm tra chính tả và tùy chỉnh CV theo từng vị trí nhé!',
    templates: {
      it: 'Mẫu CV IT nên gồm: thông tin liên hệ, mục tiêu nghề nghiệp, kỹ năng kỹ thuật, dự án cá nhân (kèm công nghệ và kết quả), học vấn và kinh nghiệm liên quan.',
      marketing: 'Mẫu CV Marketing nên làm nổi bật: mục tiêu, kỹ năng nội dung/SEO, chiến dịch hoặc dự án đã thực hiện, kết quả có số liệu, học vấn và công cụ bạn sử dụng.',
    },
    quickReplies: [
      { label: 'Mẫu CV IT', message: 'Mẫu CV IT' },
      { label: 'Mẫu CV Marketing', message: 'Mẫu CV Marketing' },
    ],
  },
  interview: {
    keywords: ['phỏng vấn'],
    response: 'Trước buổi phỏng vấn, hãy tìm hiểu công ty và luyện giới thiệu bản thân trong 1 phút. Khi trả lời, dùng ví dụ cụ thể theo cách STAR (Tình huống – Nhiệm vụ – Hành động – Kết quả), và chuẩn bị vài câu hỏi dành cho nhà tuyển dụng nhé!',
    quickReplies: [
      { label: 'Câu hỏi phỏng vấn IT', message: 'Câu hỏi phỏng vấn IT' },
      { label: 'Phỏng vấn Marketing', message: 'Phỏng vấn Marketing' },
    ],
  },
  salary: {
    keywords: ['lương'],
    response: 'Mức trợ cấp intern tham khảo thường khoảng 3–8 triệu đồng/tháng, tùy ngành, địa điểm và thời lượng làm việc. Bạn nên hỏi rõ về phụ cấp, lịch làm và cơ hội trở thành nhân viên chính thức khi trao đổi với nhà tuyển dụng.',
    byField: {
      it: 'Mức lương intern IT tham khảo khoảng 4–8 triệu đồng/tháng, tùy công nghệ, địa điểm và thời lượng làm việc.',
      marketing: 'Mức lương intern Marketing tham khảo khoảng 3–7 triệu đồng/tháng; một số nơi có thêm phụ cấp theo hiệu quả chiến dịch.',
    },
    quickReplies: [
      { label: 'Mức lương IT', message: 'Mức lương IT' },
      { label: 'Mức lương Marketing', message: 'Mức lương Marketing' },
    ],
  },
  fallback: {
    response: 'Xin lỗi, tôi chưa có thông tin cụ thể. Nhưng tôi có thể giúp bạn viết CV hoặc bí kíp phỏng vấn.',
  },
  multipleTopics: {
    response: 'Bạn đang quan tâm đến cả CV và Phỏng vấn. Bạn muốn xem phần nào trước?',
    quickReplies: [
      { label: 'Viết CV', message: 'CV' },
      { label: 'Bí kíp phỏng vấn', message: 'Phỏng vấn' },
    ],
  },
  help: {
    keywords: helpKeywords,
    response: 'Tôi có thể giúp bạn những việc sau. Bạn muốn tìm hiểu về phần nào?',
    quickReplies: [
      { label: 'Cách tìm việc làm', message: 'Cách tìm việc làm' },
      { label: 'Cách tạo CV', message: 'Cách tạo CV' },
      { label: 'Cách ứng tuyển', message: 'Cách ứng tuyển' },
      { label: 'Liên hệ Admin', message: 'Liên hệ Admin' },
    ],
    actionResponses: {
      'cách tìm việc làm': 'Bạn hãy sử dụng thanh tìm kiếm hoặc bộ lọc Ngành nghề/Địa điểm ở trang chủ để tìm việc phù hợp nhé.',
      'cách tạo cv': "Bạn vào mục 'Hồ sơ cá nhân' -> 'Cập nhật CV' để điền thông tin và tải CV lên nhé.",
      'cách ứng tuyển': "Khi xem chi tiết một công việc, bạn chỉ cần bấm nút 'Ứng tuyển ngay' ở góc phải màn hình. Hệ thống sẽ tự động gửi CV của bạn đến nhà tuyển dụng.",
      'liên hệ admin': 'Nếu gặp lỗi hệ thống, bạn vui lòng gửi email về: hotro@hufiit.edu.vn hoặc gọi số 028.xxxx.xxxx nhé.',
    },
  },
  social: {
    keywords: ['cảm ơn', 'thanks', 'ok', 'tạm biệt'],
    response: 'Rất vui được hỗ trợ bạn! Chúc bạn sớm tìm được công việc thực tập ưng ý. Nếu cần gì cứ nhắn mình nhé!',
  },
  jobSearch: {
    keywords: ['tìm việc', 'tuyển dụng', 'việc làm'],
    internPrefix: 'intern',
    noPosition: 'Bạn muốn tìm vị trí nào? Hãy thử nhập tên ngành hoặc kỹ năng, ví dụ: “tìm việc ReactJS” hoặc “intern Marketing”.',
    noResults: 'Mình chưa tìm thấy vị trí phù hợp với từ khóa đó. Bạn thử tên vị trí hoặc kỹ năng khác nhé.',
    quickReplies: [
      { label: 'Intern ReactJS', message: 'tìm việc ReactJS' },
      { label: 'Intern Marketing', message: 'intern Marketing' },
    ],
  },
}

export const welcomeReplies = [
  { label: '📝 Gợi ý viết CV', message: 'Gợi ý viết CV' },
  { label: '🎤 Bí kíp phỏng vấn', message: 'Bí kíp phỏng vấn' },
  { label: '💰 Mức lương intern', message: 'Mức lương intern' },
]
