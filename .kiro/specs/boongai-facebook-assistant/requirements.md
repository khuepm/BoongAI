# Requirements Document

## Introduction

BoongAI Facebook Assistant là một Chrome Extension cho phép người dùng tương tác với AI trợ lý trực tiếp trên Facebook thông qua cơ chế mention (@BoongAI). Extension hoạt động như một trợ lý ảo, tự động phân tích nội dung bài viết và trả lời bằng cách tạo comment reply dưới tên tài khoản Facebook của người dùng.

## Glossary

- **Extension**: Chrome Extension BoongAI Facebook Assistant
- **User**: Người dùng cài đặt và sử dụng Extension
- **Popup_UI**: Giao diện popup hiển thị khi User click vào icon Extension trên thanh công cụ Chrome
- **Master_Switch**: Nút bật/tắt toàn bộ hoạt động của Extension
- **AI_Provider**: Nhà cung cấp dịch vụ AI (OpenAI, Gemini, Claude)
- **API_Key**: Khóa xác thực để truy cập dịch vụ AI
- **Mention_Trigger**: Cú pháp @BoongAI được User gõ trong comment để kích hoạt Extension
- **Command_Comment**: Bình luận chứa Mention_Trigger và yêu cầu của User
- **Post_Content**: Nội dung văn bản của bài viết Facebook gốc
- **Ghost_UI**: Giao diện tạm thời chỉ User thấy, hiển thị trạng thái xử lý
- **Auto_Reply**: Bình luận phản hồi tự động được Extension tạo ra dưới tên User
- **DOM_Observer**: Module theo dõi thay đổi trên giao diện Facebook
- **Context_Scraper**: Module trích xuất nội dung bài viết
- **AI_Communicator**: Module giao tiếp với API của AI_Provider
- **Auto_Injector**: Module giả lập thao tác người dùng để tạo Auto_Reply
- **Connection_Indicator**: Chỉ báo trạng thái kết nối API (màu xanh lá = hợp lệ, màu đỏ = lỗi)

## Requirements

### Requirement 1: Extension Activation Control

**User Story:** Là một User, tôi muốn bật/tắt toàn bộ hoạt động của Extension, để tôi có thể kiểm soát khi nào Extension hoạt động trên Facebook.

#### Acceptance Criteria

1. THE Popup_UI SHALL display Master_Switch as a toggle button
2. WHEN User clicks Master_Switch to enable, THE Extension SHALL activate all monitoring and processing features on Facebook
3. WHEN User clicks Master_Switch to disable, THE Extension SHALL deactivate all monitoring and processing features on Facebook
4. THE Extension SHALL persist Master_Switch state across browser sessions
5. WHILE Master_Switch is disabled, THE Extension SHALL NOT respond to any Mention_Trigger on Facebook

### Requirement 2: AI Provider Configuration

**User Story:** Là một User, tôi muốn cấu hình nhà cung cấp AI và model, để tôi có thể sử dụng dịch vụ AI mà tôi ưa thích.

#### Acceptance Criteria

1. THE Popup_UI SHALL display a dropdown list of supported AI_Provider options including OpenAI, Gemini, and Claude
2. WHEN User selects an AI_Provider, THE Popup_UI SHALL display a dropdown list of available models for that AI_Provider
3. THE Popup_UI SHALL display an input field for API_Key with a toggle button to show or hide the key value
4. THE Extension SHALL persist AI_Provider, model selection, and API_Key across browser sessions
5. WHEN User changes AI_Provider, THE Extension SHALL update the available model list within 100 milliseconds

### Requirement 3: API Key Validation

**User Story:** Là một User, tôi muốn biết API Key của tôi có hợp lệ hay không, để tôi có thể khắc phục sớm nếu có vấn đề.

#### Acceptance Criteria

1. WHEN User enters or modifies API_Key, THE Extension SHALL validate the API_Key by making a test request to the selected AI_Provider within 5 seconds
2. WHEN API_Key validation succeeds, THE Connection_Indicator SHALL display a green indicator
3. WHEN API_Key validation fails, THE Connection_Indicator SHALL display a red indicator
4. THE Popup_UI SHALL display Connection_Indicator next to the API_Key input field
5. WHEN validation fails, THE Extension SHALL display an error message describing the validation failure reason

### Requirement 4: Quick Guide Display

**User Story:** Là một User, tôi muốn xem hướng dẫn nhanh về cách sử dụng Extension, để tôi không phải nhớ cú pháp chính xác.

#### Acceptance Criteria

