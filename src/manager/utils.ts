//生成id localStorage
export class Counter {
  count = 0;
  next() {
    if (this.count >= Number.MAX_SAFE_INTEGER) {
      this.count = 0;
    }
    return this.count++;
  }
}

export const generateReqId = () => {
  const timestamp = Date.now();
  const randomNum1 = Math.random().toString(36).substr(2, 9);
  const randomNum2 = Math.random().toString(36).substr(2, 9);
  const uniqueId = `${timestamp}-${randomNum1}-${randomNum2}`;
  return uniqueId;
};

export const SchedulerDefReqId = 'SchedulerDefReqId';
