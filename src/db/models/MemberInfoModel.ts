// memberInfos: "&id, isFriend, name, bb_id, auid",

import { BaseModel, model } from './baseModel';

export const MemberInfosSchema = {
  name: model.varchar(),
  id: model.varchar(),
  isFriend: model.boolean(),
  bb_id: model.varchar(),
  auid: model.varchar(),
};

export class MemberInfosModel extends BaseModel {
  tableName: string = 'memberInfos';
}
