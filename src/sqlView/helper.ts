export const clsx = (...args: any[]) => {
  return args.filter(Boolean).join(' ');
};

export interface Column {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: null;
  pk: number;
}

export interface GetAllTablesResult {
  name: string;
  columns: Column[];
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export const getAllTables = async (query: (sql: string) => Promise<any[]>) => {
  const tables = await query(
    `SELECT name FROM sqlite_master WHERE type='table';`,
  );
  //查询表的字段
  console.log('fix', tables);
  await Promise.all(
    tables.map(async (table) => {
      table.columns = await query(`PRAGMA table_info(${table.name})`);
    }),
  );
  tables.forEach((table) => {
    table.columns.forEach((column: { type: string }) => {
      if (column?.type === '') {
        column.type = 'UNKNOWN';
      }
    });
  });
  return tables as GetAllTablesResult[];
};

export interface FilterItem {
  type: 'string' | 'number' | 'unknown';
  value: string;
}
export const ValidType = ['string', 'number'];

export type TFilter = Record<string, FilterItem>;
export const formatSQLType = (type: string) => {
  switch (type) {
    case 'TEXT':
      return 'string';
    case 'INTEGER':
      return 'number';
    default:
      return 'unknown';
  }
};
export const tableQuery = async (
  query: (sql: string) => Promise<any[]>,
  tableName: string,
  pagination: Pagination,
  filter: TFilter = {},
) => {
  const { page, pageSize } = pagination;
  const filterConditions = Object.keys(filter)
    .map((key) => {
      const { type, value } = filter[key];
      if (['', '<', '>'].includes(value)) return '';
      if (type === 'string') {
        return `${key} LIKE '%${value}%'`;
      } else if (type === 'number') {
        if (value.startsWith('>') || value.startsWith('<')) {
          return `${key} ${value}`;
        } else {
          return `${key} = ${value}`;
        }
      } else {
        return '';
      }
    })
    .filter(Boolean)
    .join(' AND ');

  const whereClause =
    filterConditions !== '' ? `WHERE ${filterConditions}` : '';

  const data = await query(
    `SELECT * FROM ${tableName} ${whereClause} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};`,
  );
  const totalResult = await query(
    `SELECT COUNT(*) as count FROM ${tableName} ${whereClause};`,
  );

  const total = totalResult[0].count;

  const isLastPage = page * pageSize >= total;

  return {
    data,
    total,
    currentPage: page,
    pageSize,
    isLastPage,
  };
};

export const editTableData = async (
  query: (sql: string) => Promise<any>,
  tableName: string,
  row: any,
  field: string,
  value: any,
) => {
  const formattedValue = typeof value === 'string' ? `'${value}'` : value;
  if (row.id) {
    return await query(
      `UPDATE ${tableName} SET ${field} = ${formattedValue} WHERE id = ${row.id};`,
    );
  } else {
    return await query(
      `UPDATE ${tableName} SET ${field} = ${formattedValue} WHERE ${Object.keys(
        row,
      )
        .map((key) => `${key} = ${row[key]}`)
        .join(' AND ')}}`,
    );
  }
};

export const deleteTableData = async (
  query: (sql: string) => Promise<any>,
  tableName: string,
  row: any,
) => {
  if (row.id) {
    return await query(`DELETE FROM ${tableName} WHERE id = ${row.id};`);
  } else {
    return await query(
      `DELETE FROM ${tableName} WHERE ${Object.keys(row)
        .map((key) => `${key} = ${row[key]}`)
        .join(' AND ')}`,
    );
  }
};

export const setCache = (key: string, value: any) => {
  localStorage.setItem('SQL_VIEW' + key, JSON.stringify(value));
};

export const getCache = (key: string) => {
  const value = localStorage.getItem('SQL_VIEW' + key);
  return value ? value : undefined;
};
