import { strict as assert } from 'node:assert';
import UserDb from '../src/UserDb.js'
import { rnd } from '../src/util.js'

async function getUdb () {
  let udb = new UserDb({
    path: './test-db',
    name: `test-${rnd()}db`
  })
  await udb.init()
  return udb
}

describe('UserDb', () => {
  let udb = null
  before(async () => {
    udb = await getUdb()
  })

  after(async () => {
    await udb.db.deleteSqlite()
  })

  it('Should insert new user feed info and fetch from db ', async () => {
    const uid = rnd()
    const fk = rnd()
    const ek = rnd()
    await udb.insert({
      user_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: { test: 1 }
    })

    await udb.insert({
      user_id: rnd(),
      feed_key: rnd(),
      encrypt_key: rnd(),
      meta: { test: 2 }
    })

    const data = await udb.findByUser(uid)
    assert(data.user_id === uid)
    assert(data.feed_key === fk)
    assert(data.encrypt_key === ek)
    assert(data.state === 1)
    assert(data.meta.test === 1)
  })

  it('Should remove user ', async () => {
    const uid = rnd()
    const fk = rnd()
    const ek = rnd()
    await udb.insert({
      user_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: { test: 123 }
    })
    let data = await udb.findByUser(uid)
    assert(data.state === 1)
    await udb.removeUser(uid)
    data = await udb.findByUser(uid)
    assert(!data)
  })
})
