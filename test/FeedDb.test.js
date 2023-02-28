import { strict as assert } from 'node:assert';
import FeedDb from '../src/FeedDb.js'
import { rnd } from '../src/util.js'

async function getDb () {
  let udb = new FeedDb({
    path: './test-db',
    name: `test-${rnd()}db`
  })
  await udb.init()
  return udb
}

describe('FeedDb', () => {
  let udb = null
  before(async () => {
    udb = await getDb()
  })

  after(async () => {
    await udb.db.deleteSqlite()
  })

  it('Should insert new feed info and fetch from db ', async () => {
    const uid = rnd()
    const fk = rnd()
    const ek = rnd()
    await udb.insert({
      feed_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: { test: 1 }
    })

    await udb.insert({
      feed_id: rnd(),
      feed_key: rnd(),
      encrypt_key: rnd(),
      meta: { test: 2 }
    })

    const data = await udb.findByFeedId(uid)
    assert(data.feed_id === uid)
    assert(data.feed_key === fk)
    assert(data.encrypt_key === ek)
    assert(data.state === 1)
    assert(data.meta.test === 1)
  })

  it('Should remove feed ', async () => {
    const uid = rnd()
    const fk = rnd()
    const ek = rnd()
    await udb.insert({
      feed_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: { test: 123 }
    })
    let data = await udb.findByFeedId(uid)
    assert(data.state === 1)
    await udb.removeFeed(uid)
    data = await udb.findByFeedId(uid)
    assert(!data)
  })
})
