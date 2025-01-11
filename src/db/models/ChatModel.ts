// chat: "++&chatId, aChatId, unreadCount, onlyTwo, timestamp, finishLoadHistory, maxUserMsgSeq, maxMsgNo, minMsgNo, isLocal",

import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
import { model, BaseModel } from './baseModel';
import { generateSchema } from '../utils';

export const ChatSchema = {
  chatId: model.integer(),
  aChatId: model.varchar(),
  unreadCount: model.integer(),
  onlyTwo: model.integer(),
  timestamp: model.integer(),
  finishLoadHistory: model.boolean(),
  maxUserMsgSeq: model.integer(),
  maxMsgNo: model.integer(),
  minMsgNo: model.integer(),
  isLocal: model.boolean(),
};

export class ChatModel extends BaseModel {
  private tableName: string = 'chat';
  constructor(db: OpfsSAHPoolDatabase) {
    super(db);
    this.initTable();
  }

  private initTable() {
    const schema = generateSchema(ChatSchema);
    this.createTable(this.tableName, schema);
  }

  public async insertChat(
    chatId: number,
    aChatId: string,
    unreadCount: number,
    onlyTwo: number,
    timestamp: number,
    finishLoadHistory: boolean,
    maxUserMsgSeq: number,
    maxMsgNo: number,
    minMsgNo: number,
    isLocal: boolean,
  ) {
    const columns = [
      'chatId',
      'aChatId',
      'unreadCount',
      'onlyTwo',
      'timestamp',
      'finishLoadHistory',
      'maxUserMsgSeq',
      'maxMsgNo',
      'minMsgNo',
      'isLocal',
    ];
    const values = [
      chatId,
      aChatId,
      unreadCount,
      onlyTwo,
      timestamp,
      finishLoadHistory,
      maxUserMsgSeq,
      maxMsgNo,
      minMsgNo,
      isLocal,
    ];
    await this.insert(this.tableName, columns, values);
  }

  public async getAllChats() {
    return await this.query(this.tableName);
  }
}
