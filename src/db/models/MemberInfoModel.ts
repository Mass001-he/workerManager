// memberInfos: "&id, isFriend, name, bb_id, auid",

import { boolean, table, text } from '../orm/column';

export const MemberInfosTable = table('memberInfos', {
  id: text().primary().unique(),
  isFriend: boolean(),
  bb_id: text(),
  auid: text(),
  name: text().required(),
});
