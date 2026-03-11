# Hướng dẫn Debug AI Request

## Đã thêm logging chi tiết

Extension đã được cập nhật với logging chi tiết để debug AI request. Bây giờ bạn có thể xem toàn bộ flow từ khi gửi request đến khi nhận response.

## Cách kiểm tra logs

### 1. Mở Chrome DevTools

**Cho Content Script (Facebook page):**
- Mở Facebook
- Nhấn F12 hoặc Right-click → Inspect
- Chọn tab "Console"

**Cho Background Script:**
- Vào `chrome://extensions/`
- Tìm BoongAI extension
- Click vào link "service worker" hoặc "background page"
- Console sẽ mở ra

### 2. Test lại extension

1. Vào một Facebook post
2. Viết comment: `@BoongAI test giúp tôi`
3. Submit comment
4. Quan sát logs trong cả 2 console windows

### 3. Các logs quan trọng cần kiểm tra

#### Trong Content Script Console (Facebook page):

```
[BoongAI] Comment submission detected: {...}
[BoongAI] @BoongAI trigger detected, processing...
[BoongAI] User request parsed: ...
[BoongAI] Extracting post content...
[BoongAI] Post content extracted: ...
[BoongAI] Processing indicator shown
[BoongAI] Sending AI request to background script...
```

Sau đó khi nhận response:
```
[BoongAI Content] ========== AI RESPONSE RECEIVED ==========
[BoongAI Content] Comment ID: ...
[BoongAI Content] Success: true/false
[BoongAI Content] Response: ...
```

#### Trong Background Script Console:

```
[BoongAI Background] ========== AI REQUEST START ==========
[BoongAI Background] Comment ID: ...
[BoongAI Background] User Request: ...
[BoongAI Background] Config loaded: { provider: ..., model: ..., hasApiKey: true/false }
[BoongAI Background] API key decrypted successfully
[BoongAI Background] Prompt formatted: ...
[BoongAI Background] Sending request to AI provider...
```

Trong AICommunicator:
```
[BoongAI AICommunicator] ========== API REQUEST START ==========
[BoongAI AICommunicator] Provider: openai/gemini/claude
[BoongAI AICommunicator] Model: ...
[BoongAI AICommunicator] Request URL: ...
[BoongAI AICommunicator] Response status: 200 OK
[BoongAI AICommunicator] ✅ Parsed text: ...
[BoongAI AICommunicator] ========== API REQUEST SUCCESS ==========
```

### 4. Các lỗi thường gặp

#### ❌ NO API KEY FOUND
```
[BoongAI Background] ❌ NO API KEY FOUND!
```
**Giải pháp:** Mở popup extension và nhập API key

#### ❌ Authentication failed (401)
```
[BoongAI AICommunicator] ❌ API Error Response: { error: { message: "Invalid API key" } }
```
**Giải pháp:** API key không đúng, kiểm tra lại

#### ❌ Request timed out
```
[BoongAI AICommunicator] Request timed out
```
**Giải pháp:** Mạng chậm hoặc API provider đang quá tải

#### ❌ Rate limit exceeded (429)
```
[BoongAI AICommunicator] ❌ API Error Response: { error: { message: "Rate limit exceeded" } }
```
**Giải pháp:** Đợi một lúc rồi thử lại

### 5. Kiểm tra config

Mở console và chạy:
```javascript
chrome.storage.local.get(null, (data) => console.log('Extension config:', data));
```

Bạn sẽ thấy:
- `masterSwitch`: true/false
- `aiProvider`: "openai", "gemini", hoặc "claude"
- `model`: tên model
- `apiKey`: encrypted API key
- `autoReplyEnabled`: true/false

## Các bước debug tiếp theo

1. **Kiểm tra API key có được lưu chưa:**
   - Mở popup extension
   - Xem có hiển thị "API Key: Configured ✓" không

2. **Test API key:**
   - Click nút "Test Connection" trong popup
   - Xem có báo success không

3. **Kiểm tra logs:**
   - Mở cả 2 console (content + background)
   - Test lại và copy toàn bộ logs
   - Gửi cho tôi để phân tích

## Screenshot logs

Khi test, hãy chụp màn hình hoặc copy logs từ:
1. Content Script Console (tab Console trong DevTools của Facebook page)
2. Background Script Console (mở từ chrome://extensions/)

Điều này sẽ giúp tôi xác định chính xác vấn đề ở đâu trong flow.
