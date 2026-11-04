

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

## Kiểm tra

```bash
npm run build
npm run lint
```

## Ghi chú triển khai

Đây là nền tảng giao diện và API mẫu, chưa bao gồm phiên đăng nhập, xác thực email/số điện thoại, tích hợp OAuth, nhà cung cấp gửi OTP, giới hạn tốc độ phân tán hoặc quy trình vận hành production. Cần bổ sung các thành phần đó trước khi triển khai xác thực cho người dùng thực.
