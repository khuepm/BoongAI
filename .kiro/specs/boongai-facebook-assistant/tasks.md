# Implementation Plan: BoongAI Facebook Assistant

## Overview

This implementation plan breaks down the BoongAI Facebook Assistant Chrome Extension into discrete, actionable coding tasks. The extension enables users to interact with AI assistants (OpenAI, Gemini, Claude) directly on Facebook through @BoongAI mentions. Implementation follows a bottom-up approach: core utilities → individual modules → UI components → integration → testing.

## Tasks

- [x] 1. Set up project structure and configuration
  - Create Chrome Extension manifest.json with required permissions (storage, activeTab, scripting, host permissions for facebook.com)
  - Set up TypeScript configuration with appropriate compiler options
  - Create directory structure: src/popup, src/background, src/content, src/utils, src/types
  - Define shared TypeScript interfaces and types in src/types/index.ts
  - Set up build tooling (webpack/rollup) for bundling extension files
  - Configure Jest and fast-check for testing
  - _Requirements: 14.1_

- [ ] 2. Implement Configuration Manager module
  - [~] 2.1 Create configuration data models and storage interface
    - Define ExtensionConfig interface with version, masterSwitch, aiProvider, model, apiKey, lastValidated
    - Define DEFAULT_CONFIG constant with initial values
    - Implement Chrome Storage API wrapper functions
    - _Requirements: 2.4, 14.1, 14.2_
  
  - [~] 2.2 Implement API key encryption and decryption
    - Implement encryptApiKey() using Web Crypto API with AES-256
    - Implement decryptApiKey() for secure key retrieval
    - Handle encryption/decryption errors gracefully
    - _Requirements: 14.4_
  
  - [~] 2.3 Implement configuration persistence functions
    - Implement saveConfig() with debouncing (500ms) to reduce storage writes
    - Implement loadConfig() with validation and fallback to defaults
    - Implement resetToDefaults() for configuration recovery
    - Handle corrupted configuration detection and recovery
    - _Requirements: 1.4, 2.4, 14.2, 14.3, 14.5_
  
  - [~] 2.4 Write property test for configuration persistence
    - **Property 2: Configuration persistence round-trip**
    - **Validates: Requirements 1.4, 2.4, 14.2, 14.3**
  
  - [~] 2.5 Write property test for API key encryption
    - **Property 36: API key encryption before storage**
    - **Validates: Requirements 14.4**
  
  - [~] 2.6 Write property test for corrupted config recovery
    - **Property 37: Corrupted config recovery**
    - **Validates: Requirements 14.5**

- [ ] 3. Implement API Validator module
  - [~] 3.1 Create API validation functions for each provider
    - Implement validateApiKey() with provider-specific test requests
    - Configure 5-second timeout for validation requests
    - Implement validation result caching (1 hour TTL)
    - Map provider-specific error responses to ValidationResult
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [~] 3.2 Implement connection indicator update logic
    - Implement updateConnectionIndicator() to set green/red indicator
    - Implement getValidationError() to parse and format error messages
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [~] 3.3 Write property test for validation triggering
    - **Property 4: API key validation triggers on input**
    - **Validates: Requirements 3.1**
  
  - [~] 3.4 Write property test for connection indicator state
    - **Property 5: Connection indicator reflects validation state**
    - **Validates: Requirements 3.2, 3.3**
  
  - [~] 3.5 Write property test for validation error messages
    - **Property 6: Validation failure shows error message**
    - **Validates: Requirements 3.5**

