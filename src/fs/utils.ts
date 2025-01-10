export function isOPFSSupported() {
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

export function normalizePath(path: string) {
  const result = path.trim().replace(/^\/+/, '');
  return result;
}


export function isDirectoryHandle(
  handle: FileSystemHandle,
): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory';
}

export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file';
}