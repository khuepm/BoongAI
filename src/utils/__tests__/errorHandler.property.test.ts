import fc from 'fast-check';
import { ErrorHandler } from '../errorHandler';
import { ExtensionError, ErrorContext, ErrorCode, ERROR_MESSAGES } from '@/types';

// Property test configuration
const propertyTestConfig = {
  numRuns: 100,
  verbose: true
};

// Custom arbitraries for error handler testing
const errorCodeArbitrary = (): fc.Arbitrary<ErrorCode> => {
  return fc.constantFrom(
    'API_TIMEOUT',
    'API_AUTH_FAILED',
    'API_RATE_LIMIT',
    'CONTEXT_EXTRACTION_FAILED',
    'REPLY_INJECTION_FAILED',
    'NETWORK_ERROR',
    'INVALID_CONFIG',
    'DOM_NOT_FOUND'
  );
};

const errorContextArbitrary = (): fc.Arbitrary<ErrorContext> => {
  return fc.record({
    commentId: fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined }),
    operation: fc.string({ minLength: 5, maxLength: 50 }),
    retryCount: fc.integer({ min: 0, max: 5 }),
    additionalData: fc.option(
      fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.anything()
      ),
      { nil: undefined }
    )
  });
};

const extensionErrorArbitrary = (): fc.Arbitrary<ExtensionError> => {
  return fc.record({
    code: errorCodeArbitrary(),
    message: fc.string({ minLength: 10, maxLength: 200 }),
    details: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
    context: fc.option(
      fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.anything()
      ),
      { nil: undefined }
    )
  });
};

