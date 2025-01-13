import { FC, useRef } from 'react'
import styles from './index.module.css'
import { clsx } from '../../helper'
import { CloseSvg } from '../svg'

//#region component Types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  title?: string
}
//#endregion component Types

//#region component
export const Modal: FC<ModalProps> = (props) => {
  const { children, className, style, isOpen, onClose, title } = props
  return (
    <dialog
      className={clsx(className, styles.modal)}
      style={style}
      open={isOpen}
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalTitle}>{title}</div>
        <div className={styles.modalClose} onClick={onClose}>
          <CloseSvg size={20} />
        </div>
      </div>
      <div className={clsx(styles.modalContent)}>{children}</div>
    </dialog>
  )
}
//#endregion component
