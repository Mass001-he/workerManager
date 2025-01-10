import { NotFoundError, NotSupportedError, PathFormatError } from './error';
import type { MakeDirOptions, WriteFileOptions } from './types';
import { normalizePath } from './utils';
function isOPFSSupported() {
  try {
    return (
      'navigator' in globalThis &&
      globalThis.navigator?.storage &&
      typeof globalThis.navigator.storage.getDirectory === 'function'
    );
  } catch (error) {
    return (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      window.navigator?.storage &&
      typeof window.navigator.storage.getDirectory === 'function'
    );
  }
}

export class OPFSOperator {
  static async create() {
    if (!isOPFSSupported()) {
      throw new NotSupportedError('OPFS is not supported');
    }
    const root = await globalThis.navigator.storage.getDirectory();
    return new OPFSOperator(root);
  }
  private constructor(public root: FileSystemDirectoryHandle) {
    if (!isOPFSSupported()) {
      throw new NotSupportedError('OPFS is not supported');
    }
  }

  isRoot(path: string) {
    return normalizePath(path) === '';
  }

  formatPath(path: string) {
    const result = normalizePath(path).split('/');
    if (result.length === 0) {
      throw new PathFormatError('path error:' + path);
    }
    const hasEmptyStr = result.some((item) => item.trim() === '');
    if (hasEmptyStr) {
      throw new PathFormatError('path error:' + path);
    }
    return result;
  }

  /**
   * 获取绝对路径
   * @param handle
   */
  async absolute(handle: FileSystemHandle) {
    const paths = (await this.root.resolve(handle)) ?? [];
    return paths.join('/');
  }

  /**
   * 获取路径句柄
   * @returns
   */
  async getPathHandle(src: string) {
    if (src === '/' || src === '') {
      return this.root;
    }

    const _paths = this.formatPath(src);
    const innerGet = async (
      handle: FileSystemDirectoryHandle,
      paths: string[],
    ) => {
      if (paths.length === 0) {
        return handle;
      }
      const [name, ...rest] = paths;
      if (rest.length === 0) {
        return this.getParentHandleChild(handle, name, false);
      } else {
        try {
          const nextHandle = await handle.getDirectoryHandle(name, {
            create: false,
          });
          return innerGet(nextHandle, rest);
        } catch (error) {
          throw new NotFoundError(
            `path not found: ${src},${(error as any)?.message}`,
          );
        }
      }
    };

    return innerGet(this.root, _paths);
  }

  /**
   * 获取父级操作句柄下的操作句柄
   */
  async getParentHandleChild(
    parentHandle: FileSystemDirectoryHandle,
    childName: string,
    create = false,
  ) {
    try {
      const res = await parentHandle.getDirectoryHandle(childName, {
        create,
      });
      return res;
    } catch (error) {
      try {
        const res = await parentHandle.getFileHandle(childName, {
          create,
        });
        return res;
      } catch (error) {
        throw new NotFoundError(
          `path not found: ${childName},${(error as any)?.message}`,
        );
      }
    }
  }

  /**
   * 获取路径的父级句柄
   */
  async getParentHandle(path: string) {
    const _paths = this.formatPath(path);
    if (_paths.length === 0 || _paths.length === 1) {
      return {
        lastPath: _paths[0],
        parentHandle: this.root,
      };
    }
    const lastPath = _paths[_paths.length - 1];
    const parentPaths = _paths.slice(0, _paths.length - 1);

    const result = await this.getPathHandle(parentPaths.join('/'));
    if (result instanceof FileSystemDirectoryHandle) {
      return {
        lastPath,
        parentHandle: result,
      };
    }
    throw new NotFoundError(`path not found: ${path}`);
  }

  /**
   * 创建目录
   */
  async mkdir(path: string, options: MakeDirOptions = {}) {
    if (path === '/' || path === '') {
      return this.root;
    }
    const { recursive = false } = options;
    const _paths = this.formatPath(path);
    const innerMkdir = async (
      handle: FileSystemDirectoryHandle,
      paths: string[],
    ) => {
      if (paths.length === 0) {
        return handle;
      }
      const [name, ...rest] = paths;
      const nextHandle = await handle.getDirectoryHandle(name, {
        create: recursive,
      });
      return innerMkdir(nextHandle, rest);
    };

    return innerMkdir(this.root, _paths);
  }

  /**
   * 写入文件,支持追加和覆写
   */
  async writeFile(
    path: string,
    data: ArrayBuffer | ArrayBufferView,
    options: WriteFileOptions = {},
  ) {
    const { append = false, create = true, recursive = false } = options;

    const _paths = this.formatPath(path);
    const innerWrite = async (
      handle: FileSystemDirectoryHandle,
      paths: string[],
    ) => {
      if (paths.length === 0) {
        throw new PathFormatError('path error:' + path);
      }
      const [name, ...rest] = paths;
      if (rest.length === 0) {
        try {
          const fileHandle = await handle.getFileHandle(name, {
            create: create,
          });

          const syncHandle = await fileHandle.createSyncAccessHandle();
          const size = syncHandle.getSize();
          if (append) {
            syncHandle.write(data, {
              at: size,
            });
          } else {
            syncHandle.truncate(0);
            syncHandle.write(data);
          }
          const newSize = syncHandle.getSize();
          syncHandle.flush();
          syncHandle.close();
          return newSize;
        } catch (error) {
          throw new NotFoundError(
            `path not found: ${path},${(error as any)?.message}`,
          );
        }
      } else {
        try {
          const nextHandle = await handle.getDirectoryHandle(name, {
            create: recursive,
          });
          return innerWrite(nextHandle, rest);
        } catch (error) {
          throw new NotFoundError(
            `In the full path [${path}], the path [${name}] is not a directory. ${(error as any)?.message}`,
          );
        }
      }
    };

    return innerWrite(this.root, _paths);
  }
}
