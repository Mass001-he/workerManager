export const dbVersion: number = 1;

export enum Action {
  initDB = 'initDB',
  dbReady = 'dbReady',
  initDBError = 'initDBError',
}

export enum Status {
  success = 'success',
  error = 'error',
}
