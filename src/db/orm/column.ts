export abstract class BaseColumnDescriptor {
  /** 是否必填 */
  _required: boolean = false;
  /** 是否唯一 */
  _unique: boolean = false;
  /** 是否主键 */
  _primary: boolean = false;
  /** 是否自增 */
  _autoIncrement: boolean = false;

  autoIncrement() {
    this._autoIncrement = true;
    return this;
  }

  primary() {
    this._primary = true;
    return this;
  }

  required() {
    this._required = true;
    return this;
  }

  unique() {
    this._unique = true;
    return this;
  }
  /**
   * 仅创建时的字段，校验合法性不由sql语句实现，而是由{@link verify}方法实现
   * @returns
   */
  genCreateSql(): string[] {
    let sql: string[] = [];
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
    return sql;
  }

  abstract verify(value: any): true | string[];
}

abstract class EnumColumnDescriptor<T> {
  _enum?: T[] = [];
  enum(value: T[]) {
    this._enum = value;
    return this;
  }
}

class TextColumnDescriptor
  extends BaseColumnDescriptor
  implements EnumColumnDescriptor<string>
{
  _default?: string;
  _max?: number;
  _enum?: string[];
  constructor() {
    super();
  }

  max(max: number): this {
    this._max = max;
    return this;
  }

  enum(value: string[]): this {
    this._enum = value;
    return this;
  }

  default(value: string) {
    this._default = value;
    return this;
  }

  override genCreateSql() {
    const sql = super.genCreateSql();
    sql.unshift('TEXT');

    if (this._default) {
      sql.push(`DEFAULT ${this._default}`);
    }
    return sql;
  }

  verify(value: any) {
    const message: string[] = [];
    if (typeof value !== 'string') {
      message.push('value is not a string');
    }
    if (this._max && value.length > this._max) {
      message.push(`value length greater than max: ${this._max}`);
    }
    if (this._enum && !this._enum.includes(value)) {
      message.push('value not in enum');
    }
    if (message.length) {
      return message;
    }
    return true;
  }
}

class IntegerColumnDescriptor
  extends BaseColumnDescriptor
  implements EnumColumnDescriptor<number>
{
  _default?: number;
  _min?: number;
  _max?: number;
  _enum?: number[];
  constructor() {
    super();
  }

  default(value: number) {
    this._default = value;
    return this;
  }

  min(value: number) {
    this._min = value;
    return this;
  }

  max(value: number) {
    this._max = value;
    return this;
  }

  enum(value: number[]) {
    this._enum = value;
    return this;
  }

  override genCreateSql() {
    const sql = super.genCreateSql();
    sql.unshift('INTEGER');

    if (this._default) {
      sql.push(`DEFAULT ${this._default}`);
    }
    return sql;
  }

  verify(value: any) {
    const message: string[] = [];
    if (this._min && value < this._min) {
      message.push('value less than min');
    }
    if (this._max && value > this._max) {
      message.push('value greater than max');
    }
    if (this._enum && !this._enum.includes(value)) {
      message.push('value not in enum');
    }
    if (message.length) {
      return message;
    }
    return true;
  }
}

class TimestampColumnDescriptor extends BaseColumnDescriptor {
  _default?: number;
  constructor() {
    super();
  }

  defaultNow() {
    this._default = Date.now();
    return this;
  }

  override genCreateSql() {
    const sql = super.genCreateSql();
    sql.unshift('TIMESTAMP');

    return sql;
  }

  verify(value: any) {
    const message: string[] = [];
    if (typeof value !== 'number') {
      message.push('value is not a number');
    }
    if (message.length) {
      return message;
    }
    return true;
  }
}

class BooleanColumnDescriptor extends BaseColumnDescriptor {
  _default?: boolean;
  constructor() {
    super();
  }

  default(value: boolean) {
    this._default = value;
    return this;
  }

  override genCreateSql() {
    const sql = super.genCreateSql();
    sql.unshift('BOOLEAN');

    if (this._default) {
      sql.push(`DEFAULT ${this._default}`);
    }
    return sql;
  }

  verify(value: any) {
    const message: string[] = [];
    if (typeof value !== 'boolean') {
      message.push('value is not a boolean');
    }
    if (message.length) {
      return message;
    }
    return true;
  }
}

type ColumnType<T> = T extends TextColumnDescriptor
  ? string
  : T extends IntegerColumnDescriptor
    ? number
    : T extends TimestampColumnDescriptor
      ? number
      : T extends BooleanColumnDescriptor
        ? boolean
        : any;

export type TableRow<T extends Record<string, BaseColumnDescriptor>> = {
  [K in keyof T]: ColumnType<T[K]>;
};

export class Table<
  N extends string = any,
  T extends Record<string, BaseColumnDescriptor> = any,
> {
  constructor(
    public name: N,
    public columns: T,
  ) {}

  genCreateSql() {
    const columns = Object.entries(this.columns).map(([name, column]) => {
      return `${name} ${column.genCreateSql().join(' ')}`;
    });
    return `CREATE TABLE IF NOT EXISTS ${this.name} (${columns.join(', ')});`;
  }
}

export function text() {
  return new TextColumnDescriptor();
}

export function integer() {
  return new IntegerColumnDescriptor();
}

export function timestamp() {
  return new TimestampColumnDescriptor();
}

export function boolean() {
  return new BooleanColumnDescriptor();
}

export function table<
  N extends string,
  T extends Record<string, BaseColumnDescriptor>,
>(name: N, columns: T) {
  return new Table<N, T>(name, columns);
}