- [ ] 4. Implement AI Communicator module
  - [~] 4.1 Create AI provider configuration and request formatting
    - Define SUPPORTED_MODELS constant with models for each provider
    - Define provider-specific API endpoints and authentication methods
    - Implement formatPrompt() to combine user request and post content
    - Create provider-specific request formatters (OpenAI, Gemini, Claude)
    - _Requirements: 2.1, 2.2, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [~] 4.2 Implement API request handling with timeout and retry
    - Implement sendRequest() with 30-second timeout
    - Implement retry logic with exponential backoff (max 2 retries)
    - Implement parseResponse() for each provider's response format
    - _Requirements: 9.1, 9.2, 9.3, 9.7_
  
  - [~] 4.3 Implement error handling and categorization
    - Implement handleError() to categorize errors (timeout, auth, rate limit, network)
    - Map provider-specific error codes to ErrorMessage types
    - Return appropriate error messages for each error type
    - _Requirements: 9.4, 9.5, 9.6, 11.2_
  
  - [~] 4.4 Write property test for request prompt formatting
    - **Property 20: AI request includes both context and command**
    - **Validates: Requirements 9.2**
  
  - [~] 4.5 Write property test for timeout enforcement
    - **Property 21: API request timeout enforcement**
    - **Validates: Requirements 9.3, 9.4**
  
  - [~] 4.6 Write property test for error categorization
    - **Property 22: Error categorization and messaging**
    - **Validates: Requirements 9.4, 9.5, 9.6, 11.2**
  
  - [~] 4.7 Write property test for response extraction
    - **Property 23: Response text extraction**
    - **Validates: Requirements 9.7**
  
  - [~] 4.8 Write property test for provider-specific configuration
    - **Property 35: Provider-specific API configuration**
    - **Validates: Requirements 13.4, 13.5**

- [ ] 5. Implement DOM Observer module
  - [~] 5.1 Create MutationObserver setup and Facebook DOM monitoring
    - Implement initialize() to set up MutationObserver on Facebook page
    - Configure observer to monitor comment input fields and new comment sections
    - Implement cleanup() to remove observers when master switch is disabled
    - Use event delegation for performance optimization
    - _Requirements: 12.1, 12.2, 12.5_
  
  - [~] 5.2 Implement mention trigger detection and highlighting
    - Implement detectMentionTrigger() with regex pattern /@BoongAI\b/gi
    - Support both Lexical and Draft.js editor frameworks
    - Implement highlightMention() to apply blue gradient styling
    - Debounce input events (50ms threshold)
    - Maintain highlight until comment submission or deletion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [~] 5.3 Implement comment submission capture
    - Implement captureCommentSubmission() to detect comment post events
    - Extract commentId, commentText, postId from submitted comment
    - Trigger context extraction workflow on submission
    - _Requirements: 6.1, 12.3_
  
  - [~] 5.4 Write property test for mention detection
    - **Property 8: Mention trigger detection and highlighting**
    - **Validates: Requirements 5.2, 5.3**
  
  - [~] 5.5 Write property test for editor framework compatibility
    - **Property 9: Mention trigger detection across editor frameworks**
    - **Validates: Requirements 5.4**
  
  - [~] 5.6 Write property test for highlight persistence
    - **Property 10: Highlight persistence until action**
    - **Validates: Requirements 5.5**
  
  - [~] 5.7 Write property test for comment submission capture
    - **Property 11: Comment submission capture**
    - **Validates: Requirements 6.1**
  
  - [~] 5.8 Write property test for dynamic comment field detection
    - **Property 33: Dynamic comment field detection**
    - **Validates: Requirements 12.2**
  
  - [~] 5.9 Write property test for command comment detection
    - **Property 34: Command comment detection**
    - **Validates: Requirements 12.3**

