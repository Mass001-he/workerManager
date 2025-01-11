// memberInfos: "&id, isFriend, name, bb_id, auid",

import { model } from './baseModel';

export const MemberInfosSchema = {
  name: model.varchar(),
  id: model.varchar(),
  isFriend: model.boolean(),
  bb_id: model.varchar(),
  auid: model.varchar(),
};

export class MemberInfosModel {}
