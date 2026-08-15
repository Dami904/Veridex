/**
 * Safe Exponential Backoff with Jitter (per reliability-observability skill)
 * Restricts automatic retries to idempotent calls or read operations only.
 */
export async function retryWithBackoff(fn, {
  maxRetries = 3,
  initialDelayMs = 200,
  maxDelayMs = 2000,
  factor = 2,
  isIdempotent = false,
  operationName = 'operation',
} = {}) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      if (attempt > maxRetries || !isIdempotent) {
        if (!isIdempotent) {
          console.warn(`[Retry Safety Guard] Non-idempotent operation '${operationName}' failed. Refusing blind retry to prevent duplicate side effects.`);
        }
        throw error;
      }

      // Calculate jittered delay
      const baseDelay = Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      const jitter = Math.random() * 0.3 * baseDelay;
      const delay = baseDelay + jitter;

      console.warn(`[Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms... Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