- [ ] 6. Implement Context Scraper module
  - [~] 6.1 Create post content extraction functions
    - Implement findPostContainer() to locate post DOM element by postId
    - Implement extractTextContent() to get all visible text from post
    - Implement filterUIElements() to exclude like counts, timestamps, buttons
    - Handle extraction timeout (2 seconds)
    - _Requirements: 6.2, 7.1, 7.3, 7.4_
  
  - [~] 6.2 Implement "See more" expansion handling
    - Implement expandSeeMore() to detect and click "See more" button
    - Wait for content expansion with retry mechanism (max 3 attempts)
    - Verify complete content extraction
    - _Requirements: 6.3, 7.2_
  
  - [~] 6.3 Implement user request parsing
    - Parse text following @BoongAI mention from command comment
    - Package user request and post content for AI processing
    - Handle extraction failures with error reporting
    - _Requirements: 6.4, 6.5, 7.5_
  
  - [~] 6.4 Write property test for post content extraction
    - **Property 12: Post content extraction on submission**
    - **Validates: Requirements 6.2**
  
  - [~] 6.5 Write property test for user request parsing
    - **Property 13: User request parsing**
    - **Validates: Requirements 6.4**
  
  - [~] 6.6 Write property test for request packaging
    - **Property 14: Request packaging after extraction**
    - **Validates: Requirements 6.5**
  
  - [~] 6.7 Write property test for UI element exclusion
    - **Property 15: Text extraction excludes UI elements**
    - **Validates: Requirements 7.4**
  
  - [~] 6.8 Write property test for extraction failure handling
    - **Property 16: Extraction failure shows error**
    - **Validates: Requirements 7.5**

- [ ] 7. Implement Ghost UI Manager module
  - [~] 7.1 Create Ghost UI injection and styling
    - Implement showProcessing() to inject processing indicator below command comment
    - Use Shadow DOM to isolate styles from Facebook CSS
    - Create animated spinner with CSS animations
    - Position Ghost UI using absolute positioning relative to comment
    - _Requirements: 8.1, 8.4_
  
  - [~] 7.2 Implement error display and auto-removal
    - Implement showError() to display error messages in Ghost UI
    - Implement remove() to clean up Ghost UI elements
    - Auto-remove error messages after 10 seconds
    - _Requirements: 8.5, 11.1, 11.3_
  
  - [~] 7.3 Write property test for Ghost UI injection timing
    - **Property 17: Ghost UI injection on processing start**
    - **Validates: Requirements 8.1**
  
  - [~] 7.4 Write property test for Ghost UI visibility
    - **Property 18: Ghost UI visibility during processing**
    - **Validates: Requirements 8.3**
  
  - [~] 7.5 Write property test for Ghost UI removal
    - **Property 19: Ghost UI removal on completion**
    - **Validates: Requirements 8.5**
  
  - [~] 7.6 Write property test for error display
    - **Property 29: Error display in Ghost UI**
    - **Validates: Requirements 11.1**
  
  - [~] 7.7 Write property test for error visibility duration
    - **Property 30: Error message visibility duration**
    - **Validates: Requirements 11.3**

- [ ] 8. Implement Auto Injector module
  - [~] 8.1 Create reply button location and interaction
    - Implement findReplyButton() to locate reply button for command comment
    - Implement clickReplyButton() to programmatically click reply button
    - Wait for reply input field to appear (100-200ms delays)
    - _Requirements: 10.1, 10.2_
  
  - [~] 8.2 Implement text injection with Facebook compatibility
    - Implement injectText() using clipboard API with fallback to direct DOM manipulation
    - Trigger input, change, and keydown events for React compatibility
    - Prefix all replies with "[🤖 BoongAI trả lời]: "
    - Preserve line breaks and formatting from AI response
    - _Requirements: 10.3, 10.4, 15.1, 15.2_
  
  - [~] 8.3 Implement content formatting and sanitization
    - Truncate responses exceeding 8000 characters with "... (nội dung đã được rút gọn)"
    - Remove unsupported markdown formatting
    - Sanitize malicious scripts and HTML injection attempts
    - _Requirements: 15.3, 15.4, 15.5_
  
  - [~] 8.4 Implement reply submission
    - Implement submitReply() to simulate Enter key press or click submit button
    - Complete auto-reply process within 2 seconds after receiving AI response
    - Trigger Ghost UI removal on successful reply
    - _Requirements: 10.5, 10.6, 10.7_
  
  - [~] 8.5 Write property test for reply button location
    - **Property 24: Reply button location**
    - **Validates: Requirements 10.1**
  
  - [~] 8.6 Write property test for reply button click
    - **Property 25: Reply button click opens input**
    - **Validates: Requirements 10.2**
  
  - [~] 8.7 Write property test for response prefix
    - **Property 26: AI response injection with prefix**
    - **Validates: Requirements 10.3, 15.1**
  
  - [~] 8.8 Write property test for reply submission
    - **Property 27: Reply submission**
    - **Validates: Requirements 10.5**
  
  - [~] 8.9 Write property test for Ghost UI removal on success
    - **Property 28: Ghost UI removal on successful reply**
    - **Validates: Requirements 10.7**
  
  - [~] 8.10 Write property test for line break preservation
    - **Property 38: Line break preservation in replies**
    - **Validates: Requirements 15.2**
  
  - [~] 8.11 Write property test for long response truncation
    - **Property 39: Long response truncation**
    - **Validates: Requirements 15.3**
  
  - [~] 8.12 Write property test for markdown removal
    - **Property 40: Unsupported markdown removal**
    - **Validates: Requirements 15.4**
  
  - [~] 8.13 Write property test for malicious content sanitization
    - **Property 41: Malicious content sanitization**
    - **Validates: Requirements 15.5**

