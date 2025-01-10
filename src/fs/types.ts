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

export interface FileTreeNode {
  /** The name of the file. */
  name: string;
  /** The full path of the file. */
  path: string;
  /**
   * `file` or `directory`
   */
  kind: 'file' | 'directory';
  /** The children of the directory. */
  children?: FileTreeNode[];
}

export interface WriteFileOptions {
  /**
   * If set to true, will append to a file instead of overwriting previous contents.
   * @default false
   */
  append?: boolean;
  /**
   * Sets the option to allow creating a new file, if one doesn't already exist at the specified path.
   * @default true
   */
  create?: boolean;
  /**
   * recursively create directories if they do not exist
   * @default false
   */
  recursive?: boolean;
}

export interface MakeDirOptions {
  /**
   * Indicates whether the method should create any missing directories.
   * @default false
   */
  recursive?: boolean;
}

export interface SnapshotOptions {
  /**
   * A filter function that can be used to exclude files from the snapshot.
   */
  filter?: (info: FileTreeNode) => boolean;
}
