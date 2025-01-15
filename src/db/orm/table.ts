import type { OptionProperty, Prettier } from '../../utils.type';
import type { ColumnDate, ColumnOptional, ColumnType } from './column';
import { ColumnInteger, date } from './column';

type PartialKernel<T extends Record<string, any>> = OptionProperty<
  T,
  keyof KernelColumns
>;

export type ColumnInfer<T extends Record<string, ColumnType>> = Prettier<
  PartialKernel<
    {
      [K in keyof T as T[K] extends ColumnOptional<ColumnType>
        ? never
        : K]: T[K]['__type'];
    } & {
      [K in keyof T as T[K] extends ColumnOptional<ColumnType>
        ? K
        : never]?: T[K]['__type'];
    }
  >
>;

type KernelColumns = {
  _id: ColumnInteger;
  _createAt: ColumnDate;
  _updateAt: ColumnDate;
  _deleteAt: ColumnDate;
};

function kernelColumnPrimaryId() {
  const column = new ColumnInteger();
  column._autoIncrement = true;
  column._primary = true;
  column._required = true;
  return column;
}

type TableColumns<T extends Record<string, ColumnType>> = T & KernelColumns;
export class Table<
  N extends string = any,
  T extends Record<string, ColumnType> = any,
> {
  static kernelColumns = {
    _id: kernelColumnPrimaryId(),
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
      let columnDesc = column;
      //@ts-expect-error  ignore wrap
      if (column['_column']) {
        //@ts-expect-error
        columnDesc = column.unwrap();
      }

      const sql = columnDesc.genCreateSql();
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
