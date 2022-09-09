/* eslint-env mocha */
'use strict'
const assert = require('assert')
const AuditDb = require('../src/AccountsAuditDb')
const util = require('../src/util')

let udb = null
async function getDb () {
  udb = new AuditDb({
    path: './db',
    name: `test-${util.rnd()}db`
  })
  await udb.init()
  return udb
}

describe('AuditDb', () => {
  it('Should create instance Accounts DbDb', async () => {
    udb = await getDb()
  })

  it('Should insert new login audit info and fetch from db ', async () => {
    udb = await getDb()
    const uid = util.rnd()
    const pk = util.rnd()
    await udb.insert({
      user_id: uid,
      public_key: pk,
      login_token: pk,
      state: 100,
      meta: { test: 123 }
    })

    const data = await udb.findByKey(pk)
    assert(typeof data === 'object')
    const d = data.pop()
    assert(d.user_id === uid)
    assert(d.public_key === pk)
    assert(d.state === 100)
    assert(JSON.parse(d.meta).test === 123)
  })


  it('Should insert multiple login audit ', async () => {
    udb = await getDb()
    const uid = util.rnd()
    const pk = util.rnd()
    await udb.insert({
      user_id: uid,
      public_key: pk,
      login_token: pk,
      state: 100,
      meta: { test: 123 }
    })
    await udb.insert({
      user_id: uid,
      public_key: pk,
      login_token: pk,
      state: 100,
      meta: { test: 123 }
    })
    await udb.insert({
      user_id: uid,
      public_key: pk,
      login_token: pk,
      state: 100,
      meta: { test: 123 }
    })
    const data = await udb.findByKey(pk)
    assert(data.length == 3)
    data.forEach((d,i)=>{
      // make sure each insert is unique
      const id = i === 0 ? "11" : data[i-1].id
      assert(d.id != id)
      assert(d.user_id === uid)
      assert(d.public_key === pk)
      assert(d.state === 100)
    })
  })
  afterEach(async () => {
    await udb.db.deleteSqlite()
  })
})
