/* eslint-env mocha */
'use strict'
const assert = require('assert')
const Feeds = require("../src/Feeds")
const util = require("./util")
const path = require('path');
const SlashtagsFeeds = require('../src/Feeds');


const testDir = path.resolve("./test-data")
const dbconfig = {
  name : "user-db",
  path: path.resolve("./test-data/db")
}

const stConfig = {
  path : path.resolve("./test-data/storage"),
  key: Buffer.from('f'.repeat(64), 'hex'),
}

let stFeed
function newFeed() {
  return stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig
  })
}

describe('Feeds ', () => {

  beforeEach(async ()=>{
    await util.mkdir(dbconfig.path)
    await util.mkdir(stConfig.path)
    newFeed()
  })

  afterEach(async ()=>{
    await util.delFolder(testDir)
  })

  it('Should create instance of Slashtags, Db ', async function () {
    this.timeout(5000)
    assert(!stFeed.ready)
    assert(stFeed.db)
    assert(stFeed.config)
    await stFeed.start()
    assert(stFeed.ready)
    assert(stFeed.slashtags)
    assert.deepEqual(stFeed.slashtags._opts,stConfig)
    //TODO Write more slashtag checks
  })

  describe("Create Drive",()=>{
    it("Should fail to create drive, when no user id is passed", async function () {
      this.timeout(5000)
      await stFeed.start()
      assert(stFeed.ready)
      try {
        await stFeed.createDrive({})
      } catch(err){
        assert(err instanceof Feeds.Error)
        assert(err.message === SlashtagsFeeds.err.userIdMissing)
      }
    })

    it("Should create a drive for user", async function () {
      this.timeout(5000)
      await stFeed.start()
      assert(stFeed.ready)
      const drive = await stFeed.createDrive({ user_id: "11111"})
      assert(drive.slashdrive)
    
    })
  })

})
