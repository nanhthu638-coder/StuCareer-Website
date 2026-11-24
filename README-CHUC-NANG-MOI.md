# Chức năng mới trong StuCareer

## 1. Quản lý ứng viên (tài khoản nhà tuyển dụng)
- Mở **Thông tin doanh nghiệp** từ menu tài khoản.
- Chọn tab **Danh sách ứng viên** để xem hồ sơ, thông tin liên hệ, trường/ngành, kỹ năng và thư giới thiệu.
- Chọn **Tải CV** để tải CV ứng viên.
- Chọn **Trúng tuyển** hoặc **Từ chối** để cập nhật kết quả.

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

## 4. Khởi chạy
```bash
npm install
npm run dev
```

Có thể chạy ở chế độ SQLite mặc định mà không cần tạo `.env`. Khi máy chủ khởi động lần đầu, 12 tin tuyển dụng mẫu sẽ được thêm vào cơ sở dữ liệu; các lần chạy sau không tạo bản ghi trùng. Danh sách, chi tiết, ứng tuyển và tin đã lưu cùng sử dụng dữ liệu trong cơ sở dữ liệu.

Cơ sở dữ liệu hiện tại sẽ tự động thêm các cột còn thiếu cho tin tuyển dụng, cột `decision_status` và bảng `bookmarks` khi máy chủ khởi động.

## 5. Nạp dữ liệu demo để xem các luồng tuyển dụng

Đặt `DEMO_PASSWORD` (8–72 byte) trong file `.env.demo`, sau đó chạy:

```bash
npm run db:seed:demo
```

Lệnh thêm một doanh nghiệp demo, ba tin đã duyệt, bốn ứng viên có hồ sơ/CV, các đơn ở trạng thái chờ/trúng tuyển/từ chối và tin đã lưu. Có thể chạy lại mà không tạo bản ghi trùng. Các tài khoản demo dùng chung `DEMO_PASSWORD`:

- Nhà tuyển dụng: `demo.employer@stucareer.test`
- Ứng viên: `demo.student.01@stucareer.test` đến `demo.student.04@stucareer.test`
- Mật khẩu: 31f0b2ed20b41b0287d5480799e60e57d86a

Đăng nhập nhà tuyển dụng, mở **Thông tin doanh nghiệp → Danh sách ứng viên** để xem hồ sơ và tải CV. Đăng nhập ứng viên rồi mở menu tài khoản để xem **Lịch sử ứng tuyển** và **Tin tuyển dụng đã lưu**. Ba tin mẫu mới cũng xuất hiện trên trang chủ.
