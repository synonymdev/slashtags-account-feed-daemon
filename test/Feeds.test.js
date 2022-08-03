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

const feedItems = [
  'balance'
]

let stFeed
function newFeed() {
  return stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig,
    feed_items:  feedItems
  })
}

function feedConfig (){
  return {
    db: dbconfig,
    slashtags: stConfig,
    feed_items:  feedItems
  }
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
    assert.equal(stFeed.db.db.config,dbconfig)
    //TODO Write more slashtag checks
  })

  it('Should fail when passing invalid configs', async function () {
    this.timeout(5000)
    try{
      const stFeed = new Feeds({
        db: dbconfig,
      })
    } catch(err){
      assert(err.message === Feeds.err.badConfig)
    }

    try{
      const stFeed = new Feeds({
        db: dbconfig,
      })
    } catch(err){
      assert(err.message === Feeds.err.badConfig)
    }
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
      const drive = await stFeed.createDrive({ user_id: "11111", init_data: []})
      assert(drive.slashdrive)
    })

    it("Should fail to create drive if params arent valid", async function () {
      this.timeout(5000)
      await stFeed.start()
      try{
        await stFeed.createDrive()
      } catch(err){
        assert(err.message === Feeds.err.userIdMissing)
      }
    })

    it("Should fail to create drive if Feeds instance is not ready", async function () {
      this.timeout(5000)
      try{
        const drive = await stFeed.createDrive({
          user_id:"111",
          init_data: {}
        })
      } catch(err){
        assert(err.message === Feeds.err.notReady)
      }
    })

    it("Should throw error if feed creation has failed", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.feed = (param)=>{
          assert(userId == param)
          throw new Error("TEST_MOCK_FAIL")
        }
        const drive = await stFeed.createDrive({
          user_id: userId,
          init_data: {}
        })
      } catch(err){
        assert(err.message === Feeds.err.failedCreateDrive)
      }
    })
    it("Should throw error if feed creation response is unexpected", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.feed = async (param)=>{
          return { }
        }
        const drive = await stFeed.createDrive({
          user_id: userId,
          init_data: {}
        })
      } catch(err){
        console.log(err.message)
        assert(err.message === Feeds.err.failedCreateDriveArgs)
      }
    })
    it("Should throw error if the new feed fails to get initialized", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.update = async (userid, key, data)=>{

          return { }
        }
        const drive = await stFeed.createDrive({
          user_id: userId,
          init_data: {}
        })
      } catch(err){
        console.log(err.message)
        assert(err.message === Feeds.err.failedCreateDriveArgs)
      }
    })
  })

})
