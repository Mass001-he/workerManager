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
