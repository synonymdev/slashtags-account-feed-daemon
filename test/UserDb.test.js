/* eslint-env mocha */
'use strict'
const assert = require('assert')
const UserDb = require('../src/UserDb')
const util = require('../src/util')

async function getUdb () {
  let udb = new UserDb({
    path: './test-db',
    name: `test-${util.rnd()}db`
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
    const uid = util.rnd()
    const fk = util.rnd()
    const ek = util.rnd()
    await udb.insert({
      user_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: { test: 1 }
    })

    await udb.insert({
      user_id: util.rnd(),
      feed_key: util.rnd(),
      encrypt_key: util.rnd(),
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
    const uid = util.rnd()
    const fk = util.rnd()
    const ek = util.rnd()
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
