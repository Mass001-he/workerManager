import { QueryBuilder } from './query'

interface UserTable {
  id: number
  name: string
  age: number
}

const queryBuilder = new QueryBuilder<UserTable>()

queryBuilder
  .select()
  .from('users')
  .where({
    age: 18,
    name: {
      $like: '%a%',
    },
  })
  .orWhere({
    age: 20,
  })
  .limit(10)
  .orderBy('id', 'DESC', 'FIRST')
  .groupBy('name')

console.log(queryBuilder.toSQL().unwrap())
