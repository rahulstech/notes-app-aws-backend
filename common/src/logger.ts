import pino from "pino";
import { ENVIRONMENT } from "./environment";

const { NODE_ENV, LOG_LEVEL } = ENVIRONMENT;

export type LogExtras = Record<string,any>;

export class LogExtrasBuilder {

  public static create(src?: LogExtras): LogExtrasBuilder {
    return new LogExtrasBuilder();
  }

  private extras: LogExtras;

  private constructor(src?: LogExtras) {
    this.extras = src === undefined ? {} : src;
  }

  public put(key: string, value: any): LogExtrasBuilder {
    this.extras[key] = value;
    return this;
  }

  public build(): LogExtras {
    return this.extras
  }
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const env =  NODE_ENV || "dev";
const isDev = env === "dev";
const isTest = env === "test";

// Base logger config
const logger = pino({
  level: isDev ? LOG_LEVEL || "info" : "error",
  enabled: !isTest, // disable in test
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "yyyy-mm-dd HH:MM:ss" },
      }
    : undefined,
  // Remove unnecessary fields in prod
  base: isDev
    ? undefined // keep pid, hostname in dev if you want
    : {},       // empty object removes pid, hostname, etc.
  timestamp: isDev
    ? pino.stdTimeFunctions.isoTime // keep readable time in dev
    : false,                         // disable timestamp in prod
  formatters: {
    level(label) {
      return { level: label }; // replace numeric level with string
    },
  },
});

/**
 * Normalize log extras so caller can pass a string tag or a LogExtras object
 */
function normalizeExtras(extras?: string | LogExtras): LogExtras {
  if (!extras) return {};
  return typeof extras === "string" ? { tag: extras } : extras;
}

/**
 * Async wrapper: use setImmediate so logging
 * happens outside the main flow.
 */
function log(level: LogLevel, message: any, extras?: string | LogExtras) {
  const normalized = normalizeExtras(extras);

  setImmediate(() => {
    logger[level](
      {
        ...normalized, // include tag + any metadata
      },
      message
    );
  });
}

export const LOGGER = {
  logDebug: (message: any, extras?: string | LogExtras) =>
    log("debug", message, extras),

  logInfo: (message: any, extras?: string | LogExtras) =>
    log("info", message, extras),

  logWarn: (message: any, extras?: string | LogExtras) =>
    log("warn", message, extras),

  logError: (message: any, extras?: string | LogExtras) =>
    log("error", message, extras),

  logFatal: (message: any, extras?: string | LogExtras) =>
    log("fatal", message, extras),
};
