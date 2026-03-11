    # Debug Steps - Extension không hoạt động

## Các bước kiểm tra:

### 1. Kiểm tra Extension đã load chưa
- Mở Chrome DevTools (F12) trên trang Facebook
- Vào tab Console
- Tìm message: `[BoongAI] Content Script injected into Facebook`
- Nếu không thấy → Extension chưa được inject

### 2. Kiểm tra Master Switch
- Click vào icon extension trên toolbar
- Kiểm tra toggle switch có bật (màu xanh) không
- Nếu tắt → Bật lên và thử lại

### 3. Kiểm tra Console Logs
Khi bạn gõ `@BoongAI test` trong comment box, bạn nên thấy:
```
[BoongAI] Extension enabled
```

Khi bạn submit comment, bạn nên thấy:
```
[BoongAI] Comment submission detected
```

### 4. Kiểm tra Background Script
- Vào `chrome://extensions/`
- Tìm "BoongAI Facebook Assistant"
- Click "service worker" để mở console của background script
- Kiểm tra có log không

### 5. Kiểm tra API Key
- Mở popup extension
- Kiểm tra API key đã nhập chưa
- Kiểm tra connection indicator (chấm tròn):
  - Xanh = Valid
  - Đỏ = Invalid
  - Xám = Chưa validate

### 6. Test thủ công
Thử các bước sau:
1. Reload trang Facebook (Ctrl+R hoặc Cmd+R)
2. Mở một post bất kỳ
3. Click vào comment box
4. Gõ: `@BoongAI summarize this post`
5. Nhấn Enter để submit comment
6. Kiểm tra console có log gì không

### 7. Kiểm tra Permissions
Extension cần permissions:
- `storage` - Lưu config
- `activeTab` - Truy cập tab hiện tại
- `scripting` - Inject scripts
- Host permission: `*://*.facebook.com/*`

### 8. Common Issues

#### Issue: Content script không inject
**Solution**: 
- Reload extension: Vào `chrome://extensions/` → Click reload icon
- Reload trang Facebook

#### Issue: Comment không được detect
**Solution**:
- Đảm bảo gõ đúng `@BoongAI` (không có khoảng trắng)
- Phải có text sau @BoongAI, ví dụ: `@BoongAI test`
- Phải submit comment (nhấn Enter hoặc click Post)

#### Issue: API key invalid
**Solution**:
- Kiểm tra API key đã nhập đúng chưa
- Kiểm tra provider đã chọn đúng chưa (OpenAI/Gemini/Claude)
- Test API key bằng cách mở popup và xem connection indicator

## Quick Test Command
Paste vào console để test:
```javascript
chrome.storage.local.get(null, (result) => {
  console.log('Extension Config:', result);
});
```

Kết quả nên có:
- `masterSwitch: true`
- `apiKey: "..."` (encrypted)
- `aiProvider: "openai"` hoặc provider khác