- [ ] 9. Implement Error Handler utility
  - [~] 9.1 Create error handling and logging infrastructure
    - Define ExtensionError interface and ErrorCode type
    - Define ERROR_MESSAGES constant with user-friendly messages
    - Implement ErrorHandler.handle() to log errors and display messages
    - Log errors to browser console with structured format
    - _Requirements: 11.5_
  
  - [~] 9.2 Implement error recovery strategies
    - Implement attemptRecovery() with error-specific recovery logic
    - Implement scheduleRetry() with exponential backoff
    - Handle concurrent operation conflicts with request queuing
    - _Requirements: 11.4_
  
  - [~] 9.3 Write property test for no auto-reply on error
    - **Property 31: No auto-reply on error**
    - **Validates: Requirements 11.4**
  
  - [~] 9.4 Write property test for error logging
    - **Property 32: Error logging to console**
    - **Validates: Requirements 11.5**

- [ ] 10. Implement Background Service Worker
  - [~] 10.1 Create message routing and handler registration
    - Set up message listeners for popup and content script communication
    - Implement message routing to appropriate handlers (config update, API request, validation)
    - Handle extension lifecycle events (install, update)
    - _Requirements: 14.1_
  
  - [~] 10.2 Integrate Configuration Manager and API Validator
    - Wire CONFIG_UPDATE messages to Configuration Manager
    - Wire VALIDATE_API_KEY messages to API Validator
    - Send validation results back to popup
    - _Requirements: 2.4, 3.1_
  
  - [~] 10.3 Integrate AI Communicator for request processing
    - Wire AI_REQUEST messages to AI Communicator
    - Load configuration for each request
    - Send AI_RESPONSE messages back to content script
    - Handle errors and send error responses
    - _Requirements: 9.1, 9.2_

- [ ] 11. Implement Popup UI
  - [~] 11.1 Create popup HTML structure and styling
    - Create popup.html with master switch, provider dropdown, model dropdown, API key input
    - Add connection indicator next to API key input
    - Add show/hide toggle for API key visibility
    - Add quick guide text and API key guide link
    - Style with modern, clean UI design
    - _Requirements: 1.1, 2.1, 2.3, 3.4, 4.1, 4.2_
  
  - [~] 11.2 Implement popup JavaScript logic
    - Load configuration on popup open
    - Handle master switch toggle events
    - Handle AI provider selection and update model list within 100ms
    - Handle model selection
    - Handle API key input with show/hide toggle
    - Trigger API key validation on input/modification
    - Update connection indicator based on validation results
    - Handle guide link clicks to open new tab
    - _Requirements: 1.2, 1.3, 2.2, 2.5, 3.1, 4.3_
  
  - [~] 11.3 Write property test for master switch control
    - **Property 1: Master switch controls all extension features**
    - **Validates: Requirements 1.2, 1.3, 1.5**
  
  - [~] 11.4 Write property test for provider selection updates
    - **Property 3: Provider selection updates model list**
    - **Validates: Requirements 2.2**
  
  - [~] 11.5 Write property test for guide link behavior
    - **Property 7: Guide link opens new tab**
    - **Validates: Requirements 4.3**