1. THE Popup_UI SHALL display a text guide showing the Mention_Trigger syntax format
2. THE Popup_UI SHALL display a link to a detailed guide page for obtaining API_Key
3. WHEN User clicks the API_Key guide link, THE Extension SHALL open the guide page in a new browser tab

### Requirement 5: Mention Trigger Detection

**User Story:** Là một User, tôi muốn Extension nhận diện khi tôi gõ @BoongAI, để tôi biết lệnh của tôi sẽ được xử lý.

#### Acceptance Criteria

1. WHILE Master_Switch is enabled, THE DOM_Observer SHALL monitor keyboard input events in Facebook comment input fields
2. WHEN User types the exact text "@BoongAI" in a comment input field, THE Extension SHALL highlight the text with a blue gradient color within 50 milliseconds
3. THE Extension SHALL use regex pattern matching to detect Mention_Trigger accurately
4. THE Extension SHALL detect Mention_Trigger in Lexical and Draft.js editor frameworks used by Facebook
5. WHEN Mention_Trigger is detected, THE Extension SHALL maintain the highlight until User submits or deletes the comment

### Requirement 6: Command Submission Capture

**User Story:** Là một User, tôi muốn Extension tự động xử lý lệnh khi tôi gửi comment, để tôi không phải thực hiện thêm thao tác nào khác.

#### Acceptance Criteria

1. WHEN User submits a Command_Comment containing Mention_Trigger, THE Extension SHALL capture the comment submission event within 100 milliseconds
2. WHEN Command_Comment is submitted, THE Context_Scraper SHALL extract the full Post_Content from the parent post
3. THE Context_Scraper SHALL handle Facebook "See more" expansion to extract complete Post_Content
4. THE Extension SHALL parse the user request text following Mention_Trigger from Command_Comment
5. WHEN Post_Content extraction completes, THE Extension SHALL package the user request and Post_Content for AI processing

### Requirement 7: Context Extraction

**User Story:** Là một User, tôi muốn Extension trích xuất đầy đủ nội dung bài viết, để AI có đủ ngữ cảnh để trả lời chính xác.

#### Acceptance Criteria

1. WHEN extracting Post_Content, THE Context_Scraper SHALL traverse the DOM tree to locate the post container
2. IF Post_Content contains a "See more" button, THEN THE Context_Scraper SHALL programmatically click the button to expand full content
3. THE Context_Scraper SHALL extract all visible text content from the post within 2 seconds
4. THE Context_Scraper SHALL exclude UI elements such as like counts, share buttons, and timestamps from Post_Content
5. IF Context_Scraper fails to extract Post_Content, THEN THE Extension SHALL display an error message in Ghost_UI

### Requirement 8: Processing State Indication

**User Story:** Là một User, tôi muốn thấy trạng thái xử lý của AI, để tôi biết Extension đang hoạt động và không bị treo.

#### Acceptance Criteria

1. WHEN Extension begins AI processing, THE Extension SHALL inject Ghost_UI below the Command_Comment within 200 milliseconds
2. THE Ghost_UI SHALL display an animated spinner icon and text message indicating AI is processing
3. WHILE AI is processing, THE Ghost_UI SHALL remain visible
4. THE Extension SHALL inject Ghost_UI without disrupting Facebook React DOM structure
5. WHEN AI processing completes or fails, THE Extension SHALL remove Ghost_UI within 200 milliseconds

### Requirement 9: AI Request Processing

**User Story:** Là một User, tôi muốn Extension gửi yêu cầu đến AI và nhận phản hồi, để tôi có được câu trả lời cho yêu cầu của mình.

#### Acceptance Criteria

1. WHEN Extension packages user request and Post_Content, THE AI_Communicator SHALL send an API request to the configured AI_Provider using the stored API_Key
2. THE AI_Communicator SHALL include both user request and Post_Content in the API request prompt
3. THE AI_Communicator SHALL set a timeout of 30 seconds for API requests
4. IF API request times out, THEN THE AI_Communicator SHALL return a timeout error message
5. IF API request fails due to invalid API_Key, THEN THE AI_Communicator SHALL return an authentication error message
6. IF API request fails due to rate limiting, THEN THE AI_Communicator SHALL return a rate limit error message
7. WHEN AI_Provider returns a successful response, THE AI_Communicator SHALL extract the response text for Auto_Reply generation

### Requirement 10: Automatic Reply Generation

**User Story:** Là một User, tôi muốn Extension tự động tạo comment phản hồi với kết quả từ AI, để tôi không phải copy-paste thủ công.

#### Acceptance Criteria

