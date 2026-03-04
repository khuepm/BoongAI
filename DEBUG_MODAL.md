# Debug Modal Guide

## Kiểm tra xem modal có hoạt động không

### 1. Mở test-modal.html
```bash
start test-modal.html
```
- Click vào link "How to get an API key?"
- Modal sẽ xuất hiện với hướng dẫn chi tiết
- Thử đổi provider để xem nội dung thay đổi

### 2. Kiểm tra trong Chrome Extension

#### Bước 1: Reload Extension
1. Mở `chrome://extensions/`
2. Tìm "BoongAI Facebook Assistant"
3. Click nút reload (icon tròn)

#### Bước 2: Mở Console để debug
1. Click chuột phải vào icon extension
2. Chọn "Inspect popup"
3. Tab Console sẽ mở ra
4. Click vào link "How to get an API key?"
5. Xem có lỗi gì trong console không

#### Bước 3: Kiểm tra elements
Trong DevTools Console, chạy:
```javascript
// Kiểm tra modal element có tồn tại không
console.log(document.getElementById('api-guide-modal'));

// Kiểm tra link có tồn tại không
console.log(document.getElementById('api-guide-link'));

// Test mở modal thủ công
document.getElementById('api-guide-modal').classList.remove('hidden');
```

### 3. Các vấn đề thường gặp

#### Modal không xuất hiện:
- ✅ Đã build lại: `npm run build`
- ✅ Đã reload extension trong Chrome
- ✅ Kiểm tra console có lỗi JavaScript không

#### Modal xuất hiện nhưng trống:
- Kiểm tra provider có được chọn đúng không
- Xem guide content có được populate không

#### Styling không đúng:
- Kiểm tra file popup.css đã được copy vào dist/
- Reload lại extension

### 4. Test thủ công trong Console

Mở DevTools của popup và chạy:

```javascript
// Test 1: Kiểm tra tất cả elements
const modal = document.getElementById('api-guide-modal');
const link = document.getElementById('api-guide-link');
const closeBtn = document.getElementById('close-modal');
const content = document.getElementById('guide-content');

console.log('Modal:', modal);
console.log('Link:', link);
console.log('Close button:', closeBtn);
console.log('Content:', content);

// Test 2: Mở modal thủ công
modal.classList.remove('hidden');

// Test 3: Kiểm tra nội dung
console.log('Content HTML:', content.innerHTML);

// Test 4: Đóng modal
modal.classList.add('hidden');
```

### 5. Kiểm tra file đã được build

```bash
# Kiểm tra file popup.js đã được build
ls -la dist/popup.js

# Kiểm tra file popup.html
ls -la dist/popup.html

# Kiểm tra file popup.css
ls -la dist/popup.css
```

### 6. Build lại và test

```bash
# Clean build
rm -rf dist/
npm run build

# Reload extension trong Chrome
# Sau đó test lại
```

## Expected Behavior

Khi click vào "How to get an API key?":
1. Modal sẽ xuất hiện với overlay đen mờ
2. Hiển thị tiêu đề "Get API Key"
3. Hiển thị 3-4 bước hướng dẫn với số thứ tự
4. Hiển thị warning box màu vàng
5. Có nút "Open [Provider] Site" ở footer
6. Có nút X để đóng modal

## Screenshots Location

Nếu cần, chụp màn hình và lưu vào:
- `screenshots/modal-openai.png`
- `screenshots/modal-gemini.png`
- `screenshots/modal-claude.png`
