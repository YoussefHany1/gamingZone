import pino from 'pino';

const pinoInstance = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

type AppwriteLogFn = (...args: unknown[]) => void;
let appwriteLog: AppwriteLogFn | null = null;
let appwriteError: AppwriteLogFn | null = null;

export function setAppwriteLogger(log: AppwriteLogFn | null, error: AppwriteLogFn | null) {
  appwriteLog = log;
  appwriteError = error;
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(' ');
}

export const logger = {
  info(...args: unknown[]) {
    (pinoInstance.info as Function)(...args);
    if (appwriteLog) appwriteLog(formatArgs(args));
  },
  warn(...args: unknown[]) {
    (pinoInstance.warn as Function)(...args);
    if (appwriteLog) appwriteLog(`[WARN] ${formatArgs(args)}`);
  },
  error(...args: unknown[]) {
    (pinoInstance.error as Function)(...args);
    const msg = formatArgs(args);
    if (appwriteError) appwriteError(msg);
    else if (appwriteLog) appwriteLog(`[ERROR] ${msg}`);
  },
  debug(...args: unknown[]) {
    (pinoInstance.debug as Function)(...args);
  },
};