1. WHEN AI_Communicator receives successful response, THE Auto_Injector SHALL locate the reply button for the Command_Comment
2. THE Auto_Injector SHALL programmatically click the reply button to open the reply input field
3. THE Auto_Injector SHALL inject the AI response text prefixed with "[🤖 BoongAI trả lời]: " into the reply input field
4. THE Auto_Injector SHALL simulate clipboard and input events to bypass Facebook input field protections
5. THE Auto_Injector SHALL programmatically submit the reply by simulating Enter key press or clicking the submit button
6. THE Auto_Injector SHALL complete the entire Auto_Reply process within 2 seconds after receiving AI response
7. WHEN Auto_Reply is successfully posted, THE Extension SHALL remove Ghost_UI

### Requirement 11: Error Handling Display

**User Story:** Là một User, tôi muốn thấy thông báo lỗi rõ ràng khi có vấn đề xảy ra, để tôi biết cách khắc phục.

#### Acceptance Criteria

1. IF any processing error occurs, THEN THE Extension SHALL display an error message in Ghost_UI
2. THE Extension SHALL display specific error messages for different error types including API timeout, invalid API_Key, rate limiting, and context extraction failure
3. THE Extension SHALL keep error messages visible in Ghost_UI for 10 seconds before removing
4. THE Extension SHALL NOT create Auto_Reply when processing errors occur
5. WHEN error occurs, THE Extension SHALL log error details to browser console for debugging

### Requirement 12: DOM Monitoring

**User Story:** Là một User, tôi muốn Extension hoạt động liên tục trên Facebook, để tôi có thể sử dụng nó bất cứ khi nào tôi cần.

#### Acceptance Criteria

1. WHILE Master_Switch is enabled, THE DOM_Observer SHALL continuously monitor Facebook page for new comment input fields
2. THE DOM_Observer SHALL detect when new comment sections are loaded dynamically
3. THE DOM_Observer SHALL detect when Command_Comment is successfully posted to Facebook
4. THE DOM_Observer SHALL use MutationObserver API to track DOM changes efficiently
5. THE DOM_Observer SHALL NOT cause performance degradation on Facebook page load or scrolling

### Requirement 13: Multi-Provider Support

**User Story:** Là một User, tôi muốn Extension hỗ trợ nhiều nhà cung cấp AI khác nhau, để tôi có thể chọn dịch vụ phù hợp với nhu cầu và ngân sách của mình.

#### Acceptance Criteria

1. THE AI_Communicator SHALL support API integration with OpenAI
2. THE AI_Communicator SHALL support API integration with Google Gemini
3. THE AI_Communicator SHALL support API integration with Anthropic Claude
4. WHEN User switches AI_Provider, THE AI_Communicator SHALL use the appropriate API endpoint and request format for the selected provider
5. THE Extension SHALL format API requests according to each AI_Provider specific requirements

### Requirement 14: Configuration Persistence

**User Story:** Là một User, tôi muốn cấu hình của tôi được lưu lại, để tôi không phải thiết lập lại mỗi khi mở trình duyệt.

#### Acceptance Criteria

1. THE Extension SHALL store all configuration data using Chrome Storage API
2. WHEN User modifies any configuration setting, THE Extension SHALL persist the change within 500 milliseconds
3. WHEN Extension initializes, THE Extension SHALL load all saved configuration settings
4. THE Extension SHALL encrypt API_Key before storing in Chrome Storage
5. IF stored configuration is corrupted, THEN THE Extension SHALL reset to default configuration values

### Requirement 15: Reply Content Formatting

**User Story:** Là một User, tôi muốn phản hồi của AI được định dạng rõ ràng, để người khác biết đây là câu trả lời từ AI trợ lý.

#### Acceptance Criteria

1. THE Auto_Injector SHALL prefix all Auto_Reply content with "[🤖 BoongAI trả lời]: "
2. THE Extension SHALL preserve line breaks and formatting from AI response in Auto_Reply
3. IF AI response exceeds 8000 characters, THEN THE Extension SHALL truncate the response and append "... (nội dung đã được rút gọn)" to Auto_Reply
4. THE Extension SHALL remove any markdown formatting that Facebook does not support from AI response before creating Auto_Reply
5. THE Extension SHALL ensure Auto_Reply content does not contain malicious scripts or HTML injection

## Notes

- Extension hoạt động dưới quyền của tài khoản Facebook hiện tại của User, do đó Auto_Reply sẽ xuất hiện dưới tên User
- Extension cần quyền truy cập vào facebook.com domain và Chrome Storage API
- Việc giả lập thao tác người dùng (Auto_Injector) cần được thiết kế cẩn thận để tương thích với cơ chế bảo vệ của Facebook và không vi phạm Terms of Service
