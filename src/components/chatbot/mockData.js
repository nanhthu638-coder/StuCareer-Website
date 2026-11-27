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

export const chatKB = [
  {
    id: 'greeting',
    topic: 'Chào hỏi',
    keywords: ['xin chao', 'chao ban', 'hello', 'hi', 'chao buoi sang'],
    samples: ['Xin chào bạn!', 'Hello, có ai ở đây không?', 'Chào bạn nhé!'],
    answers: [
      'Chào bạn! Mình có thể cùng bạn tìm hiểu về thực tập, CV và phỏng vấn nhé.',
      'Xin chào, rất vui được gặp bạn! Mình ở đây để hỗ trợ bạn trên hành trình tìm việc.',
    ],
    followUps: ['Bạn có thể giúp mình viết CV không?', 'Làm sao tìm việc thực tập?'],
  },
  {
    id: 'thanks',
    topic: 'Cảm ơn',
    keywords: ['cam on', 'cam ta', 'thanks', 'thank you', 'da ta'],
    samples: ['Cảm ơn bạn nhiều nhé!', 'Thanks bạn!', 'Mình cảm ơn nha.'],
    answers: [
      'Không có gì đâu, mình rất vui được giúp bạn! Nếu còn thắc mắc, bạn cứ nhắn mình nhé.',
      'Mình rất vui vì thông tin hữu ích với bạn. Chúc bạn tìm được cơ hội phù hợp nhé!',
    ],
    followUps: ['Mình nên chuẩn bị CV thế nào?', 'Bạn có mẹo phỏng vấn không?'],
  },
  {
    id: 'goodbye',
    topic: 'Tạm biệt',
    keywords: ['tam biet', 'bye', 'hen gap lai', 'goodbye', 'chao tam biet'],
    samples: ['Tạm biệt bạn nhé!', 'Bye, hẹn gặp lại.', 'Mình đi đây, chào bạn!'],
    answers: [
      'Tạm biệt bạn nhé! Mình chúc bạn học tốt và tìm được công việc phù hợp.',
      'Hẹn gặp lại bạn! Khi cần trao đổi thêm về việc làm, mình luôn sẵn sàng hỗ trợ.',
    ],
    followUps: ['Lần sau mình tìm việc như thế nào?', 'Mình cần chuẩn bị gì trước khi ứng tuyển?'],
  },
  {
    id: 'assistant',
    topic: 'Giới thiệu trợ lý',
    keywords: ['ban la ai', 'tro ly', 'lam duoc gi', 'chatbot', 'giup duoc gi'],
    samples: ['Bạn là ai?', 'Bạn có thể giúp mình những gì?', 'Chatbot này làm được gì?'],
    answers: [
      'Mình là trợ lý của StuWork, có thể chia sẻ gợi ý về CV, phỏng vấn và tìm việc cho sinh viên. Mình không thay thế nhà tuyển dụng và bạn nên kiểm tra lại thông tin trong từng tin tuyển dụng nhé.',
      'Mình hỗ trợ bạn tìm hiểu cách chuẩn bị hồ sơ và ứng tuyển trên StuWork. Với thông tin cụ thể về một vị trí, bạn hãy đọc tin tuyển dụng hoặc hỏi trực tiếp nhà tuyển dụng nhé.',
    ],
    followUps: ['Cách ứng tuyển trên StuWork?', 'CV thực tập nên có gì?'],
  },
  {
    id: 'cv-structure',
    topic: 'Cấu trúc CV',
    keywords: ['cau truc cv', 'viet cv', 'mau cv', 'noi dung cv', 'tao ho so'],
    samples: ['CV thực tập cần những mục nào?', 'Mình nên viết CV như thế nào?', 'Cho mình cấu trúc CV cơ bản.'],
    answers: [
      'Mình gợi ý CV gồm thông tin liên hệ, học vấn, kỹ năng và kinh nghiệm hoặc dự án liên quan. Bạn hãy trình bày ngắn gọn, ưu tiên nội dung phù hợp với vị trí và kiểm tra chính tả nhé.',
      'Bạn có thể bắt đầu bằng thông tin liên hệ và học vấn, sau đó nêu kỹ năng cùng dự án hoặc hoạt động nổi bật. Mình khuyên bạn điều chỉnh nội dung theo từng tin tuyển dụng và lưu bản dễ đọc.',
    ],
    followUps: ['Chưa có kinh nghiệm thì viết CV sao?', 'CV thường mắc lỗi gì?'],
  },
  {
    id: 'cv-no-experience',
    topic: 'CV khi chưa có kinh nghiệm',
    keywords: ['cv chua kinh nghiem', 'cv sinh vien', 'cv moi ra truong', 'du an ca nhan', 'chua tung di lam'],
    samples: ['Chưa đi làm thì viết CV sao?', 'Sinh viên chưa có kinh nghiệm nên ghi gì?', 'Mình không có kinh nghiệm để đưa vào CV.'],
    answers: [
      'Mình gợi ý bạn đưa dự án môn học, hoạt động câu lạc bộ hoặc công việc tình nguyện liên quan vào CV. Với mỗi trải nghiệm, hãy nêu vai trò, việc bạn đã làm và kết quả có thể kiểm chứng.',
      'Chưa có việc làm chính thức vẫn có thể viết CV tốt nhé. Mình khuyên bạn làm nổi bật kỹ năng, sản phẩm cá nhân và quá trình học phù hợp, không cần tự nhận kinh nghiệm chưa có.',
    ],
    followUps: ['Làm sao tạo portfolio?', 'Cấu trúc CV nên gồm gì?'],
  },
  {
    id: 'cv-mistakes',
    topic: 'Lỗi thường gặp trong CV',
    keywords: ['loi cv', 'sai chinh ta', 'cv dai', 'cv chung chung', 'kinh nghiem gia'],
    samples: ['Những lỗi nào cần tránh trong CV?', 'CV của mình cần kiểm tra gì?', 'Vì sao không nên dùng một CV cho mọi vị trí?'],
    answers: [
      'Mình thường lưu ý lỗi chính tả, thông tin liên hệ sai và nội dung quá chung chung. Bạn nên đọc lại CV, bỏ thông tin không liên quan và điều chỉnh theo mô tả công việc.',
      'Bạn hãy tránh khai sai kỹ năng, dùng bố cục khó đọc hoặc liệt kê quá nhiều mà không nói rõ đóng góp. Mình khuyên bạn nhờ một người khác đọc lại trước khi gửi.',
    ],
    followUps: ['CV thực tập nên có gì?', 'Chưa có kinh nghiệm thì ghi gì?'],
  },
  {
    id: 'cover-letter',
    topic: 'Thư xin việc',
    keywords: ['thu xin viec', 'cover letter', 'thu ung tuyen', 'viet thu', 'dong luc ung tuyen'],
    samples: ['Viết thư xin việc như thế nào?', 'Cover letter cần có gì?', 'Mình nên trình bày lý do ứng tuyển ra sao?'],
    answers: [
      'Mình gợi ý mở thư bằng vị trí ứng tuyển và lý do bạn quan tâm, rồi nêu một hoặc hai trải nghiệm phù hợp. Cuối thư, bạn có thể cảm ơn nhà tuyển dụng và để lại thông tin liên hệ.',
      'Một thư xin việc ngắn gọn nên nói rõ bạn muốn ứng tuyển vị trí nào và có thể đóng góp gì. Mình khuyên bạn dùng ví dụ thật và điều chỉnh nội dung cho từng công việc nhé.',
    ],
    followUps: ['CV cần những mục nào?', 'Làm sao nổi bật khi ứng tuyển?'],
  },
  {
    id: 'interview-questions',
    topic: 'Câu hỏi phỏng vấn phổ biến',
    keywords: ['cau hoi phong van', 'gioi thieu ban than', 'diem manh', 'diem yeu', 'vi sao ung tuyen'],
    samples: ['Phỏng vấn intern thường hỏi gì?', 'Có những câu hỏi phỏng vấn phổ biến nào?', 'Nhà tuyển dụng hay hỏi sinh viên điều gì?'],
    answers: [
      'Mình thường thấy các câu hỏi về giới thiệu bản thân, lý do ứng tuyển, điểm mạnh và trải nghiệm làm việc nhóm. Bạn nên chuẩn bị ví dụ thực tế và tìm hiểu trước về vị trí nhé.',
      'Bạn có thể luyện trả lời câu hỏi về kỹ năng, dự án đã làm và cách xử lý khó khăn. Mình cũng gợi ý chuẩn bị một vài câu hỏi về công việc và người hướng dẫn.',
    ],
    followUps: ['Trả lời phỏng vấn sao cho tốt?', 'Nên hỏi nhà tuyển dụng về lương thế nào?'],
  },
  {
    id: 'interview-answer',
    topic: 'Cách trả lời phỏng vấn',
    keywords: ['tra loi phong van', 'phuong phap star', 'ke kinh nghiem', 'tra loi cau hoi', 'vi du cu the'],
    samples: ['Làm sao trả lời phỏng vấn tốt?', 'Phương pháp STAR là gì?', 'Mình nên kể về dự án thế nào khi phỏng vấn?'],
    answers: [
      'Mình gợi ý dùng STAR: nêu tình huống, nhiệm vụ, hành động của bạn và kết quả. Hãy chọn ví dụ thật, trả lời đúng trọng tâm và nói rõ điều bạn học được.',
      'Bạn nên lắng nghe hết câu hỏi, trình bày ngắn gọn rồi đưa ví dụ cụ thể. Nếu chưa biết câu trả lời, mình khuyên bạn nói thật và giải thích cách bạn sẽ tìm hiểu.',
    ],
    followUps: ['Phỏng vấn thường hỏi gì?', 'Mặc gì khi đi phỏng vấn?'],
  },
  {
    id: 'interview-clothes',
    topic: 'Trang phục phỏng vấn',
    keywords: ['trang phuc phong van', 'mac gi', 'quan ao phong van', 'an mac', 'ngoai hinh'],
    samples: ['Đi phỏng vấn nên mặc gì?', 'Trang phục intern khi phỏng vấn thế nào?', 'Mình cần ăn mặc ra sao?'],
    answers: [
      'Mình gợi ý chọn trang phục sạch sẽ, gọn gàng và phù hợp môi trường công ty. Nếu chưa rõ quy định, bạn có thể hỏi người mời phỏng vấn trước.',
      'Bạn không nhất thiết phải mặc quá trang trọng ở mọi nơi, nhưng nên ưu tiên sự lịch sự và thoải mái. Mình cũng khuyên bạn chuẩn bị trang phục từ hôm trước để bớt vội.',
    ],
    followUps: ['Phỏng vấn thường hỏi gì?', 'Phỏng vấn online cần chuẩn bị gì?'],
  },
  {
    id: 'interview-salary',
    topic: 'Hỏi lương khi phỏng vấn',
    keywords: ['hoi luong', 'thuong luong luong', 'muc luong mong muon', 'phu cap', 'che do thuc tap'],
    samples: ['Hỏi lương khi phỏng vấn thế nào?', 'Nên trả lời mức lương mong muốn ra sao?', 'Có nên hỏi về phụ cấp thực tập không?'],
    answers: [
      'Mình nghĩ bạn có thể hỏi lịch sự về mức hỗ trợ, thời gian làm việc và các khoản phụ cấp khi trao đổi về chế độ. Trước đó, bạn nên tìm hiểu mặt bằng vị trí và cân nhắc nhu cầu của mình.',
      'Khi được hỏi mức mong muốn, bạn có thể đưa khoảng phù hợp với kỹ năng và lịch làm, đồng thời thể hiện sự sẵn sàng trao đổi. Mình khuyên bạn xác nhận mức hỗ trợ và điều kiện bằng văn bản trước khi nhận việc.',
    ],
    followUps: ['Lương intern Marketing thế nào?', 'Cần lưu ý gì về quyền lợi thực tập?'],
  },
  {
    id: 'salary-marketing',
    topic: 'Lương intern Marketing',
    keywords: ['luong marketing', 'tro cap marketing', 'intern marketing luong', 'thuc tap marketing', 'thu lao marketing'],
    samples: ['Lương intern Marketing khoảng bao nhiêu?', 'Thực tập Marketing có được trợ cấp không?', 'Mức hỗ trợ Marketing phụ thuộc gì?'],
    answers: [
      'Mức hỗ trợ intern Marketing thay đổi theo công ty, địa điểm, nhiệm vụ và số giờ làm; có nơi không trả lương. Mình khuyên bạn xem kỹ tin tuyển dụng và hỏi rõ phụ cấp, cách tính cùng lịch làm.',
      'Mình không có mức lương cập nhật đáng tin cậy cho mọi vị trí Marketing. Bạn hãy so sánh các tin tương tự và trao đổi trực tiếp về khoản hỗ trợ trước khi quyết định nhé.',
    ],
    followUps: ['Intern Marketing cần kỹ năng gì?', 'Hỏi lương khi phỏng vấn thế nào?'],
  },
  {
    id: 'salary-design',
    topic: 'Lương intern Thiết kế',
    keywords: ['luong thiet ke', 'luong design', 'tro cap designer', 'intern thiet ke', 'thu lao do hoa'],
    samples: ['Intern Thiết kế được trả bao nhiêu?', 'Thực tập thiết kế đồ họa có lương không?', 'Mức hỗ trợ designer phụ thuộc vào đâu?'],
    answers: [
      'Mức hỗ trợ intern Thiết kế tùy nơi tuyển, thời lượng làm việc và yêu cầu công việc; một số vị trí có thể không trả lương. Mình gợi ý bạn hỏi rõ khoản hỗ trợ và những chi phí hoặc công cụ cần tự chuẩn bị.',
      'Mình chưa có số liệu cập nhật để đưa ra một mức chung đáng tin cậy cho intern Thiết kế. Bạn nên tham khảo nhiều tin cùng địa điểm và xác nhận chế độ với nhà tuyển dụng.',
    ],
    followUps: ['Intern Thiết kế cần kỹ năng gì?', 'Làm portfolio như thế nào?'],
  },
  {
    id: 'salary-it',
    topic: 'Lương intern IT',
    keywords: ['luong it', 'luong lap trinh', 'tro cap it', 'intern it luong', 'thu lao cong nghe'],
    samples: ['Intern IT lương bao nhiêu?', 'Thực tập lập trình có được trả lương không?', 'Lương thực tập IT phụ thuộc gì?'],
    answers: [
      'Mức hỗ trợ intern IT khác nhau theo kỹ năng, địa điểm, thời gian làm và từng doanh nghiệp; không phải vị trí nào cũng trả lương. Mình khuyên bạn kiểm tra tin tuyển dụng và hỏi rõ chế độ trước khi nhận việc.',
      'Mình không có dữ liệu cập nhật để khẳng định một mức lương chung cho intern IT. Bạn có thể so sánh các vị trí tương tự và hỏi thêm về phụ cấp, lịch làm và người hướng dẫn.',
    ],
    followUps: ['Intern IT cần kỹ năng gì?', 'Hỏi lương khi phỏng vấn ra sao?'],
  },
  {
    id: 'salary-business',
    topic: 'Lương intern Kinh doanh',
    keywords: ['luong kinh doanh', 'luong sales', 'tro cap sales', 'intern kinh doanh', 'hoa hong thuc tap'],
    samples: ['Lương intern Kinh doanh thế nào?', 'Thực tập sales có lương cứng không?', 'Intern Kinh doanh có hoa hồng không?'],
    answers: [
      'Chế độ intern Kinh doanh có thể gồm hỗ trợ cố định, hoa hồng hoặc không có lương, tùy vị trí. Mình khuyên bạn hỏi rõ cách tính, điều kiện nhận hoa hồng và chỉ tiêu trước khi nhận việc.',
      'Mình không có mức lương chung đáng tin cậy cho intern Kinh doanh vì mỗi nơi có chính sách khác nhau. Bạn nên so sánh tin tuyển dụng và xác nhận cả khoản cố định lẫn khoản theo kết quả.',
    ],
    followUps: ['Intern Kinh doanh cần kỹ năng gì?', 'Làm sao nhận biết tin tuyển dụng lừa đảo?'],
  },
  {
    id: 'salary-accounting',
    topic: 'Lương intern Kế toán',
    keywords: ['luong ke toan', 'tro cap ke toan', 'intern ke toan', 'thuc tap accounting', 'thu lao ke toan'],
    samples: ['Intern Kế toán có lương không?', 'Trợ cấp thực tập Kế toán là bao nhiêu?', 'Lương intern Kế toán tùy vào yếu tố nào?'],
    answers: [
      'Mức hỗ trợ intern Kế toán tùy doanh nghiệp, địa điểm và lịch làm, và có vị trí không trả lương. Mình gợi ý bạn hỏi rõ trợ cấp, công việc thực tế và người hướng dẫn trước khi nhận lời.',
      'Mình chưa có dữ liệu cập nhật để đưa ra con số chung cho thực tập Kế toán. Bạn nên xem các tin tương tự và trao đổi trực tiếp về mức hỗ trợ cùng thời gian làm việc nhé.',
    ],
    followUps: ['Intern Kế toán cần kỹ năng gì?', 'Hỏi chế độ thực tập thế nào?'],
  },
  {
    id: 'skills-marketing',
    topic: 'Kỹ năng Marketing',
    keywords: ['ky nang marketing', 'hoc marketing', 'content', 'seo', 'phan tich chien dich'],
    samples: ['Intern Marketing cần kỹ năng gì?', 'Mình nên học gì để thực tập Marketing?', 'Kỹ năng nào quan trọng với người mới làm Marketing?'],
    answers: [
      'Mình gợi ý bạn luyện viết nội dung, tìm hiểu khách hàng và đọc các chỉ số cơ bản của chiến dịch. Tùy vị trí, bạn có thể học thêm SEO, thiết kế cơ bản hoặc cách sử dụng công cụ phân tích.',
      'Kỹ năng giao tiếp, viết rõ ràng và tư duy thử nghiệm rất hữu ích với intern Marketing. Mình khuyên bạn làm một dự án nhỏ để thể hiện cách lập kế hoạch và đánh giá kết quả.',
    ],
    followUps: ['Lương intern Marketing thế nào?', 'Đưa dự án Marketing vào CV ra sao?'],
  },
  {
    id: 'skills-design',
    topic: 'Kỹ năng Thiết kế',
    keywords: ['ky nang thiet ke', 'ky nang design', 'do hoa', 'bo cuc', 'portfolio thiet ke'],
    samples: ['Intern Thiết kế cần biết gì?', 'Mình cần kỹ năng nào để thực tập thiết kế đồ họa?', 'Người mới học design nên tập trung gì?'],
    answers: [
      'Mình gợi ý bạn luyện bố cục, màu sắc, kiểu chữ và sử dụng công cụ phù hợp với vị trí. Một portfolio ngắn có giải thích mục tiêu và quá trình thiết kế sẽ giúp nhà tuyển dụng hiểu cách bạn làm việc.',
      'Ngoài kỹ năng thiết kế, bạn nên tập nhận phản hồi và trình bày lý do cho lựa chọn của mình. Mình khuyên bạn chọn vài sản phẩm tốt nhất và ghi rõ phần việc thực sự do bạn thực hiện.',
    ],
    followUps: ['Làm portfolio như thế nào?', 'Lương intern Thiết kế ra sao?'],
  },
  {
    id: 'skills-it',
    topic: 'Kỹ năng IT',
    keywords: ['ky nang it', 'hoc lap trinh', 'ngon ngu lap trinh', 'git', 'du an cong nghe'],
    samples: ['Intern IT cần kỹ năng gì?', 'Sinh viên lập trình cần học gì để đi thực tập?', 'Mình nên chuẩn bị gì để ứng tuyển intern IT?'],
    answers: [
      'Mình gợi ý bạn nắm nền tảng lập trình, cấu trúc dữ liệu cơ bản và một ngôn ngữ phù hợp vị trí. Bạn cũng nên biết dùng Git, đọc tài liệu và trình bày một dự án mình đã tham gia.',
      'Yêu cầu IT tùy chuyên ngành, nhưng khả năng giải quyết vấn đề, tìm lỗi và học công nghệ mới thường hữu ích. Mình khuyên bạn đọc mô tả công việc rồi luyện những kỹ năng liên quan nhất.',
    ],
    followUps: ['CV IT chưa có kinh nghiệm viết sao?', 'Lương intern IT thế nào?'],
  },
  {
    id: 'skills-business',
    topic: 'Kỹ năng Kinh doanh',
    keywords: ['ky nang kinh doanh', 'ky nang sales', 'giao tiep khach hang', 'tu van', 'cham soc khach hang'],
    samples: ['Intern Kinh doanh cần kỹ năng gì?', 'Thực tập sales nên học gì?', 'Kỹ năng nào quan trọng khi tư vấn khách hàng?'],
    answers: [
      'Mình gợi ý bạn luyện lắng nghe, giao tiếp rõ ràng và tìm hiểu nhu cầu khách hàng. Biết quản lý thông tin, theo dõi công việc và sử dụng bảng tính cũng là lợi thế.',
      'Với vị trí Kinh doanh, khả năng tìm hiểu sản phẩm và xử lý phản hồi rất hữu ích. Mình khuyên bạn tập tư vấn trung thực và hỏi rõ cách công ty hướng dẫn thực tập sinh.',
    ],
    followUps: ['Lương intern Kinh doanh thế nào?', 'Làm sao tránh lừa đảo tuyển dụng?'],
  },
  {
    id: 'skills-accounting',
    topic: 'Kỹ năng Kế toán',
    keywords: ['ky nang ke toan', 'nghiep vu ke toan', 'excel ke toan', 'chung tu', 'bao mat so lieu'],
    samples: ['Intern Kế toán cần biết gì?', 'Thực tập Kế toán cần kỹ năng nào?', 'Sinh viên Kế toán nên chuẩn bị gì?'],
    answers: [
      'Mình gợi ý bạn ôn nguyên lý kế toán, cách xử lý chứng từ và sử dụng bảng tính. Sự cẩn thận, bảo mật dữ liệu và chủ động hỏi khi chưa rõ cũng rất quan trọng.',
      'Bạn nên xem yêu cầu cụ thể để chuẩn bị kiến thức về chứng từ, đối chiếu số liệu hoặc phần mềm liên quan. Mình khuyên bạn luyện bằng bài tập thực tế và không tự ý chia sẻ dữ liệu nhạy cảm.',
    ],
    followUps: ['Lương intern Kế toán ra sao?', 'Chưa có kinh nghiệm thì viết CV thế nào?'],
  },
  {
    id: 'find-intern-no-experience',
    topic: 'Tìm thực tập khi chưa có kinh nghiệm',
    keywords: ['thuc tap chua kinh nghiem', 'tim intern', 'chua tung lam viec', 'sinh vien nam nhat', 'tim thuc tap'],
    samples: ['Chưa có kinh nghiệm thì tìm thực tập ở đâu?', 'Mình chưa đi làm có thể ứng tuyển intern không?', 'Làm sao tìm thực tập cho người mới?'],
    answers: [
      'Mình gợi ý bạn tìm vị trí thực tập dành cho người mới, đọc kỹ yêu cầu và thời gian làm việc. Hãy dùng dự án học tập hoặc hoạt động ngoại khóa để chứng minh kỹ năng thay cho kinh nghiệm chính thức.',
      'Bạn có thể tìm trên StuWork, qua trường học hoặc các kênh tuyển dụng chính thức của doanh nghiệp. Mình khuyên bạn kiểm tra thông tin công ty và chủ động hỏi về người hướng dẫn.',
    ],
    followUps: ['Viết CV khi chưa có kinh nghiệm?', 'Cách ứng tuyển trên StuWork?'],
  },
  {
    id: 'employment-types',
    topic: 'Thực tập, part-time và fresher',
    keywords: ['intern part time fresher', 'thuc tap', 'ban thoi gian', 'fresher', 'phan biet cong viec'],
    samples: ['Intern khác part-time và fresher thế nào?', 'Thực tập và làm thêm khác nhau ra sao?', 'Fresher có phải thực tập sinh không?'],
    answers: [
      'Theo mình, thực tập thường chú trọng học hỏi và có người hướng dẫn, còn part-time mô tả thời lượng làm việc ít hơn toàn thời gian. Fresher thường chỉ người mới bắt đầu nghề nghiệp và có thể làm toàn thời gian hoặc theo thỏa thuận.',
      'Mình xem intern và fresher là cách gọi giai đoạn hoặc vai trò, còn part-time nói về lịch làm. Tên gọi không quyết định mọi quyền lợi, nên bạn hãy đọc kỹ nhiệm vụ và thỏa thuận cụ thể nhé.',
    ],
    followUps: ['Cân bằng học và thực tập thế nào?', 'Cần hỏi gì trước khi nhận việc?'],
  },
  {
    id: 'stand-out',
    topic: 'Làm nổi bật hồ sơ',
    keywords: ['noi bat', 'gay an tuong', 'canh tranh ung vien', 'ho so thu hut', 'tao loi the'],
    samples: ['Làm sao nổi bật khi ứng tuyển?', 'Mình nên làm gì để hồ sơ gây ấn tượng?', 'Làm sao cạnh tranh với ứng viên khác?'],
    answers: [
      'Mình gợi ý bạn chọn trải nghiệm liên quan nhất và mô tả rõ việc mình làm cùng kết quả thực tế. Một CV phù hợp vị trí và lời giải thích cụ thể về động lực sẽ có ích hơn nội dung phóng đại.',
      'Bạn có thể chuẩn bị một dự án nhỏ hoặc portfolio và tìm hiểu kỹ doanh nghiệp trước buổi trao đổi. Mình khuyên bạn thể hiện sự chủ động, trung thực và khả năng học hỏi.',
    ],
    followUps: ['Làm portfolio như thế nào?', 'Viết thư xin việc ra sao?'],
  },
  {
    id: 'apply-stuwork',
    topic: 'Ứng tuyển trên StuWork',
    keywords: ['ung tuyen stuwork', 'nop ho so', 'ung tuyen ngay', 'tai cv', 'cach nop cv'],
    samples: ['Cách ứng tuyển trên StuWork?', 'Mình nộp CV cho công việc thế nào?', 'Làm sao ứng tuyển một vị trí trên web?'],
    answers: [
      'Bạn hãy đăng nhập, tải CV lên hồ sơ rồi mở trang chi tiết công việc phù hợp và chọn “Ứng tuyển ngay”. Mình khuyên bạn kiểm tra lại CV và điều kiện tuyển dụng trước khi gửi.',
      'Để ứng tuyển, bạn cần đăng nhập và có CV trong hồ sơ; trang chi tiết công việc sẽ hướng dẫn nếu còn thiếu. Mình gợi ý đọc kỹ mô tả và dùng nút “Ứng tuyển ngay” để gửi hồ sơ.',
    ],
    followUps: ['Đăng ký tài khoản thế nào?', 'CV cần có những gì?'],
  },
  {
    id: 'register',
    topic: 'Đăng ký tài khoản',
    keywords: ['dang ky', 'tao tai khoan', 'dang ky stuwork', 'tai khoan moi', 'tao account'],
    samples: ['Đăng ký StuWork thế nào?', 'Mình muốn tạo tài khoản mới.', 'Làm sao đăng ký tài khoản tìm việc?'],
    answers: [
      'Bạn mở trang tài khoản và chọn “Đăng ký”, sau đó điền thông tin theo hướng dẫn trên biểu mẫu. Mình khuyên bạn dùng email có thể truy cập và giữ mật khẩu riêng tư.',
      'Mình gợi ý bạn chọn mục “Đăng ký” trên trang đăng nhập rồi hoàn tất các trường bắt buộc. Nếu gặp lỗi, bạn hãy kiểm tra thông báo trên biểu mẫu hoặc gửi yêu cầu hỗ trợ.',
    ],
    followUps: ['Đăng nhập thế nào?', 'Liên hệ hỗ trợ ở đâu?'],
  },
  {
    id: 'login',
    topic: 'Đăng nhập',
    keywords: ['dang nhap', 'login', 'vao tai khoan', 'quen mat khau', 'khong dang nhap duoc'],
    samples: ['Mình đăng nhập StuWork thế nào?', 'Không đăng nhập được thì làm sao?', 'Quên mật khẩu thì phải làm gì?'],
    answers: [
      'Bạn chọn “Đăng nhập” và nhập thông tin tài khoản trên biểu mẫu. Nếu quên mật khẩu, mình gợi ý dùng mục khôi phục mật khẩu hoặc liên hệ hỗ trợ khi vẫn gặp khó khăn.',
      'Mình khuyên bạn kiểm tra email, mật khẩu và thông báo lỗi trên trang đăng nhập. Nếu chưa có tài khoản, bạn có thể chuyển sang mục đăng ký trước nhé.',
    ],
    followUps: ['Tạo tài khoản mới thế nào?', 'Liên hệ hỗ trợ ở đâu?'],
  },
  {
    id: 'support',
    topic: 'Liên hệ hỗ trợ',
    keywords: ['lien he ho tro', 'gui thac mac', 'lien he admin', 'bao loi', 'bieu mau lien he'],
    samples: ['Mình liên hệ hỗ trợ bằng cách nào?', 'Báo lỗi trang web ở đâu?', 'Làm sao gửi thắc mắc cho StuWork?'],
    answers: [
      'Bạn có thể dùng biểu mẫu liên hệ trên StuWork, điền họ tên, email, chủ đề và nội dung rồi gửi. Mình gợi ý mô tả rõ vấn đề và không gửi mật khẩu hay mã xác thực.',
      'Mình khuyên bạn gửi thắc mắc qua biểu mẫu liên hệ của StuWork và cung cấp email để được phản hồi. Nếu đã đăng nhập, bạn có thể theo dõi thông báo khi yêu cầu được xử lý.',
    ],
    followUps: ['Mình không đăng nhập được thì sao?', 'Ứng tuyển trên StuWork thế nào?'],
  },
  {
    id: 'scam-prevention',
    topic: 'Tránh lừa đảo tuyển dụng',
    keywords: ['lua dao tuyen dung', 'viec nhe luong cao', 'dat coc', 'phi ung tuyen', 'ma otp'],
    samples: ['Làm sao tránh lừa đảo khi tìm việc?', 'Nhà tuyển dụng yêu cầu đặt cọc có đáng ngờ không?', 'Mình cần kiểm tra gì trước khi ứng tuyển?'],
    answers: [
      'Mình khuyên bạn kiểm tra thông tin doanh nghiệp qua kênh chính thức và cảnh giác với yêu cầu đóng phí hoặc đặt cọc để được nhận việc. Đừng cung cấp mật khẩu, mã OTP hay chuyển tiền khi chưa xác minh rõ.',
      'Lời hứa thu nhập quá dễ dàng, thông tin công ty mập mờ hoặc yêu cầu chuyển tiền gấp là những dấu hiệu cần thận trọng. Mình gợi ý dừng trao đổi, xác minh qua kênh chính thức và báo hỗ trợ nếu nghi ngờ.',
    ],
    followUps: ['Liên hệ hỗ trợ StuWork thế nào?', 'Cần hỏi gì trước khi nhận việc?'],
  },
  {
    id: 'study-work-balance',
    topic: 'Cân bằng học và thực tập',
    keywords: ['can bang hoc va lam', 'lich thuc tap', 'lich hoc', 'quan ly thoi gian', 'qua tai'],
    samples: ['Làm sao cân bằng học và thực tập?', 'Mình sợ lịch thực tập ảnh hưởng việc học.', 'Sắp xếp thời gian đi làm và đi học thế nào?'],
    answers: [
      'Mình gợi ý bạn ghi rõ lịch học, thời hạn bài tập và thời gian có thể đi làm trước khi ứng tuyển. Hãy trao đổi lịch với nơi thực tập và dành thời gian nghỉ để tránh quá tải.',
      'Bạn có thể ưu tiên việc học quan trọng, chia nhỏ công việc và kiểm tra lịch hằng tuần. Mình nghĩ nên nói sớm với người hướng dẫn nếu lịch thực tập không còn phù hợp.',
    ],
    followUps: ['Intern và part-time khác nhau thế nào?', 'Khi mệt nên làm gì?'],
  },
  {
    id: 'tired',
    topic: 'Khi thấy mệt',
    keywords: ['met qua', 'kiet suc', 'buon ngu', 'ap luc', 'can nghi ngoi'],
    samples: ['Mình mệt quá.', 'Hôm nay mình thấy kiệt sức.', 'Vừa học vừa tìm việc làm mình mệt.'],
    answers: [
      'Nghe có vẻ bạn đã cố gắng nhiều rồi. Mình mong bạn có thể nghỉ một chút, uống nước và chọn một việc nhỏ để làm khi thấy sẵn sàng nhé.',
      'Mình tiếc vì bạn đang mệt. Bạn có thể tạm rời màn hình và nghỉ ngơi, rồi chia việc thành từng bước nhỏ thay vì phải giải quyết tất cả ngay.',
    ],
    followUps: ['Cân bằng học và thực tập thế nào?', 'Kể mình nghe một câu đùa nhé?'],
  },
  {
    id: 'sad',
    topic: 'Khi thấy buồn',
    keywords: ['buon qua', 'that vong', 'chan nan', 'khong vui', 'bi tu choi'],
    samples: ['Mình buồn vì bị từ chối.', 'Hôm nay mình không vui.', 'Tìm việc mãi làm mình nản.'],
    answers: [
      'Mình tiếc vì bạn đang trải qua cảm giác này, bị từ chối có thể rất khó chịu. Bạn có thể nghỉ một chút và chia sẻ với người bạn tin tưởng; khi sẵn sàng, mình cùng bạn xem lại hồ sơ nhé.',
      'Mình nghe bạn, việc tìm việc đôi khi khiến mình thấy nản. Kết quả của một lần ứng tuyển không định nghĩa giá trị của bạn, và bạn không cần xử lý mọi thứ một mình.',
    ],
    followUps: ['Làm sao cải thiện CV?', 'Cân bằng việc học và tìm việc thế nào?'],
  },
  {
    id: 'joke',
    topic: 'Trò chuyện vui',
    keywords: ['ke chuyen cuoi', 'dua mot cau', 'chuyen vui', 'lam minh cuoi', 'joke'],
    samples: ['Kể mình nghe một câu đùa đi.', 'Có chuyện gì vui không?', 'Đùa một câu cho đỡ căng thẳng nhé.'],
    answers: [
      'Mình có câu này nhé: CV đi phỏng vấn mang gì? Mang theo kinh nghiệm, dù chỉ là kinh nghiệm làm bài nhóm!',
      'Mình đùa nhẹ nhé: Sinh viên hỏi lịch thực tập có linh hoạt không, lịch bảo “mình cũng đang cố xoay đây!”. Hy vọng bạn có một khoảng nghỉ vui vẻ.',
    ],
    followUps: ['CV sinh viên nên viết gì?', 'Làm sao cân bằng học và thực tập?'],
  },
  {
    id: 'job-search',
    topic: 'Tìm việc trên StuWork',
    keywords: ['tim viec', 'tim cong viec', 'loc viec lam', 'tim tuyen dung', 'vi tri phu hop'],
    samples: ['Tìm việc trên StuWork thế nào?', 'Mình tìm công việc phù hợp bằng cách nào?', 'Có cách nào lọc tin tuyển dụng không?'],
    answers: [
      'Mình gợi ý bạn tìm theo tên vị trí hoặc kỹ năng, sau đó xem thêm ngành nghề và địa điểm phù hợp. Hãy đọc kỹ mô tả, lịch làm và yêu cầu trước khi ứng tuyển.',
      'Bạn có thể dùng ô tìm kiếm và các bộ lọc trên trang chủ để thu hẹp danh sách việc làm. Mình khuyên bạn kiểm tra hạn tuyển và thông tin doanh nghiệp trong trang chi tiết.',
    ],
    followUps: ['Ứng tuyển trên StuWork thế nào?', 'Làm sao tránh lừa đảo tuyển dụng?'],
  },
  {
    id: 'portfolio',
    topic: 'Chuẩn bị portfolio',
    keywords: ['portfolio', 'ho so du an', 'san pham ca nhan', 'du an mau', 'trinh bay san pham'],
    samples: ['Làm portfolio như thế nào?', 'Mình nên đưa dự án nào vào portfolio?', 'Chưa có khách hàng thì làm portfolio được không?'],
    answers: [
      'Mình gợi ý bạn chọn vài dự án liên quan và trình bày mục tiêu, vai trò, cách thực hiện cùng kết quả. Dự án môn học hoặc cá nhân đều phù hợp nếu bạn nói rõ bối cảnh và phần việc của mình.',
      'Bạn có thể bắt đầu bằng một sản phẩm nhỏ tự thực hiện rồi mô tả quá trình và điều đã học. Mình khuyên bạn chỉ chia sẻ nội dung được phép công khai và ghi nguồn khi cần.',
    ],
    followUps: ['Chưa có kinh nghiệm viết CV sao?', 'Làm sao nổi bật khi ứng tuyển?'],
  },
  {
    id: 'remote-internship',
    topic: 'Thực tập từ xa',
    keywords: ['thuc tap tu xa', 'intern remote', 'lam viec online', 'thuc tap online', 'lam viec tai nha'],
    samples: ['Thực tập từ xa cần lưu ý gì?', 'Intern remote có phù hợp với sinh viên không?', 'Mình nên hỏi gì về công việc thực tập online?'],
    answers: [
      'Mình gợi ý bạn hỏi rõ lịch làm, cách giao việc, người hướng dẫn và các buổi gặp trực tuyến. Bạn cũng nên kiểm tra yêu cầu về thiết bị và bảo mật thông tin trước khi nhận việc.',
      'Thực tập từ xa có thể thuận tiện nhưng cần tự quản lý thời gian và chủ động trao đổi. Mình khuyên bạn xác minh doanh nghiệp và thống nhất cách đánh giá công việc từ đầu.',
    ],
    followUps: ['Cân bằng học và thực tập thế nào?', 'Làm sao nhận biết tin lừa đảo?'],
  },
  {
    id: 'application-follow-up',
    topic: 'Theo dõi hồ sơ ứng tuyển',
    keywords: ['theo doi ung tuyen', 'chua nhan phan hoi', 'hoi ket qua', 'sau khi nop cv', 'email nha tuyen dung'],
    samples: ['Nộp CV rồi chưa được phản hồi thì sao?', 'Mình có nên hỏi kết quả ứng tuyển không?', 'Theo dõi hồ sơ sau khi nộp thế nào?'],
    answers: [
      'Mình gợi ý bạn kiểm tra email, cả thư rác, và xem thời hạn phản hồi trong tin tuyển dụng nếu có. Sau khoảng thời gian hợp lý, bạn có thể gửi lời nhắn lịch sự qua kênh liên hệ chính thức để hỏi trạng thái.',
      'Bạn có thể ghi lại vị trí đã ứng tuyển và theo dõi các thông báo liên quan. Nếu muốn hỏi thêm, mình khuyên bạn giới thiệu ngắn gọn, nêu thời điểm ứng tuyển và cảm ơn nhà tuyển dụng.',
    ],
    followUps: ['Ứng tuyển trên StuWork thế nào?', 'Chuẩn bị phỏng vấn ra sao?'],
  },
  {
    id: 'online-interview',
    topic: 'Phỏng vấn trực tuyến',
    keywords: ['phong van online', 'phong van truc tuyen', 'kiem tra micro', 'ket noi mang', 'goi video'],
    samples: ['Phỏng vấn online cần chuẩn bị gì?', 'Làm sao chuẩn bị cho buổi gọi phỏng vấn?', 'Mạng yếu khi phỏng vấn trực tuyến phải làm sao?'],
    answers: [
      'Mình gợi ý bạn kiểm tra mạng, camera và micro trước buổi phỏng vấn, đồng thời chọn nơi yên tĩnh. Hãy chuẩn bị thông tin liên hệ của nhà tuyển dụng để báo nếu gặp sự cố.',
      'Bạn nên thử đường dẫn họp, sạc thiết bị và chuẩn bị CV cùng vài ghi chú ngắn. Nếu kết nối gặp vấn đề, mình khuyên bạn báo ngay và thống nhất cách tiếp tục với người phỏng vấn.',
    ],
    followUps: ['Phỏng vấn thường hỏi gì?', 'Mặc gì khi phỏng vấn?'],
  },
  {
    id: 'internship-terms',
    topic: 'Thỏa thuận và quyền lợi thực tập',
    keywords: ['quyen loi thuc tap', 'thoa thuan thuc tap', 'hop dong', 'lich lam viec', 'nguoi huong dan'],
    samples: ['Trước khi nhận thực tập cần hỏi gì?', 'Mình nên xem những điều khoản nào?', 'Thực tập sinh cần làm rõ quyền lợi gì?'],
    answers: [
      'Mình gợi ý bạn làm rõ nhiệm vụ, lịch làm, khoản hỗ trợ, người hướng dẫn và điều kiện kết thúc thực tập. Bạn nên đọc kỹ thỏa thuận bằng văn bản và hỏi lại những điều chưa rõ trước khi đồng ý.',
      'Hãy trao đổi về mục tiêu học tập, thời gian thực tập, chế độ và các giấy tờ cần thiết. Mình khuyên bạn giữ bản thỏa thuận và tìm tư vấn phù hợp nếu cần xác định quyền lợi theo pháp luật.',
    ],
    followUps: ['Hỏi lương khi phỏng vấn thế nào?', 'Làm sao tránh lừa đảo tuyển dụng?'],
  },
]
