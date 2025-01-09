import { NotFoundError, NotSupportedError, PathFormatError } from './error';
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

  static formatPath(src: string) {
    const result = src.replace(/^\/+/, '').split('/');
    if (result.length === 0) {
      throw new PathFormatError('path error:' + src);
    }
    const hasEmptyStr = result.some((item) => item.trim() === '');
    if (hasEmptyStr) {
      throw new PathFormatError('path error:' + src);
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

    const _paths = OPFSOperator.formatPath(src);
    const innerGet = async (
      handle: FileSystemDirectoryHandle,
      paths: string[],
    ) => {
      if (paths.length === 0) {
        return handle;
      }
      const [name, ...rest] = paths;
      if (rest.length === 0) {
        try {
          try {
            const res = await handle.getFileHandle(name, { create: false });
            return res;
          } catch (error) {
            return await handle.getDirectoryHandle(name, { create: false });
          }
        } catch (error) {
          console.error('getPathHandle.innerGet:', src, error);
          throw new NotFoundError(`path not found: ${src}`);
        }
      } else {
        try {
          const nextHandle = await handle.getDirectoryHandle(name, {
            create: false,
          });
          return innerGet(nextHandle, rest);
        } catch (error) {
          console.error('getPathHandle.innerGet:', src, error);
          throw new NotFoundError(`path not found: ${src}`);
        }
      }
    };

    return innerGet(this.root, _paths);
  }

  /**
   * 创建目录
   */
  async mkdir(path: string) {
    const _paths = OPFSOperator.formatPath(path);
    const innerMkdir = async (
      handle: FileSystemDirectoryHandle,
      paths: string[],
    ) => {
      if (paths.length === 0) {
        return handle;
      }
      const [name, ...rest] = paths;
      const nextHandle = await handle.getDirectoryHandle(name, {
        create: true,
      });
      return innerMkdir(nextHandle, rest);
    };

    return innerMkdir(this.root, _paths);
  }
}
