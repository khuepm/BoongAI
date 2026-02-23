# BoongAI

BoongAI là một Chrome Extension giúp tự động tạo câu trả lời AI trong các khung bình luận trên Facebook.

## Cấu trúc thư mục

- `manifest.json`: Cấu hình của Chrome Extension.
- `content.js`: Script được inject thẳng vào trang web (*.facebook.com) để xử lý DOM và bắt event.
- `popup.html` / `popup.js`: Giao diện nhỏ hiện ra khi người dùng click vào icon extension trên thanh công cụ duyệt web.
- `Design/`: Thư mục chứa các bản thiết kế giao diện (UI) cho Popup. Mọi mockup/design xin hãy bỏ vào đây.

## Cách chạy thử

1. Bật trình duyệt Chrome/Edge/Brave.
2. Truy cập vào đường dẫn: `chrome://extensions/`
3. Bật chế độ **Developer mode** ở góc phải trên cùng.
4. Click nút **Load unpacked** và chọn thư mục của dự án này (`BoongAI`).
5. Vào Facebook và mở console lên xem content script đã được nạp thành công chưa. Mở icon extension lên để xem giao diện popup.
