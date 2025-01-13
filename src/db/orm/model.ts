type AllowColumnTypes = 'string' | 'number' | 'boolean';

class BaseColumnDescriptor {
  /** 是否必填 */
  _required: boolean = false;
  /** 是否唯一 */
  _unique: boolean = false;
  /** 是否创建索引 */
  _index: boolean = false;

  required() {
    this._required = true;
    return this;
  }

  unique() {
    this._unique = true;
    return this;
  }

  index() {
    this._index = true;
    return this;
  }
}

class IteratorColumnDescriptor extends BaseColumnDescriptor {
  static Unlimited = -1;
  /** 长度，-1为不限制 */
  length: number = IteratorColumnDescriptor.Unlimited;

  len(length: number) {
    this.length = length;
    return this;
  }
}

class Column {
  constructor() {}

  text() {
    return new TextColumn();
  }

  number() {
    return new NumberColumn();
  }

  boolean() {
    return new BooleanColumn();
  }
}

new Column().text();
