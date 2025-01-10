import { OPFSOperator } from './operator';
import type { FileInfo, WriteFileOptions } from './types';

export class OPFS {
  private opfsOperator: OPFSOperator;

  static async create() {
    const opfsOperator = await OPFSOperator.create();
    const opfs = new OPFS(opfsOperator);
    return opfs;
  }
  private constructor(operator: OPFSOperator) {
    this.opfsOperator = operator;
    //@ts-ignore
    globalThis.opfs = this;
    this.test();
  }
  async test() {
    await this.writeFile('/init/test.txt', 'hello world', {
      create: true,
      recursive: true,
      append: true,
    });
    // await this.writeFile('/init/test.txt', 'hello world', {
    //   create: true,
    //   append: true,
    // });
  }

  async stat(path: string) {
    const handle = await this.opfsOperator.getPathHandle(path);
    const absolute = await this.opfsOperator.absolute(handle);

    if (handle instanceof FileSystemFileHandle) {
      const file = await handle.getFile();
      return {
        name: file.name,
        size: file.size,
        isDirectory: false,
        isFile: true,
        path: absolute,
      } as FileInfo;
    } else {
      return {
        name: handle.name,
        size: -1,
        isDirectory: true,
        isFile: false,
        path: absolute,
      } as FileInfo;
    }
  }

  async mkdir(path: string) {
    return this.opfsOperator.mkdir(path);
  }

  /**
   * 便捷递归删除
   * @param path
   * @returns
   */
  async remove(path: string) {
    const handle = await this.opfsOperator.getParentHandle(path);
    return handle.removeEntry(OPFSOperator.formatPath(path).pop()!);
  }

  async writeFile(
    path: string,
    data: string | ArrayBuffer | ArrayBufferView | Blob,
    options: WriteFileOptions = {},
  ) {
    if (typeof data === 'string') {
      const _data = new TextEncoder().encode(data);
      return this.opfsOperator.writeFile(path, _data, options);
    } else if (data instanceof Blob) {
      const _data = await data.arrayBuffer();
      debugger;
      return this.opfsOperator.writeFile(path, _data, options);
    } else {
      return this.opfsOperator.writeFile(path, data, options);
    }
  }

  async drop() {
    //@ts-ignore
    await this.opfsOperator.root.remove({
      recursive: true,
    });
  }
}
