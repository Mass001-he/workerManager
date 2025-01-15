export enum AllowedSqlType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN', // 布尔值
  DATETIME = 'DATETIME',
}

export abstract class ColumnType<Type = any> {
  __sqlType!: AllowedSqlType;
  __type!: Type;

  /** 是否必填 */
  _required: boolean = true;
  /** 是否唯一 */
  _unique: boolean = false;
  /** 是否主键 */
  _primary: boolean = false;
  /** 是否自增 */
  _autoIncrement: boolean = false;
  _default: string | undefined = undefined;
  _max: number | undefined = undefined;
  _min: number | undefined = undefined;
  _enums: Type[] | undefined = undefined;
  _index: string | undefined = undefined;

  // autoIncrement() {
  //   this._autoIncrement = true;
  //   return this;
  // }

  // primary() {
  //   this._primary = true;
  //   return this;
  // }

  index(name: string) {
    this._index = name;
    return this;
  }

  unique() {
    this._unique = true;
    return this;
  }

  optional() {
    return new ColumnOptional(this);
  }

  /**
   * 仅创建时的字段，校验合法性不由sql语句实现，而是由{@link verify}方法实现
   * @returns
   */
  genCreateSql(): string[] {
    let sql: string[] = [];
    if (this._autoIncrement && !this._primary) {
      throw new Error('AUTOINCREMENT can only be applied to a primary key');
    }
    if (this._primary) {
      sql.push('PRIMARY KEY');
    }
    if (this._required) {
      sql.push('NOT NULL');
    }
    if (this._unique) {
      sql.push('UNIQUE');
    }
    if (this._autoIncrement) {
      sql.push('AUTOINCREMENT');
    }
    if (this._default !== undefined) {
      sql.push(`DEFAULT ${this._default}`);
    }
    return sql;
  }

  verify(value: any): string[] {
    const messages = [];
    if (this._required) {
      if (value === undefined || value === null) {
        messages.push('value is required');
      }
    }
    if (this._enums && !this._enums.includes(value)) {
      messages.push(`value must be one of ${this._enums.join(', ')}`);
    }
    return messages;
  }
}

export class ColumnOptional<Column extends ColumnType> extends ColumnType<
  Column['__type'] | undefined
> {
  constructor(protected _column: Column) {
    super();
    this._column._required = false;
  }

  unwrap() {
    return this._column;
  }

  verify(value: any) {
    return this._column.verify(value);
  }
}

class ColumnText extends ColumnType<string> {
  __sqlType = AllowedSqlType.TEXT;

  enum(enums: string[]) {
    this._enums = enums;
    return this;
  }

  max(max: number) {
    this._max = max;
    return this;
  }

  min(min: number) {
    this._min = min;
    return this;
  }

  default(value: string) {
    this._default = value;
    return this;
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'string') {
      messages.push('value must be string');
    }
    if (this._max && value.length > this._max) {
      messages.push(`value length must less than ${this._max}`);
    }
    if (this._min && value.length < this._min) {
      messages.push(`value length must greater than ${this._min}`);
    }
    return messages;
  }
}

export class ColumnInteger extends ColumnType<number> {
  __sqlType = AllowedSqlType.INTEGER;

  enum(enums: number[]) {
    this._enums = enums;
    return this;
  }

  max(max: number) {
    this._max = max;
    return this;
  }

  min(min: number) {
    this._min = min;
    return this;
  }

  default(value: number) {
    if (isNaN(value)) {
      throw new Error('value must be number');
    }
    this._default = value.toString();
    return this;
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'number') {
      messages.push('value must be number');
    }
    if (this._max && value > this._max) {
      messages.push(`value must less than ${this._max}`);
    }
    if (this._min && value < this._min) {
      messages.push(`value must greater than ${this._min}`);
    }
    return messages;
  }
}

class ColumnBoolean extends ColumnType<boolean> {
  __sqlType = AllowedSqlType.BOOLEAN;
  _default: string | undefined = undefined;

  default(value: boolean) {
    this._default = value ? 'TRUE' : 'FALSE';
    return this;
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'boolean') {
      messages.push('value must be boolean');
    }
    return messages;
  }
}

export class ColumnDate extends ColumnType<Date> {
  _now: string | undefined = undefined;
  __sqlType = AllowedSqlType.DATETIME;
  now() {
    this._now = 'current_timestamp';
    return this;
  }
  verify(value: any): string[] {
    const messages = [...super.verify(value)];
    if (!(value instanceof Date)) {
      messages.push('value must be Date');
    }
    return messages;
  }
}

export function text() {
  return new ColumnText();
}

export function integer() {
  return new ColumnInteger();
}

export function boolean() {
  return new ColumnBoolean();
}

export function date() {
  return new ColumnDate();
}
