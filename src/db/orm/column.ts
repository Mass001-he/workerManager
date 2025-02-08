export enum AllowedSqlType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN', // 布尔值
  DATETIME = 'DATETIME',
}

/** 被包装的key */
const WrappedKey = '_column';

/** 获取被包装的Column类 */
function unwrapColumn<T>(column: ColumnType<T>): ColumnType<T> {
  //@ts-ignore
  if (column[WrappedKey] !== undefined) {
    //@ts-ignore
    return unwrapColumn(column[WrappedKey]);
  }
  return column;
}

export interface ColumnParams {
  __sqlType: AllowedSqlType;
  _required: boolean;
  _primary?: boolean;
  _autoIncrement?: boolean;
  _default?: string;
  _max?: number;
  _min?: number;
  _enums?: any[];
}

export abstract class ColumnType<Type = any> implements ColumnParams {
  __sqlType!: AllowedSqlType;
  __type!: Type;

  /** 是否必填 */
  _required: boolean = true;
  /** 是否主键 */
  _primary: true | undefined = undefined;
  /** 是否自增 */
  _autoIncrement: true | undefined = undefined;
  /** 默认值 */
  _default: string | undefined = undefined;
  _max: number | undefined = undefined;
  _min: number | undefined = undefined;
  _enums: Type[] | undefined = undefined;

  toJSON(): ColumnParams {
    const res: any = {};
    const column = unwrapColumn(this);
    Object.keys(column).forEach((key) => {
      if (key.startsWith('_')) {
        //@ts-expect-error ignore
        if (column[key] !== undefined) {
          //@ts-expect-error
          res[key] = column[key];
        }
      }
    });
    return res;
  }

  unwrap() {
    return this;
  }

  autoIncrement() {
    this._autoIncrement = true;
    return this;
  }

  primary() {
    this._primary = true;
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
    if (this.__sqlType) {
      sql.push(this.__sqlType);
    }
    if (this._autoIncrement) {
      sql.push('AUTOINCREMENT');
    }
    if (this._primary) {
      sql.push('PRIMARY KEY');
    }
    if (this._required) {
      sql.push('NOT NULL');
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
  constructor(column: Column) {
    super();
    column._required = false;
    //@ts-ignore
    this[WrappedKey] = column;
  }

  private get wrappedColumn() {
    //@ts-ignore
    return this[WrappedKey];
  }

  unwrap() {
    return this.wrappedColumn;
  }

  verify(value: any) {
    return this.wrappedColumn.verify(value);
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
    return new ColumnOptional(this);
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'string' && value !== undefined && value !== null) {
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
    return new ColumnOptional(this);
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'number' && value !== undefined && value !== null) {
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
    return new ColumnOptional(this);
  }

  verify(value: any) {
    const messages = [...super.verify(value)];
    if (typeof value !== 'boolean' && value !== undefined && value !== null) {
      messages.push('value must be boolean');
    }
    return messages;
  }
}

export class ColumnDate extends ColumnType<Date> {
  __sqlType = AllowedSqlType.DATETIME;
  now() {
    this._default = 'current_timestamp';
    return new ColumnOptional(this);
  }
  verify(value: any): string[] {
    const messages = [...super.verify(value)];
    if (!(value instanceof Date) && value !== undefined && value !== null) {
      messages.push('value must be Date');
    }
    return messages;
  }
}

function text() {
  return new ColumnText();
}

function integer() {
  return new ColumnInteger();
}

function boolean() {
  return new ColumnBoolean();
}

function date() {
  return new ColumnDate();
}

export const col = {
  text,
  integer,
  boolean,
  date,
};
