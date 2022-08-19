/* eslint-env mocha */
'use strict'
const assert = require('assert')
const UserDb = require("../src/UserDb")
const util = require("../src/util")


let udb = null
async function getUdb(){
  udb = new UserDb({
    path:"./db",
    name:`test-${util.rnd()}db`
  })
  await udb.init()
  return udb
}

describe('UserDb', () => {

  it('Should create instance User Db', async () => {
    udb = await getUdb()
  })


  it('Should insert new user feed info and fetch from db ', async () => {
    udb = await getUdb()
    const uid = util.rnd()
    const fk = util.rnd()
    const ek = util.rnd()
    await udb.insert({
      user_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: {test: 123},
    })
    const data = await udb.findByUser(uid)
    assert(typeof data === "object")
    assert(data.user_id === uid)
    assert(data.feed_key === fk)
    assert(data.encrypt_key === ek)
    assert(data.state === 1)
    assert(data.meta.test === 123)
  })

  it('Should remove user ', async () => {
    udb = await getUdb()
    const uid = util.rnd()
    const fk = util.rnd()
    const ek = util.rnd()
    await udb.insert({
      user_id: uid,
      feed_key: fk,
      encrypt_key: ek,
      meta: {test: 123},
    })
    let data = await udb.findByUser(uid)
    assert(data.state === 1)
    await udb.removeUser(uid)
    data = await udb.findByUser(uid)
    assert(!data)
  })

  afterEach(async ()=>{
    await udb.db.deleteSqlite()
  })
})
