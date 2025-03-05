import { createLogger, transports, format } from 'winston';

export const logger = createLogger({
	transports: [new transports.Console()],
	format: format.combine(
		format.colorize(),
		format.timestamp(),
		format.printf(({ timestamp, level, message, meta }) => {
			let metaStr = '';
			if (meta) {
				metaStr = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
			}
			return `[${timestamp}] ${level}: ${message} ${metaStr}`;
		})
	),
});

export const setLogLevel = (logLevel: string) => {
	logger.level = logLevel;
};


export function exitProcess(exitCode: number): void {
	process.exit(exitCode);
  }
  