export * from './event';
export * from './logger';

export class Counter {
  count = 0;
  next() {
    if (this.count >= Number.MAX_SAFE_INTEGER) {
      this.count = 0;
    }
    return this.count++;
  }
}

export class Disposer {
  private _disposes: (() => void)[] = [];
  add(dispose: () => void) {
    this._disposes.push(dispose);
  }
  dispose() {
    this._disposes.forEach((dispose) => dispose());
    this._disposes = [];
  }
}
