

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

Để bật hộp thư hỗ trợ, cấu hình đầy đủ `SUPPORT_NAME`, `SUPPORT_EMAIL`, `SUPPORT_PHONE` và `SUPPORT_PASSWORD` trước khi chạy API. Nếu không cấu hình, tài khoản hỗ trợ sẽ không được tạo. Phiên đăng nhập được lưu trong bộ nhớ và hết hạn sau 12 giờ; khởi động lại API sẽ kết thúc các phiên hiện tại.

Để tạo tài khoản employer riêng, cấu hình đầy đủ `EMPLOYER_NAME`, `EMPLOYER_EMAIL`, `EMPLOYER_PHONE` và `EMPLOYER_PASSWORD` trước khi chạy API. Tài khoản được tạo một lần với role `employer`; thông tin doanh nghiệp có thể cập nhật sau khi đăng nhập. Không đưa mật khẩu thật vào Git. Ví dụ trong PowerShell (thay các giá trị mẫu trước khi chạy):

```powershell
$env:EMPLOYER_NAME = "Nhà tuyển dụng StuWork"
$env:EMPLOYER_EMAIL = "employer@example.com"
$env:EMPLOYER_PHONE = "0912345678"
$env:EMPLOYER_PASSWORD = "ThayBangMatKhauItNhat8KyTu"
npm run dev
```

SQLite và các file WAL/SHM nằm trong `server/data/` và không được Git theo dõi. Không xóa các file này khi ứng dụng đang chạy; hãy sao lưu cả bộ trước khi di chuyển dữ liệu.

## Dùng SQL Server

Project có file `.env` để cấu hình local (không đưa lên Git) và `.env.example` làm mẫu. SQL Server Login cần **username và password**, không cần email. Bạn tự chọn username, ví dụ `stucareer_app`, và mật khẩu khi tạo SQL Login; không gửi mật khẩu qua chat.

Với instance SQL Server Express hiện tại, cấu hình host là `localhost`, instance là `SQLEXPRESS`. Có thể để trống `SQL_PORT` nếu SQL Server Browser đang chạy; chỉ điền port nếu đã cấu hình instance dùng TCP port cố định. Trước tiên tạo database `StuCareer-Website`, cấp quyền đọc/ghi và quyền tạo/sửa bảng cho SQL Login. Sau đó điền `SQL_USER` và `SQL_PASSWORD` trong `.env`:

```dotenv
DB_PROVIDER=sqlserver
SQL_SERVER=localhost
SQL_INSTANCE=SQLEXPRESS
SQL_PORT=
SQL_DATABASE=StuCareer-Website
SQL_USER=stucareer_app
SQL_PASSWORD="thay-bang-mat-khau-ban-da-tao"
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
```

Sau khi điền xong, `npm run dev` sẽ đọc `.env`; API tự tạo/cập nhật schema ứng dụng khi khởi động. Nếu dùng port cố định, điền `SQL_PORT` và để `SQL_INSTANCE` trống. Không commit `.env` hoặc chia sẻ mật khẩu.

Để chuyển dữ liệu từ SQLite hiện tại, hãy đảm bảo database SQL Server đã tồn tại và các bảng đích chưa có dữ liệu. Chạy lệnh migration trong cùng cửa sổ PowerShell đã cấu hình `DB_PROVIDER` và `SQL_*`:

```powershell
npm run db:migrate:sqlserver
```

Mặc định nguồn là `server/data/stuwork.sqlite`; có thể chỉ định nguồn khác bằng `$env:SQLITE_SOURCE`. Script từ chối migrate nếu các bảng ứng dụng ở đích đã có dữ liệu. Các file CV không nằm trong database; giữ hoặc sao chép thư mục `server/data/cvs` cùng dữ liệu.

## Kiểm tra

```bash
npm run build
npm run lint
```

## Ghi chú triển khai

Đây là nền tảng giao diện và API mẫu, chưa bao gồm xác thực email/số điện thoại, tích hợp OAuth, nhà cung cấp gửi OTP, lưu phiên đăng nhập bền vững, giới hạn tốc độ phân tán hoặc quy trình vận hành production. Cần bổ sung các thành phần đó trước khi triển khai xác thực cho người dùng thực.
