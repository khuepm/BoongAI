# Hướng dẫn Reload Extension và Test Modal

## ✅ Build đã hoàn tất!

Modal đã được thêm vào `dist/popup.html`. Bây giờ bạn cần reload extension trong Chrome.

## 📋 Các bước thực hiện:

### Bước 1: Mở Chrome Extensions
```
chrome://extensions/
```
Hoặc: Menu (⋮) → Extensions → Manage Extensions

### Bước 2: Bật Developer Mode
- Tìm toggle "Developer mode" ở góc trên bên phải
- Bật nó lên (màu xanh)

### Bước 3: Reload Extension
- Tìm extension "BoongAI Facebook Assistant"
- Click vào icon **reload** (↻) trên card của extension
- Hoặc click "Remove" rồi "Load unpacked" và chọn lại thư mục `dist/`

### Bước 4: Test Modal
1. Click vào icon extension trên toolbar
2. Popup sẽ mở ra
3. Click vào link **"How to get an API key?"** ở cuối popup
4. Modal sẽ xuất hiện với hướng dẫn chi tiết!

## 🎯 Các tính năng của Modal:

### Khi modal mở:
- ✅ Hiển thị hướng dẫn theo provider đang chọn (OpenAI/Gemini/Claude)
- ✅ Có 3-4 bước với số thứ tự rõ ràng
- ✅ Warning box với thông tin quan trọng
- ✅ Nút "Open [Provider] Site" để mở trang chính thức

### Cách đóng modal:
- ✅ Click nút X ở góc trên
- ✅ Click vào vùng tối bên ngoài modal
- ✅ Nhấn phím ESC

### Thay đổi provider:
- Khi bạn đổi provider trong dropdown
- Nếu modal đang mở, nội dung sẽ tự động cập nhật

## 🧪 Test với file HTML độc lập:

Nếu muốn test nhanh mà không cần reload extension:
```bash
start test-modal.html
```

File này có đầy đủ chức năng modal để bạn xem trước.

## 🐛 Nếu vẫn không thấy modal:

### 1. Kiểm tra Console
- Chuột phải vào icon extension → "Inspect popup"
- Xem tab Console có lỗi gì không

### 2. Kiểm tra Elements
Trong DevTools, chạy:
```javascript
console.log(document.getElementById('api-guide-modal'));
```
Nếu trả về `null`, có nghĩa là HTML chưa được load đúng.

### 3. Force reload
```bash
# Xóa dist và build lại
rm -rf dist
npm run build

# Sau đó reload extension trong Chrome
```

### 4. Kiểm tra file size
```bash
ls -lh dist/popup.html
```
File phải có kích thước khoảng **8.77 KB** (có modal)

## 📸 Kết quả mong đợi:

### OpenAI Guide:
- Bước 1: Create OpenAI Account
- Bước 2: Add Payment Method
- Bước 3: Generate API Key
- Bước 4: Copy and Paste
- Warning: Security note

### Gemini Guide:
- Bước 1: Access Google AI Studio
- Bước 2: Navigate to API Keys
- Bước 3: Create New Key
- Bước 4: Copy Your Key
- Info: Free Tier Available

### Claude Guide:
- Bước 1: Create Anthropic Account
- Bước 2: Add Credits
- Bước 3: Generate API Key
- Bước 4: Copy and Use
- Info: Credit-Based Pricing

## 🎨 Giao diện:

- **Dark mode support**: Modal tự động theo theme của popup
- **Material Design 3**: Styling hiện đại, mượt mà
- **Responsive**: Hoạt động tốt trên mọi kích thước màn hình
- **Animations**: Smooth transitions khi mở/đóng

## ✨ Hoàn tất!

Sau khi reload extension, modal sẽ hoạt động hoàn hảo. Chúc bạn test thành công! 🚀
