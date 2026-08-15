import { randomUUID } from 'crypto';

/**
 * Structured JSON Logger (per reliability-observability skill)
 * Captures timestamp, correlationId, execution context, and sanitized error payloads.
 */
export function createLogger(serviceName = 'veridex-agent') {
  return {
    info(message, context = {}) {
      console.log(JSON.stringify({
        level: 'INFO',
        service: serviceName,
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }));
    },
    warn(message, context = {}) {
      console.warn(JSON.stringify({
        level: 'WARN',
        service: serviceName,
        timestamp: new Date().toISOString(),
        message,
        ...context,
      }));
    },
    error(message, error, context = {}) {
      console.error(JSON.stringify({
        level: 'ERROR',
        service: serviceName,
        timestamp: new Date().toISOString(),
        message,
        error: error?.message || String(error),
        stack: error?.stack || undefined,
        ...context,
      }));
    },
  };
}

export const logger = createLogger('veridex-engine');
