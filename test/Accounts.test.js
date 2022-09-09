/* eslint-env mocha */
'use strict'
const assert = require('assert')
const Accounts = require('../src/Accounts')
const util = require('../src/util')
const path = require('path')
const { URL } = require("url")

const testDir = path.resolve('./test-data')
const dbconfig = {
  name: 'user-db',
  path: path.resolve('./test-data/db')
}

const stConfig = path.resolve('./test-data/storage')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function createUser(){
  const acct = newInstance()
  const client = await util.accountsClient({
    secret: Accounts.genSecret(),
  })
  await acct.start()
  const uid = Accounts.genSecret().toString("hex")
  await acct.createAccount({
    user_id: uid,
    slashtag_pub: client.slashtag.key.toString("hex")
  })

  const user = await acct.getAccount({user_id: uid})
  assert(user.user_id === uid)
  return {
    user, 
    client,
    cstg: client.slashtag.key.toString("hex"),
    uid,
    acct
  }
}

let acct

async function checkAudit(acct, test){

  const data = await acct.auditDb.findByKey(test.key)
  assert(data.length == test.length)
  const audit = data.pop()
  assert(audit.user_id === test.uid)
  assert(audit.public_key === test.key)
  assert(audit.state === test.state)
  assert(audit.login_token === test.token)
  assert(audit.login_ts >= 1000)
}

function newInstance () {
  return acct = new Accounts({
    db: dbconfig,
    slashtags: stConfig,
    secret: Accounts.genSecret(),
    token_timeout : 3000,
    auth_url:"https://example.com"

  })
}

describe('Feeds ', () => {
  beforeEach(async () => {
    await util.mkdir(dbconfig.path)
    await util.mkdir(stConfig)
    newInstance()
  })

  afterEach(async () => {
    await util.delFolder(testDir)
  })

  it('Should create instance of Accounts ', async function () {
    this.timeout(5000)
    const acct = newInstance()
    assert(acct)
    assert(acct.config.db)
    assert(acct.config.slashtags)
    assert(acct.config.secret)
    await acct.start()
    assert(acct.server)
  })

  it('Should create a user', async function () {
    this.timeout(10000)
    await createUser()
  })
  it('Should create a user and authenticate', async function () {
    this.timeout(10000)
    const {
      acct,
      client,
      uid,
      cstg
    } = await createUser()
    const {url, token} = acct.generateToken()

    assert(url)
    assert(url.indexOf("undefined") === -1)
    const response = await client.authz(url)
    assert(response.status === "ok")

    await checkAudit(acct, { 
      length: 1,
      uid,
      key:cstg,
      state:200,
      token: token
    })
    const magic = await client.magiclink(url)
    const um = new URL(magic)
    assert(um.protocol === "https:")
    assert(um.searchParams.get("auth_token").length === 256 )

  })
  it('Should create a user and fail auth with invalid token ', async function () {
    this.timeout(10000)
    const {
      acct,
      client,
      uid,
      cstg
    } = await createUser()
    const {url, token} = acct.generateToken()
    await sleep(3000)
    const response = await client.authz(url)
    assert(response.status === "error")
    assert(response.message === "token_invalid")
    await checkAudit(acct, { 
      length: 1,
      uid,
      key:cstg,
      state:101,
      token: token
    })
  })
  it('Should create a user and fail auth with key invalid ', async function () {
    this.timeout(10000)
    const {
      acct,
    } = await createUser()
    const badUser = await util.accountsClient({
      secret: Accounts.genSecret(),
    })
    const {url, token} = acct.generateToken()
    const response = await badUser.authz(url)
    assert(response.status === "error")
    assert(response.message === "key_invalid")
    await checkAudit(acct, { 
      length: 1,
      uid: "na",
      key:badUser.slashtag.key.toString("hex"),
      state:100,
      token: token
    })
  })
  it('Should create a user and fail auth with service not ready', async function () {
    this.timeout(10000)
    const {
      acct,
      client,
      cstg
    } = await createUser()
    acct.db.findBySlashtag = function() { throw new Error("Fake error")}
    const {url, token} = acct.generateToken()
    const response = await client.authz(url)
    assert(response.status === "error")
    assert(response.message === "service_not_ready")
    await checkAudit(acct, { 
      length: 1,
      uid:"na",
      key:cstg,
      state:103,
      token: token
    })
  })
})
