import {
  type LoggerData,
  LoggerLevelEnum,
  type LoggerPayload,
  type LoggerOptions,
} from './types';
import { getLoggerData } from './utils';
const MaxScopeLength = 13;

function rendererTransformer(data: LoggerData) {
  const date = [
    `%c${data.date}`,
    'color: rgb(104,255,104);background: rgb(29,63,42);padding: 0 4px;border-radius: 2px;',
  ];

  const logArr = [
    ...date,
    `<${data.scope}>${' '.repeat(MaxScopeLength - data.scope.length)}:`,
    ...data.args,
  ];
  if (data.scope.length === 0) {
    logArr.splice(2, 1);
  }
  return {
    logArr,
  };
}

export class Logger {
  static loggerInstanceMap = new Map<string, Logger>();

  static globalOptions: Required<LoggerOptions> = {
    scope: '',
    transformer(data) {
      return rendererTransformer(data);
    },
  };
  static setOptions(options: LoggerOptions) {
    Logger.globalOptions = {
      ...Logger.globalOptions,
      ...options,
    };
  }
  static scope(scope: string): Logger {
    if (typeof scope !== 'string') {
      throw new Error('Scope must be a string');
    }
    if (scope.length > MaxScopeLength) {
      throw new Error('Scope length must be less than 15');
    }
    if (Logger.loggerInstanceMap.has(scope)) {
      return Logger.loggerInstanceMap.get(scope) as Logger;
    }
    return new Logger({
      ...Logger.globalOptions,
      scope,
    });
  }
  private static baseIns = new Logger();
  static info(...args: any[]) {
    Logger.baseIns.info(...args);
  }
  static warn(...args: any[]) {
    Logger.baseIns.warn(...args);
  }
  static error(...args: any[]) {
    Logger.baseIns.error(...args);
  }

  protected options: Required<LoggerOptions>;

  private constructor(options: LoggerOptions = {}) {
    this.options = {
      ...Logger.globalOptions,
      ...options,
    };
    Logger.loggerInstanceMap.set(
      this.options.scope ? this.options.scope : 'DEF_SCOPE',
      this,
    );
  }

  _log(payload: LoggerPayload) {
    const dataObj = getLoggerData(payload.level, this.options, payload.args);
    try {
      const { logArr } = this.options.transformer(dataObj);
      let method = undefined;
      switch (payload.level) {
        case LoggerLevelEnum.INFO:
          method = console.log;
          break;
        case LoggerLevelEnum.WARN:
          method = console.warn;
          break;
        case LoggerLevelEnum.ERROR:
          method = console.error;
          break;
        default:
          throw new Error('[Logger Error] Unknown log level');
      }
      return {
        print: method.bind(this, ...logArr),
      };
    } catch (error: any) {
      const msg = error?.message ?? '[Logger Error] Transformer error';
      throw new Error(msg);
    }
  }

  info(...args: any[]) {
    return this._log({
      level: LoggerLevelEnum.INFO,
      scope: this.options.scope,
      args,
    });
  }

  warn(...args: any[]) {
    return this._log({
      level: LoggerLevelEnum.WARN,
      scope: this.options.scope,
      args,
    });
  }

  error(...args: any[]) {
    return this._log({
      level: LoggerLevelEnum.ERROR,
      scope: this.options.scope,
      args,
    });
  }
}
