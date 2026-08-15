import { randomUUID } from 'crypto';

/**
 * Veridex High-Observability Structured & Human-Readable Logger
 * Supports correlation IDs, latency tracking, agent stage traces, and error context.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function formatLogLine(level, service, message, context = {}) {
  const timestamp = new Date().toISOString();
  const correlationId = context.correlationId || '';
  const latency = context.latencyMs !== undefined ? ` [${context.latencyMs}ms]` : '';

  if (IS_PRODUCTION) {
    return JSON.stringify({
      level,
      service,
      timestamp,
      correlationId: correlationId || undefined,
      message,
      ...context,
    });
  }

  // Human-readable dev formatting with clear tags
  const corrTag = correlationId ? `[${correlationId.slice(0, 8)}] ` : '';
  return `[${timestamp.slice(11, 19)}] [${level}] [${service}] ${corrTag}${message}${latency}`;
}

export function createLogger(serviceName = 'veridex-engine') {
  return {
    info(message, context = {}) {
      console.log(formatLogLine('INFO', serviceName, message, context));
    },
    warn(message, context = {}) {
      console.warn(formatLogLine('WARN', serviceName, message, context));
    },
    agent(agentName, message, context = {}) {
      console.log(formatLogLine('AGENT', `${serviceName}:${agentName}`, message, context));
    },
    error(message, error, context = {}) {
      console.error(formatLogLine('ERROR', serviceName, message, {
        ...context,
        error: error?.message || String(error),
        stack: IS_PRODUCTION ? undefined : error?.stack,
      }));
    },
  };
}

export const logger = createLogger('veridex-engine');

/**
 * Express Request Observability Middleware
 */
export function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const logFn = level === 'ERROR' ? logger.error : level === 'WARN' ? logger.warn : logger.info;

    logFn(`HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, {
      correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs,
      ip: req.ip || req.socket.remoteAddress,
    });
  });

  next();
}
