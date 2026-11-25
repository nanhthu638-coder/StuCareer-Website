# Chức năng mới trong StuCareer

## 1. Quản lý ứng viên (tài khoản nhà tuyển dụng)
- Mở **Thông tin doanh nghiệp** từ menu tài khoản.
- Chọn tab **Danh sách ứng viên** để xem hồ sơ, thông tin liên hệ, trường/ngành, kỹ năng và thư giới thiệu.
- Chọn **Tải CV** để tải CV ứng viên.
- Chọn **Trúng tuyển** hoặc **Từ chối** để cập nhật kết quả.
- Khi ứng viên nộp hồ sơ, biểu tượng chuông của đúng tài khoản nhà tuyển dụng hiện thông báo tên ứng viên và vị trí. Bấm thông báo để mở thẳng **Danh sách ứng viên**. Trạng thái đã đọc được lưu trong cơ sở dữ liệu.

Lưu ý: Để phân quyền dữ liệu trong phiên bản hiện tại, tên doanh nghiệp trong **Thông tin doanh nghiệp** phải trùng với tên công ty của tin tuyển dụng (không phân biệt chữ hoa/chữ thường).

## 2. Quy tắc slot
- Hồ sơ chờ xử lý và hồ sơ trúng tuyển đều chiếm slot.
- Hồ sơ bị từ chối không còn chiếm slot, vì vậy slot được giải phóng.
- Ứng viên rút đơn cũng giải phóng slot như trước.
- Việc kiểm tra và cập nhật kết quả được thực hiện trong transaction để tránh cập nhật đồng thời gây sai số.

## 3. Lưu tin tuyển dụng
- Ứng viên đăng nhập, mở chi tiết tin và bấm **Lưu tin tuyển dụng**.
- Mở menu tài khoản để xem mục **Tin tuyển dụng đã lưu**.
- Có thể bỏ lưu ngay tại trang chi tiết tin.
- Bookmark được lưu trong cơ sở dữ liệu, không mất khi đăng xuất.

## 4. Đăng và quản lý tin tuyển dụng (nhà tuyển dụng)
- Đăng nhập tài khoản nhà tuyển dụng, mở **Thông tin doanh nghiệp → Tin tuyển dụng**. Cần lưu tên doanh nghiệp trước; tin đăng sẽ mang tên doanh nghiệp này.
- **Đăng tin mới**: tiêu đề, lĩnh vực, hình thức, địa điểm, lương, số lượng tuyển, hạn nộp, mô tả, yêu cầu, quyền lợi. Tin mới ở trạng thái **Chờ duyệt** và chỉ hiện trên trang chủ sau khi quản trị viên duyệt.
- **Sửa**: lưu thay đổi sẽ đưa tin về **Chờ duyệt** để admin kiểm tra lại. Số lượng tuyển không được nhỏ hơn số hồ sơ đang chiếm slot.
- **Ẩn tin / Hiện lại / Đóng tuyển / Mở lại**: nhà tuyển dụng tự đổi giữa các trạng thái đã duyệt. Duyệt hoặc từ chối tin vẫn do admin thực hiện.
- **Xóa**: chỉ xóa được tin chưa có hồ sơ ứng tuyển nào (tin có hồ sơ hãy dùng Ẩn tin hoặc Đóng tuyển để không mất lịch sử ứng viên). Bookmark của tin bị xóa cũng được dọn.
- Nhà tuyển dụng chỉ thấy và thao tác trên tin có tên công ty trùng với doanh nghiệp của mình (không phân biệt hoa/thường).

## 5. Thông báo việc làm mới phù hợp (ứng viên)
- Biểu tượng chuông dùng các tin đã duyệt thật trong cơ sở dữ liệu, so khớp với **ngành học** (theo lĩnh vực tương ứng) hoặc **kỹ năng** trong hồ sơ.
- Tin vừa được duyệt tự xuất hiện sau tối đa 1 phút, không cần tải lại trang.
- Bấm vào thông báo để xem trước, chọn **Xem ngay** để mở chi tiết tin. Trạng thái đã đọc được lưu theo từng tài khoản trên trình duyệt.

## 6. Biểu mẫu thắc mắc (admin xử lý, người gửi nhận thông báo)
- Người dùng gửi biểu mẫu ở cuối trang chủ. Nếu đã đăng nhập, họ tên và email được điền sẵn và thắc mắc được gắn với tài khoản.
- Admin mở mục **Biểu mẫu thắc mắc** trên trang quản trị (có số thắc mắc mới) để xem danh sách người gửi, lọc theo trạng thái, **Tiếp nhận** hoặc **Đã xử lý** và có thể nhập phản hồi.
- Khi bấm **Đã xử lý**, người gửi nhận email (ghi vào nhật ký nếu chưa cấu hình SMTP) và, nếu gửi lúc đã đăng nhập, thấy thông báo trên biểu tượng chuông (ứng viên và nhà tuyển dụng). Khách chưa đăng nhập chỉ nhận email.
- Nhân viên hỗ trợ (role `support`) vẫn dùng được trang hỗ trợ và cũng kích hoạt thông báo khi chuyển sang **Đã giải quyết**.
- Cơ sở dữ liệu cũ tự thêm các cột `user_id`, `resolution_note`, `resolved_at`, `user_seen` khi máy chủ khởi động (SQLite và SQL Server).

