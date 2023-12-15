/**
 * Log level
 * The larger, the more verbose
 */
export enum LogLevel {
  FATAL,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  TRACE,
}

export function parseLogLevel(lvl: number): LogLevel;
export function parseLogLevel(lvl: string): LogLevel;
export function parseLogLevel(lvl: LogLevel): LogLevel;
export function parseLogLevel(lvl: unknown): LogLevel {
  if (typeof lvl === 'number') return lvl as LogLevel;
  if (typeof lvl === 'string') {
    const l = lvl.toUpperCase();
    if (l in LogLevel) return LogLevel[l as keyof typeof LogLevel];
  }
  throw new Error(`Invalid log level: ${lvl}`);
}

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogTransformer {
  /**
   * Transform log metadata
   * @param level
   * @param message
   * @param meta
   */
  transform(level: LogLevel, message: string, meta: LogMetadata): LogMetadata;
}

export interface LogTransport {
  log(level: LogLevel, message: string, meta: LogMetadata): void;
}

export class Logger implements LogTransport {
  public readonly transformers: readonly LogTransformer[] = [
    new TimestampAppender(),
  ];
  public readonly transports: readonly LogTransport[] = [
    new ConsoleTransport(LogLevel.INFO, { prettify: true }),
  ];

  constructor({
    transformers = [] as LogTransformer[],
    transports = [] as LogTransport[],
  } = {}) {
    this.transformers = transformers;
    this.transports = transports;
  }

  child(moduleName: string, meta: LogMetadata = {}): Logger {
    const transformers = [...this.transformers, new ModuleAppender(moduleName)];
    if (Object.keys(meta).length > 0)
      transformers.push(new MetaAppender(meta, false));
    return new Logger({
      transformers,
      transports: this.transports as LogTransport[],
    });
  }

  log(level: LogLevel, message: string, meta: LogMetadata) {
    for (const transport of this.transports) {
      transport.log(level, message, meta);
    }
  }

  trace(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.TRACE, message, meta);
  }

  debug(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.ERROR, message, meta);
  }

  fatal(message: string, meta: LogMetadata = {}) {
    this.log(LogLevel.FATAL, message, meta);
  }
}

export class MetaAppender implements LogTransformer {
  /**
   * Append metadata to log
   * @param meta
   * @param override_existing whether the metadata should override existing metadata in the log
   */
  constructor(
    public readonly meta: LogMetadata,
    public readonly override_existing = false,
  ) {}

  transform(level: LogLevel, message: string, meta: LogMetadata) {
    if (this.override_existing)
      return {
        ...meta,
        ...this.meta,
      };
    else
      return {
        ...this.meta,
        ...meta,
      };
  }
}

export class TimestampAppender extends MetaAppender {
  constructor() {
    super({ timestamp: Date.now() }, false);
  }
}

export class ModuleAppender extends MetaAppender {
  constructor(public readonly moduleName: string) {
    super({ module: moduleName }, false);
  }
}

export class ConsoleTransport implements LogTransport {
  /**
   * Format log message as structured log
   */
  public readonly prettify: boolean;
  constructor(
    public readonly level: LogLevel,
    { prettify = false } = {},
  ) {
    this.prettify = prettify;
  }

  log(level: LogLevel, message: string, meta: LogMetadata) {
    if (level > this.level) return;
    let logFn;
    if (level >= LogLevel.ERROR) logFn = console.error;
    else if (level === LogLevel.WARN) logFn = console.warn;
    else if (level === LogLevel.INFO) logFn = console.info;
    else if (level === LogLevel.DEBUG) logFn = console.debug;
    else if (level <= LogLevel.TRACE) logFn = console.trace;
    else logFn = console.log;
    if (this.prettify) {
      let msg = '';
      msg += `[${LogLevel[level].padEnd(5, ' ')}] `;
      if ('timestamp' in meta && typeof meta['timestamp'] === 'number') {
        const time = new Date(meta['timestamp'] as number);
        msg += `[${time.toUTCString()}] `;
        meta = { ...meta };
        delete meta['timestamp'];
      }
      if ('module' in meta) {
        msg += `${meta['module']} `;
        meta = { ...meta };
        delete meta['module'];
      }
      msg += `${message.padEnd(40, ' ')} `;
      for (const [key, value] of Object.entries(meta)) {
        msg += `${key}=${value} `;
      }
      logFn(msg);
    } else {
      logFn(LogLevel[level], message, meta);
    }
  }
}
