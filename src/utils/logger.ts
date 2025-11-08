import {
  LogLevel,
  type Logger as DuckDBLogger,
  type LogEntryVariant,
} from "@duckdb/duckdb-wasm";

declare global {
  interface Window {
    SimpleLogger?: SimpleLogger;
  }
}

class SimpleLogger implements DuckDBLogger {
  name: string;

  constructor(name = "Chart Builder Logger") {
    this.name = name;
  }

  _log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    ...args: unknown[]
  ) {
    const timestamp = new Date().toISOString();
    const topMessage = `${timestamp} [${this.name}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case "info":
        console.info(topMessage, ...args);
        break;
      case "warn":
        console.warn(topMessage, ...args);
        break;
      case "error":
        console.error(topMessage, ...args);
        break;
      case "debug":
        console.debug(topMessage, ...args);
        break;
    }
  }

  log(entry: LogEntryVariant): void {
    switch (entry.level) {
      case LogLevel.INFO:
        console.log(entry);
        break;
      case LogLevel.DEBUG:
        console.debug(entry);
        break;
      case LogLevel.WARNING:
        console.warn(entry);
        break;
      case LogLevel.ERROR:
        console.error(entry);
        break;
      case LogLevel.NONE:
        console.log(entry);
        break;
      default:
        logNever(entry.level);
    }
  }

  info(message: string, ...args: unknown[]) {
    this._log("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this._log("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this._log("error", message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    this._log("debug", message, ...args);
  }
}

function getLogger(): SimpleLogger {
  if (typeof window !== "undefined") {
    return window.SimpleLogger || new SimpleLogger();
  }
  return new SimpleLogger();
}

export const Logger = getLogger();

export function logNever(x: never): void {
  Logger.warn(`Unexpected object: ${JSON.stringify(x)}`);
}
