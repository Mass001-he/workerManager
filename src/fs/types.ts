/** Options for {@linkcode copy} and {@linkcode copySync}. */
export interface CopyOptions {
  /**
   * Whether to overwrite existing file or directory.
   *
   * @default {false}
   */
  overwrite?: boolean;
  /**
   * When `true`, will set last modification and access times to the ones of
   * the original source files. When `false`, timestamp behavior is
   * OS-dependent.
   *
   * > [!NOTE]
   * > This option is currently unsupported for symbolic links.
   *
   * @default {false}
   */
  preserveTimestamps?: boolean;
}

export interface FileInfo {
  /** The name of the file. */
  name: string;
  /** The full path of the file. */
  path: string;
  /** The size of the file, in bytes. */
  size: number;
  /** True if this is a file. */
  isFile: boolean;
  /** True if this is a directory. */
  isDirectory: boolean;
}