- [ ] 12. Implement Content Script orchestration
  - [~] 12.1 Create content script initialization and module coordination
    - Initialize all modules (DOM Observer, Context Scraper, Auto Injector, Ghost UI Manager)
    - Set up message listener for background service worker communication
    - Load configuration and check master switch state
    - _Requirements: 1.5, 12.1_
  
  - [~] 12.2 Implement end-to-end workflow orchestration
    - Coordinate mention detection → comment submission → context extraction flow
    - Send AI request to background service worker with user request and post content
    - Handle AI response and trigger auto-reply generation
    - Handle errors and display in Ghost UI
    - _Requirements: 5.1, 6.1, 8.1, 11.1_
  
  - [~] 12.3 Implement master switch state handling
    - Listen for configuration changes from background
    - Enable/disable DOM Observer based on master switch state
    - Clean up observers and event listeners when disabled
    - _Requirements: 1.2, 1.3, 1.5_

- [~] 13. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify passing
  - Run all property-based tests and verify passing
  - Test extension manually in Chrome with Facebook
  - Ensure all tests pass, ask the user if questions arise

- [ ] 14. Create Chrome Extension manifest and build configuration
  - [~] 14.1 Create manifest.json with all required configurations
    - Define manifest_version, name, version, description
    - Configure permissions: storage, activeTab, scripting
    - Configure host_permissions for facebook.com
    - Define background service worker script
    - Define content_scripts for facebook.com injection
    - Define popup action with HTML file
    - _Requirements: 14.1_
  
  - [~] 14.2 Configure build tooling for extension packaging
    - Configure webpack/rollup to bundle TypeScript files
    - Set up separate bundles for popup, background, content script
    - Configure source maps for debugging
    - Create build script for production packaging
    - _Requirements: 14.1_

- [ ] 15. Integration testing and bug fixes
  - [~] 15.1 Test complete workflow on Facebook
    - Test mention detection and highlighting on real Facebook posts
    - Test comment submission capture and context extraction
    - Test "See more" expansion on long posts
    - Test AI request and response with all three providers
    - Test auto-reply generation and submission
    - _Requirements: 5.2, 6.2, 7.2, 9.1, 10.3_
  
  - [~] 15.2 Test error scenarios
    - Test invalid API key handling
    - Test network failure handling
    - Test timeout handling
    - Test context extraction failures
    - Test reply injection failures
    - Verify error messages display correctly in Ghost UI
    - _Requirements: 9.4, 9.5, 9.6, 11.1, 11.2_
  
  - [~] 15.3 Test configuration persistence and UI
    - Test master switch persistence across browser sessions
    - Test AI provider and model persistence
    - Test API key encryption and persistence
    - Test connection indicator updates
    - Test popup UI responsiveness
    - _Requirements: 1.4, 2.4, 3.2, 3.3, 14.4_
  
  - [~] 15.4 Fix bugs and edge cases discovered during testing
    - Address any issues found in integration testing
    - Optimize performance if needed
    - Ensure compatibility with Facebook DOM changes

- [~] 16. Final checkpoint - Ensure all tests pass
  - Run complete test suite (unit + property + integration)
  - Verify extension works correctly on Facebook
  - Verify all 15 requirements are satisfied
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The extension operates under the user's Facebook account permissions
- All AI responses are prefixed with "[🤖 BoongAI trả lời]: " for transparency
- API keys are encrypted before storage for security
- The extension supports three AI providers: OpenAI, Google Gemini, and Anthropic Claude
