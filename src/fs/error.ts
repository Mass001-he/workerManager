export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotSupportedError';
  }
}
export class NotEmptyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotEmptyError';
  }

  static stringValidator(value: string) {
    if (value.trim() === '') {
      throw new NotEmptyError('value should not be empty');
    }
  }
}

export class PathFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathFormatError';
  }
}
