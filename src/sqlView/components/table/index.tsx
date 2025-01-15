import { FC, useEffect, useRef, useState } from 'react';
import {
  clsx,
  deleteTableData,
  editTableData,
  formatSQLType,
  getCache,
  setCache,
  tableQuery,
  type TFilter,
  ValidType,
} from '../../helper';
import styles from './index.module.css';
import { useHelper, useViewState } from '../../context';
import { RefreshSvg, TableSvg } from '../svg';
import { Button } from '../button';
import { IconButton } from '../button/iconButton';
import { ContextMenu } from '../contextMenu';
import { toast } from '../toast';
import { Input } from '../input';
//#region component Types
export interface TableProps {
  className?: string;
  style?: React.CSSProperties;
}
//#endregion component Types

const DEFPAGESIZE = getCache('pageSize') ? parseInt(getCache('pageSize')!) : 50;
//#region component
export const Table: FC<TableProps> = (props) => {
  const { className, style } = props;
  const { query, exec } = useHelper();
  const { selectedTable, setSelectedRow, selectedRow } = useViewState();
  const columns = selectedTable?.columns;

  const page = useRef(1);
  const [data, setData] = useState<any[]>([]);
  const [isEnd, setIsEnd] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = useRef(DEFPAGESIZE);
  const totalPageSize = Math.ceil(total / pageSize.current);
  const mapFilter = useRef<TFilter>({});

  const changePageSize = (size: number) => {
    pageSize.current = size;
    page.current = 1;
    setCache('pageSize', size);
    queryTableData();
  };

  const queryTableData = async (callback?: () => void) => {
    if (!selectedTable) return;
    const res = await tableQuery(
      query,
      selectedTable.name,
      {
        page: page.current,
        pageSize: pageSize.current,
      },
      mapFilter.current,
    );
    const { data, isLastPage, total } = res;
    setData(data);
    setIsEnd(isLastPage);
    setTotal(total);
    callback?.();
  };

  useEffect(() => {
    queryTableData();
  }, [selectedTable]);

  const onColumnDoubleClick = async (row: any, column: any) => {
    const value = prompt(`请输入新的 ${column.name} 值`, row[column.name]);
    if (value === null) return;
    if (!selectedTable) return;
    await editTableData(exec, selectedTable.name, row, column.name, value);
    queryTableData();
  };

  if (!columns) return null;

  return (
    <div className={clsx(className, styles.root)} style={style}>
      <div className={clsx(className, styles.tools)}>
        <div className={clsx(className, styles.left)}>
          <TableSvg />
          {selectedTable.name}
        </div>
        <div className={clsx(className, styles.right)}>
          <Input
            label="pageSize"
            placeholder="50"
            style={{ width: 60 }}
            value={pageSize.current + ''}
            onChange={(v) => {
              if (v === '0') {
                changePageSize(DEFPAGESIZE);
              } else if (v === '') {
                changePageSize(1);
              } else {
                changePageSize(parseInt(v));
              }
            }}
          />
          <IconButton
            onClick={() => {
              queryTableData(() => {
                toast.show('刷新成功');
              });
            }}
          >
            <RefreshSvg size={20} />
          </IconButton>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <table
          className={styles.table}
          border={0}
          cellPadding={0}
          cellSpacing={0}
        >
          <thead>
            <tr>
              <th className={styles.placeholder}></th>
              <th key={'rowid'}>rowid</th>
              {columns.map((column) => {
                const type = formatSQLType(column.type);
                return (
                  <th key={column.name}>
                    <div>
                      {column.name}&nbsp;
                      <span style={{ fontSize: '.9em' }}>({column.type})</span>
                    </div>
                    {ValidType.includes(type) && (
                      <div>
                        <Input
                          placeholder="filter"
                          showClear
                          onChange={(value) => {
                            mapFilter.current[column.name] = {
                              type,
                              value,
                            };
                            queryTableData();
                          }}
                        />
                      </div>
                    )}
                  </th>
                );
              })}
              <th className={styles.placeholder}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const jsonStr = JSON.stringify(row);
              const isSelected = selectedRow === jsonStr;
              return (
                <ContextMenu
                  key={rowIndex + page.current}
                  items={[
                    {
                      label: '复制',
                      onClick: () => {
                        navigator.clipboard.writeText(jsonStr);
                        toast.show('已复制到剪贴板');
                      },
                    },
                    {
                      label: '删除',
                      onClick: async () => {
                        if (!selectedTable) return;
                        //弹出确认框
                        if (!window.confirm('确认删除吗？')) return;
                        await deleteTableData(exec, selectedTable.name, row);
                        queryTableData();
                      },
                    },
                  ]}
                >
                  <tr
                    key={rowIndex + page.current}
                    tabIndex={1}
                    onClick={() => {
                      setSelectedRow(jsonStr);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedRow(jsonStr);
                      }
                    }}
                    onContextMenu={() => {
                      setSelectedRow(jsonStr);
                    }}
                    className={clsx(styles.row, isSelected && styles.selected)}
                  >
                    <td className={styles.placeholder}></td>
                    <td key={row.rowid}>
                      <div>{row.rowid}</div>
                    </td>

                    {columns.map((column) => (
                      <td
                        key={column.name}
                        onDoubleClick={() => {
                          onColumnDoubleClick(row, column);
                        }}
                      >
                        {row[column.name]}
                      </td>
                    ))}
                    <td className={styles.placeholder}></td>
                  </tr>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <Button
          disabled={page.current === 1}
          onClick={() => {
            page.current--;
            queryTableData();
          }}
        >
          上一页
        </Button>

        <div className={styles.pageList}>
          {totalPageSize > 1 && (
            <>
              <Button
                key="start"
                onClick={() => {
                  page.current = 1;
                  queryTableData();
                }}
                disabled={page.current === 1}
              >
                首页
              </Button>
              {page.current > 4 && <span>...</span>}
              {Array.from({ length: totalPageSize })
                .slice(
                  Math.max(0, page.current - 4),
                  Math.min(totalPageSize, page.current + 4),
                )
                .map((_, index) => {
                  const pageIndex = Math.max(0, page.current - 4) + index + 1;
                  return (
                    <Button
                      size="lg"
                      key={pageIndex}
                      onClick={() => {
                        page.current = pageIndex;
                        queryTableData();
                      }}
                      disabled={page.current === pageIndex}
                    >
                      {pageIndex}
                    </Button>
                  );
                })}
              {page.current < totalPageSize - 4 && <span>...</span>}
              <Button
                key="end"
                onClick={() => {
                  page.current = totalPageSize;
                  queryTableData();
                }}
                disabled={page.current === totalPageSize}
              >
                尾页
              </Button>
            </>
          )}
        </div>

        <Button
          onClick={() => {
            page.current++;
            queryTableData();
          }}
          disabled={isEnd}
        >
          下一页
        </Button>
        <span>
          {page.current} / {totalPageSize}
        </span>
      </div>
    </div>
  );
};
//#endregion component
