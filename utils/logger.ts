/**
 * Logger utility that respects environment mode.
 * Debug logs only appear in development mode.
 */
const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
  }
};

export default logger;
