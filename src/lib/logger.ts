/**
 * Centralized logging utility for production-ready error handling
 * In production, errors are logged but not exposed to console
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  error?: Error
  context?: Record<string, unknown>
  timestamp: string
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logs: LogEntry[] = []
  private maxLogs = 100

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      error,
      context,
      timestamp: new Date().toISOString(),
    }
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // In development, log to console
    if (this.isDevelopment) {
      const logMethod = entry.level === 'error' ? console.error : 
                        entry.level === 'warn' ? console.warn :
                        console.log
      
      if (entry.error) {
        logMethod(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.error, entry.context)
      } else {
        logMethod(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context)
      }
    }

    // In production, you could send logs to an error tracking service
    // Example: Sentry, LogRocket, etc.
    if (!this.isDevelopment && entry.level === 'error') {
      // Send to error tracking service
      // this.sendToErrorTracking(entry)
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.addLog(this.createLogEntry('error', message, error, context))
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.addLog(this.createLogEntry('warn', message, undefined, context))
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.addLog(this.createLogEntry('info', message, undefined, context))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.addLog(this.createLogEntry('debug', message, undefined, context))
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }
}

export const logger = new Logger()

