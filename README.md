# BoongAI Facebook Assistant

Chrome Extension for AI-powered Facebook comment assistance using @BoongAI mentions.

## Project Structure

```
├── src/
│   ├── background/          # Background service worker
│   │   └── background.ts
│   ├── content/             # Content scripts for Facebook
│   │   ├── content.ts
│   │   ├── domObserver.ts
│   │   ├── contextScraper.ts
│   │   ├── autoInjector.ts
│   │   └── ghostUIManager.ts
│   ├── popup/               # Extension popup UI
│   │   └── popup.ts
│   ├── utils/               # Utility modules
│   │   ├── configurationManager.ts
│   │   ├── apiValidator.ts
│   │   ├── aiCommunicator.ts
│   │   └── errorHandler.ts
│   └── types/               # TypeScript type definitions
│       └── index.ts
├── dist/                    # Build output (generated)
├── manifest.json            # Chrome Extension manifest
├── popup.html               # Popup UI HTML
├── popup.css                # Popup UI styles
├── tsconfig.json            # TypeScript configuration
├── webpack.config.js        # Webpack build configuration
├── jest.config.js           # Jest test configuration
└── package.json             # NPM dependencies and scripts

```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

## Development

- Build for development with watch mode:
```bash
npm run dev
```

- Run tests:
```bash
npm test
```

- Run tests with coverage:
```bash
npm run test:coverage
```

## Usage

1. Click the extension icon to open the popup
2. Configure your AI provider (OpenAI, Gemini, or Claude)
3. Enter your API key
4. Enable the master switch
5. On Facebook, type `@BoongAI [your request]` in a comment
6. The extension will automatically generate and post a reply

## Features

- Multiple AI provider support (OpenAI, Gemini, Claude)
- Automatic post content extraction
- Smart mention detection and highlighting
- Secure API key storage with encryption
- Error handling with user-friendly messages
- Property-based testing for correctness guarantees

## Requirements

- Chrome browser version 88 or higher
- Valid API key for at least one AI provider (OpenAI, Google Gemini, or Anthropic Claude)

## BoongAI

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
