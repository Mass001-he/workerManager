import { OPFSOperator } from './operator';
import type { FileInfo } from './types';

export class OPFS {
  private opfsOperator: OPFSOperator;

  static async create() {
    const opfsOperator = await OPFSOperator.create();
    const opfs = new OPFS(opfsOperator);
    return opfs;
  }
  private constructor(operator: OPFSOperator) {
    this.opfsOperator = operator;
    console.log(this.opfsOperator.root);
    this.drop();
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

  async remove(path: string) {
    const handle = await this.opfsOperator.getPathHandle(path);
    if (handle instanceof FileSystemFileHandle) {
    }
  }

  async drop() {
    //@ts-ignore
    await this.opfsOperator.root.remove({
      recursive: true,
    });
  }
}
