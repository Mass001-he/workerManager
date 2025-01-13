import React, {
  FC,
  useState,
  useEffect,
  useRef,
  cloneElement,
  ReactElement,
} from 'react'
import ReactDOM from 'react-dom'
import styles from './index.module.css'
import { clsx } from '../../helper'

//#region component Types
export interface ContextMenuItem {
  label: React.ReactNode
  onClick: () => void
}
export interface ContextMenuProps {
  items: ContextMenuItem[]
  children: ReactElement<any>
  trigger?: 'click' | 'hover' | 'rightClick'
}
//#endregion component Types

//#region component
export const ContextMenu: FC<ContextMenuProps> = (props) => {
  const { items, children, trigger = 'rightClick' } = props
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setPosition({ x: event.clientX, y: event.clientY })
    setVisible(true)
  }

  const handleClick = (event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY })
    setVisible(true)
  }

  const handleHover = () => {
    setVisible(true)
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setVisible(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const mergeEventHandlers = (
    originalHandler?: (event: any) => void,
    newHandler?: (event: any) => void,
  ) => {
    return (event: any) => {
      originalHandler && originalHandler(event)
      newHandler && newHandler(event)
    }
  }

  const triggerProps = {
    onContextMenu:
      trigger === 'rightClick'
        ? mergeEventHandlers(children.props?.onContextMenu, handleContextMenu)
        : children?.props.onContextMenu,
    onClick:
      trigger === 'click'
        ? mergeEventHandlers(children?.props.onClick, handleClick)
        : children?.props.onClick,
    onMouseEnter:
      trigger === 'hover'
        ? mergeEventHandlers(children?.props.onMouseEnter, handleHover)
        : children?.props.onMouseEnter,
    onMouseLeave:
      trigger === 'hover'
        ? mergeEventHandlers(children?.props.onMouseLeave, () =>
            setVisible(false),
          )
        : children?.props.onMouseLeave,
  }

  return (
    <>
      {cloneElement(children, triggerProps)}
      {visible &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            style={{
              top: position.y,
              left: position.x,
            }}
            className={clsx(styles.root)}
          >
            {items.map((item, index) => (
              <div
                key={index}
                className={clsx(styles.item)}
                onClick={() => {
                  item.onClick()
                  setVisible(false)
                }}
              >
                {item.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
//#endregion component
