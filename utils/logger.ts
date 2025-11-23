/**
 * Logger utility module for CineCritique AI.
 * Provides environment-aware logging with different levels of severity.
 * Debug logs are automatically suppressed in production to reduce console noise.
 * @module utils/logger
 */

/**
 * Logger instance providing different logging methods based on severity.
 * All logging methods use variadic arguments and forward to native console methods.
 */
const logger = {
  /**
   * Logs debug-level messages only in development mode.
   * These messages are automatically suppressed in production builds.
   * Use for detailed debugging information during development.
   *
   * @param {...unknown} args - Any number of arguments to log
   * @example
   * logger.debug('Analysis started', { videoId: 123 });
   */
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },

  /**
   * Logs informational messages that appear in all environments.
   * Use for general application flow information.
   *
   * @param {...unknown} args - Any number of arguments to log
   * @example
   * logger.info('Video analysis completed successfully');
   */
  info: (...args: unknown[]) => {
    console.info(...args);
  },

  /**
   * Logs warning messages that appear in all environments.
   * Use for potentially problematic situations that don't prevent execution.
   *
   * @param {...unknown} args - Any number of arguments to log
   * @example
   * logger.warn('Large video file may take longer to process');
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Logs error messages that appear in all environments.
   * Use for errors and exceptions that need attention.
   * TODO: Future enhancement will send errors to monitoring service (Sentry, LogRocket, etc.)
   *
   * @param {...unknown} args - Any number of arguments to log (typically Error objects)
   * @example
   * logger.error('Failed to analyze video', error);
   */
  error: (...args: unknown[]) => {
    console.error(...args);
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
  }
};

export default logger;