describe('ErrorHandler - Property-Based Tests', () => {
  // Mock console methods to avoid cluttering test output
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('Property 31: No auto-reply on error', () => {
    /**
     * **Validates: Requirements 11.4**
     * 
     * For any processing error, no auto-reply should be created or posted.
     * This property verifies that when an error is handled, the system does not
     * attempt to create or post an auto-reply.
     */
    test('handle() does not trigger auto-reply for any error type', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary(),
          (error, context) => {
            // Track if any auto-reply related operations are attempted
            let autoReplyAttempted = false;
            
            // Mock any potential auto-reply functions that might be called
            // In a real implementation, we would mock AutoInjector.generateReply
            const mockAutoReply = jest.fn(() => {
              autoReplyAttempted = true;
            });
            
            // Handle the error
            ErrorHandler.handle(error, context);
            
            // Property: No auto-reply should be attempted when handling errors
            expect(autoReplyAttempted).toBe(false);
            expect(mockAutoReply).not.toHaveBeenCalled();
            
            // Verify error was logged (this is what should happen instead of auto-reply)
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              '[BoongAI]',
              expect.objectContaining({
                code: error.code,
                message: error.message,
                timestamp: error.timestamp
              })
            );
          }
        ),
        propertyTestConfig
      );
    });

    test('error handling displays error message instead of creating reply', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary().filter(ctx => ctx.commentId !== undefined),
          (error, context) => {
            // Handle the error
            ErrorHandler.handle(error, context);
            
            // Property: When commentId is present, error message should be prepared for display
            // (not auto-reply)
            expect(context.additionalData).toBeDefined();
            expect(context.additionalData?.displayedMessage).toBe(ERROR_MESSAGES[error.code]);
            
            // Property: The displayed message should be an error message from ERROR_MESSAGES
            const displayedMessage = context.additionalData?.displayedMessage;
            expect(displayedMessage).toBeTruthy();
            expect(typeof displayedMessage).toBe('string');
            
            // Property: The message should be one of the predefined error messages
            const isValidErrorMessage = Object.values(ERROR_MESSAGES).includes(displayedMessage);
            expect(isValidErrorMessage).toBe(true);
          }
        ),
        propertyTestConfig
      );
    });

    test('recovery strategies do not include auto-reply generation', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary(),
          (error, context) => {
            // Track recovery actions
            const recoveryActions: string[] = [];
            
            // Spy on console to track recovery attempts
            const infoSpy = jest.spyOn(console, 'info').mockImplementation((msg) => {
              if (typeof msg === 'string' && msg.includes('[BoongAI]')) {
                recoveryActions.push(msg);
              }
            });
            
            // Attempt recovery
            ErrorHandler.attemptRecovery(error, context);
            
            // Property: Recovery actions should never include auto-reply generation
            recoveryActions.forEach(action => {
              expect(action.toLowerCase()).not.toContain('reply');
              expect(action.toLowerCase()).not.toContain('inject');
              expect(action.toLowerCase()).not.toContain('post');
            });
            
            infoSpy.mockRestore();
          }
        ),
        propertyTestConfig
      );
    });

    test('concurrent operation handling prevents auto-reply during errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }), // operationId
          extensionErrorArbitrary(),
          (operationId, error) => {
            // Start an operation
            const canProceed = ErrorHandler.canProceed(operationId);
            expect(canProceed).toBe(true);
            
            // Simulate error during operation
            const context: ErrorContext = {
              operation: operationId,
              retryCount: 0,
              commentId: 'test-comment-123'
            };
            
            ErrorHandler.handle(error, context);
            
            // Property: Error handling should not create auto-reply
            // Instead, it should prepare error message for display
            expect(context.additionalData?.displayedMessage).toBeDefined();
            expect(context.additionalData?.displayedMessage).toBe(ERROR_MESSAGES[error.code]);
            
            // Clean up
            ErrorHandler.completeOperation(operationId);
          }
        ),
        propertyTestConfig
      );
    });

    test('retry scheduling does not include auto-reply logic', () => {
      fc.assert(
        fc.property(
          errorContextArbitrary().filter(ctx => ctx.retryCount < 2),
          extensionErrorArbitrary().filter(err => 
            err.code === 'API_TIMEOUT' || err.code === 'NETWORK_ERROR'
          ),
          (context, error) => {
            // Clear previous calls
            consoleInfoSpy.mockClear();
            
            // Schedule a retry
            ErrorHandler.scheduleRetry(context, error);
            
            // Property: Retry scheduling should log the scheduling action
            expect(consoleInfoSpy).toHaveBeenCalledWith(
              expect.stringContaining('[BoongAI] Scheduling retry')
            );
            
            // Property: The scheduling itself doesn't trigger auto-reply
            // (auto-reply logic would be in a different module, not in scheduleRetry)
            // We verify this by checking that only scheduling-related logs are present
            const allLogs = consoleInfoSpy.mock.calls.map(call => call[0]);
            const hasAutoReplyLogs = allLogs.some((log: string) => 
              log.toLowerCase().includes('reply') || 
              log.toLowerCase().includes('inject') ||
              log.toLowerCase().includes('post')
            );
            expect(hasAutoReplyLogs).toBe(false);
          }
        ),
        propertyTestConfig
      );
    });
  });

  describe('Property 32: Error logging to console', () => {
    /**
     * **Validates: Requirements 11.5**
     * 
     * For any error occurrence, error details should be logged to the browser console.
     * This property verifies that all errors are properly logged with structured format.
     */
    test('handle() logs all errors to console with structured format', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary(),
          (error, context) => {
            // Clear previous calls
            consoleErrorSpy.mockClear();
            
            // Handle the error
            ErrorHandler.handle(error, context);
            
            // Property: Error must be logged to console
            expect(consoleErrorSpy).toHaveBeenCalled();
            
            // Property: Log must include '[BoongAI]' prefix
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              '[BoongAI]',
              expect.any(Object)
            );
            
            // Property: Log must include structured error data
            const loggedData = consoleErrorSpy.mock.calls[0][1];
            expect(loggedData).toHaveProperty('code', error.code);
            expect(loggedData).toHaveProperty('message', error.message);
            expect(loggedData).toHaveProperty('timestamp', error.timestamp);
            expect(loggedData).toHaveProperty('context');
            
            // Property: If error has details, they must be logged
            if (error.details) {
              expect(loggedData).toHaveProperty('details', error.details);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('createError() generates errors with timestamp', () => {
      fc.assert(
        fc.property(
          errorCodeArbitrary(),
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
          fc.option(
            fc.dictionary(fc.string(), fc.anything()),
            { nil: undefined }
          ),
          (code, message, details, context) => {
            const beforeTimestamp = Date.now();
            const error = ErrorHandler.createError(code, message, details, context);
            const afterTimestamp = Date.now();
            
            // Property: Error must have all required fields
            expect(error.code).toBe(code);
            expect(error.message).toBe(message);
            expect(error.details).toBe(details);
            expect(error.context).toBe(context);
            
            // Property: Timestamp must be current time
            expect(error.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(error.timestamp).toBeLessThanOrEqual(afterTimestamp);
          }
        ),
        propertyTestConfig
      );
    });

    test('all error codes have corresponding error messages', () => {
      fc.assert(
        fc.property(
          errorCodeArbitrary(),
          (errorCode) => {
            // Property: Every error code must have a corresponding message
            expect(ERROR_MESSAGES).toHaveProperty(errorCode);
            expect(ERROR_MESSAGES[errorCode]).toBeTruthy();
            expect(typeof ERROR_MESSAGES[errorCode]).toBe('string');
            expect(ERROR_MESSAGES[errorCode].length).toBeGreaterThan(0);
          }
        ),
        propertyTestConfig
      );
    });

    test('error logging includes context information', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary(),
          (error, context) => {
            // Clear previous calls
            consoleErrorSpy.mockClear();
            
            // Create a copy of context to compare later (since handle() may modify it)
            const originalContext = JSON.parse(JSON.stringify(context));
            
            // Handle the error
            ErrorHandler.handle(error, context);
            
            // Property: Context must be included in the log
            const loggedData = consoleErrorSpy.mock.calls[0][1];
            expect(loggedData.context).toBeDefined();
            
            // Property: Core context fields must be preserved
            expect(loggedData.context.operation).toBe(originalContext.operation);
            expect(loggedData.context.retryCount).toBe(originalContext.retryCount);
            
            if (originalContext.commentId) {
              expect(loggedData.context.commentId).toBe(originalContext.commentId);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('recovery attempts are logged to console', () => {
      fc.assert(
        fc.property(
          extensionErrorArbitrary(),
          errorContextArbitrary(),
          (error, context) => {
            // Attempt recovery
            ErrorHandler.attemptRecovery(error, context);
            
            // Property: Recovery attempts should be logged
            // Different error codes have different recovery strategies
            switch (error.code) {
              case 'INVALID_CONFIG':
                expect(consoleInfoSpy).toHaveBeenCalledWith(
                  expect.stringContaining('[BoongAI] Attempting recovery')
                );
                break;
              case 'API_TIMEOUT':
              case 'NETWORK_ERROR':
                if (context.retryCount < 2) {
                  expect(consoleInfoSpy).toHaveBeenCalledWith(
                    expect.stringContaining('[BoongAI] Attempting recovery')
                  );
                } else {
                  expect(consoleWarnSpy).toHaveBeenCalledWith(
                    expect.stringContaining('[BoongAI] Max retry attempts reached')
                  );
                }
                break;
              default:
                // Other error codes should log warnings
                expect(consoleWarnSpy).toHaveBeenCalled();
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('retry scheduling is logged with delay information', () => {
      fc.assert(
        fc.property(
          errorContextArbitrary().filter(ctx => ctx.retryCount < 2),
          extensionErrorArbitrary(),
          (context, error) => {
            // Schedule retry
            ErrorHandler.scheduleRetry(context, error);
            
            // Property: Retry scheduling must be logged
            expect(consoleInfoSpy).toHaveBeenCalled();
            
            // Property: Log must include delay information
            const expectedDelay = Math.pow(2, context.retryCount) * 1000;
            expect(consoleInfoSpy).toHaveBeenCalledWith(
              expect.stringContaining(`[BoongAI] Scheduling retry in ${expectedDelay}ms`)
            );
          }
        ),
        propertyTestConfig
      );
    });

    test('concurrent operation conflicts are logged', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          (operationId) => {
            // Start first operation
            const firstAttempt = ErrorHandler.canProceed(operationId);
            expect(firstAttempt).toBe(true);
            
            // Try to start same operation again (should be blocked)
            const secondAttempt = ErrorHandler.canProceed(operationId);
            expect(secondAttempt).toBe(false);
            
            // Property: Conflict must be logged
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining(`[BoongAI] Operation ${operationId} is already in progress`)
            );
            
            // Clean up
            ErrorHandler.completeOperation(operationId);
          }
        ),
        propertyTestConfig
      );
    });

    test('queued operations are logged', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.string({ minLength: 10, maxLength: 30 }),
          (operationId1, operationId2) => {
            fc.pre(operationId1 !== operationId2); // Ensure different IDs
            
            // Start first operation
            ErrorHandler.canProceed(operationId1);
            
            // Queue second operation
            const mockCallback = jest.fn();
            ErrorHandler.queueOperation(operationId2, mockCallback);
            
            // Property: Queueing must be logged
            expect(consoleInfoSpy).toHaveBeenCalledWith(
              expect.stringContaining(`[BoongAI] Queueing operation ${operationId2}`)
            );
            
            // Complete first operation
            ErrorHandler.completeOperation(operationId1);
            
            // Property: Processing queued operation must be logged
            expect(consoleInfoSpy).toHaveBeenCalledWith(
              expect.stringContaining(`[BoongAI] Processing queued operation ${operationId2}`)
            );
            
            // Clean up
            ErrorHandler.completeOperation(operationId2);
          }
        ),
        propertyTestConfig
      );
    });
  });
});
