import { type FC, useState, useEffect } from 'react';
import { useHelper, useViewState } from '../../context';
import { clsx, getAllTables, type GetAllTablesResult } from '../../helper';
import styles from './index.module.css';
import { SQLiteSvg, TableSvg } from '../svg';
import { IconButton } from '../button/iconButton';
import { Modal } from '../modal';
import { Button } from '../button';

export const TableList: FC = () => {
  const helper = useHelper();
  const [tables, setTables] = useState<GetAllTablesResult[]>([]);
  const { selectedTable, setSelectedTable } = useViewState();
  const [showModal, setShowModal] = useState(false);

  const queryTables = async () => {
    const tables = await getAllTables(helper.query);
    setTables(tables);
  };

  useEffect(() => {
    queryTables();
  }, []);

  const querySqlInput = async () => {
    const code = (document.getElementById('code_input') as any)!
      .value as string;
    if (code) {
      helper.query(code).then((res) => {
        console.log(res);
      });
    }
  };

  return (
    <div className={styles.tableListWrapper}>
      <div className={styles.top}>
        <div className={styles.tag}>ALLTables</div>
        <div className={styles.tableList}>
          {tables.map((table) => {
            const isSelected = selectedTable?.name === table.name;
            return (
              <div
                key={table.name}
                onClick={() => setSelectedTable(table)}
                className={clsx(isSelected && styles.selected, styles.item)}
              >
                <div className={styles.tableName}>
                  <TableSvg />
                  {table.name}
                </div>

                <div
                  className={styles.columns}
                  style={{
                    height: isSelected ? 'unset' : 0,
                    transform: `scale(${isSelected ? 1 : 0})`,
                  }}
                >
                  {table.columns.map((column) => (
                    <div key={column.name} className={styles.column}>
                      <div>({column.type})</div>
                      <div>{column.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.bot}>
        <IconButton
          onClick={() => setShowModal((o) => !o)}
          style={{
            padding: '10px',
          }}
        >
          <SQLiteSvg />
        </IconButton>
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Code Input"
        >
          <div
            className={styles.actions}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'BUTTON') {
                const codeInput = document.getElementById(
                  'code_input',
                ) as HTMLTextAreaElement;
                codeInput.value += target.innerText + ' ';
              }
            }}
          >
            {['SELECT *', 'INSERT', 'UPDATE', 'DELETE', 'FROM', ';'].map(
              (it) => (
                <Button size="sm" key={it}>
                  {it}
                </Button>
              ),
            )}
          </div>
          <div className={styles.actions}>
            {tables.map((it) => {
              const { name } = it;
              return (
                <Button
                  size="sm"
                  key={name}
                  onClick={() => {
                    const codeInput = document.getElementById(
                      'code_input',
                    ) as HTMLTextAreaElement;
                    codeInput.value += ` ${name} `;
                  }}
                >
                  {name}
                </Button>
              );
            })}
          </div>

          <div className={styles.modalContent}>
            <textarea
              name="code"
              id="code_input"
              cols={40}
              rows={20}
              className={styles.textarea}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const codeInput = document.getElementById(
                    'code_input',
                  ) as HTMLTextAreaElement;
                  codeInput.value += '  ';
                } else if (e.key === 'Enter') {
                  //如果带有shift键，就换行
                  if (e.shiftKey) {
                    return;
                  }

                  e.preventDefault();
                  querySqlInput();
                }
              }}
            ></textarea>
            <Button size="lg" onClick={querySqlInput}>
              Run
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};
