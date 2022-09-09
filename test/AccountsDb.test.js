/* eslint-env mocha */
'use strict'
const assert = require('assert')
const AccountsDb = require('../src/AccountsDb')
const util = require('../src/util')

let udb = null
async function getDb () {
  udb = new AccountsDb({
    path: './db',
    name: `test-${util.rnd()}db`
  })
  await udb.init()
  return udb
}

describe('AccountsDb', () => {
  it('Should create instance Accounts', async () => {
    udb = await getDb()
  })

  it('Should insert new user in accounts db ', async () => {
    udb = await getDb()
    const uid = util.rnd()
    const pk = util.rnd()
    await udb.insert({
      user_id: uid,
      slashtag_pub: pk,
      meta: { test: 123 }
    })
    const data = await udb.findByUser(uid)
    assert(typeof data === 'object')
    assert(data.user_id === uid)
    assert(data.slashtag_pub === pk)
    assert(data.state === 1)
    assert(data.meta.test === 123)
  })

  it('Should remove user ', async () => {
    udb = await getDb()
    const uid = util.rnd()
    const pk = util.rnd()
    await udb.insert({
      user_id: uid,
      slashtag_pub: pk,
      meta: { test: 123 }
    })
    let data = await udb.findByUser(uid)
    assert(data.state === 1)
    await udb.removeUser(uid)
    data = await udb.findByUser(uid)
    assert(!data)
  })

  afterEach(async () => {
    await udb.db.deleteSqlite()
  })
})
