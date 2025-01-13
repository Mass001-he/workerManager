import type { FC } from 'react'

//#region component Types
export interface TableSvgProps {
  size?: string | number
}
//#endregion component Types

//#region component
export const TableSvg: FC<TableSvgProps> = ({ size = 24 }) => {
  return (
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="1526"
      width={size}
      height={size}
    >
      <path
        d="M405.333333 341.333333h213.333334c12.8 0 21.333333 8.533333 21.333333 21.333334s-8.533333 21.333333-21.333333 21.333333h-213.333334c-12.8 0-21.333333-8.533333-21.333333-21.333333s8.533333-21.333333 21.333333-21.333334z m0 128h213.333334c12.8 0 21.333333 8.533333 21.333333 21.333334s-8.533333 21.333333-21.333333 21.333333h-213.333334c-12.8 0-21.333333-8.533333-21.333333-21.333333s8.533333-21.333333 21.333333-21.333334z m0 128h128c12.8 0 21.333333 8.533333 21.333334 21.333334s-8.533333 21.333333-21.333334 21.333333h-128c-12.8 0-21.333333-8.533333-21.333333-21.333333s8.533333-21.333333 21.333333-21.333334z"
        p-id="1527"
        fill="#1296db"
      ></path>
      <path
        d="M640 789.333333c0-12.8 8.533333-21.333333 21.333333-21.333333h21.333334c25.6 0 42.666667-17.066667 42.666666-42.666667V298.666667c0-25.6-17.066667-42.666667-42.666666-42.666667H341.333333c-25.6 0-42.666667 17.066667-42.666666 42.666667v426.666666c0 25.6 17.066667 42.666667 42.666666 42.666667h192c12.8 0 21.333333 8.533333 21.333334 21.333333s-8.533333 21.333333-21.333334 21.333334H341.333333c-46.933333 0-85.333333-38.4-85.333333-85.333334V298.666667c0-46.933333 38.4-85.333333 85.333333-85.333334h341.333334c46.933333 0 85.333333 38.4 85.333333 85.333334v426.666666c0 46.933333-38.4 85.333333-85.333333 85.333334h-21.333334c-12.8 0-21.333333-8.533333-21.333333-21.333334z"
        p-id="1528"
        fill="#1296db"
      ></path>
    </svg>
  )
}
//#endregion component

//#region component Types
export interface RefreshSvgProps {
  size?: string | number
}
//#endregion component Types

//#region component
export const RefreshSvg: FC<RefreshSvgProps> = (props) => {
  const { size = 24 } = props
  return (
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="10965"
      width={size}
      height={size}
    >
      <path
        d="M140.209231 537.206154l117.76-98.067692-46.867693-17.329231 14.178462 4.332307C262.301538 302.867692 376.910769 212.676923 512 212.676923s249.698462 90.190769 286.72 213.464615l90.584615-27.175384C840.861538 236.307692 690.018462 118.153846 512 118.153846c-176.443077 0-325.710769 116.184615-375.729231 276.086154L114.215385 385.969231l25.993846 151.236923zM912.935385 643.150769l-24.812308-153.993846-118.941539 100.824615 29.144616 10.633847c-37.809231 121.698462-151.630769 210.707692-285.932308 210.707692-135.089231 0-249.698462-90.190769-286.72-213.464615l-90.584615 27.175384C183.138462 787.692308 333.981538 905.846154 512 905.846154c175.261538 0 323.347692-114.215385 374.547692-272.541539l26.387693 9.846154z"
        fill="currentColor"
        p-id="10966"
      ></path>
    </svg>
  )
}
//#endregion component

//#region component Types
export interface SQLiteSvgProps {
  size?: string | number
}
//#endregion component Types

//#region component
export const SQLiteSvg: FC<SQLiteSvgProps> = (props) => {
  const { size = 24 } = props
  return (
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="4278"
      width={size}
      height={size}
    >
      <path
        d="M884.91 22.23Q853.6-6.35 812.77 1.81q-36.75 6.81-77.58 43.56l-23.14 23.14q-19.06 20.42-36.75 43.55-19.06-8.16-39.47-8.16H198.92q-43.56 0-74.18 30.63-30.63 30.63-30.63 74.17v436.91q0 42.2 30.63 72.82 30.63 30.63 74.18 30.63h307.6q4.09 20.41 6.81 35.39v9.52q-2.72 58.53 2.72 117.06 6.81 80.3 21.78 112.97l5.44-2.72q-21.77-68.06-17.69-168.78 6.8-161.97 70.78-355.25 55.8-144.27 127.26-256.56 71.46-112.29 143.59-168.1-40.83 35.39-92.55 122.5-42.19 70.78-87.11 163.33-35.39 77.59-57.17 133.39-55.8 148.36-83.02 292.64 17.69-54.45 72.13-95.28 25.87-19.06 49-28.58 44.92-55.81 98-136.11-78.94 19.05-99.36 27.22l-34.02 13.61 51.72-27.22q58.52-31.31 103.44-46.28 92.56-148.36 125.22-257.25Q957.05 86.2 884.91 22.23zM511.97 475.48q12.25 25.86 23.14 66.69l6.8 31.31-8.16-21.78q-4.09-9.53-21.78-40.83l-6.81-14.98-17.69 50.36q9.53 17.7 17.69 43.56 6.81 19.05 12.25 40.83l4.09 19.06-6.81-19.06q-2.72-10.89-28.58-55.8l-4.09-6.81q-14.97 54.45-10.2 62.62 4.76 8.16 12.94 28.59l2.72 8.16H198.93q-9.53 0-15.66-6.13-6.13-6.13-6.13-15.65V208.71q0-9.53 6.13-15.66 6.13-6.13 15.66-6.13h426.02q-40.83 68.06-70.78 144.96-29.94 76.9-42.19 143.6z"
        p-id="4279"
      ></path>
    </svg>
  )
}
//#endregion component

//#region component Types
export interface CloseSvgProps {
  size?: string | number
}
//#endregion component Types

//#region component
export const CloseSvg: FC<CloseSvgProps> = (props) => {
  const { size = 24 } = props
  return (
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="4255"
      width={size}
      height={size}
    >
      <path
        d="M853.333333 42.666667H170.666667a128 128 0 0 0-128 128v682.666666a128 128 0 0 0 128 128h682.666666a128 128 0 0 0 128-128V170.666667a128 128 0 0 0-128-128z m42.666667 810.666666a42.666667 42.666667 0 0 1-42.666667 42.666667H170.666667a42.666667 42.666667 0 0 1-42.666667-42.666667V170.666667a42.666667 42.666667 0 0 1 42.666667-42.666667h682.666666a42.666667 42.666667 0 0 1 42.666667 42.666667v682.666666zM662.869333 361.130667a42.666667 42.666667 0 0 0-60.373333 0L512 451.669333 421.504 361.130667a42.666667 42.666667 0 0 0-60.373333 60.373333L451.669333 512l-90.538666 90.496a42.666667 42.666667 0 0 0 60.373333 60.373333L512 572.330667l90.496 90.538666a42.666667 42.666667 0 0 0 60.373333-60.373333L572.330667 512l90.538666-90.496a42.666667 42.666667 0 0 0 0-60.373333z"
        p-id="4256"
        fill="currentColor"
      ></path>
    </svg>
  )
}
//#endregion component