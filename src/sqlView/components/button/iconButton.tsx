import { FC } from 'react'
import { clsx } from '../../helper'
import styles from './index.module.css'

//#region component Types
export interface IconButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}
//#endregion component Types

//#region component
export const IconButton: FC<IconButtonProps> = (props) => {
  const { children, onClick, className, style } = props
  return (
    <div
      onClick={onClick}
      className={clsx(className, styles.iconBtnRoot)}
      style={style}
    >
      {children}
    </div>
  )
}
//#endregion component
