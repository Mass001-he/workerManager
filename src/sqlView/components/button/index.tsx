import { FC, useMemo } from 'react'
import { clsx } from '../../helper'
import styles from './index.module.css'
//#region component Types
export interface ButtonProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  type?: 'primary' | 'default' | 'danger'
  disabled?: boolean
  onClick?: () => void
}
//#endregion component Types

const getSizeStyle = (size: ButtonProps['size']) => {
  switch (size) {
    case 'sm':
      return {
        fontSize: '12px',
        padding: '1px 4px',
      }

    case 'lg':
      return {
        fontSize: '16px',
        padding: '2px 6px',
      }
    case 'xl':
      return {
        fontSize: '20px',
        padding: '2px 6px',
      }
    case 'xxl':
      return {
        fontSize: '24px',
        padding: '3px 8px',
      }
    case 'md':
    default:
      return {
        fontSize: '14px',
        padding: '2px 6px',
      }
  }
}

const getTypeStyle = (type: ButtonProps['type']) => {
  switch (type) {
    case 'primary':
      return {
        color: 'white',
        backgroundColor: '#0078d4',
      }
    case 'danger':
      return {
        color: 'white',
        backgroundColor: 'red',
      }
    case 'default':
    default:
      return {
        color: 'black',
        backgroundColor: 'white',
      }
  }
}

//#region component
export const Button: FC<ButtonProps> = (props) => {
  const { className, style, children, size, type, disabled, onClick } = props

  const typeStyle = useMemo(() => getTypeStyle(type), [type])
  const sizeStyle = useMemo(() => getSizeStyle(size), [size])
  const _style = useMemo(
    () => ({ ...typeStyle, ...sizeStyle, ...style }),
    [typeStyle, sizeStyle, style],
  )

  return (
    <button
      disabled={disabled}
      className={clsx(className, styles.root, disabled && styles.disabled)}
      style={_style}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
//#endregion component
