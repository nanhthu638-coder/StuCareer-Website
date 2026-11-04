

# StuWork

Trang tuyển dụng dành cho sinh viên, xây dựng bằng React, Tailwind CSS và Vite. Giao diện có trang chủ responsive, đăng nhập/đăng ký, khôi phục mật khẩu bằng OTP demo và API Node.js dùng bcrypt để băm mật khẩu.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Lệnh trên khởi chạy Vite tại `http://localhost:5173` và API tại `http://localhost:3001`. Tạo tài khoản để thử đăng nhập; dữ liệu tài khoản được lưu trong SQLite tại `server/data/stuwork.sqlite` và mật khẩu được băm bằng bcrypt.

Trong môi trường phát triển, OTP được tạo ngẫu nhiên và hiển thị trong giao diện để tiện thử luồng đặt lại mật khẩu. API không gửi email hoặc SMS thật. Endpoint OTP sẽ từ chối chạy trong môi trường production cho đến khi tích hợp nhà cung cấp gửi mã. Bộ nhớ OTP và mã đặt lại chỉ tồn tại trong thời gian chạy của API.

Biểu mẫu ở mục **Liên hệ** lưu thắc mắc vào SQLite để nhân viên role `support` tiếp nhận. Để tạo tài khoản hỗ trợ lần đầu, cấu hình các biến môi trường sau trong PowerShell rồi chạy `npm run dev`:

```powershell
$env:SUPPORT_NAME = 'StuWork Support'
$env:SUPPORT_EMAIL = 'support@example.com'
$env:SUPPORT_PHONE = '0900000000'
$env:SUPPORT_PASSWORD = 'replace-with-a-strong-password'
npm run dev
```

Tài khoản chỉ được tạo nếu email chưa tồn tại; role hỗ trợ không thể tự chọn trong form đăng ký công khai. Đăng nhập bằng email hoặc số điện thoại này để mở **Hộp thư hỗ trợ**, xem các yêu cầu và cập nhật trạng thái thành mới, đang xử lý hoặc đã giải quyết. Phiên đăng nhập được giữ trong bộ nhớ API tối đa 12 giờ; khởi động lại API sẽ kết thúc các phiên hiện tại. Các biến `SUPPORT_*` chỉ dùng để tạo tài khoản ban đầu, không tự đổi mật khẩu tài khoản đã tồn tại.

## Kiểm tra

```bash
npm run build
npm run lint
```

## Ghi chú triển khai

Đây là nền tảng giao diện và API mẫu, chưa bao gồm xác thực email/số điện thoại, tích hợp OAuth, nhà cung cấp gửi OTP, giới hạn tốc độ phân tán hoặc quy trình vận hành production. Cần bổ sung các thành phần đó trước khi triển khai xác thực cho người dùng thực.
