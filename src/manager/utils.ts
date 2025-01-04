//生成id localStorage
export class Counter {
  count = 0;
  next() {
    return this.count++;
  }
}

export const generateReqId = () => {
  const newId = `${Date.now()}-${Math.random()}`
  return newId
}
