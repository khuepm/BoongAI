# Ghost UI Injection Issue - Fixed

## Problem
The extension was showing this error:
```
[BoongAI] Could not find comment element for ID: comment-1772743715435-9rcpghygcin
```

## Root Cause
When a comment was submitted, the `domObserver.ts` would generate a fallback comment ID (like `comment-1772743715435-9rcpghygcin`), but this ID was never stored as a data attribute on the actual comment DOM element.

Later, when `ghostUIManager.ts` tried to inject the Ghost UI (processing indicator), it couldn't find the comment element because:
1. The generated ID didn't exist as a `data-comment-id` attribute
2. The ID wasn't a valid DOM element ID
3. The ID wasn't in any aria-label

## Solution
Added a line in `domObserver.ts` to store the generated comment ID as a data attribute on the comment element:

```typescript
commentElement.setAttribute('data-boongai-comment-id', commentId);
```

This ensures that when `ghostUIManager.ts` searches for the comment element using Strategy 4 (searching for `data-boongai-comment-id`), it can successfully locate it.

## Testing
1. Reload the extension in Chrome
2. Go to a Facebook post
3. Type a comment with `@BoongAI test giúp tôi`
4. Submit the comment
5. The Ghost UI processing indicator should now appear correctly below your comment

## Files Modified
- `src/content/domObserver.ts` - Added data attribute storage and updated CommentData interface
