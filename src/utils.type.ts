/**
 * @description 展示对象的所有字段
 */
export type Prettier<T> = {
  [K in keyof T]: T[K];
};

/**
 * @description 将对象的属性转换为可选属性
 * @example
 * ```ts
 * type A = {
 *   a: string;
 *   b: number;
 * }
 * type B = OptionProperty<A, 'a'>
 * {
 *   a?: string;
 *   b: number;
 * }
 */
export type OptionProperty<
  T extends Record<string, any>,
  P extends keyof T,
> = Partial<Pick<T, P>> & Omit<T, P>;
