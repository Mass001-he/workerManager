import { FC, useState } from 'react'

//#region component Types
export interface InputProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  showClear?: boolean
  className?: string
  label?: string
  style?: React.CSSProperties
}
//#endregion component Types

const useControlled = (value?: string, onChange?: (value: string) => void) => {
  const isControlled = value !== undefined
  const [state, setState] = useState(value ?? '')
  const controlledValue = isControlled ? value : state
  const controlledOnChange = (value: string) => {
    if (!isControlled) setState(value)
    onChange?.(value)
  }
  return [controlledValue, controlledOnChange] as const
}

//#region component
export const Input: FC<InputProps> = (props) => {
  const { placeholder, value, onChange, showClear, className, style, label } =
    props
  const [controlledValue, controlledOnChange] = useControlled(value, onChange)

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {label && <div>{label}</div>}
      <input
        className={className}
        placeholder={placeholder}
        value={controlledValue}
        onChange={(e) => controlledOnChange?.(e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: 4,
          width: '100%',
          boxSizing: 'border-box',
          ...style,
        }}
      />
      {showClear && controlledValue && (
        <button
          onClick={() => controlledOnChange?.('')}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>
      )}
    </div>
  )
}
//#endregion component
