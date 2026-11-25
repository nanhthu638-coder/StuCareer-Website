# StuCareer

## Luồng tuyển dụng

- Nhà tuyển dụng mở **Thông tin doanh nghiệp → Danh sách ứng viên** để xem hồ sơ, thông tin liên hệ, trường/ngành, kỹ năng và thư giới thiệu.
- Nhà tuyển dụng có thể tải CV, chọn **Trúng tuyển** hoặc **Từ chối** để cập nhật kết quả. Kết quả được lưu trong cơ sở dữ liệu; email thông báo được gửi nếu SMTP đã cấu hình và trạng thái gửi được ghi nhận.
- Hồ sơ chờ xử lý và hồ sơ trúng tuyển chiếm slot. Hồ sơ bị từ chối hoặc ứng viên rút đơn sẽ giải phóng slot. Kiểm tra slot và ghi đơn được thực hiện trong transaction.
- Ứng viên có thể lưu tin tuyển dụng; bookmark được lưu trong cơ sở dữ liệu.

Để phân quyền ứng viên, tên doanh nghiệp trong **Thông tin doanh nghiệp** phải trùng tên công ty trên tin tuyển dụng (không phân biệt chữ hoa/chữ thường).

## Khởi chạy

## 4. Khởi chạy
```bash
npm install
npm run dev
```

SQLite là mặc định và không cần tạo `.env`. Khi khởi động lần đầu, 12 tin tuyển dụng mẫu được thêm vào cơ sở dữ liệu; các lần sau không tạo bản ghi trùng. Danh sách, chi tiết, ứng tuyển và tin đã lưu cùng sử dụng dữ liệu trong cơ sở dữ liệu. Schema SQLite tự bổ sung các cột và bảng cần thiết khi máy chủ khởi động.

## Tài khoản nhà tuyển dụng và quản trị

Để tạo tài khoản employer khi khởi động API, cấu hình đầy đủ `EMPLOYER_NAME`, `EMPLOYER_EMAIL`, `EMPLOYER_PHONE` và `EMPLOYER_PASSWORD`. Tài khoản được tạo một lần với role `employer`; thông tin doanh nghiệp có thể cập nhật sau khi đăng nhập.

Tài khoản quản trị tùy chọn được tạo khi cấu hình đầy đủ `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE` và `ADMIN_PASSWORD`. Không đưa mật khẩu thật vào Git.

Ví dụ PowerShell (thay các giá trị mẫu trước khi chạy):

```powershell
$env:EMPLOYER_NAME = "Nhà tuyển dụng StuWork"
$env:EMPLOYER_EMAIL = "employer@example.com"
$env:EMPLOYER_PHONE = "0912345678"
$env:EMPLOYER_PASSWORD = "ThayBangMatKhauItNhat8KyTu"
npm run dev
```

## Nạp dữ liệu demo

Đặt `DEMO_PASSWORD` (8–72 byte) trong `.env.demo`, sau đó chạy:

```bash
npm run db:seed:demo
```

Lệnh thêm một doanh nghiệp demo, ba tin đã duyệt, bốn ứng viên có hồ sơ/CV, các đơn ở trạng thái chờ/trúng tuyển/từ chối và tin đã lưu. Có thể chạy lại mà không tạo bản ghi trùng. Mật khẩu demo được lấy từ `DEMO_PASSWORD`; không lưu mật khẩu vào tài liệu hoặc Git.

- Nhà tuyển dụng: `demo.employer@stucareer.test`
- Ứng viên: `demo.student.01@stucareer.test` đến `demo.student.04@stucareer.test`

Đăng nhập nhà tuyển dụng, mở **Thông tin doanh nghiệp → Danh sách ứng viên** để xem hồ sơ và tải CV. Đăng nhập ứng viên để xem **Lịch sử ứng tuyển** và **Tin tuyển dụng đã lưu**.

## Dùng SQL Server

Project có file `.env.example` làm mẫu; `.env` chỉ dùng local và không đưa lên Git. SQL Server Login cần username và password. Với SQL Server Express, có thể cấu hình host `localhost` và instance `SQLEXPRESS`; để trống `SQL_PORT` nếu SQL Server Browser đang chạy. Trước tiên tạo database `StuCareer-Website`, cấp quyền đọc/ghi và quyền tạo/sửa bảng, sau đó cấu hình:

```dotenv
DB_PROVIDER=sqlserver
SQL_SERVER=localhost
SQL_INSTANCE=SQLEXPRESS
SQL_PORT=
SQL_DATABASE=StuCareer-Website
SQL_USER=stucareer_app
SQL_PASSWORD="thay-bang-mat-khau-local"
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
```

API tự tạo/cập nhật schema khi khởi động. Nếu dùng port cố định, điền `SQL_PORT` và để `SQL_INSTANCE` trống. SMTP có thể cấu hình bằng các biến `SMTP_*` và `MAIL_FROM`; nếu chưa cấu hình, kết quả email vẫn được ghi nhận trong outbox.

Để chuyển dữ liệu từ SQLite, database SQL Server đích phải tồn tại và các bảng đích phải trống:

```powershell
npm run db:migrate:sqlserver
```

Mặc định nguồn là `server/data/stuwork.sqlite`; có thể chỉ định nguồn khác bằng `$env:SQLITE_SOURCE`. Script từ chối migrate nếu bảng ứng dụng ở đích đã có dữ liệu. Dữ liệu ứng viên, tin tuyển dụng, đơn, bookmark và email outbox được chuyển nếu các bảng tương ứng có trong nguồn. CV là các file riêng; giữ hoặc sao chép thư mục `server/data/cvs` cùng dữ liệu.

## Dữ liệu local

SQLite và các file WAL/SHM nằm trong `server/data/`. Không xóa các file này khi ứng dụng đang chạy; hãy sao lưu cả bộ trước khi di chuyển dữ liệu. Không commit `.env`, cơ sở dữ liệu local hoặc CV ứng viên.
