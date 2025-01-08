export interface LoggerData {
  date: string;
  level: LoggerLevelEnum;
  scope: string;
  args: any[];
  formattedArgs: any[];
}

export enum LoggerLevelEnum {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LoggerPayload {
  level: LoggerLevelEnum;
  scope: string;
  args: any[];
}

export interface LoggerOptions {
  /**
   * @description 日志领域
   * @description_en Log scope
   * @default '
   */
  scope?: string;

  transformer?: (data: LoggerData) => {
    logArr: any[];
  };
}