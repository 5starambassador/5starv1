type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const isDevelopment = process.env.NODE_ENV === 'development'

class Logger {
    private log(level: LogLevel, message: string, ...args: any[]) {
        const timestamp = new Date().toISOString()
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`

        switch (level) {
            case 'info':
                console.log(prefix, message, ...args)
                break
            case 'warn':
                console.warn(prefix, message, ...args)
                break
            case 'error':
                console.error(prefix, message, ...args)
                // In production, integration with Sentry/Datadog would go here
                break
            case 'debug':
                if (isDevelopment) {
                    console.debug(prefix, message, ...args)
                }
                break
        }
    }

    info(message: string, ...args: any[]) {
        this.log('info', message, ...args)
    }

    warn(message: string, ...args: any[]) {
        this.log('warn', message, ...args)
    }

    error(message: string, ...args: any[]) {
        this.log('error', message, ...args)
    }

    debug(message: string, ...args: any[]) {
        this.log('debug', message, ...args)
    }
}

export const logger = new Logger()
