import type { OptionProperty, Prettier } from '../../utils.type';
import type { ColumnDate, ColumnOptional, ColumnType } from './column';
import { date } from './column';

type PartialKernel<T extends Record<string, any>> = OptionProperty<
  T,
  KernelColumnsKeys
>;

/**
 * 从Column对象中提取Typescript类型
 */
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
  _createAt: ColumnOptional<ColumnDate>;
  _updateAt: ColumnOptional<ColumnDate>;
  _deleteAt: ColumnOptional<ColumnDate>;
};

export type KernelColumnsKeys = keyof KernelColumns;
export const kernelColumnsKeys: KernelColumnsKeys[] = [
  '_createAt',
  '_updateAt',
  '_deleteAt',
];

interface IndexDesc<T> {
  unique?: T[];
  index?: T[];
  composite?: T[][];
}

type GetIndexFn<T> = () => IndexDesc<keyof T & string>;

type TableColumns<T extends Record<string, ColumnType>> = T & KernelColumns;
export class Table<
  N extends string = any,
  T extends Record<string, ColumnType> = any,
> {
  static kernelColumns = {
    _createAt: date().now(),
    _updateAt: date().now(),
    _deleteAt: date().optional(),
  };

  public name: N;
  public columns: TableColumns<T>;
  public getIndex: GetIndexFn<T> | undefined = undefined;

  constructor(name: N, columns: T, getIndex?: GetIndexFn<T>) {
    this.name = name;
    this.columns = {
      ...columns,
      ...Table.kernelColumns,
    };
    this.getIndex = getIndex;
  }

  private genCreateIndexSql() {
    if (!this.getIndex) {
      return '';
    }
    const { composite = [], index = [], unique = [] } = this.getIndex();
    //如果index和unique中有相同的字段，报错
    const conflict = index.filter((i) => unique.includes(i));
    if (conflict.length > 0) {
      throw new Error(`index and unique has conflict column: ${conflict}`);
    }
    const indexSql = index.map(
      (colName) =>
        `CREATE INDEX IF NOT EXISTS idx_${this.name}_${colName} ON ${this.name} (${colName});`,
    );
    const uniqueSql = unique.map(
      (colName) =>
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_${this.name}_${colName} ON ${this.name} (${colName});`,
    );
    const compositeSql = composite.map(
      (cols) =>
        `CREATE INDEX IF NOT EXISTS idx_${this.name}_${cols.join('_')} ON ${this.name} (${cols.join(
          ',',
        )});`,
    );
    return '\n' + [...indexSql, ...uniqueSql, ...compositeSql].join('\n');
  }

  genCreateSql() {
    const columns = Object.entries(this.columns).map(([name, column]) => {
      let columnDesc = column;
      //@ts-expect-error  ignore wrap
      if (column['_column']) {
        //@ts-expect-error
        columnDesc = column.unwrap();
      }

      const sql = columnDesc.genCreateSql();
      sql.unshift(name);
      return sql.join(' ');
    });

    const createTableSql = `CREATE TABLE IF NOT EXISTS ${this.name} (${columns.join(', ')});`;
    const indexSql = this.genCreateIndexSql();
    return createTableSql + indexSql;
  }
}

/**
 * @param name 表名
 * @param columns 列
 * @param getIndex 返回索引描述对象
 */
export function table<N extends string, T extends Record<string, ColumnType>>(
  name: N,
  columns: T,
  getIndex?: GetIndexFn<T>,
) {
  return new Table<N, T>(name, columns, getIndex);
}
