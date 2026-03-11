# Test Commands - Paste vào Console

## 1. Kiểm tra Extension Config
Paste vào console của trang Facebook:
```javascript
chrome.storage.local.get(null, (result) => {
  console.log('Extension Config:', result);
});
```

Kết quả nên có:
- `masterSwitch: true` (nếu false thì extension đang tắt)
- `apiKey: "..."` (encrypted)
- `aiProvider: "openai"` hoặc provider khác

## 2. Bật Extension thủ công
Nếu masterSwitch = false, paste lệnh này:
```javascript
chrome.storage.local.set({ masterSwitch: true }, () => {
  console.log('Master switch enabled');
  location.reload();
});
```

## 3. Kiểm tra Extension có đang chạy không
```javascript
// Kiểm tra DOMObserver
console.log('Extension active:', window.isBoongAIActive);
```

## 4. Test manual trigger
Paste vào console để test thủ công:
```javascript
// Simulate comment submission
const testComment = {
  commentId: 'test-123',
  commentText: '@BoongAI summarize this post',
  postId: 'post-456',
  timestamp: Date.now()
};

// This should trigger the handler
console.log('Testing with:', testComment);
```
