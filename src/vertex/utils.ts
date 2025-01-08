export class Counter {
  count = 0;
  next() {
    if (this.count >= Number.MAX_SAFE_INTEGER) {
      this.count = 0;
    }
    return this.count++;
  }
}