## 7. Chatbot đồng bộ với tin tuyển dụng
- Chatbot lấy việc làm từ cùng nguồn với trang chủ (`/api/jobs`) và số slot còn lại từ `/api/jobs/availability`, tải lại mỗi khi bạn gửi tin nhắn.
- Tăng/giảm slot, đăng tin mới (sau khi admin duyệt), ẩn, đóng hoặc xóa tin đều được phản ánh ngay. Thẻ việc làm hiển thị "Còn X/Y slot".
- Tin đã hết slot hoặc quá hạn không được gợi ý; nếu chỉ còn tin hết chỗ, chatbot sẽ báo rõ.
- Thẻ công ty liệt kê các vị trí đang còn slot. Công ty do nhà tuyển dụng tự tạo chưa có trang chi tiết riêng nên không có nút "Xem trang công ty".
- Thông báo "Ting ting" dùng tin mới nhất thật thay vì nội dung cố định.

## 7b. Thông tin doanh nghiệp đồng bộ lên trang công ty và chatbot
- Thông tin nhà tuyển dụng lưu ở **Thông tin doanh nghiệp** (tên, lĩnh vực, quy mô, địa chỉ, website, giới thiệu) được công khai qua `GET /api/companies` và dùng chung cho **trang CompanyDetail** (`/company/<tên-công-ty>`) và **thẻ công ty của chatbot**. Lưu xong là cả hai cập nhật.
- Công ty có hồ sơ mẫu (Shopee, FPT...) giữ logo, ảnh bìa, email và điện thoại mẫu; các trường nhà tuyển dụng đã điền sẽ được ưu tiên.
- Đổi tên doanh nghiệp sẽ tự đổi tên công ty trên các tin của doanh nghiệp đó, nên nhà tuyển dụng không mất quyền quản lý tin.

### Chatbot AI mở rộng

- Các câu hỏi ngoài bộ chủ đề CV/phỏng vấn/việc làm được gửi tới `POST /api/chat`.
- Khi chưa cấu hình AI, chatbot vẫn trả lời tại máy chủ về định hướng nghề nghiệp, portfolio, thư ứng tuyển, kỹ năng mềm và lộ trình học.
- Để bật mô hình chat tương thích OpenAI, cấu hình trong `.env`:

```env
CHATBOT_API_URL=https://api.openai.com/v1/chat/completions
CHATBOT_API_KEY=your_api_key
CHATBOT_MODEL=gpt-4o-mini
```

Khóa API chỉ được đọc ở máy chủ, không gửi xuống trình duyệt. Endpoint giới hạn độ dài tin nhắn, chỉ gửi tối đa 8 tin gần nhất và giới hạn 15 yêu cầu/phút cho mỗi người dùng hoặc địa chỉ IP.

## 8. Khởi chạy
```bash
npm install
npm run dev
```

Có thể chạy ở chế độ SQLite mặc định mà không cần tạo `.env`. Khi máy chủ khởi động lần đầu, 12 tin tuyển dụng mẫu sẽ được thêm vào cơ sở dữ liệu; các lần chạy sau không tạo bản ghi trùng. Danh sách, chi tiết, ứng tuyển và tin đã lưu cùng sử dụng dữ liệu trong cơ sở dữ liệu.

Cơ sở dữ liệu hiện tại sẽ tự động thêm các cột còn thiếu cho tin tuyển dụng, `decision_status`, `employer_seen` và bảng `bookmarks` khi máy chủ khởi động.

## 9. Tài khoản nhà tuyển dụng cho từng công ty

Chạy `npm run db:seed:companies` (cần `DEMO_PASSWORD` trong `.env.demo`) để tạo mỗi công ty trong danh mục tin mẫu một tài khoản nhà tuyển dụng riêng, kèm thông tin doanh nghiệp. Có thể chạy lại mà không tạo trùng. Tất cả dùng chung mật khẩu `DEMO_PASSWORD`.

| Công ty | Email đăng nhập |
|---|---|
| Momo | `momo@stucareer.test` |
| Shopee | `shopee@stucareer.test` |
| VNG Corporation | `vng-corporation@stucareer.test` |
| FPT Software | `fpt-software@stucareer.test` |
| Tiki | `tiki@stucareer.test` |
| StuTech Solutions | `stutech-solutions@stucareer.test` |
| Sao Mai Studio | `sao-mai-studio@stucareer.test` |
| Cà Phê Việt | `ca-phe-viet@stucareer.test` |

Mỗi tài khoản quản lý đúng các tin có tên công ty trùng với doanh nghiệp của mình (xem, sửa, ẩn, đóng, xóa tin và xử lý ứng viên). Địa chỉ `@stucareer.test` là địa chỉ giả nên không nhận được email thật. Đây là mật khẩu dùng chung cho demo, hãy đổi hoặc xóa các tài khoản này trước khi triển khai thật.


## 10. Nạp dữ liệu demo để xem các luồng tuyển dụng

Đặt `DEMO_PASSWORD` (8–72 byte) trong file `.env.demo`, sau đó chạy:

```bash
npm run db:seed:demo
```

Lệnh thêm một doanh nghiệp demo, ba tin đã duyệt, bốn ứng viên có hồ sơ/CV, các đơn ở trạng thái chờ/trúng tuyển/từ chối và tin đã lưu. Có thể chạy lại mà không tạo bản ghi trùng. Các tài khoản demo dùng chung `DEMO_PASSWORD`:

- Nhà tuyển dụng: `demo.employer@stucareer.test`
- Ứng viên: `demo.student.01@stucareer.test` đến `demo.student.04@stucareer.test`
- Mật khẩu: 31f0b2ed20b41b0287d5480799e60e57d86a

Đăng nhập nhà tuyển dụng, mở **Thông tin doanh nghiệp → Danh sách ứng viên** để xem hồ sơ và tải CV. Đăng nhập ứng viên rồi mở menu tài khoản để xem **Lịch sử ứng tuyển** và **Tin tuyển dụng đã lưu**. Ba tin mẫu mới cũng xuất hiện trên trang chủ.
