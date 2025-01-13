import { FC } from 'react'
import styles from './index.module.css'
import { clsx } from './helper'
import {
  SQLQueryMethods,
  SQLHelperProvider,
  ViewStateProvider,
} from './context'
import { TableList } from './components/tableList'
import { Table } from './components/table'

//#region component Types
export interface SQLViewProps extends SQLQueryMethods {
  className?: string
  style?: React.CSSProperties
}
//#endregion component Types

//#region component
export const SQLView: FC<SQLViewProps> = (props) => {
  const { exec, query, className, style } = props

  return (
    <SQLHelperProvider exec={exec} query={query}>
      <ViewStateProvider>
        <div className={clsx(styles.wrapper, className)} style={style}>
          <TableList />
          <Table
            style={{
              flex: 1,
            }}
          />
        </div>
      </ViewStateProvider>
    </SQLHelperProvider>
  )
}

//#endregion component
