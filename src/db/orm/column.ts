export enum AllowedSqlType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN', // 布尔值
  DATETIME = 'DATETIME',
}

function processOptions<T extends ColumnType>(
  ins: T,
  baseIns: ColumnType<any>,
  newAttrs?: Partial<ColumnType<any>>,
) {
  ins._required = baseIns._required;
  ins._unique = baseIns._unique;
  ins._primary = baseIns._primary;
  ins._autoIncrement = baseIns._autoIncrement;
  ins._default = baseIns._default;
  ins._max = baseIns._max;
  ins._min = baseIns._min;
  ins._enums = baseIns._enums;
  if (!newAttrs) {
    return;
  }
  Object.keys(newAttrs).forEach((key) => {
    //@ts-ignore
    ins[key] = newAttrs[key];
  });
}

export abstract class ColumnType<Type = any> {
  static processOptions = processOptions;

  _sqlType!: AllowedSqlType;
  _type!: Type;

  /** 是否必填 */
  _required: boolean = true;
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
    return sql;
  }

  verify(value: any): string[] {
    const messages = [];
    if (this._required) {
      if (value === undefined || value === null) {
        messages.push('value is required');
      }
    }
    return messages;
  }
}

class ColumnOptional<Column extends ColumnType> extends ColumnType<
  Column['_type'] | undefined
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
  _sqlType = AllowedSqlType.TEXT;
  _default: string | undefined = undefined;
  _max: number | undefined = undefined;
  _min: number | undefined = undefined;
  _enums: string[] | undefined = undefined;

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
    if (this._enums && !this._enums.includes(value)) {
      messages.push(`value must be one of ${this._enums.join(', ')}`);
    }
    return messages;
  }
}

class ColumnInteger extends ColumnType<number> {
  _sqlType = AllowedSqlType.INTEGER;
  _default: number | undefined = undefined;
  _max: number | undefined = undefined;
  _min: number | undefined = undefined;
  _enums: number[] | undefined = undefined;

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
    this._default = value;
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
    if (this._enums && !this._enums.includes(value)) {
      messages.push(`value must be one of ${this._enums.join(', ')}`);
    }
    return messages;
  }
}

class ColumnBoolean extends ColumnType<boolean> {
  _sqlType = AllowedSqlType.BOOLEAN;
  _default: boolean | undefined = undefined;

  default(value: boolean) {
    this._default = value;
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
  _now: boolean = false;
  _sqlType = AllowedSqlType.DATETIME;
  now() {
    this._now = true;
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

type KernelColumns = {
  _id: ColumnInteger;
  _createAt: ColumnDate;
  _updateAt: ColumnDate;
  _deleteAt: ColumnDate;
};

type TableColumns<T extends Record<string, ColumnType>> = T & KernelColumns;
export class Table<
  N extends string = any,
  T extends Record<string, ColumnType> = any,
> {
  static kernelColumns = {
    _id: integer().primary().autoIncrement(),
    _createAt: date().now(),
    _updateAt: date().now(),
    _deleteAt: date().now(),
  };

  public columns: TableColumns<T>;
  constructor(
    public name: N,
    columns: T,
  ) {
    this.columns = {
      ...Table.kernelColumns,
      ...columns,
    };
  }

  genCreateSql() {
    const columns = Object.entries({
      ...Table.kernelColumns,
      ...this.columns,
    }).map(([name, column]) => {
      return `${name} ${column.genCreateSql().join(' ')}`;
    });
    return `CREATE TABLE IF NOT EXISTS ${this.name} (${columns.join(', ')});`;
  }
}

export function table<N extends string, T extends Record<string, ColumnType>>(
  name: N,
  columns: T,
) {
  return new Table<N, T>(name, columns);
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

type Prettier<T> = {
  [K in keyof T]: T[K];
};

export type ColumnInfer<T extends Record<string, ColumnType>> = Prettier<
  {
    [K in keyof T as T[K] extends ColumnOptional<ColumnType>
      ? never
      : K]: T[K]['_type'];
  } & {
    [K in keyof T as T[K] extends ColumnOptional<ColumnType>
      ? K
      : never]?: T[K]['_type'];
  }
>;
